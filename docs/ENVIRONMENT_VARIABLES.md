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

# Added in Phase 4 (AI):
GEMINI_API_KEY=
GEMINI_MODEL=
```

| Variable | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | Yes | Project URL (local: `http://127.0.0.1:54321`). |
| `SUPABASE_ANON_KEY` | Yes | Public anon/publishable key. The API forwards each user's access token, so Row Level Security applies to every query (D9). |
| `RATE_LIMIT_WINDOW_MS` / `API_RATE_LIMIT_MAX_REQUESTS` | No | General API rate limit per client IP (default 120 requests per minute). |

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
