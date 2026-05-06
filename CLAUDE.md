# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a full-stack blog application with a **Go/Gin API backend** and **React/Vite frontend** featuring 3D Three.js visualization:

- **API** (`/api/`): Go backend with Gin framework, SQLite database (GORM), OAuth authentication, and comprehensive caching middleware
- **UI** (`/ui/`): React frontend with Vite, Three.js/React Three Fiber for 3D scenes, Material-UI components, and performance-optimized rendering

### Key Technologies
- **Backend**: Go 1.24, Gin, GORM, SQLite, JWT authentication, Google OAuth2
- **Frontend**: React 19, Vite 6, Three.js, @react-three/fiber, Material-UI, TypeScript
- **3D Engine**: Custom optimization engine with memory management, LOD system, texture compression

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
cd api

# Development  
go run main.go              # Start API server on :8080
go build                    # Build binary
./main                      # Run compiled binary

# Infrastructure (Terraform)
cd terraform
terraform init              # Initialize Terraform
terraform plan              # Plan infrastructure changes
terraform apply             # Deploy Azure resources
terraform output            # Show deployment outputs
terraform output -raw cosmosdb_primary_key  # Get Cosmos DB key
```

## Project Structure

### Backend (`/api/`)
- `main.go` - Main server with routing, middleware, OAuth setup
- `handlers/` - HTTP request handlers for posts, comments, auth
- `middleware/` - Auth, caching, security, validation middleware
- `database/` - Database initialization and JSON migration
- `models/` - Database models and schemas
- `config/` - OAuth and environment configuration
- `data/` - SQLite database and JSON data files

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

- **SQLite** with GORM for data persistence
- **Multi-layer caching**: Posts cache, analytics cache, API cache
- **JSON migration** system imports data from `data/posts.json` and `data/analytics.json`
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

**Current Status**: Cosmos DB (Migration Complete)
- Branch: `features/cosmosmigration`
- **Primary Database**: Azure Cosmos DB with NoSQL document structure
- **Legacy**: GORM/SQLite dependencies remain in `go.mod` but are not actively used
- **Initialization**: `api/database/cosmos.go` and `api/main.go:19`
- **Models**: NoSQL document models in `api/models/cosmos_models.go`
- **Infrastructure**: Terraform deployment with free tier configuration
- See `COSMOS_MIGRATION.md` for complete setup and deployment guide

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
# Cosmos DB (current migration) - DEPLOYED AND READY
COSMOS_DB_ENDPOINT=https://blog.documents.azure.com:443/
COSMOS_DB_KEY=your-primary-key  # Get from Azure Portal or Terraform output
COSMOS_DB_DATABASE_NAME=blog

# OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-jwt-secret
```

**Note**: Cosmos DB account is deployed with free tier enabled. Get the primary key from Azure Portal or via `terraform output -raw cosmosdb_primary_key`.

### Development Ports
- API: `:8080` (Go/Gin server)
- UI Dev: `:3000` (Vite dev server)
- UI Preview: `:3000` (Vite preview server)
