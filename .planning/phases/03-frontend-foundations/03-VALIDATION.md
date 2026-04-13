---
phase: 03-frontend-foundations
type: validation
---

# Phase 3 — Validation Architecture

Extracted from `03-RESEARCH.md` § Validation Architecture. Maps every Phase 3 requirement to an automated verification command. No new test framework added — verification is `npm run build` + `npm run lint` + grep + manual fixture page visit.

## Test Framework

| Property | Value |
|----------|-------|
| Framework | None — no test framework configured (CLAUDE.md: "No test framework is configured yet") |
| Quick run command | `npm run build && npm run lint && bash scripts/verify-ring-purity.sh` |
| Phase gate | `npm run build` 0 errors / 0 warnings + ring-purity green + manual `/dev-foundations` visit |

## Requirements → Verification Map

| Req ID | Behavior | Test Type | Automated Command | Plan |
|--------|----------|-----------|-------------------|------|
| FNDN-01 | Poppins loaded via `next/font/google` | smoke | `grep -q "var(--font-poppins)" src/app/layout.tsx` | 03-01 T1 |
| FNDN-02 | Navy `#172866` in `@theme inline` | smoke | `grep -q "color-primary: #172866" src/app/globals.css` | 03-01 T2 |
| FNDN-03 | `cn()` exported from `@/lib/utils` | compile | `npm run build` type-checks `import {cn} from "@/lib/utils"` | 03-01 T3 |
| FNDN-04 | `formatPrice(15000) === "15 000 FCFA"` | smoke | inline `console.assert` in `dev-foundations` page + grep `grep -q "formatPrice" src/lib/format.ts` | 03-01 T4 |
| FNDN-05 | Zero English in JSX | grep | `grep -rnE "(Subscribe\|Sign up\|Sign in\|Login\|Create account)" src/components/ src/app/` returns nothing | 03-01 T5 + ongoing |
| PRIM-01 | `Button` with social variants exists | compile + grep | `grep -q "social.*google\\|apple\\|facebook\\|whatsapp" src/components/ui/Button.tsx` | 03-02 Batch C |
| PRIM-02 | Form inputs (`Input`/`Textarea`/`Select`/`DatePicker`/`ImageUpload`) | compile | `npm run build` | 03-02 Batch A |
| PRIM-03 | Selection (`RadioCard`/`Toggle`/`Checkbox`) | compile | `npm run build` | 03-02 Batch B |
| PRIM-04 | Display (`Badge`/`Avatar`/`ProgressBar`/`KpiCard`/`Pagination`/`Tabs`) | compile | `npm run build` | 03-02 Batch D |
| PRIM-05 | Overlays (`Modal`/`EmptyState`/`Toast`) | compile | `npm run build` | 03-02 Batch E |
| PRIM-06 | Touch targets ≥ 48px | grep | `grep -E "min-h-(12\|14\|16)\|py-3\\.5" src/components/ui/Button.tsx` (and other tappable primitives) | 03-02 every batch |
| PRIM-07 | Mobile-first base classes | review | manual visual at `/dev-foundations` resized to 375px | 03-02 final |
| PRIM-08 | Ring-1 purity (no domain imports) | grep | `bash scripts/verify-ring-purity.sh` (exit 1 if any `@/lib/api`/`@/lib/useApi`/`@/lib/constants`/`@/contexts/AuthContext` import found in `src/components/ui/` except whitelisted `@/contexts/ToastContext`) | 03-02 every batch + final |
| COMP-01 | Layout blocks (`PublicNavbar`/`DashboardNavbar`/`TopBanner`/`Footer`/`PreFooter`/`SidebarNav`) | compile | `npm run build` | 03-03 T2 |
| COMP-02 | Cagnotte blocks (`CampaignCard` festive/solidaire + `FilterChipBar`) | compile | `npm run build` | 03-03 T3 |
| COMP-03 | Checkout blocks (`MiniCagnotteCard` + `OrderSummary`) | compile | `npm run build` | 03-03 T4 |
| COMP-04 | Share/notifications/trust (`ShareSheet`/`NotificationItem`/`TrustpilotBadge`) | compile | `npm run build` | 03-03 T5 |
| COMP-05 | Ring-2 purity (no `useApi`/`api`/`AuthContext` direct imports) | grep | `bash scripts/verify-ring-purity.sh` (Ring 2 mode covers `src/components/{layout,cagnottes,checkout,share,notifications,trust}/`) | 03-03 every task + final |

## Sampling Cadence

- **Per task commit:** `npm run build && npm run lint && bash scripts/verify-ring-purity.sh`
- **Per wave merge:** same + Banani drift grep `grep -rnE "(€|\+33|PayDunya|Offerts)" src/components/` (must return nothing)
- **Phase gate:** same + manual visit to `/dev-foundations` in `npm run dev`, scroll through every primitive + every block, assert no console errors, resize browser to 375px and verify mobile layout

## Phase Gate (must all be green)

1. `npm run build` — exit 0, zero TypeScript errors
2. `npm run lint` — exit 0, zero ESLint warnings
3. `bash scripts/verify-ring-purity.sh` — exit 0 for both Ring 1 (`src/components/ui/`) and Ring 2 (`src/components/{layout,cagnottes,checkout,share,notifications,trust}/`)
4. Banani drift grep `grep -rnE "(€|\+33|PayDunya|Offerts)" src/components/` — no matches
5. Manual `/dev-foundations` page renders all 18 primitives + all 13 composed blocks at 375px and 1280px without console errors

## Out of Scope

- Vitest/Jest setup — explicitly deferred to a post-v1 quality phase
- E2E (Playwright/Cypress) — Phase 4+ revenue path will live-test in dev mode
- Visual regression (Chromatic/Percy) — not in scope
- a11y automated audit (axe-core) — manual checklist only (focus rings, touch targets, alt text)

## Runtime State

Phase 3 is a greenfield frontend build. No data migration, no rename, no refactor of running code paths. No runtime state to preserve.
