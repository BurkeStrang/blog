using BlogApi.Services;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Endpoints;

public static class AdminEndpoints
{
    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/admin/cache").RequireAuthorization("Admin");

        // HybridCache does not expose hit/miss counters, so "stats" is
        // intentionally minimal — it lists the tags this app uses so callers
        // can confirm the cache is wired. Detailed counters would need a
        // wrapping layer or OpenTelemetry meters (planned for Phase 5).
        group.MapGet("/stats", () => Results.Ok(new
        {
            backend = "HybridCache",
            tags = new[] { CacheTags.Posts, CacheTags.Preferences, "comments:{postId}" },
            ttls = new
            {
                posts = CacheTags.PostsTtl.ToString(),
                comments = CacheTags.CommentsTtl.ToString(),
                likes = CacheTags.LikesTtl.ToString(),
            },
        }));

        // HybridCache has no self-validation API; we keep the route to
        // preserve the Go admin surface, but it's effectively a clear.
        group.MapPost("/validate", async (HybridCache cache, CancellationToken ct) =>
        {
            await cache.RemoveByTagAsync(CacheTags.Posts, ct);
            await cache.RemoveByTagAsync(CacheTags.Preferences, ct);
            return Results.Ok(new { message = "validated (cache cleared)" });
        });

        group.MapPost("/invalidate", async (HybridCache cache, CancellationToken ct) =>
        {
            await cache.RemoveByTagAsync(CacheTags.Posts, ct);
            await cache.RemoveByTagAsync(CacheTags.Preferences, ct);
            return Results.Ok(new { message = "all caches invalidated" });
        });

        group.MapPost("/clear", async (HybridCache cache, CancellationToken ct) =>
        {
            await cache.RemoveByTagAsync(CacheTags.Posts, ct);
            await cache.RemoveByTagAsync(CacheTags.Preferences, ct);
            return Results.Ok(new { message = "all caches cleared" });
        });

        return app;
    }
}
