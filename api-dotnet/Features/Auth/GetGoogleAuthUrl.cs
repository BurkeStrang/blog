using BlogApi.Infrastructure.Auth;

namespace BlogApi.Features.Auth;

public static class GetGoogleAuthUrlEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapGet("/auth/google", (
            OAuthStateStore states,
            GoogleAuthService google) =>
        {
            if (!google.IsConfigured)
            {
                return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
            }
            var state = states.Issue();
            var url = google.BuildAuthCodeUrl(state);
            return Results.Ok(new { url });
        });
}
