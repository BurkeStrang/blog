namespace BlogApi.Features.Notifications;

public static class NotificationsEndpoints
{
    public static IEndpointRouteBuilder MapNotificationsEndpoints(this IEndpointRouteBuilder app)
    {
        GetNotificationsEndpoint.Map(app);
        MarkNotificationsReadEndpoint.Map(app);
        return app;
    }
}
