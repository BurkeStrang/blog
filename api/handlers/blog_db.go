package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"blogapi/database"
	"blogapi/middleware"
	"blogapi/models"
	"blogapi/validation"

	"github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos"
	"github.com/gin-gonic/gin"
)

// GetPostsDB handles GET /api/posts with Cosmos DB storage, search, and sorting
func GetPostsDB(c *gin.Context) {
	// Parse query parameters
	search := c.Query("search")
	sortBy := c.DefaultQuery("sort", "created_at")
	order := c.DefaultQuery("order", "desc")
	limitStr := c.DefaultQuery("limit", "150")
	offsetStr := c.DefaultQuery("offset", "0")

	// Parse limit and offset
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 150 {
		limit = 150 // Default limit with max of 150
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// Validate sort parameters
	validSortFields := map[string]bool{
		"createdAt":   true,
		"title":       true,
		"pageViews":   true,
		"recentViews": true,
		"lastViewed":  true,
		"author":      true,
	}

	if !validSortFields[sortBy] {
		sortBy = "createdAt"
	}

	if order != "asc" && order != "desc" {
		order = "desc"
	}

	// Build Cosmos DB cross-partition query
	ctx := c.Request.Context()

	// Build SQL query string
	queryStr := "SELECT * FROM c WHERE c.type = 'post'"
	var parameters []azcosmos.QueryParameter

	log.Printf("Executing Cosmos DB query: %s", queryStr)

	// Add search filter if provided
	if search != "" {
		// Sanitize search input
		search = validation.SanitizeHTML(search)

		// Validate search query
		if validationErrors := validation.ValidateSearchQuery(search); len(validationErrors) > 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "invalid search query",
				"code":    "INVALID_SEARCH_QUERY",
				"details": validationErrors,
			})
			return
		}

		queryStr += " AND (CONTAINS(LOWER(c.title), LOWER(@search)) OR CONTAINS(LOWER(c.body), LOWER(@search)) OR CONTAINS(LOWER(c.author), LOWER(@search)))"
		parameters = append(parameters, azcosmos.QueryParameter{
			Name:  "@search",
			Value: search,
		})
	}

	// Query posts using "post" partition key (all posts are in the same partition)
	postPartitionKey := azcosmos.NewPartitionKeyString("post")
	queryOptions := azcosmos.QueryOptions{
		QueryParameters: parameters,
		PageSizeHint:    int32(limit),
	}

	queryIterator := database.PostsContainer.NewQueryItemsPager(queryStr, postPartitionKey, &queryOptions)

	var cosmosPosts []models.CosmosPost

	// Get results from the "post" partition
	if queryIterator.More() {
		queryResponse, err := queryIterator.NextPage(ctx)
		if err != nil {
			log.Printf("Error querying posts: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch posts"})
			return
		}

		log.Printf("Query returned %d items", len(queryResponse.Items))

		for _, item := range queryResponse.Items {
			var post models.CosmosPost
			if err := json.Unmarshal(item, &post); err != nil {
				log.Printf("Error unmarshaling post: %v", err)
				continue
			}

			// Apply search filter if provided
			if search == "" ||
				strings.Contains(strings.ToLower(post.Title), strings.ToLower(search)) ||
				strings.Contains(strings.ToLower(post.Body), strings.ToLower(search)) ||
				strings.Contains(strings.ToLower(post.Author), strings.ToLower(search)) {
				cosmosPosts = append(cosmosPosts, post)
			}
		}
	}

	// All posts are now in the same "post" partition for efficient querying

	log.Printf("Found %d cosmos posts, converting to %d regular posts", len(cosmosPosts), len(cosmosPosts))

	// Convert CosmosPost to Post for API compatibility
	var posts []models.Post
	for _, cosmosPost := range cosmosPosts {
		posts = append(posts, *cosmosPost.ToPost())
	}

	// Return paginated response (simplified for now - Cosmos DB pagination is complex)
	response := gin.H{
		"posts": posts,
		"pagination": gin.H{
			"total":   len(posts), // This is simplified - would need separate count query for true total
			"limit":   limit,
			"offset":  offset,
			"hasMore": len(posts) == limit, // If we got the full limit, there might be more
		},
		"search": search,
		"sort": gin.H{
			"field": sortBy,
			"order": order,
		},
	}

	c.JSON(http.StatusOK, response)
}

