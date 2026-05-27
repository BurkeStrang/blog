using BlogApi.Common.Errors;
using BlogApi.Common.Validation;
using BlogApi.Features.Posts.Contracts;
using BlogApi.Infrastructure.Caching;
using BlogApi.Infrastructure.Persistence;
using ErrorOr;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Posts;

public sealed record UpdatePostCommand(
    string IdOrSlug,
    string? Slug,
    string? Title,
    string? Body,
    string? Previous,
    string? Next,
    DateTime? CreatedAt);

internal sealed class UpdatePostCommandValidator : AbstractValidator<UpdatePostCommand>
{
    public UpdatePostCommandValidator()
    {
        When(x => x.Slug is not null, () =>
        {
            RuleFor(x => x.Slug).IsSlug();
        });
        When(x => x.Title is not null, () =>
        {
            RuleFor(x => x.Title)
                .NotEmpty().WithMessage("{PropertyName} is required")
                .MaximumLength(CreatePostCommandValidator.MaxTitleLength)
                    .WithMessage($"{{PropertyName}} must be {CreatePostCommandValidator.MaxTitleLength} characters or less");
        });
        When(x => x.Body is not null, () =>
        {
            RuleFor(x => x.Body)
                .NotEmpty().WithMessage("{PropertyName} is required")
                .MaximumLength(CreatePostCommandValidator.MaxBodyLength)
                    .WithMessage($"{{PropertyName}} must be {CreatePostCommandValidator.MaxBodyLength} characters or less");
        });
        RuleFor(x => x.Previous).IsOptionalSlug();
        RuleFor(x => x.Next).IsOptionalSlug();
    }
}

internal sealed class UpdatePostHandler(
    BlogDbContext db,
    HybridCache cache,
    IValidator<UpdatePostCommand> validator)
{
    public async Task<ErrorOr<PostDto>> Handle(UpdatePostCommand cmd, CancellationToken ct)
    {
        var altId = $"post-{cmd.IdOrSlug}";
        var existing = await db.Posts.FirstOrDefaultAsync(
            p => p.Slug == cmd.IdOrSlug || p.Id == cmd.IdOrSlug || p.Id == altId, ct);
        if (existing is null)
        {
            return Error.NotFound("post.not_found", "post not found");
        }

        var sanitized = cmd with
        {
            Slug = HtmlSanitizer.Sanitize(cmd.Slug),
            Title = HtmlSanitizer.Sanitize(cmd.Title),
            Body = HtmlSanitizer.Sanitize(cmd.Body),
            Previous = HtmlSanitizer.Sanitize(cmd.Previous),
            Next = HtmlSanitizer.Sanitize(cmd.Next),
        };

        var validation = await validator.ValidateAsync(sanitized, ct);
        if (!validation.IsValid) return validation.ToErrorOrErrors();

        if (!string.IsNullOrEmpty(sanitized.Title)) existing.Title = sanitized.Title;
        if (!string.IsNullOrEmpty(sanitized.Body)) existing.Body = sanitized.Body;
        if (!string.IsNullOrEmpty(sanitized.Slug)) existing.Slug = sanitized.Slug;
        if (sanitized.CreatedAt.HasValue) existing.CreatedAt = sanitized.CreatedAt.Value;
        existing.Previous = sanitized.Previous;
        existing.Next = sanitized.Next;
        existing.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        await cache.RemoveByTagAsync(CacheTags.Posts, ct);

        return existing.ToDto();
    }
}

public static class UpdatePostEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapPut("/api/posts/{idOrSlug}", async (
            string idOrSlug,
            UpdatePostRequestBody body,
            UpdatePostHandler handler,
            CancellationToken ct) =>
        {
            var cmd = new UpdatePostCommand(
                IdOrSlug: idOrSlug,
                Slug: body.Slug,
                Title: body.Title,
                Body: body.Body,
                Previous: body.Previous,
                Next: body.Next,
                CreatedAt: body.CreatedAt);
            var result = await handler.Handle(cmd, ct);
            return result.Match(
                post => Results.Ok(post),
                errors => errors.ToProblem());
        })
        .RequireAuthorization("Admin");
}

public sealed record UpdatePostRequestBody(
    string? Slug,
    string? Title,
    string? Body,
    string? Previous,
    string? Next,
    DateTime? CreatedAt);
