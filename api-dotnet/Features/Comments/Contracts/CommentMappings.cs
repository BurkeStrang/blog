using BlogApi.Domain.Entities;

namespace BlogApi.Features.Comments.Contracts;

public static class CommentMappings
{
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
