---
phase: 02-backend-surfaces-exit-gate
plan: 01
subsystem: public-cagnottes-surface
tags: [cagnottes, orders, rate-limit, circuit-breaker, commission, slug, p03, p05, p07]
requires:
  - backend/src/lib/commission.ts (Phase 1 plan 01-03 helper)
  - backend/src/lib/cagnottes/slug.ts (Phase 1 plan 01-02 helper)
  - backend/prisma — Block.slug, Order.isAnonymous, Order.messageIsPrivate (Phase 1 plan 01-01 schema)
provides:
  - backend/src/routes/cagnottes.ts — public list/detail/participants GET endpoints
  - backend/src/lib/payments/circuitBreaker.ts — hand-rolled in-memory Bictorys circuit breaker
  - backend/scripts/test-cagnottes.ts — standalone HTTP harness for the new routes
  - POST /api/blocks (FUNDRAISER) generates unique slug via Phase 1 helper
  - POST /api/orders accepts isAnonymous/messageIsPrivate/cagnotteSlug
  - POST /api/orders FUNDRAISER commission via computeCommission() (P03 fixed)
  - POST /api/orders three composed rate limiters (20/min IP + 100/hour IP + 5/min email)
  - POST /api/orders fast-fail 503 when Bictorys circuit OPEN
  - PENDING order TTL reduced 30 → 10 minutes
affects:
  - backend/src/routes/orders.ts
  - backend/src/routes/blocks.ts (POST handler only)
  - backend/src/index.ts (TTL + route mount)
tech-stack:
  added: []
  patterns:
    - express-rate-limit middleware composition (3 chained limiters with prefixed Redis stores + custom keyGenerator + validate:false)
    - Hand-rolled in-memory circuit breaker (5 failures / 30s rolling window → 60s cooldown)
    - Prisma JSON path filter at SQL level (config.path=["visibility"] equals "public") — never JS post-filter
    - Cursor pagination via `take: limit + 1` + `cursor: { id }` + `skip: 1`
    - Single Prisma groupBy aggregate per page (no N+1)
    - Centralized maskDonation() helper shared by detail-preview + participants endpoints
    - ensureUniqueSlug() closure-based create pattern (closure captures the result)
key-files:
  created:
    - backend/src/routes/cagnottes.ts (379 LOC)
    - backend/src/lib/payments/circuitBreaker.ts (88 LOC)
    - backend/scripts/test-cagnottes.ts (231 LOC)
  modified:
    - backend/src/routes/orders.ts
    - backend/src/routes/blocks.ts
    - backend/src/index.ts
decisions:
  - Slug wiring shipped in 02-01 (not deferred to 02-03). Without it the new GET /api/cagnottes routes would have nothing to serve in CI/dev, and the public list endpoint would be untestable end-to-end.
  - Circuit breaker lives at the route layer (`routes/orders.ts`) — NOT inside `lib/payments/bictorys.ts`. The Bictorys lib already has its own WAF retry loop; double-wrapping would interleave two retry policies. The route layer also has the cleanest place to short-circuit to 503 before any side effects.
  - Single in-memory state for the breaker (per CLAUDE.md "Railway single-instance" assumption). Documented inline that horizontal scaling requires a Redis-backed swap; T-02-09 is an accepted risk.
  - Hoisted `donationBlock` out of the `if (orderType === "DONATION")` block so the commission branch downstream can read `donationBlock.config.subtype`. Default value `null` lets the legacy non-FUNDRAISER path still hit the existing Math.round formula.
  - 10min TTL + 5min setInterval tick ⇒ worst-case stale row lives ~14m45s. Acceptable per RESEARCH A7.
  - Test harness is fixture-tolerant: if the DB has no FUNDRAISER rows, the per-row shape and detail/participants assertions skip with a warning rather than fail. Full end-to-end seeded smoke runs in plan 02-03.
  - Slug generation uses the closure-based `ensureUniqueSlug(base, createFn)` pattern from Phase 1 — the closure captures the created block so the existing `prisma.block.create()` call site stays in the same try block. P2002 retries are atomic with the unique-index backstop from plan 01-01.
  - Cache-Control branch is shared by the detail endpoint AND the participants endpoint. Forgetting the participants endpoint would have been a P05 leak waiting to happen — both endpoints inherit the visibility branch.
