using BlogApi.Common.Errors;
using BlogApi.Infrastructure.Caching;
using BlogApi.Infrastructure.Persistence;
using ErrorOr;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Posts;

public sealed record DeletePostCommand(string IdOrSlug);

internal sealed class DeletePostHandler(BlogDbContext db, HybridCache cache)
{
    public async Task<ErrorOr<Deleted>> Handle(DeletePostCommand cmd, CancellationToken ct)
    {
        var altId = $"post-{cmd.IdOrSlug}";
        var existing = await db.Posts.FirstOrDefaultAsync(
            p => p.Slug == cmd.IdOrSlug || p.Id == cmd.IdOrSlug || p.Id == altId, ct);
        if (existing is null)
        {
            return Error.NotFound("post.not_found", "post not found");
        }

        db.Posts.Remove(existing);
        await db.SaveChangesAsync(ct);
        await cache.RemoveByTagAsync(CacheTags.Posts, ct);

        return Result.Deleted;
    }
}

public static class DeletePostEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapDelete("/api/posts/{idOrSlug}", async (
            string idOrSlug,
            DeletePostHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.Handle(new DeletePostCommand(idOrSlug), ct);
            return result.Match(
                _ => Results.Ok(new { message = "post deleted" }),
                errors => errors.ToProblem());
        })
        .RequireAuthorization("Admin");
}
