namespace BlogApi.Data.Entities;

public abstract class UserContainerDocument
{
    public string Id { get; set; } = "";
    public string Type { get; set; } = "";
    public string Username { get; set; } = "";
}
