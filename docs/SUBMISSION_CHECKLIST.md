# Hack2Skills Challenge 5 – Submission Checklist

Final audit: 2 Nov 2026 (Phase 9), at commit `abdeb6d` plus this documentation update. Each item notes its evidence.

## Challenge rules

- [x] Repository is public. – GitHub API without authentication: `"visibility": "public"`.
- [x] Exactly one branch exists: `main`. – `git ls-remote origin`: only `refs/heads/main`, no tags.
- [x] Repository size is below 10 MB, including Git history. – 321 KB on GitHub (`size-pack` 333 KB); largest blob ever committed is `package-lock.json` (389 KB).
- [x] Complete project code is present. – A fresh clone of the public repository installs, typechecks, lints, builds and passes 140 unit/component tests with no extra files.
- [x] README explains selected vertical, approach, logic, workflow, and assumptions.
- [x] Submission uses the Celebration and Event Planner vertical. – "[Challenge 5] Celebration & Event Planner".
- [x] Final submission details match the challenge's official submission guide. – Public repo, deployed link, Drive video (anyone with the link), change and GenAI descriptions, public LinkedIn post; attempt 1 scored 95.63.

## Product readiness

- [x] Landing page works. – Production check 1 ([DEPLOYMENT.md §9](DEPLOYMENT.md#9-deployment-record)).
- [x] Authentication works, or demo mode is clearly isolated. – Sign-up/login e2e (local Supabase); demo uses a separate anonymous account and is labelled "Demo account".
- [x] User can create and retrieve an event. – Production check 4; `api.int.test.ts` (EVT-01/02).
- [x] AI asks follow-up questions when critical information is missing. – Live assistant asked only for the date; `planner.int.test.ts` (Scenario 7).
- [x] AI returns structured, validated output. – JSON Schema structured output, validated with Zod; malformed output rejected (Scenario 8).
- [x] Recommendations use event context. – Theme, decisions and tasks follow occasion, guests, budget, venue and dietary needs (`engine.test.ts` scenarios 1–7).
- [x] Backend validates budget arithmetic. – Server-calculated overrun on production ("Over budget by ₹1,000"); BUD-01..04 tests.
- [x] User can edit and save plan data. – Budget, tasks, schedule (saved as a new plan version) and invitation edits persist (e2e).
- [x] Checklist and timeline work. – Production check 8; e2e.
- [x] Invitation text can be edited and copied. – Clipboard copy, share, WhatsApp and email (`app.test.tsx` › Invitation studio).
- [x] Loading, empty, and error states exist. – `QueryStates`, `EmptyState` and `RouteStates`, used across the data screens.
- [x] Mobile layout is usable. – Production check 12 and the e2e mobile test (no horizontal overflow).

## Security

- [x] No `.env` files are tracked. – Only `client/.env.example` and `server/.env.example`; no `.env` file ever appears in history.
- [x] No API keys or credentials are in source or Git history. – Full-history scan for Anthropic, Google, Supabase, GitHub, JWT and private-key patterns: no matches.
- [x] AI provider key is backend-only. – Read only by the server config; no `VITE_` variable holds a secret.
- [x] Supabase service-role key is backend-only. – Not used by the running API at all; integration tests read it from the local stack at runtime.
- [x] JWT verification is enforced. – AUTH-03/04 tests, including a forged-signature token.
- [x] Ownership is checked for all event and child-resource endpoints. – Cross-user tests (Scenario 10) and production check 10 (API 404).
- [x] RLS is enabled and tested. – RLS on all 6 hosted tables; direct-table RLS tests with two users.
- [x] Inputs and model outputs are validated. – Strict Zod schemas, database CHECK constraints, schema-validated model output.
- [x] AI output is treated as untrusted. – Validated before use; amounts and dates come from the engine, never the model.
- [x] Rate limits and request limits are configured. – General API limit, AI per-user/per-IP limits, daily quotas, global daily cap, 100 KB body limit.
- [x] Errors and logs do not leak sensitive data. – Generic error messages; Render logs show method, path, status and duration only.

## Testing

- [x] Production build succeeds.
- [x] Type checking succeeds.
- [x] Lint succeeds. – 0 errors (6 fast-refresh warnings at submission; 0 warnings since 4 Nov).
- [x] Unit tests pass. – shared 12, server 67, client 61.
- [x] API integration tests pass. – 52 against a real local Supabase with two users.
- [x] Main end-to-end journey passes. – 5 / 5 Playwright journeys.
- [x] Budget edge cases pass. – Exact overrun, negative/fractional/unsafe amounts, rounding remainder, safe-integer boundary.
- [x] Cross-user access tests pass.
- [x] Accessibility checks completed. – axe on 12 screens and in real Chromium (incl. contrast); keyboard-only e2e test.
- [x] Production deployment manually tested. – [DEPLOYMENT.md §9](DEPLOYMENT.md#9-deployment-record).

Full results: [SECURITY_AND_QA_REPORT.md](SECURITY_AND_QA_REPORT.md). Since 4 Nov every suite above also runs in GitHub Actions on each push; post-submission changes are listed in its §3a.

## Git checks

```bash
git status
git branch --show-current
git branch -a
git remote -v
git count-objects -vH
git ls-files
```

Expected current branch: `main`.

Inspect all branches and tags as appropriate. Remove unnecessary branches locally and remotely so the GitHub repository has exactly one branch. Avoid adding large assets or build outputs. Remember that deleting a large file in a later commit does not remove it from Git history.

## Final README checks

- [x] Correct repository URL.
- [x] Verified live frontend URL.
- [x] Verified backend URL, if appropriate.
- [x] Setup instructions work from a clean clone. – Verified with a fresh clone of the public repository.
- [x] Environment variables documented without real values.
- [x] Screenshots are genuine and optimized, if included. – No screenshots in the repository (keeps it small); the demo video is linked from the submission instead.
- [x] Known limitations are disclosed.
- [x] Author information is accurate.

## Submission attempt discipline

The challenge allows a maximum of three attempts. Before each submission:
1. Read the official submission guide.
2. Verify repository visibility and branch count.
3. Verify repository size.
4. Open the live application in a fresh browser session.
5. Run the main user journey.
6. Confirm README and URLs.
7. Save the final commit hash and submission confirmation.

Do not use an attempt until all mandatory checks have been reviewed.

**Submission record:** attempt 1 on 2 Nov 2026 at commit `ded65ba`, AI evaluation score 95.63 / 100 (Code Quality 86, Security 99, Efficiency 100, Testing 96, Accessibility 98, Problem Statement Alignment 98).
