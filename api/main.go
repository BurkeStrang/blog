package main

import (
	"blogapi/config"
	"blogapi/database"
	"blogapi/handlers"
	"blogapi/middleware"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"os"
)

func main() {
	// Initialize OAuth configuration
	config.InitOAuth()

	// Initialize Cosmos DB
	if err := database.InitializeCosmos(); err != nil {
		log.Fatalf("Failed to initialize Cosmos DB: %v", err)
	}
	defer database.CloseCosmos()

	// Connect to customredis (falls back to in-memory if unavailable)
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	middleware.InitRedisCache(redisAddr)

	r := gin.Default()

	// Security and validation middleware
	r.Use(middleware.SecurityHeadersMiddleware())
	r.Use(middleware.InputSanitizationMiddleware())
	r.Use(middleware.RequestValidationMiddleware())
	// Temporarily disable response validation - too strict
	// r.Use(middleware.ResponseValidationMiddleware())

	// Configure CORS
	allowedOrigins := []string{
		"http://localhost:5173",
		"http://localhost:3000",
		"http://localhost:3001",
		"http://localhost:3002",
	}

	// Add production frontend URL if set
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL != "" {
		allowedOrigins = append(allowedOrigins, frontendURL)
		log.Printf("Added FRONTEND_URL to CORS allowed origins: %s", frontendURL)
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Cache management endpoints (admin only)
	admin := r.Group("/admin")
	admin.Use(middleware.AuthMiddleware(), middleware.RequireRole("admin"))
	{
		admin.GET("/cache/stats", func(c *gin.Context) {
			stats := map[string]interface{}{
				"posts":     middleware.PostsCache.GetStats(),
				"analytics": middleware.AnalyticsCache.GetStats(),
				"api":       middleware.APICache.GetStats(),
			}
			c.JSON(http.StatusOK, stats)
		})

		admin.POST("/cache/validate", func(c *gin.Context) {
			results := map[string]interface{}{
				"posts":     middleware.PostsCache.ValidateAndCleanCache(),
				"analytics": middleware.AnalyticsCache.ValidateAndCleanCache(),
				"api":       middleware.APICache.ValidateAndCleanCache(),
			}
			c.JSON(http.StatusOK, results)
		})

		admin.POST("/cache/invalidate", func(c *gin.Context) {
			middleware.PostsCache.InvalidateVersion()
			middleware.AnalyticsCache.InvalidateVersion()
			middleware.APICache.InvalidateVersion()
			c.JSON(http.StatusOK, gin.H{"message": "all caches invalidated"})
		})

		admin.POST("/cache/clear", func(c *gin.Context) {
			middleware.PostsCache.Clear()
			middleware.AnalyticsCache.Clear()
			middleware.APICache.Clear()
			c.JSON(http.StatusOK, gin.H{"message": "all caches cleared"})
		})
	}

	// Auth endpoints
	r.GET("/auth/google", handlers.GoogleLogin)
	r.GET("/auth/google/callback", handlers.GoogleCallback)

	// API group with /api prefix
	api := r.Group("/api")
	{
		// Blog post endpoints (caching temporarily disabled for debugging)
		api.GET("/posts", handlers.GetPostsDB)
		api.GET("/posts/:id", handlers.GetPostByIDDB)

		// Non-cached endpoints
		api.POST("/posts/:id/view", middleware.NoCacheMiddleware(), handlers.TrackPostViewDB)
		api.POST("/posts", middleware.AuthMiddleware(), middleware.RequireRole("admin"), handlers.CreatePostDB)
		api.PUT("/posts/:id", middleware.AuthMiddleware(), middleware.RequireRole("admin"), handlers.UpdatePostDB)
		api.DELETE("/posts/:id", middleware.AuthMiddleware(), middleware.RequireRole("admin"), handlers.DeletePostDB)
		api.POST("/posts/update-comment-counts", middleware.AuthMiddleware(), middleware.RequireRole("admin"), handlers.UpdateCommentCountsDB)

		// Comment endpoints
		api.GET("/comments", middleware.NoCacheMiddleware(), handlers.GetCommentsDB)
		api.POST("/comments", middleware.AuthMiddleware(), middleware.NoCacheMiddleware(), handlers.CreateCommentDB)
		api.PUT("/comments/:id", middleware.AuthMiddleware(), middleware.NoCacheMiddleware(), handlers.UpdateCommentDB)
		api.DELETE("/comments/:id", middleware.AuthMiddleware(), middleware.NoCacheMiddleware(), handlers.DeleteCommentDB)

		// Comment like endpoints
		api.POST("/comments/:id/like", middleware.AuthMiddleware(), middleware.NoCacheMiddleware(), handlers.LikeCommentDB)
		api.DELETE("/comments/:id/like", middleware.AuthMiddleware(), middleware.NoCacheMiddleware(), handlers.UnlikeCommentDB)
		api.GET("/comments/:id/likes", middleware.OptionalAuthMiddleware(), middleware.NoCacheMiddleware(), handlers.GetCommentLikesDB)

		// Comment reply endpoint
		api.POST("/comments/:id/reply", middleware.AuthMiddleware(), middleware.NoCacheMiddleware(), handlers.ReplyToCommentDB)

		// User preferences endpoints
		api.GET("/users/preferences", middleware.AuthMiddleware(), handlers.GetUserPreferences)
		api.PUT("/users/preferences", middleware.AuthMiddleware(), handlers.PutUserPreferences)

		// Additional endpoints
		api.GET("/posts/popular", middleware.PostsCacheMiddleware(), handlers.GetPopularPostsDB)
		api.GET("/posts/search", middleware.PostsCacheMiddleware(), handlers.SearchPostsDB)
	}

	r.Run(":8080")
}
