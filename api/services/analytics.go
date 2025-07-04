package services

import (
    "encoding/json"
    "log"
    "os"
    "sync"
    "time"
    "blogapi/models"
)

type AnalyticsService struct {
    data     *models.AnalyticsData
    filePath string
    mutex    sync.RWMutex
}

var analyticsService *AnalyticsService

func GetAnalyticsService() *AnalyticsService {
    if analyticsService == nil {
        analyticsService = &AnalyticsService{
            data:     &models.AnalyticsData{Posts: make(map[string]*models.PostAnalytics)},
            filePath: "data/analytics.json",
        }
        analyticsService.load()
    }
    return analyticsService
}

func (s *AnalyticsService) load() {
    s.mutex.Lock()
    defer s.mutex.Unlock()

    data, err := os.ReadFile(s.filePath)
    if err != nil {
        if os.IsNotExist(err) {
            log.Printf("Analytics file doesn't exist, starting fresh")
            return
        }
        log.Printf("Error reading analytics file: %v", err)
        return
    }

    err = json.Unmarshal(data, s.data)
    if err != nil {
        log.Printf("Error unmarshaling analytics data: %v", err)
        s.data = &models.AnalyticsData{Posts: make(map[string]*models.PostAnalytics)}
        return
    }

    log.Printf("Loaded analytics for %d posts", len(s.data.Posts))
}

func (s *AnalyticsService) save() error {
    data, err := json.MarshalIndent(s.data, "", "  ")
    if err != nil {
        return err
    }
    return os.WriteFile(s.filePath, data, 0644)
}

func (s *AnalyticsService) TrackView(slug string) (*models.PostAnalytics, error) {
    s.mutex.Lock()
    defer s.mutex.Unlock()

    now := time.Now()
    
    analytics, exists := s.data.Posts[slug]
    if !exists {
        analytics = &models.PostAnalytics{
            Slug:        slug,
            PageViews:   0,
            RecentViews: 0,
            FirstViewed: now,
        }
        s.data.Posts[slug] = analytics
    }

    analytics.PageViews++
    analytics.RecentViews++
    analytics.LastViewed = now

    // Save to file
    err := s.save()
    if err != nil {
        log.Printf("Error saving analytics: %v", err)
    }

    log.Printf("Tracked view for %s (total: %d)", slug, analytics.PageViews)
    return analytics, err
}

func (s *AnalyticsService) GetAnalytics(slug string) *models.PostAnalytics {
    s.mutex.RLock()
    defer s.mutex.RUnlock()

    analytics, exists := s.data.Posts[slug]
    if !exists {
        return &models.PostAnalytics{
            Slug:        slug,
            PageViews:   0,
            RecentViews: 0,
        }
    }
    return analytics
}

func (s *AnalyticsService) GetAllAnalytics() map[string]*models.PostAnalytics {
    s.mutex.RLock()
    defer s.mutex.RUnlock()

    // Return a copy to avoid race conditions
    result := make(map[string]*models.PostAnalytics)
    for k, v := range s.data.Posts {
        result[k] = v
    }
    return result
}