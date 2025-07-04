# API Integration Setup

This project has been updated to connect to a Go API backend instead of using static `posts.json` files.

## Environment Configuration

1. Copy the environment example file:
   ```bash
   cp .env.example .env
   ```

2. Update the API URL in `.env`:
   ```
   VITE_API_URL=http://localhost:8080
   ```

## Expected API Endpoints

The frontend expects the following endpoints from your Go API:

### GET /api/posts
Returns an array of all blog posts.

**Response format:**
```json
[
  {
    "slug": "post-slug",
    "title": "Post Title",
    "body": "<p>HTML content...</p>",
    "date": "2025-01-01T00:00:00Z",
    "pageViews": 100,
    "recentViews": 5,
    "lastViewed": "2025-01-01T12:00:00Z"
  }
]
```

### GET /api/posts/:slug
Returns a single post by slug.

**Response format:**
```json
{
  "slug": "post-slug",
  "title": "Post Title", 
  "body": "<p>HTML content...</p>",
  "date": "2025-01-01T00:00:00Z",
  "pageViews": 100,
  "recentViews": 5,
  "lastViewed": "2025-01-01T12:00:00Z"
}
```

### POST /api/posts/:slug/view
Tracks a post view (analytics).

**Request:** Empty body
**Response:** 200 OK (or any success status)

### GET /health
Health check endpoint.

**Response format:**
```json
{
  "status": "ok"
}
```

## CORS Configuration

Make sure your Go API allows requests from your frontend origin:

```go
// Example CORS headers
w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
```

## Data Migration

If you have existing data in `public/posts.json`, you can use it to seed your Go database or API responses.

## Error Handling

The frontend will display appropriate error messages if:
- The API is unreachable
- Endpoints return errors
- Network issues occur

Make sure your Go API returns proper HTTP status codes and JSON error responses when applicable.