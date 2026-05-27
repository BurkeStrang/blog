using BlogApi.Common.Errors;
using BlogApi.Features.Comments.Internal;
using BlogApi.Infrastructure.Auth;
using BlogApi.Infrastructure.Caching;
using BlogApi.Infrastructure.Persistence;
using ErrorOr;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Comments;

public sealed record DeleteCommentCommand(
    string CommentId,
    string? PostIdHint,
    string Username);

internal sealed class DeleteCommentHandler(BlogDbContext db, HybridCache cache)
{
    public async Task<ErrorOr<Deleted>> Handle(DeleteCommentCommand cmd, CancellationToken ct)
    {
        var existing = await CommentLookup.FindAsync(db, cmd.CommentId, cmd.PostIdHint, ct);
        if (existing is null) return Error.NotFound("comment.not_found", "comment not found");
        if (!IdNormalization.IsAuthor(existing.Author, cmd.Username))
            return Error.Forbidden("comment.forbidden", "forbidden");

        var postId = existing.PostId;
        db.Comments.Remove(existing);
        await db.SaveChangesAsync(ct);

        await PostCommentCountAdjuster.AdjustAsync(db, cache, postId, -1, ct);
        await cache.RemoveByTagAsync(CacheTags.CommentsForPost(postId), ct);

        return Result.Deleted;
    }
}

public static class DeleteCommentEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapDelete("/api/comments/{commentId}", async (
            string commentId,
            string? postId,
            HttpContext ctx,
            DeleteCommentHandler handler,
            CancellationToken ct) =>
        {
            var username = ctx.User.Username() ?? "";
            var result = await handler.Handle(
                new DeleteCommentCommand(commentId, postId, username), ct);
            return result.Match(
                _ => Results.Ok(new { message = "comment deleted" }),
                errors => errors.ToProblem());
        })
        .RequireAuthorization();
}
