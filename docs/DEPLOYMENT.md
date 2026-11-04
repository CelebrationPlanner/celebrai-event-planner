# CelebrAI – Deployment Guide

## 1. Deployment overview

| Service | Responsibility |
|---|---|
| Netlify | React frontend (static build, `netlify.toml`) |
| Render | Express API (`render.yaml` blueprint) |
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

Create a **Blueprint** from the GitHub repository: Render reads `render.yaml` and creates the `celebrai-api` web service with these settings (npm workspaces; the lockfile is at the repository root):
- Root directory: _(blank — repository root)_
- Build command: `npm ci && npm run build -w server`
- Start command: `npm start -w server`
- Health check path: `/api/health`

Backend environment variables:

```env
NODE_ENV=production
PORT=10000
CLIENT_URL=https://YOUR-SITE.netlify.app

SUPABASE_URL=
SUPABASE_ANON_KEY=

AI_PROVIDER=
GEMINI_API_KEY=
GEMINI_MODEL=
ANTHROPIC_API_KEY=
CLAUDE_MODEL=

RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX_REQUESTS=120
```

Do not set `SUPABASE_SERVICE_ROLE_KEY` on Render: the API runs every query as the signed-in user (see ARCHITECTURE.md D9).

`render.yaml` fixes `NODE_ENV`, `AI_PROVIDER` and `CLAUDE_MODEL`; the Blueprint form asks for `CLIENT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `ANTHROPIC_API_KEY` (marked `sync: false`, so they are never in the repository). Render supplies `PORT`. The public demo also runs with a reduced AI budget from `render.yaml` (100 calls/day in total, 20 per account, 3 per demo user); other rate-limit variables use the defaults in ENVIRONMENT_VARIABLES.md. Never commit these values.

**Deploying changes.** A Blueprint created from the public repository URL does not deploy on push. After a change, open the Blueprint and run **Manual sync** (applies `render.yaml` changes and redeploys), or use **Manual Deploy** on the service. Connecting Render to the GitHub organisation (Account settings → GitHub) enables automatic deploys. Netlify deploys the frontend automatically on every push to `main`.

After deployment:
- Verify `/api/health`.
- Verify database connectivity.
- Verify authentication token validation.
- Verify CORS allows only intended origins.
- Verify rate limits and safe error responses.

## 5. Netlify frontend setup

Import the repository into Netlify (Add new project → Import from GitHub). `netlify.toml` at the repository root supplies everything else:
- Build command: `npm run build -w client` (Node 22)
- Publish directory: `client/dist`
- SPA rewrite: every path serves `index.html`
- Security headers: strict Content-Security-Policy (API and Supabase origins only in `connect-src`), `X-Frame-Options: DENY`, `nosniff`, referrer and permissions policies

The API is not deployed as Netlify Functions: full AI plan generation takes ~35-40 s, longer than synchronous serverless function limits. New Netlify projects may start **private**; use **Make public** so judges and users can open the site.

Frontend environment variables (Netlify → Project configuration → Environment variables):

```env
VITE_API_BASE_URL=https://YOUR-BACKEND.onrender.com/api
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Only public browser-safe Supabase values belong in frontend variables. Never use a `VITE_` prefix for secrets.

In Supabase → Authentication → URL Configuration, set the **Site URL** to the Netlify URL and add `https://YOUR-SITE.netlify.app/**` to the redirect URLs. Keep **anonymous sign-ins** enabled for the demo.

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
Frontend URL:      https://celebrai-planner.netlify.app
Backend URL:       https://celebrai-api-jd3j.onrender.com/api (health: /api/health)
GitHub URL:        https://github.com/CelebrationPlanner/celebrai-event-planner
Supabase project:  hosted, Mumbai region; 3 migrations applied; RLS on all 6 tables
Deployment commit: c71e79d
Date verified:     2 Nov 2026
Updated 4 Nov:     API redeployed at 89179e9 (lower AI caps) by a manual Blueprint sync;
                   frontend auto-deploys from main (858b9cc at the time of writing)
```

Checks from §7, run against the live URLs with a scripted browser and temporary demo (anonymous) accounts:

| # | Check | Result |
|---|---|---|
| 1 | Landing page loads | Pass |
| 2 | Signup and login | Demo sign-in: pass. Email sign-up/login: not run on production (email confirmation is on); covered by the e2e journey against local Supabase, same code |
| 3 | Session restoration | Pass – session survives a reload, including a session saved by the previous release |
| 4 | Event created and retrieved | Pass |
| 5 | AI plan generation | Pass – `POST …/planner/generate` 200 in 35 s with Claude, plan saved and fetched |
| 6 | Invalid AI output rejected | Not triggerable against the real model; covered by `planner.int.test.ts` (Scenario 8) |
| 7 | Budget update persisted and recalculated | Pass – server reported "Over budget by ₹1,000" |
| 8 | Checklist update persisted | Pass |
| 9 | Data retained after refresh | Pass |
| 10 | Second user blocked from first user's event | Pass – API 404 and "Event not found" screen |
| 11 | Logout removes access | Pass – protected route redirects to login |
| 12 | Mobile layout | Pass – no horizontal overflow (Pixel 7) |
| 13 | Logs reveal no secrets or private content | Pass – Render logs show method, path, status and duration only |

Also verified: CORS preflight allows only the Netlify origin; security headers present on both hosts (CSP, HSTS, frame blocking); `main` is the only branch.

Known limitations: the free Render instance sleeps when idle (first request after a quiet period takes ~50 s); rate-limit counters are in memory (single instance); costs are estimates and venue availability is never claimed.

Only publish URLs and status claims after verifying them.
