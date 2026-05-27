namespace BlogApi.Features.Auth;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        GetGoogleAuthUrlEndpoint.Map(app);
        HandleGoogleCallbackEndpoint.Map(app);
        return app;
    }
}
