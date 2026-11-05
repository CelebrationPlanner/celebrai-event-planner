# CelebrAI – Smart Celebration & Event Planner

**Hack2Skills Challenge 5 · Vertical: Celebration and Event Planner**

CelebrAI turns a sentence like *"My daughter's 5th birthday in Pune for 40 guests, ₹25,000, she loves princesses, in 12 days"* into a complete, editable plan: theme, budget split, prioritised checklist, timeline, event-day schedule, risks and an invitation — and explains **why** it recommends each thing.

- **Live app:** https://celebrai-planner.netlify.app
- **API health:** https://celebrai-api-jd3j.onrender.com/api/health (free tier: the first request after idle can take ~50 s)
- **Repository:** https://github.com/CelebrationPlanner/celebrai-event-planner
- **Try it without an account:** press **Explore the demo** on the landing page (an isolated, temporary account with a sample event).

---

## The approach: deterministic engine + AI

The core design decision is to split every planning decision into two kinds and never let the AI decide the kind that must be right.

| Decided by the backend engine (`server/src/engine/`) | Written by the AI (`server/src/ai/`) |
|---|---|
| Which details are missing and what to ask | A friendly acknowledgement of what the user said |
| Which planning rules apply (table below) | Theme, tailored to preferences, with reasoning |
| Budget split per category, in exact integer paise | Recommendations: what, why, assumptions |
| Checklist and deadlines (never past, never after the event) | Event-day agenda, extra risks and tasks |
| Fixed assumptions (estimates ≠ quotes; availability unverified) | Invitation wording in four tones |

The AI returns structured JSON validated with Zod; the backend then fills in every cost and date from the engine and validates the merged plan again before saving. Arithmetic, dates, permissions and validation never depend on the model.

### Decision rules (logical decision-making)

| Rule | Trigger | What the plan does |
|---|---|---|
| Tight budget | Budget per guest below ₹400 / $15 / €15 / £12 (×3 for weddings) | Food and space first; photography, entertainment, décor and printed invitations scaled back; "ask a friend for photos" replaces a photographer |
| Large guest count | ≥ 150 guests | More budget to food and venue; venue capacity flagged *to verify* |
| Outdoor venue | Outdoor preference | Extra contingency; weather-backup task and risk |
| Children attending | Children/teens age group or a 1st–12th birthday | Age-appropriate entertainer, larger entertainment share, supervision risk |
| Short notice / urgent | ≤ 14 days / ≤ 3 days | Compressed deadlines due today and marked high priority; rush buffer |
| Dietary requirements | Any listed | Dedicated caterer task and risk naming each requirement |
| Missing details | No occasion, date, guest count or budget | Asks follow-up questions; generation returns a clarification instead of calling the AI |

The budget split starts from a documented default (venue 20%, food 30%, décor 15%, photography 10%, entertainment 10%, invitations 3%, miscellaneous 2%, contingency 10%), applies the rule transfers in basis points, and distributes rounding remainders deterministically, so categories **always sum exactly** to the budget (BigInt-safe up to `Number.MAX_SAFE_INTEGER`). Every decision is shown to the user under **"How CelebrAI decided"**.

### Context understanding

The assistant extracts facts from natural language ("in 12 days" → a date, "5 lakh" → ₹5,00,000) into the event record itself. Each extracted field is validated on its own; anything invalid, injected or in the past is dropped, never saved. Follow-up questions come from the backend's list of what is still missing, so the assistant **never re-asks** for something the user already said.

---

## Features

- **Landing page** with event examples, how it works and a working demo.
- **Authentication** (Supabase Auth): sign up, log in, log out, session restore, protected routes, and an isolated **anonymous demo** that can be upgraded to a real account without losing data.
- **Dashboard**: upcoming events, total budget, active/completed tasks, progress, recent activity.
- **Create-event wizard** with step validation, plus **edit** and **delete**.
- **AI assistant**: natural-language intake, follow-up questions, conversation history, plan generation, regeneration, and schedule editing (saved as a new plan version).
- **Smart budget planner**: estimates vs actuals, remaining/overrun from the server, chart with a text summary, warnings, cost-saving ideas, and an engine **suggested split** applied only after review.
- **Checklist**: add, edit, complete, filter, delete with undo, priorities, due dates, progress, and engine **suggested tasks** without AI.
- **Timeline**: dated preparation milestones (vendor, invitation, shopping) and the event-day agenda.
- **Invitation studio**: formal, friendly, traditional and modern tones (AI or built-in templates), editing, preview, copy, share, WhatsApp and email.

---

## Architecture

```text
Browser (React + Vite + TypeScript, Netlify)
   │  HTTPS + Supabase access token
   ▼
Express API (TypeScript, Render) ──► AI provider (Claude or Gemini, server-side only)
   │  user-scoped Supabase client per request
   ▼
Supabase Postgres + Auth (Row Level Security on every table)
```

