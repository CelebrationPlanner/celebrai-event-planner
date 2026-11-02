# CelebrAI – Architecture and Engineering Notes

## 1. High-level architecture

```text
Browser
  |
  v
React + TypeScript + Vite
  |
  | HTTPS REST + Supabase Auth token
  v
Node.js + Express API
  |                 |
  |                 +--> AI provider adapter --> Gemini API
  |
  +--> Domain services
  |      +--> Event service
  |      +--> Budget service
  |      +--> Planner service
  |      +--> Task/timeline service
  |
  +--> Supabase client
          +--> PostgreSQL
          +--> Auth verification
          +--> Row Level Security
```

The frontend must never call the private AI provider key directly. The backend is responsible for authentication, validation, business rules, AI orchestration, and persistence.

## 2. Monorepo layout

npm workspaces with a single root lockfile. Folders are created in the phase that first needs them.

```text
celebrai-event-planner/
├── package.json            # workspaces + root scripts (dev, build, typecheck, test, lint)
├── shared/src/             # Zod schemas (EventContext, EventPlan, API errors), money/date helpers
├── server/src/
│   ├── config/env.ts       # validates environment at startup, fails fast
│   ├── middleware/         # auth, validation, rate limiting, error handler
│   ├── modules/            # events, planner, budget, tasks, invitations (routes + service + repository)
│   ├── engine/             # deterministic rules: missing fields, budget allocator, risk rules, scheduler
│   ├── ai/                 # AIProvider interface, Gemini provider, prompt builder, output parser
│   ├── app.ts              # createApp(env), used by server.ts and Supertest
│   └── server.ts
├── client/src/
│   ├── app/                # router, layout, providers
│   ├── components/ui/      # shadcn components
│   ├── features/           # landing, auth, dashboard, events, planner, budget, tasks, timeline, invitations, settings
│   └── lib/                # API client, Supabase client
├── client/e2e/             # Playwright + axe-core
├── supabase/migrations/    # tables, constraints, indexes, RLS, profile trigger
├── docs/
├── .gitignore
└── README.md
```

Tests sit next to the code they cover (`*.test.ts`).

## 3. Architectural boundaries

### Frontend
- Renders UI and manages transient interaction state.
- Calls typed API service modules.
- Does not contain secret keys or authoritative budget logic.
- Displays assumptions and estimate labels.
- Handles loading, empty, and error states.

### API layer
- Verifies identity.
- Validates parameters and request bodies.
- Enforces ownership.
- Calls domain services.
- Normalizes errors and responses.

### Domain services
- Implement event rules and budget invariants.
- Orchestrate AI requests.
- Validate model output.
- Persist plan versions and user edits.
- Keep provider-specific details out of core logic.

### AI adapter
Define a provider-neutral interface, for example:

```ts
interface AIProvider {
  generateStructuredPlan(input: PlannerInput): Promise<unknown>;
  generateAssistantReply(input: ChatInput): Promise<unknown>;
}
```

The planner service validates the returned unknown value using Zod. Do not trust model output because the provider was instructed to return JSON.

## 4. Authentication and authorization

- Use Supabase Auth for sign-up, sign-in, and session management.
- Frontend sends the access token as a bearer token to protected API routes.
- Backend verifies the token with a trusted Supabase verification method.
- Derive user ID from the verified token; never accept it as authoritative from request JSON.
- Query records with both record ID and authenticated owner ID.
- Enable RLS on every user-owned table.
- Test direct API access, not just UI navigation.

The Supabase service-role key bypasses RLS. Keep it server-side and use it only where necessary. Prefer a user-scoped client for user data operations.

## 5. Data model guidance

### events
- `id uuid primary key`
- `user_id uuid not null`
- `occasion text not null`
- `event_name text`
- `event_date date`
- `location text`
- `guest_count integer`
- `budget_amount bigint`
- `currency text`
- `venue_preference text`
- `preferences jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

### event_plans
- `id uuid primary key`
- `event_id uuid not null`
- `version integer not null`
- `plan_json jsonb not null`
- `created_at timestamptz`

### expenses
- `id uuid primary key`
- `event_id uuid not null`
- `category text not null`
- `estimated_amount bigint`
- `actual_amount bigint`
- `currency text`
- `created_at timestamptz`
- `updated_at timestamptz`

### tasks
- `id uuid primary key`
- `event_id uuid not null`
- `title text not null`
- `priority text`
- `due_date date`
- `completed boolean not null default false`
- `created_at timestamptz`
- `updated_at timestamptz`

### conversations
- `id uuid primary key`
- `event_id uuid not null`
- `user_id uuid not null`
- `messages jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Add constraints, indexes, and RLS policies in versioned migrations. Decide whether child rows cascade on event deletion. Bound conversation storage and retention.

