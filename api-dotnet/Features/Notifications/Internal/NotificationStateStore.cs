using BlogApi.Domain.Entities;
using BlogApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BlogApi.Features.Notifications.Internal;

internal static class NotificationStateStore
{
    /// <summary>
    /// Loads the user's watermarks, creating them at "now" on first sight.
    /// Seeding at now rather than at epoch means a user who has never opened the
    /// bell doesn't arrive to a badge counting every post ever published.
    /// </summary>
    public static async Task<NotificationState> GetOrCreateAsync(
        BlogDbContext db, string username, CancellationToken ct)
    {
        var existing = await db.NotificationStates
            .FirstOrDefaultAsync(s => s.Username == username, ct);
        if (existing is not null)
        {
            return existing;
        }

        var now = DateTime.UtcNow;
        var created = new NotificationState
        {
            Id = $"notifications-{username}",
            Type = "notification_state",
            Username = username,
            PostsSeenAt = now,
            CommentsSeenAt = now,
            UpdatedAt = now,
        };
        db.NotificationStates.Add(created);
        await db.SaveChangesAsync(ct);
        return created;
    }
}
