using BlogApi.Common.Errors;
using BlogApi.Domain.Entities;
using BlogApi.Features.Comments.Internal;
using BlogApi.Infrastructure.Auth;
using BlogApi.Infrastructure.Caching;
using BlogApi.Infrastructure.Persistence;
using ErrorOr;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Comments;

public sealed record LikeCommentCommand(
    string CommentId,
    string? PostIdHint,
    string Username);

public sealed record LikeCommentResult(int LikeCount);

internal sealed class LikeCommentHandler(BlogDbContext db, HybridCache cache)
{
    public async Task<ErrorOr<LikeCommentResult>> Handle(
        LikeCommentCommand cmd, CancellationToken ct)
    {
        var comment = await CommentLookup.FindAsync(db, cmd.CommentId, cmd.PostIdHint, ct);
        if (comment is null) return Error.NotFound("comment.not_found", "comment not found");

        var existingLike = await db.CommentLikes
            .FirstOrDefaultAsync(
                l => l.PostId == comment.PostId
                     && l.CommentId == comment.Id
                     && l.Username == cmd.Username, ct);
        if (existingLike is not null)
        {
            return Error.Conflict("comment.already_liked", "already liked");
        }

        db.CommentLikes.Add(new CommentLike
        {
            Id = $"like-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{cmd.Username}",
            Type = "comment_like",
            PostId = comment.PostId,
            CommentId = comment.Id,
            Username = cmd.Username,
            CreatedAt = DateTime.UtcNow,
        });

        comment.LikeCount++;
        comment.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await cache.RemoveAsync($"comments:likes:{comment.Id}", ct);

        return new LikeCommentResult(comment.LikeCount);
    }
}

public static class LikeCommentEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapPost("/api/comments/{commentId}/like", async (
            string commentId,
            string? postId,
            HttpContext ctx,
            LikeCommentHandler handler,
            CancellationToken ct) =>
        {
            var username = ctx.User.Username() ?? "";
            var result = await handler.Handle(
                new LikeCommentCommand(commentId, postId, username), ct);
            return result.Match(
                r => Results.Ok(new { message = "liked", likeCount = r.LikeCount }),
                errors => errors.ToProblem());
        })
        .RequireAuthorization();
}
