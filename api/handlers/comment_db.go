package handlers

import (
	"context"
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

// invalidateCommentCache removes the cached comment list for a specific post.
// postCosmosID is in the form "post-123"; we strip the prefix to match the
// query param the frontend sends (?post_id=123).
func invalidateCommentCache(postCosmosID string) {
	numericID := strings.TrimPrefix(postCosmosID, "post-")
	key := "GET:/api/comments?post_id=" + numericID
	middleware.APICache.Invalidate(key)
	log.Printf("Invalidated comment cache for post %s", postCosmosID)
}

// GetCommentsDB handles GET /api/comments with Cosmos DB storage
func GetCommentsDB(c *gin.Context) {
	ctx := c.Request.Context()

	// Filter by post_id if provided
	if postIDStr := c.Query("post_id"); postIDStr != "" {

		// Convert post_id to proper format
		var postCosmosID string
		if postID, parseErr := strconv.Atoi(postIDStr); parseErr == nil {
			postCosmosID = fmt.Sprintf("post-%d", postID)
		} else {
			// Try as-is if it's already in string format
			postCosmosID = postIDStr
		}

		// Query all comments for the specific post (including replies)
		queryStr := "SELECT * FROM c WHERE c.type = 'comment' AND c.postId = @postId ORDER BY c.likeCount DESC, c.createdAt ASC"
		parameters := []azcosmos.QueryParameter{
			{
				Name:  "@postId",
				Value: postCosmosID,
			},
		}

		queryOptions := azcosmos.QueryOptions{
			QueryParameters: parameters,
		}

		// Comments are partitioned by postId, so we can use the specific partition
		commentPartitionKey := azcosmos.NewPartitionKeyString(postCosmosID)
		queryIterator := database.CommentsContainer.NewQueryItemsPager(queryStr, commentPartitionKey, &queryOptions)

		var cosmosComments []models.CosmosComment

		// Get all pages of results
		for queryIterator.More() {
			queryResponse, err := queryIterator.NextPage(ctx)
			if err != nil {
				log.Printf("Error querying comments: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch comments"})
				return
			}

			for _, item := range queryResponse.Items {
				var comment models.CosmosComment
				if err := json.Unmarshal(item, &comment); err != nil {
					log.Printf("Error unmarshaling comment: %v", err)
					continue
				}
				cosmosComments = append(cosmosComments, comment)
			}
		}

		log.Printf("Found %d comments for post %s", len(cosmosComments), postCosmosID)

		// Convert to regular Comment models for API compatibility
		var comments []models.Comment
		for _, cosmosComment := range cosmosComments {
			comments = append(comments, *cosmosComment.ToComment())
		}

		// Return array directly for frontend compatibility
		c.JSON(http.StatusOK, comments)
		return
	}

	// If no post_id provided, return empty array for frontend compatibility
	c.JSON(http.StatusOK, []models.Comment{})
}

