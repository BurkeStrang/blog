namespace BlogApi.Dtos.Requests;

public sealed record UpdatePostRequest(
    string? Slug,
    string? Title,
    string? Body,
    string? Previous,
    string? Next,
    DateTime? CreatedAt);
