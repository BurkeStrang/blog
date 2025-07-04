package handlers

import (
    "net/http"
    "strconv"
    "encoding/json"
    "io/ioutil"
    "log"
    "blogapi/models"
    "blogapi/middleware"
    "github.com/gin-gonic/gin"
)

var posts []models.BlogPost

func init() {
    loadPosts()
}

func loadPosts() {
    data, err := ioutil.ReadFile("data/posts.json")
    if err != nil {
        log.Printf("Error reading posts.json: %v", err)
        return
    }
    
    err = json.Unmarshal(data, &posts)
    if err != nil {
        log.Printf("Error unmarshaling posts.json: %v", err)
        return
    }
    
    // Add IDs to posts since JSON doesn't have them
    for i := range posts {
        posts[i].ID = i + 1
        posts[i].Author = "Burke" // Set default author
    }
    
    log.Printf("Loaded %d posts from JSON file", len(posts))
}

func GetPosts(c *gin.Context) {
    c.JSON(http.StatusOK, posts)
}

func GetPostByID(c *gin.Context) {
    idParam := c.Param("id")
    
    // Try to find by slug first
    for _, post := range posts {
        if post.Slug == idParam {
            c.JSON(http.StatusOK, post)
            return
        }
    }
    
    // If not found by slug, try by ID
    id, err := strconv.Atoi(idParam)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
        return
    }
    
    for _, post := range posts {
        if post.ID == id {
            c.JSON(http.StatusOK, post)
            return
        }
    }
    
    c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
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
