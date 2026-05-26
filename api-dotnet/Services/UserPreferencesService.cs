using BlogApi.Data.Entities;
using BlogApi.Data.Repositories;
using BlogApi.Dtos;

namespace BlogApi.Services;

public sealed class UserPreferencesService
{
    private const string DefaultTheme = "dark";
    private static readonly HashSet<string> AllowedThemes = new(StringComparer.Ordinal) { "dark", "light" };

    private readonly IUserPreferencesRepository _repo;

    public UserPreferencesService(IUserPreferencesRepository repo) => _repo = repo;

    public async Task<UserPreferencesDto> GetAsync(string username, CancellationToken cancellationToken)
    {
        var prefs = await _repo.GetAsync(username, cancellationToken);
        return new UserPreferencesDto(prefs?.Theme ?? DefaultTheme);
    }

    public async Task<(UserPreferencesDto? Prefs, string? Error)> UpsertAsync(
        string username, string? theme, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(theme) || !AllowedThemes.Contains(theme))
        {
            return (null, "theme must be 'dark' or 'light'");
        }
        var prefs = new UserPreferences
        {
            Id = $"prefs-{username}",
            Type = "user_preferences",
            Username = username,
            Theme = theme,
            UpdatedAt = DateTime.UtcNow,
        };
        await _repo.UpsertAsync(prefs, cancellationToken);
        return (new UserPreferencesDto(theme), null);
    }
}
