package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"time"

	"blogapi/database"

	"github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos"
)

// Endpoints re-warmed on the periodic ticker. Only the high-traffic list
// routes — individual post details are warmed once at startup and rely on
// per-request caching after that.
var hotListPaths = []string{
	"/api/posts",
	"/api/posts/popular?limit=10&order=desc&sort=pageViews",
}

type postCacheWarmTarget struct {
	ID   string `json:"id"`
	Slug string `json:"slug"`
}

// WarmPostsCache primes the posts cache through the router so startup uses the same cache path as live traffic.
//
// Invalidates the list-endpoint cache keys first so the warm always issues a
// real Cosmos query and writes a fresh entry, regardless of any stale entries
// left over in Redis from a prior pod's lifetime. Without this, a warm hit
// could short-circuit to a stale cached response (or worse, to a key the
// frontend never asks for) — and then real user traffic would still pay
// cold-Cosmos cost on the next genuine miss.
func WarmPostsCache(router http.Handler) {
	log.Println("Warming posts cache")

	for _, path := range hotListPaths {
		cacheKey := "GET:" + path
		PostsCache.Invalidate(cacheKey)
		if err := warmCacheRequest(router, path); err != nil {
			log.Printf("Posts cache warm failed for %s: %v", path, err)
			continue
		}
		log.Printf("Posts cache warm succeeded for %s", path)
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

// StartPeriodicPostsWarm spawns a goroutine that re-warms the posts list
// endpoints every `interval` to keep them ahead of the Redis cache TTL.
//
// The Redis TTL on PostsCache is 15 minutes; pick an interval shorter than
// that (e.g. 10m) so the cache is always populated when real users arrive,
// even after long idle periods. Without this, the first visitor after the
// TTL window pays the full Cosmos DB query cost (~8s on this dataset).
//
// Returns a stop function; call it on graceful shutdown.
func StartPeriodicPostsWarm(router http.Handler, interval time.Duration) func() {
	stop := make(chan struct{})
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-stop:
				return
			case <-ticker.C:
				for _, path := range hotListPaths {
					// Invalidate first so the request actually re-fetches from
					// Cosmos and stores a fresh entry. Without this the warm
					// request would just HIT the still-valid cache and never
					// refresh the TTL — defeating the whole point.
					cacheKey := "GET:" + path
					PostsCache.Invalidate(cacheKey)
					if err := warmCacheRequest(router, path); err != nil {
						log.Printf("Periodic posts cache warm failed for %s: %v", path, err)
					}
				}
			}
		}
	}()
	log.Printf("Periodic posts cache warmer started (interval=%s)", interval)
	return func() { close(stop) }
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