## 6. API conventions

Use:
- JSON request and response bodies.
- ISO 8601 dates.
- Consistent currency units.
- Pagination for lists if needed.
- `400` for invalid input, `401` for unauthenticated, `403` for forbidden, `404` for absent or inaccessible resources, `429` for rate limits, and `500` for unexpected failures.
- A stable error shape such as `{ "error": { "code": "...", "message": "..." } }`.

Avoid returning internal stack traces or provider error details to clients.

## 7. AI orchestration flow

1. Authenticate user.
2. Validate event ID and ownership.
3. Load event context and relevant bounded conversation history.
4. Determine whether critical fields are missing.
5. If required context is missing, return a clarification response rather than inventing facts.
6. Build a constrained prompt from trusted application instructions and validated user data.
7. Call configured AI provider with timeout and bounded token/output limits.
8. Parse and validate output with Zod.
9. Apply deterministic budget and date validations.
10. Persist a versioned plan only after successful validation.
11. Return the validated plan and explicit assumptions.

Treat user content and retrieved text as untrusted data. Never allow it to override system instructions or trigger tool execution.

## 8. Reliability

- Set request timeouts.
- Add bounded retries only for transient provider failures.
- Avoid retrying invalid requests.
- Use idempotency protection for expensive generation requests where practical.
- Prevent duplicate form submissions.
- Log request IDs and safe operational metadata.
- Do not log tokens, API keys, raw sensitive prompts, or full personal records.
- Provide a clear retry action after recoverable failures.

## 9. Performance and repository constraints

- Lazy-load nonessential screens.
- Keep dependencies minimal.
- Compress and optimize images.
- Avoid committing build outputs and `node_modules`.
- Paginate large lists.
- Bound AI conversation context.
- Cache only data where freshness and user isolation are understood.
- Keep the complete Git repository under the challenge's 10 MB limit, including history.

## 10. Deployment topology

- Netlify: static frontend (`netlify.toml`). The API is not run as Netlify Functions because full plan generation (~35-40 s) exceeds synchronous function limits.
- Render: Express API (`render.yaml`).
- Supabase: hosted PostgreSQL and authentication.
- AI provider: server-to-server API calls.

Configure CORS to allow only the production frontend and explicitly required local development origins. Use HTTPS in production.

## 11. Architecture decisions (Phase 1)

| # | Decision | Reason |
|---|---|---|
| D1 | **Hybrid planning engine.** Deterministic backend rules own missing-field detection, budget allocation, overrun detection, lead-time and deadline math, and risk triggers (outdoor → weather backup, children → age-appropriate activities, dietary → catering flags, short notice → urgent tasks, low budget → cheaper alternatives). The AI writes creative content and explanations against a strict schema. The backend overrides all AI numbers and dates before saving. | Arithmetic, dates and permissions must never depend on the model. |
| D2 | **One `EventPlan` schema** merging the spec and product brief: every recommendation has `recommendation`, `explanation`, `reasoning`, `estimatedCostMinor` (nullable) and `assumptions[]`. The plan also holds theme, budget allocation, event-day schedule, risks and global assumptions. | The spec and brief differed; one schema in `shared/` serves both client and server. |
| D3 | **Timeline = dated tasks + event-day schedule.** Preparation milestones, vendor deadlines, invitation and shopping dates are tasks with `due_date`. The event-day agenda (time slots) lives in the plan JSON. The Timeline screen merges the two. | Keeps to the six required tables; milestones stay editable. |
| D4 | **Invitations** are stored as `invitation_text` + `invitation_tone` on `events`. | No extra table; regenerating a plan doesn't overwrite an edited invitation. |
| D5 | **Draft events.** The first assistant message creates an event with `status = 'draft'` and nullable context fields. A check constraint requires `occasion` once status is not `draft`. | Natural-language planning can start before the wizard is filled. |
| D6 | **Context lives on the event row, not in AI memory.** Extracted fields are validated and saved to `events`. Missing fields are computed from that row, so the assistant never re-asks for known data. Conversation history is capped at the last 20 messages. | Deterministic "don't ask again"; bounded context and storage. |
| D7 | **npm workspaces + `shared/` package** for Zod schemas and money/date helpers. The server is bundled with esbuild (inlines `shared/`); the client is bundled by Vite. Typecheck runs `tsc --noEmit` in each workspace. | One source of truth for validation, no duplicated business logic. |
| D8 | **Time zone.** The profile stores the user's IANA time zone (from the browser). "Today" for deadline validation is computed in that zone. | The server runs in UTC; users may be in IST. Prevents off-by-one "past deadline" errors. |
| D9 | **User-scoped Supabase client per request.** The API forwards the user's bearer token, so RLS applies to every query, and also filters by the verified owner ID. A database trigger creates `profiles` rows. The service-role key is used only by test setup, never by the running API. | Two independent ownership layers; one fewer production secret. |
| D10 | **Demo mode = Supabase anonymous sign-in.** "Try the demo" creates an isolated anonymous user seeded with one clearly labelled sample event. Same API, same RLS. | Evaluators get the full AI and persistence flow without email confirmation. |
| D11 | **Money in integer minor units** (`bigint` in Postgres, safe integers in JS). Allowlisted currencies: INR (default), USD, EUR, GBP, all with 2 decimal places. Allocation remainders go to a fixed category, so totals always match. | No floating-point rounding errors; one consistent unit. |
| D12 | **Render cold starts.** The landing page pings `/api/health` on load and the UI shows a "waking up the planner" state on slow first responses. | Free-tier instances sleep; evaluators shouldn't see a dead app. |

