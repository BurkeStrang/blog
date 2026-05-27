namespace BlogApi.Features.Posts.Contracts;

public sealed record PostDto(
    string Id,
    string Slug,
    string Title,
    string Body,
    string Author,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? Previous,
    string? Next,
    int PageViews,
    int RecentViews,
    DateTime? LastViewed,
    DateTime? FirstViewed,
    int CommentCount);
