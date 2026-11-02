# CelebrAI – Environment Variables

Use this file as a reference. Create actual `.env` files locally and configure production secrets through the hosting provider's secret manager.

## Frontend: `client/.env.example`

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

These values are exposed to the browser at build time. Only use public browser-safe values. Never put AI provider keys or Supabase service-role keys here.

## Backend: `server/.env.example`

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

SUPABASE_URL=
SUPABASE_ANON_KEY=

RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX_REQUESTS=120

AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-opus-5-5
AI_TIMEOUT_MS=75000
RATE_LIMIT_MAX_REQUESTS=10
AI_RATE_LIMIT_PER_IP=20
AI_DAILY_LIMIT_PER_USER=50
AI_DAILY_LIMIT_ANONYMOUS=10
AI_DAILY_LIMIT_TOTAL=1000
```

| Variable | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | Yes | Project URL (local: `http://127.0.0.1:54321`). |
| `SUPABASE_ANON_KEY` | Yes | Public anon/publishable key. The API forwards each user's access token, so Row Level Security applies to every query (D9). |
| `RATE_LIMIT_WINDOW_MS` / `API_RATE_LIMIT_MAX_REQUESTS` | No | General API rate limit per client IP (default 120 requests per minute). |
| `AI_PROVIDER` | No | `gemini` (default) or `claude`: which provider writes plan text. Only that provider's key is needed. |
| `ANTHROPIC_API_KEY` | When `AI_PROVIDER=claude` | Server-only. Blank means not configured (AI routes return 503). |
| `CLAUDE_MODEL` | No | Claude model id (default `claude-opus-5-5`). |
| `GEMINI_API_KEY` | When `AI_PROVIDER=gemini` | Server-only. Without it the API still runs and AI routes return `503 AI_UNAVAILABLE`. |
| `GEMINI_MODEL` | No | Gemini model id or alias (default `gemini-flash-latest`). |
| `AI_TIMEOUT_MS` | No | Overall deadline per AI call, including retries (default 75000, below the client's 90 s; full plans take ~35-40 s on Claude Opus 5.5). Timeouts return `504 AI_TIMEOUT`. |
| `RATE_LIMIT_MAX_REQUESTS` | No | Per-user limit for AI routes within `RATE_LIMIT_WINDOW_MS` (default 10). |
| `AI_RATE_LIMIT_PER_IP` | No | AI calls per client IP within `RATE_LIMIT_WINDOW_MS` (default 20), so creating many demo users from one IP cannot multiply the per-user limit. |
| `AI_DAILY_LIMIT_PER_USER` / `AI_DAILY_LIMIT_ANONYMOUS` | No | AI calls per user per day: accounts (default 50) and anonymous demo users (default 10). Over the limit returns 429. |
| `AI_DAILY_LIMIT_TOTAL` | No | AI calls per day across all users (default 1000), a hard cap on provider spend. Over the cap returns `503 AI_UNAVAILABLE` without calling the provider. |

The production values (Render) are set by `render.yaml`: `NODE_ENV=production`, `AI_PROVIDER=claude`, `CLAUDE_MODEL=claude-opus-5-5`; `CLIENT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `ANTHROPIC_API_KEY` are entered in the Render dashboard. The frontend values (Netlify) are entered in Netlify's environment settings. Everything else uses the defaults above.

**The running API does not use `SUPABASE_SERVICE_ROLE_KEY`.** It is only needed by the integration tests, which read it from `npx supabase status` at runtime (`npm run test:integration -w server`). Never set it on Render.

## Rules

- Validate required variables at server startup.
- Fail fast with a safe, descriptive configuration error.
- Never commit real values.
- Never log secret values.
- Use separate credentials for local, preview, and production environments.
- Rotate any key accidentally exposed in Git or logs.
- Use a provider-supported model identifier and current SDK documentation.
- Keep service-role access server-side and minimize its use.
