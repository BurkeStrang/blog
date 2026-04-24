package middleware

import (
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

// CacheEntry represents a cached response
type CacheEntry struct {
	Data        []byte
	ContentType string
	StatusCode  int
	Timestamp   time.Time
	ETag        string
	Version     int // Cache version for invalidation
}

// CacheManager handles in-memory caching
type CacheManager struct {
	cache   map[string]*CacheEntry
	mutex   sync.RWMutex
	ttl     time.Duration
	version int // Current cache version
}

// NewCacheManager creates a new cache manager
func NewCacheManager(ttl time.Duration) *CacheManager {
	cm := &CacheManager{
		cache:   make(map[string]*CacheEntry),
		ttl:     ttl,
		version: 1,
	}

	// Start cleanup goroutine
	go cm.cleanup()
	return cm
}

// cleanup removes expired entries periodically
func (cm *CacheManager) cleanup() {
	ticker := time.NewTicker(time.Minute * 5) // Cleanup every 5 minutes
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

// generateCacheKey creates a cache key based on request
func (cm *CacheManager) generateCacheKey(c *gin.Context) string {
	// Include method, path, and query parameters
	key := fmt.Sprintf("%s:%s", c.Request.Method, c.Request.URL.Path)
	if c.Request.URL.RawQuery != "" {
		key += "?" + c.Request.URL.RawQuery
	}

	// Add user-specific cache key if authenticated
	if userID, exists := c.Get("userID"); exists {
		key += fmt.Sprintf(":user:%v", userID)
	}

	return key
}

// generateETag creates an ETag for the response data
func (cm *CacheManager) generateETag(data []byte) string {
	hash := md5.Sum(data)
	return `"` + hex.EncodeToString(hash[:]) + `"`
}

// validateJSONResponse checks if the response data is valid JSON
func (cm *CacheManager) validateJSONResponse(data []byte, contentType string) error {
	// Only validate JSON responses
	if !strings.Contains(contentType, "application/json") {
		return nil
	}

	// Check for obvious corruption patterns
	if len(data) == 0 {
		return fmt.Errorf("empty response data")
	}

	// Check for actual JSON concatenation (not just legitimate content)
	// Look for patterns like }[ or ]{ or }{ or ][ with minimal whitespace
	dataStr := string(data)
	concatenationPatterns := []string{
		"}[",
		"]{",
		"}{",
		"] [",
		"} [",
		"] {",
		"} {",
	}
	
	for _, pattern := range concatenationPatterns {
		if strings.Contains(dataStr, pattern) {
			return fmt.Errorf("detected concatenated JSON arrays in response")
		}
	}

	// Validate JSON syntax
	var temp interface{}
	if err := json.Unmarshal(data, &temp); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}

	// Check for reasonable size limits (prevent memory exhaustion)
	const maxCacheSize = 10 * 1024 * 1024 // 10MB limit
	if len(data) > maxCacheSize {
		return fmt.Errorf("response too large for caching: %d bytes (max: %d)", len(data), maxCacheSize)
	}

	return nil
}

// InvalidateVersion increments the cache version, effectively invalidating all cached entries
func (cm *CacheManager) InvalidateVersion() {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()
	
	cm.version++
	log.Printf("Cache version invalidated, new version: %d", cm.version)
}

// Get retrieves data from cache
func (cm *CacheManager) Get(key string) (*CacheEntry, bool) {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	entry, exists := cm.cache[key]
	if !exists {
		return nil, false
	}

	// Check if expired
	if time.Since(entry.Timestamp) > cm.ttl {
		// Remove expired entry
		delete(cm.cache, key)
		return nil, false
	}

	// Check if cache version is outdated
	if entry.Version < cm.version {
		log.Printf("Cache entry version outdated for key %s (entry: %d, current: %d)", key, entry.Version, cm.version)
		delete(cm.cache, key)
		return nil, false
	}

	// Validate cached response before serving
	if err := cm.validateJSONResponse(entry.Data, entry.ContentType); err != nil {
		log.Printf("Cache validation failed for key %s: %v", key, err)
		delete(cm.cache, key)
		return nil, false
	}

	return entry, true
}

// Set stores data in cache
func (cm *CacheManager) Set(key string, data []byte, contentType string, statusCode int) {
	// Validate response before caching
	if err := cm.validateJSONResponse(data, contentType); err != nil {
		log.Printf("Skipping cache storage for key %s due to validation error: %v", key, err)
		return
	}

	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	entry := &CacheEntry{
		Data:        data,
		ContentType: contentType,
		StatusCode:  statusCode,
		Timestamp:   time.Now(),
		ETag:        cm.generateETag(data),
		Version:     cm.version,
	}

	cm.cache[key] = entry
	log.Printf("Cached response for key %s (size: %d bytes, version: %d)", key, len(data), cm.version)
}

// Invalidate removes specific cache entries
func (cm *CacheManager) Invalidate(pattern string) {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	for key := range cm.cache {
		if key == pattern {
			delete(cm.cache, key)
		}
	}
}

// Clear removes all cache entries
func (cm *CacheManager) Clear() {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	cm.cache = make(map[string]*CacheEntry)
}

// GetStats returns cache statistics
func (cm *CacheManager) GetStats() map[string]interface{} {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	// Count valid vs invalid entries
	validEntries := 0
	invalidEntries := 0
	totalSize := 0

	for _, entry := range cm.cache {
		totalSize += len(entry.Data)
		if err := cm.validateJSONResponse(entry.Data, entry.ContentType); err != nil {
			invalidEntries++
		} else {
			validEntries++
		}
	}

	return map[string]interface{}{
		"total_entries":   len(cm.cache),
		"valid_entries":   validEntries,
		"invalid_entries": invalidEntries,
		"total_size_bytes": totalSize,
		"ttl":             cm.ttl.String(),
		"version":         cm.version,
	}
}

// ValidateAndCleanCache validates all cached entries and removes invalid ones
func (cm *CacheManager) ValidateAndCleanCache() map[string]interface{} {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	cleaned := 0
	invalid := []string{}

	for key, entry := range cm.cache {
		if err := cm.validateJSONResponse(entry.Data, entry.ContentType); err != nil {
			invalid = append(invalid, fmt.Sprintf("%s: %v", key, err))
			delete(cm.cache, key)
			cleaned++
		}
	}

	result := map[string]interface{}{
		"cleaned_entries": cleaned,
		"remaining_entries": len(cm.cache),
	}

	if len(invalid) > 0 {
		result["invalid_entries"] = invalid
	}

	log.Printf("Cache validation completed: cleaned %d invalid entries, %d remaining", cleaned, len(cm.cache))
	return result
}

// Global cache managers
var (
	// Posts cache - longer TTL since posts don't change often
	PostsCache = NewCacheManager(15 * time.Minute)
	
	// Analytics cache - shorter TTL since it updates frequently
	AnalyticsCache = NewCacheManager(2 * time.Minute)
	
	// General API cache
	APICache = NewCacheManager(5 * time.Minute)
)

// CacheMiddleware creates a caching middleware
func CacheMiddleware(cacheManager *CacheManager, cacheable func(*gin.Context) bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only cache GET requests by default
		if c.Request.Method != "GET" {
			c.Next()
			return
		}

		// Check if this request should be cached
		if cacheable != nil && !cacheable(c) {
			c.Next()
			return
		}

		cacheKey := cacheManager.generateCacheKey(c)

		// Check for cached response
		if entry, exists := cacheManager.Get(cacheKey); exists {
			// Handle conditional requests (ETag)
			if ifNoneMatch := c.GetHeader("If-None-Match"); ifNoneMatch != "" {
				if ifNoneMatch == entry.ETag {
					c.Status(http.StatusNotModified)
					return
				}
			}

			// Set cache headers
			c.Header("ETag", entry.ETag)
			c.Header("Cache-Control", "public, max-age=300") // 5 minutes
			c.Header("X-Cache", "HIT")
			
			c.Data(entry.StatusCode, entry.ContentType, entry.Data)
			return
		}

		// Use a custom response writer to capture the response
		writer := &responseWriter{
			ResponseWriter: c.Writer,
			body:          make([]byte, 0),
		}
		c.Writer = writer

		c.Next()

		// Only cache successful responses
		if writer.status >= 200 && writer.status < 300 {
			contentType := writer.Header().Get("Content-Type")
			if contentType == "" {
				contentType = "application/json"
			}

			cacheManager.Set(cacheKey, writer.body, contentType, writer.status)

			// Add cache headers to response
			c.Header("X-Cache", "MISS")
			c.Header("Cache-Control", "public, max-age=300") // 5 minutes
		}
	}
}

