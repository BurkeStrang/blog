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
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace BlogApi.Features.Comments;

public sealed record UpdateCommentCommand(
    string CommentId,
    string? PostIdHint,
    string? Content,
    string Username);

internal sealed class UpdateCommentCommandValidator : AbstractValidator<UpdateCommentCommand>
{
    public UpdateCommentCommandValidator()
    {
        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("content is required")
            .MaximumLength(CreateCommentCommandValidator.MaxCommentLength)
                .WithMessage($"content must be {CreateCommentCommandValidator.MaxCommentLength} characters or less");
    }
}

internal sealed class UpdateCommentHandler(
    BlogDbContext db,
    HybridCache cache,
    IValidator<UpdateCommentCommand> validator)
{
    public async Task<ErrorOr<CommentDto>> Handle(UpdateCommentCommand cmd, CancellationToken ct)
    {
        var existing = await CommentLookup.FindAsync(db, cmd.CommentId, cmd.PostIdHint, ct);
        if (existing is null) return Error.NotFound("comment.not_found", "comment not found");
        if (!IdNormalization.IsAuthor(existing.Author, cmd.Username))
            return Error.Forbidden("comment.forbidden", "forbidden");

        var sanitized = cmd with { Content = HtmlSanitizer.Sanitize(cmd.Content) };
        var validation = await validator.ValidateAsync(sanitized, ct);
        if (!validation.IsValid) return validation.ToErrorOrErrors();

        existing.Content = sanitized.Content!;
        existing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await cache.RemoveByTagAsync(CacheTags.CommentsForPost(existing.PostId), ct);

        return existing.ToDto();
    }
}

public static class UpdateCommentEndpoint
{
    public sealed record Body(string? Content);

    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapPut("/api/comments/{commentId}", async (
            string commentId,
            string? postId,
            Body body,
            HttpContext ctx,
            UpdateCommentHandler handler,
            CancellationToken ct) =>
        {
            var username = ctx.User.Username() ?? "";
            var result = await handler.Handle(
                new UpdateCommentCommand(commentId, postId, body.Content, username), ct);
            return result.Match(
                comment => Results.Ok(comment.ToLegacyResponse()),
                errors => errors.ToProblem());
        })
        .RequireAuthorization();
}

internal static class CommentLookup
{
    public static async Task<Comment?> FindAsync(
        BlogDbContext db, string commentId, string? postIdHint, CancellationToken ct)
    {
        var normalizedComment = IdNormalization.NormalizeCommentId(commentId);
        if (!string.IsNullOrEmpty(postIdHint))
        {
            var postId = IdNormalization.NormalizePostId(postIdHint);
            return await db.Comments
                .FirstOrDefaultAsync(c => c.PostId == postId && c.Id == normalizedComment, ct);
        }
        return await db.Comments
            .FirstOrDefaultAsync(c => c.Id == normalizedComment, ct);
    }
}
