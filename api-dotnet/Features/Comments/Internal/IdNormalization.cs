namespace BlogApi.Features.Comments.Internal;

internal static class IdNormalization
{
    public static string NormalizePostId(string raw) =>
        raw.StartsWith("post-", StringComparison.Ordinal) ? raw : $"post-{raw}";

    public static string NormalizeCommentId(string raw) =>
        raw.StartsWith("comment-", StringComparison.Ordinal) ? raw : $"comment-{raw}";

    /// <summary>
    /// The name a comment is authored under, derived from the account username.
    /// Exposed so queries can filter on it server-side instead of pulling every
    /// comment back to run <see cref="IsAuthor"/> in memory.
    /// </summary>
    public static string DisplayName(string username)
    {
        var atIdx = username.IndexOf('@');
        return atIdx >= 0 ? username[..atIdx] : username;
    }

    public static bool IsAuthor(string commentAuthor, string username) =>
        string.Equals(commentAuthor, DisplayName(username), StringComparison.Ordinal);
}
