using BlogApi.Data.Entities;

namespace BlogApi.Data.Repositories;

public interface IUserRepository
{
    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken);
}