// CreateCommentDB handles POST /api/comments with Cosmos DB storage
func CreateCommentDB(c *gin.Context) {
	ctx := c.Request.Context()

	var requestData struct {
		PostID  any    `json:"post_id"`
		Content string `json:"content"`
		Author  string `json:"author"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid request body",
			"code":    "INVALID_JSON",
			"details": err.Error(),
		})
		return
	}

	// Sanitize input
	requestData.Content = validation.SanitizeHTML(requestData.Content)
	requestData.Author = validation.SanitizeHTML(requestData.Author)

	// Get user from context (set by auth middleware)
	if userI, exists := c.Get("user"); exists {
		if claims, ok := userI.(*middleware.Claims); ok {
			// Strip email domain for display (e.g., "user@gmail.com" -> "user")
			username := claims.Username
			if atIndex := strings.Index(username, "@"); atIndex != -1 {
				username = username[:atIndex]
			}
			requestData.Author = username
		}
	}

	// Convert post_id to string format
	var postCosmosID string
	switch v := requestData.PostID.(type) {
	case float64:
		postCosmosID = fmt.Sprintf("post-%.0f", v)
	case string:
		if postID, err := strconv.Atoi(v); err == nil {
			postCosmosID = fmt.Sprintf("post-%d", postID)
		} else {
			postCosmosID = v
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post_id format"})
		return
	}

	// Create new comment
	now := time.Now().UTC()
	// Use milliseconds instead of nanoseconds to avoid uint overflow issues
	commentID := fmt.Sprintf("comment-%d", now.UnixMilli())

	cosmosComment := models.CosmosComment{
		ID:        commentID,
		Type:      "comment",
		PostID:    postCosmosID,
		Content:   requestData.Content,
		Author:    requestData.Author,
		CreatedAt: now,
		UpdatedAt: now,
		LikeCount: 0,
	}

	// Convert to JSON
	commentBytes, err := json.Marshal(cosmosComment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create comment"})
		return
	}

	// Insert into Cosmos DB
	commentPartitionKey := azcosmos.NewPartitionKeyString(postCosmosID)
	_, err = database.CommentsContainer.CreateItem(ctx, commentPartitionKey, commentBytes, nil)
	if err != nil {
		log.Printf("Failed to create comment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create comment"})
		return
	}

	// Update post comment count
	if err := incrementPostCommentCount(ctx, postCosmosID); err != nil {
		log.Printf("Failed to update post comment count: %v", err)
		// Don't fail the request if we can't update the count
	}

	invalidateCommentCache(postCosmosID)

	// Convert back to regular Comment for response
	comment := cosmosComment.ToComment()
	c.JSON(http.StatusCreated, comment)
}

func UpdateCommentDB(c *gin.Context) {
	ctx := c.Request.Context()
	commentID := c.Param("id")

	// Get user from auth middleware
	var username string
	if userI, exists := c.Get("user"); exists {
		if claims, ok := userI.(*middleware.Claims); ok {
			username = claims.Username
		}
	}

	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required to update comments"})
		return
	}

	var requestData struct {
		Content string `json:"content"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Sanitize input
	requestData.Content = validation.SanitizeHTML(requestData.Content)

	if strings.TrimSpace(requestData.Content) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "comment content cannot be empty"})
		return
	}

	// Check for postId query parameter to optimize lookup
	postIDParam := c.Query("postId")

	var comment *models.CosmosComment
	var err error

	if postIDParam != "" {
		comment, err = getCommentByIDWithPartition(ctx, commentID, postIDParam)
	} else {
		comment, err = getCommentByID(ctx, commentID)
	}

	if err != nil {
		log.Printf("Error finding comment %s: %v", commentID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}

	// Check if user is the author
	// Strip email domain from username for comparison (e.g., "user@gmail.com" -> "user")
	usernameWithoutDomain := username
	if atIndex := strings.Index(username, "@"); atIndex != -1 {
		usernameWithoutDomain = username[:atIndex]
	}
	if comment.Author != usernameWithoutDomain {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only edit your own comments"})
		return
	}

	// Update comment
	comment.Content = requestData.Content
	comment.UpdatedAt = time.Now().UTC()

	commentBytes, err := json.Marshal(comment)
	if err != nil {
		log.Printf("Failed to marshal updated comment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update comment"})
		return
	}

	partitionKey := azcosmos.NewPartitionKeyString(comment.PostID)
	_, err = database.CommentsContainer.ReplaceItem(ctx, partitionKey, comment.ID, commentBytes, nil)
	if err != nil {
		log.Printf("Failed to update comment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update comment"})
		return
	}

	invalidateCommentCache(comment.PostID)
	log.Printf("Successfully updated comment %s by user %s", commentID, username)

	// Convert back to regular Comment for response
	updatedComment := comment.ToComment()
	c.JSON(http.StatusOK, updatedComment)
}

func DeleteCommentDB(c *gin.Context) {
	ctx := c.Request.Context()
	commentID := c.Param("id")

	// Get user from auth middleware
	var username string
	if userI, exists := c.Get("user"); exists {
		if claims, ok := userI.(*middleware.Claims); ok {
			username = claims.Username
		}
	}

	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required to delete comments"})
		return
	}

	// Check for postId query parameter to optimize lookup
	postIDParam := c.Query("postId")

	var comment *models.CosmosComment
	var err error

	if postIDParam != "" {
		comment, err = getCommentByIDWithPartition(ctx, commentID, postIDParam)
	} else {
		comment, err = getCommentByID(ctx, commentID)
	}

	if err != nil {
		log.Printf("Error finding comment %s: %v", commentID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}

	// Check if user is the author
	// Strip email domain from username for comparison (e.g., "user@gmail.com" -> "user")
	usernameWithoutDomain := username
	if atIndex := strings.Index(username, "@"); atIndex != -1 {
		usernameWithoutDomain = username[:atIndex]
	}
	if comment.Author != usernameWithoutDomain {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only delete your own comments"})
		return
	}

	// Delete the comment
	partitionKey := azcosmos.NewPartitionKeyString(comment.PostID)
	_, err = database.CommentsContainer.DeleteItem(ctx, partitionKey, comment.ID, nil)
	if err != nil {
		log.Printf("Failed to delete comment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete comment"})
		return
	}

	log.Printf("Successfully deleted comment %s by user %s", commentID, username)

	// Update post comment count
	if err := decrementPostCommentCount(ctx, comment.PostID); err != nil {
		log.Printf("Failed to update post comment count: %v", err)
		// Don't fail the request if we can't update the count
	}

	invalidateCommentCache(comment.PostID)

	c.JSON(http.StatusOK, gin.H{"message": "comment deleted successfully"})
}

