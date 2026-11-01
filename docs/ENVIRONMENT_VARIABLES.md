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
SUPABASE_SERVICE_ROLE_KEY=

GEMINI_API_KEY=
GEMINI_MODEL=

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

## Rules

- Validate required variables at server startup.
- Fail fast with a safe, descriptive configuration error.
- Never commit real values.
- Never log secret values.
- Use separate credentials for local, preview, and production environments.
- Rotate any key accidentally exposed in Git or logs.
- Use a provider-supported model identifier and current SDK documentation.
- Keep service-role access server-side and minimize its use.