// responseWriter captures response data for caching
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

// Helper functions for specific cache configurations

// PostsCacheMiddleware for blog posts with enhanced search/sort caching
func PostsCacheMiddleware() gin.HandlerFunc {
	return CacheMiddleware(PostsCache, func(c *gin.Context) bool {
		// Cache all GET requests to posts endpoints, including search and sort parameters
		path := c.Request.URL.Path
		return c.Request.Method == "GET" && 
			   (path == "/api/posts" || 
			    path == "/api/posts/popular" ||
			    path == "/api/posts/search" ||
			    strings.HasPrefix(path, "/api/posts/"))
	})
}

// AnalyticsCacheMiddleware for analytics data
func AnalyticsCacheMiddleware() gin.HandlerFunc {
	return CacheMiddleware(AnalyticsCache, func(c *gin.Context) bool {
		// Cache analytics but with shorter TTL
		return true
	})
}

// StaticCacheMiddleware for static content with longer TTL
func StaticCacheMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Set long cache headers for static assets
		c.Header("Cache-Control", "public, max-age=31536000") // 1 year
		c.Header("Expires", time.Now().Add(365*24*time.Hour).Format(http.TimeFormat))
		c.Next()
	}
}

// NoCacheMiddleware for endpoints that should never be cached
func NoCacheMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Next()
	}
}
