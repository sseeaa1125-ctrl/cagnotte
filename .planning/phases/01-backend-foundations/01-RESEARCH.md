# Phase 1: Backend Foundations — Research

**Researched:** 2026-04-13
**Domain:** Prisma schema migration + pure TypeScript helpers (slug, commission, Zod superRefine)
**Confidence:** HIGH

## Summary

Phase 1 is entirely additive, pure, and **zero-dependency**. Three plans — (1) a Prisma migration that adds `Block.slug`, `Order.isAnonymous`, `Order.messageIsPrivate`, the `Notification` model, and a `WebhookLog` dedup constraint; (2) a pure `lib/cagnottes/slug.ts` helper with reserved-word guard and P2002 retry; (3) a Zod `superRefine` extension of `fundraiserBlockConfigSchema` + a pure `lib/commission.ts` helper with a basis-points lookup and `Math.floor` invariant. No routes are touched. Every surface is tested via standalone `tsx` scripts since there is no test framework.

The codebase is already wired for this: Prisma 7.4.1 with a custom output path (`backend/src/generated/prisma/client.js`), Zod 3.25.32 with `.superRefine()`, `tsx` 4.19.0 as a dev dep, a `RESERVED_SLUGS` set already in use for `Seller.slug` that must be extended (not replaced). The migration is the only database-touching work in the phase and uses the existing `prisma db push` flow — but we prefer `prisma migrate dev` here because Phase 1 success criterion #1 demands a named migration file (which `db push` does not produce).

**Primary recommendation:** Ship plan 01-01 first (schema migration using `migrate dev` to produce a named migration file). Then plans 01-02 (slug) and 01-03 (Zod extension + commission helper) can execute in parallel because they touch disjoint files and both depend only on the schema and existing `prisma.block` types. Invariant-based standalone test harnesses (`test-slug.ts`, `test-commission.ts`) are the only validation.

<user_constraints>
## User Constraints

**Note:** No `CONTEXT.md` exists for Phase 1 — `/gsd-discuss-phase` was not run. The binding constraints below come from the phase orchestrator prompt, `PROJECT.md` locked decisions, and `CLAUDE.md`.

### Locked Decisions (from orchestrator + PROJECT.md + CLAUDE.md)