Tooling: Node 22, TypeScript 7 (`strict: true` set explicitly), oxlint, Vitest + Supertest, esbuild for the server build, tsx for server dev. Local Supabase (`supabase start`, Docker) runs the RLS and cross-user tests.

## 12. Event Planning Intelligence Engine (Phase 4)

The planner splits every decision into two kinds:

| Decided by the backend engine (`server/src/engine/`) | Written by the AI (`server/src/ai/`) |
|---|---|
| Which details are missing and which questions to ask | Friendly acknowledgement of what the user said |
| Which planning rules apply (table below) | Theme, with reasoning tied to the user's preferences |
| Budget allocation per category, in exact integer minor units | Recommendations: what, why, assumptions |
| Checklist and deadlines (never past, never after the event) | Event-day agenda (HH:MM), extra risks and tasks |
| Fixed assumptions (estimates are not quotes; availability unverified) | Wording, explanations, invitation text |

The AI never supplies money amounts or plan dates. Its output is validated with Zod; costs and due dates are then filled in from the engine and the combined plan is validated again (`eventPlanSchema`) before it is saved.

### Decision rules

| Rule | Trigger | Effect |
|---|---|---|
| Tight budget | Budget per guest < ₹400 / $15 / €15 / £12 (×3 for weddings) | Food and space first; photography, entertainment, décor and invitations scaled back; "ask a friend for photos" replaces a photographer |
| Large guest count | ≥ 150 guests | More to food and venue; capacity flagged as *to verify* |
| Outdoor venue | `venuePreference = outdoor` | Extra contingency; weather-backup task and risk |
| Children attending | Age group mentions children/teens, or a 1st–12th birthday | Age-appropriate entertainer, larger entertainment share, supervision risk |
| Short notice / urgent | ≤ 14 days / ≤ 3 days | Compressed deadlines due today and marked high priority; rush buffer in contingency |
| Dietary requirements | Any listed | Dedicated caterer task and risk naming each requirement |
| Missing details | No occasion, date, guest count or budget | Follow-up questions; generation returns a clarification instead of calling the AI |

Budget allocation starts from the spec split (§11 of the product spec), applies the rule transfers in basis points (each moves at most what the source category holds), and distributes rounding remainders by largest remainder, so the categories always sum exactly to the budget. It uses BigInt internally, so totals stay exact up to `Number.MAX_SAFE_INTEGER`.

### Flow

- `POST /api/planner/chat` `{ eventId?, message }`: the AI extracts facts. Each field is validated individually and saved on the event (invalid values are dropped, past dates trigger a question). The first message without an `eventId` creates a draft event. History is capped at 20 messages.
- `POST /api/planner/generate` `{ eventId, regenerate? }`: returns `{ kind: 'clarification' }` if details are missing. Otherwise it runs engine → AI → merge → validate, then `save_generated_plan` (one transaction, running as the user so RLS applies) stores the plan version, upserts budget estimates (keeping actual spend) and replaces only unfinished generated tasks. If the event context hash is unchanged, the saved plan is reused without an AI call.
- `POST /api/events/:id/invitation/generate` `{ tone }`: drafts invitation text. It isn't saved until the user saves it.
- `GET /api/events/:id/conversation`: the bounded history.

