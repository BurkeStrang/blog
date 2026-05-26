# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a full-stack blog application with a **Go/Gin API backend** and **React/Vite frontend** featuring 3D Three.js visualization:

- **API** (`/api/`): Go backend with Gin framework, Azure Cosmos DB (NoSQL document store), OAuth authentication, and in-process multi-layer caching middleware
- **UI** (`/ui/`): React frontend with Vite, Three.js/React Three Fiber for 3D scenes, Material-UI components, and performance-optimized rendering

### Key Technologies
- **Backend**: Go 1.24, Gin, Azure Cosmos DB SDK, JWT authentication, Google OAuth2
- **Frontend**: React 19, Vite 6, Three.js, @react-three/fiber, Material-UI, TypeScript
- **3D Engine**: Custom optimization engine with memory management, LOD system, texture compression
- **Hosting**: Azure Container Apps (API) + Azure Static Web Apps (UI), see `terraform/`

## Development Commands

### Frontend (UI)
```bash
cd ui

# Development
pnpm dev                    # Start dev server on :3000
pnpm build                  # Full production build with type-check and lint
pnpm build:fast             # Quick build without checks
pnpm preview                # Preview production build

# Code Quality
pnpm type-check             # TypeScript type checking
pnpm lint                   # ESLint check
pnpm lint:check             # ESLint with zero warnings
pnpm lint:fix               # Auto-fix ESLint issues

# Asset Optimization
pnpm optimize:gltf          # Compress GLTF models with Draco
```

### Backend (API)
```bash
cd api-dotnet

# Development
dotnet run                  # Start API standalone on :8080
dotnet build                # Compile

# Infrastructure (Terraform)
cd terraform
terraform init              # Initialize Terraform
terraform plan              # Plan infrastructure changes
terraform apply             # Deploy Azure resources
terraform output            # Show deployment outputs
terraform output -raw cosmosdb_primary_key  # Get Cosmos DB key
```

### Orchestration (Aspire)
```bash
# Run API + UI together with the Aspire dashboard
dotnet run --project aspire/Blog.AppHost
# Dashboard URL is printed to stdout; usually http://localhost:18888
```

The AppHost (`/aspire/Blog.AppHost/AppHost.cs`) launches the .NET API as a project resource and the Vite dev server via `AddExecutable("pnpm", ..., "dev")`. It forwards the API endpoint to the UI as `VITE_API_URL` and the dashboard's OTLP/HTTP endpoint as `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` — both API spans and browser spans land in the same dashboard, sharing trace ids via W3C `traceparent`.

`/aspire/Blog.ServiceDefaults` is referenced by the API and called as `builder.AddServiceDefaults()` in `Program.cs`. It configures OpenTelemetry traces/metrics/logs with both an OTLP exporter (Aspire dashboard locally) and the Azure Monitor exporter (`UseAzureMonitor()` is enabled when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set in prod).

Browser-side telemetry lives in `ui/src/shared/observability/telemetry.ts` and is initialised once from `main.tsx`. It branches on env vars:
- `VITE_APPLICATIONINSIGHTS_CONNECTION_STRING` set → Application Insights JS SDK
- otherwise `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` set → OTel web SDK posting to that OTLP/HTTP endpoint
- neither set → no-op (e.g. `pnpm dev` without Aspire)

App Insights provisioning in Azure is a follow-up — add `azurerm_application_insights` to `terraform/` and inject `APPLICATIONINSIGHTS_CONNECTION_STRING` into the Container App env + `VITE_APPLICATIONINSIGHTS_CONNECTION_STRING` into the SWA build settings when ready.

## Project Structure

### Backend (`/api/`)
- `main.go` - Main server with routing, middleware, OAuth setup
- `handlers/` - HTTP request handlers for posts, comments, auth
- `middleware/` - Auth, caching, security, validation middleware
- `database/` - Cosmos DB initialization and seed-data import
- `models/` - NoSQL document models
- `config/` - OAuth and environment configuration
- Observability lives in `aspire/Blog.ServiceDefaults/` — referenced by the API and called via `builder.AddServiceDefaults()` (OTLP locally, Azure Monitor in prod)

### Frontend (`/ui/`)
- `src/app/` - Main app components and routing
- `src/features/` - Feature-based modules (posts, comments, auth, ocean scene)
- `src/engine/` - Custom 3D optimization engine with memory management
- `src/shared/` - Shared components, hooks, services, and utilities
- `src/models/` - 3D model components (RubiksCube, Sphere)

### Key Engine Features
- **Memory Management**: Automatic asset disposal, garbage collection, resource pooling
- **Rendering Optimization**: LOD system, frustum culling, texture compression, WebGL optimization
- **Asset Streaming**: Lazy loading, progressive enhancement, basis texture support

## Authentication & Security

- **Google OAuth2** integration with JWT tokens
- **Role-based access**: Admin-only endpoints for post/comment management
- **Input validation** and sanitization middleware
- **Security headers** and CORS configuration
- **Cache invalidation** system for admin operations

## Database & Caching

- **Azure Cosmos DB** (NoSQL) for data persistence — containers: `posts`, `comments`, `users`
- **Multi-layer in-process caching**: Posts cache, analytics cache, API cache (`api/middleware/redis_cache.go` despite the name — the file implements a Redis-shaped interface; production runs the in-memory fallback)
- **Cache warming**: `WarmPostsCache` / `WarmCommentsCache` run at startup; `StartPeriodicPostsWarm` re-primes posts every 10 min so the first user after a TTL window doesn't pay the full Cosmos query
- **Cache management** endpoints for admin users (`/admin/cache/*`)

