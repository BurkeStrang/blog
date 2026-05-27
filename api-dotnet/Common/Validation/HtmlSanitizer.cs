using System.Text.RegularExpressions;

namespace BlogApi.Common.Validation;

// Port of api/validation/validators.go:SanitizeHTML — basic blacklist that
// removes script tags, on* event attributes, and javascript: URLs while
// leaving the rest of the markdown/HTML body untouched. NOT a full XSS
// sanitizer; matches the Go API behavior 1:1 so this migration doesn't
// silently change rendering.
public static partial class HtmlSanitizer
{
    [GeneratedRegex(@"<script[^>]*>.*?</script>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex ScriptTag();

    [GeneratedRegex(@"\s+on\w+\s*=\s*[^>]*", RegexOptions.IgnoreCase)]
    private static partial Regex OnEventAttribute();

    [GeneratedRegex(@"javascript:\s*[^""'>\s]*", RegexOptions.IgnoreCase)]
    private static partial Regex JavascriptUrl();

    public static string Sanitize(string? input)
    {
        if (string.IsNullOrEmpty(input))
        {
            return input ?? "";
        }
        var output = ScriptTag().Replace(input, "");
        output = OnEventAttribute().Replace(output, "");
        output = JavascriptUrl().Replace(output, "");
        return output;
    }
}
