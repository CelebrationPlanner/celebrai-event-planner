# CelebrAI – Smart Celebration & Event Planner

**Hack2Skills Challenge 5 · Celebration and Event Planner**

CelebrAI is a full-stack AI-assisted event-planning application. It helps users turn an occasion, date, location, guest count, budget, and preferences into an actionable event plan.

> Status: Project specification and implementation documentation. Update deployment URLs, screenshots, and implementation status only after verifying the running application.

## Project goals

- Understand event requirements expressed in natural language.
- Ask follow-up questions when essential information is missing.
- Generate structured, context-aware event plans.
- Validate budgets deterministically in the backend.
- Let users save and edit plans, expenses, tasks, timelines, and invitations.
- Clearly identify estimates, assumptions, and unverified information.

## Challenge vertical

**Celebration and Event Planner**

## Recommended stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript |
| UI | Tailwind CSS, Shadcn UI, Lucide React |
| Motion and charts | Framer Motion, Recharts |
| Backend | Node.js, Express, TypeScript |
| Validation | Zod |
| AI | Gemini API behind a provider interface |
| Database and auth | Supabase PostgreSQL and Supabase Auth |
| Testing | Vitest, React Testing Library, Supertest, Playwright |
| Hosting | Vercel (frontend), Render (API), Supabase (database/auth) |

Claude Code is the AI-assisted development environment. The deployed application uses a separately configured AI provider; do not confuse the coding agent with the runtime AI service.

## Main features

1. Dashboard and event management.
2. Event creation wizard.
3. AI event assistant and structured plan generation.
4. Budget allocation and expense tracking.
5. Theme and activity recommendations.
6. Preparation checklist and event-day timeline.
7. Invitation text generator.
8. Authentication and per-user data isolation.

## Repository structure

```text
celebrai-event-planner/
├── package.json        # npm workspaces
├── client/             # React + Vite SPA
├── server/             # Express API
├── shared/             # Zod schemas, money/date/budget logic shared by client and server
├── supabase/
│   └── migrations/
├── docs/
├── README.md
└── .gitignore
```

See the files in `docs/` for the product specification, architecture, Claude Code prompts, testing plan, deployment guide, and submission checklist.

## Local setup

Prerequisites: a supported Node.js LTS release, npm, Git, a Supabase project, and an AI provider API key.

```bash
git clone https://github.com/YOUR_USERNAME/celebrai-event-planner.git
cd celebrai-event-planner
```

Install all workspaces from the repository root:

```bash
npm install
```

Start the local database and auth stack (requires Docker). This applies `supabase/migrations/`:

```bash
npx supabase start
```

Create `client/.env` and `server/.env` from the corresponding `.env.example` files, using the URL and anon key printed by `npx supabase status`. Never commit real credentials.

Run the backend and frontend in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

Database integration tests (two real users, RLS and cross-user access) run against the local stack:

```bash
npm run test:integration -w server
```

After changing a migration, regenerate the typed database client with `npm run db:types -w server`.

## Security principles

- Keep AI provider secrets and Supabase service-role credentials on the server only.
- Verify authentication tokens on protected API routes.
- Enforce ownership checks and Supabase Row Level Security.
- Validate input and AI output with Zod.
- Apply rate limits and request-size limits to AI endpoints.
- Do not execute AI-generated code, SQL, or shell commands.
- Do not claim vendor availability or live prices without verified integrations.
- Avoid logging tokens, API keys, or unnecessary personal data.

## Important assumptions and limitations

- Budget values are estimates unless backed by verified quotations.
- Venue and vendor availability must be independently confirmed unless a trusted live integration is implemented.
- AI suggestions may be incomplete or incorrect; users should review plans.
- Weather and other changing conditions require a reliable external data source.
- The initial release should prioritize a reliable core workflow over integrations that are not necessary for the challenge.

## Testing

See [`docs/TESTING_PLAN.md`](docs/TESTING_PLAN.md). At minimum, test authentication, event ownership, AI schema validation, budget arithmetic, task persistence, and the end-to-end event-planning journey.

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Verify the live frontend, API, database policies, and a complete user journey before publishing deployment links.

## Submission links

- Live application: _Add verified URL_
- Backend API: _Add verified URL_
- Public GitHub repository: _Add URL_

## Author

Ashutosh Gaikwad  
GitHub: https://github.com/gaikwadashutosh35

**CelebrAI — Plan Better. Celebrate Smarter.**
