using BlogApi.Data.Entities;

namespace BlogApi.Data.Repositories;

public interface IPostRepository
{
    Task<IReadOnlyList<Post>> ListAsync(string? search, int offset, int limit, CancellationToken cancellationToken);
    Task<Post?> GetByIdOrSlugAsync(string idOrSlug, CancellationToken cancellationToken);
    Task<int> CountAsync(string? search, CancellationToken cancellationToken);
    Task<bool> SlugExistsAsync(string slug, CancellationToken cancellationToken);
    Task AddAsync(Post post, CancellationToken cancellationToken);
    Task UpdateAsync(Post post, CancellationToken cancellationToken);
    Task DeleteAsync(Post post, CancellationToken cancellationToken);
}
