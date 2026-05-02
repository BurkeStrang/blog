package middleware

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// CacheEntry represents a cached HTTP response.
type CacheEntry struct {
	Data        []byte
	ContentType string
	StatusCode  int
	Timestamp   time.Time
	ETag        string
	Version     int
}

// Cache is the interface implemented by both CacheManager and RedisCache.
type Cache interface {
	Get(key string) (*CacheEntry, bool)
	Set(key string, data []byte, contentType string, statusCode int)
	Invalidate(pattern string)
	InvalidateVersion()
	Clear()
	TTL() time.Duration
	GetStats() map[string]any
	ValidateAndCleanCache() map[string]any
}

type contextCache interface {
	GetWithContext(context.Context, string) (*CacheEntry, bool)
	SetWithContext(context.Context, string, []byte, string, int)
}

// Global cache instances — default to in-memory, replaced with RedisCache in main.
var (
	PostsCache     Cache = NewCacheManager(30 * time.Minute)
	AnalyticsCache Cache = NewCacheManager(5 * time.Minute)
	APICache       Cache = NewCacheManager(5 * time.Minute)
)

const (
	cacheStatusContextKey  = "cache.status"
	cacheBackendContextKey = "cache.backend"
)

func cacheBackendName(cache Cache) string {
	switch cache.(type) {
	case *RedisCache:
		return "redis"
	case *CacheManager:
		return "memory"
	default:
		return "unknown"
	}
}

func cacheGet(ctx context.Context, cache Cache, key string) (*CacheEntry, bool) {
	if contextual, ok := cache.(contextCache); ok {
		return contextual.GetWithContext(ctx, key)
	}
	return cache.Get(key)
}

func cacheSet(ctx context.Context, cache Cache, key string, data []byte, contentType string, statusCode int) {
	if contextual, ok := cache.(contextCache); ok {
		contextual.SetWithContext(ctx, key, data, contentType, statusCode)
		return
	}
	cache.Set(key, data, contentType, statusCode)
}

// generateCacheKey builds a cache key from the request method, path, query, and user.
func generateCacheKey(c *gin.Context) string {
	key := fmt.Sprintf("%s:%s", c.Request.Method, c.Request.URL.Path)
	if c.Request.URL.RawQuery != "" {
		key += "?" + c.Request.URL.RawQuery
	}
	if userID, exists := c.Get("userID"); exists {
		key += fmt.Sprintf(":user:%v", userID)
	}
	return key
}

// generateETag returns an MD5-based ETag for response data.
func generateETag(data []byte) string {
	hash := md5.Sum(data)
	return `"` + hex.EncodeToString(hash[:]) + `"`
}

// validateJSONResponse returns an error if the data is empty, invalid JSON, or too large.
func validateJSONResponse(data []byte, contentType string) error {
	if !strings.Contains(contentType, "application/json") {
		return nil
	}
	if len(data) == 0 {
		return fmt.Errorf("empty response data")
	}
	var tmp interface{}
	if err := json.Unmarshal(data, &tmp); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}
	const maxCacheSize = 10 * 1024 * 1024
	if len(data) > maxCacheSize {
		return fmt.Errorf("response too large for caching: %d bytes (max: %d)", len(data), maxCacheSize)
	}
	return nil
}

// ── in-memory implementation ──────────────────────────────────────────────────

// CacheManager is the in-memory cache backend.
type CacheManager struct {
	cache   map[string]*CacheEntry
	mutex   sync.RWMutex
	ttl     time.Duration
	version int
}

func NewCacheManager(ttl time.Duration) *CacheManager {
	cm := &CacheManager{
		cache:   make(map[string]*CacheEntry),
		ttl:     ttl,
		version: 1,
	}
	go cm.cleanup()
	return cm
}

func (cm *CacheManager) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		cm.mutex.Lock()
		now := time.Now()
		for key, entry := range cm.cache {
			if now.Sub(entry.Timestamp) > cm.ttl {
				delete(cm.cache, key)
			}
		}
		cm.mutex.Unlock()
	}
}

func (cm *CacheManager) Get(key string) (*CacheEntry, bool) {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()
	entry, exists := cm.cache[key]
	if !exists {
		return nil, false
	}
	if time.Since(entry.Timestamp) > cm.ttl {
		delete(cm.cache, key)
		return nil, false
	}
	if entry.Version < cm.version {
		log.Printf("Cache entry version outdated for key %s (%d < %d)", key, entry.Version, cm.version)
		delete(cm.cache, key)
		return nil, false
	}
	if err := validateJSONResponse(entry.Data, entry.ContentType); err != nil {
		log.Printf("Cache validation failed for key %s: %v", key, err)
		delete(cm.cache, key)
		return nil, false
	}
	return entry, true
}

func (cm *CacheManager) Set(key string, data []byte, contentType string, statusCode int) {
	if err := validateJSONResponse(data, contentType); err != nil {
		log.Printf("Skipping cache storage for key %s: %v", key, err)
		return
	}
	cm.mutex.Lock()
	defer cm.mutex.Unlock()
	cm.cache[key] = &CacheEntry{
		Data:        data,
		ContentType: contentType,
		StatusCode:  statusCode,
		Timestamp:   time.Now(),
		ETag:        generateETag(data),
		Version:     cm.version,
	}
	log.Printf("Cached response for key %s (%d bytes, v%d)", key, len(data), cm.version)
}

func (cm *CacheManager) Invalidate(pattern string) {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()
	for key := range cm.cache {
		if key == pattern {
			delete(cm.cache, key)
		}
	}
}

