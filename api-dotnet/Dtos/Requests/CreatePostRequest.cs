namespace BlogApi.Dtos.Requests;

public sealed record CreatePostRequest(
    string? Slug,
    string? Title,
    string? Body,
    string? Previous,
    string? Next,
    DateTime? CreatedAt);
