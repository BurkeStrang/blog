using BlogApi.Auth;
using BlogApi.Dtos.Requests;
using BlogApi.Services;

namespace BlogApi.Endpoints;

public static class PostEndpoints
{
    public static IEndpointRouteBuilder MapPostEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/posts");

        // ── reads ─────────────────────────────────────────────────────────
        group.MapGet("/", async (
            PostQueryService service,
            string? search,
            string? sort,
            string? order,
            int? limit,
            int? offset,
            CancellationToken ct) =>
        {
            var query = PostListQuery.FromRaw(search, sort, order, limit, offset);
            return await service.ListAsync(query, ct);
        });

        group.MapGet("/popular", async (
            PostQueryService service,
            int? limit,
            CancellationToken ct) =>
        {
            var query = PostListQuery.FromRaw(
                search: null,
                sort: PostListQuery.PopularSort,
                order: "desc",
                limit: limit ?? PostListQuery.PopularLimit,
                offset: 0);
            return await service.ListAsync(query, ct);
        });

        group.MapGet("/search", async (
            PostQueryService service,
            string? search,
            string? q,
            string? sort,
            string? order,
            int? limit,
            int? offset,
            CancellationToken ct) =>
        {
            var query = PostListQuery.FromRaw(search ?? q, sort, order, limit, offset);
            return await service.ListAsync(query, ct);
        });

        group.MapGet("/{idOrSlug}", async (
            PostQueryService service,
            string idOrSlug,
            CancellationToken ct) =>
        {
            var post = await service.GetAsync(idOrSlug, ct);
            return post is null ? Results.NotFound(new { error = "post not found" }) : Results.Ok(post);
        });

        // ── writes ────────────────────────────────────────────────────────
        group.MapPost("/{idOrSlug}/view", async (
            string idOrSlug,
            PostCommandService service,
            CancellationToken ct) =>
        {
            var (views, lastViewed, error) = await service.TrackViewAsync(idOrSlug, ct);
            if (error == PostCommandError.NotFound)
            {
                return Results.NotFound(new { error = "post not found" });
            }
            return Results.Ok(new { message = "view tracked", views, lastViewed });
        });

        group.MapPost("/", async (
            HttpContext context,
            CreatePostRequest request,
            PostCommandService service,
            CancellationToken ct) =>
        {
            var author = context.User.Username() ?? "";
            var (post, errors, error) = await service.CreateAsync(request, author, ct);
            if (errors.Count > 0)
            {
                return Results.BadRequest(new { error = "validation failed", details = errors });
            }
            return error switch
            {
                PostCommandError.SlugConflict => Results.Conflict(new { error = "slug already exists" }),
                _ => Results.Created($"/api/posts/{post!.Slug}", post),
            };
        }).RequireAuthorization("Admin");

        group.MapPut("/{idOrSlug}", async (
            string idOrSlug,
            UpdatePostRequest request,
            PostCommandService service,
            CancellationToken ct) =>
        {
            var (post, errors, error) = await service.UpdateAsync(idOrSlug, request, ct);
            if (errors.Count > 0)
            {
                return Results.BadRequest(new { error = "validation failed", details = errors });
            }
            return error switch
            {
                PostCommandError.NotFound => Results.NotFound(new { error = "post not found" }),
                _ => Results.Ok(post),
            };
        }).RequireAuthorization("Admin");

        group.MapDelete("/{idOrSlug}", async (
            string idOrSlug,
            PostCommandService service,
            CancellationToken ct) =>
        {
            var error = await service.DeleteAsync(idOrSlug, ct);
            return error switch
            {
                PostCommandError.NotFound => Results.NotFound(new { error = "post not found" }),
                _ => Results.Ok(new { message = "post deleted" }),
            };
        }).RequireAuthorization("Admin");

        group.MapPost("/update-comment-counts", async (
            PostCommandService service,
            CancellationToken ct) =>
        {
            var updated = await service.RecountCommentsAsync(ct);
            return Results.Ok(new { message = "comment counts updated", updated });
        }).RequireAuthorization("Admin");

        return app;
    }
}
