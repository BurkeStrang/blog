using System.Text.Json.Serialization;
using BlogApi.Common.Errors;
using BlogApi.Common.Validation;
using BlogApi.Domain.Entities;
using BlogApi.Features.Posts.Contracts;
using BlogApi.Infrastructure.Auth;
using BlogApi.Infrastructure.Caching;
using BlogApi.Infrastructure.Persistence;
using ErrorOr;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Posts;

public sealed record CreatePostCommand(
    string? Slug,
    string? Title,
    string? Body,
    string? Previous,
    string? Next,
    DateTime? CreatedAt,
    string Author);

internal sealed class CreatePostCommandValidator : AbstractValidator<CreatePostCommand>
{
    public const int MaxTitleLength = 200;
    public const int MaxBodyLength = 1_000_000;

    public CreatePostCommandValidator()
    {
        RuleFor(x => x.Slug).IsSlug();
        RuleFor(x => x.Previous).IsOptionalSlug();
        RuleFor(x => x.Next).IsOptionalSlug();
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("{PropertyName} is required")
            .MaximumLength(MaxTitleLength)
                .WithMessage($"{{PropertyName}} must be {MaxTitleLength} characters or less");
        RuleFor(x => x.Body)
            .NotEmpty().WithMessage("{PropertyName} is required")
            .MaximumLength(MaxBodyLength)
                .WithMessage($"{{PropertyName}} must be {MaxBodyLength} characters or less");
    }
}

internal sealed class CreatePostHandler(
    BlogDbContext db,
    HybridCache cache,
    IValidator<CreatePostCommand> validator)
{
    public async Task<ErrorOr<PostDto>> Handle(CreatePostCommand cmd, CancellationToken ct)
    {
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

        // Deliberately a projected FirstOrDefault rather than AnyAsync: the EF
        // Core Cosmos provider translates Any() into an EXISTS subquery whose
        // inner FROM still says `root`, which Cosmos rejects with
        // "Identifier 'root' could not be resolved" (SC2001) — a 500 on every
        // create. A filtered projection translates to a plain SELECT.
        var slugTaken = await db.Posts
            .AsNoTracking()
            .Where(p => p.Slug == sanitized.Slug!)
            .Select(p => p.Id)
            .FirstOrDefaultAsync(ct);
        if (slugTaken is not null)
        {
            return Error.Conflict("post.slug_conflict", "slug already exists");
        }

        var now = DateTime.UtcNow;
        var created = sanitized.CreatedAt ?? now;
        var post = new Post
        {
            Id = $"post-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            Type = "post",
            Slug = sanitized.Slug!,
            Title = sanitized.Title!,
            Body = sanitized.Body!,
            Author = sanitized.Author,
            Previous = sanitized.Previous,
            Next = sanitized.Next,
            CreatedAt = created,
            UpdatedAt = created,
        };

        db.Posts.Add(post);
        await db.SaveChangesAsync(ct);
        await cache.RemoveByTagAsync(CacheTags.Posts, ct);

        return post.ToDto();
    }
}

public static class CreatePostEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapPost("/api/posts", async (
            CreatePostRequestBody body,
            HttpContext ctx,
            CreatePostHandler handler,
            CancellationToken ct) =>
        {
            var cmd = new CreatePostCommand(
                Slug: body.Slug,
                Title: body.Title,
                Body: body.Body,
                Previous: body.Previous,
                Next: body.Next,
                CreatedAt: body.CreatedAt,
                Author: ctx.User.Username() ?? "");
            var result = await handler.Handle(cmd, ct);
            return result.Match(
                post => Results.Created($"/api/posts/{post.Slug}", post),
                errors => errors.ToProblem());
        })
        .RequireAuthorization("Admin");
}

public sealed record CreatePostRequestBody(
    string? Slug,
    string? Title,
    string? Body,
    string? Previous,
    string? Next,
    // See PostDto: the UI posts this as `date`.
    [property: JsonPropertyName("date")] DateTime? CreatedAt);