func LikeCommentDB(c *gin.Context) {
	ctx := c.Request.Context()
	commentID := c.Param("id")

	// Get user from auth middleware
	var username string
	if userI, exists := c.Get("user"); exists {
		if claims, ok := userI.(*middleware.Claims); ok {
			username = claims.Username
		}
	}

	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required to like comments"})
		return
	}

	// Check for postId query parameter to optimize lookup
	postIDParam := c.Query("postId")

	var comment *models.CosmosComment
	var err error

	if postIDParam != "" {
		// If we have the post ID, we can use it as the partition key for faster lookup
		comment, err = getCommentByIDWithPartition(ctx, commentID, postIDParam)
	} else {
		// Fall back to cross-partition query
		comment, err = getCommentByID(ctx, commentID)
	}

	if err != nil {
		log.Printf("Error finding comment %s: %v", commentID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}

	// Check if user already liked this comment
	existingLike, err := findCommentLike(ctx, commentID, username, comment.PostID)
	if err != nil && err.Error() != "like not found" {
		log.Printf("Error checking existing like: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check existing likes"})
		return
	}

	if existingLike != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "already liked this comment"})
		return
	}

	// Create new like
	now := time.Now().UTC()
	likeID := fmt.Sprintf("like-%d-%s", now.UnixNano(), username)

	newLike := models.CosmosCommentLike{
		ID:        likeID,
		Type:      "comment_like",
		PostID:    comment.PostID,
		CommentID: commentID,
		Username:  username,
		CreatedAt: now,
	}

	// Insert like into Cosmos DB
	likeBytes, err := json.Marshal(newLike)
	if err != nil {
		log.Printf("Failed to marshal like: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create like"})
		return
	}

	partitionKey := azcosmos.NewPartitionKeyString(comment.PostID)
	_, err = database.CommentsContainer.CreateItem(ctx, partitionKey, likeBytes, nil)
	if err != nil {
		log.Printf("Failed to create like: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create like"})
		return
	}

	// Update comment like count
	comment.LikeCount++
	comment.UpdatedAt = now

	commentBytes, err := json.Marshal(comment)
	if err != nil {
		log.Printf("Failed to marshal updated comment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update comment"})
		return
	}

	_, err = database.CommentsContainer.ReplaceItem(ctx, partitionKey, comment.ID, commentBytes, nil)
	if err != nil {
		log.Printf("Failed to update comment like count: %v", err)
		// Don't fail the request if we can't update the count
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "comment liked successfully",
		"like_count": comment.LikeCount,
	})
}

func UnlikeCommentDB(c *gin.Context) {
	ctx := c.Request.Context()
	commentID := c.Param("id")

	// Get user from auth middleware
	var username string
	if userI, exists := c.Get("user"); exists {
		if claims, ok := userI.(*middleware.Claims); ok {
			username = claims.Username
		}
	}

	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required to unlike comments"})
		return
	}

	// Check for postId query parameter to optimize lookup
	postIDParam := c.Query("postId")

	var comment *models.CosmosComment
	var err error

	if postIDParam != "" {
		// If we have the post ID, we can use it as the partition key for faster lookup
		comment, err = getCommentByIDWithPartition(ctx, commentID, postIDParam)
	} else {
		// Fall back to cross-partition query
		comment, err = getCommentByID(ctx, commentID)
	}

	if err != nil {
		log.Printf("Error finding comment %s: %v", commentID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}

	// Find the existing like
	existingLike, err := findCommentLike(ctx, commentID, username, comment.PostID)
	if err != nil {
		if err.Error() == "like not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "like not found"})
		} else {
			log.Printf("Error finding existing like: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find existing like"})
		}
		return
	}

	// Delete the like
	partitionKey := azcosmos.NewPartitionKeyString(comment.PostID)
	_, err = database.CommentsContainer.DeleteItem(ctx, partitionKey, existingLike.ID, nil)
	if err != nil {
		log.Printf("Failed to delete like: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete like"})
		return
	}

	// Update comment like count
	if comment.LikeCount > 0 {
		comment.LikeCount--
	}
	comment.UpdatedAt = time.Now().UTC()

	commentBytes, err := json.Marshal(comment)
	if err != nil {
		log.Printf("Failed to marshal updated comment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update comment"})
		return
	}

	_, err = database.CommentsContainer.ReplaceItem(ctx, partitionKey, comment.ID, commentBytes, nil)
	if err != nil {
		log.Printf("Failed to update comment like count: %v", err)
		// Don't fail the request if we can't update the count
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "comment unliked successfully",
		"like_count": comment.LikeCount,
	})
}

