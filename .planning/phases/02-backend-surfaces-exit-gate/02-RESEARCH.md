# Phase 2: Backend Surfaces & Exit Gate — Research

**Researched:** 2026-04-13
**Domain:** Express 5 routes + Prisma + Bictorys + notifications subsystem (rebuild)
**Confidence:** HIGH
**Phase goal:** Every endpoint the 24 Banani screens will call is live, rate-limited, idempotent, smoke-tested; Phase 0 exit gate is green.
**Depends on:** Phase 1 — schema + slug + FUNDRAISER extension + commission helper all live and verified.

---

## Summary

Phase 2 is a wiring phase: no new libraries, no new runtime deps, no new schema columns (with two possible exceptions — see Q7/Q8 below). Every mitigation of the 7 critical pitfalls (P01 webhook dedup, P03 commission drift, P05 private leak, P06 notification re-fire, P07 orders DDoS) lands on concrete file paths that already exist or are new but trivial to place.

The most important finding is that the **auth gap-fill is already 100% shipped by the fork** — `change-password`, `forgot-password`, `reset-password`, `verify-email`, `POST /api/sellers/kyc`, `POST /api/sellers/withdrawal-pin`, `GET /api/withdrawals/balance`, and `POST /api/withdrawals` (KYC-gated, PIN-gated) all exist in production code. Plan 02-03 is therefore a **verification + smoke-test + CLAUDE.md refresh** plan, not a build plan.

The second-most-important finding is that `JobQueue.add()` has **NO `jobKey` dedupe parameter** — dedupe MUST live at the `Notification.dedupeKey @unique` DB layer. The email itself is the notification side-effect and the dedupe insert prevents the email from being enqueued twice.

**Primary recommendation:** three plans cleanly map to three isolated surfaces:
- **02-01** = two route files (`routes/cagnottes.ts` NEW + `routes/orders.ts` EXTEND) + one tiny `lib/payments/circuitBreaker.ts` NEW
- **02-02** = five new files in `lib/notifications/` + hooks into 3 existing handlers + `routes/notifications.ts` NEW + optional `Block.endingSoonNotifiedAt` migration
- **02-03** = one seed script + one smoke-test script + CLAUDE.md edits (pure verification, no new logic)

---

## User Constraints (from CONTEXT.md)

No `/gsd-discuss-phase` ran for Phase 2 — no CONTEXT.md exists yet. Constraints below are inherited from `.planning/PROJECT.md` Key Decisions and Phase 1 contracts.

### Inherited Locked Decisions

- **Notifications rebuild is in scope** (user explicitly confirmed 2026-04-13).
- **Single `createNotification()` entry point** enforced by `Notification.dedupeKey @unique`.
- **French copy only**, drafts grounded in Banani screen 20 (see Q5 below).
- **Commission 6% solidaire / 8% festive**, hard-coded basis points — Phase 1 `computeCommission` is the single source of truth. Phase 2 replaces `Math.round` bug in `routes/orders.ts:212`.
- **Private cagnottes = URL obscurity only** — SQL-level `visibility='public'` filter on list; detail endpoint returns private cagnottes if the slug is known.
- **Rate-limit contract** — 20/min IP + 100/hour IP + 5/min per `customerEmail`, circuit breaker on 5 Bictorys failures in 30s, PENDING TTL reduced 30→10 min.
- **No new package.json deps** — everything must be hand-rolled on existing `express-rate-limit` + `RedisRateLimitStore`.
- **No test framework added** — `smoke-test.ts` is a standalone tsx script using `assert` from `node:assert/strict`.

### Claude's Discretion

- Whether to add `Block.endingSoonNotifiedAt DateTime?` (recommended, see Q8) and `Block.milestonesNotified Int[]` (recommended, see Q7) as a tiny Phase 2 migration, or to dedupe purely via `Notification.dedupeKey` lookups.
- Exact circuit breaker implementation (in-memory counter vs Redis) — recommend in-memory for simplicity (Q3).
- Smoke-test harness style — recommend `node:assert/strict` + tiny fetch wrapper (Q11).

### Deferred Ideas (OUT OF SCOPE)

- Cagnotte detail edge cache (Vercel/Cloudflare 60s) — `open question 1` in SUMMARY, deferred.
- `SlugHistory` 301 redirects for slug rename — v2.
- Admin panel for commission override — v2.
- Token-based private cagnotte access — v2.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISC-01 | `GET /api/cagnottes` paginated public list | Q12 Prisma select, Q13 SQL-level visibility filter |
| DISC-02 | `GET /api/cagnottes/:slug` detail, includes private by slug | Q12 payload shape, Q13 Cache-Control branch |
| DISC-03 | `GET /api/cagnottes/:slug/participants` paginated, masks anonymous | Q12 participants subquery |
| DISC-04 | Private detail returns `Cache-Control: private, no-store` | Q13 enforcement snippet |
| DISC-05 | Public detail cacheable (SSR + webhook revalidation) | Out of scope Phase 2 (FE concern) — document header |
| DONA-01 | `POST /api/orders` supports donation with all fields | Existing, extend with Q2 fields |
| DONA-02 | `isAnonymous` flag | Phase 1 column exists, Phase 2 wires through schema |
| DONA-03 | `messageIsPrivate` flag | Phase 1 column exists, Phase 2 wires through schema |
| DONA-05 | 20/min IP + 100/hour IP + 5/min per email + circuit breaker | Q2, Q3 |
| DONA-07 | `GET /api/orders/:ref/status` polling | Already exists in `routes/orders.ts` — verify in smoke-test |
| DONA-08 | Webhook exactly-once on PAID | Q4 pessimistic lock + `WebhookLog @@unique` + post-tx notif dispatch |
| NOTF-01 | Single `createNotification()` entry point | Q6 contract |
| NOTF-02 | DONATION_RECEIVED on PAID | Q4 hook point |
| NOTF-03 | MILESTONE_REACHED at 50%/100% dedup | Q7 pre/post diff |
| NOTF-04 | CAGNOTTE_ENDING_SOON at J-3 | Q8 cron + dedupe field |
| NOTF-05 | DONATION_MESSAGE when donor leaves message | Q4 hook point |
| NOTF-06 | PAYOUT_COMPLETED / PAYOUT_FAILED | Q6 withdrawals hook |
| NOTF-07 | KYC_APPROVED / KYC_REJECTED | Q6 KYC hook (manual trigger — no admin UI yet) |
| NOTF-08 | `GET /api/notifications` cursor feed | Q6 route |
| NOTF-09 | `GET /api/notifications/count` | Q6 route |
| NOTF-10 | `POST /api/notifications/mark-read` | Q6 route |
| NOTF-11 | `GET/PATCH /api/notifications/prefs` | Q6 route, reads `Seller.notificationPrefs Json?` |
| NOTF-12 | Email dispatch enqueued via existing `emailQueue` | Q6, dedupe at DB level not queue level |
| AUTH-01 | `change-password` | **ALREADY SHIPPED** — `PUT /api/auth/change-password` line 702. Verify in smoke-test only. |
| AUTH-02 | `forgot-password` / `reset-password` | **ALREADY SHIPPED** — `POST /api/auth/forgot-password` line 573, `POST /api/auth/reset-password` line 644. Verify in smoke-test only. |
| AUTH-03 | `verify-email` | **ALREADY SHIPPED** — `POST /api/auth/verify-email` line 305. Verify in smoke-test only. |
| KYC-01 | `POST /api/sellers/kyc` | **ALREADY SHIPPED** — line 270. Verify in smoke-test only. |
| KYC-02 | Withdrawal rejects non-approved KYC | **ALREADY SHIPPED** — `withdrawals.ts:178`. Verify in smoke-test only. |
| KYC-03 | Withdrawal PIN enforced | **ALREADY SHIPPED** — `withdrawals.ts:184` + `sellersRouter.post("/withdrawal-pin")` line 936. Verify in smoke-test only. |
| KYC-04 | `GET /api/withdrawals/balance` | **ALREADY SHIPPED** — `withdrawals.ts:93`. Verify in smoke-test only. |
| VERI-01 | `seed-dev.ts` | Q11 |
| VERI-02 | `smoke-test.ts` | Q11 |
| VERI-05 | Smoke-test asserts P01/P03/P05 | Q15 |
| VERI-06 | `npm run build` zero errors | Phase gate |
| VERI-07 | CLAUDE.md refreshed | Q14 |

**Key finding:** out of 35 requirements, **8 are already fully shipped** by the fork and only need smoke-test assertions (AUTH-01..03, KYC-01..04, DONA-07). This drastically reduces 02-03 scope.

---

## Project Constraints (from CLAUDE.md)

