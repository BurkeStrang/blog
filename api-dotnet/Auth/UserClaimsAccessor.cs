using System.Security.Claims;

namespace BlogApi.Auth;

public static class UserClaimsAccessor
{
    public const string UsernameClaim = "username";
    public const string RoleClaim = "role";

    public static string? Username(this ClaimsPrincipal user) =>
        user.FindFirstValue(UsernameClaim);

    public static string? Role(this ClaimsPrincipal user) =>
        user.FindFirstValue(RoleClaim);

    public static string? AuthorDisplay(this ClaimsPrincipal user)
    {
        var username = user.Username();
        if (string.IsNullOrEmpty(username))
        {
            return null;
        }
        var atIndex = username.IndexOf('@');
        return atIndex >= 0 ? username[..atIndex] : username;
    }
}
