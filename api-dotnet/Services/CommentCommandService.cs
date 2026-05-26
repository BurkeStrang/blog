using BlogApi.Data.Entities;
using BlogApi.Data.Repositories;
using BlogApi.Dtos;
using BlogApi.Validation;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Services;

public enum CommentCommandError { NotFound, Forbidden, AlreadyLiked, LikeNotFound }

public sealed class CommentCommandService
{
    private readonly IPostRepository _posts;
    private readonly ICommentRepository _comments;
    private readonly HybridCache _cache;

    public CommentCommandService(IPostRepository posts, ICommentRepository comments, HybridCache cache)
    {
        _posts = posts;
        _comments = comments;
        _cache = cache;
    }

    public async Task<(CommentDto? Comment, IReadOnlyList<ValidationFailure> Errors, CommentCommandError? Error)> CreateAsync(
        string postIdRaw, string? content, string author, CancellationToken cancellationToken)
    {
        var sanitized = HtmlSanitizer.Sanitize(content);
        var errors = Validators.ValidateComment(sanitized);
        if (errors.Count > 0)
        {
            return (null, errors, null);
        }

        var postId = NormalizePostId(postIdRaw);
        var now = DateTime.UtcNow;
        var comment = new Comment
        {
            Id = $"comment-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            Type = "comment",
            PostId = postId,
            Content = sanitized,
            Author = author,
            CreatedAt = now,
            UpdatedAt = now,
        };
        await _comments.AddCommentAsync(comment, cancellationToken);
        await AdjustPostCommentCountAsync(postId, 1, cancellationToken);
        await InvalidateCommentsCacheAsync(postId, cancellationToken);
        return (comment.ToDto(), Array.Empty<ValidationFailure>(), null);
    }

    public async Task<(CommentDto? Comment, IReadOnlyList<ValidationFailure> Errors, CommentCommandError? Error)> UpdateAsync(
        string commentId, string? postIdHint, string? content, string username, CancellationToken cancellationToken)
    {
        var existing = await FindCommentAsync(commentId, postIdHint, cancellationToken);
        if (existing is null)
        {
            return (null, Array.Empty<ValidationFailure>(), CommentCommandError.NotFound);
        }
        if (!IsAuthor(existing, username))
        {
            return (null, Array.Empty<ValidationFailure>(), CommentCommandError.Forbidden);
        }

        var sanitized = HtmlSanitizer.Sanitize(content);
        var errors = Validators.ValidateComment(sanitized);
        if (errors.Count > 0)
        {
            return (null, errors, null);
        }

        existing.Content = sanitized;
        existing.UpdatedAt = DateTime.UtcNow;
        await _comments.UpdateCommentAsync(existing, cancellationToken);
        await InvalidateCommentsCacheAsync(existing.PostId, cancellationToken);
        return (existing.ToDto(), Array.Empty<ValidationFailure>(), null);
    }

    public async Task<CommentCommandError?> DeleteAsync(
        string commentId, string? postIdHint, string username, CancellationToken cancellationToken)
    {
        var existing = await FindCommentAsync(commentId, postIdHint, cancellationToken);
        if (existing is null)
        {
            return CommentCommandError.NotFound;
        }
        if (!IsAuthor(existing, username))
        {
            return CommentCommandError.Forbidden;
        }
        await _comments.DeleteCommentAsync(existing, cancellationToken);
        await AdjustPostCommentCountAsync(existing.PostId, -1, cancellationToken);
        await InvalidateCommentsCacheAsync(existing.PostId, cancellationToken);
        return null;
    }

    public async Task<(int LikeCount, CommentCommandError? Error)> LikeAsync(
        string commentId, string? postIdHint, string username, CancellationToken cancellationToken)
    {
        var comment = await FindCommentAsync(commentId, postIdHint, cancellationToken);
        if (comment is null)
        {
            return (0, CommentCommandError.NotFound);
        }
        var existingLike = await _comments.FindLikeAsync(comment.PostId, comment.Id, username, cancellationToken);
        if (existingLike is not null)
        {
            return (comment.LikeCount, CommentCommandError.AlreadyLiked);
        }

        var like = new CommentLike
        {
            Id = $"like-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{username}",
            Type = "comment_like",
            PostId = comment.PostId,
            CommentId = comment.Id,
            Username = username,
            CreatedAt = DateTime.UtcNow,
        };
        await _comments.AddLikeAsync(like, cancellationToken);

        comment.LikeCount++;
        comment.UpdatedAt = DateTime.UtcNow;
        await _comments.UpdateCommentAsync(comment, cancellationToken);
        await InvalidateLikesCacheAsync(comment.Id, cancellationToken);
        return (comment.LikeCount, null);
    }

