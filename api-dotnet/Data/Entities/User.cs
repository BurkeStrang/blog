namespace BlogApi.Data.Entities;

public sealed class User : UserContainerDocument
{
    public User() => Type = "user";

    public string Email { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Picture { get; set; }
    public string Role { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
