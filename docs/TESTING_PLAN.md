# CelebrAI – Testing and Quality Assurance Plan

## 1. Testing objectives

Verify that CelebrAI is useful, secure, predictable, accessible, and reliable. Prioritize business-critical behavior over a vanity code-coverage percentage.

## 2. Recommended tools

| Area | Tool |
|---|---|
| Unit tests | Vitest |
| React component tests | React Testing Library |
| API integration | Supertest |
| End-to-end | Playwright |
| Accessibility | axe-core |
| Static checks | TypeScript, ESLint |
| Dependency review | npm audit or an equivalent maintained scanner |

Use versions compatible with the selected Node.js and framework versions.

## 3. Critical test matrix

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| AUTH-01 | Sign up with valid data | Account created | Critical |
| AUTH-02 | Login with valid credentials | Session established | Critical |
| AUTH-03 | Call protected endpoint without token | 401 response | Critical |
| AUTH-04 | Expired/invalid token | Request rejected | Critical |
| EVT-01 | Create valid event | Event persisted | Critical |
| EVT-02 | Retrieve own event | Event returned | Critical |
| EVT-03 | Access another user's event | No data disclosed | Critical |
| EVT-04 | Submit invalid guest count/date | Validation error | High |
| AI-01 | Complete event context | Structured plan returned | Critical |
| AI-02 | Missing critical date | Clarifying question returned | High |
| AI-03 | Malformed AI JSON | Rejected safely | Critical |
| AI-04 | AI provider timeout | Clear recoverable error | High |
| BUD-01 | Allocations equal budget | Balanced result | Critical |
| BUD-02 | Allocations exceed budget | Overrun reported | Critical |
| BUD-03 | Negative amount | Rejected | Critical |
| BUD-04 | Rounding remainder | Deterministic total | High |
| TASK-01 | Complete task | Change persisted | High |
| INV-01 | Generate invitation text | Editable text returned | Medium |
| UI-01 | Mobile viewport | No horizontal overflow | High |
| A11Y-01 | Keyboard navigation | Controls reachable and usable | High |

## 4. Required decision scenarios

### Scenario A – Birthday with a fixed budget

Input:
- Occasion: Birthday
- Guests: 50
- Budget: ₹30,000
- Planning time: 10 days
- Venue preference: Outdoor

Expected:
- Suitable theme suggestion.
- Catering and venue needs considered.
- Budget total validated.
- Outdoor contingency included.
- Preparation tasks prioritized.

### Scenario B – Large wedding

Input:
- Occasion: Wedding
- Guests: 200
- Budget: ₹5,00,000
- Planning time: 90 days

Expected:
- Larger-scale recommendations.
- More detailed task schedule.
- Capacity and catering constraints flagged.
- No fabricated venue availability.

### Scenario C – Small anniversary

Input:
- Occasion: Anniversary
- Guests: 20
- Budget: ₹15,000
- Venue preference: Indoor

Expected:
- Intimate celebration recommendations.
- Budget-conscious theme.
- Appropriate timeline.

### Scenario D – Very limited budget

Input:
- Occasion: Birthday
- Guests: 30
- Budget: ₹5,000

Expected:
- Clearly identify trade-offs.
- Prioritize essential items.
- Avoid claiming that every desired feature can fit.
- Provide lower-cost alternatives.

### Scenario E – Incomplete context

Input:
- Occasion: Birthday
- Budget: ₹10,000
- No date or guest count.

Expected:
- Ask relevant follow-up questions.
- Do not invent guest count or exact event schedule.

### Scenario F – Budget overrun

Input:
- Budget: ₹20,000
- Proposed category allocations total: ₹24,000.

Expected:
- Backend reports ₹4,000 overrun.
- UI displays warning.
- User can review suggested reductions.
- The backend never silently changes the budget.

## 4a. Where each case is tested

Every matrix row and scenario above maps to automated tests (`int` = integration tests against a real local Supabase with two real users).

