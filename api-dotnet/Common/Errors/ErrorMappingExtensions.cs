using ErrorOr;
using FluentValidation.Results;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BlogApi.Common.Errors;

public static class ErrorMappingExtensions
{
    public static List<Error> ToErrorOrErrors(this ValidationResult result) =>
        result.Errors
            .Select(f => Error.Validation(f.PropertyName, f.ErrorMessage))
            .ToList();

    public static IResult ToProblem(this Error error) =>
        ToProblem(new List<Error> { error });

    public static IResult ToProblem(this List<Error> errors)
    {
        if (errors.Count == 0)
        {
            return Results.Problem(statusCode: StatusCodes.Status500InternalServerError);
        }

        if (errors.All(e => e.Type == ErrorType.Validation))
        {
            var grouped = errors
                .GroupBy(e => e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());
            return Results.ValidationProblem(grouped);
        }

        var first = errors[0];
        var status = first.Type switch
        {
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            ErrorType.Conflict => StatusCodes.Status409Conflict,
            ErrorType.Forbidden => StatusCodes.Status403Forbidden,
            ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
            ErrorType.Validation => StatusCodes.Status400BadRequest,
            _ => StatusCodes.Status500InternalServerError,
        };

        // Preserve the {error, details} shape the Go API + current minimal-API
        // endpoints emit, so the frontend's error parsing doesn't break.
        return Results.Json(
            new
            {
                error = first.Description,
                code = first.Code,
                details = errors.Count > 1
                    ? errors.Skip(1).Select(e => new { code = e.Code, message = e.Description }).ToArray()
                    : null,
            },
            statusCode: status);
    }
}
