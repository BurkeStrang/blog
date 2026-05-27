namespace BlogApi.Features.Comments;

public static class CommentsEndpoints
{
    public static IEndpointRouteBuilder MapCommentsEndpoints(this IEndpointRouteBuilder app)
    {
        ListCommentsEndpoint.Map(app);
        GetCommentLikesEndpoint.Map(app);
        CreateCommentEndpoint.Map(app);
        UpdateCommentEndpoint.Map(app);
        DeleteCommentEndpoint.Map(app);
        LikeCommentEndpoint.Map(app);
        UnlikeCommentEndpoint.Map(app);
        ReplyToCommentEndpoint.Map(app);
        return app;
    }
}
