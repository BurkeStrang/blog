using BlogApi.Data.Entities;
using BlogApi.Data.Repositories;
using BlogApi.Dtos;
using BlogApi.Dtos.Requests;
using BlogApi.Validation;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Services;

public enum PostCommandError { NotFound, SlugConflict }

public sealed class PostCommandService
{
    private readonly IPostRepository _posts;
    private readonly ICommentRepository _comments;
    private readonly HybridCache _cache;

    public PostCommandService(IPostRepository posts, ICommentRepository comments, HybridCache cache)
    {
        _posts = posts;
        _comments = comments;
        _cache = cache;
    }

    public async Task<(PostDto? Post, IReadOnlyList<ValidationFailure> Errors, PostCommandError? Error)> CreateAsync(
        CreatePostRequest request, string author, CancellationToken cancellationToken)
    {
        var sanitized = SanitizeCreate(request);
        var errors = Validators.ValidatePostCreate(sanitized.Slug, sanitized.Title, sanitized.Body, sanitized.Previous, sanitized.Next);
        if (errors.Count > 0)
        {
            return (null, errors, null);
        }

        if (await _posts.SlugExistsAsync(sanitized.Slug!, cancellationToken))
        {
            return (null, Array.Empty<ValidationFailure>(), PostCommandError.SlugConflict);
        }

        var now = DateTime.UtcNow;
        var created = sanitized.CreatedAt ?? now;
        var post = new Post
        {
            Id = $"post-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            Type = "post",
            Slug = sanitized.Slug!,
            Title = sanitized.Title!,
            Body = sanitized.Body!,
            Author = author,
            Previous = sanitized.Previous,
            Next = sanitized.Next,
            CreatedAt = created,
            UpdatedAt = created,
        };

        await _posts.AddAsync(post, cancellationToken);
        await InvalidatePostsCacheAsync(cancellationToken);
        return (post.ToDto(), Array.Empty<ValidationFailure>(), null);
    }

    public async Task<(PostDto? Post, IReadOnlyList<ValidationFailure> Errors, PostCommandError? Error)> UpdateAsync(
        string idOrSlug, UpdatePostRequest request, CancellationToken cancellationToken)
    {
        var existing = await _posts.GetByIdOrSlugAsync(idOrSlug, cancellationToken);
        if (existing is null)
        {
            return (null, Array.Empty<ValidationFailure>(), PostCommandError.NotFound);
        }

        var sanitized = SanitizeUpdate(request);
        var errors = Validators.ValidatePostUpdate(sanitized.Slug, sanitized.Title, sanitized.Body, sanitized.Previous, sanitized.Next);
        if (errors.Count > 0)
        {
            return (null, errors, null);
        }

        if (!string.IsNullOrEmpty(sanitized.Title)) existing.Title = sanitized.Title;
        if (!string.IsNullOrEmpty(sanitized.Body)) existing.Body = sanitized.Body;
        if (!string.IsNullOrEmpty(sanitized.Slug)) existing.Slug = sanitized.Slug;
        if (sanitized.CreatedAt.HasValue) existing.CreatedAt = sanitized.CreatedAt.Value;
        existing.Previous = sanitized.Previous;
        existing.Next = sanitized.Next;
        existing.UpdatedAt = DateTime.UtcNow;

        await _posts.UpdateAsync(existing, cancellationToken);
        await InvalidatePostsCacheAsync(cancellationToken);
        return (existing.ToDto(), Array.Empty<ValidationFailure>(), null);
    }

    public async Task<PostCommandError?> DeleteAsync(string idOrSlug, CancellationToken cancellationToken)
    {
        var existing = await _posts.GetByIdOrSlugAsync(idOrSlug, cancellationToken);
        if (existing is null)
        {
            return PostCommandError.NotFound;
        }
        await _posts.DeleteAsync(existing, cancellationToken);
        await InvalidatePostsCacheAsync(cancellationToken);
        return null;
    }

    public async Task<(int Views, DateTime? LastViewed, PostCommandError? Error)> TrackViewAsync(
        string idOrSlug, CancellationToken cancellationToken)
    {
        var existing = await _posts.GetByIdOrSlugAsync(idOrSlug, cancellationToken);
        if (existing is null)
        {
            return (0, null, PostCommandError.NotFound);
        }

        var now = DateTime.UtcNow;
        existing.PageViews++;
        existing.RecentViews++;
        existing.LastViewed = now;
        existing.FirstViewed ??= now;
        existing.UpdatedAt = now;

        await _posts.UpdateAsync(existing, cancellationToken);
        await InvalidatePostsCacheAsync(cancellationToken);
        return (existing.PageViews, existing.LastViewed, null);
    }

    public async Task<int> RecountCommentsAsync(CancellationToken cancellationToken)
    {
        var posts = await _posts.ListAsync(null, 0, PostListQuery.MaxLimit, cancellationToken);
        var updated = 0;
        foreach (var post in posts)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var count = await _comments.CountByPostAsync(post.Id, cancellationToken);
            if (count != post.CommentCount)
            {
                post.CommentCount = count;
                post.UpdatedAt = DateTime.UtcNow;
                await _posts.UpdateAsync(post, cancellationToken);
                updated++;
            }
        }
        if (updated > 0)
        {
            await InvalidatePostsCacheAsync(cancellationToken);
        }
        return updated;
    }

    private ValueTask InvalidatePostsCacheAsync(CancellationToken cancellationToken) =>
        _cache.RemoveByTagAsync(CacheTags.Posts, cancellationToken);

    private static CreatePostRequest SanitizeCreate(CreatePostRequest r) => r with
    {
        Slug = HtmlSanitizer.Sanitize(r.Slug),
        Title = HtmlSanitizer.Sanitize(r.Title),
        Body = HtmlSanitizer.Sanitize(r.Body),
        Previous = HtmlSanitizer.Sanitize(r.Previous),
        Next = HtmlSanitizer.Sanitize(r.Next),
    };

    private static UpdatePostRequest SanitizeUpdate(UpdatePostRequest r) => r with
    {
        Slug = HtmlSanitizer.Sanitize(r.Slug),
        Title = HtmlSanitizer.Sanitize(r.Title),
        Body = HtmlSanitizer.Sanitize(r.Body),
        Previous = HtmlSanitizer.Sanitize(r.Previous),
        Next = HtmlSanitizer.Sanitize(r.Next),
    };
}
