using BlogApi.Domain.Entities;

namespace BlogApi.Features.Posts.Contracts;

public static class PostMappings
{
    public static PostDto ToDto(this Post p) => new(
        Id: p.Id,
        Slug: p.Slug,
        Title: p.Title,
        Body: p.Body,
        Author: p.Author,
        CreatedAt: p.CreatedAt,
        UpdatedAt: p.UpdatedAt,
        Previous: p.Previous,
        Next: p.Next,
        PageViews: p.PageViews,
        RecentViews: p.RecentViews,
        LastViewed: p.LastViewed,
        FirstViewed: p.FirstViewed,
        CommentCount: p.CommentCount);
}
