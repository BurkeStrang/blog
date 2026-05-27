using BlogApi.Features.Posts.Contracts;
using BlogApi.Infrastructure.Caching;
using BlogApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Posts;

public sealed record GetPostQuery(string IdOrSlug);

internal sealed class GetPostHandler(BlogDbContext db, HybridCache cache)
{
    public ValueTask<PostDto?> Handle(GetPostQuery query, CancellationToken ct) =>
        cache.GetOrCreateAsync<PostDto?>(
            key: $"posts:detail:{query.IdOrSlug}",
            factory: async innerCt =>
            {
                var altId = $"post-{query.IdOrSlug}";
                var entity = await db.Posts
                    .AsNoTracking()
                    .FirstOrDefaultAsync(
                        p => p.Slug == query.IdOrSlug || p.Id == query.IdOrSlug || p.Id == altId,
                        innerCt);
                return entity?.ToDto();
            },
            options: new HybridCacheEntryOptions { Expiration = CacheTags.PostsTtl },
            tags: new[] { CacheTags.Posts },
            cancellationToken: ct);
}

public static class GetPostEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapGet("/api/posts/{idOrSlug}", async (
            string idOrSlug,
            GetPostHandler handler,
            CancellationToken ct) =>
        {
            var post = await handler.Handle(new GetPostQuery(idOrSlug), ct);
            return post is null
                ? Results.NotFound(new { error = "post not found" })
                : Results.Ok(post);
        });
}
