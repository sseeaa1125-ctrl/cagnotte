---
phase: 01-backend-foundations
verified: 2026-04-13T12:00:00Z
status: passed
score: 12/12 must-haves verified
overrides_applied: 0
---

# Phase 1: Backend Foundations Verification Report

**Phase Goal:** The data model, slug generation, FUNDRAISER config, and commission calculation are extended, pure-tested, and ready — no routes touched yet.
**Verified:** 2026-04-13
**Status:** PASSED
**Re-verification:** No (initial verification)

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria + Plan Must-Haves)

| # | Truth | Status | Evidence |
|---|------|--------|----------|
| 1 | Named migration `phase1_cagnotte_foundations` applies `Block.slug @unique`, `Order.isAnonymous`, `Order.messageIsPrivate`, `Notification` model with `dedupeKey @unique`, `WebhookLog @@unique([externalId, eventType])` to Neon dev DB with zero errors | VERIFIED | `backend/prisma/migrations/20260413045130_phase1_cagnotte_foundations/migration.sql` exists and contains all 5 expected statements (`CREATE TABLE "Notification"`, `CREATE UNIQUE INDEX "Block_slug_key"`, `CREATE UNIQUE INDEX "Notification_dedupeKey_key"`, `CREATE UNIQUE INDEX "WebhookLog_externalId_eventType_key"`, `CREATE TYPE "NotificationType"`). `prisma migrate status` → `Database schema is up to date!` against Neon |
| 2 | `tsx backend/scripts/test-slug.ts` passes 50+ French fixtures (diacritics, reserved words, numeric-suffix collisions, never random hex) | VERIFIED | Live run: `68/68 passed`, exit 0 |
| 3 | `tsx backend/scripts/test-commission.ts` passes 100+ fixtures for both subtypes; invariant `commission + net === gross` holds with `Math.floor` | VERIFIED | Live run: `116/116 passed`, exit 0 (11 hand + 100 fuzz + 5 error). Grep confirms zero `Math.round` in `backend/src/lib/commission.ts` |
| 4 | `fundraiserBlockConfigSchema.superRefine` rejects festive without `occasion`, rejects solidaire without `cause`+`beneficiary`, documents subtype-lock contract | VERIFIED | Live run of `test-schemas.ts`: `12/12 passed`, exit 0. superRefine at schemas.ts:136 covers both branches. Subtype-lock contract documented inline (Phase 2 enforces in route) |
| 5 | `cd backend && npm run build` completes with 0 TypeScript errors | VERIFIED | Live run: `tsc` exit 0, no output |
| 6 | `Block.slug String? @unique` with btree index present in schema | VERIFIED | schema.prisma:156 `slug String? @unique` + migration contains `CREATE UNIQUE INDEX "Block_slug_key"` |
| 7 | `Order.isAnonymous` + `Order.messageIsPrivate` both default false | VERIFIED | schema.prisma:399 `isAnonymous Boolean @default(false)`; schema.prisma:400 `messageIsPrivate Boolean @default(false)` |
| 8 | `Notification` table with `dedupeKey String @unique` + `NotificationType` enum (9 variants) | VERIFIED | schema.prisma:523 model Notification; :552 enum NotificationType with 9 variants; migration defines enum with DONATION_RECEIVED, MILESTONE_REACHED, CAGNOTTE_ENDING_SOON, CAGNOTTE_ENDED, DONATION_MESSAGE, PAYOUT_COMPLETED, PAYOUT_FAILED, KYC_APPROVED, KYC_REJECTED |
| 9 | `WebhookLog` composite unique `@@unique([externalId, eventType])` for P01 dedup | VERIFIED | schema.prisma:515; migration contains `CREATE UNIQUE INDEX "WebhookLog_externalId_eventType_key"` |
| 10 | `slug.ts` exports exactly `slugify`, `ensureUniqueSlug`, `BLOCK_RESERVED_SLUGS`; imports `Prisma` from `../../generated/prisma/client.js`; no random hex | VERIFIED | 146 lines; exports confirmed at lines 27/62/113; no `Math.random`/`randomBytes`/`crypto.random` |
| 11 | `commission.ts` exports `FUNDRAISER_COMMISSION_BP` (`{solidaire: 600, festive: 800}`), `computeCommission`, `CommissionResult`, `FundraiserSubtype`; uses `Math.floor`; inline invariant tripwire | VERIFIED | 74 lines; all 4 exports found; grep confirms no Math.round |
| 12 | FUNDRAISER schema extended with subtype/occasion/cause/beneficiary/visibility/hideAmount/hideDonors + superRefine; other block schemas untouched | VERIFIED | schemas.ts:110-135 add all 7 fields; :136 superRefine block. Defaults: visibility=public, hideAmount=false, hideDonors=false |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `backend/prisma/schema.prisma` | Block.slug, Order.isAnonymous/messageIsPrivate, Notification model + enum, WebhookLog composite unique, Seller.notifications back-relation | VERIFIED | All 7 insertion points found (lines 113, 156, 399-400, 515, 523, 552) |
| `backend/prisma/migrations/20260413045130_phase1_cagnotte_foundations/migration.sql` | Named migration with CREATE TABLE / INDEX / TYPE statements | VERIFIED | 243 lines, all expected DDL present |
| `backend/src/generated/prisma/client.js` | Regenerated with new types | VERIFIED (implicit) | `npm run build` compiles against the generated client — new types (`Block.slug`, `Order.isAnonymous`, `Notification`) are referenced by the schema and pass tsc |
| `backend/src/lib/cagnottes/slug.ts` | slugify + ensureUniqueSlug + BLOCK_RESERVED_SLUGS | VERIFIED | 146 lines (≥60 min), 3 exports, imports Prisma namespace from custom path |
| `backend/scripts/test-slug.ts` | 50+ French fixture harness | VERIFIED | 294 lines (≥120 min), 68 fixtures, exits 0 |
| `backend/src/lib/commission.ts` | FUNDRAISER_COMMISSION_BP + computeCommission + types | VERIFIED | 74 lines (≥40 min), 4 exports |
| `backend/scripts/test-commission.ts` | 100+ fixture invariant harness | VERIFIED | 158 lines (≥80 min), 116 fixtures, exits 0 |
| `backend/scripts/test-schemas.ts` | superRefine validation fixtures | VERIFIED | 240 lines (≥80 min), 12 fixtures, exits 0 |
| `backend/src/lib/blocks/schemas.ts` | FUNDRAISER schema extended, other schemas untouched | VERIFIED | New fields + superRefine at lines 110-191 |
| `backend/scripts/phase1-preflight.ts` | Re-runnable pre-flight guard | VERIFIED | Present (4874 bytes) |
| `backend/scripts/introspect-phase1.ts` | Post-migration DB introspection | VERIFIED | Present (2087 bytes) |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| `schema.prisma → Block.slug` | `Block_slug_key` unique index in Postgres | `prisma migrate` | WIRED (migration + `migrate status` green) |
| `schema.prisma → Notification.dedupeKey` | `Notification_dedupeKey_key` unique index | `prisma migrate` | WIRED |
| `schema.prisma → WebhookLog` | `WebhookLog_externalId_eventType_key` composite unique | `prisma migrate` | WIRED |
| `slug.ts` | `Prisma.PrismaClientKnownRequestError` in generated client | `import { Prisma } from "../../generated/prisma/client.js"` | WIRED — instanceof + duck-typed `.code === "P2002"` checks |
| `test-slug.ts` | `slug.ts` | `.js` relative import | WIRED |
| `test-commission.ts` | `commission.ts` | `.js` relative import | WIRED |
| `test-schemas.ts` | `blocks/schemas.ts` | `.js` relative import | WIRED |
| `schemas.ts` | `FundraiserSubtype` type | Subtype enum in schema (not a direct type import — enum values aligned) | WIRED (enum values match, see Notes) |

