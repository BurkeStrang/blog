namespace BlogApi.Data.Entities;

public sealed class UserPreferences : UserContainerDocument
{
    public UserPreferences() => Type = "user_preferences";

    public string Theme { get; set; } = "dark";
    public DateTime UpdatedAt { get; set; }
}
