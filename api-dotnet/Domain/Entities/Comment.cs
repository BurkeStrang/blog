namespace BlogApi.Domain.Entities;

public sealed class Comment : CommentContainerDocument
{
    public Comment() => Type = "comment";

    public string Content { get; set; } = "";
    public string Author { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? ParentId { get; set; }
    public int LikeCount { get; set; }
}