**Note on link 8:** The PLAN's key_links listed a `type import of FundraiserSubtype` from schemas.ts → commission.ts. In practice, schemas.ts declares `z.enum(["festive", "solidaire"])` directly (values match commission.ts). Since the schemas file never invokes `computeCommission`, no import is required — the type contract is enforced at the Phase 2 wiring site (routes/orders.ts). Not a gap; expected per plan contract.

### Data-Flow Trace (Level 4)

Not applicable. Phase 1 ships pure helpers + schema/migrations with no dynamic-rendering artifacts. No UI components, no API responses, no data pipelines. Level 4 skipped by design per phase scope ("no routes touched yet").

### Behavioral Spot-Checks

| # | Behavior | Command | Result | Status |
|---|---------|---------|--------|--------|
| 1 | Backend TypeScript compiles | `cd backend && npm run build` | exit 0, no output | PASS |
| 2 | Slug test harness green | `cd backend && npx tsx scripts/test-slug.ts` | `68/68 passed`, exit 0 | PASS |
| 3 | Commission test harness green (100-fixture invariant) | `cd backend && npx tsx scripts/test-commission.ts` | `116/116 passed`, exit 0 | PASS |
| 4 | Schema superRefine test green | `cd backend && npx tsx scripts/test-schemas.ts` | `12/12 passed`, exit 0 | PASS |
| 5 | Prisma migration applied to Neon dev | `cd backend && npx prisma migrate status` | `Database schema is up to date!` (4 migrations) | PASS |

