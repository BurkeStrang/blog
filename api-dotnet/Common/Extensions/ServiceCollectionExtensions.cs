using FluentValidation;

namespace BlogApi.Common.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddFeatureHandlers(this IServiceCollection services)
    {
        var assembly = typeof(Program).Assembly;

        // Register every *Handler class under Features/ as a scoped concrete-type
        // service. Done by hand rather than via Scrutor's AddClasses because the
        // handlers are `internal sealed` and the predicate-style scan was silently
        // matching nothing on this stack.
        var handlerTypes = assembly.GetTypes().Where(t =>
            t.IsClass
            && !t.IsAbstract
            && t.Name.EndsWith("Handler", StringComparison.Ordinal)
            && t.Namespace is not null
            && t.Namespace.StartsWith("BlogApi.Features.", StringComparison.Ordinal));
        foreach (var t in handlerTypes)
        {
            services.AddScoped(t);
        }

        // includeInternalTypes:true is required because every *Validator in
        // Features/ is `internal sealed` — FluentValidation 12's scan skips
        // non-public types by default.
        services.AddValidatorsFromAssembly(assembly, includeInternalTypes: true);

        return services;
    }
}
