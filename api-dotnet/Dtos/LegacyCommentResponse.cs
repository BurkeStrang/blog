using System.Text.Json.Serialization;

namespace BlogApi.Dtos;

public sealed record LegacyCommentResponse(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("post_id")] long PostId,
    [property: JsonPropertyName("content")] string Content,
    [property: JsonPropertyName("author")] string Author,
    [property: JsonPropertyName("created_at")] DateTime CreatedAt,
    [property: JsonPropertyName("like_count")] int LikeCount,
    [property: JsonPropertyName("cosmos_id")] string CosmosId,
    [property: JsonPropertyName("parent_id")]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    long? ParentId);
