using BlogApi.Common.Errors;
using BlogApi.Features.UserPreferences.Contracts;
using BlogApi.Infrastructure.Auth;
using BlogApi.Infrastructure.Persistence;
using ErrorOr;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using UserPreferencesEntity = BlogApi.Domain.Entities.UserPreferences;

namespace BlogApi.Features.UserPreferences;

public sealed record UpdateUserPreferencesCommand(string Username, string? Theme);

internal sealed class UpdateUserPreferencesCommandValidator : AbstractValidator<UpdateUserPreferencesCommand>
{
    private static readonly HashSet<string> AllowedThemes = new(StringComparer.Ordinal) { "dark", "light" };

    public UpdateUserPreferencesCommandValidator()
    {
        RuleFor(x => x.Theme)
            .Must(t => t is not null && AllowedThemes.Contains(t))
                .WithMessage("theme must be 'dark' or 'light'");
    }
}

internal sealed class UpdateUserPreferencesHandler(
    BlogDbContext db,
    IValidator<UpdateUserPreferencesCommand> validator)
{
    public async Task<ErrorOr<UserPreferencesDto>> Handle(
        UpdateUserPreferencesCommand cmd, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(cmd, ct);
        if (!validation.IsValid) return validation.ToErrorOrErrors();

        var existing = await db.UserPreferences
            .FirstOrDefaultAsync(p => p.Username == cmd.Username, ct);

        var now = DateTime.UtcNow;
        if (existing is null)
        {
            db.UserPreferences.Add(new UserPreferencesEntity
            {
                Id = $"prefs-{cmd.Username}",
                Type = "user_preferences",
                Username = cmd.Username,
                Theme = cmd.Theme!,
                UpdatedAt = now,
            });
        }
        else
        {
            existing.Theme = cmd.Theme!;
            existing.UpdatedAt = now;
        }

        await db.SaveChangesAsync(ct);
        return new UserPreferencesDto(cmd.Theme!);
    }
}

public static class UpdateUserPreferencesEndpoint
{
    public sealed record Body(string? Theme);

    public static RouteHandlerBuilder Map(IEndpointRouteBuilder app) => app
        .MapPut("/api/users/preferences", async (
            Body body,
            HttpContext ctx,
            UpdateUserPreferencesHandler handler,
            CancellationToken ct) =>
        {
            var username = ctx.User.Username();
            if (string.IsNullOrEmpty(username))
            {
                return Results.Unauthorized();
            }
            var result = await handler.Handle(
                new UpdateUserPreferencesCommand(username, body.Theme), ct);
            return result.Match(
                prefs => Results.Ok(prefs),
                errors => errors.ToProblem());
        })
        .RequireAuthorization();
}
