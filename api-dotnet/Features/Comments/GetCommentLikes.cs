using BlogApi.Features.Comments.Contracts;
using BlogApi.Features.Comments.Internal;
using BlogApi.Infrastructure.Auth;
using BlogApi.Infrastructure.Caching;
using BlogApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Comments;

public sealed record GetCommentLikesQuery(
    string CommentId,
    string? PostIdHint,
    string? CurrentUsername);

internal sealed class GetCommentLikesHandler(BlogDbContext db, HybridCache cache)
{
    public async Task<CommentLikesResponse> Handle(
        GetCommentLikesQuery query, CancellationToken ct)
    {
        var normalizedCommentId = IdNormalization.NormalizeCommentId(query.CommentId);

        // Cache only the list of usernames who liked. The user-specific
        // "did I like" bit is derived per-request so the cache doesn't
        // fragment by viewer.
        var likes = await cache.GetOrCreateAsync<IReadOnlyList<string>>(
            key: $"comments:likes:{normalizedCommentId}",
            factory: async innerCt =>
            {
                if (!string.IsNullOrEmpty(query.PostIdHint))
                {
                    var normalizedPostId = IdNormalization.NormalizePostId(query.PostIdHint);
                    var partitioned = await db.CommentLikes
                        .AsNoTracking()
                        .Where(l => l.PostId == normalizedPostId && l.CommentId == normalizedCommentId)
                        .ToListAsync(innerCt);
                    return partitioned.Select(l => l.Username).ToList();
                }
                // No postId hint → cross-partition scan.
                var all = await db.CommentLikes
                    .AsNoTracking()
                    .Where(l => l.CommentId == normalizedCommentId)
                    .ToListAsync(innerCt);
                return all.Select(l => l.Username).ToList();
            },
            options: new HybridCacheEntryOptions { Expiration = CacheTags.LikesTtl },
            cancellationToken: ct);

        var userLiked = query.CurrentUsername is not null && likes.Contains(query.CurrentUsername);
        return new CommentLikesResponse(likes.Count, userLiked);
    }
}

public static class GetCommentLikesEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapGet("/api/comments/{commentId}/likes", async (
            HttpContext ctx,
            string commentId,
            string? postId,
            GetCommentLikesHandler handler,
            CancellationToken ct) =>
        {
            var likes = await handler.Handle(
                new GetCommentLikesQuery(commentId, postId, ctx.User.Username()), ct);
            return Results.Ok(likes);
        });
}
