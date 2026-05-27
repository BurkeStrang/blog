# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Full-stack blog application with an **ASP.NET Core API** and **React/Vite frontend** featuring 3D Three.js visualization, orchestrated locally by **.NET Aspire**:

- **API** (`/api-dotnet/`): ASP.NET Core (.NET 10) minimal APIs over EF Core Cosmos provider, HybridCache, JWT + Google OAuth2.
- **UI** (`/ui/`): React 19 frontend with Vite 6, Three.js / React Three Fiber, Material-UI, TypeScript.
- **Aspire** (`/aspire/`): `Blog.AppHost` orchestrates API + UI for local dev; `Blog.ServiceDefaults` is a shared library the API references for OpenTelemetry + health probes.

### Key Technologies
- **Backend**: .NET 10, ASP.NET Core minimal APIs in **vertical slice** layout, EF Core 10 (Cosmos), HybridCache, JwtBearer, OpenTelemetry, Azure Monitor (App Insights) exporter. FluentValidation + ErrorOr for command/query validation and result types.
- **Frontend**: React 19, Vite 6, Three.js, @react-three/fiber, Material-UI, TypeScript. OpenTelemetry web SDK (local) / Application Insights JS SDK (prod) initialised from `main.tsx`.
- **3D Engine**: Custom optimization engine with memory management, LOD system, texture compression.
- **Hosting**: Azure Container Apps (API) + Azure Static Web Apps (UI) + Application Insights, all provisioned via `terraform/`.

## Development Commands

### Frontend (UI)
```bash
cd ui

pnpm dev                    # Vite dev server on :3000
pnpm build                  # Production build with type-check and lint
pnpm build:fast             # Quick build without checks
pnpm preview                # Preview production build

pnpm type-check             # TypeScript type checking
pnpm lint                   # ESLint check
pnpm lint:check             # ESLint with zero warnings (build requirement)
pnpm lint:fix               # Auto-fix ESLint issues

pnpm optimize:gltf          # Compress GLTF models with Draco
```

### Backend (API)
```bash
cd api-dotnet

dotnet run                  # Start API standalone on :8080
dotnet build                # Compile
```

### Orchestration (Aspire)
```bash
# Run API + UI together with the Aspire dashboard.
dotnet run --project aspire/Blog.AppHost
# Dashboard URL is printed to stdout; in this repo's launchSettings it's
# https://localhost:17261. Browser-side telemetry from the UI lands at the
# dashboard's OTLP/HTTP endpoint on http://localhost:21141.
```

`AppHost.cs` registers the API as a project resource and the Vite dev server via `AddExecutable("/bin/bash", uiDir, start-ui.sh, ...)` — the wrapper script sources nvm + pnpm onto PATH because DCP doesn't propagate the user shell's PATH. AppHost forwards the API endpoint to the UI as `VITE_API_URL` and the dashboard's OTLP/HTTP endpoint as `VITE_OTEL_EXPORTER_OTLP_ENDPOINT`. Both API spans and browser spans land in the same dashboard, sharing trace ids via W3C `traceparent`.

`Blog.ServiceDefaults` is referenced by the API and called as `builder.AddServiceDefaults()` in `Program.cs`. It configures OpenTelemetry traces/metrics/logs with both an OTLP exporter (Aspire dashboard locally) and `UseAzureMonitor()` (active when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set in prod).

Browser-side telemetry lives in `ui/src/shared/observability/telemetry.ts` and is initialised once from `ui/src/app/main.tsx`. It branches on env vars:
- `VITE_APPLICATIONINSIGHTS_CONNECTION_STRING` set → Application Insights JS SDK (prod).
- otherwise `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` set → OTel web SDK posting traces/metrics/logs to that endpoint (Aspire local dev).
- neither set → no-op (e.g. `pnpm dev` invoked outside Aspire).

### Infrastructure (Terraform)
```bash
cd terraform
terraform init
terraform plan
terraform apply
terraform output
terraform output -raw cosmosdb_primary_key                # Cosmos DB key
terraform output -raw appinsights_connection_string       # App Insights conn. string
```

## Project Structure

### Backend (`/api-dotnet/`)

