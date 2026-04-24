#!/bin/bash

# Import Markdown Posts to Cosmos DB
# This script uses the API to create posts from the example-posts-markdown.json file

API_URL="http://localhost:8080/api"
JSON_FILE="example-posts-markdown.json"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed."
    echo "Install it with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Check if token is provided
if [ -z "$AUTH_TOKEN" ]; then
    echo "Error: AUTH_TOKEN environment variable is required"
    echo "Usage: AUTH_TOKEN='your-jwt-token' ./import-markdown-posts.sh"
    echo ""
    echo "To get your token:"
    echo "1. Log in to the app"
    echo "2. Open browser console"
    echo "3. Run: localStorage.getItem('authToken')"
    echo "4. Copy the token (without quotes)"
    exit 1
fi

echo "Importing markdown posts to Cosmos DB..."
echo ""

# Read the JSON file and process each post
jq -c '.[]' "$JSON_FILE" | while read -r post; do
    title=$(echo "$post" | jq -r '.title')
    slug=$(echo "$post" | jq -r '.slug')

    echo "Creating post: $title"

    # Create the post using the API
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/posts" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d "$post")

    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)
    # Extract response body (everything except last line)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" -eq 201 ] || [ "$status_code" -eq 200 ]; then
        echo "✓ Successfully created: $slug"
    else
        echo "✗ Failed to create: $slug (HTTP $status_code)"
        echo "  Response: $body"
    fi
    echo ""
done

echo "Import complete!"
