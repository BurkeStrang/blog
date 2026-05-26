using BlogApi.Auth;
using BlogApi.Dtos.Requests;
using BlogApi.Services;

namespace BlogApi.Endpoints;

public static class UserPreferencesEndpoints
{
    public static IEndpointRouteBuilder MapUserPreferencesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users/preferences").RequireAuthorization();

        group.MapGet("/", async (
            HttpContext context,
            UserPreferencesService service,
            CancellationToken ct) =>
        {
            var username = context.User.Username();
            if (string.IsNullOrEmpty(username))
            {
                return Results.Unauthorized();
            }
            var prefs = await service.GetAsync(username, ct);
            return Results.Ok(prefs);
        });

        group.MapPut("/", async (
            HttpContext context,
            UpdatePreferencesRequest request,
            UserPreferencesService service,
            CancellationToken ct) =>
        {
            var username = context.User.Username();
            if (string.IsNullOrEmpty(username))
            {
                return Results.Unauthorized();
            }
            var (prefs, error) = await service.UpsertAsync(username, request.Theme, ct);
            if (prefs is null)
            {
                return Results.BadRequest(new { error });
            }
            return Results.Ok(prefs);
        });

        return app;
    }
}
