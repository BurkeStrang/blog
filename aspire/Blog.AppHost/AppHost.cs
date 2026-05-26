var builder = DistributedApplication.CreateBuilder(args);

// Pin the API's http endpoint explicitly. BlogApi's launchSettings has no
// applicationUrl, so without this Aspire doesn't know to expose an endpoint
// named "http" — and any `api.GetEndpoint("http")` reference silently
// fails to resolve, which breaks downstream env injection.
var api = builder.AddProject<Projects.BlogApi>("api")
    .WithHttpEndpoint(targetPort: 8080, name: "http", isProxied: false)
    .WithExternalHttpEndpoints();

// Forward the Aspire dashboard's OTLP/HTTP endpoint to the browser so the UI
// can post traces directly. Aspire injects this into .NET resources via
// OTEL_EXPORTER_OTLP_ENDPOINT; we re-read the same config slot.
// In Aspire 13 the dashboard's HTTP OTLP receiver URL is exposed as
// ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL (set in launchSettings.json).
// The gRPC sibling (ASPIRE_DASHBOARD_OTLP_ENDPOINT_URL) is unusable from a
// browser, so we must explicitly route the UI to the HTTP one.
var otlpEndpoint = builder.Configuration["ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL"]
    ?? builder.Configuration["DOTNET_DASHBOARD_OTLP_HTTP_ENDPOINT_URL"]
    ?? "http://localhost:21141";

var uiDir = Path.GetFullPath(Path.Combine(builder.AppHostDirectory, "..", "..", "ui"));
var uiLauncher = Path.Combine(builder.AppHostDirectory, "start-ui.sh");

builder.AddExecutable("ui", "/bin/bash", uiDir, uiLauncher, "dev", "--strictPort", "--port", "3000")
    .WithHttpEndpoint(targetPort: 3000, isProxied: false)
    .WithReference(api)
    .WaitFor(api)
    .WithEnvironment("HOME", Environment.GetEnvironmentVariable("HOME") ?? "")
    .WithEnvironment("VITE_API_URL", api.GetEndpoint("http"))
    .WithEnvironment("VITE_OTEL_EXPORTER_OTLP_ENDPOINT", otlpEndpoint)
    .WithExternalHttpEndpoints();

builder.Build().Run();
