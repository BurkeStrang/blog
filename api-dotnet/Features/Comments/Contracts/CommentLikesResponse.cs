using System.Text.Json.Serialization;

namespace BlogApi.Features.Comments.Contracts;

public sealed record CommentLikesResponse(
    [property: JsonPropertyName("like_count")] int LikeCount,
    [property: JsonPropertyName("user_liked")] bool UserLiked);
