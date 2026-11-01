# Hack2Skills Challenge 5 – Submission Checklist

## Challenge rules

- [ ] Repository is public.
- [ ] Exactly one branch exists: `main`.
- [ ] Repository size is below 10 MB, including Git history.
- [ ] Complete project code is present.
- [ ] README explains selected vertical, approach, logic, workflow, and assumptions.
- [ ] Submission uses the Celebration and Event Planner vertical.
- [ ] Final submission details match the challenge's official submission guide.

## Product readiness

- [ ] Landing page works.
- [ ] Authentication works, or demo mode is clearly isolated.
- [ ] User can create and retrieve an event.
- [ ] AI asks follow-up questions when critical information is missing.
- [ ] AI returns structured, validated output.
- [ ] Recommendations use event context.
- [ ] Backend validates budget arithmetic.
- [ ] User can edit and save plan data.
- [ ] Checklist and timeline work.
- [ ] Invitation text can be edited and copied.
- [ ] Loading, empty, and error states exist.
- [ ] Mobile layout is usable.

## Security

- [ ] No `.env` files are tracked.
- [ ] No API keys or credentials are in source or Git history.
- [ ] AI provider key is backend-only.
- [ ] Supabase service-role key is backend-only.
- [ ] JWT verification is enforced.
- [ ] Ownership is checked for all event and child-resource endpoints.
- [ ] RLS is enabled and tested.
- [ ] Inputs and model outputs are validated.
- [ ] AI output is treated as untrusted.
- [ ] Rate limits and request limits are configured.
- [ ] Errors and logs do not leak sensitive data.

## Testing

- [ ] Production build succeeds.
- [ ] Type checking succeeds.
- [ ] Lint succeeds.
- [ ] Unit tests pass.
- [ ] API integration tests pass.
- [ ] Main end-to-end journey passes.
- [ ] Budget edge cases pass.
- [ ] Cross-user access tests pass.
- [ ] Accessibility checks completed.
- [ ] Production deployment manually tested.

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

- [ ] Correct repository URL.
- [ ] Verified live frontend URL.
- [ ] Verified backend URL, if appropriate.
- [ ] Setup instructions work from a clean clone.
- [ ] Environment variables documented without real values.
- [ ] Screenshots are genuine and optimized, if included.
- [ ] Known limitations are disclosed.
- [ ] Author information is accurate.

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