metrics:
  duration: ~35min
  completed: 2026-04-13
  tasks_total: 3
  tasks_completed: 3
  files_created: 3
  files_modified: 3
  loc_created: 698
---

# Phase 02 Plan 01: Backend Surfaces & Exit Gate (P05/P07/P03 mitigations) Summary

One-liner: Shipped the public donor-facing surface (`routes/cagnottes.ts` with list/detail/participants), wired the Phase 1 commission + slug helpers into orders and blocks, replaced the single 10/min order limiter with three composed limiters + a hand-rolled Bictorys circuit breaker, and reduced PENDING order TTL from 30 to 10 minutes — closing P03, P05, and P07 in one plan.

## Tasks

| Task | Name                                                                                       | Status | Commit  |
| ---- | ------------------------------------------------------------------------------------------ | ------ | ------- |
| 1    | Bictorys circuit breaker + slug wiring on POST /api/blocks                                 | Done   | 91ebe53 |
| 2    | orders commission helper + composed rate limits + circuit breaker + 10min TTL              | Done   | 210e604 |
| 3    | Public cagnottes routes (list/detail/participants) + test script                           | Done   | c19f7e2 |

## What Shipped

### Created (3 files, 698 LOC)

1. **`backend/src/lib/payments/circuitBreaker.ts`** (88 LOC)
   - Pure in-memory state machine, zero deps.
   - Exports `isBictorysCircuitOpen()`, `recordBictorysFailure()`, `recordBictorysSuccess()`, `__resetCircuitForTests()`.
   - Constants: `WINDOW_MS=30_000`, `COOLDOWN_MS=60_000`, `FAILURE_THRESHOLD=5`.
   - Documents single-instance assumption and the v2 Redis migration path.

2. **`backend/src/routes/cagnottes.ts`** (379 LOC)
   - 3 GET handlers: list, detail, participants.
   - SQL-level visibility filter: `config: { path: ["visibility"], equals: "public" }`.
   - Cursor pagination via `take: limit + 1` (limit cap 50 for list, 100 for participants).
   - Single `prisma.order.groupBy` per page for `totalRaised` + `donorCount` (no N+1).
   - Top-3 recent paid donations preview embedded in detail payload.
   - Cache-Control branch on detail AND participants: `private, no-store` for private cagnottes; `public, max-age=60` otherwise.
   - Centralized `maskDonation()` helper shared by detail preview + participants.
   - Slug param Zod-validated against `/^[a-z0-9-]+$/` (rejects 400 on uppercase/underscores).

3. **`backend/scripts/test-cagnottes.ts`** (231 LOC)
   - 5 mandatory assertions + 3 fixture-dependent (skip cleanly when no fixtures).
   - Probes list shape, Cache-Control header, limit cap, 404 on nonexistent, 400 on invalid slug.
   - Detail + participants happy-path and customerEmail leak check kick in once any FUNDRAISER row exists.
   - Private cagnotte invariants gated behind `PRIVATE_CAGNOTTE_SLUG` env var (full smoke runs in plan 02-03).

### Modified (3 files)

1. **`backend/src/routes/orders.ts`**
   - `createOrderSchema` extended with `isAnonymous` (default false), `messageIsPrivate` (default false), `cagnotteSlug` (optional).
   - Single `createOrderLimiter` deleted; replaced with 3 composed limiters chained on `ordersRouter.post("/", ipMin, ipHour, emailMin, handler)`.
   - `donationBlock` hoisted out of the orderType==DONATION if-block.
   - FUNDRAISER commission path now uses `computeCommission(totalExpected, subtype)` from Phase 1; legacy non-FUNDRAISER path preserved verbatim.
   - `provider.createTransaction` wrapped: `isBictorysCircuitOpen()` short-circuits to 503; success/failure recorded around the call.
   - `tx.order.create` persists `isAnonymous` + `messageIsPrivate`.

2. **`backend/src/routes/blocks.ts`**
   - POST handler: FUNDRAISER branch now wraps `prisma.block.create` inside `ensureUniqueSlug(slugify(title), createFn)`. Non-FUNDRAISER types unchanged.
   - PATCH handler intentionally untouched — slug rename is v2 per ROADMAP.

