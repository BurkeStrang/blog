package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// RequestLoggingMiddleware logs request duration and cache backend details.
func RequestLoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		duration := time.Since(start)
		cacheStatus := c.GetString(cacheStatusContextKey)
		cacheBackend := c.GetString(cacheBackendContextKey)

		if cacheStatus != "" && cacheBackend != "" {
			log.Printf("%s %s -> %d (%s) cache=%s backend=%s",
				c.Request.Method,
				c.Request.URL.RequestURI(),
				c.Writer.Status(),
				duration,
				cacheStatus,
				cacheBackend,
			)
			return
		}

		log.Printf("%s %s -> %d (%s)",
			c.Request.Method,
			c.Request.URL.RequestURI(),
			c.Writer.Status(),
			duration,
		)
	}
}