    public async Task<(int LikeCount, CommentCommandError? Error)> UnlikeAsync(
        string commentId, string? postIdHint, string username, CancellationToken cancellationToken)
    {
        var comment = await FindCommentAsync(commentId, postIdHint, cancellationToken);
        if (comment is null)
        {
            return (0, CommentCommandError.NotFound);
        }
        var existingLike = await _comments.FindLikeAsync(comment.PostId, comment.Id, username, cancellationToken);
        if (existingLike is null)
        {
            return (comment.LikeCount, CommentCommandError.LikeNotFound);
        }

        await _comments.DeleteLikeAsync(existingLike, cancellationToken);
        if (comment.LikeCount > 0)
        {
            comment.LikeCount--;
        }
        comment.UpdatedAt = DateTime.UtcNow;
        await _comments.UpdateCommentAsync(comment, cancellationToken);
        await InvalidateLikesCacheAsync(comment.Id, cancellationToken);
        return (comment.LikeCount, null);
    }

    public async Task<(CommentDto? Reply, IReadOnlyList<ValidationFailure> Errors, CommentCommandError? Error)> ReplyAsync(
        string parentCommentId, string? postIdHint, string? content, string author, CancellationToken cancellationToken)
    {
        var parent = await FindCommentAsync(parentCommentId, postIdHint, cancellationToken);
        if (parent is null)
        {
            return (null, Array.Empty<ValidationFailure>(), CommentCommandError.NotFound);
        }

        var sanitized = HtmlSanitizer.Sanitize(content);
        var errors = Validators.ValidateComment(sanitized);
        if (errors.Count > 0)
        {
            return (null, errors, null);
        }

        var now = DateTime.UtcNow;
        var reply = new Comment
        {
            Id = $"comment-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            Type = "comment",
            PostId = parent.PostId,
            Content = sanitized,
            Author = author,
            CreatedAt = now,
            UpdatedAt = now,
            ParentId = parent.Id,
        };
        await _comments.AddCommentAsync(reply, cancellationToken);
        await AdjustPostCommentCountAsync(parent.PostId, 1, cancellationToken);
        await InvalidateCommentsCacheAsync(parent.PostId, cancellationToken);
        return (reply.ToDto(), Array.Empty<ValidationFailure>(), null);
    }

    private async Task<Comment?> FindCommentAsync(string commentId, string? postIdHint, CancellationToken cancellationToken)
    {
        var normalizedComment = commentId.StartsWith("comment-", StringComparison.Ordinal)
            ? commentId
            : $"comment-{commentId}";
        if (!string.IsNullOrEmpty(postIdHint))
        {
            var postId = NormalizePostId(postIdHint);
            return await _comments.GetAsync(postId, normalizedComment, cancellationToken);
        }
        return await _comments.FindByIdCrossPartitionAsync(normalizedComment, cancellationToken);
    }

    private async Task AdjustPostCommentCountAsync(string postId, int delta, CancellationToken cancellationToken)
    {
        var post = await _posts.GetByIdOrSlugAsync(postId, cancellationToken);
        if (post is null)
        {
            return;
        }
        post.CommentCount = Math.Max(0, post.CommentCount + delta);
        post.UpdatedAt = DateTime.UtcNow;
        await _posts.UpdateAsync(post, cancellationToken);
        await _cache.RemoveByTagAsync(CacheTags.Posts, cancellationToken);
    }

    private ValueTask InvalidateCommentsCacheAsync(string postId, CancellationToken cancellationToken) =>
        _cache.RemoveByTagAsync(CacheTags.CommentsForPost(postId), cancellationToken);

    private ValueTask InvalidateLikesCacheAsync(string commentId, CancellationToken cancellationToken) =>
        _cache.RemoveAsync($"comments:likes:{commentId}", cancellationToken);

    private static string NormalizePostId(string raw) =>
        raw.StartsWith("post-", StringComparison.Ordinal) ? raw : $"post-{raw}";

    private static bool IsAuthor(Comment comment, string username)
    {
        var atIdx = username.IndexOf('@');
        var displayName = atIdx >= 0 ? username[..atIdx] : username;
        return string.Equals(comment.Author, displayName, StringComparison.Ordinal);
    }
}