// GetPostByIDDB handles GET /api/posts/:id with Cosmos DB storage
func GetPostByIDDB(c *gin.Context) {
	ctx := c.Request.Context()
	idParam := c.Param("id")

	log.Printf("Searching for post with parameter: %s", idParam)

	// Build query to find by slug or ID
	var queryStr string
	var parameters []azcosmos.QueryParameter

	// Try to find by slug first, then by ID
	queryStr = "SELECT * FROM c WHERE c.type = 'post' AND (c.slug = @param OR c.id = @param)"
	parameters = append(parameters, azcosmos.QueryParameter{
		Name:  "@param",
		Value: idParam,
	})

	// Also try with post- prefix for ID-based queries
	if _, err := strconv.Atoi(idParam); err == nil {
		queryStr = "SELECT * FROM c WHERE c.type = 'post' AND (c.slug = @param OR c.id = @param OR c.id = @postId)"
		parameters = append(parameters, azcosmos.QueryParameter{
			Name:  "@postId",
			Value: fmt.Sprintf("post-%s", idParam),
		})
	}

	queryOptions := azcosmos.QueryOptions{
		QueryParameters: parameters,
	}

	// Query using "post" partition key
	postPartitionKey := azcosmos.NewPartitionKeyString("post")
	queryIterator := database.PostsContainer.NewQueryItemsPager(queryStr, postPartitionKey, &queryOptions)

	if queryIterator.More() {
		queryResponse, err := queryIterator.NextPage(ctx)
		if err != nil {
			log.Printf("Error querying post by ID: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch post"})
			return
		}

		if len(queryResponse.Items) > 0 {
			var cosmosPost models.CosmosPost
			if err := json.Unmarshal(queryResponse.Items[0], &cosmosPost); err != nil {
				log.Printf("Error unmarshaling post: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse post"})
				return
			}

			// Convert to regular Post model for API compatibility
			post := cosmosPost.ToPost()
			c.JSON(http.StatusOK, post)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
}

// UpdateCommentCountsDB handles POST /api/posts/update-comment-counts (admin only)
func UpdateCommentCountsDB(c *gin.Context) {
	ctx := c.Request.Context()

	// Get all posts from Cosmos DB
	queryStr := "SELECT * FROM c WHERE c.type = 'post'"
	postPartitionKey := azcosmos.NewPartitionKeyString("post")
	queryIterator := database.PostsContainer.NewQueryItemsPager(queryStr, postPartitionKey, nil)

	var posts []models.CosmosPost

	if queryIterator.More() {
		queryResponse, err := queryIterator.NextPage(ctx)
		if err != nil {
			log.Printf("Error querying posts for comment count update: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch posts"})
			return
		}

		for _, item := range queryResponse.Items {
			var post models.CosmosPost
			if err := json.Unmarshal(item, &post); err != nil {
				log.Printf("Error unmarshaling post: %v", err)
				continue
			}
			posts = append(posts, post)
		}
	}

	// For each post, count comments and update
	for i := range posts {
		post := &posts[i]

		// Count comments for this post
		commentQueryStr := "SELECT VALUE COUNT(1) FROM c WHERE c.type = 'comment' AND c.postId = @postId"
		commentParameters := []azcosmos.QueryParameter{
			{Name: "@postId", Value: post.ID},
		}
		commentQueryOptions := azcosmos.QueryOptions{
			QueryParameters: commentParameters,
		}

		// Use the post ID as the partition key for comments container
		commentPartitionKey := azcosmos.NewPartitionKeyString(post.ID)
		commentIterator := database.CommentsContainer.NewQueryItemsPager(commentQueryStr, commentPartitionKey, &commentQueryOptions)

		var commentCount int
		if commentIterator.More() {
			commentResponse, err := commentIterator.NextPage(ctx)
			if err != nil {
				log.Printf("Error counting comments for post %s: %v", post.ID, err)
				continue
			}

			if len(commentResponse.Items) > 0 {
				if err := json.Unmarshal(commentResponse.Items[0], &commentCount); err != nil {
					log.Printf("Error unmarshaling comment count: %v", err)
					continue
				}
			}
		}

		// Update post with new comment count
		post.CommentCount = commentCount
		post.UpdatedAt = time.Now().UTC()

		// Save updated post
		updatedPostBytes, err := json.Marshal(post)
		if err != nil {
			log.Printf("Failed to marshal updated post %s: %v", post.ID, err)
			continue
		}

		_, err = database.PostsContainer.ReplaceItem(ctx, postPartitionKey, post.ID, updatedPostBytes, nil)
		if err != nil {
			log.Printf("Failed to update post %s in Cosmos DB: %v", post.ID, err)
			continue
		}
	}

	// Convert to regular posts for response
	var responsePosts []gin.H
	for _, post := range posts {
		responsePosts = append(responsePosts, gin.H{
			"id":           post.ID,
			"title":        post.Title,
			"commentCount": post.CommentCount,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "comment counts updated successfully",
		"posts":   responsePosts,
	})
}

