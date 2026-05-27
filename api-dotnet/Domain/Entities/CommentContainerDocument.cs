namespace BlogApi.Domain.Entities;

public abstract class CommentContainerDocument
{
    public string Id { get; set; } = "";
    public string Type { get; set; } = "";
    public string PostId { get; set; } = "";
}
