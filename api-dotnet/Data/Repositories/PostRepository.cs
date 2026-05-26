using BlogApi.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace BlogApi.Data.Repositories;

public sealed class PostRepository : IPostRepository
{
    private readonly BlogDbContext _db;

    public PostRepository(BlogDbContext db) => _db = db;

    public async Task<IReadOnlyList<Post>> ListAsync(string? search, int offset, int limit, CancellationToken cancellationToken)
    {
        var query = _db.Posts.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var lowered = search.ToLowerInvariant();
            query = query.Where(p =>
                p.Title.ToLower().Contains(lowered) ||
                p.Body.ToLower().Contains(lowered) ||
                p.Author.ToLower().Contains(lowered));
        }

        return await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<Post?> GetByIdOrSlugAsync(string idOrSlug, CancellationToken cancellationToken)
    {
        var altId = $"post-{idOrSlug}";
        return await _db.Posts
            .AsNoTracking()
            .FirstOrDefaultAsync(
                p => p.Slug == idOrSlug || p.Id == idOrSlug || p.Id == altId,
                cancellationToken);
    }

    public async Task<int> CountAsync(string? search, CancellationToken cancellationToken)
    {
        var query = _db.Posts.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var lowered = search.ToLowerInvariant();
            query = query.Where(p =>
                p.Title.ToLower().Contains(lowered) ||
                p.Body.ToLower().Contains(lowered) ||
                p.Author.ToLower().Contains(lowered));
        }

        return await query.CountAsync(cancellationToken);
    }

    public Task<bool> SlugExistsAsync(string slug, CancellationToken cancellationToken) =>
        _db.Posts.AsNoTracking().AnyAsync(p => p.Slug == slug, cancellationToken);

    public async Task AddAsync(Post post, CancellationToken cancellationToken)
    {
        _db.Posts.Add(post);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Post post, CancellationToken cancellationToken)
    {
        _db.Posts.Update(post);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Post post, CancellationToken cancellationToken)
    {
        _db.Posts.Remove(post);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