// TrackPostViewDB handles POST /api/posts/:id/view with Cosmos DB storage
func TrackPostViewDB(c *gin.Context) {
	ctx := c.Request.Context()
	slug := c.Param("id")

	// Find the post by slug or ID
	var queryStr string
	var parameters []azcosmos.QueryParameter

	// Try to find by slug first, then by ID
	queryStr = "SELECT * FROM c WHERE c.type = 'post' AND (c.slug = @param OR c.id = @param)"
	parameters = append(parameters, azcosmos.QueryParameter{
		Name:  "@param",
		Value: slug,
	})

	// Also try with post- prefix for ID-based queries
	if _, err := strconv.Atoi(slug); err == nil {
		queryStr = "SELECT * FROM c WHERE c.type = 'post' AND (c.slug = @param OR c.id = @param OR c.id = @postId)"
		parameters = append(parameters, azcosmos.QueryParameter{
			Name:  "@postId",
			Value: fmt.Sprintf("post-%s", slug),
		})
	}

	queryOptions := azcosmos.QueryOptions{
		QueryParameters: parameters,
	}

	// Query using "post" partition key
	postPartitionKey := azcosmos.NewPartitionKeyString("post")
	queryIterator := database.PostsContainer.NewQueryItemsPager(queryStr, postPartitionKey, &queryOptions)

	var cosmosPost models.CosmosPost
	var found bool

	if queryIterator.More() {
		queryResponse, err := queryIterator.NextPage(ctx)
		if err != nil {
			log.Printf("Error querying post for view tracking: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find post"})
			return
		}

		if len(queryResponse.Items) > 0 {
			if err := json.Unmarshal(queryResponse.Items[0], &cosmosPost); err != nil {
				log.Printf("Error unmarshaling post for view tracking: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse post"})
				return
			}
			found = true
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}

	// Increment view count
	cosmosPost.PageViews++
	cosmosPost.RecentViews++
	now := time.Now().UTC()
	cosmosPost.LastViewed = &now
	if cosmosPost.FirstViewed == nil {
		cosmosPost.FirstViewed = &now
	}
	cosmosPost.UpdatedAt = now

	// Update the post in Cosmos DB
	updatedPostBytes, err := json.Marshal(cosmosPost)
	if err != nil {
		log.Printf("Failed to marshal updated post: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update post"})
		return
	}

	_, err = database.PostsContainer.ReplaceItem(ctx, postPartitionKey, cosmosPost.ID, updatedPostBytes, nil)
	if err != nil {
		log.Printf("Failed to update post in Cosmos DB: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to track view"})
		return
	}

	// TODO: Optionally record detailed analytics in a separate container
	// For now, we'll skip detailed analytics to keep it simple

	c.JSON(http.StatusOK, gin.H{
		"message":    "view tracked",
		"views":      cosmosPost.PageViews,
		"lastViewed": cosmosPost.LastViewed,
	})
}

