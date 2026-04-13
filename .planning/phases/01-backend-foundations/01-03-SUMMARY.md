---
phase: 01-backend-foundations
plan: 03
subsystem: fundraiser-schema-and-commission
tags: [zod, schema, superRefine, commission, basis-points, integer-math, p03]
requires:
  - backend/src/lib/blocks/schemas.ts (existing FUNDRAISER schema from fari.store fork)
  - zod (already a backend dependency)
provides:
  - backend/src/lib/commission.ts — FUNDRAISER_COMMISSION_BP, computeCommission, CommissionResult, FundraiserSubtype
  - fundraiserBlockConfigSchema extension — subtype/occasion/cause/beneficiary/visibility/hideAmount/hideDonors + .superRefine cross-field validation
  - 116-fixture commission test harness (10 hand + 100 fuzz + 5 error)
  - 12-fixture schema test harness (FUND-01..FUND-04 coverage)
  - Subtype-lock contract documented inline (Phase 2 02-01 enforces in PATCH route)
affects:
  - (no routes touched; backend/src/routes/orders.ts Math.round bug is intentionally left for Phase 2)
tech-stack:
  added: []
  patterns:
    - basis-points integer math (rate=600/800, commission = floor(gross * rate / 10000))
    - Math.floor rounding (favors seller, prevents over-collection)
    - inline invariant assertion (commission + net === gross) as defense-in-depth tripwire
    - Zod .superRefine() for cross-field validation when single-field validators can't express the rule
    - deterministic seeded LCG (seed=42) for reproducible fuzz tests
key-files:
  created:
    - backend/src/lib/commission.ts
    - backend/scripts/test-commission.ts
    - backend/scripts/test-schemas.ts
  modified:
    - backend/src/lib/blocks/schemas.ts (FUNDRAISER schema only)
decisions:
  - Used Math.floor (NOT Math.round) for commission rounding. This favors the seller — the platform takes at most the nominal rate, never a fractional FCFA above it. The invariant `commission + net === gross` holds by construction since `net = gross - commission` and both are integers.
  - Kept FUNDRAISER_COMMISSION_BP as a `const` object literal with `as const`. No PlatformConfig table in v1 — to change rates, edit the constant. v2 may introduce a config row per PROJECT.md.
  - Added Number.isInteger + non-negative guard inside computeCommission (catches NaN, Infinity, fractional, negative). NaN is rejected because `Number.isInteger(NaN) === false`.
  - superRefine error messages are written in French and include the field name in the message text (e.g., "L'occasion est requise pour une cagnotte festive."). Frontend wizard will surface them verbatim under the relevant input.
  - The festive null-cause/null-beneficiary case is allowed (passes validation) — the `data.cause != null` check skips both `null` and `undefined`. This lets the wizard submit explicit nulls when a user toggles between subtypes mid-form.
  - Subtype-lock contract is COMMENT-ONLY in Phase 1. Zod has no Prisma-state access, so the lock must live in the route layer (Phase 2 plan 02-01).
  - The 11-fixture target was exceeded: 12 schema fixtures + 116 commission fixtures (target was ≥11 + ≥113 = 124; we shipped 128).
metrics:
  duration: ~25min
  completed: 2026-04-13
  tasks_total: 3
  tasks_completed: 3
  fixtures_commission_total: 116
  fixtures_commission_target: 113
  fixtures_schema_total: 12
  fixtures_schema_target: 11
---

# Phase 01 Plan 03: FUNDRAISER Schema Extension + Commission Helper Summary

One-liner: Extended `fundraiserBlockConfigSchema` with the festive/solidaire subtype system + privacy toggles (Zod superRefine), and shipped a pure `computeCommission()` helper with hard-coded 6%/8% basis points, all exercised by 128 standalone tsx fixtures.

## Tasks

| Task | Name                                                  | Status | Commit  |
| ---- | ----------------------------------------------------- | ------ | ------- |
| 1    | commission.ts + 116-fixture test harness              | Done   | 93d93c3 |
| 2    | fundraiserBlockConfigSchema extension + 12 fixtures   | Done   | 9cd7298 |
| 3    | Full Phase 1 sweep (build + 3 tests + migrate status) | Done   | (verify-only, no commit) |

## Test Results

### test-commission.ts (Task 1)

