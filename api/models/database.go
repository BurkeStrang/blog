package models

import (
	"time"
)

// Post represents a blog post (for API compatibility with Cosmos DB)
type Post struct {
	ID          uint      `json:"id"`
	Slug        string    `json:"slug"`
	Title       string    `json:"title"`
	Body        string    `json:"body"`
	Author      string    `json:"author"`
	CreatedAt   time.Time `json:"date"`
	UpdatedAt   time.Time `json:"-"`

	// Analytics (embedded for API compatibility)
	PageViews   int       `json:"pageViews"`
	RecentViews int       `json:"recentViews"`
	LastViewed  *time.Time `json:"lastViewed,omitempty"`
	FirstViewed *time.Time `json:"firstViewed,omitempty"`

	// Comment count field
	CommentCount int `json:"commentCount"`
}

// Comment represents a comment on a blog post
type Comment struct {
	ID        uint      `json:"id"`
	PostID    uint      `json:"post_id"`
	Content   string    `json:"content"`
	Author    string    `json:"author"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"-"`

	// Reply functionality
	ParentID  *uint     `json:"parent_id,omitempty"`

	// Like count
	LikeCount int       `json:"like_count"`

	// Cosmos DB ID (for reference)
	CosmosID  string    `json:"cosmos_id,omitempty"`
}

// CommentLike represents a like on a comment
type CommentLike struct {
	ID        uint      `json:"id"`
	CommentID uint      `json:"comment_id"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
}

// User represents a user in the system
type User struct {
	ID        uint      `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Picture   string    `json:"picture,omitempty"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"-"`
}

// PostAnalytics represents detailed analytics for posts
type PostAnalytics struct {
	ID          uint      `json:"id"`
	PostSlug    string    `json:"post_slug"`
	ViewedAt    time.Time `json:"viewed_at"`
	UserAgent   string    `json:"user_agent,omitempty"`
	IPAddress   string    `json:"ip_address,omitempty"`
	Referrer    string    `json:"referrer,omitempty"`
}

// Legacy compatibility types for analytics service
type AnalyticsData struct {
	Posts map[string]*AnalyticsEntry `json:"posts"`
}

type AnalyticsEntry struct {
	Slug        string    `json:"slug"`
	PageViews   int       `json:"pageViews"`
	RecentViews int       `json:"recentViews"`
	LastViewed  time.Time `json:"lastViewed"`
	FirstViewed time.Time `json:"firstViewed"`
}