func CreateReplyDB(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "comment replies not yet implemented for Cosmos DB"})
}

func DeleteReplyDB(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "reply deletion not yet implemented for Cosmos DB"})
}

func GetCommentLikesDB(c *gin.Context) {
	ctx := c.Request.Context()
	commentID := c.Param("id")

	// Get current user (if authenticated)
	var currentUser string
	if userI, exists := c.Get("user"); exists {
		if claims, ok := userI.(*middleware.Claims); ok {
			currentUser = claims.Username
			log.Printf("GetCommentLikes: currentUser from token = %s", currentUser)
		}
	}

	// Check for postId query parameter to optimize lookup
	postIDParam := c.Query("postId")

	var comment *models.CosmosComment
	var err error

	if postIDParam != "" {
		// If we have the post ID, we can use it as the partition key for faster lookup
		comment, err = getCommentByIDWithPartition(ctx, commentID, postIDParam)
	} else {
		// Fall back to cross-partition query
		comment, err = getCommentByID(ctx, commentID)
	}

	if err != nil {
		log.Printf("Error finding comment %s: %v", commentID, err)
		// Return zero likes instead of 404 for better UX
		c.JSON(http.StatusOK, gin.H{
			"like_count": 0,
			"user_liked": false,
		})
		return
	}

	// Query likes for this comment
	queryStr := "SELECT * FROM c WHERE c.type = 'comment_like' AND c.commentId = @commentId"
	parameters := []azcosmos.QueryParameter{
		{
			Name:  "@commentId",
			Value: commentID,
		},
	}

	log.Printf("GetCommentLikes: Querying likes for commentID=%s, partition=%s", commentID, comment.PostID)

	queryOptions := azcosmos.QueryOptions{
		QueryParameters: parameters,
	}

	// Use the same partition key as the comment (postId)
	partitionKey := azcosmos.NewPartitionKeyString(comment.PostID)
	queryIterator := database.CommentsContainer.NewQueryItemsPager(queryStr, partitionKey, &queryOptions)

	var likes []models.CosmosCommentLike
	userLiked := false

	// Get all pages of results
	for queryIterator.More() {
		queryResponse, err := queryIterator.NextPage(ctx)
		if err != nil {
			log.Printf("Error querying comment likes: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch likes"})
			return
		}

		for _, item := range queryResponse.Items {
			var like models.CosmosCommentLike
			if err := json.Unmarshal(item, &like); err != nil {
				log.Printf("Error unmarshaling comment like: %v", err)
				continue
			}
			likes = append(likes, like)
			log.Printf("GetCommentLikes: Found like - ID=%s, Username=%s, CommentID=%s", like.ID, like.Username, like.CommentID)

			// Check if current user liked this comment
			if currentUser != "" && like.Username == currentUser {
				log.Printf("GetCommentLikes: Match! Current user %s liked this comment", currentUser)
				userLiked = true
			}
		}
	}

	log.Printf("GetCommentLikes: Returning like_count=%d, user_liked=%v for user=%s", len(likes), userLiked, currentUser)

	c.JSON(http.StatusOK, gin.H{
		"like_count": len(likes),
		"user_liked": userLiked,
	})
}

