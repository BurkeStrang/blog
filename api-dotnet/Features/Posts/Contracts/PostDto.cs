using System.Text.Json.Serialization;

namespace BlogApi.Features.Posts.Contracts;

public sealed record PostDto(
    string Id,
    string Slug,
    string Title,
    string Body,
    string Author,
    // Wire name is `date`, not `createdAt`: the Go API serialised this through
    // models.Post, which tagged it `json:"date"`, and the UI's Post model still
    // reads and writes `date`. Emitting `createdAt` left post.date undefined on
    // every read and silently dropped the value on every write.
    [property: JsonPropertyName("date")] DateTime CreatedAt,
    DateTime UpdatedAt,
    string? Previous,
    string? Next,
    int PageViews,
    int RecentViews,
    DateTime? LastViewed,
    DateTime? FirstViewed,
    int CommentCount);
