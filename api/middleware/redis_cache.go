package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/extra/redisotel/v9"
	"github.com/redis/go-redis/v9"
)

// redisCacheEntry is the struct serialized into Redis.
type redisCacheEntry struct {
	Data        []byte    `json:"data"`
	ContentType string    `json:"content_type"`
	StatusCode  int       `json:"status_code"`
	Timestamp   time.Time `json:"timestamp"`
	ETag        string    `json:"etag"`
}

// RedisCache is a Cache backend backed by a Redis-compatible server (customredis).
type RedisCache struct {
	client *redis.Client
	ttl    time.Duration
	prefix string // e.g. "posts", "analytics", "api"
}

// NewRedisCache constructs a RedisCache. prefix namespaces keys within Redis.
func NewRedisCache(client *redis.Client, ttl time.Duration, prefix string) *RedisCache {
	return &RedisCache{client: client, ttl: ttl, prefix: prefix}
}

func (r *RedisCache) key(cacheKey string) string {
	return r.prefix + ":" + cacheKey
}

func (r *RedisCache) Get(cacheKey string) (*CacheEntry, bool) {
	return r.GetWithContext(context.Background(), cacheKey)
}

func (r *RedisCache) GetWithContext(ctx context.Context, cacheKey string) (*CacheEntry, bool) {
	raw, err := r.client.Get(ctx, r.key(cacheKey)).Bytes()
	if err != nil {
		// redis.Nil is the normal "key not present" sentinel — don't log it.
		// Any other error (protocol, EOF, timeout) is interesting; surfaces
		// hidden cache-backend bugs like partial-send issues on large values.
		if err != redis.Nil {
			log.Printf("RedisCache: GET error for key %s: %v", cacheKey, err)
		}
		return nil, false
	}

	var stored redisCacheEntry
	if err := json.Unmarshal(raw, &stored); err != nil {
		log.Printf("RedisCache: unmarshal error for key %s: %v", cacheKey, err)
		return nil, false
	}

	if err := validateJSONResponse(stored.Data, stored.ContentType); err != nil {
		log.Printf("RedisCache: validation failed for key %s: %v", cacheKey, err)
		r.client.Del(ctx, r.key(cacheKey))
		return nil, false
	}

	return &CacheEntry{
		Data:        stored.Data,
		ContentType: stored.ContentType,
		StatusCode:  stored.StatusCode,
		Timestamp:   stored.Timestamp,
		ETag:        stored.ETag,
	}, true
}

func (r *RedisCache) Set(cacheKey string, data []byte, contentType string, statusCode int) {
	r.SetWithContext(context.Background(), cacheKey, data, contentType, statusCode)
}

func (r *RedisCache) SetWithContext(ctx context.Context, cacheKey string, data []byte, contentType string, statusCode int) {
	if err := validateJSONResponse(data, contentType); err != nil {
		log.Printf("RedisCache: skipping storage for key %s: %v", cacheKey, err)
		return
	}

	stored := redisCacheEntry{
		Data:        data,
		ContentType: contentType,
		StatusCode:  statusCode,
		Timestamp:   time.Now(),
		ETag:        generateETag(data),
	}
	raw, err := json.Marshal(stored)
	if err != nil {
		log.Printf("RedisCache: marshal error for key %s: %v", cacheKey, err)
		return
	}

	if err := r.client.Set(ctx, r.key(cacheKey), raw, r.ttl).Err(); err != nil {
		log.Printf("RedisCache: SET error for key %s: %v", cacheKey, err)
		return
	}
	log.Printf("RedisCache: cached %s (%d bytes, TTL %s)", cacheKey, len(data), r.ttl)
}

func (r *RedisCache) Invalidate(pattern string) {
	ctx := context.Background()
	keys, err := r.client.Keys(ctx, r.key(pattern)).Result()
	if err != nil || len(keys) == 0 {
		return
	}
	if err := r.client.Del(ctx, keys...).Err(); err != nil {
		log.Printf("RedisCache: DEL error for pattern %s: %v", pattern, err)
	}
}