- `client/` – React 19, Tailwind v4, shadcn/ui, TanStack Query (the budget chart is plain CSS). The landing page and four occasion guides (birthday, wedding, baby shower, anniversary) are pre-rendered to static HTML at build time (`src/prerender.tsx`, `scripts/prerender.mjs`) so crawlers that don't run JavaScript see their content. Each guide's worked example is engine output, checked by `server/src/engine/occasionExamples.test.ts`.
- `server/` – Express 5, Zod, engine, AI providers, REST modules.
- `shared/` – Zod schemas, money/date helpers and budget maths shared by client and server.
- `supabase/migrations/` – schema, constraints, indexes, RLS, transactional plan save.

Provider-neutral AI: business logic depends only on an `AIProvider` interface; `AI_PROVIDER=claude|gemini` selects the implementation. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Security

- **Ownership enforced three ways:** API filters by the verified user id; every request runs as the signed-in user so **RLS** applies; child tables carry a composite foreign key `(event_id, user_id)` so rows can't attach to another user's event. Other users' resources return **404** (no existence disclosure).
- **No service-role key in the running API**; AI keys exist only on the server.
- **Validation everywhere:** strict Zod schemas (unknown fields such as `userId` rejected), database CHECK constraints mirroring API limits, 100 KB body limit, 2,000-char messages, bounded conversation history.
- **AI safety:** system rules separate from user text; user text JSON-encoded inside one untrusted block; model output schema-validated; no tools or code execution; costs/dates never from the model.
- **AI spend guards:** per-user and per-IP AI rate limits, daily quotas (lower for anonymous demo users) and a global daily cap that answers 503 without calling the provider.
- **Transport:** helmet headers on the API, strict CSP on the frontend (`netlify.toml`), single-origin CORS, generic error messages, logs without bodies or tokens, open-redirect guard on login.
- A focused security audit with three independent reviewers was run; its findings were fixed and tested. Findings, fixes and accepted residual risks: [docs/SECURITY_AND_QA_REPORT.md](docs/SECURITY_AND_QA_REPORT.md).

---

## Testing

| Suite | What it covers | Command |
|---|---|---|
| Shared (Vitest) | Budget maths incl. safe-integer edge, time-zone dates, schema rules | `npm test -w shared` |
| Server unit (Vitest + Supertest) | Engine scenarios 1–9, AI parser and prompt isolation, mocked Claude/Gemini SDKs, auth gate, headers, CORS, rate limits | `npm test -w server` |
| Server integration (real local Supabase, two real users) | Cross-user isolation (Scenario 10), RLS, composite FKs, budget overrun, planner chat/generate/reuse, malformed AI output, timeouts, AI spend guards | `npm run test:integration -w server` |
| Client (Vitest + Testing Library + axe) | Every screen against an in-memory backend; accessibility scan of 12 screens | `npm test -w client` |
| End-to-end (Playwright + axe in a real browser) | Sign up → create → budget overrun → checklist → invitation → refresh persists → log out; demo; keyboard-only navigation and dialog focus; engine suggestions; mobile layout | `npm run test:e2e -w client` |

The ten challenge scenarios (birthday ₹30,000; wedding ₹5,00,000; anniversary ₹15,000; birthday ₹5,000; outdoor weather; three days away; missing date and guests; malformed AI JSON; budget overrun; cross-user access) each have dedicated tests.

---

## Accessibility

Labelled inputs with errors announced via `aria-describedby`, visible focus states, keyboard-operable controls, skip link, landmarks, charts with text summaries, colour pairs checked against WCAG AA, `prefers-reduced-motion` respected, and automated axe scans in unit and real-browser tests.

---

## Assumptions and limitations

- Costs are **estimates** from typical prices, not vendor quotations.
- Venue and vendor **availability is never claimed**; the plan says to confirm directly.
- Weather and traffic are not fetched from live sources.
- AI suggestions should be reviewed; amounts and dates come from the engine.
- Money is stored as integer minor units (paise/cents); supported currencies: INR (default), USD, EUR, GBP.
- In-memory rate-limit counters suit a single API instance.

---

## Local setup

Prerequisites: Node.js 22+, npm, Docker (for local Supabase).

```bash
npm install
npx supabase start
```

Create `client/.env` and `server/.env` from the `.env.example` files using the URL and anon key from `npx supabase status`. Add `ANTHROPIC_API_KEY` (with `AI_PROVIDER=claude`) or `GEMINI_API_KEY` for AI features; without a key the app runs and AI actions explain that the planner is unavailable.

```bash
npm run dev:server
npm run dev:client
```

Checks: `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` (all run in GitHub Actions on every push, together with the integration and end-to-end suites against a local Supabase stack; `npm run format` applies the Prettier style).

## Documentation

[Product specification](docs/PROJECT_SPECIFICATION.md) · [Architecture and decisions](docs/ARCHITECTURE.md) · [Testing plan](docs/TESTING_PLAN.md) · [Deployment](docs/DEPLOYMENT.md) · [Environment variables](docs/ENVIRONMENT_VARIABLES.md) · [Security and QA report](docs/SECURITY_AND_QA_REPORT.md) · [Submission checklist](docs/SUBMISSION_CHECKLIST.md)

## Author

Ashutosh Gaikwad · GitHub: [gaikwadashutosh35](https://github.com/gaikwadashutosh35)

**CelebrAI — Plan Better. Celebrate Smarter.**
