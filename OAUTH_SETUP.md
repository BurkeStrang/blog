# Google OAuth Setup Guide

## Overview

The blog is **publicly accessible** - visitors can read all posts and navigate freely without authentication. Login is **optional** and will be used for future features like commenting.

## 1. Create Google OAuth Application (Optional)

*Only needed if you want to enable user authentication for future features*

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google+ API** and **OAuth Consent Screen**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Set application type to **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:8080/auth/google/callback`
   - `http://localhost:5173/auth/callback` (for frontend)

## 2. Configure Environment Variables (Optional)

1. Copy `api/.env.example` to `api/.env`
2. Fill in your Google OAuth credentials (if enabling auth):
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URL=http://localhost:8080/auth/google/callback
   JWT_SECRET=your-random-jwt-secret
   ```

## 3. Start the Applications

**Terminal 1 - API Server:**
```bash
cd api
go run main.go
```

**Terminal 2 - Frontend:**
```bash
cd ui
npm run dev
```

## 4. Usage

1. Navigate to `http://localhost:5173`
2. **Browse freely** - all posts are publicly accessible
3. **Optional login** - click "LOGIN" in sidebar for Google OAuth
4. **After login** - profile page available, ready for future features

## API Endpoints

- `GET /auth/google` - Get Google OAuth URL (optional)
- `GET /auth/google/callback` - Handle OAuth callback (optional)
- `POST /login` - Traditional login (optional)
- `GET /api/posts` - Public posts API
- `POST /api/posts/:slug/view` - Public view tracking

## Frontend Routes

- `/` - Redirects to posts (public)
- `/posts` - Main blog (public)
- `/posts/:slug` - Post details (public)
- `/about` - About page (public)
- `/login` - Login page with Google OAuth (optional)
- `/auth/callback` - OAuth callback handler (optional)
- `/profile` - User profile page (requires login)