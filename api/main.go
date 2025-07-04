package main

import (
    "blogapi/handlers"
    "blogapi/middleware"
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
)

func main() {
    r := gin.Default()

    // Configure CORS
    r.Use(cors.New(cors.Config{
        AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"}, // Vite dev server
        AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
        ExposeHeaders:    []string{"Content-Length"},
        AllowCredentials: true,
    }))

    // Health check endpoint
    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "ok"})
    })

    // Auth endpoints
    r.POST("/login", handlers.Login)

    // API group with /api prefix
    api := r.Group("/api")
    {
        // Blog post endpoints
        api.GET("/posts", handlers.GetPosts)
        api.GET("/posts/:id", handlers.GetPostByID)
        api.POST("/posts/:id/view", handlers.TrackPostView)
        api.POST("/posts", middleware.AuthMiddleware(), middleware.RequireRole("admin"), handlers.CreatePost)

        // Comment endpoints
        api.GET("/comments", handlers.GetComments)
        api.POST("/comments", middleware.AuthMiddleware(), handlers.CreateComment)
    }

    r.Run(":8080")
}
