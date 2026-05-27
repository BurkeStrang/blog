namespace BlogApi.Features.Posts.Internal;

public sealed record PostListQuery(
    string? Search,
    string Sort,
    string Order,
    int Limit,
    int Offset)
{
    public const int DefaultLimit = 150;
    public const int MaxLimit = 150;
    public const string DefaultSort = "createdAt";
    public const string DefaultOrder = "desc";
    public const int PopularLimit = 10;
    public const string PopularSort = "pageViews";

    private static readonly HashSet<string> ValidSortFields = new(StringComparer.Ordinal)
    {
        "createdAt", "title", "pageViews", "recentViews", "lastViewed", "author",
    };

    public static PostListQuery FromRaw(string? search, string? sort, string? order, int? limit, int? offset)
    {
        var resolvedSort = !string.IsNullOrWhiteSpace(sort) && ValidSortFields.Contains(sort)
            ? sort
            : DefaultSort;
        var resolvedOrder = order == "asc" ? "asc" : DefaultOrder;
        var resolvedLimit = limit is > 0 and <= MaxLimit ? limit.Value : DefaultLimit;
        var resolvedOffset = offset is > 0 ? offset.Value : 0;
        var resolvedSearch = string.IsNullOrWhiteSpace(search) ? null : search.Trim();
        return new PostListQuery(resolvedSearch, resolvedSort, resolvedOrder, resolvedLimit, resolvedOffset);
    }

    public string CacheKey => $"posts:list:{Search ?? ""}:{Sort}:{Order}:{Limit}:{Offset}";
}
