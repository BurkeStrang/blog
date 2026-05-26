using BlogApi.Data.Repositories;

namespace BlogApi.Services;

public sealed class CacheWarmer : BackgroundService
{
    private static readonly TimeSpan WarmInterval = TimeSpan.FromMinutes(10);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CacheWarmer> _logger;

    public CacheWarmer(IServiceScopeFactory scopeFactory, ILogger<CacheWarmer> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

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

    private async Task WarmAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var posts = scope.ServiceProvider.GetRequiredService<PostQueryService>();
            var comments = scope.ServiceProvider.GetRequiredService<CommentQueryService>();
            var postRepo = scope.ServiceProvider.GetRequiredService<IPostRepository>();

            await posts.ListAsync(
                PostListQuery.FromRaw(null, null, null, null, null),
                cancellationToken);

            await posts.ListAsync(
                PostListQuery.FromRaw(
                    search: null,
                    sort: PostListQuery.PopularSort,
                    order: "desc",
                    limit: PostListQuery.PopularLimit,
                    offset: 0),
                cancellationToken);

            var allPosts = await postRepo.ListAsync(null, 0, PostListQuery.MaxLimit, cancellationToken);
            var detailWarmed = 0;
            var commentsWarmed = 0;
            foreach (var post in allPosts)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var key = !string.IsNullOrEmpty(post.Slug) ? post.Slug : post.Id;
                if (!string.IsNullOrEmpty(key))
                {
                    await posts.GetAsync(key, cancellationToken);
                    detailWarmed++;
                }

                await comments.ListByPostAsync(post.Id, cancellationToken);
                commentsWarmed++;
            }

            _logger.LogInformation(
                "Cache warm complete: list/popular + {Details} post details + {Comments} comment lists",
                detailWarmed,
                commentsWarmed);
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogError(ex, "Cache warm failed");
        }
    }
}
