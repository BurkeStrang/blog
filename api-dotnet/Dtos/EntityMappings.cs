using BlogApi.Data.Entities;

namespace BlogApi.Dtos;

public static class EntityMappings
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

    public static CommentDto ToDto(this Comment c) => new(
        Id: c.Id,
        PostId: c.PostId,
        Content: c.Content,
        Author: c.Author,
        CreatedAt: c.CreatedAt,
        UpdatedAt: c.UpdatedAt,
        ParentId: c.ParentId,
        LikeCount: c.LikeCount);

    public static LegacyCommentResponse ToLegacyResponse(this CommentDto c) => new(
        Id: ParseNumericSuffix(c.Id, "comment-"),
        PostId: ParseNumericSuffix(c.PostId, "post-"),
        Content: c.Content,
        Author: c.Author,
        CreatedAt: c.CreatedAt,
        LikeCount: c.LikeCount,
        CosmosId: c.Id,
        ParentId: ParseNullableNumericSuffix(c.ParentId, "comment-"));

    private static long ParseNumericSuffix(string value, string prefix)
    {
        var trimmed = value.StartsWith(prefix, StringComparison.Ordinal) ? value[prefix.Length..] : value;
        return long.TryParse(trimmed, out var numeric) ? numeric : 0;
    }

    private static long? ParseNullableNumericSuffix(string? value, string prefix)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.StartsWith(prefix, StringComparison.Ordinal) ? value[prefix.Length..] : value;
        return long.TryParse(trimmed, out var numeric) ? numeric : null;
    }
}
