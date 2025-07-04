package handlers

import (
    "net/http"
    "strconv"
    "encoding/json"
    "os"
    "log"
    "blogapi/models"
    "blogapi/middleware"
    "blogapi/services"
    "github.com/gin-gonic/gin"
)

var posts []models.BlogPost

func init() {
    loadPosts()
}

func loadPosts() {
    data, err := os.ReadFile("data/posts.json")
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
    // Merge posts with analytics data
    analyticsService := services.GetAnalyticsService()
    allAnalytics := analyticsService.GetAllAnalytics()
    
    // Create response posts with current analytics
    responsePosts := make([]models.BlogPost, len(posts))
    for i, post := range posts {
        responsePosts[i] = post
        if analytics, exists := allAnalytics[post.Slug]; exists {
            responsePosts[i].PageViews = analytics.PageViews
            responsePosts[i].RecentViews = analytics.RecentViews
            responsePosts[i].LastViewed = analytics.LastViewed
        }
    }
    
    c.JSON(http.StatusOK, responsePosts)
}

func GetPostByID(c *gin.Context) {
    idParam := c.Param("id")
    analyticsService := services.GetAnalyticsService()
    
    // Try to find by slug first
    for _, post := range posts {
        if post.Slug == idParam {
            // Merge with analytics data
            analytics := analyticsService.GetAnalytics(post.Slug)
            post.PageViews = analytics.PageViews
            post.RecentViews = analytics.RecentViews
            post.LastViewed = analytics.LastViewed
            
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
            // Merge with analytics data
            analytics := analyticsService.GetAnalytics(post.Slug)
            post.PageViews = analytics.PageViews
            post.RecentViews = analytics.RecentViews
            post.LastViewed = analytics.LastViewed
            
            c.JSON(http.StatusOK, post)
            return
        }
    }
    
    c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
}

func TrackPostView(c *gin.Context) {
    slug := c.Param("id")
    
    // First verify the post exists
    postExists := false
    for _, post := range posts {
        if post.Slug == slug {
            postExists = true
            break
        }
    }
    
    if !postExists {
        c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
        return
    }
    
    // Track view using analytics service
    analyticsService := services.GetAnalyticsService()
    analytics, err := analyticsService.TrackView(slug)
    if err != nil {
        log.Printf("Error tracking view: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to track view"})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{
        "message": "view tracked", 
        "views": analytics.PageViews,
        "lastViewed": analytics.LastViewed,
    })
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
