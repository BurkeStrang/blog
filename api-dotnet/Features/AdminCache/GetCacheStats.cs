using BlogApi.Infrastructure.Caching;

namespace BlogApi.Features.AdminCache;

public static class GetCacheStatsEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapGet("/admin/cache/stats", () => Results.Ok(new
        {
            backend = "HybridCache",
            tags = new[] { CacheTags.Posts, CacheTags.Preferences, "comments:{postId}" },
            ttls = new
            {
                posts = CacheTags.PostsTtl.ToString(),
                comments = CacheTags.CommentsTtl.ToString(),
                likes = CacheTags.LikesTtl.ToString(),
            },
        }))
        .RequireAuthorization("Admin");
}
