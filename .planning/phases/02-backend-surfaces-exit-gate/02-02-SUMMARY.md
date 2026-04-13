---
phase: 02-backend-surfaces-exit-gate
plan: 02
subsystem: notifications
tags: [notifications, webhooks, withdrawals, dedupe, cron, p01, p06, p14, p08]
requires:
  - backend/prisma — Notification.dedupeKey @unique (Phase 1 plan 01-01)
  - backend/prisma — WebhookLog @@unique([externalId, eventType]) (Phase 1 plan 01-01)
  - backend/src/middleware/auth.ts — requireAuth (Phase 1)
  - backend/src/lib/queues/emailQueue.ts — fire-and-forget queue (Phase 1)
provides:
  - backend/prisma — Block.endingSoonNotifiedAt DateTime? cron dedupe field
  - backend/src/lib/notifications/index.ts — createNotification single entry point
  - backend/src/lib/notifications/templates.ts — 9 PROVISIONAL French templates
  - backend/src/lib/notifications/dispatch.ts — 9 typed wrappers
  - backend/src/lib/notifications/milestones.ts — pure detectCrossed helper
  - backend/src/lib/notifications/endingSoonCron.ts — runEndingSoonSweep
  - backend/src/routes/notifications.ts — feed/count/mark-read/prefs handlers
  - backend/scripts/test-notifications.ts — P01 + P06 invariant assertions
  - backend/src/routes/webhooks.ts — refactored exactly-once PAID branch
  - backend/src/routes/withdrawals.ts — payout state-transition fires
  - backend/src/index.ts — /api/notifications mount + ending-soon cron
affects:
  - backend/src/routes/webhooks.ts (PAID branch + outer log upsert)
  - backend/src/routes/withdrawals.ts (COMPLETED + REJECTED branches)
  - backend/src/index.ts (router mount + cron schedule)
tech-stack:
  added: []
  patterns:
    - WebhookLog.upsert with composite unique key inside Serializable $transaction
    - Post-COMMIT notification dispatch (NEVER inside the transaction — Neon 2s ceiling)
    - Notification.dedupeKey @unique as the at-most-once delivery contract
    - Duck-typed P2002 catch in createNotification() — silent dedup return
    - Default-safe pref gating (missing keys = enabled) via notifTypeToPrefKey()
    - Pure detectCrossed() helper called post-tx with prevTotal/newTotal
    - Block.endingSoonNotifiedAt as primary cron dedupe + Notification.dedupeKey as backstop
    - Boot catch-up setTimeout 30s after server start (P14 mitigation)
    - Cursor pagination via take: limit + 1 + cursor: { id }
    - Notification.readAt: DateTime? as the unread state (not isRead boolean)
key-files:
  created:
    - backend/prisma/migrations/20260413055909_phase2_ending_soon_dedupe/migration.sql
    - backend/src/lib/notifications/index.ts (~160 LOC)
    - backend/src/lib/notifications/templates.ts (~245 LOC)
    - backend/src/lib/notifications/dispatch.ts (~280 LOC)
    - backend/src/lib/notifications/milestones.ts (~25 LOC)
    - backend/src/lib/notifications/endingSoonCron.ts (~110 LOC)
    - backend/src/routes/notifications.ts (~190 LOC)
    - backend/scripts/test-notifications.ts (~395 LOC)
  modified:
    - backend/prisma/schema.prisma
    - backend/src/routes/webhooks.ts
    - backend/src/routes/withdrawals.ts
    - backend/src/index.ts
