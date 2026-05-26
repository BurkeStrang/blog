namespace BlogApi.Dtos;

public sealed record PostListResponse(
    IReadOnlyList<PostDto> Posts,
    PageInfo Page,
    FilterInfo Filter);

public sealed record PageInfo(int Limit, int Offset, int Total, bool HasMore);

public sealed record FilterInfo(string? Search);
