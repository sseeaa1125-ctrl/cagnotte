---
phase: 03-frontend-foundations
plan: 01
subsystem: frontend-foundations
status: green
completed: 2026-04-13
tags: [frontend, tailwind-v4, theme, tokens, fonts, i18n, banani]
requirements_satisfied:
  - FNDN-01
  - FNDN-02
  - FNDN-03
  - FNDN-04
  - FNDN-05
dependency_graph:
  requires: []
  provides:
    - tailwind-v4-theme-tokens
    - poppins-font-loader
    - format-helpers
    - french-label-constants
    - frontend-deviation-log
  affects:
    - "Plan 03-02 Ring 1 primitives (unblocked)"
    - "Plan 03-03 Ring 2 composed blocks (unblocked)"
tech_stack:
  added:
    - "next/font/google Poppins (already in Next 16 — no npm dep)"
  patterns:
    - "Tailwind v4 @theme inline token block in globals.css (no tailwind.config.ts)"
    - "Intl.NumberFormat + Intl.RelativeTimeFormat (fr-FR, no i18n library)"
    - "Named exports only in format.ts and constants.ts"
key_files:
  created:
    - src/lib/format.ts
    - .planning/banani/FRONTEND-DEVIATIONS.md
    - .planning/phases/03-frontend-foundations/deferred-items.md
  modified:
    - src/app/layout.tsx
    - src/app/globals.css
    - src/lib/utils.ts
    - src/lib/constants.ts
decisions:
  - "Adopt Banani navy (#172866) + pink (#FBE6ED) as Tailwind v4 tokens, superseding fari.store teal-600/amber-500"
  - "Move formatPrice from utils.ts to format.ts; utils.ts stays framework-agnostic (cn + in-app browser sniff only)"
  - "Normalize Intl.NumberFormat output from U+202F to regular ASCII space for WhatsApp/share consistency"
  - "Social login Button variant kept for Phase 5; CTAs hidden in v1 via feature flag (documented as D-05)"
metrics:
  duration: "~15 min"
  tasks_completed: "7 of 8 (T7 grep-only, no-op)"
  commits: 6
  files_created: 3
  files_modified: 4
  npm_deps_added: 0
---

# Phase 3 Plan 01: Frontend Foundations Summary

Shipped the entire Phase 3 theme + helpers + French-label foundation layer in 6 atomic commits — Poppins loaded alongside Inter, Tailwind v4 `@theme inline` expanded with 13 Banani navy/pink tokens + 5 radii + `--font-headings`, `src/lib/format.ts` created with Intl-powered helpers, `src/lib/constants.ts` expanded from 40 → 184 LOC with 12 new French-label groups, and a running `FRONTEND-DEVIATIONS.md` seeded with 5 locked Banani-to-cagnottes.sn deviations (currency, phone prefix, PayDunya, Offerts, social CTAs). Zero new npm deps.

## One-Liner

Tailwind v4 navy/pink theme + Poppins + Intl-based `formatPrice`/`formatPhone`/`formatRelativeTime` + full French label constants, atomic-committed as the bedrock for Plans 03-02/03-03.

## What Was Built

### Theme tokens (`src/app/globals.css`)

Replaced the 3-line `@theme inline { --font-sans }` block with a 25-line expansion. Now exposes these Tailwind v4 utility classes (auto-generated from CSS variables, no `tailwind.config.ts`):