decisions:
  - Block.endingSoonNotifiedAt added as primary cron dedupe (RESEARCH Q8). Notification.dedupeKey is the secondary safety net. Field is set even on dedupe-hit so a cron sweep never re-evaluates a block that already failed to insert (gap-safe).
  - In-JS endDate filter (not SQL JSON path) for the ending-soon sweep — Phase 1 already accepts this tradeoff at the expected block volume (< 1000 candidates per sweep). RESEARCH Q8 explicitly documents this.
  - DB-layer dedupe (Notification.dedupeKey @unique) instead of queue jobKey — JobQueue.add(data, priority) has NO jobKey parameter (verified in queues/JobQueue.ts:74). Email enqueue happens AFTER the Notification insert succeeds, so duplicate inserts never enqueue an email.
  - Payout attempt counter deferred to v2 (T-02-20 accepted risk). Dispatcher uses constant attempt=1 because Withdrawal has no attempt counter in the schema today. Two failures on the same withdrawal collapse to one notification — acceptable v1 behavior.
  - KYC fire from manual script in 02-03. fireKycApproved/fireKycRejected exist in dispatch.ts but no route calls them yet — Phase 2 plan 02-03 will create backend/scripts/approve-kyc.ts as the only fire site (T-02-19 accepted risk).
  - Notification.readAt instead of isRead. The Phase 1 schema landed `readAt: DateTime?` (nullable timestamp), not the `isRead: Boolean` shape the plan snippet assumed. Adapted routes/notifications.ts mark-read to set `readAt = now()` and unread filter to `readAt: null`.
  - Webhook `webhookLog.create` at line 286 converted to upsert (NOT a separate task). Phase 1 added `@@unique([externalId, eventType])` so the legacy create now throws P2002 on retries; the outer create had to become an upsert to keep the dead community CM- branch and the audit log working.
  - Donor message fires post-tx for ALL non-empty messages — not just public ones. Per resolved Q1: messageIsPrivate is the public-wall masking flag from 02-01, not a creator-feed toggle. The creator sees every message; only the public donor list masks private ones.
  - Webhook fire path swallows notification errors via .catch(logger.error). A notification failure must NEVER 500 the webhook (Bictorys would retry forever, double-firing the order mutation if we ever loosened the dedupe).
  - WebhookLog.upsert appears TWICE in the handler (outer + inner-tx). The outer one keeps the legacy non-PAID branches and the dead community handler functioning; the inner-tx one is the atomic gate for the PAID branch. Both target the same composite unique key — the second upsert is a no-op on existing rows.
metrics:
  duration: ~50min
  completed: 2026-04-13
  tasks_total: 3
  tasks_completed: 3
  files_created: 8
  files_modified: 4
  loc_created: ~1410
---

# Phase 02 Plan 02: Notifications Subsystem + Webhook Exactly-Once Dispatch Summary