// CreatePostDB handles POST /api/posts with Cosmos DB storage
func CreatePostDB(c *gin.Context) {
	ctx := c.Request.Context()

	var post models.Post
	if err := c.ShouldBindJSON(&post); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid request body",
			"code":    "INVALID_JSON",
			"details": err.Error(),
		})
		return
	}

	// Sanitize input
	post.Title = validation.SanitizeHTML(post.Title)
	post.Body = validation.SanitizeHTML(post.Body)
	post.Slug = validation.SanitizeHTML(post.Slug)
	post.Previous = validation.SanitizeHTML(post.Previous)
	post.Next = validation.SanitizeHTML(post.Next)

	// Get user from context (set by auth middleware) - must be set before validation
	if userI, exists := c.Get("user"); exists {
		if claims, ok := userI.(*middleware.Claims); ok {
			post.Author = claims.Username
		}
	}

	// Validate post data
	if validationErrors := validation.ValidatePost(&post); len(validationErrors) > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"code":    "VALIDATION_ERROR",
			"details": validationErrors,
		})
		return
	}

	// Set creation time (use provided date if available, otherwise current time)
	if post.CreatedAt.IsZero() {
		post.CreatedAt = time.Now().UTC()
	}
	post.UpdatedAt = post.CreatedAt

	// Validate time range
	if timeErr := validation.ValidateTimeRange(post.CreatedAt, "created_at"); timeErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid creation time",
			"code":    "INVALID_TIME",
			"details": timeErr,
		})
		return
	}

	// Generate unique ID for the post (using timestamp)
	post.ID = uint(time.Now().UnixNano() / 1000000) // Use milliseconds as ID

	// Convert to Cosmos DB model
	cosmosPost := post.ToCosmosPost()

	// Check if slug already exists
	queryStr := "SELECT * FROM c WHERE c.type = 'post' AND c.slug = @slug"
	parameters := []azcosmos.QueryParameter{
		{Name: "@slug", Value: post.Slug},
	}
	queryOptions := azcosmos.QueryOptions{
		QueryParameters: parameters,
	}

	postPartitionKey := azcosmos.NewPartitionKeyString("post")
	queryIterator := database.PostsContainer.NewQueryItemsPager(queryStr, postPartitionKey, &queryOptions)

	if queryIterator.More() {
		queryResponse, err := queryIterator.NextPage(ctx)
		if err != nil {
			log.Printf("Error checking for existing slug: %v", err)
		} else if len(queryResponse.Items) > 0 {
			c.JSON(http.StatusConflict, gin.H{
				"error": "slug already exists",
				"code":  "SLUG_EXISTS",
			})
			return
		}
	}

	// Create the post in Cosmos DB
	postBytes, err := json.Marshal(cosmosPost)
	if err != nil {
		log.Printf("Failed to marshal post: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to create post",
			"code":  "SERIALIZATION_ERROR",
		})
		return
	}

	_, err = database.PostsContainer.CreateItem(ctx, postPartitionKey, postBytes, nil)
	if err != nil {
		log.Printf("Failed to create post in Cosmos DB: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to create post",
			"code":  "DATABASE_ERROR",
		})
		return
	}

	middleware.PostsCache.InvalidateVersion()
	log.Printf("Successfully created post with ID: %s", cosmosPost.ID)
	c.JSON(http.StatusCreated, post)
}

// UpdatePostDB handles PUT /api/posts/:id with Cosmos DB storage
func UpdatePostDB(c *gin.Context) {
	ctx := c.Request.Context()
	idParam := c.Param("id")

	// Find the existing post
	var queryStr string
	var parameters []azcosmos.QueryParameter

	// Try to find by slug first, then by ID
	queryStr = "SELECT * FROM c WHERE c.type = 'post' AND (c.slug = @param OR c.id = @param)"
	parameters = append(parameters, azcosmos.QueryParameter{
		Name:  "@param",
		Value: idParam,
	})

	// Also try with post- prefix for ID-based queries
	if _, err := strconv.Atoi(idParam); err == nil {
		queryStr = "SELECT * FROM c WHERE c.type = 'post' AND (c.slug = @param OR c.id = @param OR c.id = @postId)"
		parameters = append(parameters, azcosmos.QueryParameter{
			Name:  "@postId",
			Value: fmt.Sprintf("post-%s", idParam),
		})
	}

	queryOptions := azcosmos.QueryOptions{
		QueryParameters: parameters,
	}

	postPartitionKey := azcosmos.NewPartitionKeyString("post")
	queryIterator := database.PostsContainer.NewQueryItemsPager(queryStr, postPartitionKey, &queryOptions)

	var existingPost models.CosmosPost
	var found bool

	if queryIterator.More() {
		queryResponse, err := queryIterator.NextPage(ctx)
		if err != nil {
			log.Printf("Error querying post for update: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find post"})
			return
		}

		if len(queryResponse.Items) > 0 {
			if err := json.Unmarshal(queryResponse.Items[0], &existingPost); err != nil {
				log.Printf("Error unmarshaling existing post: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse post"})
				return
			}
			found = true
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "post not found",
			"code":  "POST_NOT_FOUND",
		})
		return
	}

	var updateData models.Post
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid request body",
			"code":    "INVALID_JSON",
			"details": err.Error(),
		})
		return
	}

	// Sanitize input
	updateData.Title = validation.SanitizeHTML(updateData.Title)
	updateData.Body = validation.SanitizeHTML(updateData.Body)
	updateData.Slug = validation.SanitizeHTML(updateData.Slug)
	updateData.Previous = validation.SanitizeHTML(updateData.Previous)
	updateData.Next = validation.SanitizeHTML(updateData.Next)

	// Validate post data (using update validation which doesn't require author)
	if validationErrors := validation.ValidatePostUpdate(&updateData); len(validationErrors) > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"code":    "VALIDATION_ERROR",
			"details": validationErrors,
		})
		return
	}

	// Update the existing post with new data
	if updateData.Title != "" {
		existingPost.Title = updateData.Title
	}
	if updateData.Body != "" {
		existingPost.Body = updateData.Body
	}
	if updateData.Slug != "" {
		existingPost.Slug = updateData.Slug
	}
	if !updateData.CreatedAt.IsZero() {
		existingPost.CreatedAt = updateData.CreatedAt
	}
	existingPost.Previous = updateData.Previous
	existingPost.Next = updateData.Next
	existingPost.UpdatedAt = time.Now().UTC()

	// Update in Cosmos DB
	updatedPostBytes, err := json.Marshal(existingPost)
	if err != nil {
		log.Printf("Failed to marshal updated post: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to update post",
			"code":  "SERIALIZATION_ERROR",
		})
		return
	}

	_, err = database.PostsContainer.ReplaceItem(ctx, postPartitionKey, existingPost.ID, updatedPostBytes, nil)
	if err != nil {
		log.Printf("Failed to update post in Cosmos DB: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to update post",
			"code":  "DATABASE_ERROR",
		})
		return
	}

	middleware.PostsCache.InvalidateVersion()
	// Convert back to regular Post for response
	updatedPost := existingPost.ToPost()
	c.JSON(http.StatusOK, updatedPost)
}

