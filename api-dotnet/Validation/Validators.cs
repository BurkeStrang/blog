using System.Text.RegularExpressions;

namespace BlogApi.Validation;

public sealed record ValidationFailure(string Field, string Message);

public static partial class Validators
{
    [GeneratedRegex(@"^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    private static partial Regex SlugPattern();

    public const int MaxSlugLength = 100;
    public const int MaxTitleLength = 200;
    public const int MaxBodyLength = 1_000_000;
    public const int MaxAuthorLength = 100;
    public const int MaxCommentLength = 10_000;
    public const int MaxSearchLength = 200;

    public static IReadOnlyList<ValidationFailure> ValidatePostCreate(
        string? slug, string? title, string? body, string? previous, string? next)
    {
        var errors = new List<ValidationFailure>();
        ValidateRequiredSlug(slug, "slug", errors);
        ValidateOptionalSlug(previous, "previous", errors);
        ValidateOptionalSlug(next, "next", errors);
        ValidateRequiredString(title, "title", MaxTitleLength, errors);
        ValidateRequiredString(body, "body", MaxBodyLength, errors);
        return errors;
    }

    public static IReadOnlyList<ValidationFailure> ValidatePostUpdate(
        string? slug, string? title, string? body, string? previous, string? next)
    {
        var errors = new List<ValidationFailure>();
        if (slug is not null)
        {
            ValidateRequiredSlug(slug, "slug", errors);
        }
        if (title is not null)
        {
            ValidateRequiredString(title, "title", MaxTitleLength, errors);
        }
        if (body is not null)
        {
            ValidateRequiredString(body, "body", MaxBodyLength, errors);
        }
        ValidateOptionalSlug(previous, "previous", errors);
        ValidateOptionalSlug(next, "next", errors);
        return errors;
    }

    public static IReadOnlyList<ValidationFailure> ValidateComment(string? content)
    {
        var errors = new List<ValidationFailure>();
        ValidateRequiredString(content, "content", MaxCommentLength, errors);
        return errors;
    }

    public static IReadOnlyList<ValidationFailure> ValidateSearch(string? query)
    {
        if (string.IsNullOrEmpty(query))
        {
            return Array.Empty<ValidationFailure>();
        }
        return query.Length > MaxSearchLength
            ? new[] { new ValidationFailure("search", $"search query must be {MaxSearchLength} characters or less") }
            : Array.Empty<ValidationFailure>();
    }

    private static void ValidateRequiredSlug(string? value, string field, List<ValidationFailure> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add(new ValidationFailure(field, $"{field} is required"));
            return;
        }
        if (value.Length > MaxSlugLength)
        {
            errors.Add(new ValidationFailure(field, $"{field} must be {MaxSlugLength} characters or less"));
        }
        if (!SlugPattern().IsMatch(value))
        {
            errors.Add(new ValidationFailure(field, $"{field} must be lowercase letters, numbers, and hyphens only"));
        }
    }

    private static void ValidateOptionalSlug(string? value, string field, List<ValidationFailure> errors)
    {
        if (string.IsNullOrEmpty(value))
        {
            return;
        }
        if (value.Length > MaxSlugLength)
        {
            errors.Add(new ValidationFailure(field, $"{field} must be {MaxSlugLength} characters or less"));
        }
        if (!SlugPattern().IsMatch(value))
        {
            errors.Add(new ValidationFailure(field, $"{field} must be lowercase letters, numbers, and hyphens only"));
        }
    }

    private static void ValidateRequiredString(string? value, string field, int maxLength, List<ValidationFailure> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add(new ValidationFailure(field, $"{field} is required"));
            return;
        }
        if (value.Length > maxLength)
        {
            errors.Add(new ValidationFailure(field, $"{field} must be {maxLength} characters or less"));
        }
    }
}
