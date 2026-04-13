---
phase: 01-backend-foundations
plan: 02
subsystem: cagnotte-slug-helper
tags: [slug, helpers, validation, prisma, p2002, retry]
requires:
  - backend/src/generated/prisma/client.js (Prisma namespace + PrismaClientKnownRequestError)
  - Block.slug @unique (delivered by plan 01-01)
provides:
  - backend/src/lib/cagnottes/slug.ts
  - slugify(title) — pure NFD + diacritic strip + 60-char truncate
  - ensureUniqueSlug(base, createFn) — P2002 retry chain with timestamp fallback
  - BLOCK_RESERVED_SLUGS (15-entry ReadonlySet, distinct from Seller.slug RESERVED_SLUGS)
affects:
  - (none — no existing files modified)
tech-stack:
  added: []
  patterns:
    - duck-typed Prisma error detection (instanceof + .code === "P2002") for testability
    - closure-based createFn dependency injection (no Prisma client at test time)
    - deterministic 4-char base36 timestamp fallback (NOT random hex per PROJECT.md)
key-files:
  created:
    - backend/src/lib/cagnottes/slug.ts
    - backend/scripts/test-slug.ts
  modified: []
decisions:
  - "C'est la fête → c-est-la-fete (NOT cest-la-fete). The apostrophe is treated like any other non-alphanumeric and collapsed to a dash. Rationale: keeps the implementation a one-pass regex (no special-casing) and is more readable for the few French contractions we'll see in cagnotte titles. Locked in fixture 'C\\'est la fête'."
  - "ensureUniqueSlug retries on the ORIGINAL base for collision suffixes (admin → admin-1 → admin-2), not on the rewritten start. The 'reserved with -1 already taken' fixture pins this; it reads more naturally for users."
  - "Duck-typed P2002 detection (instanceof OR .code === 'P2002') stays in production code, not just tests — Prisma loses the prototype chain across some async boundaries (especially with $transaction callbacks). Both branches are load-bearing."
metrics:
  duration: ~10min
  completed: 2026-04-13
  tasks_total: 3
  tasks_completed: 3
  fixtures_total: 68
  fixtures_passed: 68
---

# Phase 01 Plan 02: Cagnotte Slug Helper Summary

One-liner: Pure French slug generator + Prisma-P2002 retry helper with 15-entry reserved-word guard, fully tested via 68 in-memory fixtures.

## Tasks

| Task | Name                                         | Status | Commit  |
| ---- | -------------------------------------------- | ------ | ------- |
| 1    | Failing fixtures file (RED)                  | Done   | d02c197 |
| 2    | Implement slug.ts (GREEN)                    | Done   | a1994cc |
| 3    | TypeScript build gate                        | Done   | (verify-only, no commit) |

## Test Harness Result

```
=== slugify() fixtures ===
✓ Coumba Ndiaye
✓ Fatoumata Dramé
✓ Les 30 ans de Thomas Diémé
✓ Cadeau pour Aïssata
…
✓ Birame Faye

=== ensureUniqueSlug() fixtures ===
✓ reserved: admin
✓ reserved: api
✓ reserved: dashboard
✓ reserved: tableau-de-bord
✓ reserved: toutes-les-cagnottes
✓ reserved: nouvelle
✓ no collision
✓ one collision
✓ collision chain → -3
✓ collision chain → -10
✓ fallback timestamp
✓ reserved with -1 already taken

=== BLOCK_RESERVED_SLUGS sanity ===
✓ reserved set has 15 entries
✓ reserved set has admin
✓ reserved set has api
✓ reserved set has tableau-de-bord
✓ reserved set has toutes-les-cagnottes
✓ reserved set does NOT have cagnottes
✓ reserved set does NOT have blocks

68/68 passed
exit: 0
```

49 slugify fixtures + 12 ensureUniqueSlug fixtures + 7 reserved-set sanity checks = 68 total. The plan required ≥50 combined; we shipped 68.

## Build Gate

