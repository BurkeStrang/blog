namespace BlogApi.Features.AdminCache;

public static class AdminCacheEndpoints
{
    public static IEndpointRouteBuilder MapAdminCacheEndpoints(this IEndpointRouteBuilder app)
    {
        GetCacheStatsEndpoint.Map(app);
        ClearCacheEndpoint.MapAll(app);
        return app;
    }
}