```
=== Hand fixtures ===
✓ hand: gross=0 solidaire
✓ hand: gross=500 solidaire
✓ hand: gross=1 solidaire
✓ hand: gross=15000 solidaire
✓ hand: gross=2500 solidaire
✓ hand: gross=10001 solidaire
✓ hand: gross=0 festive
✓ hand: gross=1 festive
✓ hand: gross=15000 festive
✓ hand: gross=9999 festive
✓ hand: gross=1000000 festive

=== Fuzz fixtures (100) ===
✓ fuzz #1 (solidaire, gross=…)
…
✓ fuzz #100 (festive, gross=1634860)

=== Error fixtures ===
✓ error: negative gross
✓ error: fractional gross
✓ error: unknown subtype
✓ error: NaN gross
✓ error: Infinity gross

116/116 passed
exit: 0
```

11 hand + 100 fuzz + 5 error = 116 fixtures. Plan target was ≥113. The invariant `commission + net === gross` is asserted on every fuzz iteration AND inside `computeCommission` itself.

### test-schemas.ts (Task 2)

```
=== fundraiserBlockConfigSchema fixtures ===
✓ festive valid
✓ festive missing occasion
✓ festive with cause
✓ festive with beneficiary
✓ solidaire valid
✓ solidaire missing cause
✓ solidaire missing beneficiary
✓ solidaire with occasion
✓ missing subtype
✓ private visibility
✓ hideAmount + hideDonors
✓ festive valid with null cause/beneficiary

12/12 passed
exit: 0
```

12 fixtures cover FUND-01 (festive subtype), FUND-02 (solidaire subtype), FUND-03 (cross-contamination rejection in both directions), FUND-04 (privacy defaults + opt-out toggles). The "festive valid with null cause/beneficiary" fixture pins the explicit-null contract for the wizard reset case.

### Phase 1 Combined Sweep (Task 3)

```
$ cd backend && npm run build
> tsc
exit: 0

$ npx tsx scripts/test-slug.ts        # plan 01-02
68/68 passed
exit: 0

$ npx tsx scripts/test-commission.ts  # this plan
116/116 passed
exit: 0

$ npx tsx scripts/test-schemas.ts     # this plan
12/12 passed
exit: 0

$ npx prisma migrate status            # plan 01-01
4 migrations found in prisma/migrations
Database schema is up to date!
```

All 5 Phase 1 gates green. Total: 196 fixture-level checks across plans 01-02 and 01-03.

## Build Gate

```
> cagnottes-sn-backend@0.1.0 build
> tsc
exit: 0
```

Zero TypeScript errors. The new `subtype` requirement on `fundraiserBlockConfigSchema` did NOT break the build because `routes/blocks.ts:330` and `routes/blocks.ts:435` call `validateBlockConfig(type, data.config)` with `data.config: unknown` — the missing field is a runtime Zod failure, not a compile-time TS error. The route will start rejecting subtype-less FUNDRAISER POSTs at runtime, which is the expected Phase 1 → Phase 2 handoff.

## Locked Decisions

### 1. Math.floor over Math.round (P03 mitigation)

`computeCommission` uses `Math.floor((gross * rate) / 10000)` exclusively. The existing `routes/orders.ts:212` still does `Math.round(totalExpected * commissionRate / 10000)` — that bug is **intentionally untouched** in this plan and is Phase 2 plan 02-01's replacement target. Grep confirms zero `Math.round` in `backend/src/lib/commission.ts` (only in code comments documenting the historical bug).

### 2. Inline invariant assertion as a tripwire

```typescript
if (commission + net !== gross) {
  throw new Error(`computeCommission invariant violated: ${commission} + ${net} !== ${gross} …`);
}
```

This block can ONLY fire if a future commit changes the math (e.g. someone "fixes" rounding to `Math.round`, or refactors `net = gross - commission` to a fresh `Math.floor` call). The test harness re-asserts the invariant for 100 fuzz fixtures, so the regression would be caught by both the unit script and the helper itself.

### 3. NaN/Infinity guarded by `Number.isInteger`

`Number.isInteger(NaN)` and `Number.isInteger(Infinity)` are both `false`, so the existing `if (!Number.isInteger(gross) || gross < 0)` guard catches both pathological inputs without any extra branching. The two bonus error fixtures (`NaN gross`, `Infinity gross`) pin this behavior.

### 4. Festive null-cause/null-beneficiary explicitly allowed

