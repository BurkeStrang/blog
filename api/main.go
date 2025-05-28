package main

import (
    "blogapi/handlers"
    "blogapi/middleware"
    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()

    // Auth endpoints
    r.POST("/login", handlers.Login)

    // Blog post endpoints
    r.GET("/posts", handlers.GetPosts)
    r.GET("/posts/:id", handlers.GetPostByID)
    r.POST("/posts", middleware.AuthMiddleware(), middleware.RequireRole("admin"), handlers.CreatePost)

    // Comment endpoints
    r.GET("/comments", handlers.GetComments)
    r.POST("/comments", middleware.AuthMiddleware(), handlers.CreateComment)

    r.Run(":8080")
}
