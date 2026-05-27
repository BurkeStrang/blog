namespace BlogApi.Infrastructure.Caching;

public static class CacheTags
{
    public const string Posts = "posts";
    public const string Preferences = "preferences";

    public static string CommentsForPost(string postId) => $"comments:{postId}";

    public static readonly TimeSpan PostsTtl = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan CommentsTtl = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan LikesTtl = TimeSpan.FromMinutes(1);
}
