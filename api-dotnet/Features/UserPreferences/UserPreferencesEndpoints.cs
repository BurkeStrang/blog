namespace BlogApi.Features.UserPreferences;

public static class UserPreferencesEndpoints
{
    public static IEndpointRouteBuilder MapUserPreferencesEndpoints(this IEndpointRouteBuilder app)
    {
        GetUserPreferencesEndpoint.Map(app);
        UpdateUserPreferencesEndpoint.Map(app);
        return app;
    }
}
