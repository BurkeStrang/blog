namespace BlogApi.Features.Posts;

public static class PostsEndpoints
{
    public static IEndpointRouteBuilder MapPostsEndpoints(this IEndpointRouteBuilder app)
    {
        ListPostsEndpoint.MapList(app);
        ListPostsEndpoint.MapPopular(app);
        ListPostsEndpoint.MapSearch(app);
        GetPostEndpoint.Map(app);
        TrackPostViewEndpoint.Map(app);
        CreatePostEndpoint.Map(app);
        UpdatePostEndpoint.Map(app);
        DeletePostEndpoint.Map(app);
        RecountCommentCountsEndpoint.Map(app);
        return app;
    }
}