3. **`backend/src/index.ts`**
   - `cagnottesRouter` imported and mounted between `/api/orders` and `/api/webhooks`.
   - `expirePendingOrders` cutoff changed from 30 min to 10 min (renamed local `thirtyMinAgo` → `tenMinAgo`). 5-min setInterval tick unchanged.
   - `/api/orders` skip on global limiter preserved (line 91).

## Pitfalls Mitigated

| Pitfall | Where addressed | Mechanism |
|---------|----------------|-----------|
| **P03** Commission rounding drift | `routes/orders.ts` commission calc | FUNDRAISER orders go through `computeCommission()` (Math.floor + invariant assertion). Non-FUNDRAISER legacy path preserved. |
| **P05** Private cagnotte SEO leak | `routes/cagnottes.ts` list handler | SQL-level Prisma JSON path filter; `Cache-Control: private, no-store` on private detail + participants. |
| **P07** /api/orders DDoS | `routes/orders.ts` limiter block + circuit breaker + `index.ts` TTL | 3 composed rate limiters (20/min IP + 100/hour IP + 5/min email) + 5-failure circuit breaker + 10-min PENDING TTL. |

## Build / Test State

```
$ cd backend && npm run build
> tsc
exit: 0   (zero TypeScript errors)

$ API=http://localhost:4001 npx tsx scripts/test-cagnottes.ts
✓ GET /api/cagnottes returns 200 + cagnottes array
✓ GET /api/cagnottes sets Cache-Control: public, max-age=60
⊘ Per-row shape — SKIP (list endpoint returned 0 cagnottes)
✓ GET /api/cagnottes?limit=1 caps response size
✓ GET /api/cagnottes/nonexistent-slug-xyz123 returns 404
✓ GET /api/cagnottes/INVALID_CHARS returns 400
⊘ Detail + participants happy path — SKIP (no fixture)
⊘ Private cagnotte invariants — SKIP (PRIVATE_CAGNOTTE_SLUG not set)

5/5 passed (3 skipped)
exit: 0

$ npx tsx scripts/test-slug.ts        # Phase 1 plan 01-02
68/68 passed (no regression)

$ npx tsx scripts/test-commission.ts  # Phase 1 plan 01-03
116/116 passed (no regression)

$ npx tsx scripts/test-schemas.ts     # Phase 1 plan 01-03
12/12 passed (no regression)
```

Total Phase 1 + 2 fixture-level checks at end of 02-01: **196 + 5 = 201 green**.

Manual curl probes against the running server:
```
$ curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/api/cagnottes        → 200
$ curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/api/cagnottes/xyz123 → 404
$ curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/api/health           → 200
```

## Open Items Deferred

| Item | Where it lands |
|------|---------------|
| Notification dispatch wiring on order creation (donation success email/in-app) | Plan 02-02 |
| Subtype-lock enforcement in PATCH /api/blocks/:id (reject subtype change once any PAID order exists) | Plan 02-02 (per Phase 1 contract handoff) |
| Endpoint-level smoke test that seeds + asserts private/public invariants end-to-end | Plan 02-03 |
| Replace in-memory circuit breaker state with Upstash Redis-backed counter | v2 (T-02-09 accepted risk) |
| PATCH /api/blocks/:id slug regeneration | v2 per ROADMAP Phase 6 watch-out |

## Threat Model Disposition

All 10 threats from the plan's `<threat_model>` are satisfied:

