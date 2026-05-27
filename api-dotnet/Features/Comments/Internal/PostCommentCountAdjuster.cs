using BlogApi.Infrastructure.Caching;
using BlogApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Comments.Internal;

internal static class PostCommentCountAdjuster
{
    public static async Task AdjustAsync(
        BlogDbContext db,
        HybridCache cache,
        string postId,
        int delta,
        CancellationToken ct)
    {
        var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == postId, ct);
        if (post is null)
        {
            return;
        }
        post.CommentCount = Math.Max(0, post.CommentCount + delta);
        post.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await cache.RemoveByTagAsync(CacheTags.Posts, ct);
    }
}
