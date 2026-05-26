using BlogApi.Auth;
using BlogApi.Dtos;
using BlogApi.Dtos.Requests;
using BlogApi.Services;

namespace BlogApi.Endpoints;

public static class CommentEndpoints
{
    public static IEndpointRouteBuilder MapCommentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/comments");

        // ── reads ─────────────────────────────────────────────────────────
        group.MapGet("/", async (
            CommentQueryService service,
            HttpContext context,
            CancellationToken ct) =>
        {
            var postId = context.Request.Query["postId"].FirstOrDefault()
                ?? context.Request.Query["post_id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(postId))
            {
                return Results.Ok(Array.Empty<LegacyCommentResponse>());
            }
            var response = await service.ListByPostAsync(postId, ct);
            return Results.Ok(response.Comments.Select(c => c.ToLegacyResponse()).ToList());
        });

        group.MapGet("/{commentId}/likes", async (
            HttpContext context,
            CommentQueryService service,
            string commentId,
            string? postId,
            CancellationToken ct) =>
        {
            var currentUsername = context.User.Username();
            var likes = await service.GetLikesAsync(commentId, postId, currentUsername, ct);
            return Results.Ok(likes);
        });

        // ── writes ────────────────────────────────────────────────────────
        group.MapPost("/", async (
            HttpContext context,
            CreateCommentRequest request,
            CommentCommandService service,
            CancellationToken ct) =>
        {
            var postId = request.ResolvePostId();
            if (string.IsNullOrEmpty(postId))
            {
                return Results.BadRequest(new { error = "post_id is required" });
            }
            var author = context.User.AuthorDisplay() ?? "";
            var (comment, errors, _) = await service.CreateAsync(postId, request.Content, author, ct);
            if (errors.Count > 0)
            {
                return Results.BadRequest(new { error = "validation failed", details = errors });
            }
            return Results.Created($"/api/comments/{comment!.Id}", comment!.ToLegacyResponse());
        }).RequireAuthorization();

        group.MapPut("/{commentId}", async (
            HttpContext context,
            string commentId,
            string? postId,
            UpdateCommentRequest request,
            CommentCommandService service,
            CancellationToken ct) =>
        {
            var username = context.User.Username() ?? "";
            var (comment, errors, error) = await service.UpdateAsync(commentId, postId, request.Content, username, ct);
            if (errors.Count > 0)
            {
                return Results.BadRequest(new { error = "validation failed", details = errors });
            }
            return error switch
            {
                CommentCommandError.NotFound => Results.NotFound(new { error = "comment not found" }),
                CommentCommandError.Forbidden => Results.StatusCode(StatusCodes.Status403Forbidden),
                _ => Results.Ok(comment!.ToLegacyResponse()),
            };
        }).RequireAuthorization();

        group.MapDelete("/{commentId}", async (
            HttpContext context,
            string commentId,
            string? postId,
            CommentCommandService service,
            CancellationToken ct) =>
        {
            var username = context.User.Username() ?? "";
            var error = await service.DeleteAsync(commentId, postId, username, ct);
            return error switch
            {
                CommentCommandError.NotFound => Results.NotFound(new { error = "comment not found" }),
                CommentCommandError.Forbidden => Results.StatusCode(StatusCodes.Status403Forbidden),
                _ => Results.Ok(new { message = "comment deleted" }),
            };
        }).RequireAuthorization();

        group.MapPost("/{commentId}/like", async (
            HttpContext context,
            string commentId,
            string? postId,
            CommentCommandService service,
            CancellationToken ct) =>
        {
            var username = context.User.Username() ?? "";
            var (likeCount, error) = await service.LikeAsync(commentId, postId, username, ct);
            return error switch
            {
                CommentCommandError.NotFound => Results.NotFound(new { error = "comment not found" }),
                CommentCommandError.AlreadyLiked => Results.Conflict(new { error = "already liked", likeCount }),
                _ => Results.Ok(new { message = "liked", likeCount }),
            };
        }).RequireAuthorization();

        group.MapDelete("/{commentId}/like", async (
            HttpContext context,
            string commentId,
            string? postId,
            CommentCommandService service,
            CancellationToken ct) =>
        {
            var username = context.User.Username() ?? "";
            var (likeCount, error) = await service.UnlikeAsync(commentId, postId, username, ct);
            return error switch
            {
                CommentCommandError.NotFound => Results.NotFound(new { error = "comment not found" }),
                CommentCommandError.LikeNotFound => Results.NotFound(new { error = "like not found" }),
                _ => Results.Ok(new { message = "unliked", likeCount }),
            };
        }).RequireAuthorization();

        group.MapPost("/{commentId}/reply", async (
            HttpContext context,
            string commentId,
            string? postId,
            ReplyCommentRequest request,
            CommentCommandService service,
            CancellationToken ct) =>
        {
            var author = context.User.AuthorDisplay() ?? "";
            var (reply, errors, error) = await service.ReplyAsync(commentId, postId, request.Content, author, ct);
            if (errors.Count > 0)
            {
                return Results.BadRequest(new { error = "validation failed", details = errors });
            }
            return error switch
            {
                CommentCommandError.NotFound => Results.NotFound(new { error = "parent comment not found" }),
                _ => Results.Created($"/api/comments/{reply!.Id}", reply!.ToLegacyResponse()),
            };
        }).RequireAuthorization();

        return app;
    }
}
