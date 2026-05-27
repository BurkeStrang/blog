namespace BlogApi.Domain.Entities;

public sealed class Post
{
    public string Id { get; set; } = "";
    public string Type { get; set; } = "post";
    public string Slug { get; set; } = "";
    public string? Previous { get; set; }
    public string? Next { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string Author { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int PageViews { get; set; }
    public int RecentViews { get; set; }
    public DateTime? LastViewed { get; set; }
    public DateTime? FirstViewed { get; set; }
    public int CommentCount { get; set; }
}
