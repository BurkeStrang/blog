using System.Diagnostics;

namespace BlogApi.Infrastructure.Middleware;

public sealed class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var start = Stopwatch.GetTimestamp();
        try
        {
            await _next(context);
        }
        finally
        {
            var elapsed = Stopwatch.GetElapsedTime(start);
            _logger.LogInformation(
                "{Method} {Path} -> {Status} in {ElapsedMs:F1}ms",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                elapsed.TotalMilliseconds);
        }
    }
}