## Performance Optimizations

- **React Compiler** enabled for automatic memoization
- **Asset compression**: WebP textures, Draco GLTF compression, Brotli/Gzip
- **Bundle splitting**: Separate chunks for Three.js, React, and UI vendors
- **Memory constraints**: Engine keeps usage under 400MB through aggressive cleanup
- **Lazy loading**: Components and 3D assets load on demand

## Build Process

The build process includes:
1. TypeScript type checking and ESLint validation
2. Vite bundling with tree-shaking and minification  
3. Custom GLTF texture copying and bin file management
4. Automatic Gzip and Brotli compression of static assets
5. Bundle analysis and chunk size warnings

## Environment Setup

- **API**: Requires Go 1.24+, optional `.env` file for OAuth credentials
- **UI**: Requires Node.js, uses `pnpm` for package management
- **OAuth**: Optional Google OAuth setup for authentication features
- **Development**: Both servers can run simultaneously (API :8080, UI :3000)

## Database Architecture

- **Primary Database**: Azure Cosmos DB (NoSQL document store), free tier enabled
- **Initialization**: `api/database/cosmos.go` (called from `api/main.go`)
- **Models**: NoSQL document models in `api/models/cosmos_models.go`
- **Infrastructure**: Provisioned in `terraform/main.tf` (`azurerm_cosmosdb_*` resources)
- **Legacy**: GORM/SQLite dependencies may still appear in `go.mod` but are not used at runtime

## Testing & Quality

### Frontend Testing
```bash
cd ui
pnpm type-check         # TypeScript compilation check
pnpm lint               # ESLint validation  
pnpm lint:check         # ESLint with zero warnings (build requirement)
pnpm lint:fix           # Auto-fix linting issues
```

### Backend Testing
```bash
cd api
go build               # Compile check for Go code
go run main.go         # Local development server
```

**Important**: The build process (`pnpm build`) requires both type-check and lint:check to pass with zero warnings.

## Development Workflow

### Code Quality Requirements
- **Zero tolerance policy**: Build fails on any TypeScript errors or ESLint warnings
- **React Compiler**: Enabled for automatic memoization (excludes `/engine/`, `/services/`, `/cache/`)
- **Asset optimization**: Custom Vite plugins handle GLTF texture copying and compression

### Key Architectural Patterns

#### Backend (`/api/`)
- **Middleware stack**: Security headers, input sanitization, request validation, auth, CORS
- **Caching strategy**: Multi-layer with admin cache management endpoints (`/admin/cache/*`)
- **Authentication**: JWT + Google OAuth2 with role-based access control
- **Database**: Cosmos DB containers (posts, comments, users) with document-based NoSQL structure

#### Frontend (`/ui/`)
- **React 19**: With React Compiler for automatic optimization
- **Three.js Architecture**: Custom engine with memory management under 400MB
- **Bundle strategy**: Separate chunks for Three.js, React, UI vendors
- **Asset pipeline**: WebP textures, Draco GLTF compression, Brotli/Gzip compression

#### Custom 3D Engine (`/src/engine/`)
- **Memory Management**: `MemoryTracker`, `AutoDisposer`, `GarbageCollector`, `ResourcePool`
- **Rendering**: LOD system, frustum culling, WebGL optimization
- **Asset Loading**: Progressive enhancement, lazy loading, basis texture support

## Environment & Configuration

### Required Environment Variables (API)
```bash
# Cosmos DB
COSMOS_DB_ENDPOINT=https://<account>.documents.azure.com:443/
COSMOS_DB_KEY=your-primary-key            # az keyvault secret show, or terraform output -raw cosmosdb_primary_key
COSMOS_DB_DATABASE_NAME=blog

# OAuth (optional for local dev; required in prod)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-jwt-secret

# Optional
REDIS_ADDR=                               # leave empty in prod; the API falls back to in-memory cache
OTEL_TRACES_EXPORTER=none                 # disables OTLP trace export when no collector is reachable
FRONTEND_URL=https://brxstrng.com         # extra CORS allowed origin
GOOGLE_REDIRECT_URL=https://api.brxstrng.com/auth/google/callback
```

In production these are injected into the Container App from Key Vault via the user-assigned identity (see `terraform/containerapp.tf`).

### Development Ports
- API: `:8080` (Go/Gin server)
- UI Dev: `:3000` (Vite dev server)
- UI Preview: `:3000` (Vite preview server)

## Deployment

Production runs on Azure:
- **UI**: Azure Static Web Apps (`swa-blog-ui-prod`), Free tier, custom domains `brxstrng.com` + `www.brxstrng.com`. SPA deep-route fallback is configured in `ui/public/staticwebapp.config.json`.
- **API**: Azure Container Apps (`ca-blog-api-prod`) in environment `cae-blog-prod`, pulling images from ACR `acrblogbrxstngprod` via a user-assigned managed identity, with secrets resolved from Key Vault. Custom domain `api.brxstrng.com`, managed TLS.
- **Database**: Cosmos DB (`cosmos-blog-brxstng-prod`), free tier.

### Deploy commands
```bash
./deploy.sh                 # build + push API image, roll Container App, build + deploy UI
./deploy.sh api             # API only
./deploy.sh ui              # UI only
```

`deploy.sh` reads ACR + SWA deployment token from `terraform output`; `terraform apply` from `terraform/` must have run successfully at least once.
