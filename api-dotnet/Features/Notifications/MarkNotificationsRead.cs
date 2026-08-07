using BlogApi.Features.Notifications.Contracts;
using BlogApi.Features.Notifications.Internal;
using BlogApi.Infrastructure.Auth;
using BlogApi.Infrastructure.Persistence;

namespace BlogApi.Features.Notifications;

public sealed record MarkNotificationsReadCommand(string Username);

internal sealed class MarkNotificationsReadHandler(BlogDbContext db)
{
    public async Task<NotificationCountsResponse> Handle(
        MarkNotificationsReadCommand cmd, CancellationToken ct)
    {
        var state = await NotificationStateStore.GetOrCreateAsync(db, cmd.Username, ct);

        var now = DateTime.UtcNow;
        state.PostsSeenAt = now;
        state.CommentsSeenAt = now;
        state.UpdatedAt = now;
        await db.SaveChangesAsync(ct);

        return new NotificationCountsResponse(0, 0, 0, 0);
    }
}

public static class MarkNotificationsReadEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapPost("/api/notifications/read", async (
            HttpContext ctx,
            MarkNotificationsReadHandler handler,
            CancellationToken ct) =>
        {
            var username = ctx.User.Username();
            if (string.IsNullOrEmpty(username))
            {
                return Results.Unauthorized();
            }
            var counts = await handler.Handle(new MarkNotificationsReadCommand(username), ct);
            return Results.Ok(counts);
        })
        .RequireAuthorization();
}