1. **Commission rates are hard-coded basis points**: `FUNDRAISER_COMMISSION_BP = { solidaire: 600, festive: 800 }`. No `PlatformConfig` table, no runtime override. Document the v2 migration path in a code comment.
2. **Commission rounding uses `Math.floor`** (favor seller), NOT `Math.round` (the existing `orders.ts` uses `Math.round` — this must NOT be copy-pasted).
3. **Invariant `commission + net === gross`** must hold for every (gross, subtype) pair and is asserted in `test-commission.ts`.
4. **Slug algorithm is locked**: NFD normalize → strip diacritics → lowercase → collapse to `[a-z0-9-]` → trim dashes → truncate 60 chars → reserved-words block → numeric suffix retry on P2002, up to 10 attempts → 4-char timestamp fallback. **No random hex.**
5. **Reserved words for block slugs**: `api, admin, login, signup, dashboard, tableau-de-bord, profil, notifications, participations, aide, tarifs, contact, nouvelle, create, toutes-les-cagnottes`. This set is **distinct** from the existing `Seller.slug` `RESERVED_SLUGS` set — do NOT mutate the existing one, add a new set keyed to block slugs.
6. **Prisma client import path is CUSTOM**: `from "../generated/prisma/client.js"`. Never `@prisma/client`.
7. **Migration MUST use `prisma migrate dev`**, not `db push`, per phase success criterion #1 (phase prompt overrides the existing `npm run db:push` script, which was added by the fari.store fork for dev convenience).
8. **Neon migration timeout guard**: if `SELECT COUNT(*) FROM "Block" > 1000`, use 3-step pattern (add nullable → backfill → add unique index in a second migration). For the current fork the block count is almost certainly small but this must be checked in a pre-migration bash step.
9. **`subtype` locks once a block has paid orders**: the `superRefine` must call a provided `hasPaidOrders` predicate when validating updates (schemas.ts itself is pure — the route wires the predicate). Phase 1 delivers the schema support; the route enforcement lands in Phase 2.
10. **Notification model ships with `dedupeKey String @unique`** in this phase even though no code writes to `Notification` yet (it's consumed by Phase 2). Declaring the column + unique index here prevents a migration in Phase 2.
11. **Orphan Prisma models stay**: do NOT remove Product, BookingService, Community, TelegramBot, PushSubscription, Admin, CommunitySubscription, etc. Per CLAUDE.md this is a documented 5-8h rabbit hole for a later pass.
12. **Seller fields stay as-is**: `kycStatus`, `withdrawalPinHash`, `notificationPrefs` already exist. Do NOT duplicate them. Only ADD `notifications Notification[]` back-relation.
13. **Only ADD to schema**: the only existing models edited in Phase 1 are `Block` (add `slug`), `Order` (add 2 booleans), `Seller` (add back-relation), `WebhookLog` (add composite unique). No existing columns are altered or dropped.
14. **No test framework**: validation is via `tsx backend/scripts/test-*.ts` scripts that `process.exit(1)` on failure. No Vitest, no Jest, no Playwright. This is a hard project constraint — do NOT introduce one.

### Claude's Discretion (from orchestrator)

- Whether to co-locate the reserved-word set in `backend/src/lib/cagnottes/slug.ts` or a sibling `backend/src/lib/cagnottes/reserved.ts`. Recommendation: co-locate in `slug.ts` for a 1-file helper (no import churn).
- Whether the 4-char timestamp fallback uses `Date.now().toString(36).slice(-4)` or a Unix-seconds mod. Recommendation: `Date.now().toString(36).slice(-4)` (ambient JS, no deps).
- Whether to also add `@@index([blockId, paymentStatus])` on `Order` as a perf hint for Phase 2's "has paid orders" lookup. Recommendation: skip — `@@index([blockId])` already exists; composite index can be added in Phase 2 if smoke-test benchmarks warrant it.
- Whether to parameterize `computeCommission()`'s `Math.floor` as an injected rounding mode. Recommendation: skip — the rounding mode is a locked decision, injecting it is YAGNI.
- Whether the `Notification` back-relation on `Seller` goes in alphabetical order or at the end of the relation block. Recommendation: end of block (non-disruptive diff).

### Deferred Ideas (OUT OF SCOPE for Phase 1)

- **Any route wiring**: `POST /api/blocks`, `POST /api/blocks/:id/rename-slug`, `PATCH` title-change behavior — all Phase 2.
- **`createNotification()` / notifications dispatch lib / French templates / webhook hooks** — all Phase 2 (plan 02-02).
- **`routes/cagnottes.ts` public endpoints** — Phase 2 (plan 02-01).
- **`Block.endingSoonNotifiedAt` field + cron** — Phase 2 (plan 02-02). Phase 1 does NOT add this field.
- **`SlugHistory` extension for block slugs (301 redirects)** — v2 per REQUIREMENTS.md `INTG-V2-02`. Phase 1 does NOT touch `SlugHistory`.
- **Orphan Prisma model pruning** — deferred to post-launch pass per CLAUDE.md.
- **Commission per-cagnotte override / `PlatformConfig`** — v2 per `ADMN-V2-02`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHM-01 | Block gets a unique per-cagnotte slug | Plan 01-01 adds `Block.slug String? @unique` + `@@index([slug])`. Nullable for orphan block types; FUNDRAISER route will enforce non-null in Phase 2. |
| SCHM-02 | `Order.isAnonymous` flag | Plan 01-01 adds `isAnonymous Boolean @default(false)` on `Order`. |
| SCHM-03 | `Order.messageIsPrivate` flag | Plan 01-01 adds `messageIsPrivate Boolean @default(false)` on `Order`. |
| SCHM-04 | `Notification` model with `dedupeKey` unique | Plan 01-01 adds full `Notification` model + `NotificationType` enum + `dedupeKey String @unique`. Phase 2 consumes it. |
| SCHM-05 | `WebhookLog @@unique([externalId, eventType])` | Plan 01-01 adds composite unique. Existing `@@index` stays. Phase 2 upserts on this constraint. |
| FUND-01 | Festive cagnottes with required `occasion` | Plan 01-03 Zod extension + `superRefine` — rejects festive without `occasion`, rejects festive with `cause`/`beneficiary`. |
| FUND-02 | Solidaire cagnottes with required `cause` + `beneficiary` | Plan 01-03 Zod — rejects solidaire without both, rejects solidaire with `occasion`. |
| FUND-03 | Public / private visibility | Plan 01-03 — `visibility: z.enum(["public","private"]).default("public")`. |
| FUND-04 | `hideAmount` / `hideDonors` toggles | Plan 01-03 — both default to `false`. Phase 2 enforces in public endpoints. |
| FUND-05 | Human-readable slug with numeric suffix, never hex | Plan 01-02 — `slugify()` + `ensureUniqueSlug()` with numeric retry + 4-char timestamp fallback (not random hex). |
| FUND-06 | Reserved-word guard | Plan 01-02 — new `BLOCK_RESERVED_SLUGS` set (distinct from `Seller.RESERVED_SLUGS`). |
| FUND-07 | Title edit does not rename slug | Phase 1 schema supports this (slug is a standalone column, not derived). Route enforcement lands in Phase 2 — Phase 1 is schema-only. |
| DONA-04 | 6% solidaire / 8% festive commission helper | Plan 01-03 — `lib/commission.ts` pure `computeCommission(gross, subtype)` with `Math.floor` and invariant `commission + net === gross`. |
| VERI-03 | `test-commission.ts` with 100 fixtures | Plan 01-03 — standalone script, exit 1 on any invariant violation. |
| VERI-04 | `test-slug.ts` with 50 French fixtures including diacritics, reserved, collisions | Plan 01-02 — standalone script. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Directives extracted from `/Users/amadoufall/Desktop/cagnottes-sn/CLAUDE.md` that bind Phase 1:

1. **Prisma client output path is CUSTOM** (`backend/src/generated/prisma`). Never import from `@prisma/client`. Verified: existing code uses `from "../generated/prisma/client.js"`.
2. **Prisma schema intentionally left intact** — orphan models stay. Do not try to clean the schema as a side task. Phase 1 only ADDS.
3. **All monetary amounts are INTEGERS (FCFA has no cents)**. `computeCommission()` returns `{ rate, commission, net }` as integers; never `Float`.
4. **All IDs use `cuid()`**. `Notification.id` must be `String @id @default(cuid())`.
5. **All API inputs validated with Zod — never trust client data.** FUNDRAISER config extension must use Zod 3.25's `.superRefine()`.
6. **Bictorys uses two separate keys** (`BICTORYS_API_KEY` vs `BICTORYS_PRIVATE_KEY`). Not directly relevant to Phase 1 (no routes touched) but commission logic must not assume either key name.
7. **Commission is server-side (tariff TBD for cagnottes.sn)** — Phase 1 locks the tariff to 6%/8% as the answer to the TBD.
8. **French only in user-facing strings** — Phase 1 is pure backend, no UI strings, but error messages from `superRefine` must be in French (`"occasion est requise pour une cagnotte festive"`, etc.) because they will surface verbatim in Phase 5's wizard error display.
9. **`cuid()` IDs via Prisma `@default(cuid())`**. Confirmed in every existing model.
10. **Rate limiters and middleware chain are untouched** — Phase 1 does not edit `index.ts`.

## Standard Stack

### Core (all already installed — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.4.1 | Schema migrations, typed client | Already pinned, custom output path, Neon adapter 7.4.1 pre-configured. `[VERIFIED: backend/package.json lines 17,44]` |
| `@prisma/adapter-neon` | 7.4.1 | Neon serverless connection | Already wired in `backend/src/lib/prisma.ts`. `[VERIFIED: backend/package.json line 16]` |
| `@neondatabase/serverless` | 1.0.2 | Edge-compatible Neon driver | Already wired. `[VERIFIED: backend/package.json line 15]` |
| Zod | 3.25.32 | `.superRefine()` cross-field validation | `.superRefine()` is v3-stable API. Do NOT bump to v4 — breaking changes around `flatten()`. `[CITED: .planning/research/STACK.md line 47]` |
| `tsx` | 4.19.0 | Run `.ts` scripts without a build step | Used for `test-slug.ts`, `test-commission.ts`, and existing `backend/scripts/*.ts`. `[VERIFIED: backend/package.json line 45]` |
| TypeScript | 5.8.0 | Type checking, `npm run build` gate | `[VERIFIED: backend/package.json line 46]` |

### Supporting

None. Zero new deps.

### Alternatives Considered (all rejected)

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `slugify()` | `slugify` npm (~10 kB) | Our requirements lock the algorithm (numeric suffix, specific reserved words, 60-char truncate, no hex). The hand-rolled version is ~35 LOC of `String.prototype.normalize("NFD")` + regex and is precisely spec'd. A library drags char-map opinions we don't need. `[CITED: .planning/research/STACK.md line 45]` |
| Hand-rolled `computeCommission()` | `currency.js`, `dinero.js` | FCFA is an integer currency (no decimals). `Math.floor((gross * bp) / 10000)` is the only math needed. A library costs 10+ kB and adds an API surface for a 1-line calculation. |
| `prisma db push` | `prisma migrate dev` | Phase success criterion #1 demands a **named migration file** (so prod gets a reproducible migration). `db push` writes the schema without a file. Use `migrate dev --name add_cagnotte_slug_and_notification`. |
| Vitest / Jest test scripts | standalone `tsx` with `process.exit(1)` | CLAUDE.md: "No test framework is configured yet." Introducing one is out of scope and would be a separate phase. The standalone pattern is already used elsewhere (`backend/scripts/test-bictorys-debug.ts` etc.). |
| Random hex suffix | 4-char timestamp fallback after 10 numeric retries | Locked by PROJECT.md decisions — slugs must stay readable. Hex fallback is only invoked in astronomical collision cases (>10 identical titles in one millisecond) and `Date.now().toString(36).slice(-4)` preserves some ordering. |

### Installation

```bash
# Zero new packages. Use the installed stack.
cd backend
# Verify Prisma is on 7.4.1 (no upgrade needed)
npx prisma --version
# Ensure migrations directory exists and is clean
ls prisma/migrations/
```

## Architecture Patterns

### Recommended Project Structure (files this phase creates/edits)

```
backend/
├── prisma/
│   ├── schema.prisma                   # EDIT: add slug/isAnonymous/messageIsPrivate/Notification/dedup
│   └── migrations/
│       └── <ts>_phase1_cagnotte_foundations/
│           └── migration.sql           # NEW: named migration file
├── src/
│   ├── generated/prisma/               # AUTO: regenerated by `prisma generate`
│   ├── lib/
│   │   ├── cagnottes/
│   │   │   └── slug.ts                 # NEW: slugify + ensureUniqueSlug + BLOCK_RESERVED_SLUGS
│   │   ├── commission.ts               # NEW: FUNDRAISER_COMMISSION_BP + computeCommission
│   │   └── blocks/
│   │       └── schemas.ts              # EDIT: extend fundraiserBlockConfigSchema with superRefine
└── scripts/
    ├── test-slug.ts                    # NEW: 50 French fixtures
    └── test-commission.ts              # NEW: 100 fixtures + invariant
```

### Pattern 1: Prisma Named Migration with Neon Timeout Guard

**What:** A 3-step conditional migration that accounts for Neon serverless's tight query timeouts on unique-index creation.

**When to use:** Any migration adding a `@unique` constraint to an existing column OR creating a `@unique` on a new column in a table with >1000 rows.

**Pre-flight check:**
```bash
# BEFORE writing the schema change, count existing rows
cd backend
npx prisma db execute --stdin <<< 'SELECT COUNT(*) FROM "Block";'
# If count > 1000, use the 3-step pattern:
#   Step 1: add `slug String?` (nullable, no @unique)
#   Step 2: backfill via script (no-op in Phase 1 since no FUNDRAISER blocks exist yet)
#   Step 3: add `@unique` in a follow-up migration
# If count <= 1000, do it all in one migration (the expected path for this fork)
```

**Pattern (one-shot, expected path):**
```prisma
// In backend/prisma/schema.prisma
model Block {
  // ... existing fields ...
  slug String? @unique  // nullable for orphan block types (LINK/SALE/etc.)

  @@index([slug])
  // ... existing @@index entries ...
}
```

```bash
npx prisma migrate dev --name phase1_cagnotte_foundations
# This creates prisma/migrations/<timestamp>_phase1_cagnotte_foundations/migration.sql
# Apply succeeds on Neon; verify with `npx prisma studio`.
```

**Source:** `[CITED: .planning/research/PITFALLS.md P08]` + `[CITED: .planning/research/STACK.md Version Compatibility table]`

### Pattern 2: P2002 Retry Loop (slug uniqueness)

**What:** Instead of read-then-write (race-prone), attempt the insert and catch Prisma's `P2002` unique-constraint violation. The database index is the ultimate guard.

**When to use:** Any "generate a unique handle" flow where parallel creates are possible.

**Example (to live in `backend/src/lib/cagnottes/slug.ts`):**
```typescript
// Source: .planning/research/PITFALLS.md P04 + banani/BACKEND-PLAN.md 0.3
import { Prisma } from "../../generated/prisma/client.js";

const BLOCK_RESERVED_SLUGS = new Set([
  "api", "admin", "login", "signup", "dashboard", "tableau-de-bord",
  "profil", "notifications", "participations", "aide", "tarifs",
  "contact", "nouvelle", "create", "toutes-les-cagnottes",
]);

export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")       // collapse non-alphanumeric to dash
    .replace(/^-+|-+$/g, "")           // trim leading/trailing dashes
    .slice(0, 60);                     // max 60 chars
}

export async function ensureUniqueSlug(
  base: string,
  createFn: (candidate: string) => Promise<void>,
): Promise<string> {
  // createFn is the caller's "try to create block with this slug" closure.
  // It throws Prisma.PrismaClientKnownRequestError with code P2002 on collision.

  let candidate = base || "cagnotte";
  if (BLOCK_RESERVED_SLUGS.has(candidate)) candidate = `${candidate}-1`;

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await createFn(candidate);
      return candidate;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        candidate = `${base}-${attempt + 1}`;
        continue;
      }
      throw err;
    }
  }

  // 4-char timestamp fallback (not random hex — still deterministic-ish)
  const fallback = `${base}-${Date.now().toString(36).slice(-4)}`;
  await createFn(fallback);
  return fallback;
}
```

**Note:** `ensureUniqueSlug` takes a `createFn` closure rather than a `PrismaClient` so the helper stays pure and testable. `test-slug.ts` passes a fake `createFn` that uses an in-memory `Set<string>` to simulate collisions.

**Source:** `[CITED: .planning/research/PITFALLS.md P04]` + `[CITED: .planning/banani/BACKEND-PLAN.md 0.3]`

### Pattern 3: Zod `.superRefine()` for Cross-Field Validation

**What:** Zod's canonical API for validation that depends on multiple fields at once. Runs after the shape parse succeeds.

**When to use:** Any "if X then Y must be Z" rule — here, the festive/solidaire subtype switch.

**Example (extends existing `fundraiserBlockConfigSchema` in `backend/src/lib/blocks/schemas.ts`):**
```typescript
// Source: https://zod.dev/v3 (superRefine) + banani/BACKEND-PLAN.md 0.2
import { z } from "zod";

export const fundraiserBlockConfigSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  goalAmount: z.number().int().min(1000),
  endDate: z.string().nullable().optional(),
  showDonorCount: z.boolean().default(true),
  suggestedAmounts: z.array(z.number().min(500)).max(4).default([2000, 5000, 10000]),
  minAmount: z.number().min(500).default(500),
  maxAmount: z.number().min(500).optional(),
  coverUrl: z.string().nullable().optional(),
  buttonText: z.string().max(30).optional(),
  ctaStyle: z.enum(["button", "callout", "preview"]).optional().default("button"),
  thankYouMessage: z.string().max(500).optional(),
  videoUrl: z.string().nullable().optional(),
  checkoutSections: z.array(checkoutSectionSchema).nullable().optional(),
  confirmationEmailSubject: z.string().nullable().optional(),
  confirmationEmailBody: z.string().nullable().optional(),
  checkoutFields: z.array(/* existing */).nullable().optional(),

  // NEW — Phase 1 additions
  subtype: z.enum(["festive", "solidaire"]),
  occasion: z.enum([
    "anniversaire", "pot_de_depart", "cadeau_commun",
    "mariage_pacs", "naissance", "voyage", "autre",
  ]).nullable().optional(),
  cause: z.enum([
    "sante_medical", "education", "projet_solidaire",
    "urgence", "animaux", "autre",
  ]).nullable().optional(),
  beneficiary: z.enum(["moi_meme", "un_proche", "une_association"]).nullable().optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  hideAmount: z.boolean().default(false),
  hideDonors: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.subtype === "festive") {
    if (!data.occasion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["occasion"],
        message: "L'occasion est requise pour une cagnotte festive.",
      });
    }
    if (data.cause != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cause"],
        message: "Le champ cause doit être vide pour une cagnotte festive.",
      });
    }
    if (data.beneficiary != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["beneficiary"],
        message: "Le bénéficiaire doit être vide pour une cagnotte festive.",
      });
    }
  }
  if (data.subtype === "solidaire") {
    if (!data.cause) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cause"],
        message: "La cause est requise pour une cagnotte solidaire.",
      });
    }
    if (!data.beneficiary) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["beneficiary"],
        message: "Le bénéficiaire est requis pour une cagnotte solidaire.",
      });
    }
    if (data.occasion != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["occasion"],
        message: "L'occasion doit être vide pour une cagnotte solidaire.",
      });
    }
  }
});
```

**Subtype-lock pattern (for Phase 2 to wire):** the schema itself cannot know about paid orders. The pattern is: the `PATCH /api/blocks/:id` route in Phase 2 reads `config.subtype` from the DB, and if `Order.count({ where: { blockId, paymentStatus: "PAID" } }) > 0`, it compares the incoming `subtype` to the stored one and 422s on mismatch. Phase 1 exposes this contract in a comment on the schema so Phase 2 is unambiguous.

**Source:** `[CITED: https://zod.dev/v3 — .superRefine()]` + `[CITED: .planning/banani/BACKEND-PLAN.md 0.2]`

### Pattern 4: Pure Commission Helper with Invariant

**What:** A single pure function that takes `(gross, subtype)` and returns `{ rate, commission, net }` with `commission + net === gross` guaranteed by construction.

**When to use:** Every place that needs to compute a FUNDRAISER commission — orders, dashboard stats, withdrawal balance, public progress. Phase 1 ships the helper; Phase 2 wires it into `routes/orders.ts`.

**Example (to live in `backend/src/lib/commission.ts`):**
```typescript
// Source: .planning/research/PITFALLS.md P03 + banani/BACKEND-PLAN.md 0.5

/**
 * Commission basis points per FUNDRAISER subtype.
 * 1 basis point = 0.01%, so 600 = 6% and 800 = 8%.
 *
 * LOCKED per PROJECT.md (2026-04-13). To change in v2, introduce a
 * `PlatformConfig` table with { subtype, rateBp } rows.
 */
export const FUNDRAISER_COMMISSION_BP = {
  solidaire: 600, // 6% — santé, éducation, urgence
  festive: 800,   // 8% — mariage, anniversaire, cadeau commun
} as const;

export type FundraiserSubtype = keyof typeof FUNDRAISER_COMMISSION_BP;

export interface CommissionResult {
  rate: number;        // basis points, stored on Order.commissionRate
  commission: number;  // FCFA integer, stored on Order.commissionAmount
  net: number;         // FCFA integer, stored on Order.sellerAmount
}

/**
 * Compute FUNDRAISER commission and net for a gross donation amount.
 *
 * Uses Math.floor (NOT Math.round) so rounding always favors the seller.
 * Invariant: commission + net === gross (asserted in test-commission.ts).
 *
 * @param gross FCFA integer donation amount (must be >= 500, enforced upstream)
 * @param subtype "solidaire" | "festive"
 */
export function computeCommission(
  gross: number,
  subtype: FundraiserSubtype,
): CommissionResult {
  if (!Number.isInteger(gross) || gross < 0) {
    throw new Error(`computeCommission: gross must be a non-negative integer, got ${gross}`);
  }
  const rate = FUNDRAISER_COMMISSION_BP[subtype];
  const commission = Math.floor((gross * rate) / 10000);
  const net = gross - commission;
  // Defense-in-depth: this cannot actually fail given Math.floor + integer gross,
  // but an explicit assert catches future regressions.
  if (commission + net !== gross) {
    throw new Error(
      `Commission invariant violated: ${commission} + ${net} !== ${gross} (subtype=${subtype})`,
    );
  }
  return { rate, commission, net };
}
```

**Source:** `[CITED: .planning/research/PITFALLS.md P03]` + `[CITED: .planning/banani/BACKEND-PLAN.md 0.5]`

### Anti-Patterns to Avoid

- **Do NOT use `Math.round` in `computeCommission()`.** The existing `routes/orders.ts` uses `Math.round` on line ~167 (`Math.round((amount * order.commissionRate) / 10000)`). This is the drift bug P03 warns about. Phase 1 ships `Math.floor` in the helper; Phase 2 replaces the `Math.round` call site.
- **Do NOT read the slug, then check `findUnique`, then write.** That's the race in P04. The unique index is the guard; catch `P2002` and retry.
- **Do NOT mutate the existing `RESERVED_SLUGS` set** in `backend/src/lib/constants.ts`. It is used by `Seller.slug` validation and has a different authoritative list. Create a new `BLOCK_RESERVED_SLUGS` set in `lib/cagnottes/slug.ts`.
- **Do NOT use `prisma db push`** to apply this migration. Use `prisma migrate dev --name phase1_cagnotte_foundations` so prod gets a named migration file.
- **Do NOT add `endingSoonNotifiedAt` to `Block`** — that's a Phase 2 concern (plan 02-02). Adding it now would force a dead column.
- **Do NOT touch `Seller.notificationPrefs`** — it already exists as `Json?` and Phase 2's `routes/notifications.ts` consumes it as-is.
- **Do NOT emit random hex suffixes** anywhere in the slug pipeline. The 4-char fallback uses `Date.now().toString(36).slice(-4)` which is not cryptographic but is deterministic enough for diagnostics.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| NFD diacritic stripping for slugs | Custom char-map table | `String.prototype.normalize("NFD")` + `/[\u0300-\u036f]/g` regex | Built into Node; covers French (éèêàîôùç) perfectly; 2 lines of code |
| Detecting Prisma unique violations | Parsing error messages | `err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"` | Official Prisma error shape, stable across 7.x |
| Cross-field Zod validation | Custom post-parse checks in the route | `.superRefine()` | Canonical Zod 3 API, runs in the same parse pass, returns structured `ZodIssue[]` |
| Integer-safe commission math | `decimal.js`, `big.js` | Native `Math.floor((gross * bp) / 10000)` | FCFA has no decimals; gross is always an integer; JS `Number` is exact for integers up to 2^53 |
| Migration timeout handling | Bespoke SQL with `CONCURRENTLY` | Pre-flight `SELECT COUNT(*)` + conditional 3-step pattern | Neon serverless does not support `CREATE UNIQUE INDEX CONCURRENTLY` reliably; the count-based branch is simpler and proven (`[CITED: PITFALLS.md P08]`) |
| Running TS scripts without a test framework | Nothing — use `tsx` | `tsx backend/scripts/test-*.ts` with `process.exit(1)` | Already installed, already used by `backend/scripts/test-bictorys-debug.ts`, zero setup |

**Key insight:** Phase 1 is the clearest example of the project's "extend, don't install" philosophy. Every concern maps to an already-installed primitive. The entire phase ships with zero `package.json` changes.

## Runtime State Inventory

> Phase 1 is **not** a rename/refactor phase — it is purely additive. Still, a quick check of the 5 categories is warranted because the schema migration touches live data.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **Block rows** — existing block count must be checked pre-migration. Fork is stripped to a skeleton but `Block` table is not dropped, so row count is non-zero from any fari.store legacy data that survived the fork cleanup. **Order rows** — adding two boolean columns with `@default(false)` is instantaneous and safe. **WebhookLog rows** — adding `@@unique([externalId, eventType])` may fail if duplicates exist in the current table. | Pre-migration: run `SELECT COUNT(*) FROM "Block"`, `SELECT externalId, eventType, COUNT(*) FROM "WebhookLog" GROUP BY 1,2 HAVING COUNT(*) > 1`. If duplicates exist, delete the oldest per pair in a data-cleanup step BEFORE the migration. The plan MUST include this step. |
| Live service config | None — Phase 1 does not touch Bictorys / R2 / Resend / Upstash configuration. | None. |
| OS-registered state | None — no cron / launchd / systemd registrations. The `setInterval` background jobs in `index.ts` are started in-process on boot. | None. |
| Secrets / env vars | None — Phase 1 does not read or rename any env var. | None. |
| Build artifacts | `backend/src/generated/prisma/` is regenerated by `prisma generate` — the migration command does this automatically. No stale artifacts to sweep. | Confirm `backend/src/generated/prisma/client.js` updates after migration (implicit in `prisma migrate dev`). |

**Canonical question answered:** After the Phase 1 migration is applied, the only runtime state that changed is the Neon database schema + a new migration file in git. No caches, no OS state, no env vars, no pm2 processes. A rollback is `prisma migrate resolve --rolled-back <name>` + a follow-up down migration — document this in the plan's rollback notes.

## Common Pitfalls

### P08: Neon serverless unique-index timeout
**What goes wrong:** `CREATE UNIQUE INDEX` on a `Block` table with >1000 rows can time out Neon's 60s query budget, leaving the schema half-migrated.
**Why it happens:** Neon auto-suspends idle compute; `CREATE INDEX CONCURRENTLY` is not reliably supported on all Neon branches; `prisma migrate dev` uses plain `CREATE INDEX`.
**How to avoid:** Pre-flight count check. If `COUNT(*) > 1000`, split into 3 migrations: (1) add nullable column without `@unique`, (2) backfill script, (3) add `@unique`. For the current fork, expected count is <50 (cleaned fari.store skeleton) so the one-shot migration is the happy path — but the plan MUST include the pre-flight check.
**Warning signs:** `prisma migrate dev` hangs >30s; post-migration 500s on `POST /api/blocks`.
**Source:** `[CITED: .planning/research/PITFALLS.md P08]`

### P04: Slug reservation race
**What goes wrong:** Two creators publish `Les 30 ans de Thomas` within milliseconds. Both sessions check the slug is free, both insert, one crashes or (without the unique index) both succeed and `/c/les-30-ans-de-thomas` becomes nondeterministic.
**Why it happens:** Read-then-write without locking. Neon has no `SELECT FOR UPDATE` on index probes.
**How to avoid:** The unique index is the guard. Push `Block.slug @unique` in plan 01-01 BEFORE plan 01-02's retry code exists. The retry loop (pattern 2 above) catches `P2002` up to 10 times, then falls back to a 4-char timestamp suffix.
**Warning signs:** Prisma `P2002` on `Block.slug` in production logs more than ~0.5% of `POST /api/blocks` calls.
**Source:** `[CITED: .planning/research/PITFALLS.md P04]`

### P03: Commission rounding drift
**What goes wrong:** `Math.round((15000 * 600) / 10000) = 900` but `commissionRate * gross / 10000` computed as a float elsewhere gives `899.9999…` and a different view shows 899. Seller sees 14100 on the dashboard and 14101 on the withdrawal balance. Support ticket.
**Why it happens:** Three quantities (gross/commission/net), any two can be rounded independently, and `Math.round` breaks the invariant for half-FCFA cases.
**How to avoid:** Single helper. `Math.floor` (favor seller). Invariant `commission + net === gross` asserted **inside** the helper AND in `test-commission.ts` across 100 fixtures. The existing `routes/orders.ts` `Math.round` call is a Phase 2 replacement target — flag it in the plan.
**Warning signs:** `test-commission.ts` exits 1. In prod, a seller's dashboard total differs from their withdrawal balance by 1 FCFA.
**Source:** `[CITED: .planning/research/PITFALLS.md P03]`

### P06: Notification dedup column missing
**What goes wrong:** Phase 2's `createNotification()` needs `Notification.dedupeKey String @unique` to enforce at-most-once delivery. If Phase 1 forgets the column, Phase 2 has to ship its own migration.
**Why it happens:** Forgetting that Phase 1 owns ALL schema work, even for fields not yet consumed.
**How to avoid:** The `Notification` model in plan 01-01 ships with `dedupeKey String @unique` even though no code writes to it in Phase 1.
**Source:** `[CITED: .planning/research/PITFALLS.md P06]`

### Diacritic edge case (P12)
**What goes wrong:** `Thomas Diémé` becomes `thomas-dm` (incomplete NFD strip) or `thomas-diémé` (no strip at all) depending on the regex.
**Why it happens:** `/[^a-z]/g` doesn't strip `éèêàîôù`; `String.prototype.normalize("NFD")` decomposes them into base+combining-accent, then `/[\u0300-\u036f]/g` removes the combining marks.
**How to avoid:** The slugify pattern above is exactly right. `test-slug.ts` MUST include fixtures `Coumba Ndiaye`, `Fatoumata Dramé`, `Les 30 ans de Thomas Diémé`, `Cadeau pour Aïssata`.
**Source:** `[CITED: .planning/research/PITFALLS.md P12]`

## Code Examples

The patterns in "Architecture Patterns" above are the code examples. They are drawn from Zod 3 docs, Prisma 7 error docs, the existing backend codebase, and the project's research files. Every example is copy-paste-ready for the planner.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `prisma db push` for all schema changes (current fork convention) | `prisma migrate dev` for migrations that need a reproducible migration file | Phase 1 | Phase 1 success criterion #1 demands a named migration file. `db push` remains fine for exploratory dev work. |
| `Math.round` for commission (existing code in `routes/orders.ts` line ~167) | `Math.floor` in a pure helper | Phase 1 (helper) → Phase 2 (wire) | Rounding drift eliminated; invariant guaranteed. |
| Random hex slug suffixes (common pattern in SaaS) | Human-readable numeric suffix with deterministic timestamp fallback | Locked 2026-04-13 | Slugs like `cagnotte-a8f2` are ugly and unshareable on WhatsApp; `les-30-ans-de-thomas-2` is the defensible UX. |
| Inline Zod validation per-field (old `fundraiserBlockConfigSchema`) | `.superRefine()` for cross-field rules | Phase 1 plan 01-03 | Keeps validation co-located; errors are structured `ZodIssue[]` that the frontend can render field-by-field. |

**Deprecated/outdated:**
- The `db:push` workflow is not deprecated but is the wrong tool for this migration. Document this in the plan so future phases know when to switch.
- The existing `RESERVED_SLUGS` in `backend/src/lib/constants.ts` is NOT deprecated — it still guards `Seller.slug`. We ADD a sibling `BLOCK_RESERVED_SLUGS` rather than unifying.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Current `Block` row count is <1000, so the one-shot unique-index migration succeeds on Neon | Neon Migration Guard | If wrong, `prisma migrate dev` times out and the plan must fall back to the 3-step pattern. **Mitigation:** the plan's first task is the pre-flight `SELECT COUNT(*)`, which catches this before the migration runs. |
| A2 | Current `WebhookLog` has no duplicate `(externalId, eventType)` rows, so the `@@unique` constraint applies cleanly | Runtime State Inventory | If wrong, the migration fails with a duplicate-key error. **Mitigation:** pre-flight `GROUP BY … HAVING COUNT(*) > 1` check, delete duplicates, then migrate. Plan includes this step. |
| A3 | Neon Prisma adapter 7.4.1 + `@neondatabase/serverless` 1.0.2 supports `prisma migrate dev` without the "no shadow database" workaround that old Neon releases needed | Migration pattern | If wrong, the migration fails with a shadow-database error and the plan must add `--create-only` + manual `migrate deploy`. **Mitigation:** verified via `backend/prisma/migrations/0_init/` — the fork already has a named migration, so the shadow flow works. |
| A4 | The existing `backend/scripts/*.ts` files run under `tsx` with the same `moduleResolution: "NodeNext"` config as `src/`, so `from "../src/..."` imports work in test scripts | Test harness | If wrong, `test-slug.ts` can't import `slug.ts`. **Mitigation:** mirror the import style of existing scripts like `backend/scripts/test-bictorys-debug.ts`, which already import from `src/`. |
| A5 | French error messages from `superRefine()` will surface in Phase 5 wizard error displays (FUND-01/FUND-02 coverage) | Zod pattern section | If wrong, we'd write English error messages and rewrite them later. **Mitigation:** write French now per CLAUDE.md language rule. |
| A6 | The `Math.round` call at `backend/src/routes/orders.ts` line ~167 is the only existing commission computation site | Anti-pattern section | If wrong, Phase 2 misses a replacement site and the drift survives. **Mitigation:** grep for `commissionRate.*10000` in Phase 2 to catch all call sites. |
| A7 | `@@index([blockId])` on `Order` is sufficient for Phase 2's "has paid orders" check without a `(blockId, paymentStatus)` composite | Claude's discretion | If wrong, the Phase 2 subtype-lock query is slow on large tables. **Mitigation:** not a Phase 1 concern; measured in Phase 2 smoke-test. |

## Open Questions

1. **Should `BLOCK_RESERVED_SLUGS` include the Phase 2 route literals (`cagnottes`, `blocks`, `orders`, etc.)?**
   - What we know: the list in `ROADMAP.md` Phase 1 description includes 15 reserved words. The Phase 2 routes are mounted at `/api/cagnottes` — the `api` prefix already protects them from collision with block slugs served at `/c/<slug>`.
   - What's unclear: whether front-end routes at `/cagnottes/<slug>` (hypothetical) would ever collide. Current frontend serves block detail at `/c/<slug>` per decision 2026-04-13, so the prefix `/c/` fully isolates the namespace.
   - Recommendation: use the 15-word list as specified. Do NOT add route names like `cagnottes`/`blocks`/`orders` because they live under `/api` not `/c`.

2. **Does the `superRefine` need a Phase 2-only extension for "subtype lock once paid"?**
   - What we know: the subtype lock requires a paid-order count, which `schemas.ts` cannot know.
   - What's unclear: whether to expose a `fundraiserBlockConfigSchemaForUpdate` factory that takes `{ existingSubtype, hasPaidOrders }` or keep the lock logic entirely in the `PATCH` route.
   - Recommendation: keep it in the route (Phase 2 plan 02-01). Phase 1 ships a comment on `schemas.ts` explaining the contract.

3. **Does `Notification.data Json?` need a JSON schema now or in Phase 2?**
   - What we know: Phase 2 templates read `data.amount`, `data.milestone`, `data.donorName`, `data.attempt`.
   - What's unclear: whether to document the per-type JSON shape in a Zod schema at Phase 1 for forward compatibility.
   - Recommendation: defer to Phase 2 (plan 02-02) which owns the notifications lib. Phase 1 ships just the column.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ (assumed) | Node 22+ per `@types/node: ^22.15.0` | None — required |
| `prisma` CLI | Migration | ✓ | 7.4.1 | None — required |
| `tsx` | Test harness scripts | ✓ | 4.19.0 | None — required |
| Neon dev database | Migration target | ✓ (assumed available via `DATABASE_URL`) | Neon serverless | Local Postgres if dev DB is unreachable |
| TypeScript | `npm run build` gate | ✓ | 5.8.0 | None — required |
| `npx prisma studio` | Optional visual verification | ✓ (via `npm run db:studio`) | bundled with Prisma | Skip visual verification; rely on `prisma migrate dev` success |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** none.

**Notes:**
- `DATABASE_URL` must be set in `backend/.env` and point to a Neon dev branch. If it points to prod, abort — Phase 1 is a **dev-only** migration; prod deploy happens later via `prisma migrate deploy` in the Phase 1 release playbook.
- The plan should explicitly verify `process.env.DATABASE_URL` in a guard script before running the migration.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed. Standalone `tsx` scripts with `process.exit(1)` on failure. |
| Config file | None — see Wave 0 (none needed). |
| Quick run command | `cd backend && npx tsx scripts/test-slug.ts && npx tsx scripts/test-commission.ts` |
| Full suite command | `cd backend && npx tsc --noEmit && npx tsx scripts/test-slug.ts && npx tsx scripts/test-commission.ts` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHM-01 | `Block.slug @unique` column present | migration | `cd backend && npx prisma migrate status` (must show migration applied) + `npx prisma db execute --stdin <<< 'SELECT column_name FROM information_schema.columns WHERE table_name=\'Block\' AND column_name=\'slug\';'` | ❌ Wave 0 (migration file) |
| SCHM-02 | `Order.isAnonymous` column present, default false | migration | same — query `Order` column `isAnonymous` | ❌ Wave 0 |
| SCHM-03 | `Order.messageIsPrivate` column present, default false | migration | same | ❌ Wave 0 |
| SCHM-04 | `Notification` model + `dedupeKey @unique` applied | migration | query `information_schema.tables` for `Notification` + query `pg_indexes` for `Notification_dedupeKey_key` | ❌ Wave 0 |
| SCHM-05 | `WebhookLog @@unique([externalId, eventType])` applied | migration | query `pg_indexes` for the composite unique constraint | ❌ Wave 0 |
| FUND-01 | Festive cagnotte requires `occasion` | unit | `npx tsx scripts/test-schemas.ts` — fixtures: `{ subtype: "festive" }` → fails; `{ subtype: "festive", occasion: "mariage_pacs" }` → passes | ❌ Wave 0 (or embed in a single `test-fundraiser-config.ts`) |
| FUND-02 | Solidaire requires `cause` + `beneficiary`, rejects `occasion` | unit | `test-schemas.ts` — solidaire fixtures | ❌ Wave 0 |
| FUND-03 | `visibility` enum default public | unit | `test-schemas.ts` — parse `{ subtype, occasion }` and assert `.visibility === "public"` | ❌ Wave 0 |
| FUND-04 | `hideAmount`/`hideDonors` default false | unit | `test-schemas.ts` — assert defaults | ❌ Wave 0 |
| FUND-05 | Slug collision returns numeric suffix | unit | `test-slug.ts` — simulate 3 collisions, assert `-2`, `-3`, `-4` | ❌ Wave 0 |
| FUND-06 | Reserved words blocked | unit | `test-slug.ts` — fixture `"admin"` → `"admin-1"` | ❌ Wave 0 |
| FUND-07 | Schema supports slug separate from title | unit | implicit — `Block.slug` is its own column, not derived | covered by SCHM-01 |
| DONA-04 | Commission 6% solidaire / 8% festive + invariant | unit | `test-commission.ts` — 100 fixtures, assert invariant on every one | ❌ Wave 0 |
| VERI-03 | 100 commission fixtures test | meta | `test-commission.ts` contains 100 fixtures | ❌ Wave 0 |
| VERI-04 | 50 French slug fixtures test | meta | `test-slug.ts` contains 50 fixtures incl. `Coumba Ndiaye`, `Fatoumata Dramé`, reserved words, collisions | ❌ Wave 0 |

**Build gate (every requirement):** `cd backend && npx tsc --noEmit` — 0 errors. This is Phase 1 success criterion #5.

### Sampling Rate
- **Per task commit:** `cd backend && npx tsc --noEmit` (the build) + the specific test for the file just touched (e.g. after slug.ts edit, run only `test-slug.ts`).
- **Per wave merge:** Full suite — `npx tsc --noEmit && npx tsx scripts/test-slug.ts && npx tsx scripts/test-commission.ts && npx tsx scripts/test-schemas.ts && npx prisma migrate status`.
- **Phase gate:** Full suite green + manual `npx prisma studio` walkthrough of `Block`, `Order`, `Notification`, `WebhookLog` confirming columns are present.

### Wave 0 Gaps
- [ ] `backend/scripts/test-slug.ts` — covers FUND-05, FUND-06, VERI-04. Must fixture: `Coumba Ndiaye`, `Fatoumata Dramé`, `Les 30 ans de Thomas`, `admin`, `api`, `nouvelle`, collision chain `les-30-ans-de-thomas` → `-2` → `-3`, empty-title fallback, 80-char truncation, leading/trailing whitespace.
- [ ] `backend/scripts/test-commission.ts` — covers DONA-04, VERI-03. Must include: 100 random gross values across [500, 10_000_000], both subtypes, assert `rate` matches, assert `commission + net === gross`, edge cases `gross = 0`, `gross = 500`, `gross = 1` (sub-FCFA shouldn't exist but guard it).
- [ ] `backend/scripts/test-schemas.ts` — covers FUND-01 through FUND-04. Fixtures: festive-without-occasion (fail), festive-with-cause (fail), solidaire-without-cause (fail), solidaire-without-beneficiary (fail), solidaire-with-occasion (fail), festive-valid (pass), solidaire-valid (pass), visibility defaults to public, hideAmount defaults to false.
- [ ] Framework install: **none needed** — `tsx` already installed.
- [ ] Migration verification script `backend/scripts/verify-phase1-migration.ts` (optional) — queries `information_schema` to assert every expected column/index is present. Covers SCHM-01 through SCHM-05. Recommended because raw `prisma migrate status` doesn't confirm specific columns exist.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 1 touches no auth code. |
| V3 Session Management | no | Phase 1 touches no session code. |
| V4 Access Control | no | Phase 1 touches no routes. |
| V5 Input Validation | **yes** | Zod `.superRefine()` for FUNDRAISER config; Zod already enforces max-length on `title`/`description`. |
| V6 Cryptography | no | No crypto in Phase 1. |
| V8 Data Protection at Rest | partial | The new `Notification.body` / `Order.isAnonymous` touch donor data. Anonymity flag is stored plaintext per design — the control is "organizer-visible, public-masked", which is a route-level access-control concern for Phase 2. |
| V13 API & Web Service | partial | `@@unique([externalId, eventType])` on `WebhookLog` is a V13.3.4 idempotency control (webhook replay protection). |

### Known Threat Patterns for Phase 1

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via `config.description` or `config.title` | Tampering | Zod `max(5000)` / `max(200)` caps length; Phase 2 public endpoint renders as React text (escaped by default). Phase 1's schema cap is the first defense. |
| Slug enumeration / reserved-word squatting | Information Disclosure + Elevation | `BLOCK_RESERVED_SLUGS` set blocks `admin`, `api`, `login`, etc. from ever being a block slug — prevents a creator from claiming `cagnottes.sn/c/admin`. |
| Webhook replay → double credit | Tampering | `@@unique([externalId, eventType])` on `WebhookLog` makes the second delivery fail the DB constraint; Phase 2 handler catches `P2002` and returns 200 without side effects. |
| Commission manipulation | Tampering | `computeCommission()` is the only code path; no client input affects the rate (basis points are hard-coded per subtype). |
| Subtype swap after paid orders | Tampering | Lock enforced in Phase 2 route. Phase 1 schema exposes the contract via comment. |

## Sources

### Primary (HIGH confidence — direct file reads or verified codebase facts)
- `/Users/amadoufall/Desktop/cagnottes-sn/backend/prisma/schema.prisma` — current Block/Order/Seller/WebhookLog shapes [VERIFIED]
- `/Users/amadoufall/Desktop/cagnottes-sn/backend/src/lib/blocks/schemas.ts` — current `fundraiserBlockConfigSchema` [VERIFIED]
- `/Users/amadoufall/Desktop/cagnottes-sn/backend/package.json` — Prisma 7.4.1, Zod 3.25.32, tsx 4.19.0 [VERIFIED]
- `/Users/amadoufall/Desktop/cagnottes-sn/backend/src/lib/prisma.ts` — Neon adapter wiring, custom output path [VERIFIED]
- `/Users/amadoufall/Desktop/cagnottes-sn/backend/src/lib/constants.ts` — existing `RESERVED_SLUGS` set [VERIFIED]
- `/Users/amadoufall/Desktop/cagnottes-sn/backend/src/routes/auth.ts` — how `RESERVED_SLUGS` is consumed (Seller slug validation) [VERIFIED]
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/research/PITFALLS.md` — P03, P04, P06, P08, P12 [CITED]
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/research/STACK.md` — zero-new-deps finding [CITED]
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/banani/BACKEND-PLAN.md` — tasks 0.1, 0.2, 0.3, 0.5 specs [CITED]
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/ROADMAP.md` Phase 1 section — goal + success criteria [CITED]
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/REQUIREMENTS.md` — SCHM/FUND/DONA/VERI IDs [CITED]
- `/Users/amadoufall/Desktop/cagnottes-sn/CLAUDE.md` — project constraints [CITED]

### Secondary (MEDIUM confidence — well-known stable APIs)
- Zod 3 `.superRefine()` API — https://zod.dev/v3 [CITED]
- Prisma `PrismaClientKnownRequestError` `P2002` code — https://www.prisma.io/docs/orm/reference/error-reference [CITED]
- `String.prototype.normalize("NFD")` ES2015 standard — MDN [CITED]

### Tertiary (LOW confidence — assumed from codebase patterns)
- Neon serverless Prisma adapter supports `prisma migrate dev` without shadow database workarounds in 7.4.1 [ASSUMED — see A3]
- Current `Block` row count is <1000 [ASSUMED — see A1]
- `WebhookLog` has no duplicate `(externalId, eventType)` rows [ASSUMED — see A2]

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every package version is verified against `backend/package.json`, every pattern is drawn from existing codebase files.
- Architecture: **HIGH** — patterns map 1:1 to BACKEND-PLAN.md tasks 0.1/0.2/0.3/0.5 and the existing Prisma custom-output convention.
- Pitfalls: **HIGH** — P03, P04, P06, P08, P12 are well-grounded in PITFALLS.md and traced to the files they affect.
- Migration safety: **MEDIUM** — assumption A1 (row count <1000) requires a pre-flight check. Plan must include it.
- Security: **MEDIUM-HIGH** — ASVS coverage for Phase 1's narrow surface is complete; broader controls (CSRF, rate limiting) live in Phase 2.

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days — stack is stable, no fast-moving deps)
