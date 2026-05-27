using BlogApi.Features.Posts.Internal;
using BlogApi.Infrastructure.Caching;
using BlogApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Posts;

public sealed record RecountCommentCountsCommand;

public sealed record RecountCommentCountsResult(int Updated);

internal sealed class RecountCommentCountsHandler(BlogDbContext db, HybridCache cache)
{
    public async Task<RecountCommentCountsResult> Handle(
        RecountCommentCountsCommand cmd, CancellationToken ct)
    {
        var posts = await db.Posts
            .OrderByDescending(p => p.CreatedAt)
            .Take(PostListQuery.MaxLimit)
            .ToListAsync(ct);

        var updated = 0;
        foreach (var post in posts)
        {
            ct.ThrowIfCancellationRequested();
            var count = await db.Comments.AsNoTracking()
                .Where(c => c.PostId == post.Id)
                .CountAsync(ct);
            if (count != post.CommentCount)
            {
                post.CommentCount = count;
                post.UpdatedAt = DateTime.UtcNow;
                updated++;
            }
        }

        if (updated > 0)
        {
            await db.SaveChangesAsync(ct);
            await cache.RemoveByTagAsync(CacheTags.Posts, ct);
        }

        return new RecountCommentCountsResult(updated);
    }
}

public static class RecountCommentCountsEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapPost("/api/posts/update-comment-counts", async (
            RecountCommentCountsHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.Handle(new RecountCommentCountsCommand(), ct);
            return Results.Ok(new { message = "comment counts updated", updated = result.Updated });
        })
        .RequireAuthorization("Admin");
}
