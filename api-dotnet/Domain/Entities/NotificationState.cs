namespace BlogApi.Domain.Entities;

/// <summary>
/// Per-user read watermarks for the notification badge. Counts are derived by
/// comparing these against post/comment/like timestamps, so nothing has to be
/// written when an event happens — only when the user marks them read.
/// </summary>
public sealed class NotificationState : UserContainerDocument
{
    public NotificationState() => Type = "notification_state";

    /// <summary>Posts published at or before this are not "new" for this user.</summary>
    public DateTime PostsSeenAt { get; set; }

    /// <summary>Replies and likes at or before this are not "new" for this user.</summary>
    public DateTime CommentsSeenAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