```
> cagnottes-sn-backend@0.1.0 build
> tsc
exit: 0
```

Zero TypeScript errors. No regressions in any other backend file. The new `slug.ts` imports cleanly from `../../generated/prisma/client.js` — the custom Prisma output path resolves correctly under NodeNext module resolution.

## Locked Decisions

### 1. Apostrophe handling: `C'est la fête → c-est-la-fete`

The plan listed two acceptable options (`c-est-la-fete` or `cest-la-fete`) and asked to lock one. We picked **`c-est-la-fete`** because:

1. It keeps `slugify()` a single-pass regex (no apostrophe special-case branch).
2. It's more visually parseable (`c-est-la-fete` reads as 5 tokens; `cest-la-fete` reads as a typo).
3. French contractions are rare in cagnotte titles ("Mémoire d'Étienne", "Fête de l'Aïd") and all benefit from the same readable treatment.

Locked in `test-slug.ts` fixture `"C'est la fête"` and the same pattern in `"Mémoire d'Étienne"` and `"Fête de l'Aïd"`.

### 2. Reserved-word collision rewrite reads from the original base

When `base = "admin"` and the registry already contains `admin-1`, we return `admin-2` (NOT `admin-1-2`). The retry loop iterates `${base}-${n}` not `${start}-${n}`. The fixture `"reserved with -1 already taken"` pins this; it produces the same human-readable `<word>-N` chain whether or not the word is reserved.

### 3. Duck-typed P2002 detection stays in production code

`isUniqueConstraintError(err)` checks BOTH `instanceof Prisma.PrismaClientKnownRequestError` AND `err?.code === "P2002"`. The duck-typed branch is not just a test affordance — Prisma is known to lose the prototype chain across some async boundaries (notably inside `$transaction` callbacks). Both branches are load-bearing.

## Deviations from Plan

None — plan executed exactly as written. All Task 1/2/3 actions and verification gates ran on the first attempt with no Rule 1/2/3 fixes needed.

## Threat Flags

None. The new file is pure logic + a typed retry loop. No new network surface, no new file I/O, no new auth path, no new schema. The `BLOCK_RESERVED_SLUGS` set directly mitigates `T-01-02-01` from the plan's threat register; `slugify()`'s `[^a-z0-9]+` collapse mitigates `T-01-02-02`; the 10-attempt cap mitigates `T-01-02-04`.

## Out-of-Scope (not done in this plan)

The plan's stated objective in the PLAN.md file is the helper + tests + build gate. The user-prompt objective additionally mentioned wiring into `backend/src/routes/blocks.ts` for FUNDRAISER block creation — that wiring is **NOT** done here because:

1. The PLAN.md tasks list does not include a wiring task.
2. The PLAN.md `<objective>` explicitly says "Phase 2 plan 02-01 will wire this into `POST /api/blocks` for FUNDRAISER creation."
3. Wiring requires touching the `POST /api/blocks` handler, which the plan does not authorize.

When PLAN and prompt diverge, PLAN wins. The route wiring is queued for plan 02-01.

## Self-Check: PASSED

- [x] `backend/src/lib/cagnottes/slug.ts` exists (146 lines)
- [x] `backend/scripts/test-slug.ts` exists (294 lines, 68 fixtures)
- [x] `slug.ts` exports exactly `slugify`, `ensureUniqueSlug`, `BLOCK_RESERVED_SLUGS` (no extras)
- [x] `slug.ts` imports `Prisma` only from `../../generated/prisma/client.js` (no `@prisma/client`)
- [x] No `randomBytes`, `Math.random`, or `crypto.random` in `slug.ts` (grep confirms — only mention is the forbidding comment)
- [x] `tsx scripts/test-slug.ts` exits 0 with `68/68 passed`
- [x] `npm run build` exits 0
- [x] `ensureUniqueSlug` retries exactly 10 numeric attempts before timestamp fallback
- [x] Commit `d02c197` (Task 1 — RED) found in git log
- [x] Commit `a1994cc` (Task 2 — GREEN) found in git log
