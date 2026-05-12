package models

import (
	"fmt"
	"time"
)

// CosmosPost represents a blog post in Cosmos DB
type CosmosPost struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"` // "post" for type discrimination
	Slug      string    `json:"slug"`
	Previous  string    `json:"previous,omitempty"`
	Next      string    `json:"next,omitempty"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Author    string    `json:"author"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// Analytics (embedded for API compatibility)
	PageViews   int        `json:"pageViews"`
	RecentViews int        `json:"recentViews"`
	LastViewed  *time.Time `json:"lastViewed,omitempty"`
	FirstViewed *time.Time `json:"firstViewed,omitempty"`

	// Comment count field (computed)
	CommentCount int `json:"commentCount"`
}

// CosmosComment represents a comment in Cosmos DB
type CosmosComment struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`   // "comment" for type discrimination
	PostID    string    `json:"postId"` // Partition key
	Content   string    `json:"content"`
	Author    string    `json:"author"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// Reply functionality
	ParentID *string `json:"parentId,omitempty"`

	// Like count
	LikeCount int `json:"likeCount"`
}

// CosmosCommentLike represents a like on a comment in Cosmos DB
type CosmosCommentLike struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`   // "comment_like" for type discrimination
	PostID    string    `json:"postId"` // Partition key (same as comment)
	CommentID string    `json:"commentId"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"createdAt"`
}

// CosmosUser represents a user in Cosmos DB
type CosmosUser struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"` // "user" for type discrimination
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Picture   string    `json:"picture,omitempty"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// CosmosUserPreferences represents stored preferences for a user
type CosmosUserPreferences struct {
	ID        string    `json:"id"`       // "prefs-{username}"
	Type      string    `json:"type"`     // "user_preferences"
	Username  string    `json:"username"` // partition key
	Theme     string    `json:"theme"`    // "dark" or "light"
	UpdatedAt time.Time `json:"updatedAt"`
}

// CosmosPostAnalytics represents analytics events in Cosmos DB
type CosmosPostAnalytics struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`   // "analytics" for type discrimination
	PostID    string    `json:"postId"` // Partition key
	PostSlug  string    `json:"postSlug"`
	ViewedAt  time.Time `json:"viewedAt"`
	UserAgent string    `json:"userAgent,omitempty"`
	IPAddress string    `json:"ipAddress,omitempty"`
	Referrer  string    `json:"referrer,omitempty"`
}

// Helper methods to convert between GORM and Cosmos models

// ToCosmosPost converts a GORM Post to CosmosPost
func (p *Post) ToCosmosPost() *CosmosPost {
	return &CosmosPost{
		ID:           fmt.Sprintf("post-%d", p.ID),
		Type:         "post",
		Slug:         p.Slug,
		Previous:     p.Previous,
		Next:         p.Next,
		Title:        p.Title,
		Body:         p.Body,
		Author:       p.Author,
		CreatedAt:    p.CreatedAt,
		UpdatedAt:    p.UpdatedAt,
		PageViews:    p.PageViews,
		RecentViews:  p.RecentViews,
		LastViewed:   p.LastViewed,
		FirstViewed:  p.FirstViewed,
		CommentCount: p.CommentCount,
	}
}

// ToPost converts a CosmosPost to GORM Post (for compatibility)
func (cp *CosmosPost) ToPost() *Post {
	// Extract numeric ID from string ID
	var id uint
	fmt.Sscanf(cp.ID, "post-%d", &id)

	return &Post{
		ID:           id,
		Slug:         cp.Slug,
		Previous:     cp.Previous,
		Next:         cp.Next,
		Title:        cp.Title,
		Body:         cp.Body,
		Author:       cp.Author,
		CreatedAt:    cp.CreatedAt,
		UpdatedAt:    cp.UpdatedAt,
		PageViews:    cp.PageViews,
		RecentViews:  cp.RecentViews,
		LastViewed:   cp.LastViewed,
		FirstViewed:  cp.FirstViewed,
		CommentCount: cp.CommentCount,
	}
}

// ToCosmosComment converts a GORM Comment to CosmosComment
func (c *Comment) ToCosmosComment() *CosmosComment {
	var parentID *string
	if c.ParentID != nil {
		parentIDStr := fmt.Sprintf("comment-%d", *c.ParentID)
		parentID = &parentIDStr
	}

	return &CosmosComment{
		ID:        fmt.Sprintf("comment-%d", c.ID),
		Type:      "comment",
		PostID:    fmt.Sprintf("post-%d", c.PostID),
		Content:   c.Content,
		Author:    c.Author,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
		ParentID:  parentID,
		LikeCount: c.LikeCount,
	}
}

// ToComment converts a CosmosComment to GORM Comment (for compatibility)
func (cc *CosmosComment) ToComment() *Comment {
	var postID, parentID uint
	fmt.Sscanf(cc.PostID, "post-%d", &postID)

	var parentIDPtr *uint
	if cc.ParentID != nil {
		fmt.Sscanf(*cc.ParentID, "comment-%d", &parentID)
		parentIDPtr = &parentID
	}

	// Extract numeric ID from comment string - keep the original ID for frontend compatibility
	var numericID uint64
	fmt.Sscanf(cc.ID, "comment-%d", &numericID)

	// For compatibility with frontend, we need to use the original timestamp as ID
	// Convert to uint - Go's uint is at least 32 bits, often 64 bits on modern systems
	finalID := uint(numericID)

	return &Comment{
		ID:        finalID,
		PostID:    postID,
		Content:   cc.Content,
		Author:    cc.Author,
		CreatedAt: cc.CreatedAt,
		UpdatedAt: cc.UpdatedAt,
		ParentID:  parentIDPtr,
		LikeCount: cc.LikeCount,
		CosmosID:  cc.ID, // Store the full Cosmos ID for reference
	}
}

// ToCosmosUser converts a GORM User to CosmosUser
func (u *User) ToCosmosUser() *CosmosUser {
	return &CosmosUser{
		ID:        fmt.Sprintf("user-%d", u.ID),
		Type:      "user",
		Username:  u.Username,
		Email:     u.Email,
		Name:      u.Name,
		Picture:   u.Picture,
		Role:      u.Role,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}

// ToUser converts a CosmosUser to GORM User (for compatibility)
func (cu *CosmosUser) ToUser() *User {
	var id uint
	fmt.Sscanf(cu.ID, "user-%d", &id)

	return &User{
		ID:        id,
		Username:  cu.Username,
		Email:     cu.Email,
		Name:      cu.Name,
		Picture:   cu.Picture,
		Role:      cu.Role,
		CreatedAt: cu.CreatedAt,
		UpdatedAt: cu.UpdatedAt,
	}
}