// DeletePostDB handles DELETE /api/posts/:id with Cosmos DB cascade deletion
func DeletePostDB(c *gin.Context) {
	ctx := c.Request.Context()
	idParam := c.Param("id")

	// Find the existing post
	var queryStr string
	var parameters []azcosmos.QueryParameter

	// Try to find by slug first, then by ID
	queryStr = "SELECT * FROM c WHERE c.type = 'post' AND (c.slug = @param OR c.id = @param)"
	parameters = append(parameters, azcosmos.QueryParameter{
		Name:  "@param",
		Value: idParam,
	})

	// Also try with post- prefix for ID-based queries
	if _, err := strconv.Atoi(idParam); err == nil {
		queryStr = "SELECT * FROM c WHERE c.type = 'post' AND (c.slug = @param OR c.id = @param OR c.id = @postId)"
		parameters = append(parameters, azcosmos.QueryParameter{
			Name:  "@postId",
			Value: fmt.Sprintf("post-%s", idParam),
		})
	}

	queryOptions := azcosmos.QueryOptions{
		QueryParameters: parameters,
	}

	postPartitionKey := azcosmos.NewPartitionKeyString("post")
	queryIterator := database.PostsContainer.NewQueryItemsPager(queryStr, postPartitionKey, &queryOptions)

	var existingPost models.CosmosPost
	var found bool

	if queryIterator.More() {
		queryResponse, err := queryIterator.NextPage(ctx)
		if err != nil {
			log.Printf("Error querying post for deletion: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find post"})
			return
		}

		if len(queryResponse.Items) > 0 {
			if err := json.Unmarshal(queryResponse.Items[0], &existingPost); err != nil {
				log.Printf("Error unmarshaling post for deletion: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse post"})
				return
			}
			found = true
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "post not found",
			"code":  "POST_NOT_FOUND",
		})
		return
	}

	// Delete the post from Cosmos DB
	_, err := database.PostsContainer.DeleteItem(ctx, postPartitionKey, existingPost.ID, nil)
	if err != nil {
		log.Printf("Failed to delete post from Cosmos DB: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to delete post",
			"code":  "DATABASE_ERROR",
		})
		return
	}

	// TODO: Delete related comments from comments container
	// For now, we'll leave comments as orphaned records
	// In production, you might want to implement cascade deletion for comments

	middleware.PostsCache.InvalidateVersion()
	log.Printf("Successfully deleted post with ID: %s", existingPost.ID)
	c.JSON(http.StatusOK, gin.H{
		"message": "post deleted successfully",
		"id":      existingPost.ID,
	})
}

// SearchPostsDB handles search functionality (redirects to GetPostsDB with search parameter)
func SearchPostsDB(c *gin.Context) {
	// Legacy support: redirect ?q= to ?search=
	if q := c.Query("q"); q != "" {
		c.Request.URL.RawQuery = strings.Replace(c.Request.URL.RawQuery, "q="+q, "search="+q, 1)
	}

	// Use the main GetPostsDB function which now handles search
	GetPostsDB(c)
}

// GetPopularPostsDB returns posts sorted by view count (redirects to GetPostsDB with sort parameters)
func GetPopularPostsDB(c *gin.Context) {
	// Set default sort parameters for popular posts
	query := c.Request.URL.Query()
	if query.Get("sort") == "" {
		query.Set("sort", "page_views")
	}
	if query.Get("order") == "" {
		query.Set("order", "desc")
	}
	if query.Get("limit") == "" {
		query.Set("limit", "10")
	}
	c.Request.URL.RawQuery = query.Encode()

	// Use the main GetPostsDB function
	GetPostsDB(c)
}
