package models

import "time"

type PostAnalytics struct {
    Slug         string    `json:"slug"`
    PageViews    int       `json:"pageViews"`
    RecentViews  int       `json:"recentViews"`
    LastViewed   time.Time `json:"lastViewed"`
    FirstViewed  time.Time `json:"firstViewed"`
}

type AnalyticsData struct {
    Posts map[string]*PostAnalytics `json:"posts"`
}