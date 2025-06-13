# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a full-stack blog application with 3D interactive visuals:

- **Backend**: Go API server using Gin framework (`api/`)
  - REST endpoints for posts, comments, authentication
  - JWT-based auth with role-based access control
  - In-memory data storage (no database)
  - Runs on port 8080

- **Frontend**: React/TypeScript SPA using Vite (`ui/`)
  - Three.js-powered 3D ocean scene with interactive post visualization
  - React Router for client-side routing
  - Styled Components + Material-UI for styling
  - Runs on port 3000 in development

## Key Components

### Frontend Architecture
- `AppContent.tsx`: Main app container with post state management and 3D canvas orchestration
- `OceanDemoCanvas.tsx`: Three.js ocean scene with floating post boxes
- `PostBox.tsx` + `FollowerSphere.tsx`: 3D interactive post elements
- `ScrollCamera.tsx`: Custom camera controls for 3D navigation
- `theme/`: Centralized styling system with colors, typography, spacing

### Backend Architecture
- `main.go`: Route definitions and server setup
- `handlers/`: HTTP request handlers for auth, blog posts, comments
- `models/`: Data structures (BlogPost, User, Comment)
- `middleware/`: JWT authentication and role-based authorization

## Development Commands

### Frontend (ui/)
```bash
cd ui
pnpm dev          # Start development server on port 3000
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix ESLint issues
```

### Backend (api/)
```bash
cd api
go run main.go    # Start API server on port 8080
go mod tidy       # Clean up dependencies
```

## Data Flow

Posts are currently loaded from `ui/public/posts.json` for the frontend 3D visualization, while the Go API manages CRUD operations with in-memory storage. The frontend Post interface includes 3D positioning (`position?: THREE.Vector3`) for spatial layout in the ocean scene.

## 3D Scene Details

The main visual feature is an interactive ocean with floating post boxes positioned in 3D space. Posts are rendered as clickable geometric shapes that users can navigate through using custom camera controls. The scene uses Three.js Water effects, post-processing bloom, and optimized rendering for performance.