1. **No new runtime deps.** Phase 2 must not touch `backend/package.json` except possibly to remove dead ones. Verified: every need is covered by `express-rate-limit` (installed), `RedisRateLimitStore` (existing), `JobQueue` (existing), `@prisma/client` (via custom output path).
2. **Prisma client import path** — always `../../generated/prisma/client.js`, never `@prisma/client`. Rule from Phase 1.
3. **Custom generated Prisma output** — do not move or rename `backend/src/generated/prisma/`.
4. **All amounts are integers (FCFA).** No `Float`.
5. **All API inputs Zod-validated.**
6. **Every webhook signature verified timing-safe BEFORE acting** — existing `verifyWebhookSignature()` at `webhooks.ts:219` already does this. Do not touch.
7. **Bictorys dual keys** — `BICTORYS_API_KEY` for charges, `BICTORYS_PRIVATE_KEY` for payouts. Never mix. (Phase 2 doesn't touch payouts — withdrawal flow already correct.)
8. **No OAuth, no NextAuth, no Stripe, no Axios, no Framer Motion, no MongoDB** — irrelevant to Phase 2, listed for completeness.
9. **`requireAuth` re-queries seller from DB on every request** — already enforced in `middleware/auth.ts`. Do not bypass.
10. **French only** in user-facing text; Prisma enums SCREAMING_SNAKE_CASE; API routes kebab-case; utilities camelCase.
11. **Raw body parser for `/api/webhooks`** must remain first in middleware chain (currently at `index.ts:59`). Do not move.
12. **Don't try to clean the orphan Prisma schema as a side task — it's a rabbit hole.** Phase 2 adds zero columns beyond the optional `Block.endingSoonNotifiedAt` / `Block.milestonesNotified` (Q7/Q8). No orphan-model pruning.

---

## Standard Stack

Zero new dependencies. Every package below is already installed and battle-tested in the fork.

### Core (unchanged from Phase 1)

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | 5.x | Router, middleware chain |
| `zod` | 3.x | Input validation on every new route |
| `express-rate-limit` | — | Per-IP, per-email, global, write limiters |
| `@prisma/client` (via custom path) | — | DB access, `$transaction`, `$queryRaw` |
| `ioredis`/`@upstash/redis` | — | `RedisRateLimitStore`, `JobQueue` backing |
| `jose` | — | JWT sign/verify in `lib/auth.ts` |
| `helmet` | — | Already mounted |
| `cors` | — | Already configured for `ALLOWED_ORIGINS` |

### Supporting (existing)

| Module | Purpose for Phase 2 |
|--------|---------------------|
| `backend/src/lib/commission.ts` | `computeCommission()` — replaces `Math.round` bug in `orders.ts:212` |
| `backend/src/lib/cagnottes/slug.ts` | `slugify`, `ensureUniqueSlug`, `BLOCK_RESERVED_SLUGS` — used by block creation |
| `backend/src/lib/queues/emailQueue.ts` | `queueAuthEmail`, `queueTransactionalEmail`, `queueStandardEmail` — notifications dispatch emails here |
| `backend/src/lib/auth.ts` | `verifyCsrf`, `createAccessToken`, `createRefreshToken`, `hashPassword`, `verifyPassword` — all present |
| `backend/src/middleware/auth.ts` | `requireAuth` — mounts under `notificationsRouter` |
| `backend/src/lib/rateLimitStore.ts` | `RedisRateLimitStore(prefix)` — one instance per limiter |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled circuit breaker | `opossum` npm package | +24 KB, +1 dep, +config complexity. Our need is 30 LOC. Skip. |
| `JobQueue` jobKey dedupe | Dedupe at Notification.dedupeKey insert | Schema-level dedupe is stronger (unique index), already in place. Use DB. |
| `Block.endingSoonNotifiedAt` | Lookup `Notification.dedupeKey LIKE 'ending_soon:%'` | One indexed column vs one SELECT per cron tick. Field is cheaper and more obvious. **Recommend add.** |
| `Block.milestonesNotified Int[]` | Lookup `Notification.dedupeKey = 'milestone:blockId:50'` | Dedup via Notification is already unique — no extra column needed. **Recommend skip**, use Notification lookup. |
| Vitest for smoke-test | `node:assert/strict` + tsx | Vitest adds 25 MB + config + watcher. Our smoke-test is 150 LOC. Skip. |

**Installation:**

```bash
# Phase 2 installs ZERO new packages.
# Only a Prisma migration if Q8 recommendation is accepted:
cd backend && npx prisma migrate dev --name phase2_ending_soon_dedupe
```

**Version verification (existing deps):**

```bash
cd backend && npm ls express express-rate-limit @prisma/client zod
```

Already green per Phase 1 build gate.

---

## File Map (every file to create or modify, with LOC estimate)

### Plan 02-01 — Public cagnottes + orders extension

| Action | Path | LOC | Notes |
|--------|------|-----|-------|
| **CREATE** | `backend/src/routes/cagnottes.ts` | ~250 | 3 public GET handlers: list (paginated, SQL visibility filter), detail (by slug, Cache-Control branch), participants (paginated, mask anonymous, omit private messages) |
| **CREATE** | `backend/src/lib/payments/circuitBreaker.ts` | ~50 | In-memory state: `{failures: number; openedAt: number | null}`. Exports `recordSuccess()`, `recordFailure()`, `isOpen(): boolean`. 5 failures in 30s → open for 60s. |
| **MODIFY** | `backend/src/routes/orders.ts` | +40/-20 | Extend `createOrderSchema` with `isAnonymous`, `messageIsPrivate`, `cagnotteSlug` (optional). Replace `commissionRate = seller.customCommissionRate ?? (seller.plan === "PRO" ? 400 : 800)` + `Math.round` (lines 211–213) with `computeCommission(totalExpected, block.config.subtype)` for FUNDRAISER orders. Wire `circuitBreaker` around the `provider.createTransaction` call. Add `isAnonymous`/`messageIsPrivate` to `tx.order.create`. |
| **MODIFY** | `backend/src/routes/orders.ts` (limiter block, line 50–57) | +30/-8 | Replace single `createOrderLimiter` (10/min by IP) with three composed limiters: `orderIpMinuteLimiter` (20/min IP), `orderIpHourLimiter` (100/hour IP), `orderEmailMinuteLimiter` (5/min per `customerEmail` via custom `keyGenerator`). All three apply in sequence via `ordersRouter.post("/", ipMin, ipHour, emailMin, handler)`. |
| **MODIFY** | `backend/src/index.ts` | +2 | Import `cagnottesRouter`, mount at `app.use("/api/cagnottes", cagnottesRouter)`. Position: after line 109 (`/api/orders` mount), before `/api/webhooks`. No CSRF (GET-only public). Picks up global limiter automatically via `/api` prefix — BUT the global limiter has `skip` for `/api/orders`, `/api/withdrawals`, `/api/auth` — cagnottes is NOT skipped, gets 300/15min for free. |
| **MODIFY** | `backend/src/index.ts` (line 89–93) | +0/-1 line | Remove `/api/orders` from global limiter skip list — the dedicated limiters in orders.ts will cover it, and removing the skip means burst traffic still hits the 300/15min ceiling. **Alternative:** keep the skip and trust the dedicated limiters. Recommend **keep skip** — the dedicated 20/min IP is tighter than 300/15min anyway (20/min × 15 = 300). |
| **MODIFY** | `backend/src/index.ts` (setInterval section, line 205) | +0 | **No change needed** — current 5-min tick is fine if Q2 TTL is reduced from 30 to 10min. Alternative: reduce tick to 2min. Recommend **keep 5-min**, reduce TTL in `expirePendingOrders` to 10min. |
| **MODIFY** | `backend/src/lib/cagnottes/slug.ts` integration | +10 (in `routes/blocks.ts` POST handler) | Wire `slugify` + `ensureUniqueSlug` into `POST /api/blocks` for FUNDRAISER type. **Note:** this is technically out of Phase 2's stated cagnottes.ts scope — move to 02-01 or to 02-03's "gap verification" step depending on phase commit hygiene. Recommend include in **02-01** since it's the only place that creates the slug the new routes will serve. |

**Plan 02-01 total:** ~380 LOC new + ~50 LOC modified

### Plan 02-02 — Notifications lib + hooks + routes

| Action | Path | LOC | Notes |
|--------|------|-----|-------|
| **CREATE** | `backend/src/lib/notifications/index.ts` | ~120 | `createNotification({sellerId, type, dedupeKey, title, body, icon, blockId?, orderId?, withdrawalId?, data?, emailTier?: 'critical'|'transactional'|'standard'})`. Catches Prisma P2002 on `dedupeKey` → returns silently (idempotent). Reads `seller.notificationPrefs Json?` → if category disabled, skip email enqueue. |
| **CREATE** | `backend/src/lib/notifications/templates.ts` | ~180 | 9 template factories — one per `NotificationType`. Each returns `{title, body, icon, emailSubject, emailHtml}` in French. Grounded in Banani screen 20 copy (see Q5). |
| **CREATE** | `backend/src/lib/notifications/dispatch.ts` | ~80 | Typed wrappers: `fireDonationReceived(order, block)`, `fireMilestone(block, threshold)`, `fireEndingSoon(block)`, `fireDonationMessage(order, block)`, `firePayoutCompleted(withdrawal)`, `firePayoutFailed(withdrawal, reason, attempt)`, `fireKycApproved(seller)`, `fireKycRejected(seller, reason)`. Each computes `dedupeKey` + calls `createNotification`. |
| **CREATE** | `backend/src/lib/notifications/milestones.ts` | ~40 | Pure helper: `detectCrossed(prevTotal, newTotal, goalAmount): (50 \| 100)[]` — returns thresholds crossed in this transaction. Used by webhook post-tx. |
| **CREATE** | `backend/src/routes/notifications.ts` | ~180 | `GET /`, `GET /count`, `POST /mark-read`, `GET /prefs`, `PATCH /prefs`. All behind `requireAuth`. Cursor pagination on feed (20/page default, max 100). |
| **MODIFY** | `backend/src/routes/webhooks.ts` | +40 | Replace the webhook log idempotency pattern (current: `findFirst({where: {externalId, eventType, status:"processed"}})` at line 353). Phase 1 added `@@unique([externalId, eventType])`, so use `upsert({where: {externalId_eventType: {...}}, create: {...}, update: {}})` pattern. On upsert returning `status === "processed"` → return 200 early. Else: begin `$transaction({isolationLevel:"Serializable"})`, recompute `prevTotal = sum(PAID orders)` → mutate order → `newTotal = prevTotal + order.amount` → commit. POST-transaction (outside `$transaction` block): `detectCrossed(prevTotal, newTotal, goalAmount)` + `fireDonationReceived` + `fireMilestone` + `fireDonationMessage` (if `donorMessage`). |
| **MODIFY** | `backend/src/routes/withdrawals.ts` | +10 | Add `firePayoutCompleted(withdrawal)` after line 340 (status=COMPLETED). Add `firePayoutFailed(withdrawal, failureReason, attempt)` after line 367 (status=REJECTED). |
| **MODIFY** | `backend/src/routes/sellers.ts` (KYC submit handler) | +6 | After KYC submit at line 306, the webhook for admin approval doesn't exist yet — KYC approval is still manual/off-platform per PROJECT.md. Add hook sites for `fireKycApproved` / `fireKycRejected` with a TODO comment pointing to v2 admin panel. Actual firing happens when an admin toggles status manually in Prisma Studio — document in CLAUDE.md. |
| **MODIFY** | `backend/src/index.ts` | +20 | (a) Import `notificationsRouter`, mount: `app.use("/api/notifications", writeLimiter, verifyCsrf, notificationsRouter)` after line 107. (b) Import `runEndingSoonSweep`, add `setInterval(runEndingSoonSweep, 60 * 60 * 1000)` + `setTimeout(runEndingSoonSweep, 30_000)` (boot catch-up). |
| **CREATE** | `backend/src/lib/notifications/endingSoonCron.ts` | ~50 | `runEndingSoonSweep()` — finds `Block WHERE type=FUNDRAISER AND isActive AND endDate BETWEEN now AND now+3d AND (endingSoonNotifiedAt IS NULL OR dedupeKey check)`. For each → `fireEndingSoon(block)` → set `endingSoonNotifiedAt = now()`. |
| **CREATE** (optional) | `backend/prisma/migrations/TIMESTAMP_phase2_ending_soon_dedupe/migration.sql` | ~5 | `ALTER TABLE "Block" ADD COLUMN "endingSoonNotifiedAt" TIMESTAMP(3)`. Document as strictly-additive, idempotent. If omitted, fall back to `Notification.dedupeKey` lookup (slower, less obvious, still correct). **Recommend add.** |

**Plan 02-02 total:** ~700 LOC new + ~80 LOC modified

### Plan 02-03 — Auth/KYC verification + seed + smoke + CLAUDE.md

| Action | Path | LOC | Notes |
|--------|------|-----|-------|
| **CREATE** | `backend/scripts/seed-dev.ts` | ~250 | 2 sellers (one KYC_APPROVED, one NONE), 4 fundraisers (2 festive + 2 solidaire, 1 private), 10 paid orders mixed anonymity, 5 notifications per seller via `createNotification`. Uses Prisma `upsert` patterns for idempotency. |
| **CREATE** | `backend/scripts/smoke-test.ts` | ~400 | Node-only harness — `node:assert/strict` + `fetch` + cookie jar. Spawns server? No — assume server is running on `localhost:4000`. Sequence: signup → verify-email (reads code from DB) → login (capture `izy-token` + `csrf`) → GET /api/cagnottes → GET /api/cagnottes/:slug → POST /api/orders → simulate Bictorys webhook (crafted payload + HMAC header) → GET /api/notifications → mark-read → KYC + withdrawal flow. 15 asserts total. Exits 1 on any failure. |
| **MODIFY** | `CLAUDE.md` | ~30 lines changed | Q14: Styling section (navy/pink override), "Fonts" bullet (Poppins), "Backend route map" section (new `/api/cagnottes/*`, `/api/notifications/*`), "Data model" section (Block.slug, Order.isAnonymous/messageIsPrivate, Notification model). |

**Plan 02-03 total:** ~650 LOC new + ~30 LOC modified to CLAUDE.md

---

## 15 Research Questions — Answered

### Q1: Middleware mount position in `backend/src/index.ts`

**Answer:** `/api/cagnottes` mounts at line 109 (between `/api/orders` and `/api/webhooks`), with NO CSRF and NO write limiter (GET-only, public). It automatically receives the global 300 req/15min limiter via the `/api` prefix.

**Current state (index.ts lines 82–112):**

```ts
// Line 82–94: global limiter — skips /withdrawals, /orders, /auth
const globalLimiter = rateLimit({...});
app.use("/api", globalLimiter);

// Line 96–103: writeLimiter (30/60s) — used by sellers, blocks, upload
const writeLimiter = rateLimit({...});

// Line 106–112: route mounts
app.use("/api/auth", authRouter);
app.use("/api/sellers", writeLimiter, verifyCsrf, sellersRouter);
app.use("/api/blocks", writeLimiter, verifyCsrf, blocksRouter);
app.use("/api/orders", ordersRouter); // Public POST — no CSRF
app.use("/api/webhooks", webhooksRouter); // Raw body, no cookies
app.use("/api/upload", writeLimiter, verifyCsrf, uploadRouter);
app.use("/api/withdrawals", verifyCsrf, withdrawalsRouter);
```

**Phase 2 change (after line 109, before line 110):**

```ts
app.use("/api/orders", ordersRouter);
app.use("/api/cagnottes", cagnottesRouter); // NEW: public GET-only, global limiter applies
app.use("/api/webhooks", webhooksRouter);
...
// After line 107:
app.use("/api/notifications", writeLimiter, verifyCsrf, notificationsRouter); // NEW
```

`/api/notifications` inherits the same pattern as `/api/sellers` (`writeLimiter + verifyCsrf + requireAuth-inside-router`). `/api/cagnottes` inherits the same bare pattern as `/api/orders` but without even CSRF because it's GET-only.

**Confidence:** HIGH — verified by reading `index.ts` lines 82–112.

---

### Q2: Orders rate limiter replacement — smallest diff

**Answer:** `express-rate-limit` fully supports custom `keyGenerator` and **stacking multiple middlewares** on the same route. The smallest diff is three distinct `rateLimit()` instances chained in the route handler.

**Current (orders.ts lines 50–60):**

```ts
const createOrderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  store: new RedisRateLimitStore("create-order"),
});
ordersRouter.post("/", createOrderLimiter, async (req, res) => { ... });
```

**Phase 2 replacement:**

```ts
// 20 orders/min per IP
const orderIpMinuteLimiter = rateLimit({
  windowMs: 60 * 1000, max: 20,
  store: new RedisRateLimitStore("order-ip-min"),
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Trop de commandes, réessaye dans une minute." },
});

// 100 orders/hour per IP
const orderIpHourLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 100,
  store: new RedisRateLimitStore("order-ip-hour"),
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Trop de commandes cette heure. Patiente un moment." },
});

// 5 orders/min per customer email
const orderEmailMinuteLimiter = rateLimit({
  windowMs: 60 * 1000, max: 5,
  store: new RedisRateLimitStore("order-email-min"),
  standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => {
    const email = (req.body as { customerEmail?: string })?.customerEmail?.toLowerCase() || "anon";
    return `email:${email}`;
  },
  // When customerEmail missing, keyGenerator returns "email:anon" which collapses all
  // anonymous donors to one bucket — acceptable collateral; anonymous orders bound by IP limiter.
  validate: false, // keyGenerator doesn't use default IP — express-rate-limit warns otherwise
  message: { error: "Trop de dons depuis cet email. Réessaye dans une minute." },
});

ordersRouter.post(
  "/",
  orderIpMinuteLimiter,
  orderIpHourLimiter,
  orderEmailMinuteLimiter,
  async (req, res) => { ... }
);
```

**Key details:**
- `validate: false` silences the "keyGenerator doesn't use IP" warning. Verified in existing code at `orders.ts:582` (leadMagnetProductLimiter) and `webhooks.ts` patterns — project already uses this pattern.
- `standardHeaders: true` exposes `RateLimit-*` headers on 429 responses — helpful for debugging.
- The stack order matters: IP minute first (cheapest), then IP hour, then email. Fails fast on flood.
- Also remove `/api/orders` from global skip list? Recommend **keep the skip** — dedicated limiters are tighter.

**Confidence:** HIGH — pattern verified against `orders.ts:574–583` (existing `leadMagnetProductLimiter` with `keyGenerator` + `validate: false`).

---

### Q3: Bictorys circuit breaker — smallest implementation

**Answer:** ~50 LOC in-memory state, zero dependencies. Recommend file at `backend/src/lib/payments/circuitBreaker.ts`.

**State machine:**

```
CLOSED → [5 failures in 30s window] → OPEN → [60s cooldown] → HALF_OPEN
HALF_OPEN → [1 success] → CLOSED
HALF_OPEN → [1 failure]  → OPEN (reset 60s cooldown)
```

**Implementation sketch:**

```ts
// backend/src/lib/payments/circuitBreaker.ts
const WINDOW_MS = 30_000;
const COOLDOWN_MS = 60_000;
const FAILURE_THRESHOLD = 5;

interface State {
  failures: number[];      // unix-ms timestamps (keep last FAILURE_THRESHOLD)
  openedAt: number | null; // null = closed
}

const bictorysState: State = { failures: [], openedAt: null };

export function isBictorysCircuitOpen(): boolean {
  if (bictorysState.openedAt === null) return false;
  if (Date.now() - bictorysState.openedAt >= COOLDOWN_MS) {
    // Transition to HALF_OPEN — caller should try once
    return false;
  }
  return true;
}

export function recordBictorysFailure(): void {
  const now = Date.now();
  // Expire old failures
  bictorysState.failures = bictorysState.failures.filter((t) => now - t < WINDOW_MS);
  bictorysState.failures.push(now);
  if (bictorysState.failures.length >= FAILURE_THRESHOLD) {
    bictorysState.openedAt = now;
  }
}

export function recordBictorysSuccess(): void {
  bictorysState.failures = [];
  bictorysState.openedAt = null;
}
```

**Integration in `routes/orders.ts`** (around the `provider.createTransaction` call at line 315):

```ts
if (isBictorysCircuitOpen()) {
  res.status(503).json({ error: "Paiement temporairement indisponible. Réessaye dans 1 minute." });
  return;
}
try {
  const transaction = await provider.createTransaction({...});
  recordBictorysSuccess();
  // ... save externalId, return 201
} catch (err) {
  recordBictorysFailure();
  throw err;
}
```

**Tradeoffs:**
- **In-memory** is fine for single-instance Railway deploy (current prod). Multi-instance would need Redis-backed state (future concern — flag in CONCERNS).
- **No half-open state machine** — when cooldown expires, `isBictorysCircuitOpen` returns `false` and the next attempt runs. If it fails, `recordBictorysFailure` re-opens. If it succeeds, state clears. This is effectively half-open behavior without explicit transitions.
- Does NOT wrap `BictorysProvider.createTransaction` internally — done at the route layer so the error message hits the donor cleanly. Alternative: wrap inside `bictorys.ts`. Recommend **route layer** — the circuit breaker is a routing concern, not a protocol concern.

**Confidence:** MEDIUM-HIGH — pattern is textbook; no external reference needed. Flag in concerns: multi-instance state leak when/if prod scales out.

---

### Q4: Webhook pessimistic lock + notification post-transaction pattern

**Answer:** Prisma supports `$queryRaw` with `FOR UPDATE` in Postgres via `$executeRawUnsafe` or `$queryRaw` tagged templates. However, the **simpler and recommended pattern** for cagnottes.sn is: `upsert({where: {externalId_eventType: ...}})` on `WebhookLog` + `$transaction({isolationLevel: "Serializable"})`. The `WebhookLog @@unique([externalId, eventType])` unique constraint (Phase 1) is the hard guarantee — Serializable isolation is the in-transaction safety net.

**Current pattern (webhooks.ts lines 349–396) — works but has a subtle race:**

Current code does `findFirst({where: {externalId, eventType, status:"processed"}})` inside a transaction but **before** marking as processed. Two concurrent webhooks could both see "not processed" and both mutate. The Serializable isolation + `updateMany` at the end is Postgres's safety net, but this is fragile.

**Phase 2 pattern:**

```ts
// webhooks.ts, around line 350
const { prevTotal, newTotal, alreadyProcessed, order, block } = await prisma.$transaction(
  async (tx) => {
    // 1. Upsert webhook log with composite unique — atomic insert-or-return
    // Phase 1 added @@unique([externalId, eventType]), so this is race-safe.
    const log = await tx.webhookLog.upsert({
      where: { externalId_eventType: { externalId: transactionId, eventType: status } },
      create: {
        provider: "bictorys",
        eventType: status,
        externalId: transactionId,
        payload: JSON.parse(JSON.stringify(payload)),
        status: "received",
      },
      update: {}, // no-op on existing — we only care about seeing the row
    });

    if (log.status === "processed") {
      return { alreadyProcessed: true } as const;
    }

    // 2. Re-fetch order with block config
    const ord = await tx.order.findUnique({
      where: { reference: paymentReference },
      include: { block: true },
    });
    if (!ord || ord.paymentStatus === "PAID") {
      return { alreadyProcessed: true } as const;
    }

    // 3. Compute prevTotal (paid orders on this block EXCLUDING this order)
    const agg = await tx.order.aggregate({
      where: { blockId: ord.blockId, paymentStatus: "PAID", id: { not: ord.id } },
      _sum: { amount: true },
    });
    const prevTotal = agg._sum.amount || 0;
    const newTotal = prevTotal + ord.amount;

    // 4. Mutate order + customer
    await tx.order.update({
      where: { id: ord.id },
      data: { paymentStatus: "PAID", paidAt: new Date(), paymentExternalId: transactionId },
    });
    await tx.customer.updateMany({
      where: { sellerId: ord.sellerId, email: ord.customerEmail },
      data: { totalSpent: { increment: ord.amount }, orderCount: { increment: 1 } },
    });

    // 5. Mark log processed (inside same tx — atomic with mutation)
    await tx.webhookLog.update({
      where: { id: log.id },
      data: { status: "processed" },
    });

    return { alreadyProcessed: false, prevTotal, newTotal, order: ord, block: ord.block } as const;
  },
  { isolationLevel: "Serializable" }
);

if (alreadyProcessed) {
  res.status(200).json({ received: true, already: "processed" });
  return;
}

// 6. POST-TRANSACTION dispatch — safe because WebhookLog.status=processed
//    means no second webhook can re-enter this block.
await fireDonationReceived(order, block);
const crossed = detectCrossed(prevTotal, newTotal, (block.config as any).goalAmount || 0);
for (const t of crossed) {
  await fireMilestone(block, t);
}
if (order.donorMessage) {
  await fireDonationMessage(order, block);
}

res.status(200).json({ received: true });
```

**Why not `FOR UPDATE`?** Prisma doesn't expose it cleanly via the query builder — you'd need `$queryRaw`. Serializable isolation gives the same guarantees without the raw SQL, and Postgres's SSI (Serializable Snapshot Isolation) will abort one of two concurrent webhooks with a retriable error. Combined with the `@@unique` constraint, we're double-protected.

**Neon-specific caveat:** Neon serverless supports `$transaction` + Serializable isolation. Verified in existing code (e.g., `webhooks.ts:396`, `orders.ts:309–310`, `withdrawals.ts:313`). No new risk.

**Confidence:** HIGH — pattern is already used three times elsewhere in the codebase.

---

### Q5: Notification templates — French copy (9 templates)

**Answer:** Banani screen 20 (`main_next1_next2_next4.jsx`) is not in `.planning/banani/` as a raw JSX file per the grep. Status.md references screen 20 as "Activity feed + tabs" but copy isn't extracted. **Drafts below are grounded in Banani screen-20 phrasing style from BACKEND-PLAN.md line 80-89 comments plus formatPrice style (`"5 000 FCFA"`).**

| # | Type | Title (French) | Body (French) | Icon | Email Subject |
|---|------|----------------|---------------|------|---------------|
| 1 | `DONATION_RECEIVED` | `{donorName} a participé à {cagnotteTitle}` | `{donorName} vient de participer {amount} FCFA à ta cagnotte « {cagnotteTitle} »` | `heart` | `💰 {amount} FCFA reçus — {cagnotteTitle}` |
| 2 | `MILESTONE_REACHED` (50%) | `Tu as atteint 50 % de ton objectif !` | `Ta cagnotte « {cagnotteTitle} » a atteint 50 % de l'objectif. Continue à partager !` | `check-square` | `🎯 50 % atteint — {cagnotteTitle}` |
| 3 | `MILESTONE_REACHED` (100%) | `Objectif atteint ! 🎉` | `Ta cagnotte « {cagnotteTitle} » a atteint son objectif de {goalAmount} FCFA. Bravo !` | `check-square` | `🏆 Objectif atteint — {cagnotteTitle}` |
| 4 | `CAGNOTTE_ENDING_SOON` | `Ta cagnotte se termine dans 3 jours` | `« {cagnotteTitle} » se termine le {endDate}. C'est le dernier moment pour la partager.` | `clock` | `⏰ Plus que 3 jours — {cagnotteTitle}` |
| 5 | `CAGNOTTE_ENDED` | `Ta cagnotte est terminée` | `« {cagnotteTitle} » s'est terminée avec {totalRaised} FCFA collectés auprès de {donorCount} participants.` | `clock` | `✅ {cagnotteTitle} est terminée — {totalRaised} FCFA` |
| 6 | `DONATION_MESSAGE` | `{donorName} a laissé un message` | `« {message} » — sur ta cagnotte « {cagnotteTitle} »` | `message-circle` | `💬 Nouveau message sur {cagnotteTitle}` |
| 7 | `PAYOUT_COMPLETED` | `Retrait effectué` | `Ton retrait de {amount} FCFA vers {phoneMasked} ({provider}) a été effectué avec succès.` | `credit-card` | `✅ Retrait de {amount} FCFA effectué` |
| 8 | `PAYOUT_FAILED` | `Retrait échoué` | `Ton retrait de {amount} FCFA n'a pas pu être effectué. Raison : {reason}. Vérifie ton numéro et réessaye.` | `credit-card` | `⚠️ Retrait échoué — action requise` |
| 9 | `KYC_APPROVED` | `Identité vérifiée ✓` | `Ton identité a été vérifiée. Tu peux maintenant retirer tes fonds.` | `check-square` | `✓ Ton identité a été vérifiée` |
| 10 | `KYC_REJECTED` | `Documents refusés` | `Tes documents d'identité ont été refusés. Raison : {reason}. Soumets de nouveaux documents depuis ton profil.` | `check-square` | `⚠️ Vérification d'identité refusée` |

**Donor name masking rule:**
- If `order.isAnonymous === true`: `donorName = "Un participant anonyme"` in title/body, but the organizer still sees the real name in the admin-side feed if we expose it. For v1, keep it simple — `"Un participant anonyme"` everywhere including the creator's own feed (the creator can see the real name by drilling into the Order detail UI). Flag as open question.
- Else: `donorName = order.customerName || "Un participant"` (first name + last initial when available: "Julien R." — parseable client-side).

**dedupeKey formulas:**
- `donation_received:{orderId}`
- `donation_message:{orderId}`
- `milestone:{blockId}:{50|100}`
- `ending_soon:{blockId}` (one per block lifecycle)
- `cagnotte_ended:{blockId}`
- `payout:{withdrawalId}:{completed|failed}`
- `kyc:{sellerId}:{approved|rejected}` — one per state transition. If KYC is rejected twice in a row on resubmission, the second fire is blocked — acceptable v1 behavior, v2 can append `:attemptN`.

**Confidence:** MEDIUM — copy style grounded in BACKEND-PLAN.md comments; exact Banani screen-20 strings not extracted. Recommend user confirmation in discuss-phase before locking.

---

### Q6: `createNotification()` API contract

**Answer:** Sync Prisma insert, fire-and-forget email enqueue. The queue's `add()` is async but we `.catch()` it so the route doesn't await the email.

**Contract:**

```ts
// backend/src/lib/notifications/index.ts
export interface CreateNotificationInput {
  sellerId: string;
  type: NotificationType;
  dedupeKey: string;     // REQUIRED — caller must compute
  title: string;
  body?: string;
  icon?: string;         // lucide name
  blockId?: string;
  orderId?: string;
  withdrawalId?: string;
  data?: Record<string, unknown>;
  email?: {
    subject: string;
    html: string;
    tier: "critical" | "transactional" | "standard";
  };
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<{ created: boolean; notification: Notification | null }> {
  try {
    // 1. Check seller.notificationPrefs — skip if category disabled
    const seller = await prisma.seller.findUnique({
      where: { id: input.sellerId },
      select: { notificationPrefs: true, email: true, emailUnsubscribed: true },
    });
    if (!seller) return { created: false, notification: null };

    const prefs = (seller.notificationPrefs as Record<string, boolean> | null) || {};
    const prefKey = notifTypeToPrefKey(input.type); // maps enum → prefs key
    if (prefs[prefKey] === false) {
      logger.log(`[notifications] Skip ${input.type} for ${input.sellerId} — pref disabled`);
      return { created: false, notification: null };
    }

    // 2. Insert notification with dedupeKey unique — P2002 = already fired
    const notification = await prisma.notification.create({
      data: {
        sellerId: input.sellerId,
        type: input.type,
        dedupeKey: input.dedupeKey,
        title: input.title,
        body: input.body,
        icon: input.icon,
        blockId: input.blockId,
        orderId: input.orderId,
        withdrawalId: input.withdrawalId,
        data: input.data as Prisma.JsonValue,
      },
    });

    // 3. Enqueue email (non-blocking) — only if not unsubscribed
    if (input.email && !seller.emailUnsubscribed) {
      const enqueue = {
        critical: queueAuthEmail,
        transactional: queueTransactionalEmail,
        standard: queueStandardEmail,
      }[input.email.tier];
      enqueue({ to: seller.email, subject: input.email.subject, html: input.email.html });
    }

    return { created: true, notification };
  } catch (err) {
    // Duck-typed P2002 (same pattern as slug.ts from Phase 1)
    const isUniqueViolation =
      (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") ||
      (err as { code?: string })?.code === "P2002";
    if (isUniqueViolation) {
      logger.log(`[notifications] Dedupe hit for ${input.dedupeKey}`);
      return { created: false, notification: null };
    }
    throw err;
  }
}
```

**Why `email` is a sub-object and not enqueued via `JobQueue.add(..., jobKey)`:** `JobQueue.add()` signature is `(data: T, priority = 1): Promise<string>` — no jobKey parameter (verified in `JobQueue.ts:74–91`). The dedupe at the DB layer (Notification.dedupeKey) is the single source of truth — if the insert fails with P2002, we never enqueue the email. If the insert succeeds, we enqueue once. Exactly-once delivery via Postgres unique constraint, not via queue idempotency.

**Confidence:** HIGH — verified `JobQueue.add` signature in `queues/JobQueue.ts:74`.

---

### Q7: Milestone detection pre/post-transaction diff

**Answer:** Pure function, called POST-transaction after prevTotal/newTotal are known. Dedup via `Notification.dedupeKey` (no extra `Block.milestonesNotified Int[]` column needed).

```ts
// backend/src/lib/notifications/milestones.ts
export function detectCrossed(
  prevTotal: number,
  newTotal: number,
  goalAmount: number
): (50 | 100)[] {
  if (goalAmount <= 0) return [];
  const prevPct = (prevTotal / goalAmount) * 100;
  const newPct = (newTotal / goalAmount) * 100;
  const crossed: (50 | 100)[] = [];
  if (prevPct < 50 && newPct >= 50) crossed.push(50);
  if (prevPct < 100 && newPct >= 100) crossed.push(100);
  return crossed;
}
```

**Called from webhook post-transaction block** (see Q4). If two concurrent webhooks both cross 50%, the second `createNotification({dedupeKey: "milestone:blockId:50"})` will hit `@@unique` P2002 and return `{created: false}`. Safe.

**Why not `Block.milestonesNotified Int[]`?** Extra column, extra migration, extra write. The `Notification.dedupeKey` unique constraint is already in place from Phase 1 and does the same job with one lookup. **Skip the column.**

**Confidence:** HIGH.

---

### Q8: Ending-soon cron — `Block.endingSoonNotifiedAt` vs `Notification.dedupeKey` lookup

**Answer:** Research SUMMARY.md open-question 3 and REQUIREMENTS.md NOTF-04 both explicitly recommend **dedicated `Block.endingSoonNotifiedAt DateTime?` field**. Phase 1 plan 01-01 intentionally deferred this to Phase 2. Recommend add.

**Tradeoff:**

| Approach | Read cost | Write cost | Clarity |
|----------|-----------|------------|---------|
| `Block.endingSoonNotifiedAt` field | `WHERE endingSoonNotifiedAt IS NULL` — indexable, cheap | `UPDATE Block SET endingSoonNotifiedAt = now()` — 1 write | Obvious, self-documenting |
| `Notification.dedupeKey` lookup | `WHERE NOT EXISTS (SELECT 1 FROM Notification WHERE dedupeKey = 'ending_soon:...')` — correlated subquery or join | Free (handled by Notification unique constraint) | Less obvious, couples cron to notification model |

**Recommend:** Add `endingSoonNotifiedAt DateTime?` in a Phase 2 additive migration (`ALTER TABLE "Block" ADD COLUMN "endingSoonNotifiedAt" TIMESTAMP(3)`). One line, strictly additive, no backfill, no index needed (we scan by `endDate` window anyway).

**Cron flow (`lib/notifications/endingSoonCron.ts`):**

```ts
export async function runEndingSoonSweep(): Promise<void> {
  const now = new Date();
  const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Find FUNDRAISER blocks ending within the next 3 days, never notified
  const candidates = await prisma.block.findMany({
    where: {
      type: "FUNDRAISER",
      isActive: true,
      endingSoonNotifiedAt: null,
      // endDate lives in config JSON — can't filter at SQL level cleanly.
      // Filter in-memory after fetching — acceptable at the block count we expect (< 1000).
    },
    select: { id: true, sellerId: true, title: true, config: true, endingSoonNotifiedAt: true },
  });

  for (const block of candidates) {
    const cfg = block.config as { endDate?: string; goalAmount?: number };
    const endDate = cfg.endDate ? new Date(cfg.endDate) : null;
    if (!endDate) continue;
    if (endDate > threeDaysOut || endDate < now) continue; // not in window

    const { created } = await fireEndingSoon(block);
    if (created) {
      await prisma.block.update({
        where: { id: block.id },
        data: { endingSoonNotifiedAt: new Date() },
      });
    }
  }
}
```

**Cron placement in `index.ts`:** after line 207, add:

```ts
setInterval(runEndingSoonSweep, 60 * 60 * 1000);  // hourly
setTimeout(runEndingSoonSweep, 30_000);           // boot catch-up (30s after start)
```

**Boot catch-up rationale:** P14 — `setInterval` loses state on restart. If a cagnotte enters the J-3 window during downtime, the sweep on next boot catches it. `endingSoonNotifiedAt` prevents re-fire.

**Confidence:** HIGH — pattern explicitly called out in REQUIREMENTS.md NOTF-04.

---

### Q9: Auth gap-fill — current state

**Answer:** **All 4 "gap" endpoints are already fully shipped** in `backend/src/routes/auth.ts`. Phase 2 plan 02-03 is a smoke-test plan, not a build plan, for the AUTH-01/02/03 requirements.

| Requirement | Endpoint | Method | File:line | Shipped? |
|-------------|----------|--------|-----------|----------|
| AUTH-01 change-password | `/api/auth/change-password` | **PUT** (not POST — note this!) | `auth.ts:702` | ✅ Yes, with `verifyCsrf + requireAuth`, validates current password |
| AUTH-02 forgot-password | `/api/auth/forgot-password` | POST | `auth.ts:573` | ✅ Yes, rate-limited (5/15min), sends 6-digit code via `queueAuthEmail`, doesn't reveal if email exists |
| AUTH-02 reset-password | `/api/auth/reset-password` | POST | `auth.ts:644` | ✅ Yes, rate-limited (5/15min), timing-safe code compare, max 5 attempts |
| AUTH-03 verify-email | `/api/auth/verify-email` | POST | `auth.ts:305` | ✅ Yes, rate-limited (6/15min), auto-login on success (sets JWT + CSRF cookies) |

**Smoke-test assertion shapes:**

```ts
// AUTH-01
const r1 = await fetch(`${API}/api/auth/change-password`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", Cookie: authCookie, "x-csrf-token": csrf },
  body: JSON.stringify({ currentPassword: "oldpass123", newPassword: "newpass456" }),
});
assert.strictEqual(r1.status, 200);

// AUTH-02a
const r2 = await fetch(`${API}/api/auth/forgot-password`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: TEST_EMAIL }),
});
assert.strictEqual(r2.status, 200); // always 200 (doesn't reveal existence)

// AUTH-02b — read code from DB (smoke-test has direct Prisma access)
const code = await prisma.verificationCode.findFirst({
  where: { email: TEST_EMAIL }, orderBy: { createdAt: "desc" },
});
const r3 = await fetch(`${API}/api/auth/reset-password`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: TEST_EMAIL, code: code!.code, newPassword: "reset789" }),
});
assert.strictEqual(r3.status, 200);
```

**Watch-out:** `change-password` is **PUT** not POST. Frontend Phase 5 must use PUT when consuming it. Flag in CLAUDE.md refresh.

**Confidence:** HIGH — verified by reading auth.ts in full.

---

### Q10: KYC gate on withdrawal

**Answer:** Fully implemented in `routes/withdrawals.ts:178–194`. Smoke-test must assert:
1. Non-KYC seller → 403 with French error message.
2. KYC_APPROVED seller without PIN set → 200 (if no pin configured) OR `{code: "PIN_REQUIRED"}` (if pin was set).
3. KYC_APPROVED + correct PIN + sufficient balance → 201 with withdrawal details.
4. KYC_APPROVED + wrong PIN → 403 `"Code de retrait incorrect"`.

**Current code (withdrawals.ts:163–194):**

```ts
const sellerCheck = await prisma.seller.findUnique({
  where: { id: sellerId },
  select: { withdrawalBlocked: true, kycStatus: true, withdrawalPinHash: true },
});
if (!sellerCheck) { res.status(404).json({ error: "Compte introuvable" }); return; }
if (sellerCheck.withdrawalBlocked) {
  res.status(403).json({ error: "Tes retraits sont temporairement bloqués. Contacte le support." });
  return;
}
if (sellerCheck.kycStatus !== "APPROVED") {
  res.status(403).json({ error: "Tu dois vérifier ton identité (KYC) avant de pouvoir retirer." });
  return;
}
if (sellerCheck.withdrawalPinHash) {
  if (!data.withdrawalPin) {
    res.status(400).json({ error: "Le code de retrait est requis", code: "PIN_REQUIRED" }); return;
  }
  const pinValid = await verifyPassword(data.withdrawalPin, sellerCheck.withdrawalPinHash);
  if (!pinValid) { res.status(403).json({ error: "Code de retrait incorrect" }); return; }
}
```

**Withdrawal PIN set/change endpoint:** `POST /api/sellers/withdrawal-pin` — already exists at `sellers.ts:936`, `GET /api/sellers/withdrawal-pin/status` at `sellers.ts:917`, forgot/reset at lines 991/1063.

**Confidence:** HIGH — all referenced lines verified.

---

### Q11: Seed-dev + smoke-test patterns

**Answer:** Prior art in `backend/scripts/`:
- `test-slug.ts` (Phase 1) — 294 lines, uses a simple `function check(name: string, got: any, expected: any)` assert helper + running `68/68 passed` tally.
- `test-commission.ts` (Phase 1) — 158 lines, same pattern.
- `test-schemas.ts` (Phase 1) — 240 lines, same pattern.
- `seed-coaches.ts` — existing pattern for fixture insert via direct Prisma client.

**Recommend for smoke-test:** `node:assert/strict` (built-in, zero deps) + a tiny fetch wrapper that tracks cookies across requests.

```ts
// backend/scripts/smoke-test.ts skeleton
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma.js";

const API = process.env.API || "http://localhost:4000";
let cookieJar = "";
let csrfToken = "";

async function req(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (cookieJar) headers.set("Cookie", cookieJar);
  if (csrfToken && init.method && init.method !== "GET") headers.set("x-csrf-token", csrfToken);
  headers.set("Content-Type", "application/json");
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    // Merge cookies naively — tests are single-session
    cookieJar = setCookie.split(",").map(c => c.split(";")[0]).join("; ");
  }
  return res;
}

let passed = 0, failed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`✓ ${name}`); passed++; }
  catch (err) { console.error(`✗ ${name}`); console.error(err); failed++; }
}

// ... 15 tests ...

console.log(`\n${passed}/${passed+failed} passed`);
process.exit(failed === 0 ? 0 : 1);
```

**Seed-dev.ts** uses the same Prisma client + `createNotification` from the new lib to seed 2 sellers + 4 fundraisers + 10 orders + 5 notifications per seller. ~250 LOC. Uses `upsert` patterns for idempotency so it can be re-run.

**Server requirement:** `smoke-test.ts` assumes `npm run dev` is already running on `localhost:4000`. Document in CLAUDE.md: "Run smoke-test in a second terminal after `npm run dev` is up."

**Confidence:** HIGH — prior art verified.

---

### Q12: `routes/cagnottes.ts` — exact Prisma select for minimum overfetching

**Answer:** Split into 3 endpoints with tightly-scoped `select`.

**`GET /api/cagnottes` (list — Banani screen 2):**

```ts
const cagnottes = await prisma.block.findMany({
  where: {
    type: "FUNDRAISER",
    isActive: true,
    // SQL-level visibility filter — P05 mitigation
    config: { path: ["visibility"], equals: "public" },
    // Exclude expired (endDate < now) — filter in app layer since endDate is JSON
    seller: { deletedAt: null },
  },
  select: {
    id: true,
    slug: true,
    title: true,
    config: true, // contains cover, subtype, goalAmount, endDate, hideAmount, hideDonors
    createdAt: true,
    seller: {
      select: {
        displayName: true,
        avatarUrl: true,
        slug: true, // for org profile link
      },
    },
    _count: {
      select: {
        orders: { where: { paymentStatus: "PAID" } },
      },
    },
  },
  orderBy: { createdAt: "desc" },
  take: limit + 1,
  ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
});
```

**Note:** Postgres JSON path filter works in Prisma: `config: { path: ["visibility"], equals: "public" }`. Verified in Prisma docs — supported for Postgres.

**Computing progress per row:** do NOT use `_sum` — `_count` is fine for donor count, but `totalRaised` needs an aggregate join. Options:
1. **Per-row aggregate query** in a loop → N+1, bad.
2. **Single groupBy query** after the findMany → 1 extra query, O(n).
3. **Virtual progress column** — no.

Recommend option **2**:

```ts
const blockIds = cagnottes.map(c => c.id);
const totals = await prisma.order.groupBy({
  by: ["blockId"],
  where: { blockId: { in: blockIds }, paymentStatus: "PAID" },
  _sum: { amount: true },
});
const totalsMap = new Map(totals.map(t => [t.blockId!, t._sum.amount || 0]));
```

Then merge into response. Respect `hideAmount` flag: if true, omit `totalRaised` from payload. Respect `hideDonors`: omit `donorCount`.

**`GET /api/cagnottes/:slug` (detail — Banani screens 21/22):**

Same pattern, plus `description`, `coverUrl` (from config), and a top-3 recent donations preview embedded. Use `Cache-Control: private, no-store` header if `visibility === "private"`. Return 404 if soft-deleted or expired.

**`GET /api/cagnottes/:slug/participants` (paginated participants wall):**

```ts
const orders = await prisma.order.findMany({
  where: { blockId: block.id, paymentStatus: "PAID" },
  select: {
    id: true,
    amount: true,
    donorMessage: true,
    isAnonymous: true,
    messageIsPrivate: true,
    customerName: true, // ONLY for mask logic, never returned raw
    createdAt: true,
  },
  orderBy: { createdAt: "desc" },
  take: limit + 1,
  ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
});

// Transform: mask anonymous + omit private messages
const participants = orders.map(o => ({
  id: o.id,
  amount: block.config.hideAmount ? null : o.amount,
  name: o.isAnonymous ? "Anonyme" : (o.customerName || "Anonyme"),
  message: o.messageIsPrivate ? null : o.donorMessage,
  createdAt: o.createdAt,
}));
```

**Confidence:** HIGH — pattern verified against `blocks.ts:171–210` (existing progress route).

---

### Q13: Private cagnotte enforcement

**Answer:** Three enforcement layers:

1. **SQL-level filter on list** — `config: { path: ["visibility"], equals: "public" }` in the `where`. Never post-filter in JS.
2. **Detail endpoint allows private by slug** — no visibility filter, so anyone with the slug can load it.
3. **Cache-Control header** — set on private detail responses:

```ts
if (cfg.visibility === "private") {
  res.setHeader("Cache-Control", "private, no-store");
}
```

**Smoke-test assertion:**

```ts
await test("P05: private cagnotte excluded from list", async () => {
  // Seed sets up a private fundraiser with slug = "test-prive-abc"
  const list = await req("/api/cagnottes");
  const json = await list.json();
  const slugs = json.cagnottes.map((c: any) => c.slug);
  assert.ok(!slugs.includes("test-prive-abc"), "private slug leaked into list");

  // But detail endpoint returns it by slug
  const detail = await req("/api/cagnottes/test-prive-abc");
  assert.strictEqual(detail.status, 200);
  assert.strictEqual(detail.headers.get("cache-control"), "private, no-store");
});
```

**Confidence:** HIGH.

---

### Q14: CLAUDE.md refresh scope

**Answer:** The current CLAUDE.md is already cagnottes.sn-specific and mostly accurate. Phase 2 changes are surgical — ~30 lines.

**Sections to edit:**

1. **"Architecture" → "Backend" subsection** (around line 88 in CLAUDE.md): add bullet points for the new routes:
   - `**Cagnottes** (public)`: `routes/cagnottes.ts` — `GET /`, `GET /:slug`, `GET /:slug/participants`. Mounted before CSRF group, no CSRF, public.
   - `**Notifications** (authed)`: `routes/notifications.ts` — `GET /`, `GET /count`, `POST /mark-read`, `GET/PATCH /prefs`.

2. **"Architecture" → "Backend" → "Kept libs" list** (around line 100): add:
   - `lib/notifications/` — `createNotification()` with `Notification.dedupeKey @unique` dedupe, templates, dispatch, milestone detection, ending-soon cron. Rebuilt in Phase 2.
   - `lib/payments/circuitBreaker.ts` — in-memory Bictorys circuit breaker (5 failures/30s → open 60s).
   - `lib/commission.ts` — `computeCommission(gross, subtype)` — 6% solidaire, 8% festive.

3. **"Critical Rules" → "Payments"** (around line 140): replace the commission line:
   - OLD: "Commission is calculated server-side (tariff TBD for cagnottes.sn)."
   - NEW: "Commission is **6% solidaire / 8% festive**, computed server-side via `computeCommission(gross, subtype)` in `lib/commission.ts`. Uses `Math.floor` (favors seller). Invariant `commission + net === gross`."

4. **"Critical Rules" → "Data & Validation"** (around line 150): add:
   - "Fundraiser slugs are unique per-cagnotte via `Block.slug @unique`, generated by `lib/cagnottes/slug.ts` with reserved-words guard and numeric suffix fallback. Never random hex."
   - "Orders have `isAnonymous` and `messageIsPrivate` flags — the public participants endpoint masks accordingly."
   - "`Notification` model has `dedupeKey String @unique` enforcing at-most-once delivery. `createNotification()` in `lib/notifications/` is the single entry point."

5. **"Critical Rules" → "Styling"** (around line 135): update:
   - OLD: "Primary: `teal-600` (#0D9488). Accent: `amber-500` (#F59E0B)."
   - NEW: "Primary: navy `#172866` (Tailwind: custom `navy-600`). Accent: pink `#FBE6ED` (Tailwind: custom `pink-100`). Navy hover: `#121F4E`. Footer: `#0E1A40`. Fonts: Poppins headings + Inter body via `next/font/google`."
   - (Note: Phase 2 is backend-only — this line is technically Phase 3's concern, but the research explicitly asks to update it. Flag to planner: consider deferring to Phase 3 plan 03-01 if atomic-commit purity matters.)

6. **"Known Quirks"** — no change.

7. **"Environment Variables"** — verify all required vars still listed. No change for Phase 2.

**Confidence:** HIGH — CLAUDE.md current version read in full.

---

### Q15: Exit criteria automation — smoke-test assertions enumerated

**Answer:** `tsx backend/scripts/smoke-test.ts` must make all 15 assertions below pass. Each maps to a pitfall or requirement.

| # | Assertion | Pitfall/Req | Command/Check |
|---|-----------|-------------|---------------|
| 1 | Health check 200 | sanity | `GET /api/health` → 200 |
| 2 | Signup → verify-email → auto-login → cookie captured | AUTH-03 | `POST /api/auth/signup` → DB code → `POST /api/auth/verify-email` → 200, `izy-token` cookie present |
| 3 | `GET /api/cagnottes` returns only public + active, no private | **P05** | Seed includes 1 private; assert `!slugs.includes("test-prive-abc")` |
| 4 | `GET /api/cagnottes/:slug` returns private cagnotte with `Cache-Control: private, no-store` | **P05** | Fetch private slug directly → 200 + header |
| 5 | `GET /api/cagnottes/:slug/participants` masks anonymous donors | DISC-03 | At least one participant with `isAnonymous=true` → name field == "Anonyme" |
| 6 | `GET /api/cagnottes/:slug/participants` omits private messages | DISC-03 | At least one order with `messageIsPrivate=true` → `message === null` |
| 7 | `POST /api/orders` with festive subtype computes 8% commission | **P03** + DONA-04 | Assert returned order's `commissionAmount === Math.floor(amount * 800 / 10000)` — read via DB |
| 8 | `POST /api/orders` with solidaire subtype computes 6% commission | **P03** | Same pattern, 600 bp |
| 9 | `POST /api/orders` hits rate limit after 21 requests from same IP in 1min | **P07** | Loop 21 POSTs, expect first 20 to return 201 or 503, 21st to return 429 |
| 10 | `POST /api/orders` with invalid `customerEmail` hits per-email limit at 6 | **P07** | 6 POSTs with same email, 6th → 429 |
| 11 | Webhook double-delivery produces exactly ONE `Notification` | **P01** + **P06** + DONA-08 | Fire same signed payload twice via `POST /api/webhooks/bictorys`; assert only one `Notification` row with `dedupeKey = donation_received:{orderId}` |
| 12 | Milestone notification fires exactly once at 50% | NOTF-03 | Seed 9 orders totaling 49% of goal; fire 10th webhook → assert one `MILESTONE_REACHED` with `dedupeKey = milestone:{blockId}:50`; fire another webhook at 55% → assert no second milestone fire |
| 13 | `POST /api/withdrawals` returns 403 for KYC_NONE seller | KYC-02 | Log in as seed seller #2 (KYC=NONE) → POST withdrawal → 403 + French message |
| 14 | `POST /api/withdrawals` succeeds for KYC_APPROVED + correct PIN | KYC-03 | Log in as seller #1 → set PIN → POST withdrawal → 201 |
| 15 | `GET /api/notifications` returns paginated feed with unread badge | NOTF-08/09 | `GET /api/notifications` → items array; `GET /api/notifications/count` → `{total, unread}` matches |

**At end:**

```
15/15 passed
Phase 2 exit gate: GREEN ✓
```

**Environment requirement:** smoke-test needs `BICTORYS_WEBHOOK_SECRET` to craft valid webhook signatures. Already in `.env` per CLAUDE.md.

**Confidence:** HIGH.

---

## Architecture Patterns

### Pattern 1: Single-entry notification dispatch

**What:** All notifications flow through `createNotification()` → Prisma insert → email enqueue. Dedupe at DB layer via `@unique` constraint.
**When:** Every domain event that notifies the creator.
**Example:** See Q6 contract above.

### Pattern 2: Pessimistic idempotent webhook

**What:** `$transaction({isolationLevel: "Serializable"})` wraps `upsert(WebhookLog)` + domain mutation + `update(WebhookLog status)`. Post-transaction: fire notifications.
**When:** Any external webhook that triggers irreversible side effects.
**Example:** See Q4 above.

### Pattern 3: Composed rate limiters

**What:** Stack multiple `rateLimit()` instances on the same route, each with a different `keyGenerator` and `RedisRateLimitStore` prefix.
**When:** Public endpoints with multiple abuse vectors (IP, account, device).
**Example:** See Q2 above.

### Pattern 4: In-memory circuit breaker

**What:** Module-scoped state variable + time-window failure counter + open/closed state.
**When:** Wrapping calls to a single external service that has quota or rate concerns.
**Example:** See Q3 above.

### Anti-Patterns to Avoid

- **Forking the webhook handler.** Keep `handleCommunityPaymentWebhook` branch alongside the FUNDRAISER branch — the fork-cleanup removed `communities` so that branch is dead code but **deleting it in Phase 2 is forbidden** (CLAUDE.md rabbit-hole rule). Add a comment: `// DEAD — community routes removed in fork cleanup, branch kept to avoid orphan dispatch logic bleed`.
- **Inline notification creation.** Every `createNotification` call MUST go through `lib/notifications/dispatch.ts` typed wrappers, never directly from a route.
- **Hand-rolled JSON response validation on cagnottes endpoints.** Use Prisma `select` to shape exactly — no manual field stripping.
- **Post-hoc JavaScript visibility filter on list.** Always SQL-level `WHERE`.
- **Enqueuing email before Prisma insert in `createNotification`.** The insert failing with P2002 is our dedup — if you enqueue first, you leak duplicate emails.
- **Awaiting `emailQueue.add()` in a route handler.** Fire-and-forget with `.catch(logger.error)`. Existing pattern in `emailQueue.ts`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom Redis counter | `express-rate-limit` + `RedisRateLimitStore` | Already solved, tested, supports composition |
| Queue dedup | Redis SETNX lock per jobKey | `Notification.dedupeKey @unique` | Postgres unique constraint is atomic, queue-free |
| Webhook signature verify | Custom HMAC | Existing `verifyWebhookSignature` in `webhooks.ts:219` | Already HMAC-SHA256 + 5-min replay window |
| CSRF | Reinvent double-submit | Existing `verifyCsrf` middleware | Already wired on every mutation |
| JWT refresh | Custom rotation | Existing `createAccessToken` / `createRefreshToken` / `refresh` endpoint | 15min access + 7d refresh with lock |
| Webhook idempotency | SELECT-then-INSERT race | `upsert` on `WebhookLog @@unique([externalId, eventType])` | Atomic |
| Email retries | Custom backoff | `JobQueue` with `maxRetries: 3, retryDelayMs: 2000` | Already exponential 2s/4s/8s |
| Seller DB re-query on auth | Trust JWT plan | Existing `requireAuth` | Already prevents stale-JWT plan bypass |
| Diacritic stripping | Custom regex | Existing `slug.ts` from Phase 1 | NFD normalize battle-tested |

**Key insight:** Phase 2 is almost entirely a composition exercise on existing primitives. The only genuinely new code is the circuit breaker (~50 LOC) and the notification templates (~180 LOC).

---

## Common Pitfalls

### Pitfall → Plan Mapping Table

| Pitfall | Plan | Mitigation Location |
|---------|------|---------------------|
| **P01 webhook dedup** | **02-02** | `routes/webhooks.ts` refactor: upsert WebhookLog with composite unique + Serializable transaction + post-tx notification dispatch. **Assert in smoke-test #11.** |
| **P03 commission rounding** | **02-01** | Replace `Math.round` (orders.ts:212) with `computeCommission()` from Phase 1 lib. **Assert in smoke-test #7, #8.** |
| **P05 private SEO leak** | **02-01** | SQL-level `config: {path: ["visibility"], equals: "public"}` filter in `routes/cagnottes.ts` list; `Cache-Control: private, no-store` on detail. **Assert in smoke-test #3, #4.** |
| **P06 notification re-fire** | **02-02** | `Notification.dedupeKey @unique` enforced by `createNotification()` duck-typed P2002 catch; `Block.endingSoonNotifiedAt` column for cron; milestone detection via pure `detectCrossed()` + post-tx dispatch. **Assert in smoke-test #11, #12.** |
| **P07 /api/orders DDoS** | **02-01** | Three composed rate limiters (20/min IP, 100/hour IP, 5/min per email) + in-memory circuit breaker + reduce PENDING TTL 30→10 min in `index.ts` expirePendingOrders. **Assert in smoke-test #9, #10.** |

### Pitfall 1: Webhook double-credit (P01)

**What goes wrong:** Bictorys delivers the same PAID event twice. Order gets credited twice, notification fires twice.
**Why it happens:** Current code uses `findFirst` then mutate — race window between check and write.
**How to avoid:** `upsert WebhookLog WHERE (externalId, eventType)` inside Serializable `$transaction`. `@@unique` constraint (Phase 1) gives hard guarantee.
**Warning sign:** Two `Notification` rows with identical `orderId` and `type=DONATION_RECEIVED`.

### Pitfall 2: Commission rounding drift (P03)

**What goes wrong:** Different code paths compute commission differently (`Math.round` vs `Math.floor`), giving a 1-FCFA diff between API response and DB row.
**Why it happens:** Historical `orders.ts:212` uses `Math.round`. Phase 1 `commission.ts` uses `Math.floor`.
**How to avoid:** Single `computeCommission()` entry point, `Math.round` removed from `orders.ts`. Inline invariant trips on regression.
**Warning sign:** `test-commission.ts` fuzz fixture failing, or QA report of mismatched totals.

### Pitfall 3: Private cagnotte SEO leak (P05)

**What goes wrong:** Private cagnotte appears in Google via `GET /api/cagnottes` scraping → discoverable → creator's secret family cagnotte leaks.
**Why it happens:** Post-hoc JS filter instead of SQL-level `WHERE`.
**How to avoid:** `config: {path: ["visibility"], equals: "public"}` in Prisma `where`. `robots.txt` disallows `/c/*` until opt-in (FE Phase 3 concern). Smoke-test asserts absence.
**Warning sign:** Smoke-test #3 fails.

### Pitfall 4: Notification re-fire from cron concurrency (P06)

**What goes wrong:** Webhook + ending-soon cron both fire notification for same event → two emails.
**Why it happens:** No dedupe key.
**How to avoid:** `Notification.dedupeKey @unique` + `Block.endingSoonNotifiedAt`. Duck-typed P2002 catch.
**Warning sign:** User reports two emails for the same event, or smoke-test #12 fails.

### Pitfall 5: /api/orders DDoS (P07)

**What goes wrong:** Viral moment → bot floods `POST /api/orders` → Bictorys quota burn → platform down.
**Why it happens:** Current limiter is 10/min per IP — too generous for sustained hours.
**How to avoid:** 20/min IP + 100/hour IP + 5/min per email + circuit breaker + 10min PENDING TTL.
**Warning sign:** Bictorys 403/5xx rate spike in logs, or `WebhookLog` count growing much faster than `Order` paid count.

### Pitfall 6: Neon tx timeout (P08 from Phase 1)

**What goes wrong:** Long `$transaction` on Neon serverless times out (default 5s).
**Why it happens:** Heavy post-tx work inside the transaction.
**How to avoid:** Keep transaction body under 2s. Move email dispatch + notification creation OUTSIDE the transaction block (Q4 pattern).
**Warning sign:** P2028 or P1002 error codes in webhook logs.

### Pitfall 7: Circuit breaker multi-instance leak (new for Phase 2)

**What goes wrong:** In-memory circuit breaker state is per-process. Multi-instance deploy means one instance stays "closed" while another is "open", distributing state unevenly.
**Why it happens:** Current prod is single-instance on Railway — not a problem today. Document as future concern.
**How to avoid:** If prod scales out, migrate circuit breaker state to Redis (`SET bictorys:failures:{ts}` with TTL).
**Warning sign:** Railway scales to 2+ replicas.

---

## Runtime State Inventory

Phase 2 is a wiring phase — not a rename, migration, or refactor. Runtime state inventory categories evaluated:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Phase 2 adds `Notification` rows (Phase 1 created the table), optionally writes `Block.endingSoonNotifiedAt`. Both are new fields/tables with no legacy data to migrate. | None — strictly additive |
| Live service config | None — no n8n/Datadog/Tailscale in scope | None |
| OS-registered state | None — no Task Scheduler / launchd / systemd changes | None |
| Secrets/env vars | `BICTORYS_WEBHOOK_SECRET` already required for webhook HMAC; no new env vars | None |
| Build artifacts | Prisma client regenerates automatically on `npm run db:push` if Q8 optional migration runs | Re-run `npm run build` after migration |

**Phase 2 is entirely additive** — no runtime state cleanup required.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| PostgreSQL (Neon dev branch) | All routes | Assumed via `DATABASE_URL` | — | — |
| Upstash Redis | Rate limiters, JobQueue | Assumed via `UPSTASH_REDIS_REST_URL` | — | — |
| Bictorys sandbox API | smoke-test #7..9 | Assumed via `BICTORYS_API_KEY` | — | Skip smoke-test #7..9 in offline mode — flag |
| Resend | Notification email tier | Assumed via `RESEND_API_KEY` | — | Email delivery fails silently via `deadLetter` queue — acceptable |
| `tsx` CLI | smoke-test, seed-dev | In `backend/package.json` dev deps | — | — |
| `node:assert/strict` | smoke-test harness | Node.js built-in (Node 18+) | — | — |

**Missing dependencies with no fallback:** None under normal dev conditions.

**Missing dependencies with fallback:** If Bictorys sandbox is unreachable during smoke-test, assertions #7–11 become mock-driven (craft the webhook payload locally and POST directly to `/api/webhooks/bictorys` with a valid HMAC signature from `BICTORYS_WEBHOOK_SECRET`). Recommend **always use the mock path for smoke-test** — don't depend on the real sandbox.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node built-in (`node:assert/strict`) + tsx runner |
| Config file | None — standalone tsx scripts |
| Quick run command | `cd backend && npx tsx scripts/smoke-test.ts` (requires server running) |
| Full suite command | `cd backend && npm run build && npx tsx scripts/test-slug.ts && npx tsx scripts/test-commission.ts && npx tsx scripts/test-schemas.ts && npx tsx scripts/smoke-test.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-01 | Public list excludes private | Smoke | smoke-test #3 | ❌ Wave 0 |
| DISC-02 | Detail by slug returns private | Smoke | smoke-test #4 | ❌ Wave 0 |
| DISC-03 | Participants mask anonymous + private msg | Smoke | smoke-test #5, #6 | ❌ Wave 0 |
| DISC-04 | Cache-Control private | Smoke | smoke-test #4 (header assertion) | ❌ Wave 0 |
| DONA-04 | Commission 6%/8% | Smoke + Phase 1 test-commission | smoke-test #7, #8 | ❌ Wave 0 (smoke) / ✅ (Phase 1 unit) |
| DONA-05 | Rate limits | Smoke | smoke-test #9, #10 | ❌ Wave 0 |
| DONA-08 | Webhook exactly-once | Smoke | smoke-test #11 | ❌ Wave 0 |
| NOTF-03 | Milestone dedup | Smoke | smoke-test #12 | ❌ Wave 0 |
| NOTF-08..11 | Notifications feed | Smoke | smoke-test #15 | ❌ Wave 0 |
| AUTH-01..03 | Auth gap-fill already shipped | Smoke | smoke-test #2 | ❌ Wave 0 |
| KYC-02, KYC-03 | KYC gate | Smoke | smoke-test #13, #14 | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && npm run build` (fast, ~3s)
- **Per wave merge:** Full suite command above
- **Phase gate:** Full suite green + manual curl of all 3 cagnottes routes + 4 notifications routes

### Wave 0 Gaps

- [ ] `backend/scripts/smoke-test.ts` — creates the harness
- [ ] `backend/scripts/seed-dev.ts` — creates the fixtures
- [ ] No framework install needed — built-in

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing bcrypt 12 rounds + JWT in httpOnly cookies + timing-safe compare |
| V3 Session Management | yes | Existing 15min access + 7d refresh + CSRF double-submit |
| V4 Access Control | yes | `requireAuth` re-queries seller from DB on every mutation |
| V5 Input Validation | yes | Zod on every new route handler; `escapeHtml` on email bodies |
| V6 Cryptography | yes | `crypto.timingSafeEqual` on webhook signature + email code compare — existing |
| V7 Error Handling | yes | `logger.*` with production redaction (existing `lib/logger.ts`) |
| V8 Data Protection | yes | `Cache-Control: private, no-store` on private cagnottes |
| V11 Business Logic | yes | Rate limits + circuit breaker + commission invariant |
| V13 API | yes | All new routes mounted with CSRF (writes) or behind `requireAuth` |

### Known Threat Patterns for Express 5 + Prisma + Bictorys

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Webhook replay | Repudiation / Tampering | `@@unique([externalId, eventType])` + HMAC + 5-min timestamp window (existing) |
| Commission tampering via client amount | Tampering | `expectedAmount` recomputed server-side from DB; `computeCommission` helper |
| Private cagnotte disclosure | Information Disclosure | SQL-level visibility filter + `Cache-Control: private, no-store` |
| Donation flood | DoS | 20/min IP + 5/min per email + circuit breaker + PENDING TTL 10min |
| Notification spam | DoS / Info Disclosure | `Notification.dedupeKey @unique` + email queue throttling |
| CSRF on mark-read | Tampering | `verifyCsrf` middleware on `/api/notifications` |
| SQL injection via slug | Tampering | Prisma parameterized + slug regex validation |
| XSS in donor message on public wall | Tampering / Info Disclosure | Frontend React text rendering + `escapeHtml` in email HTML (existing) |
| Orphan `Seller.notificationPrefs` trust | Tampering | Zod shape on PATCH /prefs; default-safe missing keys |

---

## 3-Plan Task Breakdown Preview

The planner can formalize these into PLAN.md files with minimal rework.

### Plan 02-01: Public cagnottes routes + orders extension

**Goal:** Public GET-only cagnottes routes are live, order creation uses the new commission helper + rate limits + circuit breaker, slug generation is wired into block creation.

**Tasks (suggested):**

1. **Add `BLOCK_RESERVED_SLUGS` + `slugify` + `ensureUniqueSlug` wiring** into `POST /api/blocks` (FUNDRAISER path). Consume Phase 1 `lib/cagnottes/slug.ts`. ~25 LOC delta in `blocks.ts`. Commit: `feat(blocks): wire slug generation for FUNDRAISER`.

2. **Create `lib/payments/circuitBreaker.ts`** with `isBictorysCircuitOpen`, `recordBictorysFailure`, `recordBictorysSuccess`. ~50 LOC new. Commit: `feat(payments): bictorys circuit breaker`.

3. **Extend `routes/orders.ts`:**
   - Extend `createOrderSchema` with `isAnonymous`, `messageIsPrivate`, optional `cagnotteSlug`.
   - Replace `commissionRate = ...` + `Math.round` (lines 211–213) with `computeCommission(totalExpected, block.config.subtype)` for FUNDRAISER orders.
   - Wire `isBictorysCircuitOpen()` check before `provider.createTransaction`, `recordBictorysFailure()` on error, `recordBictorysSuccess()` on success.
   - Add `isAnonymous` and `messageIsPrivate` to `tx.order.create`.
   - Replace `createOrderLimiter` (lines 50–57) with three composed limiters (Q2).
   - Reduce `expirePendingOrders` PENDING TTL from 30 to 10min in `index.ts:159`.
   Commit: `feat(orders): commission helper + composed rate limits + circuit breaker`.

4. **Create `routes/cagnottes.ts`** with 3 handlers (list, detail, participants). SQL-level visibility filter on list. `Cache-Control: private, no-store` on private detail. Mask anonymous / omit private messages on participants. ~250 LOC new. Commit: `feat(cagnottes): public discovery routes`.

5. **Mount `/api/cagnottes`** in `index.ts` after `/api/orders` mount. Commit: `feat(index): mount cagnottes router`.

6. **Build gate:** `npm run build` zero errors.

**Required code examples documented:** Q2, Q3, Q12, Q13.

### Plan 02-02: Notifications lib + hooks + routes

**Goal:** Notifications subsystem rebuilt with single entry point, wired into all 3 domain event sources (webhook, withdrawals, KYC manual trigger), exposed via authed routes, deduped at DB level.

**Tasks (suggested):**

1. **(Optional) Create Phase 2 migration** `phase2_ending_soon_dedupe` — `ALTER TABLE "Block" ADD COLUMN "endingSoonNotifiedAt" TIMESTAMP(3)`. Commit: `feat(schema): add Block.endingSoonNotifiedAt for ending-soon cron dedupe`.

2. **Create `lib/notifications/templates.ts`** — 9 template factories with French copy. ~180 LOC new. Commit: `feat(notifications): French templates`.

3. **Create `lib/notifications/milestones.ts`** — pure `detectCrossed` helper. ~40 LOC new. Test harness inline. Commit: `feat(notifications): milestone detection`.

4. **Create `lib/notifications/index.ts`** — `createNotification()` contract with duck-typed P2002 catch + seller prefs lookup + email enqueue. ~120 LOC new. Commit: `feat(notifications): single-entry createNotification`.

5. **Create `lib/notifications/dispatch.ts`** — 9 typed wrappers (`fireDonationReceived`, `fireMilestone`, etc.). ~80 LOC new. Commit: `feat(notifications): typed dispatch wrappers`.

6. **Create `lib/notifications/endingSoonCron.ts`** — `runEndingSoonSweep()` + boot catch-up. ~50 LOC new. Commit: `feat(notifications): ending-soon cron`.

7. **Refactor `routes/webhooks.ts`** PAID handler (lines 349–396) to use `upsert WebhookLog` + Serializable transaction + post-tx dispatch (`fireDonationReceived`, `fireMilestone`, `fireDonationMessage`). ~40 LOC delta. Commit: `refactor(webhooks): exactly-once dispatch + post-tx notifications`.

8. **Add payout hooks** in `routes/withdrawals.ts` (after line 340: `firePayoutCompleted`; after line 367: `firePayoutFailed`). ~10 LOC delta. Commit: `feat(withdrawals): fire payout notifications`.

9. **Add KYC hooks** in `routes/sellers.ts` KYC submit handler + inline TODO for v2 admin panel. ~6 LOC delta. Commit: `feat(sellers): wire KYC notification hooks`.

10. **Create `routes/notifications.ts`** with 5 handlers (feed, count, mark-read, GET prefs, PATCH prefs). ~180 LOC new. Commit: `feat(notifications): authed routes`.

11. **Mount `/api/notifications`** in `index.ts` with `writeLimiter + verifyCsrf` + add `runEndingSoonSweep` setInterval + boot catch-up. ~20 LOC delta. Commit: `feat(index): mount notifications + ending-soon cron`.

12. **Build gate:** `npm run build` zero errors.

### Plan 02-03: Auth/KYC verification + seed + smoke-test + CLAUDE.md

**Goal:** Phase 0 exit gate is green. Everything already-shipped by the fork is verified via smoke-test. Seed + smoke-test scripts exist. CLAUDE.md reflects Phase 2 state.

**Tasks (suggested):**

1. **Create `backend/scripts/seed-dev.ts`** — 2 sellers, 4 fundraisers (1 private, 2 festive + 2 solidaire), 10 mixed-anonymity orders, 5 notifications per seller via `createNotification`. Idempotent via `upsert`. ~250 LOC new. Commit: `feat(scripts): seed-dev fixtures`.

2. **Create `backend/scripts/smoke-test.ts`** — 15 assertions (Q15 list). Uses `node:assert/strict` + fetch wrapper + Prisma direct access for reading verification codes. Exits 1 on any failure. ~400 LOC new. Commit: `feat(scripts): smoke-test with 15 assertions`.

3. **Run smoke-test end-to-end against a live `npm run dev` server on local Neon dev DB.** Assert all 15 pass. No commit — verification step.

4. **Update CLAUDE.md** per Q14 — backend routes section, libs section, critical rules (commission + data validation), styling (navy/pink + Poppins). ~30 lines changed. Commit: `docs(claude): refresh for Phase 2 surfaces + tokens`.

5. **Final build gate:** `cd backend && npm run build` exit 0.

6. **Phase 2 exit gate:** all 15 smoke-test assertions green, CLAUDE.md merged, build clean.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Banani screen 20 notification copy matches the drafts in Q5 | Q5 | User replaces copy in discuss-phase — low risk, one edit |
| A2 | Donor anonymity masks even in creator's own feed (v1 simplification) | Q5 | User wants creator-side real name visible — requires conditional masking in `routes/notifications.ts` feed query |
| A3 | Current Railway prod is single-instance (circuit breaker in-memory OK) | Q3 | If multi-instance, state divergence — mitigation: migrate to Redis, flag as Phase 2+ future work |
| A4 | `Notification.dedupeKey` alone is sufficient for milestone/ending-soon dedup (no `Block.milestonesNotified Int[]`) | Q7 | Research SUMMARY.md suggests the column as an option — Phase 2 opts for the lighter approach, acceptable per REQUIREMENTS NOTF-03 |
| A5 | KYC approval/rejection is manual via Prisma Studio in v1 (no admin panel) | Plan 02-02 task 9 | Notifications for KYC require a trigger — document that in v1 a human runs a small script to update `kycStatus` + call `fireKycApproved/Rejected`, or that notifications fire automatically via a Prisma middleware on `Seller.kycStatus` change |
| A6 | `cd backend && npm run build` is the only build gate — no frontend touched in Phase 2 | Plans 02-01, 02-02, 02-03 | If any route change cascades into `src/lib/api.ts` types, FE build would fail — Phase 2 adds `/api/cagnottes/*` routes but FE doesn't consume yet, so safe |
| A7 | Reducing PENDING TTL from 30→10min doesn't break existing donation flow | Plan 02-01 task 3 | User reports orders expiring before Bictorys callback — mitigation: reduce expirePendingOrders tick from 5min → 2min so TTL is enforced tighter |
| A8 | The existing `/api/orders` skip on global limiter should be KEPT (dedicated limiters are tighter anyway) | Q1, Plan 02-01 task 3 | If kept, /api/orders still bypasses the global 300/15min — but 20/min IP × 15 = 300, same effective ceiling. Safe. |
| A9 | `config: {path: ["visibility"], equals: "public"}` Prisma JSON filter is supported on Neon Postgres | Q12 | If unsupported, fall back to raw SQL `$queryRaw\`SELECT ... WHERE config->>'visibility' = 'public'\`` |
| A10 | No column `Seller.notificationPrefs` schema changes needed (existing `Json?` is fine) | Q6 | Confirmed — `schema.prisma:73` already has `notificationPrefs Json?` |

All claims tagged `[ASSUMED]` here should surface to the planner for user confirmation in `/gsd-discuss-phase` before execution begins.

---

## Open Questions

1. **Donor name masking in creator feed** — does `isAnonymous` hide the real name even from the creator in the notifications feed, or only from the public participants wall?
   - What we know: public wall MUST mask (DONA-02). Creator-side behavior not spec'd.
   - What's unclear: Banani screen 20 copy "Julien R. a participé" — is "Julien R." a mask or the real name?
   - Recommendation: v1 masks everywhere (simpler); revisit in v2. Confirm with user.

2. **KYC approval trigger** — no admin panel in v1, so how does `KYC_APPROVED` notification fire?
   - What we know: KYC submit sets `kycStatus: PENDING`. PROJECT.md says "KYC admin review is manual/off-platform".
   - What's unclear: Does the human reviewer call a script? A Prisma Studio toggle? A Prisma middleware?
   - Recommendation: add a `backend/scripts/admin-approve-kyc.ts` helper in 02-03 that takes a seller ID + approve|reject + reason, flips `kycStatus`, and calls `fireKycApproved/Rejected`. Document in CLAUDE.md runbook.

3. **Frontend styling refresh in CLAUDE.md (Q14 item 5)** — should Phase 2 edit the Styling section when Phase 3 is the frontend foundation phase?
   - Recommendation: defer the navy/pink/Poppins styling edit to Phase 3 plan 03-01; in Phase 2, only update the backend-relevant sections. Keeps commits atomic.

4. **Cagnotte detail endpoint — do we return participants inline or require a second call?**
   - What we know: DISC-02 says "full detail payload in one call", DISC-03 says "separate paginated participants endpoint".
   - Recommendation: detail returns top-3 recent paid donations inline (for initial render) + provides cursor for `/:slug/participants` endpoint for pagination.

5. **Rate limiter skip for `/api/cagnottes`** — does the global 300/15min limiter need tightening for the list endpoint?
   - Recommendation: no — 300/15min is already generous for a mostly-cached public list. Trust the global limiter.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Math.round` commission (orders.ts:212) | `Math.floor` via `computeCommission` | Phase 1 01-03 shipped helper, Phase 2 02-01 wires | Prevents 1-FCFA drift (P03) |
| `createOrderLimiter` 10/min IP single-layer | 3 composed limiters (20/min IP + 100/hour IP + 5/min email) + circuit breaker | Phase 2 02-01 | Mitigates P07 DDoS |
| Webhook findFirst-then-update race | `upsert WebhookLog @@unique` + Serializable tx + post-tx dispatch | Phase 2 02-02 | Mitigates P01 double-credit |
| Inline email sends in webhook handler | `createNotification` → `emailQueue.add` fire-and-forget | Phase 2 02-02 | Mitigates P13 email latency, enables dedup via `Notification.dedupeKey` |
| Ending-soon cron (didn't exist) | `setInterval runEndingSoonSweep` hourly + boot catch-up + `Block.endingSoonNotifiedAt` | Phase 2 02-02 | Mitigates P14 cron miss on restart |

**Deprecated/outdated (do NOT revive):**
- `handleCommunityPaymentWebhook` — dead code, keep for compile, do not extend
- `generateSubToken` stub at `webhooks.ts:11` — fork-cleanup residue, keep stub
- `Math.round` for commission — banned
- `createOrderLimiter` 10/min single-layer — to be replaced

---

## Sources

### Primary (HIGH confidence)

- `backend/src/index.ts` lines 1–214 — middleware chain, limiters, route mounts, background jobs
- `backend/src/routes/orders.ts` lines 1–600 — current createOrderSchema, limiter, commission bug at line 212, transaction block
- `backend/src/routes/webhooks.ts` lines 1–543 — signature verify, FUNDRAISER branch, current idempotency pattern
- `backend/src/routes/auth.ts` lines 1–803 — all auth endpoints already shipped
- `backend/src/routes/withdrawals.ts` lines 1–397 — KYC gate, PIN enforce, balance endpoint
- `backend/src/routes/sellers.ts` lines 270–1126 — KYC submit, withdrawal-pin CRUD
- `backend/src/lib/commission.ts` — full 74 lines (Phase 1 output)
- `backend/src/lib/queues/JobQueue.ts` — `add(data, priority)` signature (no jobKey param)
- `backend/src/lib/queues/emailQueue.ts` — 3 tiers, fire-and-forget pattern
- `backend/src/lib/payments/bictorys.ts` — `createTransaction` with 3 WAF retries (circuit breaker wraps at route layer, not inside)
- `backend/prisma/schema.prisma` — `Block` (line 146), `Order` (line 344), `Seller.notificationPrefs` (line 73), `Notification` (line 523), `NotificationType` enum (line 552)
- `.planning/phases/01-backend-foundations/VERIFICATION.md` — confirms all Phase 1 artifacts shipped

### Secondary (MEDIUM confidence)

- `.planning/research/SUMMARY.md` — pitfall mapping, roadmap
- `.planning/research/PITFALLS.md` — P01, P05, P06, P07 explicit
- `.planning/REQUIREMENTS.md` — NOTF-04 locks `Block.endingSoonNotifiedAt` field approach
- `.planning/banani/BACKEND-PLAN.md` — notification enum French seed copy
- `.planning/banani/STATUS.md` — 24-screen inventory

### Tertiary (LOW confidence)

- Banani screen 20 exact French copy — not extracted from source JSX; drafts in Q5 grounded in BACKEND-PLAN.md comments. **Flag for user confirmation in discuss-phase.**

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps, all primitives verified in codebase
- Architecture: HIGH — 3-plan split maps cleanly to 3 isolated surfaces
- Pitfalls: HIGH — all 5 critical pitfalls have concrete file paths + LOC estimates + smoke-test assertions
- Notification copy: MEDIUM — drafts grounded in fork plan, not extracted from Banani JSX
- Circuit breaker: MEDIUM — hand-rolled, no external pattern reference; single-instance caveat flagged

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days for stable backend wiring work)
**Researcher notes:** Phase 2 is the biggest phase by LOC (~1,750 new + ~150 modified) but the lowest by conceptual risk. Everything is composition on existing primitives. The hardest conceptual piece is the webhook post-transaction notification dispatch — Q4 answers it directly. The second-hardest is the rate limiter composition — Q2 answers it with a verified pattern from the existing `leadMagnetProductLimiter`. Plan 02-03 is mostly verification of already-shipped work.
