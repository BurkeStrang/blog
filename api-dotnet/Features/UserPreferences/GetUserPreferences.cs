using BlogApi.Features.UserPreferences.Contracts;
using BlogApi.Infrastructure.Auth;
using BlogApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BlogApi.Features.UserPreferences;

public sealed record GetUserPreferencesQuery(string Username);

internal sealed class GetUserPreferencesHandler(BlogDbContext db)
{
    private const string DefaultTheme = "dark";

    public async Task<UserPreferencesDto> Handle(GetUserPreferencesQuery query, CancellationToken ct)
    {
        var prefs = await db.UserPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Username == query.Username, ct);
        return new UserPreferencesDto(prefs?.Theme ?? DefaultTheme);
    }
}

public static class GetUserPreferencesEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapGet("/api/users/preferences", async (
            HttpContext ctx,
            GetUserPreferencesHandler handler,
            CancellationToken ct) =>
        {
            var username = ctx.User.Username();
            if (string.IsNullOrEmpty(username))
            {
                return Results.Unauthorized();
            }
            var prefs = await handler.Handle(new GetUserPreferencesQuery(username), ct);
            return Results.Ok(prefs);
        })
        .RequireAuthorization();
}
