package middleware

import (
	"log"
	"time"

	"blogapi/observability"

	"github.com/gin-gonic/gin"
)

// RequestLoggingMiddleware logs request duration and cache backend details.
func RequestLoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		if c.Request.URL.Path == "/health" {
			return
		}

		duration := time.Since(start)
		cacheStatus := c.GetString(cacheStatusContextKey)
		cacheBackend := c.GetString(cacheBackendContextKey)
		traceID, spanID, hasTrace := observability.TraceFields(c.Request.Context())

		if cacheStatus != "" && cacheBackend != "" {
			if hasTrace {
				log.Printf("%s %s -> %d (%s) cache=%s backend=%s trace_id=%s span_id=%s",
					c.Request.Method,
					c.Request.URL.RequestURI(),
					c.Writer.Status(),
					duration,
					cacheStatus,
					cacheBackend,
					traceID,
					spanID,
				)
				return
			}
			log.Printf("%s %s -> %d (%s) cache=%s backend=%s", c.Request.Method, c.Request.URL.RequestURI(), c.Writer.Status(), duration, cacheStatus, cacheBackend)
			return
		}

		if hasTrace {
			log.Printf("%s %s -> %d (%s) trace_id=%s span_id=%s", c.Request.Method, c.Request.URL.RequestURI(), c.Writer.Status(), duration, traceID, spanID)
			return
		}
		log.Printf("%s %s -> %d (%s)", c.Request.Method, c.Request.URL.RequestURI(), c.Writer.Status(), duration)
	}
}
