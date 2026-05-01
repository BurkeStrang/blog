package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"

	"blogapi/database"

	"github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos"
)

type postCacheWarmTarget struct {
	ID   string `json:"id"`
	Slug string `json:"slug"`
}

// WarmPostsCache primes the posts cache through the router so startup uses the same cache path as live traffic.
func WarmPostsCache(router http.Handler) {
	log.Println("Warming posts cache")

	for _, path := range []string{
		"/api/posts",
		"/api/posts/popular",
	} {
		if err := warmCacheRequest(router, path); err != nil {
			log.Printf("Posts cache warm failed for %s: %v", path, err)
		}
	}

	targets, err := fetchPostCacheWarmTargets()
	if err != nil {
		log.Printf("Posts cache warm skipped for individual posts: %v", err)
		return
	}

	warmed := 0
	for _, target := range targets {
		cachePath := target.Slug
		if cachePath == "" {
			cachePath = target.ID
		}
		if cachePath == "" {
			continue
		}

		if err := warmCacheRequest(router, fmt.Sprintf("/api/posts/%s", cachePath)); err != nil {
			log.Printf("Posts cache warm failed for %s: %v", cachePath, err)
			continue
		}
		warmed++
	}

	log.Printf("Posts cache warm complete: %d post detail routes primed", warmed)
}

// WarmCommentsCache primes cached comment list responses for each post.
func WarmCommentsCache(router http.Handler) {
	log.Println("Warming comments cache")

	targets, err := fetchPostCacheWarmTargets()
	if err != nil {
		log.Printf("Comments cache warm skipped: %v", err)
		return
	}

	warmed := 0
	for _, target := range targets {
		postID := strings.TrimPrefix(target.ID, "post-")
		if postID == "" {
			continue
		}

		path := fmt.Sprintf("/api/comments?post_id=%s", postID)
		if err := warmCacheRequest(router, path); err != nil {
			log.Printf("Comments cache warm failed for post %s: %v", postID, err)
			continue
		}
		warmed++
	}

	log.Printf("Comments cache warm complete: %d comment list routes primed", warmed)
}

func warmCacheRequest(router http.Handler, path string) error {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code < http.StatusOK || recorder.Code >= http.StatusMultipleChoices {
		return fmt.Errorf("unexpected status %d", recorder.Code)
	}

	return nil
}

func fetchPostCacheWarmTargets() ([]postCacheWarmTarget, error) {
	ctx := context.Background()
	postPartitionKey := azcosmos.NewPartitionKeyString("post")
	query := "SELECT c.id, c.slug FROM c WHERE c.type = 'post'"
	pager := database.PostsContainer.NewQueryItemsPager(query, postPartitionKey, nil)

	var targets []postCacheWarmTarget
	for pager.More() {
		response, err := pager.NextPage(ctx)
		if err != nil {
			return nil, err
		}

		for _, item := range response.Items {
			var target postCacheWarmTarget
			if err := json.Unmarshal(item, &target); err != nil {
				return nil, err
			}
			targets = append(targets, target)
		}
	}

	return targets, nil
}
