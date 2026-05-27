namespace BlogApi.Infrastructure.Configuration;

public sealed class AdminOptions
{
    // Comma-separated env var ADMIN_EMAILS, defaults to the two emails that
    // were hardcoded in the Go API (handlers/auth.go) so behaviour is
    // identical on day one and can be changed later without a rebuild.
    public IReadOnlyCollection<string> Emails { get; init; } = Array.Empty<string>();

    public bool IsAdmin(string email) =>
        Emails.Any(e => string.Equals(e, email, StringComparison.OrdinalIgnoreCase));
}
