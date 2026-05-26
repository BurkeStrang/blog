using BlogApi.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace BlogApi.Data.Repositories;

public sealed class UserPreferencesRepository : IUserPreferencesRepository
{
    private readonly BlogDbContext _db;

    public UserPreferencesRepository(BlogDbContext db) => _db = db;

    public Task<UserPreferences?> GetAsync(string username, CancellationToken cancellationToken) =>
        _db.UserPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Username == username, cancellationToken);

    public async Task UpsertAsync(UserPreferences prefs, CancellationToken cancellationToken)
    {
        var existing = await _db.UserPreferences
            .FirstOrDefaultAsync(p => p.Username == prefs.Username, cancellationToken);
        if (existing is null)
        {
            _db.UserPreferences.Add(prefs);
        }
        else
        {
            existing.Theme = prefs.Theme;
            existing.UpdatedAt = prefs.UpdatedAt;
        }
        await _db.SaveChangesAsync(cancellationToken);
    }
}
