using BlogApi.Data.Repositories;
using BlogApi.Dtos;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Services;

public sealed class PostQueryService
{
    private readonly HybridCache _cache;
    private readonly IPostRepository _posts;

    public PostQueryService(HybridCache cache, IPostRepository posts)
    {
        _cache = cache;
        _posts = posts;
    }

    public ValueTask<PostListResponse> ListAsync(PostListQuery query, CancellationToken cancellationToken) =>
        _cache.GetOrCreateAsync(
            key: query.CacheKey,
            factory: async ct =>
            {
                var entities = await _posts.ListAsync(query.Search, query.Offset, query.Limit, ct);
                var total = await _posts.CountAsync(query.Search, ct);
                var posts = entities.Select(e => e.ToDto()).ToList();
                return new PostListResponse(
                    Posts: posts,
                    Page: new PageInfo(query.Limit, query.Offset, total, query.Offset + posts.Count < total),
                    Filter: new FilterInfo(query.Search));
            },
            options: new HybridCacheEntryOptions { Expiration = CacheTags.PostsTtl },
            tags: new[] { CacheTags.Posts },
            cancellationToken: cancellationToken);

    public ValueTask<PostDto?> GetAsync(string idOrSlug, CancellationToken cancellationToken) =>
        _cache.GetOrCreateAsync(
            key: $"posts:detail:{idOrSlug}",
            factory: async ct =>
            {
                var entity = await _posts.GetByIdOrSlugAsync(idOrSlug, ct);
                return entity?.ToDto();
            },
            options: new HybridCacheEntryOptions { Expiration = CacheTags.PostsTtl },
            tags: new[] { CacheTags.Posts },
            cancellationToken: cancellationToken);
}