- **T-02-01** (private SEO leak) — mitigated by SQL `path=["visibility"], equals: "public"` in `routes/cagnottes.ts:103`.
- **T-02-02** (private detail caching) — mitigated by `Cache-Control: private, no-store` branch in detail handler at `routes/cagnottes.ts:212` AND participants handler at `routes/cagnottes.ts:298`.
- **T-02-03** (donor PII leak) — `maskDonation()` helper applied uniformly; `customerEmail` is never selected. The test script asserts no participant entry contains a `customerEmail` key.
- **T-02-04** (commission tampering) — server-side `computeCommission(totalExpected, subtype)`; client-supplied commission fields ignored.
- **T-02-05** (orders flood) — 3-layer rate limiters + circuit breaker + 10min TTL.
- **T-02-06** (anonymous donor flood) — accepted; bound by IP layers (collateral documented).
- **T-02-07** (slug SQL injection) — Prisma parameterized + Zod regex `^[a-z0-9-]+$` on the path param.
- **T-02-08** (audit trail) — accepted; existing `createdAt` + `paymentExternalId` is sufficient for v1.
- **T-02-09** (circuit state across instances) — accepted; documented inline in `circuitBreaker.ts` with v2 Redis migration path.
- **T-02-10** (slug forgery) — slug is server-generated from title via `slugify()` + `ensureUniqueSlug()`; the request body's slug field (if any) is never read in the create path.

## Deviations from Plan

**None — plan executed exactly as written.** No Rule 1/2/3 fixes triggered. All three task commits landed on first attempt with the conventional-commit messages from the plan's `<done>` blocks. Build exit 0 throughout.

Two minor implementation detail clarifications surfaced during execution that did NOT change behavior:

1. **`ensureUniqueSlug` signature.** The plan's pseudo-code suggested `ensureUniqueSlug(title, prisma)` returning a slug. The actual Phase 1 helper signature is `ensureUniqueSlug(base, createFn)` where the closure does the create. I used the closure pattern — `slugify(title)` is called by the route to produce the base, then `ensureUniqueSlug` invokes the create closure with successive candidates. Behavior is identical to what the plan wanted; the call site is just slightly less imperative.

2. **`donationBlock` hoist.** The plan said "for FUNDRAISER orders, branch on `block.type`" but didn't note that `donationBlock` was scoped inside the `if (orderType === "DONATION")` block in the existing handler. I hoisted the declaration with a `null` default so the legacy non-DONATION orders still hit the legacy commission path without referencing an undefined variable. Documented inline.

## Threat Flags

None. The new code introduces zero new file I/O, zero new auth paths, zero schema additions, and zero new outbound network surface. The cagnottes routes are read-only, anonymous, and bound by the existing global rate limiter + per-route Cache-Control hardening.

## Self-Check: PASSED

- [x] `backend/src/lib/payments/circuitBreaker.ts` exists (88 LOC)
- [x] Exports `isBictorysCircuitOpen`, `recordBictorysFailure`, `recordBictorysSuccess`, `__resetCircuitForTests`
- [x] `backend/src/routes/cagnottes.ts` exists (379 LOC) with 3 handlers
- [x] `backend/scripts/test-cagnottes.ts` exists (231 LOC), runs against live backend, exits 0
- [x] `backend/src/routes/blocks.ts` POST handler imports `slugify` + `ensureUniqueSlug`
- [x] `backend/src/routes/orders.ts` imports `computeCommission` + circuit breaker exports
- [x] `backend/src/routes/orders.ts` schema accepts `isAnonymous` + `messageIsPrivate` + `cagnotteSlug`
- [x] `backend/src/routes/orders.ts` has 3 composed limiters (`order-ip-min`, `order-ip-hour`, `order-email-min`)
- [x] `backend/src/routes/orders.ts` `tx.order.create` persists `isAnonymous` and `messageIsPrivate`
- [x] `backend/src/routes/orders.ts` wraps `provider.createTransaction` with circuit breaker check
- [x] `backend/src/index.ts` mounts `cagnottesRouter` between `/api/orders` and `/api/webhooks`
- [x] `backend/src/index.ts` `expirePendingOrders` uses 10-minute cutoff (`tenMinAgo`)
- [x] `backend/src/index.ts` `/api/orders` skip on global limiter preserved (line 92)
- [x] `npm run build` exits 0 (zero TS errors)
- [x] Live HTTP probe: `GET /api/cagnottes` → 200, `GET /api/cagnottes/xyz` → 404
- [x] Phase 1 test scripts still pass (68 + 116 + 12 = 196 fixtures green)
- [x] Commit 91ebe53 (Task 1 — circuit breaker + slug) found in git log
- [x] Commit 210e604 (Task 2 — orders surface) found in git log
- [x] Commit c19f7e2 (Task 3 — cagnottes routes + test) found in git log
- [x] Zero new npm dependencies (no package.json change)
