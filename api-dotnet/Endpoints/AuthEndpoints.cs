using System.Text.Json;
using BlogApi.Auth;
using BlogApi.Configuration;
using Microsoft.Extensions.Options;

namespace BlogApi.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth/google");

        group.MapGet("/", (
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

        group.MapGet("/callback", async (
            HttpContext context,
            OAuthStateStore states,
            GoogleAuthService google,
            JwtService jwt,
            IOptions<AdminOptions> adminOpts,
            IConfiguration config,
            CancellationToken ct) =>
        {
            var code = context.Request.Query["code"].FirstOrDefault();
            var state = context.Request.Query["state"].FirstOrDefault();

            if (string.IsNullOrEmpty(code) || !states.ConsumeAndValidate(state))
            {
                return Results.BadRequest(new { error = "invalid or expired state" });
            }

            var user = await google.ExchangeAndFetchAsync(code, ct);
            if (user is null)
            {
                return Results.StatusCode(StatusCodes.Status502BadGateway);
            }

            var role = adminOpts.Value.IsAdmin(user.Email) ? "admin" : "user";
            var token = jwt.Issue(user.Email, role);

            var userPayload = JsonSerializer.Serialize(new
            {
                id = user.Id,
                username = user.Email,
                email = user.Email,
                name = user.Name,
                picture = user.Picture,
                role,
            });
            var encodedUser = Base64Url(userPayload);

            var frontendUrl = config["FRONTEND_URL"] ?? "http://localhost:3000";
            var redirect = $"{frontendUrl}/auth/callback?token={Uri.EscapeDataString(token)}&user={encodedUser}";
            return Results.Redirect(redirect, permanent: false, preserveMethod: false);
        });

        return app;
    }

    private static string Base64Url(string value)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(value);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}