// InvalidateVersion deletes all keys in this cache's namespace.
func (r *RedisCache) InvalidateVersion() {
	ctx := context.Background()
	keys, err := r.client.Keys(ctx, r.prefix+":*").Result()
	if err != nil {
		log.Printf("RedisCache: KEYS error during InvalidateVersion: %v", err)
		return
	}
	if len(keys) == 0 {
		return
	}
	if err := r.client.Del(ctx, keys...).Err(); err != nil {
		log.Printf("RedisCache: DEL error during InvalidateVersion: %v", err)
		return
	}
	log.Printf("RedisCache: invalidated %d keys in namespace %q", len(keys), r.prefix)
}

// Clear deletes all keys in this cache's namespace.
func (r *RedisCache) Clear() {
	r.InvalidateVersion()
}

func (r *RedisCache) TTL() time.Duration {
	return r.ttl
}

func (r *RedisCache) GetStats() map[string]interface{} {
	ctx := context.Background()
	keys, err := r.client.Keys(ctx, r.prefix+":*").Result()
	if err != nil {
		return map[string]interface{}{"error": err.Error(), "backend": "redis"}
	}

	totalBytes := 0
	for _, k := range keys {
		raw, err := r.client.Get(ctx, k).Bytes()
		if err == nil {
			totalBytes += len(raw)
		}
	}

	return map[string]interface{}{
		"total_entries":    len(keys),
		"total_size_bytes": totalBytes,
		"ttl":              r.ttl.String(),
		"prefix":           r.prefix,
		"backend":          "redis",
	}
}

func (r *RedisCache) ValidateAndCleanCache() map[string]interface{} {
	ctx := context.Background()
	keys, err := r.client.Keys(ctx, r.prefix+":*").Result()
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}

	cleaned := 0
	invalid := []string{}

	for _, k := range keys {
		raw, err := r.client.Get(ctx, k).Bytes()
		if err != nil {
			continue
		}
		var stored redisCacheEntry
		if err := json.Unmarshal(raw, &stored); err != nil {
			invalid = append(invalid, fmt.Sprintf("%s: unmarshal error: %v", k, err))
			r.client.Del(ctx, k)
			cleaned++
			continue
		}
		if err := validateJSONResponse(stored.Data, stored.ContentType); err != nil {
			invalid = append(invalid, fmt.Sprintf("%s: %v", k, err))
			r.client.Del(ctx, k)
			cleaned++
		}
	}

	result := map[string]interface{}{
		"cleaned_entries":   cleaned,
		"remaining_entries": len(keys) - cleaned,
	}
	if len(invalid) > 0 {
		result["invalid_entries"] = invalid
	}
	log.Printf("RedisCache: validation cleaned %d, %d remaining", cleaned, len(keys)-cleaned)
	return result
}

// InitRedisCache connects to the Redis-compatible server (customredis) at addr,
// verifies the connection, and replaces the global cache vars.
// Falls back to the existing in-memory caches if the connection fails.
func InitRedisCache(addr string) {
	client := redis.NewClient(&redis.Options{
		Addr:            addr,
		DialTimeout:     2 * time.Second,
		ReadTimeout:     2 * time.Second,
		WriteTimeout:    2 * time.Second,
		MinIdleConns:    1, // keep one persistent connection so health checks don't open/close every 3s
		PoolSize:        5, // blog traffic doesn't need a large pool
		ConnMaxIdleTime: 5 * time.Minute,
	})
	if err := redisotel.InstrumentTracing(client); err != nil {
		log.Printf("Redis tracing instrumentation unavailable: %v", err)
	}
	if err := redisotel.InstrumentMetrics(client); err != nil {
		log.Printf("Redis metrics instrumentation unavailable: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("customredis unavailable at %s (%v) — using in-memory cache", addr, err)
		client.Close()
		return
	}

	PostsCache = NewRedisCache(client, 15*time.Minute, "posts")
	AnalyticsCache = NewRedisCache(client, 2*time.Minute, "analytics")
	APICache = NewRedisCache(client, 5*time.Minute, "api")

	log.Printf("customredis connected at %s — cache backend: redis", addr)
}
