using System.Text.RegularExpressions;
using FluentValidation;

namespace BlogApi.Common.Validation;

public static partial class SlugValidatorExtensions
{
    public const int MaxSlugLength = 100;

    [GeneratedRegex(@"^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    private static partial Regex SlugPattern();

    public static IRuleBuilderOptions<T, string?> IsSlug<T>(this IRuleBuilder<T, string?> rule) =>
        rule
            .NotEmpty().WithMessage("{PropertyName} is required")
            .MaximumLength(MaxSlugLength).WithMessage($"{{PropertyName}} must be {MaxSlugLength} characters or less")
            .Matches(SlugPattern()).WithMessage("{PropertyName} must be lowercase letters, numbers, and hyphens only");

    public static IRuleBuilderOptions<T, string?> IsOptionalSlug<T>(this IRuleBuilder<T, string?> rule) =>
        rule
            .Must(static value =>
            {
                if (string.IsNullOrEmpty(value)) return true;
                return value.Length <= MaxSlugLength && SlugPattern().IsMatch(value);
            })
            .WithMessage($"{{PropertyName}} must be lowercase letters, numbers, and hyphens only, up to {MaxSlugLength} characters");
}