Organised as **vertical slices** (inspired by [nadirbad/VerticalSliceArchitecture](https://github.com/nadirbad/VerticalSliceArchitecture)). Each feature lives in one file under `Features/<Aggregate>/`, containing the command/query record, its FluentValidation validator, a single-purpose handler class, and the minimal-API endpoint that wires it in. Handlers inject `BlogDbContext` directly — there is no repository layer.

- `Program.cs` — composition root: options, EF Core Cosmos, HybridCache, auth, CORS, middleware, endpoint mapping. Calls `builder.AddServiceDefaults()` from `Blog.ServiceDefaults`, then `builder.Services.AddFeatureHandlers()` (reflection-scans the assembly for `*Handler` classes under `BlogApi.Features.*` and registers every `IValidator<T>` via FluentValidation's DI helper).
- `Features/Posts/` — `ListPosts`, `GetPost`, `TrackPostView`, `CreatePost`, `UpdatePost`, `DeletePost`, `RecountCommentCounts`. `Contracts/` holds `PostDto`, `PostListResponse`, `PostMappings`; `Internal/PostListQuery` holds shared list-query parsing.
- `Features/Comments/` — `ListComments`, `GetCommentLikes`, `CreateComment`, `UpdateComment`, `DeleteComment`, `LikeComment`, `UnlikeComment`, `ReplyToComment`. `Contracts/` keeps the snake-case wire shapes (`LegacyCommentResponse`, `CommentLikesResponse`); `Internal/` has `IdNormalization` (post-/comment- prefixing + author matching) and `PostCommentCountAdjuster`.
- `Features/UserPreferences/`, `Features/Auth/`, `Features/AdminCache/` — small slices for the corresponding endpoint surface. Each feature folder has its own `XxxEndpoints.cs` aggregator that the composition root maps in one call.
- `Domain/Entities/` — Cosmos document classes (`Post`, `Comment`, `CommentLike`, `User`, `UserPreferences`) and shared container base types.
- `Infrastructure/Persistence/BlogDbContext.cs` — EF Core context with `HasDiscriminator` + per-property camelCase JSON mapping that round-trips existing Cosmos documents.
- `Infrastructure/Auth/`, `Infrastructure/Middleware/`, `Infrastructure/Configuration/`, `Infrastructure/Caching/` — JWT/Google OAuth services, request-logging + security-headers middleware, strongly-typed options, `CacheTags` + `CacheWarmer` (the warmer resolves slice handlers through a created scope rather than touching `BlogDbContext` directly for the warm paths).
- `Common/Errors/ErrorMappingExtensions.cs` — turns `ErrorOr<T>` errors into `IResult` (validation → `Results.ValidationProblem`, `NotFound`/`Conflict`/`Forbidden`/`Unauthorized` → matching status with `{error, code, details}` body).
- `Common/Validation/HtmlSanitizer.cs` — script-tag/on-event/javascript-URL blacklist used by every command that accepts user-authored markup.
- `Common/Validation/SlugValidatorExtensions.cs` — `IsSlug()` / `IsOptionalSlug()` rule-builder extensions.
- `Common/Json/FlexibleStringOrNumberConverter.cs` — accepts either a JSON string or number for `post_id` on `POST /api/comments` (the wire shape the UI has historically sent).
- `Common/Extensions/ServiceCollectionExtensions.cs` — `AddFeatureHandlers()` (reflection-based handler scan + FluentValidation registration).
- `Dockerfile` — build context is the **repo root** so the ServiceDefaults project ref resolves; `Dockerfile.dockerignore` scopes ignore patterns.

Adding a new endpoint = create one file under the right `Features/` folder containing all four pieces, then add the `Endpoint.Map(app)` call to that feature's `XxxEndpoints.cs`. Handlers and validators are auto-registered.

### Aspire (`/aspire/`)
- `Blog.AppHost/AppHost.cs` — orchestrator; project ref to BlogApi, `AddExecutable` for Vite.
- `Blog.AppHost/start-ui.sh` — wrapper that sources nvm so node + pnpm resolve under DCP-spawned children.
- `Blog.AppHost/Properties/launchSettings.json` — dashboard URL, OTLP HTTP endpoint port, `DOTNET_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true` for unauthenticated local OTLP ingest.
- `Blog.ServiceDefaults/Extensions.cs` — `AddServiceDefaults()` + `MapDefaultEndpoints()` (exposes `/health` and `/alive`).

### Frontend (`/ui/`)
- `src/app/` — main app shell, routing, entry (`main.tsx` calls `initTelemetry()` then mounts React).
- `src/features/` — feature modules (posts, comments, auth, ocean scene).
- `src/engine/` — custom 3D optimization engine with memory management.
- `src/shared/` — shared components, hooks, services, contexts, observability.
- `src/models/` — 3D model components (RubiksCube, Sphere).

### Key Engine Features
- **Memory Management**: automatic asset disposal, GC, resource pooling.
- **Rendering Optimization**: LOD, frustum culling, texture compression, WebGL tuning.
- **Asset Streaming**: lazy loading, progressive enhancement, basis texture support.

## Authentication & Security

- **Google OAuth2** integration; JWT tokens (HS256, 2h TTL, `username` + `role` claims).
- **Role-based access**: `Admin` policy gated on the `role` claim; admin emails configurable via `ADMIN_EMAILS` (defaults to `bstrangwork@gmail.com,burke.strang@gmail.com`).
- **Input validation + sanitization** via FluentValidation validators co-located inside each slice file plus `Common/Validation/HtmlSanitizer` for user-authored markup.
- **Security headers** middleware; CORS allows the SWA origin + dev ports.
- **Cache invalidation** endpoints exposed under `/admin/cache/*`.

## Database & Caching

- **Azure Cosmos DB** (NoSQL) for persistence — containers `posts` (PK `/type`), `comments` (PK `/postId`), `users` (PK `/username`).
- **Shared containers via discriminator**: EF Core inheritance powers `CommentContainerDocument` / `UserContainerDocument` so multiple entity types co-locate in the same container.
- **HybridCache 10.0** with tag-based invalidation; `CacheWarmer` `BackgroundService` re-primes posts every 10 minutes so the first user after a TTL window doesn't pay the full Cosmos query.
- **Cache management** endpoints for admins (`/admin/cache/*`). `HybridCache` doesn't expose hit/miss counters — `/admin/cache/stats` returns a static descriptor (tags + TTLs only).

## Performance Optimizations

- **React Compiler** enabled for automatic memoization (excludes `/engine/`, `/services/`, `/cache/`, `/shared/contexts/`, `/shared/observability/`, `MarkdownContent`).
- **Asset compression**: WebP textures, Draco GLTF compression, Brotli/Gzip.
- **Bundle splitting**: separate chunks for Three.js, React, UI vendors.
- **Memory constraints**: engine keeps usage under 400 MB through aggressive cleanup.
- **Lazy loading**: components and 3D assets load on demand.

## Build Process

`pnpm build` runs:
1. TypeScript type checking (`tsc --noEmit`)
2. ESLint with `--max-warnings 0`
3. `pnpm audit --prod`
4. Vite bundling with tree-shaking and minification
5. Custom GLTF texture copying and bin file management
6. Automatic Gzip and Brotli compression of static assets
7. Bundle analysis and chunk size warnings

The build fails on any TypeScript error or ESLint warning.

## Environment & Configuration

### Required Environment Variables (API)
```bash
# Cosmos DB
COSMOS_DB_ENDPOINT=https://<account>.documents.azure.com:443/
COSMOS_DB_KEY=your-primary-key            # az keyvault secret show, or terraform output -raw cosmosdb_primary_key
COSMOS_DB_DATABASE_NAME=blog

# OAuth (optional locally; required in prod)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URL=http://localhost:8080/auth/google/callback   # set to api.brxstrng.com URL in prod
JWT_SECRET=your-jwt-secret

# Optional
ADMIN_EMAILS=comma,separated,list         # overrides default admin list
FRONTEND_URL=https://brxstrng.com         # extra CORS allowed origin
APPLICATIONINSIGHTS_CONNECTION_STRING=... # turns on UseAzureMonitor() in ServiceDefaults
OTEL_EXPORTER_OTLP_ENDPOINT=...           # alt. OTLP target (Aspire injects this locally)
```

In production these are injected into the Container App from Key Vault via the user-assigned identity (see `terraform/containerapp.tf`).

### Required Environment Variables (UI, build-time)
```bash
VITE_API_URL                              # API origin
VITE_APPLICATIONINSIGHTS_CONNECTION_STRING # enables App Insights JS SDK in the built bundle
VITE_OTEL_EXPORTER_OTLP_ENDPOINT          # Aspire injects this for local dev only
```

### Development Ports
- API: `:8080` (Kestrel)
- UI: `:3000` (Vite dev and preview)
- Aspire dashboard: `:17261` (HTTPS), OTLP HTTP receiver `:21141`

## Deployment

Production runs on Azure:
- **UI**: Azure Static Web Apps (`swa-blog-ui-prod`), Free tier, custom domains `brxstrng.com` + `www.brxstrng.com`. SPA deep-route fallback in `ui/public/staticwebapp.config.json`.
- **API**: Azure Container Apps (`ca-blog-api-prod`) in environment `cae-blog-prod`, pulling images from ACR `acrblogbrxstngprod` via a user-assigned managed identity, with secrets resolved from Key Vault. Custom domain `api.brxstrng.com`, managed TLS.
- **Database**: Cosmos DB (`cosmos-blog-brxstng-prod`), free tier.
- **Telemetry**: Application Insights (`appi-blog-prod`), workspace-based on the existing Log Analytics workspace. Connection string in Key Vault, injected to the Container App env and into the UI bundle at build time.

### Deploy commands
```bash
./deploy.sh                 # build + push API image, roll Container App, build + deploy UI
./deploy.sh api             # API only
./deploy.sh ui              # UI only
```

`deploy.sh` reads ACR login server, SWA deployment token, and App Insights connection string from `terraform output`; `terraform apply` must have run successfully at least once. The API docker build runs from the repo root (context `.`) with `-f api-dotnet/Dockerfile` so the build can pull in `aspire/Blog.ServiceDefaults/`.
