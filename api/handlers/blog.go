package handlers

import (
    "net/http"
    "strconv"
    "blogapi/models"
		"blogapi/middleware"
    "github.com/gin-gonic/gin"
)

var posts = []models.BlogPost{}

func GetPosts(c *gin.Context) {
    c.JSON(http.StatusOK, posts)
}

func GetPostByID(c *gin.Context) {
    idParam := c.Param("id")
    id, err := strconv.Atoi(idParam)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
        return
    }
    for _, post := range posts {
        if post.ID == id {
            c.JSON(http.StatusOK, post)
            return
        }
    }
    c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
}

func CreatePost(c *gin.Context) {
    var post models.BlogPost
    if err := c.BindJSON(&post); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
        return
    }
    post.ID = len(posts) + 1
    claims := c.MustGet("user").(*middleware.Claims)
    post.Author = claims.Username
    posts = append(posts, post)
    c.JSON(http.StatusCreated, post)
}