All 5 spot-checks green.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SCHM-01 | 01-01 | Per-cagnotte unique slug | SATISFIED | `Block.slug String? @unique` + migration index |
| SCHM-02 | 01-01 | Donor anonymity flag | SATISFIED | `Order.isAnonymous Boolean @default(false)` |
| SCHM-03 | 01-01 | Private-message flag | SATISFIED | `Order.messageIsPrivate Boolean @default(false)` |
| SCHM-04 | 01-01 | Persisted notifications with dedupe key | SATISFIED | `Notification.dedupeKey String @unique` |
| SCHM-05 | 01-01 | WebhookLog idempotency via (externalId, eventType) | SATISFIED | `WebhookLog @@unique([externalId, eventType])` |
| FUND-01 | 01-03 | Festive with required occasion | SATISFIED | superRefine festive branch + `occasion` enum; test-schemas.ts "festive valid" + "festive missing occasion" |
| FUND-02 | 01-03 | Solidaire with required cause + beneficiary | SATISFIED | superRefine solidaire branch; test-schemas.ts "solidaire valid" + negative fixtures |
| FUND-03 | 01-03 | Public vs private visibility | SATISFIED | `visibility: z.enum(["public", "private"]).default("public")`; test-schemas.ts "private visibility" |
| FUND-04 | 01-03 | hideAmount + hideDonors toggles | SATISFIED | Both default false, opt-in; test-schemas.ts "hideAmount + hideDonors" |
| FUND-05 | 01-02 | Human-readable slug with numeric suffix | SATISFIED | `slugify` + `ensureUniqueSlug` 2..10 numeric chain; no random hex (grep confirmed) |
| FUND-06 | 01-02 | Reserved-words guard | SATISFIED | `BLOCK_RESERVED_SLUGS` 15 entries; test-slug.ts reserved-word fixtures |
| FUND-07 | 01-03 / deferred | Edit cagnotte without changing slug | SATISFIED (schema level) | Schema allows title/goal edit without touching slug column. Route enforcement (PATCH /api/blocks) is Phase 2 plan 02-01 |
| DONA-04 | 01-03 | 6% solidaire / 8% festive, `commission + net === gross` | SATISFIED | `FUNDRAISER_COMMISSION_BP = { solidaire: 600, festive: 800 }`, `Math.floor`, inline invariant, 100-fixture fuzz |
| VERI-03 | 01-03 | test-commission.ts 100-fixture invariant | SATISFIED | 116/116 green |
| VERI-04 | 01-02 | test-slug.ts 50+ French fixtures | SATISFIED | 68/68 green |

No orphaned requirements. Phase 1's 15 requirements map cleanly to the 3 plans.

### Anti-Patterns Found

None. Scanned modified files for TODO/FIXME/stub markers:

- `slug.ts` — clean; comment mentions "NOT random hex" as a forbidding remark (not a stub)
- `commission.ts` — clean; only `Math.round` mention is a historical-bug doc comment
- `schemas.ts` — clean; superRefine branches both fire correctly
- `test-*.ts` — test harnesses, not production code
- `schema.prisma` — clean; additive diff only (no deletions per summary)

No blocker/warning/info anti-patterns.

### Human Verification Required

None. All Phase 1 concerns are verifiable via automated tests (pure helpers, schema/migration, zod validation). UI, real-time behavior, external services, and user flows are explicitly out of scope per the phase goal ("no routes touched yet"). Human verification belongs to Phase 2+ (where routes start calling these helpers).

### Gaps Summary

None. Phase 1 achieved every success criterion from ROADMAP.md and every must-have from the 3 plan frontmatters. All 12 observable truths verified, all 11 artifacts present and substantive, all key links wired, all 5 behavioral spot-checks green, all 15 requirements satisfied.

Key notes:

1. **Migration applied via escape hatch** (`prisma migrate diff` + `migrate deploy`) rather than `prisma migrate dev` due to non-interactive environment constraint. Documented in 01-01-SUMMARY; the resulting migration file is identical to what `migrate dev` would have produced and is replayable in prod. Not a gap — the ROADMAP SC says "produces a named migration file" and one exists with the correct name + contents.

2. **Out-of-scope drift folded into migration.** The Phase 1 migration also contains pre-existing orphan-model drift (SlugHistory, TelegramVerification, Product field additions, etc.) per CLAUDE.md's explicit "don't clean the orphan schema" rule. This is noted in 01-01-SUMMARY and is the only safe path: `prisma migrate diff` operates against the live schema, not a curated subset. Not a gap.

3. **`routes/orders.ts:212` Math.round bug unchanged** by design. Plan 01-03 explicitly defers this to Phase 2 plan 02-01. Confirmed by the plan's own scope statement. Not a gap.

4. **FUND-07 (edit without changing slug)** is satisfied at the schema level (the slug column is independent of title). Full route enforcement lives in Phase 2.

---

## Verdict: PASS

Phase 1 Backend Foundations is complete. All success criteria met, all tests green, all requirements traced. Recommended action: advance to **Phase 2: Backend Surfaces & Exit Gate**.

_Verified: 2026-04-13_
_Verifier: Claude (gsd-verifier)_
