using BlogApi.Auth;
using BlogApi.Configuration;
using BlogApi.Data;
using BlogApi.Data.Repositories;
using BlogApi.Endpoints;
using BlogApi.Middleware;
using BlogApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

if (string.IsNullOrEmpty(builder.Configuration["ASPNETCORE_URLS"])
    && string.IsNullOrEmpty(builder.Configuration["urls"]))
{
  builder.WebHost.UseUrls("http://+:8080");
}

// ── options ───────────────────────────────────────────────────────────────
builder.Services.Configure<CosmosOptions>(opts =>
{
  opts.Endpoint = builder.Configuration["COSMOS_DB_ENDPOINT"] ?? "";
  opts.Key = builder.Configuration["COSMOS_DB_KEY"] ?? "";
  opts.DatabaseName = builder.Configuration["COSMOS_DB_DATABASE_NAME"] ?? "blog";
});

builder.Services.Configure<GoogleOAuthOptions>(opts =>
{
  opts.ClientId = builder.Configuration["GOOGLE_CLIENT_ID"] ?? "";
  opts.ClientSecret = builder.Configuration["GOOGLE_CLIENT_SECRET"] ?? "";
  opts.RedirectUrl = builder.Configuration["GOOGLE_REDIRECT_URL"]
      ?? "http://localhost:8080/auth/google/callback";
});

builder.Services.Configure<JwtOptions>(opts =>
{
  opts.Secret = builder.Configuration["JWT_SECRET"] ?? "";
});

builder.Services.Configure<AdminOptions>(opts =>
{
  var raw = builder.Configuration["ADMIN_EMAILS"];
  // Default mirrors handlers/auth.go so day-one behavior is identical.
  var fallback = new[] { "bstrangwork@gmail.com", "burke.strang@gmail.com" };
  opts.GetType().GetProperty(nameof(AdminOptions.Emails))!.SetValue(
      opts,
      string.IsNullOrWhiteSpace(raw)
          ? fallback
          : raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
});

// ── data ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<BlogDbContext>((sp, options) =>
{
  var cosmos = sp.GetRequiredService<IOptions<CosmosOptions>>().Value;
  if (string.IsNullOrWhiteSpace(cosmos.Endpoint) || string.IsNullOrWhiteSpace(cosmos.Key))
  {
    throw new InvalidOperationException(
        "Cosmos DB is not configured. Set COSMOS_DB_ENDPOINT and COSMOS_DB_KEY.");
  }
  options.UseCosmos(cosmos.Endpoint, cosmos.Key, cosmos.DatabaseName);
});

builder.Services.AddScoped<IPostRepository, PostRepository>();
builder.Services.AddScoped<ICommentRepository, CommentRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserPreferencesRepository, UserPreferencesRepository>();

// ── caching ───────────────────────────────────────────────────────────────
builder.Services.AddHybridCache();

// ── services ──────────────────────────────────────────────────────────────
builder.Services.AddScoped<PostQueryService>();
builder.Services.AddScoped<CommentQueryService>();
builder.Services.AddScoped<PostCommandService>();
builder.Services.AddScoped<CommentCommandService>();
builder.Services.AddScoped<UserPreferencesService>();
builder.Services.AddHostedService<CacheWarmer>();

// ── auth ──────────────────────────────────────────────────────────────────
builder.Services.AddSingleton<JwtService>();
builder.Services.AddSingleton<OAuthStateStore>();
builder.Services.AddSingleton<GoogleAuthService>();
builder.Services.AddHttpClient();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
      // Match the Go API's HS256/2h JWT with simple `username` and `role`
      // claims. Setting MapInboundClaims=false keeps the claim names as
      // emitted (no Microsoft schema URI prefixes).
      options.MapInboundClaims = false;
      options.TokenValidationParameters = new JwtService(
          Options.Create(new JwtOptions { Secret = builder.Configuration["JWT_SECRET"] ?? "" }))
          .CreateValidationParameters();
    });

builder.Services.AddAuthorization(options =>
{
  options.AddPolicy("Admin", policy => policy
      .RequireAuthenticatedUser()
      .RequireClaim(UserClaimsAccessor.RoleClaim, "admin"));
});

// ── cors ──────────────────────────────────────────────────────────────────
var allowedOrigins = new List<string>
{
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
};
var frontendUrl = builder.Configuration["FRONTEND_URL"];
if (!string.IsNullOrWhiteSpace(frontendUrl))
{
  allowedOrigins.Add(frontendUrl);
}

builder.Services.AddCors(opts =>
{
  opts.AddDefaultPolicy(policy => policy
      .WithOrigins([..allowedOrigins])
      .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
      .WithHeaders("Origin", "Content-Type", "Accept", "Authorization", "traceparent", "tracestate", "baggage", "Request-Id", "Request-Context")
      .WithExposedHeaders("Content-Length", "Request-Context")
      .AllowCredentials());
});

var app = builder.Build();

app.UseMiddleware<RequestLoggingMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapDefaultEndpoints();
app.MapPostEndpoints();
app.MapCommentEndpoints();
app.MapUserPreferencesEndpoints();
app.MapAuthEndpoints();
app.MapAdminEndpoints();

app.Run();