func ReplyToCommentDB(c *gin.Context) {
	ctx := c.Request.Context()
	parentCommentID := c.Param("id")

	var requestData struct {
		Content string `json:"content"`
		Author  string `json:"author"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid request body",
			"code":    "INVALID_JSON",
			"details": err.Error(),
		})
		return
	}

	// Sanitize input
	requestData.Content = validation.SanitizeHTML(requestData.Content)
	requestData.Author = validation.SanitizeHTML(requestData.Author)

	// Get user from context (set by auth middleware)
	if userI, exists := c.Get("user"); exists {
		if claims, ok := userI.(*middleware.Claims); ok {
			// Strip email domain for display (e.g., "user@gmail.com" -> "user")
			username := claims.Username
			if atIndex := strings.Index(username, "@"); atIndex != -1 {
				username = username[:atIndex]
			}
			requestData.Author = username
		}
	}

	if requestData.Author == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required to reply to comments"})
		return
	}

	if strings.TrimSpace(requestData.Content) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "reply content cannot be empty"})
		return
	}

	// Check for postId query parameter to optimize lookup
	postIDParam := c.Query("postId")

	var parentComment *models.CosmosComment
	var err error

	if postIDParam != "" {
		// If we have the post ID, we can use it as the partition key for faster lookup
		log.Printf("Using postId from query parameter for reply lookup: %s", postIDParam)
		parentComment, err = getCommentByIDWithPartition(ctx, parentCommentID, postIDParam)
	} else {
		// Fall back to cross-partition query
		parentComment, err = getCommentByID(ctx, parentCommentID)
	}

	if err != nil {
		log.Printf("Error finding parent comment %s: %v", parentCommentID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "parent comment not found"})
		return
	}

	// Create new reply comment
	now := time.Now().UTC()
	// Use milliseconds instead of nanoseconds to avoid uint overflow issues
	replyID := fmt.Sprintf("comment-%d", now.UnixMilli())

	replyComment := models.CosmosComment{
		ID:        replyID,
		Type:      "comment",
		PostID:    parentComment.PostID, // Same post as parent
		Content:   requestData.Content,
		Author:    requestData.Author,
		CreatedAt: now,
		UpdatedAt: now,
		ParentID:  &parentComment.ID, // Set parent ID for reply
		LikeCount: 0,
	}

	// Convert to JSON
	replyBytes, err := json.Marshal(replyComment)
	if err != nil {
		log.Printf("Failed to marshal reply: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create reply"})
		return
	}

	// Insert into Cosmos DB (same partition as parent comment)
	commentPartitionKey := azcosmos.NewPartitionKeyString(parentComment.PostID)
	_, err = database.CommentsContainer.CreateItem(ctx, commentPartitionKey, replyBytes, nil)
	if err != nil {
		log.Printf("Failed to create reply: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create reply"})
		return
	}

	log.Printf("Successfully created reply %s to comment %s by user %s", replyID, parentCommentID, requestData.Author)

	// Update post comment count
	if err := incrementPostCommentCount(ctx, parentComment.PostID); err != nil {
		log.Printf("Failed to update post comment count: %v", err)
		// Don't fail the request if we can't update the count
	}

	invalidateCommentCache(parentComment.PostID)

	// Convert back to regular Comment for response
	reply := replyComment.ToComment()
	c.JSON(http.StatusCreated, reply)
}

// Helper function to get a comment by ID with known partition key (faster)
func getCommentByIDWithPartition(ctx context.Context, commentID, postID string) (*models.CosmosComment, error) {
	log.Printf("Getting comment %s from partition %s", commentID, postID)

	// Ensure IDs have correct format
	if !strings.HasPrefix(commentID, "comment-") {
		commentID = "comment-" + commentID
	}
	if !strings.HasPrefix(postID, "post-") {
		postID = "post-" + postID
	}

	// Use ReadItem for direct lookup with partition key (most efficient)
	partitionKey := azcosmos.NewPartitionKeyString(postID)

	response, err := database.CommentsContainer.ReadItem(ctx, partitionKey, commentID, nil)
	if err != nil {
		log.Printf("Error reading comment %s from partition %s: %v", commentID, postID, err)
		return nil, fmt.Errorf("comment not found: %v", err)
	}

	var comment models.CosmosComment
	if err := json.Unmarshal(response.Value, &comment); err != nil {
		log.Printf("Error unmarshaling comment: %v", err)
		return nil, fmt.Errorf("failed to unmarshal comment: %v", err)
	}

	log.Printf("Found comment %s in partition %s", comment.ID, comment.PostID)
	return &comment, nil
}

// Helper function to get a comment by ID (uses cross-partition query)
func getCommentByID(ctx context.Context, commentID string) (*models.CosmosComment, error) {
	log.Printf("Searching for comment ID: %s", commentID)

	// Ensure the ID has the correct format
	if !strings.HasPrefix(commentID, "comment-") {
		commentID = "comment-" + commentID
	}

	// Use cross-partition query to find the comment by ID
	// Note: Cross-partition queries require EnableCrossPartitionQuery option
	queryStr := "SELECT * FROM c WHERE c.id = @commentId AND c.type = 'comment'"
	parameters := []azcosmos.QueryParameter{
		{
			Name:  "@commentId",
			Value: commentID,
		},
	}

	queryOptions := azcosmos.QueryOptions{
		QueryParameters: parameters,
	}

	log.Printf("Running cross-partition query for comment: %s", commentID)

	// Cross-partition query - use empty partition key value to scan all partitions
	queryIterator := database.CommentsContainer.NewQueryItemsPager(queryStr, azcosmos.NullPartitionKey, &queryOptions)

	pageCount := 0
	for queryIterator.More() {
		pageCount++
		queryResponse, err := queryIterator.NextPage(ctx)
		if err != nil {
			log.Printf("Error querying for comment (page %d): %v", pageCount, err)
			return nil, fmt.Errorf("failed to query comment: %v", err)
		}

		log.Printf("Cross-partition query page %d returned %d items", pageCount, len(queryResponse.Items))

		if len(queryResponse.Items) > 0 {
			var comment models.CosmosComment
			if err := json.Unmarshal(queryResponse.Items[0], &comment); err != nil {
				log.Printf("Error unmarshaling comment: %v", err)
				return nil, fmt.Errorf("failed to unmarshal comment: %v", err)
			}
			log.Printf("Found comment: %s in partition %s", comment.ID, comment.PostID)
			return &comment, nil
		}
	}

	log.Printf("Comment %s not found after checking %d pages", commentID, pageCount)
	return nil, fmt.Errorf("comment not found")
}

// Helper function to find a specific like by comment ID and username
func findCommentLike(ctx context.Context, commentID, username, postID string) (*models.CosmosCommentLike, error) {
	queryStr := "SELECT * FROM c WHERE c.type = 'comment_like' AND c.commentId = @commentId AND c.username = @username"
	parameters := []azcosmos.QueryParameter{
		{
			Name:  "@commentId",
			Value: commentID,
		},
		{
			Name:  "@username",
			Value: username,
		},
	}

	queryOptions := azcosmos.QueryOptions{
		QueryParameters: parameters,
	}

	partitionKey := azcosmos.NewPartitionKeyString(postID)
	queryIterator := database.CommentsContainer.NewQueryItemsPager(queryStr, partitionKey, &queryOptions)

	if queryIterator.More() {
		queryResponse, err := queryIterator.NextPage(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to query like: %v", err)
		}

		if len(queryResponse.Items) > 0 {
			var like models.CosmosCommentLike
			if err := json.Unmarshal(queryResponse.Items[0], &like); err != nil {
				return nil, fmt.Errorf("failed to unmarshal like: %v", err)
			}
			return &like, nil
		}
	}

	return nil, fmt.Errorf("like not found")
}

// incrementPostCommentCount increments the comment count for a post
func incrementPostCommentCount(ctx context.Context, postID string) error {
	return updatePostCommentCount(ctx, postID, 1)
}

// decrementPostCommentCount decrements the comment count for a post
func decrementPostCommentCount(ctx context.Context, postID string) error {
	return updatePostCommentCount(ctx, postID, -1)
}

// updatePostCommentCount updates the comment count for a post by the given delta
func updatePostCommentCount(ctx context.Context, postID string, delta int) error {
	// Get the post from posts container
	postPartitionKey := azcosmos.NewPartitionKeyString("post")

	// Read the post
	response, err := database.PostsContainer.ReadItem(ctx, postPartitionKey, postID, nil)
	if err != nil {
		return fmt.Errorf("failed to read post: %v", err)
	}

	var post models.CosmosPost
	if err := json.Unmarshal(response.Value, &post); err != nil {
		return fmt.Errorf("failed to unmarshal post: %v", err)
	}

	// Update comment count
	post.CommentCount += delta
	if post.CommentCount < 0 {
		post.CommentCount = 0 // Ensure count doesn't go negative
	}
	post.UpdatedAt = time.Now().UTC()

	// Save the updated post
	updatedPostBytes, err := json.Marshal(post)
	if err != nil {
		return fmt.Errorf("failed to marshal updated post: %v", err)
	}

	_, err = database.PostsContainer.ReplaceItem(ctx, postPartitionKey, post.ID, updatedPostBytes, nil)
	if err != nil {
		return fmt.Errorf("failed to update post: %v", err)
	}

	log.Printf("Updated comment count for post %s: %d (delta: %d)", postID, post.CommentCount, delta)
	return nil
}
