namespace BlogApi.Features.Comments.Internal;

internal static class IdNormalization
{
    public static string NormalizePostId(string raw) =>
        raw.StartsWith("post-", StringComparison.Ordinal) ? raw : $"post-{raw}";

    public static string NormalizeCommentId(string raw) =>
        raw.StartsWith("comment-", StringComparison.Ordinal) ? raw : $"comment-{raw}";

    public static bool IsAuthor(string commentAuthor, string username)
    {
        var atIdx = username.IndexOf('@');
        var displayName = atIdx >= 0 ? username[..atIdx] : username;
        return string.Equals(commentAuthor, displayName, StringComparison.Ordinal);
    }
}
