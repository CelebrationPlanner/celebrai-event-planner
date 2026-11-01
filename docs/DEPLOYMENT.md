# CelebrAI – Deployment Guide

## 1. Deployment overview

| Service | Responsibility |
|---|---|
| Vercel | React frontend |
| Render | Express API |
| Supabase | PostgreSQL and authentication |
| AI provider | Server-side model API |

Check current provider pricing, quotas, sleep behavior, build limits, and regional availability before choosing a plan. Free-tier terms can change.

## 2. Prepare the repository

- Push the tested `main` branch to a public GitHub repository.
- Confirm no `.env` files, API keys, credentials, or service-role secrets are tracked.
- Ensure build and test commands work locally.
- Add `.env.example` files containing variable names and safe placeholders only.

## 3. Supabase setup

1. Create a Supabase project.
2. Record the project URL and public anon/publishable key.
3. Configure authentication providers and redirect URLs.
4. Apply versioned SQL migrations.
5. Enable RLS on all user-owned tables.
6. Test policies with two separate users.
7. Configure database backups and retention appropriate to the selected plan.

Do not expose the service-role key to the browser. If the backend uses it, keep it in Render's secret environment configuration and still enforce application-level ownership checks.

## 4. Render backend setup

Create a web service connected to the GitHub repository.

Typical settings (npm workspaces; the lockfile is at the repository root):
- Root directory: _(blank — repository root)_
- Build command: `npm ci && npm run build -w server`
- Start command: `npm start -w server`
- Health check path: `/api/health`

Backend environment variables:

```env
NODE_ENV=production
PORT=10000
CLIENT_URL=https://YOUR-FRONTEND.vercel.app

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GEMINI_API_KEY=
GEMINI_MODEL=

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

Use the port supplied by the hosting platform if required. Never commit these values.

After deployment:
- Verify `/api/health`.
- Verify database connectivity.
- Verify authentication token validation.
- Verify CORS allows only intended origins.
- Verify rate limits and safe error responses.

## 5. Vercel frontend setup

Import the repository into Vercel.

Typical settings:
- Root directory: `client`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

Frontend environment variables:

```env
VITE_API_BASE_URL=https://YOUR-BACKEND.onrender.com/api
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Only public browser-safe Supabase values belong in frontend variables. Never use a `VITE_` prefix for secrets.

Configure SPA route rewrites if the deployed router requires them. Set the production authentication redirect URLs in Supabase.

## 6. CORS and URLs

- Set backend `CLIENT_URL` to the exact production frontend origin.
- Add localhost origins only in development.
- Do not use wildcard CORS with credentials.
- Use HTTPS in production.
- Confirm frontend API base URL points to the production backend.

## 7. Production verification

Run the following checks on actual deployed URLs:

1. Landing page loads.
2. Signup and login work.
3. Session restoration works.
4. Event can be created and retrieved.
5. AI plan generation works with a valid key.
6. Invalid AI output is rejected safely.
7. Budget updates are persisted and recalculated.
8. Checklist updates persist.
9. Refreshing the browser retains saved data.
10. A second user cannot access the first user's event.
11. Logout removes access to protected screens.
12. Mobile layout works.
13. Backend logs do not reveal secrets or private content.

## 8. Common deployment issues

### CORS error
Check the exact frontend origin and backend allowlist. Confirm the deployed backend has the latest environment configuration.

### Missing environment variable
Check variable names and deployment environment. Redeploy after changing variables if the platform requires it.

### API returns 404
Check the backend root directory, route prefix, build output, and frontend API base URL.

### Supabase permission error
Check JWT verification, RLS policies, table grants, and whether the query is using the intended user context.

### AI provider error
Check API key, model identifier, provider quota, request limits, and server logs. Do not expose provider error details to users.

### Service sleeps or cold starts
Check the hosting plan's current behavior. Display a loading state and use sensible client/server timeouts.

## 9. Deployment record

```text
Frontend URL:
Backend URL:
GitHub URL:
Supabase project:
Deployment commit:
Date verified:

Signup/login:
Event CRUD:
AI generation:
Budget update:
Task update:
Persistence:
Cross-user authorization:
Mobile check:

Known limitations:
```

Only publish URLs and status claims after verifying them.
