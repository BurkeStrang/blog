using BlogApi.Common.Errors;
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

public sealed record ReplyToCommentCommand(
    string ParentCommentId,
    string? PostIdHint,
    string? Content,
    string Author);

internal sealed class ReplyToCommentCommandValidator : AbstractValidator<ReplyToCommentCommand>
{
    public ReplyToCommentCommandValidator()
    {
        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("content is required")
            .MaximumLength(CreateCommentCommandValidator.MaxCommentLength)
                .WithMessage($"content must be {CreateCommentCommandValidator.MaxCommentLength} characters or less");
    }
}

internal sealed class ReplyToCommentHandler(
    BlogDbContext db,
    HybridCache cache,
    IValidator<ReplyToCommentCommand> validator)
{
    public async Task<ErrorOr<CommentDto>> Handle(
        ReplyToCommentCommand cmd, CancellationToken ct)
    {
        var parent = await CommentLookup.FindAsync(db, cmd.ParentCommentId, cmd.PostIdHint, ct);
        if (parent is null)
            return Error.NotFound("comment.not_found", "parent comment not found");

        var sanitized = cmd with { Content = HtmlSanitizer.Sanitize(cmd.Content) };
        var validation = await validator.ValidateAsync(sanitized, ct);
        if (!validation.IsValid) return validation.ToErrorOrErrors();

        var now = DateTime.UtcNow;
        var reply = new Comment
        {
            Id = $"comment-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            Type = "comment",
            PostId = parent.PostId,
            Content = sanitized.Content!,
            Author = sanitized.Author,
            CreatedAt = now,
            UpdatedAt = now,
            ParentId = parent.Id,
        };
        db.Comments.Add(reply);
        await db.SaveChangesAsync(ct);

        await PostCommentCountAdjuster.AdjustAsync(db, cache, parent.PostId, +1, ct);
        await cache.RemoveByTagAsync(CacheTags.CommentsForPost(parent.PostId), ct);

        return reply.ToDto();
    }
}

public static class ReplyToCommentEndpoint
{
    public sealed record Body(string? Content);

    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapPost("/api/comments/{commentId}/reply", async (
            string commentId,
            string? postId,
            Body body,
            HttpContext ctx,
            ReplyToCommentHandler handler,
            CancellationToken ct) =>
        {
            var author = ctx.User.AuthorDisplay() ?? "";
            var result = await handler.Handle(
                new ReplyToCommentCommand(commentId, postId, body.Content, author), ct);
            return result.Match(
                reply => Results.Created($"/api/comments/{reply.Id}", reply.ToLegacyResponse()),
                errors => errors.ToProblem());
        })
        .RequireAuthorization();
}
