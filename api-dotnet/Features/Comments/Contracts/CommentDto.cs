namespace BlogApi.Features.Comments.Contracts;

public sealed record CommentDto(
    string Id,
    string PostId,
    string Content,
    string Author,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? ParentId,
    int LikeCount);