### AI safety

- **Separation and encoding:** application rules go in the system instruction. User text is JSON-encoded (with `<` escaped) inside one `<untrusted_input>` block, and the rules say never to follow instructions found there.
- **No tools:** the model has no tools, and nothing it returns is executed.
- **Output validation:** responses are constrained by a JSON schema derived from the Zod schemas, then validated. Over-long text is trimmed; wrong shapes, enums, times and numbers are rejected (`502 AI_INVALID_OUTPUT`, nothing saved).
- **Bounded calls:** a timeout (`504`), one retry on transient provider errors only, a per-user AI rate limit, and provider errors logged by status code only.
- **Provider-neutral:** `AIProvider` is the only interface business logic uses. `gemini.ts` implements it; tests use a scripted fake.

## 13. Frontend integration (Phase 5)

- **Auth:** Supabase Auth runs in the browser (sign up, log in, log out, session restore). `AppShell` sends signed-out visitors to `/login?next=…` and back afterwards; only same-app paths are accepted as `next`.
- **Demo (D10):** "Explore the demo" signs in anonymously and calls `POST /api/demo/seed`. That endpoint is for anonymous users only, idempotent, and seeds one labelled sample event whose budget, tasks, decisions and risks come from the real engine, with pre-written sample wording instead of AI text. Signing up from a demo converts the same user (`updateUser`), so the events are kept.
- **Data:** a typed API client (`client/src/lib/api.ts`) attaches the access token and applies timeouts (20 s, or 90 s for AI calls). Failures become `ApiError` with the server's safe message, and a 401 signs the user out. TanStack Query caches responses, and every change refreshes the event's queries plus the dashboard. `GET /api/dashboard` returns everything the dashboard needs in one request.
- **Shared code:** the client imports domain types, `formatMoney`, date arithmetic and `missingDetails` from `@celebrai/shared`. Budget totals and warnings (structured, worded by the UI) always come from the server.
- **Tests:** component tests run the real routes against an in-memory fake backend (`client/src/test/fakeBackend.ts`). Playwright end-to-end tests run the real client, API and local Supabase, with axe in a real browser (including colour contrast).

## 14. Budget, checklist, timeline and invitations (Phase 6)

- **Engine suggestions without AI:** `GET /api/events/:id/suggestions` returns the engine's budget split, checklist, applied rules and missing details. It is read-only and never saves anything.
  - **Budget:** "Use suggested split" and "Compare with suggested split" show current vs suggested amounts with the reasons, and apply only after the user confirms. Recorded actual spend is kept.
  - **Checklist:** "Suggest tasks" lists the engine's tasks the user doesn't already have and adds the chosen ones with `POST /api/events/:id/tasks/bulk`. That request checks every deadline first, then inserts in one statement, so it is all-or-nothing.
- **Plan editing:** `PUT /api/events/:id/plan/schedule` saves the edited event-day agenda as a new plan version, validated against `eventPlanSchema` and sorted by time. Because the context fingerprint is unchanged, a later plain "generate" keeps the edit; "regenerate" replaces it.
- **Deadlines:** suggested tasks for an event whose date has passed are left undated. The Timeline explains how deadlines are set, using the profile time zone.
- **Invitations:** templates for all four tones are filled from the event, with bracketed placeholders for unknown details. "Write with AI" is the AI option. Sharing works through the browser share sheet, copy, a WhatsApp link (`wa.me`) or the email app (`mailto:`). No messaging integration or account access is involved.

### AI providers

`AI_PROVIDER` selects `gemini.ts` or `claude.ts`; both implement `AIProvider` and nothing else in the codebase knows which one is running. `generateStructured` sends a standard JSON Schema (from `z.toJSONSchema`) and each provider adapts it to its own dialect. Gemini keeps its supported keyword subset. Claude closes every object (`additionalProperties: false`), drops length, item-count and numeric limits, and rewrites `type: [x, "null"]` as `anyOf`. Zod re-validates every response either way.

The Claude provider uses structured outputs (`output_config.format`) at `effort: "medium"`, adds token headroom because adaptive thinking shares `max_tokens`, and opts into server-side refusal fallback (`fallbacks: "default"`). It treats `refusal` and `max_tokens` stop reasons as invalid output, allows one SDK retry, and enforces an overall deadline with an abort signal.