One-liner: Built the complete notifications subsystem (lib/notifications/* + routes/notifications.ts + ending-soon cron) on top of Phase 1's `Notification.dedupeKey @unique` constraint, refactored the webhook PAID handler to use `WebhookLog.upsert` inside a Serializable `$transaction` with post-commit notification dispatch, wired payout state-transition fires into `withdrawals.ts`, and shipped a P01/P06 dedup test harness — all P01 + P06 + P14 mitigations landed in one plan, zero new npm dependencies.

## Tasks

| Task | Name                                                                                                          | Status | Commits          |
| ---- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------- |
| 1    | Prisma migration + notifications lib (5 files)                                                                | Done   | b02e59f, c493be9 |
| 2    | Webhook PAID refactor + withdrawal hooks + routes/notifications.ts + index.ts mount/cron                      | Done   | b9e7054, 4703db8, 28931e7, 87d6ba0 |
| 3    | test-notifications.ts asserting P01 + P06 invariants                                                          | Done   | df80a9f          |

## What Shipped

### Created (8 files, ~1410 LOC)

1. **`backend/prisma/migrations/20260413055909_phase2_ending_soon_dedupe/migration.sql`** — strictly additive `ALTER TABLE "Block" ADD COLUMN "endingSoonNotifiedAt" TIMESTAMP(3);`. No backfill, no index.

2. **`backend/src/lib/notifications/index.ts`** (~160 LOC)
   - `createNotification()` — single Notification writer with prefs gate + duck-typed P2002 catch returning `{ created: false }` silently
   - `notifTypeToPrefKey()` — exhaustive mapping `NotificationType → Seller.notificationPrefs JSON key` (TypeScript `never` exhaustiveness check)
   - Email enqueue happens AFTER the insert succeeds — duplicates never enqueue
   - Honors `seller.emailUnsubscribed` and the per-category prefs (`donations | milestones | payouts | kyc | endingSoon | cagnotteEnded | donationMessages`)

3. **`backend/src/lib/notifications/templates.ts`** (~245 LOC)
   - 9 French template factories, each marked `// PROVISIONAL — confirm against Banani screen 20 in Phase 5`
   - Every user-supplied field passes through `escapeHtml()` (T-02-17 mitigation)
   - `formatFcfa()` helper normalizes Intl narrow-no-break-space to a regular space so wire format matches `formatPrice()`
   - Templates: donationReceivedTemplate, milestoneTemplate (50 + 100), endingSoonTemplate, cagnotteEndedTemplate, donationMessageTemplate, payoutCompletedTemplate, payoutFailedTemplate, kycApprovedTemplate, kycRejectedTemplate

4. **`backend/src/lib/notifications/dispatch.ts`** (~280 LOC)
   - 9 typed wrappers: `fireDonationReceived`, `fireMilestone`, `fireEndingSoon`, `fireCagnotteEnded`, `fireDonationMessage`, `firePayoutCompleted`, `firePayoutFailed`, `fireKycApproved`, `fireKycRejected`
   - Each composes deterministic `dedupeKey` + template + `createNotification`
   - Donor masking helper: anonymous donors → "Un participant anonyme" in title/body
   - `Notification.data.donorDisplayName + wasAnonymous` payload for the creator-side feed (resolved Q1 — creator sees real names behind a UI hint)
   - Structural types (`OrderForDispatch`, `BlockForDispatch`, `WithdrawalForDispatch`) keep dispatchers decoupled from Prisma include shapes

5. **`backend/src/lib/notifications/milestones.ts`** (~25 LOC) — pure `detectCrossed(prev, new, goal)` returning `(50 | 100)[]`. Zero imports, zero side effects, zero dependencies. `goalAmount <= 0` returns `[]`.

6. **`backend/src/lib/notifications/endingSoonCron.ts`** (~110 LOC)
   - `runEndingSoonSweep()` — SQL filters on `type=FUNDRAISER`, `isActive=true`, `endingSoonNotifiedAt IS NULL`
   - In-JS endDate window filter (config JSON, accepted at < 1000 candidates per sweep)
   - One try/catch per block — single failure does not abort the sweep
   - Sets `endingSoonNotifiedAt = now()` on BOTH the create-success and dedupe-hit paths so a block is never re-evaluated
   - Logs `candidates / fired / skipped / errors` only when there's something to report

7. **`backend/src/routes/notifications.ts`** (~190 LOC)
   - 5 handlers behind `requireAuth`, all filtering by `req.seller!.sub`
   - `GET /` — cursor pagination (limit 1..100, default 20), returns `{ items, nextCursor, hasUnread }`
   - `GET /count` — `{ total, unread }` via two parallel `count()` calls
   - `POST /mark-read` — Zod-validated `{ ids? | all }`, sets `readAt = now()` on matching unread rows, filters by both `sellerId` AND `id IN (…)` to prevent cross-seller mark-read (T-02-14)
   - `GET /prefs` — Seller.notificationPrefs JSON (default `{}`)
   - `PATCH /prefs` — Zod patch merge of 7 categories
   - All mutations are CSRF-checked via the parent `verifyCsrf` mount

8. **`backend/scripts/test-notifications.ts`** (~395 LOC)
   - Idempotent fixtures keyed off `TEST_RUN_ID = notif-test-{ts}`
   - Cleanup runs in `finally` so failures don't leak rows to dev DB
   - P01 assertions: 2 webhooks → 1 notification, 1 webhook log row, order PAID exactly once
   - P06 assertions: cross 50% with first ack, second ack stays ≥50% but does NOT re-fire, second order still gets its own DONATION_RECEIVED row
   - Uses the static `x-secret-key` webhook signature path (matches `verifyWebhookSignature` fallback in webhooks.ts:245)

### Modified (4 files)

1. **`backend/prisma/schema.prisma`** — added `endingSoonNotifiedAt DateTime?` on `Block` model.

2. **`backend/src/routes/webhooks.ts`**
   - Outer `webhookLog.create` (line 286) → `webhookLog.upsert` on the composite unique (Phase 1 added `@@unique([externalId, eventType])` so the legacy create now throws P2002 on retries)
   - PAID branch: replaced the prior `findFirst({status:"processed"})` race with the Q4 pattern — `tx.webhookLog.upsert` + `tx.order.findUnique({include:{block:true}})` + `tx.order.aggregate` for prevTotal + atomic mutations + `tx.webhookLog.update({status:"processed"})`, all inside `{ isolationLevel: "Serializable" }`
   - Post-transaction dispatch block: `fireDonationReceived` → `detectCrossed(prev, new, goalAmount)` → `fireMilestone(blk, t)` for each crossed threshold → `fireDonationMessage` if `order.donorMessage` non-empty
   - Each fire wrapped in `.catch(logger.error)` so a notification failure never 500s the webhook
   - `verifyWebhookSignature`, raw body parser, community CM- branch, mismatch-amount FAILED branch all untouched

3. **`backend/src/routes/withdrawals.ts`**
   - After COMPLETED status update commits → `firePayoutCompleted({id, sellerId, amount, phone, provider})` (post-commit, .catch'd)
   - After REJECTED status update commits → `firePayoutFailed({…}, userMessage, 1)` with constant `attempt=1` (T-02-20 accepted)
   - Both fires are fire-and-forget; neither inside any `$transaction`

4. **`backend/src/index.ts`**
   - Imported `notificationsRouter` and `runEndingSoonSweep`
   - Mounted `app.use("/api/notifications", writeLimiter, verifyCsrf, notificationsRouter)` between `/api/sellers` and `/api/blocks`
   - `setInterval(runEndingSoonSweep, 1h)` + `setTimeout(runEndingSoonSweep, 30s)` boot catch-up, both `.catch(logger.error)`'d

## Pitfalls Mitigated

| Pitfall | Where addressed | Mechanism |
|---------|----------------|-----------|
| **P01** Webhook double-delivery double-credit | `routes/webhooks.ts` PAID transaction | Triple-protected: `WebhookLog.upsert` on composite unique + Serializable `$transaction` (Postgres SSI aborts the loser) + post-tx `Notification.dedupeKey @unique` via duck-typed P2002 catch in `createNotification()`. |
| **P06** Concurrent webhooks crossing 50% milestone | `lib/notifications/milestones.ts` + dispatch | `detectCrossed()` runs post-commit on each handler; concurrent crossings collapse to exactly one Notification via the `dedupeKey = milestone:{blockId}:50` unique constraint. |
| **P14** (partial) Cron state lost on restart | `index.ts` ending-soon schedule | `setTimeout(runEndingSoonSweep, 30_000)` boot catch-up + `Block.endingSoonNotifiedAt` permanent dedupe. A cagnotte that entered the J-3 window during downtime is picked up on next start. |
| **P08** Long transactions exceeding Neon 2s ceiling | `routes/webhooks.ts` PAID branch | Transaction body contains zero email/network/notification work — only `webhookLog.upsert`, `order.findUnique`, `order.aggregate`, `order.update`, `customer.updateMany`, `product.update`, `webhookLog.update`. All notification work happens AFTER `await prisma.$transaction(…)` resolves. |
| **T-02-14** Cross-seller notification feed leak | `routes/notifications.ts` every handler | Every query filters by `req.seller!.sub`; `mark-read` filters by both `sellerId` AND `id IN (…)`. |
| **T-02-15** CSRF on mark-read / prefs PATCH | `index.ts` mount | `verifyCsrf` middleware applied at the router level (`app.use("/api/notifications", writeLimiter, verifyCsrf, …)`). |
| **T-02-17** Email body XSS via donor message | `lib/notifications/templates.ts` | `escapeHtml()` from `lib/utils.ts` applied to every user-supplied string in every template (donor name, donor message, cagnotte title, failure reason, masked phone). |

## Phase 1 Contracts Honored

- **`Notification.dedupeKey @unique`** — single source of truth for at-most-once delivery. Every dispatcher composes a deterministic key and `createNotification()` catches P2002 silently. Email enqueue happens AFTER the insert succeeds — `JobQueue.add()` has no `jobKey` parameter (verified in `JobQueue.ts:74`), so DB-layer dedup is the only path.
- **`WebhookLog @@unique([externalId, eventType])`** — used by both the outer audit upsert AND the inner-transaction atomic gate. The composite unique replaces the prior `findFirst({status:"processed"})` race.
- **`requireAuth` re-query** — `routes/notifications.ts` reads `req.seller!.sub` after `requireAuth` has re-fetched the seller from DB on every request (the 30s in-memory cache in `middleware/auth.ts` is preserved unchanged). No bypass.
- **Phase 1 commission helper untouched** — webhook PAID branch reads `order.amount` directly; commission was already computed at order creation time in `routes/orders.ts` (Phase 2 plan 02-01).
- **Phase 1 `Order.isAnonymous` / `messageIsPrivate`** — webhook handler projects them into `OrderForDispatch` and dispatcher uses them for the public-name masking + private-message dispatch decision.

## Build / Test State

```
$ cd backend && npm run build
> tsc
exit: 0   (zero TypeScript errors)

$ cd backend && npx prisma migrate status
5 migrations found in prisma/migrations
Database schema is up to date!
exit: 0

$ git log --oneline -8
df80a9f test(02-02): test-notifications.ts asserting webhook dedup + milestone re-fire prevention
87d6ba0 feat(02-02): mount /api/notifications + ending-soon cron + boot catch-up
28931e7 feat(02-02): authed notifications routes (feed/count/mark-read/prefs)
4703db8 feat(02-02): wire payout notifications in withdrawals
b9e7054 refactor(02-02): webhook exactly-once dispatch + post-tx notifications
c493be9 feat(02-02): notifications lib (createNotification + templates + dispatch + milestones + cron)
b02e59f feat(02-02): add Block.endingSoonNotifiedAt for ending-soon cron dedupe
7b61c85 docs(02-01): complete backend-surfaces-exit-gate plan 01
```

The standalone test harness (`scripts/test-notifications.ts`) is type-clean and ready to run against a live `npm run dev` server. It is intentionally NOT auto-executed during this plan — Phase 2 plan 02-03 (exit-gate smoke test) is the place where the seeded end-to-end run is wired into CI.

## Open Items Deferred

| Item | Where it lands |
|------|---------------|
| KYC notification fire from manual script | Phase 2 plan 02-03 (`backend/scripts/approve-kyc.ts`) |
| `CAGNOTTE_ENDED` notification fire (when a cagnotte hits its endDate) | Phase 2 plan 02-03 — needs a cagnotte-ended sweep cron similar to ending-soon |
| Withdrawal `attemptCount` schema field for proper PAYOUT_FAILED dedup | v2 (T-02-20 accepted) |
| Notification table 90-day retention cron (analogous to webhook log cleanup) | v2 (T-02-16 accepted) |
| Banani screen-20 confirmed copy for the 9 templates | Phase 5 — every template factory carries `// PROVISIONAL — confirm against Banani screen 20 in Phase 5` comment |
| Replace setInterval-based crons with a proper scheduler (BullMQ / Quirrel) | v2 — current single-instance assumption documented in CLAUDE.md and circuit breaker rationale |

## Threat Model Disposition

All 10 Phase 2 02-02 threats from the plan's `<threat_model>` are satisfied:

- **T-02-11** (webhook double-delivery) — `WebhookLog @@unique` upsert + Serializable tx + `Notification.dedupeKey @unique`. Triple-protected.
- **T-02-12** (concurrent milestone crossings) — `detectCrossed` post-commit + `Notification.dedupeKey @unique` P2002 catch.
- **T-02-13** (cron + webhook race firing ending-soon twice) — `Block.endingSoonNotifiedAt` set on both create-success AND dedupe-hit paths; `Notification.dedupeKey` is the secondary safety net.
- **T-02-14** (cross-seller feed leak) — every query in `routes/notifications.ts` filters by `req.seller!.sub`; `mark-read` filters by both `sellerId` AND `id IN (…)`.
- **T-02-15** (CSRF on mark-read) — `verifyCsrf` mounted at the router level.
- **T-02-16** (Notification table growth) — accepted, v2.
- **T-02-17** (XSS via donor message) — `escapeHtml()` on every user-supplied template field.
- **T-02-18** (anonymous donor real name leak) — public-facing strings use "Un participant anonyme"; `Notification.data.donorDisplayName + wasAnonymous` payload only on the creator-side feed.
- **T-02-19** (KYC fire without admin oversight) — accepted; only the manual script in 02-03 will call `fireKycApproved`. dispatch.ts exports the wrapper but no route uses it.
- **T-02-20** (PAYOUT_FAILED missing attempt counter) — accepted, constant `attempt=1`, v2 adds the schema field.

## Deviations from Plan

**Auto-fixes applied (Rules 1-3, no user permission needed):**

1. **[Rule 3 — Blocking] Outer `webhookLog.create` → `upsert`.**
   - **Found during:** Task 2.1 webhook refactor planning
   - **Issue:** The plan's task list focused exclusively on the PAID-branch transaction. But `webhooks.ts:286` does a standalone `prisma.webhookLog.create()` BEFORE any branching, and Phase 1 added `@@unique([externalId, eventType])` on `WebhookLog`. A duplicate webhook delivery (which is exactly what P01 protects against) would now hit P2002 from this outer create and crash the handler before the new triple-protected dedup path runs.
   - **Fix:** Converted the outer create to `prisma.webhookLog.upsert({ where: { externalId_eventType: {…} }, create: {…}, update: {} })`. This keeps the dead community CM- branch and the audit log functioning while allowing the inner-transaction upsert to perform the actual gating.
   - **Files modified:** `backend/src/routes/webhooks.ts` (lines 285-300)
   - **Commit:** b9e7054
   - **Why this is critical:** without this fix, the entire P01 mitigation is dead code — the test harness in Task 3 would 500 on the second webhook call before reaching the dedup gate.

2. **[Rule 1 — Bug] Adapted `routes/notifications.ts` to `Notification.readAt: DateTime?`.**
   - **Found during:** Task 2.3 notifications routes implementation
   - **Issue:** The plan's snippet (lines 400-473) used `isRead: Boolean` — the field name a typical notification system would use. But the Phase 1 schema landed `readAt: DateTime?` (nullable timestamp). The literal plan snippet would not compile.
   - **Fix:** Adapted: "unread" = `readAt: null`, mark-read sets `readAt = now()`, the response model exposes `readAt` directly so the frontend can render relative timestamps ("lu il y a 3h").
   - **Files modified:** `backend/src/routes/notifications.ts` (multiple)
   - **Commit:** 28931e7

3. **[Rule 1 — Bug] Replaced `req.user!.id` with `req.seller!.sub` in `routes/notifications.ts`.**
   - **Found during:** Task 2.3
   - **Issue:** The plan snippet used `req.user!.id` — a generic auth shape — but the project uses `req.seller!.sub` (the JWT payload's `sub` claim, attached by `middleware/auth.ts` after re-querying the DB). The plan snippet would not compile.
   - **Fix:** Replaced all 5 occurrences. No behavior change.
   - **Commit:** 28931e7

**Implementation detail clarifications (no behavior change, no rule applied):**

1. **Cron `endingSoonNotifiedAt` is set on dedupe-hit too.** The plan's pseudo-code only updates the field after a successful `created === true` fire. But if `Notification.dedupeKey` already exists (e.g. from an out-of-band test insert or a concurrent sweep that committed first), the cron would re-evaluate that block on every tick forever. I set the field on both paths so a block is permanently retired from the candidate set after one sweep. The dedupe-hit log-line is preserved in the sweep stats so observability isn't lost.

2. **Community CM- branch `updateMany` left untouched.** The plan's `<behavior>` says "the existing `handleCommunityPaymentWebhook` dead branch is NOT touched (CLAUDE.md rabbit-hole rule)". I confirmed the dead branch's `webhookLog.updateMany` still works because the outer upsert ensures the row exists. No deviation.

3. **`fireCagnotteEnded` exists in dispatch.ts but is not called yet.** The plan's `<artifacts>` section listed 8 wrappers; I shipped 9 (added `fireCagnotteEnded`) so plan 02-03's cagnotte-ended cron has a typed wrapper to call. Zero risk — if 02-03 ends up using a different shape, the unused export is dead code that tree-shakes out.

## Threat Flags

None. The plan introduces no new outbound network surface (notification dispatch piggybacks on the existing `lib/email.ts` / Resend path), no new auth paths, no new file I/O, and no schema changes at trust boundaries (the single column added is a server-controlled timestamp, not user input).

## Self-Check: PASSED

- [x] Migration `20260413055909_phase2_ending_soon_dedupe` applied; `Block.endingSoonNotifiedAt` exists in DB
- [x] `backend/src/lib/notifications/index.ts` exists with `createNotification` + `notifTypeToPrefKey` exports
- [x] `backend/src/lib/notifications/templates.ts` exists with 9 template factories (donation/milestone×2/endingSoon/ended/donorMessage/payout×2/kyc×2)
- [x] `backend/src/lib/notifications/dispatch.ts` exists with 9 typed wrappers + `OrderForDispatch`/`BlockForDispatch`/`WithdrawalForDispatch` structural types
- [x] `backend/src/lib/notifications/milestones.ts` exists with pure `detectCrossed`
- [x] `backend/src/lib/notifications/endingSoonCron.ts` exists with `runEndingSoonSweep`
- [x] `backend/src/routes/notifications.ts` exists with 5 handlers behind `requireAuth`
- [x] `backend/scripts/test-notifications.ts` exists with P01 + P06 invariant assertions
- [x] `backend/src/routes/webhooks.ts` outer `webhookLog.create` converted to `upsert`
- [x] `backend/src/routes/webhooks.ts` PAID branch uses Serializable `$transaction` + post-tx dispatch
- [x] `backend/src/routes/withdrawals.ts` fires `firePayoutCompleted` after COMPLETED + `firePayoutFailed` after REJECTED
- [x] `backend/src/index.ts` mounts `/api/notifications` between `/api/sellers` and `/api/blocks` with `writeLimiter + verifyCsrf`
- [x] `backend/src/index.ts` schedules `setInterval(runEndingSoonSweep, 1h)` + `setTimeout(runEndingSoonSweep, 30s)` boot catch-up
- [x] `cd backend && npm run build` exits 0 (zero TypeScript errors)
- [x] `cd backend && npx prisma migrate status` shows "Database schema is up to date!"
- [x] Commit b02e59f (Task 1.1 — migration) found in git log
- [x] Commit c493be9 (Task 1.2 — notifications lib) found in git log
- [x] Commit b9e7054 (Task 2.1 — webhook refactor) found in git log
- [x] Commit 4703db8 (Task 2.2 — withdrawal hooks) found in git log
- [x] Commit 28931e7 (Task 2.3 — notifications routes) found in git log
- [x] Commit 87d6ba0 (Task 2.4 — index mount + cron) found in git log
- [x] Commit df80a9f (Task 3 — test harness) found in git log
- [x] Zero new npm dependencies (no `package.json` change)
