using BlogApi.Features.Posts.Contracts;
using BlogApi.Features.Posts.Internal;
using BlogApi.Infrastructure.Caching;
using BlogApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Posts;

internal sealed class ListPostsHandler(BlogDbContext db, HybridCache cache)
{
    public ValueTask<PostListResponse> Handle(PostListQuery query, CancellationToken ct) =>
        cache.GetOrCreateAsync(
            key: query.CacheKey,
            factory: async innerCt =>
            {
                var q = db.Posts.AsNoTracking().AsQueryable();
                if (!string.IsNullOrWhiteSpace(query.Search))
                {
                    var lowered = query.Search.ToLowerInvariant();
                    q = q.Where(p =>
                        p.Title.ToLower().Contains(lowered) ||
                        p.Body.ToLower().Contains(lowered) ||
                        p.Author.ToLower().Contains(lowered));
                }
                var total = await q.CountAsync(innerCt);
                var entities = await q
                    .OrderByDescending(p => p.CreatedAt)
                    .Skip(query.Offset)
                    .Take(query.Limit)
                    .ToListAsync(innerCt);
                var posts = entities.Select(e => e.ToDto()).ToList();
                return new PostListResponse(
                    posts,
                    new PageInfo(query.Limit, query.Offset, total, query.Offset + posts.Count < total),
                    new FilterInfo(query.Search));
            },
            options: new HybridCacheEntryOptions { Expiration = CacheTags.PostsTtl },
            tags: new[] { CacheTags.Posts },
            cancellationToken: ct);
}

public static class ListPostsEndpoint
{
    public static RouteHandlerBuilder MapList(IEndpointRouteBuilder app) => app
        .MapGet("/api/posts", async (
            ListPostsHandler handler,
            string? search, string? sort, string? order, int? limit, int? offset,
            CancellationToken ct) =>
        {
            var query = PostListQuery.FromRaw(search, sort, order, limit, offset);
            var result = await handler.Handle(query, ct);
            return Results.Ok(result);
        });

    public static RouteHandlerBuilder MapPopular(IEndpointRouteBuilder app) => app
        .MapGet("/api/posts/popular", async (
            ListPostsHandler handler,
            int? limit,
            CancellationToken ct) =>
        {
            var query = PostListQuery.FromRaw(
                search: null,
                sort: PostListQuery.PopularSort,
                order: "desc",
                limit: limit ?? PostListQuery.PopularLimit,
                offset: 0);
            var result = await handler.Handle(query, ct);
            return Results.Ok(result);
        });

    public static RouteHandlerBuilder MapSearch(IEndpointRouteBuilder app) => app
        .MapGet("/api/posts/search", async (
            ListPostsHandler handler,
            string? search, string? q, string? sort, string? order, int? limit, int? offset,
            CancellationToken ct) =>
        {
            var query = PostListQuery.FromRaw(search ?? q, sort, order, limit, offset);
            var result = await handler.Handle(query, ct);
            return Results.Ok(result);
        });
}
