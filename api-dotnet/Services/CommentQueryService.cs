using BlogApi.Data.Repositories;
using BlogApi.Dtos;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Services;

public sealed class CommentQueryService
{
    private readonly HybridCache _cache;
    private readonly ICommentRepository _comments;

    public CommentQueryService(HybridCache cache, ICommentRepository comments)
    {
        _cache = cache;
        _comments = comments;
    }

    public ValueTask<CommentListResponse> ListByPostAsync(string postId, CancellationToken cancellationToken)
    {
        var normalizedPostId = NormalizePostId(postId);
        return _cache.GetOrCreateAsync(
            key: $"comments:list:{normalizedPostId}",
            factory: async ct =>
            {
                var entities = await _comments.ListByPostAsync(normalizedPostId, ct);
                var comments = entities
                    .OrderByDescending(c => c.LikeCount)
                    .ThenBy(c => c.CreatedAt)
                    .Select(c => c.ToDto())
                    .ToList();
                return new CommentListResponse(comments);
            },
            options: new HybridCacheEntryOptions { Expiration = CacheTags.CommentsTtl },
            tags: new[] { CacheTags.CommentsForPost(normalizedPostId) },
            cancellationToken: cancellationToken);
    }

    public async Task<CommentLikesResponse> GetLikesAsync(
        string commentId,
        string? postIdHint,
        string? currentUsername,
        CancellationToken cancellationToken)
    {
        var normalizedCommentId = commentId.StartsWith("comment-", StringComparison.Ordinal)
            ? commentId
            : $"comment-{commentId}";

        // The cached value (usernames who liked) is shared across all callers; the
        // user-specific bit is derived per request so we don't fragment the cache.
        var likes = await _cache.GetOrCreateAsync(
            key: $"comments:likes:{normalizedCommentId}",
            factory: async ct =>
            {
                if (!string.IsNullOrEmpty(postIdHint))
                {
                    var normalizedPostId = NormalizePostId(postIdHint);
                    var partitioned = await _comments.ListLikesByCommentAsync(normalizedPostId, normalizedCommentId, ct);
                    return (IReadOnlyList<string>)partitioned.Select(l => l.Username).ToList();
                }

                // No postId hint → cross-partition scan, same cost Go pays when
                // the UI omits ?postId=.
                var all = await _comments.ListLikesCrossPartitionByCommentAsync(normalizedCommentId, ct);
                return (IReadOnlyList<string>)all.Select(l => l.Username).ToList();
            },
            options: new HybridCacheEntryOptions { Expiration = CacheTags.LikesTtl },
            cancellationToken: cancellationToken);

        var userLiked = currentUsername is not null && likes.Contains(currentUsername);
        return new CommentLikesResponse(likes.Count, userLiked);
    }

    private static string NormalizePostId(string raw) =>
        raw.StartsWith("post-", StringComparison.Ordinal) ? raw : $"post-{raw}";
}
