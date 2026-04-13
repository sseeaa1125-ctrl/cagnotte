# Phase 03 — Deferred Items

Issues discovered during Phase 3 execution that are OUT OF SCOPE per GSD rules (not caused by this phase's changes). Logged here for triage in a later cleanup pass.

## Pre-existing backend lint issues (discovered during Plan 03-01)

Running `npm run lint` at repo root surfaces 20 problems (7 errors, 13 warnings) all located under `backend/` — these pre-existed before Plan 03-01 started (confirmed via `git stash` + `npm run lint`).

**Errors (7):**
- `backend/scripts/introspect-phase1.ts` — 6× `@typescript-eslint/no-explicit-any`
- `backend/scripts/seed-coaches.ts:126` — `prefer-const` (`baseSlug` never reassigned)

**Warnings (13):**
- `backend/dist/lib/notifications/templates.js:148` — `_input` unused
- `backend/dist/routes/sellers.js:336` — `blocksCount` unused
- `backend/dist/routes/webhooks.js:13` — `_id` unused
- `backend/scripts/seed-coaches.ts` — `PAYMENT_STATUSES`, `pickN` unused
- `backend/scripts/test-notifications.ts:35` — `crypto` unused
- `backend/src/lib/notifications/templates.ts:218` — `_input` unused
- `backend/src/lib/payout.ts:1` — `crypto` unused
- `backend/src/routes/auth.ts:16` — `verifyToken` unused
- `backend/src/routes/orders.ts:8,14` — `formatPrice`, `getFromR2` unused
- `backend/src/routes/sellers.ts:346` — `blocksCount` unused
- `backend/src/routes/webhooks.ts:20` — `_id` unused

**Why deferred:**
- Phase 3 is a **frontend-only** phase. Backend code is untouched.
- These are not regressions caused by Plan 03-01 changes.
- Fixing them would expand scope and the `backend/dist/**` warnings come from compiled output that ideally should be lint-ignored at the config level.

**Recommended next step:**
- Add `backend/dist/**` to ESLint ignores in `eslint.config.mjs`.
- Delete or fix the unused imports/params in `backend/src/**` and `backend/scripts/**` in a dedicated `chore(backend): lint cleanup` commit.
- This is out of scope for Phase 3 frontend foundations but should be addressed before the first production deploy.

Frontend `src/` is lint-clean: `npx eslint src/` returns 0 problems.
