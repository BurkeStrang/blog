using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BlogApi.Common.Json;

// Reads either a JSON string or a JSON number and yields a string. The Go API
// accepted `post_id` as either, and the original Cosmos document store keys
// posts by string IDs ("post-1700000000"), so the wire shape must keep both
// forms working.
public sealed class FlexibleStringOrNumberConverter : JsonConverter<string?>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType switch
        {
            JsonTokenType.String => reader.GetString(),
            JsonTokenType.Number when reader.TryGetInt64(out var n) => n.ToString(CultureInfo.InvariantCulture),
            JsonTokenType.Number => reader.GetDouble().ToString("R", CultureInfo.InvariantCulture),
            JsonTokenType.Null => null,
            _ => null,
        };

    public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
    {
        if (value is null)
        {
            writer.WriteNullValue();
            return;
        }
        writer.WriteStringValue(value);
    }
}
