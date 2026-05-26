using BlogApi.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace BlogApi.Data.Repositories;

public sealed class CommentRepository : ICommentRepository
{
    private readonly BlogDbContext _db;

    public CommentRepository(BlogDbContext db) => _db = db;

    public async Task<IReadOnlyList<Comment>> ListByPostAsync(string postId, CancellationToken cancellationToken) =>
        await _db.Comments
            .AsNoTracking()
            .Where(c => c.PostId == postId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

    public Task<Comment?> GetAsync(string postId, string commentId, CancellationToken cancellationToken) =>
        _db.Comments
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.PostId == postId && c.Id == commentId, cancellationToken);

    public Task<Comment?> FindByIdCrossPartitionAsync(string commentId, CancellationToken cancellationToken) =>
        _db.Comments
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == commentId, cancellationToken);

    public Task<int> CountByPostAsync(string postId, CancellationToken cancellationToken) =>
        _db.Comments
            .AsNoTracking()
            .Where(c => c.PostId == postId)
            .CountAsync(cancellationToken);

    public async Task<IReadOnlyList<CommentLike>> ListLikesByCommentAsync(string postId, string commentId, CancellationToken cancellationToken) =>
        await _db.CommentLikes
            .AsNoTracking()
            .Where(l => l.PostId == postId && l.CommentId == commentId)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<CommentLike>> ListLikesCrossPartitionByCommentAsync(string commentId, CancellationToken cancellationToken) =>
        await _db.CommentLikes
            .AsNoTracking()
            .Where(l => l.CommentId == commentId)
            .ToListAsync(cancellationToken);

    public Task<CommentLike?> FindLikeAsync(string postId, string commentId, string username, CancellationToken cancellationToken) =>
        _db.CommentLikes
            .AsNoTracking()
            .FirstOrDefaultAsync(
                l => l.PostId == postId && l.CommentId == commentId && l.Username == username,
                cancellationToken);

    public async Task AddCommentAsync(Comment comment, CancellationToken cancellationToken)
    {
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateCommentAsync(Comment comment, CancellationToken cancellationToken)
    {
        _db.Comments.Update(comment);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteCommentAsync(Comment comment, CancellationToken cancellationToken)
    {
        _db.Comments.Remove(comment);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task AddLikeAsync(CommentLike like, CancellationToken cancellationToken)
    {
        _db.CommentLikes.Add(like);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteLikeAsync(CommentLike like, CancellationToken cancellationToken)
    {
        _db.CommentLikes.Remove(like);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
