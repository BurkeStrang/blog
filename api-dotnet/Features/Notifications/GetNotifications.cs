using BlogApi.Features.Comments.Internal;
using BlogApi.Features.Notifications.Contracts;
using BlogApi.Features.Notifications.Internal;
using BlogApi.Infrastructure.Auth;
using BlogApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BlogApi.Features.Notifications;

public sealed record GetNotificationsQuery(string Username);

internal sealed class GetNotificationsHandler(BlogDbContext db)
{
    public async Task<NotificationCountsResponse> Handle(
        GetNotificationsQuery query, CancellationToken ct)
    {
        var state = await NotificationStateStore.GetOrCreateAsync(db, query.Username, ct);
        var displayName = IdNormalization.DisplayName(query.Username);

        // New posts — anything published since the watermark that the user
        // didn't write themselves.
        var newPosts = await db.Posts
            .AsNoTracking()
            .Where(p => p.CreatedAt > state.PostsSeenAt && p.Author != displayName)
            .CountAsync(ct);

        // Replies and likes both need the set of comments this user wrote. No
        // comments means neither can have happened, so skip both queries.
        var myCommentIds = await db.Comments
            .AsNoTracking()
            .Where(c => c.Author == displayName)
            .Select(c => c.Id)
            .ToListAsync(ct);

        var replies = 0;
        var likes = 0;

        if (myCommentIds.Count > 0)
        {
            var mine = myCommentIds.ToHashSet(StringComparer.Ordinal);

            // Both queries are bounded by the watermark, then matched against
            // the user's comment ids in memory — the alternative is an IN clause
            // that grows with the user's comment history.
            var replyParents = await db.Comments
                .AsNoTracking()
                .Where(c => c.CreatedAt > state.CommentsSeenAt
                            && c.Author != displayName
                            && c.ParentId != null)
                .Select(c => c.ParentId!)
                .ToListAsync(ct);
            replies = replyParents.Count(mine.Contains);

            var likedComments = await db.CommentLikes
                .AsNoTracking()
                .Where(l => l.CreatedAt > state.CommentsSeenAt && l.Username != query.Username)
                .Select(l => l.CommentId)
                .ToListAsync(ct);
            likes = likedComments.Count(mine.Contains);
        }

        return new NotificationCountsResponse(newPosts + replies + likes, newPosts, replies, likes);
    }
}

public static class GetNotificationsEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapGet("/api/notifications", async (
            HttpContext ctx,
            GetNotificationsHandler handler,
            CancellationToken ct) =>
        {
            var username = ctx.User.Username();
            if (string.IsNullOrEmpty(username))
            {
                return Results.Unauthorized();
            }
            var counts = await handler.Handle(new GetNotificationsQuery(username), ct);
            return Results.Ok(counts);
        })
        .RequireAuthorization();
}
