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
