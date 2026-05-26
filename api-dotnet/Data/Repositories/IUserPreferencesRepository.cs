using BlogApi.Data.Entities;

namespace BlogApi.Data.Repositories;

public interface IUserPreferencesRepository
{
    Task<UserPreferences?> GetAsync(string username, CancellationToken cancellationToken);
    Task UpsertAsync(UserPreferences prefs, CancellationToken cancellationToken);
}
