using BlogApi.Common.Errors;
using BlogApi.Infrastructure.Caching;
using BlogApi.Infrastructure.Persistence;
using ErrorOr;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Posts;

public sealed record TrackPostViewCommand(string IdOrSlug);

public sealed record TrackPostViewResult(int Views, DateTime? LastViewed);

internal sealed class TrackPostViewHandler(BlogDbContext db, HybridCache cache)
{
    public async Task<ErrorOr<TrackPostViewResult>> Handle(
        TrackPostViewCommand cmd, CancellationToken ct)
    {
        var altId = $"post-{cmd.IdOrSlug}";
        var post = await db.Posts.FirstOrDefaultAsync(
            p => p.Slug == cmd.IdOrSlug || p.Id == cmd.IdOrSlug || p.Id == altId, ct);
        if (post is null)
        {
            return Error.NotFound("post.not_found", "post not found");
        }

        var now = DateTime.UtcNow;
        post.PageViews++;
        post.RecentViews++;
        post.LastViewed = now;
        post.FirstViewed ??= now;
        post.UpdatedAt = now;

        await db.SaveChangesAsync(ct);
        await cache.RemoveByTagAsync(CacheTags.Posts, ct);

        return new TrackPostViewResult(post.PageViews, post.LastViewed);
    }
}

public static class TrackPostViewEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapPost("/api/posts/{idOrSlug}/view", async (
            string idOrSlug,
            TrackPostViewHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.Handle(new TrackPostViewCommand(idOrSlug), ct);
            return result.Match(
                r => Results.Ok(new { message = "view tracked", views = r.Views, lastViewed = r.LastViewed }),
                errors => errors.ToProblem());
        });
}
