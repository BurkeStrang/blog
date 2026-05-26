using System.Text.Json;
using System.Text.Json.Serialization;

namespace BlogApi.Dtos.Requests;

public sealed class CreateCommentRequest
{
    // Accept both numeric and string forms — Go's POST /api/comments handled
    // post_id as either, since the UI has historically sent either.
    [JsonPropertyName("post_id")] public JsonElement PostIdLegacy { get; set; }
    [JsonPropertyName("postId")] public JsonElement PostIdCamel { get; set; }
    [JsonPropertyName("content")] public string? Content { get; set; }

    public string? ResolvePostId()
    {
        return Extract(PostIdCamel) ?? Extract(PostIdLegacy);

        static string? Extract(JsonElement element) => element.ValueKind switch
        {
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number when element.TryGetInt64(out var n) => n.ToString(System.Globalization.CultureInfo.InvariantCulture),
            _ => null,
        };
    }
}
