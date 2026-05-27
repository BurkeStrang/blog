using BlogApi.Common.Errors;
using BlogApi.Features.Comments.Internal;
using BlogApi.Infrastructure.Auth;
using BlogApi.Infrastructure.Caching;
using BlogApi.Infrastructure.Persistence;
using ErrorOr;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Comments;

public sealed record UnlikeCommentCommand(
    string CommentId,
    string? PostIdHint,
    string Username);

public sealed record UnlikeCommentResult(int LikeCount);

internal sealed class UnlikeCommentHandler(BlogDbContext db, HybridCache cache)
{
    public async Task<ErrorOr<UnlikeCommentResult>> Handle(
        UnlikeCommentCommand cmd, CancellationToken ct)
    {
        var comment = await CommentLookup.FindAsync(db, cmd.CommentId, cmd.PostIdHint, ct);
        if (comment is null) return Error.NotFound("comment.not_found", "comment not found");

        var existingLike = await db.CommentLikes
            .FirstOrDefaultAsync(
                l => l.PostId == comment.PostId
                     && l.CommentId == comment.Id
                     && l.Username == cmd.Username, ct);
        if (existingLike is null)
        {
            return Error.NotFound("comment.like_not_found", "like not found");
        }

        db.CommentLikes.Remove(existingLike);
        if (comment.LikeCount > 0) comment.LikeCount--;
        comment.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await cache.RemoveAsync($"comments:likes:{comment.Id}", ct);

        return new UnlikeCommentResult(comment.LikeCount);
    }
}

public static class UnlikeCommentEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapDelete("/api/comments/{commentId}/like", async (
            string commentId,
            string? postId,
            HttpContext ctx,
            UnlikeCommentHandler handler,
            CancellationToken ct) =>
        {
            var username = ctx.User.Username() ?? "";
            var result = await handler.Handle(
                new UnlikeCommentCommand(commentId, postId, username), ct);
            return result.Match(
                r => Results.Ok(new { message = "unliked", likeCount = r.LikeCount }),
                errors => errors.ToProblem());
        })
        .RequireAuthorization();
}
