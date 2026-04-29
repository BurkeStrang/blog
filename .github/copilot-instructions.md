# Copilot instructions

## Build, lint, and verification commands

### UI (`/ui`)

```bash
cd ui
pnpm type-check
pnpm lint
pnpm lint:check
pnpm build
pnpm build:fast
```

- `pnpm build` already runs `pnpm type-check` and `pnpm lint:check` first.

### API (`/api`)

```bash
cd api
go build ./...
go run main.go
```

- Running the API locally requires `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY`, `COSMOS_DB_DATABASE_NAME`, and `JWT_SECRET`.
- Google OAuth is optional, but auth flows need `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and usually `GOOGLE_REDIRECT_URL`.

### Tests

- There is no automated test suite configured right now: `api/` has no `*_test.go` files and `ui/` has no test runner scripts, so there is no single-test command to prefer yet.

## High-level architecture

- This is a full-stack blog app with a Go/Gin API in `api/` and a React 19 + Vite frontend in `ui/`.
- `api/main.go` initializes Google OAuth and Cosmos DB, applies security/sanitization/validation middleware globally, exposes `/auth/*` OAuth endpoints, `/api/*` content endpoints, and admin-only `/admin/cache/*` cache management endpoints.
- The backend stores data in Cosmos DB, but the HTTP API intentionally preserves legacy response shapes. Cosmos document types live in `api/models/cosmos_models.go`, and handlers convert them back to compatibility models in `api/models/database.go` before returning JSON.
- Posts are served through `api/handlers/blog_db.go`; comments, replies, and likes go through `api/handlers/comment_db.go`; user theme preferences are stored in the `users` container via `api/handlers/user_preferences.go`.
- `ui/src/app/App.tsx` keeps `/auth/callback` lightweight and outside the heavy app shell. All other routes run through `SearchProvider` and `AppContent`.
- `ui/src/app/AppContent.tsx` is the main frontend orchestrator: it loads posts, keeps auth state in `localStorage`, wires `ThemeProvider`, manages cache invalidation, and controls when the Three.js canvas is allowed to load.
- The 3D scene is lazy-loaded through `ui/src/features/ocean/LazyOceanCanvas.tsx` and only enabled on `/`, `/posts`, and `/about`; direct post-detail navigation avoids loading the heavy canvas first.
- `ui/src/services/api.ts` is the primary posts/auth client with built-in client-side caching. Comments use the separate `ui/src/services/commentService.ts` path because it preserves comment-specific request conventions and optimized lookup parameters.
- `ui/vite.config.ts` is part of the architecture: it enables the React Compiler selectively, rewrites GLTF/bin asset references after build, removes raw `dist/models`, and emits gzip/brotli copies of built assets.

## Key conventions

- Preserve the legacy JSON contract even when changing Cosmos-backed code. Posts still expose fields like `date`; comments still use names like `post_id`, `created_at`, `like_count`, and `cosmos_id`.
- Reuse the Cosmos compatibility layer instead of inventing new shapes. Storage models are `Cosmos*`; API responses should still flow through the compatibility models in `api/models/database.go`.
- Cosmos IDs and partition keys follow repo-specific rules: posts use IDs like `post-123` in the `"post"` partition; comments use IDs like `comment-<unix_millis>` and are partitioned by `post-123`; user preferences use `prefs-<username>` with the username as partition key.
- Auth stores the user email in JWT `Claims.Username`. Backend code often strips the email domain when deriving display names and preference keys, so follow the existing helper/conversion pattern instead of introducing a new username rule.
- Comment work should use `commentService` and preserve `post_id` / `cosmos_id` context when available. The comment layer mixes legacy numeric IDs in UI state with prefixed Cosmos IDs for backend lookups.
- Frontend GET requests are cached by default in `apiService`; mutations are expected to invalidate the relevant caches rather than bypassing the service layer.
- Do not re-enable React `StrictMode` casually. It is intentionally disabled in `ui/src/app/main.tsx` because double rendering caused Three.js memory leaks.
- Set `VITE_API_URL` for local/dev work when you need all frontend services pointed at the same backend. The main API services default to `https://api.brxstrng.com`, while `userPreferencesService` falls back to `http://localhost:8080`.
