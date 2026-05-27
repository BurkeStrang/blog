using BlogApi.Features.Comments;
using BlogApi.Features.Posts;
using BlogApi.Features.Posts.Internal;
using BlogApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BlogApi.Infrastructure.Caching;

internal sealed class CacheWarmer(IServiceScopeFactory scopeFactory, ILogger<CacheWarmer> logger)
    : BackgroundService
{
    private static readonly TimeSpan WarmInterval = TimeSpan.FromMinutes(10);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await WarmAsync(stoppingToken);

        using var timer = new PeriodicTimer(WarmInterval);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await WarmAsync(stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            // graceful shutdown
        }
    }

    private async Task WarmAsync(CancellationToken ct)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var listPosts = scope.ServiceProvider.GetRequiredService<ListPostsHandler>();
            var getPost = scope.ServiceProvider.GetRequiredService<GetPostHandler>();
            var listComments = scope.ServiceProvider.GetRequiredService<ListCommentsHandler>();
            var db = scope.ServiceProvider.GetRequiredService<BlogDbContext>();

            await listPosts.Handle(
                PostListQuery.FromRaw(null, null, null, null, null), ct);

            await listPosts.Handle(
                PostListQuery.FromRaw(
                    search: null,
                    sort: PostListQuery.PopularSort,
                    order: "desc",
                    limit: PostListQuery.PopularLimit,
                    offset: 0),
                ct);

            var allPosts = await db.Posts
                .AsNoTracking()
                .OrderByDescending(p => p.CreatedAt)
                .Take(PostListQuery.MaxLimit)
                .ToListAsync(ct);

            var detailWarmed = 0;
            var commentsWarmed = 0;
            foreach (var post in allPosts)
            {
                ct.ThrowIfCancellationRequested();

                var key = !string.IsNullOrEmpty(post.Slug) ? post.Slug : post.Id;
                if (!string.IsNullOrEmpty(key))
                {
                    await getPost.Handle(new GetPostQuery(key), ct);
                    detailWarmed++;
                }

                await listComments.Handle(new ListCommentsQuery(post.Id), ct);
                commentsWarmed++;
            }

            logger.LogInformation(
                "Cache warm complete: list/popular + {Details} post details + {Comments} comment lists",
                detailWarmed,
                commentsWarmed);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogError(ex, "Cache warm failed");
        }
    }
}
