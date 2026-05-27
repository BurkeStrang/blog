using BlogApi.Features.Comments.Contracts;
using BlogApi.Features.Comments.Internal;
using BlogApi.Infrastructure.Caching;
using BlogApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Comments;

public sealed record ListCommentsQuery(string PostId);

public sealed record CommentListResponse(IReadOnlyList<CommentDto> Comments);

internal sealed class ListCommentsHandler(BlogDbContext db, HybridCache cache)
{
    public ValueTask<CommentListResponse> Handle(ListCommentsQuery query, CancellationToken ct)
    {
        var normalizedPostId = IdNormalization.NormalizePostId(query.PostId);
        return cache.GetOrCreateAsync(
            key: $"comments:list:{normalizedPostId}",
            factory: async innerCt =>
            {
                var entities = await db.Comments
                    .AsNoTracking()
                    .Where(c => c.PostId == normalizedPostId)
                    .OrderBy(c => c.CreatedAt)
                    .ToListAsync(innerCt);
                var comments = entities
                    .OrderByDescending(c => c.LikeCount)
                    .ThenBy(c => c.CreatedAt)
                    .Select(c => c.ToDto())
                    .ToList();
                return new CommentListResponse(comments);
            },
            options: new HybridCacheEntryOptions { Expiration = CacheTags.CommentsTtl },
            tags: new[] { CacheTags.CommentsForPost(normalizedPostId) },
            cancellationToken: ct);
    }
}

public static class ListCommentsEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapGet("/api/comments", async (
            HttpContext ctx,
            ListCommentsHandler handler,
            CancellationToken ct) =>
        {
            var postId = ctx.Request.Query["postId"].FirstOrDefault()
                ?? ctx.Request.Query["post_id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(postId))
            {
                return Results.Ok(Array.Empty<LegacyCommentResponse>());
            }
            var response = await handler.Handle(new ListCommentsQuery(postId), ct);
            return Results.Ok(response.Comments.Select(c => c.ToLegacyResponse()).ToList());
        });
}
