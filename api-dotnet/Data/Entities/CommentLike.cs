namespace BlogApi.Data.Entities;

public sealed class CommentLike : CommentContainerDocument
{
    public CommentLike() => Type = "comment_like";

    public string CommentId { get; set; } = "";
    public string Username { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