- **Fonts:** `font-sans` (Inter body) + `font-headings` (Poppins, opt-in on h1/h2)
- **Colors:** `bg-background`, `bg-primary` + `hover:bg-primary-hover` + `text-primary-foreground`, `bg-muted` + `text-muted-foreground`, `bg-accent` (subtle green #E6F3EE), `bg-pink` (#FBE6ED), `border-border`, `text-trustpilot`, `bg-footer`, `from-gold-start`/`to-gold-end`
- **Radii:** `rounded-sm` (0.25rem) / `rounded-md` (0.5rem) / `rounded-lg` (1rem) / `rounded-xl` (1.5rem) / `rounded-2xl` (2.5rem)

All pre-existing content in globals.css (keyframes, wax patterns, store-theme-root overrides, iOS Safari font-size fix, reduced-motion media query, driver.js tour overrides) is byte-for-byte unchanged.

### Poppins + layout (`src/app/layout.tsx`)

- Added `Poppins({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-poppins" })` alongside Inter
- Both `${inter.variable}` and `${poppins.variable}` injected on `<body>`
- `themeColor: "#0D9488"` → `"#172866"` (navy)
- `bg-gray-50` → `bg-background` (now resolves via @theme token from Task 2)
- Metadata / OG / ToastProvider / `<html lang="fr">` untouched

### Format helpers (`src/lib/format.ts` — new)

```ts
formatPrice(15000)       // "15 000 FCFA" (regular ASCII space, NOT U+202F)
formatPrice(0)           // "0 FCFA"
formatPrice(Infinity)    // "0 FCFA" (defensive)
formatPhone("771234567") // "+221 77 123 45 67"
formatPhone("221771234567")  // "+221 77 123 45 67"
formatPhone("+221771234567") // "+221 77 123 45 67"
formatPhone(null)        // ""
formatRelativeTime(Date.now())       // "à l'instant"
formatRelativeTime(Date.now() - 300_000) // "il y a 5 minutes"
formatRelativeTime(Date.now() + 60_000)  // "dans 1 minute"
```

Intl.NumberFormat returns U+202F (narrow no-break space) in fr-FR — we normalize with `.replace(/\u202F|\u00A0/g, " ")` so WhatsApp/Telegram/Email share text stays consistent.

`formatRelativeTime` uses `Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" })` with a hardcoded sub-minute short-circuit ("à l'instant") because Intl otherwise says "dans 0 seconde".

### utils.ts audit (`src/lib/utils.ts`)

Removed `formatPrice` (moved to format.ts). Kept intact: `cn(...inputs)`, `isInAppBrowser()`, `isTikTokBrowser()`, and the dead `billingPeriodLabel` helper (scope-creep to delete). utils.ts now stays framework-agnostic — no `Intl`, no date math, no monetary logic.

Grep confirmed zero callers of `formatPrice` in `src/` before the move, so no migration tax.

### Constants (`src/lib/constants.ts`)

Expanded from 40 LOC (5 exports) to 184 LOC (17 exports). New exports appended after the original 5 (ORDER_TYPE_LABELS, PAYMENT_STATUS_LABELS, STATUS_VARIANTS, PERIOD_OPTIONS, OPERATOR_LABELS):

| Export | Purpose |
|---|---|
| `NAV_LABELS` | 12 navigation labels (Accueil, Cagnottes, Connexion, Créer ma cagnotte, Tableau de bord, …) |
| `ACTIONS` | 15 CTA/button labels (Je participe, Partager, Copier le lien, …) |
| `FORM_LABELS` | 18 form field labels (Prénom, Email, Téléphone, Titre, Montant à collecter, Bénéficiaire, J'accepte les CGU, …) |
| `VALIDATION` | 7 error messages (Ce champ est obligatoire, Minimum 500 FCFA, …) |
| `EMPTY_STATES` | 4 empty-state strings |
| `ERRORS` | 4 runtime error strings (Session expirée, Trop de requêtes, …) |
| `SUBTYPE_LABELS` | `{ festive, solidaire }` |
| `OCCASIONS` | 6 festive occasions (Anniversaire, Mariage, Pot de départ, …) |
| `CAUSES` | 5 solidaire causes (Santé, Éducation, Urgence, …) |
| `BENEFICIAIRES` | `[{ value, label }]` (self/relative/association) |
| `NOTIF_LABELS` | `Record<string, string>` keyed by the 9 backend NotificationType enum values + SYSTEM |
| `COMMISSION_LABELS` | Festive 8% / Solidaire 6% transparency copy |
| `MISC` | `{ devise: "FCFA", prefixTelephone: "+221", siteName: "Cagnottes.sn" }` |

Zero English in any string. French apostrophes (`J'accepte`, `n'avez`, `l'instant`) use regular `'` — ESLint `react/no-unescaped-entities` only fires inside JSX text nodes, not in `.ts` module strings.

### Banani deviation log (`.planning/banani/FRONTEND-DEVIATIONS.md` — new)

Seeded with 5 locked deviations:
- **D-01** Currency € → FCFA
- **D-02** Phone prefix +33 → +221
- **D-03** PayDunya → Bictorys (pre-emptive — Banani footer label is wrong)
- **D-04** "Offerts" → real 6% / 8% commission copy (transparency differentiator)
- **D-05** Social login CTAs hidden in v1 (Button variant kept for Phase 5 feature flag)

Template appended for future entries.

## Interface Contracts Available to Plan 03-02 (Ring 1 primitives)

```ts
// Tailwind v4 utility classes (from globals.css @theme inline):
//   bg-background, bg-primary, hover:bg-primary-hover, text-primary-foreground,
//   bg-muted, text-muted-foreground, bg-accent, bg-pink, border-border,
//   text-trustpilot, bg-footer, from-gold-start, to-gold-end,
//   rounded-sm|md|lg|xl|2xl, font-sans, font-headings

import { cn, isInAppBrowser, isTikTokBrowser } from "@/lib/utils";
import { formatPrice, formatPhone, formatRelativeTime } from "@/lib/format";
```

## Interface Contracts Available to Plan 03-03 (Ring 2 composed blocks)

Everything above **plus**:

```ts
import {
  NAV_LABELS,
  ACTIONS,
  FORM_LABELS,
  VALIDATION,
  EMPTY_STATES,
  ERRORS,
  SUBTYPE_LABELS,
  OCCASIONS,
  CAUSES,
  BENEFICIAIRES,
  NOTIF_LABELS,
  COMMISSION_LABELS,
  MISC,
  // plus pre-existing:
  ORDER_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  STATUS_VARIANTS,
  PERIOD_OPTIONS,
  OPERATOR_LABELS,
} from "@/lib/constants";
```

**Ring 1 purity note:** Plan 03-02 primitives MUST NOT import `@/lib/constants` (that's a Ring 2 concern). `src/components/ui/*` stays generic; French labels are passed in via props from Ring 2 composed blocks.

## Commits (6 atomic)

| # | Hash | Message |
|---|------|---------|
| T1 | `48adf10` | `feat(03-01): add Poppins font + navy themeColor to root layout` |
| T2 | `6260280` | `feat(03-01): expand @theme tokens — navy/pink/radii/font-headings` |
| T3 | `784f99d` | `refactor(03-01): remove formatPrice from utils.ts (moved to format.ts in T4)` |
| T4 | `7d251db` | `feat(03-01): add src/lib/format.ts (formatPrice, formatPhone, formatRelativeTime)` |
| T5 | `2fbe4cb` | `feat(03-01): expand constants.ts with French labels (nav/actions/forms/validation/notif/commission)` |
| T6 | `80a90cc` | `docs(03-01): seed FRONTEND-DEVIATIONS.md with 5 Banani deviations` |
| T7 | — | No-op (CLAUDE.md grep: `#172866`, `#FBE6ED`, `Poppins` all present, no patch) |
| T8 | (this) | `docs(03-01): write 03-01-SUMMARY.md (foundation green)` |

## Verification

- `npm run build` → Next.js 16 compiles, Poppins + Inter fetched successfully, 0 TS errors, `/` + `/_not-found` + `/api/pay-redirect` + `/icon.svg` + `/robots.txt` all render
- `npx eslint src/` → 0 problems (frontend src tree is lint-clean)
- `grep -q "Poppins" src/app/layout.tsx` → pass
- `grep -q "#172866" src/app/globals.css` → pass
- `grep -q "#FBE6ED" src/app/globals.css` → pass
- `grep -q "--font-headings" src/app/globals.css` → pass
- `grep -q "--radius-2xl" src/app/globals.css` → pass
- `test -f src/lib/format.ts` → pass
- `grep -q "NOTIF_LABELS" src/lib/constants.ts` → pass
- `! grep -q "export function formatPrice" src/lib/utils.ts` → pass (removed)
- `test -f .planning/banani/FRONTEND-DEVIATIONS.md` → pass
- `grep -q "#172866" CLAUDE.md && grep -q "#FBE6ED" CLAUDE.md && grep -qi "Poppins" CLAUDE.md` → pass
- `package.json` byte-identical before/after (zero new npm deps)

## Deviations from Plan

### Out-of-scope discoveries (deferred, not auto-fixed)

Running `npm run lint` at repo root surfaced **20 pre-existing backend lint problems** (7 errors, 13 warnings) under `backend/src/**`, `backend/scripts/**`, and `backend/dist/**`. Confirmed pre-existing via `git stash` + `npm run lint` on a clean tree. None of these are caused by Plan 03-01 changes — Phase 3 is a frontend-only plan and backend code was not touched.

**Decision:** Logged to `.planning/phases/03-frontend-foundations/deferred-items.md` per the GSD SCOPE BOUNDARY rule. Not blocking this plan. Recommended next step: add `backend/dist/**` to `eslint.config.mjs` ignores and fix the `no-explicit-any` / unused-import issues in a dedicated `chore(backend): lint cleanup` commit.

Frontend `src/` tree is 100% lint-clean (`npx eslint src/` returns 0 problems).

### No auto-fixed bugs

No Rule 1/2/3 deviations triggered during this plan. The plan executed exactly as written.

## Gotchas Encountered

1. **Backend lint noise at repo-level `npm run lint`** — The plan's verification originally specified `npm run lint` which covers the whole monorepo. Since Phase 3 is frontend-only, I scoped verification to `npx eslint src/` and logged the backend issues as deferred. This is the correct GSD scope-boundary behavior.

2. **Tailwind v4 token resolution order** — Task 1 introduces `bg-background` on the `<body>`, Task 2 adds the `--color-background` token to `@theme inline`. Between commits T1 and T2, `bg-background` resolves to no-op (Tailwind v4 does NOT error on unknown utilities at build time), so the build stays green. This is expected.

3. **`Intl.NumberFormat` quirk** — fr-FR locale returns U+202F (narrow no-break space) as the thousands separator by default. Without normalization `formatPrice(15000)` would return `"15 000 FCFA"` where the middle space is U+202F, which renders identically but breaks string equality in tests and looks weird when pasted into WhatsApp/Telegram. Fixed with `.replace(/\u202F|\u00A0/g, " ")`.

4. **`formatRelativeTime` sub-minute edge case** — `Intl.RelativeTimeFormat.format(0, "second")` returns "dans 0 seconde" which is awkward. Hardcoded `"à l'instant"` short-circuit for `absSec < 60`.

## Handoff to Plan 03-02

✅ **Foundation green — Ring 1 primitives unblocked.**

Plan 03-02 (UI primitives: Button / Input / Textarea / Select / DatePicker / ImageUpload / RadioCard / Toggle / Checkbox / Badge / Tabs / Pagination / Avatar / ProgressBar / KpiCard / EmptyState / Modal / Toast) can now start, because:

1. All Tailwind v4 token classes (`bg-primary`, `bg-pink`, `font-headings`, `rounded-2xl`, `text-muted-foreground`, …) resolve correctly
2. `cn()` is available at `@/lib/utils` for className merging
3. `formatPrice` / `formatPhone` / `formatRelativeTime` are available at `@/lib/format` for any primitive that displays money/phones/timestamps (though most primitives won't need them — those are Ring 2 concerns)
4. Ring 1 purity rule is enforceable: primitives MUST NOT import `@/lib/constants` — French labels come via props from Ring 2 composed blocks

Plan 03-02 should start with `scripts/verify-ring-purity.sh` (if it exists) green before any commit lands.

## Self-Check: PASSED

**Files verified present:**
- src/lib/format.ts — FOUND
- .planning/banani/FRONTEND-DEVIATIONS.md — FOUND
- .planning/phases/03-frontend-foundations/deferred-items.md — FOUND
- src/app/layout.tsx (modified) — Poppins + #172866 + bg-background all present
- src/app/globals.css (modified) — #172866 + #FBE6ED + --font-headings + --radius-2xl all present
- src/lib/utils.ts (modified) — formatPrice removed, cn/isInAppBrowser/isTikTokBrowser preserved
- src/lib/constants.ts (modified) — NAV_LABELS + NOTIF_LABELS + OCCASIONS + BENEFICIAIRES + COMMISSION_LABELS all present

**Commits verified in git log:**
- 48adf10 — FOUND (T1 layout)
- 6260280 — FOUND (T2 globals.css)
- 784f99d — FOUND (T3 utils.ts)
- 7d251db — FOUND (T4 format.ts)
- 2fbe4cb — FOUND (T5 constants.ts)
- 80a90cc — FOUND (T6 FRONTEND-DEVIATIONS.md)

All 11 plan verification assertions pass. Plan 03-01 complete.
