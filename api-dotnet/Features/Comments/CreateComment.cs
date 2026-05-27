using System.Text.Json.Serialization;
using BlogApi.Common.Errors;
using BlogApi.Common.Json;
using BlogApi.Common.Validation;
using BlogApi.Domain.Entities;
using BlogApi.Features.Comments.Contracts;
using BlogApi.Features.Comments.Internal;
using BlogApi.Infrastructure.Auth;
using BlogApi.Infrastructure.Caching;
using BlogApi.Infrastructure.Persistence;
using ErrorOr;
using FluentValidation;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Comments;

public sealed record CreateCommentCommand(
    string PostId,
    string? Content,
    string Author);

internal sealed class CreateCommentCommandValidator : AbstractValidator<CreateCommentCommand>
{
    public const int MaxCommentLength = 10_000;

    public CreateCommentCommandValidator()
    {
        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("content is required")
            .MaximumLength(MaxCommentLength)
                .WithMessage($"content must be {MaxCommentLength} characters or less");
    }
}

internal sealed class CreateCommentHandler(
    BlogDbContext db,
    HybridCache cache,
    IValidator<CreateCommentCommand> validator)
{
    public async Task<ErrorOr<CommentDto>> Handle(
        CreateCommentCommand cmd, CancellationToken ct)
    {
        var sanitized = cmd with { Content = HtmlSanitizer.Sanitize(cmd.Content) };
        var validation = await validator.ValidateAsync(sanitized, ct);
        if (!validation.IsValid) return validation.ToErrorOrErrors();

        var postId = IdNormalization.NormalizePostId(sanitized.PostId);
        var now = DateTime.UtcNow;
        var comment = new Comment
        {
            Id = $"comment-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            Type = "comment",
            PostId = postId,
            Content = sanitized.Content!,
            Author = sanitized.Author,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Comments.Add(comment);
        await db.SaveChangesAsync(ct);

        await PostCommentCountAdjuster.AdjustAsync(db, cache, postId, +1, ct);
        await cache.RemoveByTagAsync(CacheTags.CommentsForPost(postId), ct);

        return comment.ToDto();
    }
}

public static class CreateCommentEndpoint
{
    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapPost("/api/comments", async (
            CreateCommentRequestBody body,
            HttpContext ctx,
            CreateCommentHandler handler,
            CancellationToken ct) =>
        {
            var postId = body.ResolvePostId();
            if (string.IsNullOrEmpty(postId))
            {
                return Results.BadRequest(new { error = "post_id is required" });
            }
            var author = ctx.User.AuthorDisplay() ?? "";
            var result = await handler.Handle(
                new CreateCommentCommand(postId, body.Content, author), ct);
            return result.Match(
                comment => Results.Created($"/api/comments/{comment.Id}", comment.ToLegacyResponse()),
                errors => errors.ToProblem());
        })
        .RequireAuthorization();
}

public sealed class CreateCommentRequestBody
{
    [JsonPropertyName("post_id")]
    [JsonConverter(typeof(FlexibleStringOrNumberConverter))]
    public string? PostIdLegacy { get; init; }

    [JsonPropertyName("postId")]
    [JsonConverter(typeof(FlexibleStringOrNumberConverter))]
    public string? PostId { get; init; }

    [JsonPropertyName("content")]
    public string? Content { get; init; }

    public string? ResolvePostId() => PostId ?? PostIdLegacy;
}
