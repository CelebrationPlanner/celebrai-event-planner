# CelebrAI – Security and QA Report

Follows the template in [TESTING_PLAN.md §10](TESTING_PLAN.md#10-qa-report-template). Only results that were actually executed are reported.

```text
Date:          2 Nov 2026
Commit:        Phase 7 completion commit (on top of ded65ba)
Frontend URL:  https://celebrai-planner.netlify.app
Backend URL:   https://celebrai-api-jd3j.onrender.com/api/health
```

## 1. Automated results

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | Pass (all workspaces) |
| Lint | `npm run lint` | Pass – 0 errors; 6 pre-existing `only-export-components` (fast-refresh) warnings |
| Shared unit tests | `npm test -w shared` | 12 / 12 pass |
| Server unit tests | `npm test -w server` | 67 / 67 pass |
| API integration tests (real local Supabase, two users) | `npm run test:integration -w server` | 52 / 52 pass |
| Client tests (incl. axe on 12 screens) | `npm test -w client` | 61 / 61 pass |
| Production build | `npm run build` | Pass |
| End-to-end (Playwright, real browser + API + database) | `npm run test:e2e -w client` | 5 / 5 pass (desktop + mobile) |

Total automated tests: 192 unit, integration and component tests plus 5 end-to-end journeys. Mapping of every test-plan case to its test: [TESTING_PLAN.md §4a](TESTING_PLAN.md#4a-where-each-case-is-tested).

## 2. Security audit

A focused audit was run with three independent reviewers; each finding was verified against the code before it was accepted.

**Confirmed and fixed (commit b48e5da, each with a regression test):**

| Finding | Fix |
|---|---|
| Anonymous demo users could be minted repeatedly to multiply AI spend | Per-user and per-IP AI rate limits, daily quotas (10 for anonymous, 50 for accounts) and a global daily cap that returns 503 without calling the provider (`server/src/app.ts`, `security.int.test.ts`) |
| Theme/dietary tags written directly through the Supabase Data API bypassed API length limits and could inflate AI prompts | `tags_valid()` CHECK constraints in the database (`20261102000000_security_hardening.sql`) |
| Login `next` parameter could be shaped into an off-site redirect (`/\evil.com`, tab/newline tricks) | Stricter `safeNext` allow-pattern (`safeNext.test.ts`) |
| An invalid time zone stored directly in a profile could break date logic | Validated with a fallback to Asia/Kolkata (`security.int.test.ts`) |

Also hardened: execute permission on trigger functions revoked from client roles; indexes added for per-user task and plan queries.

**Checked and found sound:** cross-user access (API ownership filters + RLS + composite foreign keys; other users' resources return 404), stored/reflected XSS (React escaping, no `dangerouslySetInnerHTML`, strict CSP without inline scripts), secrets in git history (none; service-role key never used by the running API; AI keys server-side only).

**Accepted residual risks:**

| Risk | Why accepted / mitigation |
|---|---|
| No CAPTCHA on anonymous sign-in | AI cost is bounded by per-IP, per-user and global caps; Supabase hCaptcha/Turnstile can be enabled without code changes |
| `trust proxy` is set to one hop (Render) | Correct for the current host; a different topology needs this reviewed or per-IP limits could be weakened (per-user and global caps still apply) |
| Direct Data API writes skip API business rules | RLS restricts them to the caller's own rows (self-impact only); key limits are mirrored as database constraints |
| Concurrent schedule edits can race on the plan version | Self-impact only; the later save wins as a new version |
| Double-starting the demo can seed the sample twice | Self-impact only, on a temporary anonymous account |
| Session stored in `localStorage` (Supabase default) | Mitigated by the strict CSP; no third-party scripts |
| `npm audit` reports issues in dev-only tooling (shadcn CLI) | Not shipped to the browser or server bundle |

## 3. Phase 7 changes in this commit

- **Keyboard test (A11Y-01).** A new Playwright test drives the demo, skip link, event tabs and a dialog with the keyboard only and checks visible focus.
- **Bug found and fixed: dialog focus return.** The test showed that closing a dialog (e.g. *Edit Venue*) left focus on the page body: Radix returns focus only to a `DialogTrigger`, and the app opens dialogs from plain buttons. The shared `DialogContent` now remembers the element that had focus when it opened and returns focus to it, fixing every dialog in the app.
- **Smaller entry bundle.** The browser only uses Supabase Auth, so it now builds the auth client alone (configured exactly as supabase-js does, same session storage key) instead of the full client with database, storage and realtime code. Entry chunk: **208.7 → 176.7 KB gzipped** (693 → 578 KB raw).
- **More reliable axe scans in e2e.** Scans now wait for finite animations to settle; scanning during the landing fade-in reported translucent text as low contrast.
- **Intermittent client test.** One earlier run failed once; 17 later runs (6 under deliberate CPU load) all passed. The historical failures all stopped at the 5 s Testing Library wait limit under heavy load, i.e. slow test timing rather than an application defect. Timeouts were not raised blindly; revisit if it recurs.

## 4. End-to-end and accessibility

All five Playwright journeys run against the real client, API and local Supabase with no AI key (so AI actions must fail gracefully, never fake a plan):

1. Sign up → create event → budget overrun → checklist → invitation → reload persists → log out protects screens (axe in real Chromium, incl. colour contrast).
2. Demo: isolated sample event with the engine's decisions (axe).
3. Keyboard only: demo, skip link, event tabs, dialog focus trap and focus return.
4. Engine suggestions (budget split, tasks) and schedule editing without AI.
5. Mobile (Pixel 7): no horizontal overflow on any event screen.

Accessibility: labelled inputs with errors linked by `aria-describedby`, visible focus rings, skip link, landmarks, chart text summaries, `prefers-reduced-motion` respected, axe clean on 12 screens (jsdom) and on the journeys above (real browser).

## 5. Manual production checks (2 Nov 2026)

| Check | Result |
|---|---|
| Frontend reachable publicly | Pass – HTTP 200 for `/` and deep links |
| API health | Pass – `{"status":"ok"}` |
| CORS | Pass – only the Netlify origin is allowed |
| Demo / anonymous sign-in, session restore | Pass |
| AI assistant (live Claude) | Pass – extracted occasion, city, guests and budget; asked only for the date |
| Full AI plan generation (live Claude) | Pass – 200 in 35 s, plan saved and fetched |
| Event creation, budget overrun, task update, persistence after refresh | Pass |
| Cross-user access | Pass – a second demo user got API 404 and "Event not found"; RLS enabled on all hosted tables |
| Logout, mobile layout, logs | Pass |
| Email sign-up / login | Not run on production (email confirmation is on); covered by e2e against local Supabase |

Full record: [DEPLOYMENT.md §9](DEPLOYMENT.md#9-deployment-record).

**Known limitations:** costs are estimates, venue/vendor availability is never claimed, the free Render instance sleeps when idle (first request can take ~50 s), and rate-limit counters are in memory (single instance).

**Release decision:** READY.
