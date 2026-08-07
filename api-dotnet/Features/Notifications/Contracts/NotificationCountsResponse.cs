namespace BlogApi.Features.Notifications.Contracts;

/// <summary>
/// Unread counts behind the bell badge. <paramref name="Total"/> is what the
/// badge shows; the breakdown drives the tooltip.
/// </summary>
public sealed record NotificationCountsResponse(
    int Total,
    int NewPosts,
    int Replies,
    int Likes);