The superRefine uses `data.cause != null` (and `data.beneficiary != null`), which is `false` for both `null` and `undefined`. This means the wizard can submit `{ cause: null, beneficiary: null }` after a user toggles from solidaire → festive without a fresh validation error. The bonus fixture "festive valid with null cause/beneficiary" pins this.

### 5. Schema-shipped subtype lock is comment-only

The `fundraiserBlockConfigSchema` doc comment says explicitly:

> SUBTYPE-LOCK CONTRACT (Phase 2 plan 02-01 will enforce):
>   Once a Block has any Order with paymentStatus = PAID, `subtype` CANNOT change.
>   This is enforced in `PATCH /api/blocks/:id` … This schema does NOT enforce the lock because Zod has no access to Prisma state.

This is the contract handoff for Phase 2 plan 02-01.

## Math.round Bug in routes/orders.ts (Phase 2 hand-off)

Confirmed unchanged at `backend/src/routes/orders.ts:212`:

```typescript
const commissionAmount = Math.round(totalExpected * commissionRate / 10000);
```

Phase 2 plan 02-01 will replace this with:

```typescript
const { rate: commissionRate, commission: commissionAmount, net: sellerAmount } =
  computeCommission(totalExpected, block.config.subtype);
```

The Phase 1 contract is "schema + helper exist and are tested in isolation"; the wire-up belongs to Phase 2.

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks ran on first attempt with no Rule 1/2/3 fixes needed. No CLAUDE.md directive collisions. No analysis paralysis. All verification gates green.

## Threat Flags

None. This plan introduces zero new network surface, zero new file I/O, zero new auth paths, and zero schema additions at the trust boundary (all Phase 1 schema work landed in plan 01-01). The new code is:

- A pure function (`commission.ts`) — no side effects, no I/O, no network.
- A Zod schema extension (`schemas.ts`) — pure validation, executed only when Phase 2 routes call `validateBlockConfig`.

The plan's `<threat_model>` mitigation table was satisfied:

- T-01-03-01 (rounding drift) — mitigated by Math.floor + inline invariant + 100-fixture fuzz test.
- T-01-03-02 (festive without occasion) — mitigated by superRefine with French error at `path: ["occasion"]`.
- T-01-03-03 (cross-contamination subtype bypass) — mitigated by superRefine on both branches.
- T-01-03-04 (hideAmount/hideDonors default false) — accepted per FUND-04.
- T-01-03-05 (subtype change after paid orders) — deferred to Phase 2 (mitigate-phase-2 disposition); contract documented in code comment.
- T-01-03-06 (future dev "fixes" Math.floor → Math.round) — mitigated by inline invariant + test harness.

## Self-Check: PASSED

- [x] `backend/src/lib/commission.ts` exists (78 lines)
- [x] Exports: `FUNDRAISER_COMMISSION_BP`, `computeCommission`, `CommissionResult`, `FundraiserSubtype`
- [x] `FUNDRAISER_COMMISSION_BP = { solidaire: 600, festive: 800 } as const`
- [x] Zero `Math.round` in `commission.ts` (grep: only in code comments)
- [x] Inline invariant `if (commission + net !== gross)` present
- [x] `backend/src/lib/blocks/schemas.ts` `fundraiserBlockConfigSchema` extended with subtype/occasion/cause/beneficiary/visibility/hideAmount/hideDonors
- [x] `.superRefine` block has both festive and solidaire branches
- [x] All superRefine messages in French (grep: "requise", "requis", "vide")
- [x] Other schemas in `schemas.ts` unchanged (git diff confirms only `fundraiserBlockConfigSchema` modified)
- [x] `backend/scripts/test-commission.ts` exists, 11 hand + 100 fuzz + 5 error = 116 fixtures
- [x] `backend/scripts/test-schemas.ts` exists, 12 fixtures
- [x] `tsx scripts/test-commission.ts` exits 0 with `116/116 passed`
- [x] `tsx scripts/test-schemas.ts` exits 0 with `12/12 passed`
- [x] `tsx scripts/test-slug.ts` (plan 01-02) still exits 0 with `68/68 passed`
- [x] `npm run build` exits 0
- [x] `prisma migrate status` reports `Database schema is up to date!`
- [x] `backend/src/routes/orders.ts:212` Math.round bug unchanged (Phase 2 target)
- [x] Commit `93d93c3` (Task 1 — commission helper + tests) found in git log
- [x] Commit `9cd7298` (Task 2 — schema extension + tests) found in git log
