# Repository Guidelines

## Project Structure & Module Organization

This repository contains a full-stack Three.js blog. `ui/` is the React 19 + Vite frontend; source lives in `ui/src`, static assets in `ui/public`, and optimization scripts in `ui/scripts`. `api/` is the Go/Gin backend, with handlers, middleware, models, validation, and HTTP examples under `api/httpfiles`. Infrastructure lives in `terraform/`. `observability/` at the repo root holds a local-dev `docker compose` stack (Grafana + Prometheus + Tempo + OTel collector) used only when running the API locally with tracing enabled.

## Build, Test, and Development Commands

- `cd ui && pnpm dev`: start the Vite development server.
- `cd ui && pnpm build`: run TypeScript checks, strict ESLint, and a production build.
- `cd ui && pnpm lint:fix`: auto-fix frontend lint issues.
- `cd api && go build ./...`: compile the API.
- `cd api && go run main.go`: run the API locally; requires Cosmos DB and JWT environment variables.
- `./deploy.sh [api|ui]`: build, push, and roll out to Azure Container Apps + Static Web Apps. See `CLAUDE.md` for the deployment topology.

## Coding Style & Naming Conventions

Frontend code is TypeScript/TSX with ESLint flat config, React Compiler rules, and automatic JSX runtime. Use two-space indentation, PascalCase for components (`PostDetail.tsx`), camelCase for functions and variables, and keep feature code under `ui/src/features/<area>`. Go code should stay `gofmt`/`go vet` clean and preserve package boundaries.

## Testing Guidelines

The API currently has no `*_test.go` files, and the UI has no test runner script. For now, run `go build ./...`, `pnpm type-check`, `pnpm lint:check`, and `pnpm build` before submitting.

## Commit & Pull Request Guidelines

Recent commits use short, lowercase, imperative-style messages such as `more cleanup`. Prefer concise summaries that name the changed behavior. Pull requests should include a clear description, affected areas (`ui`, `api`, `infra`), verification commands run, linked issues when applicable, and screenshots or recordings for UI changes.

## Security & Configuration Tips

Do not commit secrets. Use `terraform/terraform.tfvars.example` as a template, and keep real Terraform values, Cosmos DB keys, JWT secrets, and OAuth credentials local or in Azure Key Vault. Preserve the API's legacy JSON response shapes when changing Cosmos-backed models or handlers.