| ID / scenario | Test |
|---|---|
| AUTH-01 Sign up | `client/e2e/journey.spec.ts` main journey (real sign-up); `client/src/app/app.test.tsx` › validates the signup form before contacting the server |
| AUTH-02 Login | `app.test.tsx` › sends signed-out visitors to login and back to where they were going |
| AUTH-03 No token | `server/src/app.test.ts` › authentication gate (AUTH-03 / AUTH-04) |
| AUTH-04 Invalid token | `app.test.ts` › authentication gate; `server/src/api.int.test.ts` › rejects a well-formed token with a forged signature |
| EVT-01, EVT-02, EVT-04 | `api.int.test.ts` › events (EVT-01, EVT-02, EVT-04) |
| EVT-03 Another user's event | `api.int.test.ts` › cross-user isolation (Scenario 10 / EVT-03) and database-level protection (RLS + composite foreign keys) |
| AI-01 Structured plan | `server/src/planner.int.test.ts` › generates and saves a plan whose numbers come from the engine; `server/src/ai/claude.test.ts`, `gemini.test.ts` |
| AI-02 Missing date | `planner.int.test.ts` › asks for missing details instead of calling the model; `server/src/engine/engine.test.ts` › Scenario 7 |
| AI-03 Malformed JSON | `planner.int.test.ts` › rejects malformed model output and saves nothing; `server/src/ai/ai.test.ts` |
| AI-04 Provider timeout | `planner.int.test.ts` › maps provider timeouts and outages to safe errors |
| BUD-01 Balanced | `shared/src/shared.test.ts` › balances when allocations equal the budget |
| BUD-02 Overrun | `shared.test.ts` and `api.int.test.ts` › reports the exact overrun and never changes the budget |
| BUD-03 Negative amount | `api.int.test.ts` › rejects negative, fractional, unsafe and duplicate amounts; `app.test.tsx` › rejects negative amounts before sending |
| BUD-04 Rounding remainder | `engine.test.ts` › always sums exactly to the budget, for awkward amounts and every rule combination; `shared.test.ts` › stays exact at the safe-integer boundary |
| TASK-01 Complete task | `api.int.test.ts` › tasks (TASK-01); `app.test.tsx` › Checklist |
| INV-01 Invitation | `api.int.test.ts` › saves the invitation text and tone; `planner.int.test.ts` (invitation generation); `client/src/features/invitations/templates.test.ts`; `app.test.tsx` › Invitation studio |
| UI-01 Mobile viewport | `journey.spec.ts` › mobile: dashboard and event screens fit the viewport |
| A11Y-01 Keyboard | `journey.spec.ts` › keyboard: demo, skip link, event tabs and dialog focus without a mouse |
| Scenario A (birthday, ₹30,000, outdoor) | `engine.test.ts` › Scenario 1; `planner.int.test.ts` › Scenario 1 |
| Scenario B (wedding, ₹5,00,000) | `engine.test.ts` › Scenario 2 |
| Scenario C (anniversary, ₹15,000) | `engine.test.ts` › Scenario 3 |
| Scenario D (₹5,000 budget) | `engine.test.ts` › Scenario 4 |
| Scenario E (incomplete context) | `engine.test.ts` › Scenario 7; `planner.int.test.ts` › asks only for what is missing, then remembers earlier answers; `app.test.tsx` › shows follow-up questions |
| Scenario F (overrun ₹20,000 vs ₹24,000) | `shared.test.ts`, `api.int.test.ts` › Scenario 9; `journey.spec.ts` main journey (UI warning) |

Accessibility checks (§8) are automated by axe in `client/src/app/a11y.test.tsx` (12 screens) and in real Chromium in `journey.spec.ts` (including colour contrast); focus visibility and dialog focus are asserted by the keyboard test.

## 5. Unit tests

Test pure functions independently:
- Budget total calculation.
- Remaining balance.
- Overrun detection.
- Currency-unit validation.
- Date and deadline validation.
- Task priority sorting.
- Event readiness calculation, if implemented.
- AI output schema validation.

Use integer amounts in a consistent currency unit. Include zero, maximum supported value, invalid values, and rounding edge cases.

## 6. API integration tests

Test:
- Authentication middleware.
- Event CRUD.
- Ownership checks.
- Child resource ownership.
- Zod validation.
- Rate limiting.
- Provider errors.
- Database failures.
- Safe error responses.

Use an isolated test project/database or controlled mocks. Never run destructive tests against production user data.

## 7. End-to-end test

The main Playwright journey:

1. Open application.
2. Sign up or use clearly isolated demo mode.
3. Create a birthday event.
4. Enter budget, date, location, and guest count.
5. Submit event context.
6. Answer any follow-up question.
7. Generate plan.
8. Verify theme and recommendations.
9. Verify backend budget total.
10. Edit a budget category.
11. Complete a task.
12. Generate and edit invitation.
13. Refresh page.
14. Verify event and changes persist.
15. Log out and verify protected screens are inaccessible.

## 8. Accessibility checks

- All inputs have labels.
- Buttons have accessible names.
- Keyboard focus is visible.
- Dialogs manage focus correctly.
- Color is not the only way to communicate status.
- Charts have textual summaries.
- Motion respects reduced-motion preference.
- Text contrast is adequate.
- Errors are announced and associated with fields.

## 9. Release gate

Do not submit until:
- Production build succeeds.
- Type checking and linting succeed.
- Critical tests pass.
- No known cross-user data access issue remains.
- AI malformed output is handled.
- Budget invariants pass.
- Main end-to-end journey passes.
- Production environment variables are configured.
- Live deployment has been manually verified.

## 10. QA report template

```text
CelebrAI QA Report
Date:
Commit:
Frontend URL:
Backend URL:

Build:
Typecheck:
Lint:
Unit tests:
API tests:
E2E tests:
Accessibility:

Critical issues:
High issues:
Known limitations:

Manual production checks:
- Signup/login:
- Event creation:
- AI plan generation:
- Budget update:
- Task update:
- Persistence after refresh:
- Cross-user access:

Release decision: READY / NOT READY
```

Report actual results only. Do not mark a check passed without executing it.
