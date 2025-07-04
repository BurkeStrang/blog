package models

import "time"

type BlogPost struct {
    ID          int       `json:"id"`
    Slug        string    `json:"slug"`
    Title       string    `json:"title"`
    Body        string    `json:"body"`
    Author      string    `json:"author"`
    Date        time.Time `json:"date"`
    PageViews   int       `json:"pageViews"`
    RecentViews int       `json:"recentViews"`
    LastViewed  time.Time `json:"lastViewed"`
}