func (cm *CacheManager) InvalidateVersion() {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()
	cm.version++
	log.Printf("Cache version invalidated, new version: %d", cm.version)
}

func (cm *CacheManager) Clear() {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()
	cm.cache = make(map[string]*CacheEntry)
}

func (cm *CacheManager) TTL() time.Duration {
	return cm.ttl
}

func (cm *CacheManager) GetStats() map[string]any {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()
	valid, invalid, total := 0, 0, 0
	for _, entry := range cm.cache {
		total += len(entry.Data)
		if validateJSONResponse(entry.Data, entry.ContentType) != nil {
			invalid++
		} else {
			valid++
		}
	}
	return map[string]any{
		"total_entries":    len(cm.cache),
		"valid_entries":    valid,
		"invalid_entries":  invalid,
		"total_size_bytes": total,
		"ttl":              cm.ttl.String(),
		"version":          cm.version,
		"backend":          "memory",
	}
}

func (cm *CacheManager) ValidateAndCleanCache() map[string]any {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()
	cleaned := 0
	invalid := []string{}
	for key, entry := range cm.cache {
		if err := validateJSONResponse(entry.Data, entry.ContentType); err != nil {
			invalid = append(invalid, fmt.Sprintf("%s: %v", key, err))
			delete(cm.cache, key)
			cleaned++
		}
	}
	result := map[string]any{
		"cleaned_entries":   cleaned,
		"remaining_entries": len(cm.cache),
	}
	if len(invalid) > 0 {
		result["invalid_entries"] = invalid
	}
	log.Printf("Cache validation: cleaned %d, %d remaining", cleaned, len(cm.cache))
	return result
}

// ── middleware ────────────────────────────────────────────────────────────────

// CacheMiddleware wraps a handler with response caching using the given Cache backend.
func CacheMiddleware(cache Cache, cacheable func(*gin.Context) bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != "GET" {
			c.Next()
			return
		}
		if cacheable != nil && !cacheable(c) {
			c.Next()
			return
		}

		cacheKey := generateCacheKey(c)
		cacheControl := fmt.Sprintf("public, max-age=%d", int(cache.TTL().Seconds()))
		c.Set(cacheBackendContextKey, cacheBackendName(cache))

		if entry, exists := cacheGet(c.Request.Context(), cache, cacheKey); exists {
			c.Set(cacheStatusContextKey, "HIT")
			if ifNoneMatch := c.GetHeader("If-None-Match"); ifNoneMatch != "" && ifNoneMatch == entry.ETag {
				log.Printf("Cache HIT (304 Not Modified): %s", cacheKey)
				c.Status(http.StatusNotModified)
				return
			}
			log.Printf("Cache HIT: %s (%d bytes)", cacheKey, len(entry.Data))
			c.Header("ETag", entry.ETag)
			c.Header("Cache-Control", cacheControl)
			c.Header("X-Cache", "HIT")
			c.Data(entry.StatusCode, entry.ContentType, entry.Data)
			return
		}

		c.Set(cacheStatusContextKey, "MISS")
		log.Printf("Cache MISS: %s", cacheKey)
		writer := &responseWriter{ResponseWriter: c.Writer, body: make([]byte, 0)}
		c.Writer = writer
		c.Next()

		if writer.status >= 200 && writer.status < 300 {
			contentType := writer.Header().Get("Content-Type")
			if contentType == "" {
				contentType = "application/json"
			}
			cacheSet(c.Request.Context(), cache, cacheKey, writer.body, contentType, writer.status)
			c.Header("X-Cache", "MISS")
			c.Header("Cache-Control", cacheControl)
		}
	}
}

type responseWriter struct {
	gin.ResponseWriter
	body   []byte
	status int
}

func (w *responseWriter) Write(data []byte) (int, error) {
	w.body = append(w.body, data...)
	return w.ResponseWriter.Write(data)
}

func (w *responseWriter) WriteHeader(statusCode int) {
	w.status = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

// PostsCacheMiddleware caches GET requests to /api/posts* endpoints.
func PostsCacheMiddleware() gin.HandlerFunc {
	return CacheMiddleware(PostsCache, func(c *gin.Context) bool {
		path := c.Request.URL.Path
		return c.Request.Method == "GET" &&
			(path == "/api/posts" ||
				path == "/api/posts/popular" ||
				path == "/api/posts/search" ||
				strings.HasPrefix(path, "/api/posts/"))
	})
}

// CommentsCacheMiddleware caches GET /api/comments responses (short TTL, public data).
func CommentsCacheMiddleware() gin.HandlerFunc {
	return CacheMiddleware(APICache, func(c *gin.Context) bool {
		return c.Request.Method == "GET" && c.Request.URL.Path == "/api/comments"
	})
}

// AnalyticsCacheMiddleware caches analytics responses.
func AnalyticsCacheMiddleware() gin.HandlerFunc {
	return CacheMiddleware(AnalyticsCache, func(c *gin.Context) bool { return true })
}

// StaticCacheMiddleware sets long-lived cache headers for static content.
func StaticCacheMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "public, max-age=31536000")
		c.Header("Expires", time.Now().Add(365*24*time.Hour).Format(http.TimeFormat))
		c.Next()
	}
}

// NoCacheMiddleware prevents caching on sensitive or volatile endpoints.
func NoCacheMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Next()
	}
}

// PrivateNoCacheMiddleware prevents caching for authenticated or user-specific responses.
func PrivateNoCacheMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "private, no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Next()
	}
}
