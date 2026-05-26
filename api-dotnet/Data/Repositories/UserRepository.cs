using BlogApi.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace BlogApi.Data.Repositories;

public sealed class UserRepository : IUserRepository
{
    private readonly BlogDbContext _db;

    public UserRepository(BlogDbContext db) => _db = db;

    public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken) =>
        _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == username, cancellationToken);
}
