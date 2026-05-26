namespace BlogApi.Dtos;

public sealed record CommentListResponse(IReadOnlyList<CommentDto> Comments);
