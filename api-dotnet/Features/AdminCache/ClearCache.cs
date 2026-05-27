using BlogApi.Infrastructure.Caching;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.AdminCache;

internal sealed class ClearCacheHandler(HybridCache cache)
{
    public async Task ClearAsync(CancellationToken ct)
    {
        await cache.RemoveByTagAsync(CacheTags.Posts, ct);
        await cache.RemoveByTagAsync(CacheTags.Preferences, ct);
    }
}

public static class ClearCacheEndpoint
{
    // The three legacy paths (/validate, /invalidate, /clear) all map to the
    // same behaviour. HybridCache doesn't expose a self-validation API; the
    // routes are kept to preserve the Go admin surface that's still hit by
    // ops tooling.
    public static IEndpointRouteBuilder MapAll(IEndpointRouteBuilder app)
    {
        Map(app, "/admin/cache/validate", "validated (cache cleared)");
        Map(app, "/admin/cache/invalidate", "all caches invalidated");
        Map(app, "/admin/cache/clear", "all caches cleared");
        return app;
    }

    private static RouteHandlerBuilder Map(IEndpointRouteBuilder app, string path, string message) => app
        .MapPost(path, async (
            ClearCacheHandler handler,
            CancellationToken ct) =>
        {
            await handler.ClearAsync(ct);
            return Results.Ok(new { message });
        })
        .RequireAuthorization("Admin");
}
