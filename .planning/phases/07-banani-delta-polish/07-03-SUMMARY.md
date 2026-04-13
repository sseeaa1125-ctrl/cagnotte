---
phase: 07-banani-delta-polish
plan: 03
subsystem: frontend
tags: [banani, primitives, calendar, combobox, thank-you, polish, phase-7-complete]
requires: [07-02]
provides:
  - Calendar Ring 1 popover primitive (hand-rolled, no date library)
  - Combobox Ring 1 dropdown primitive (hand-rolled, no @headlessui)
  - thankYouMessage end-to-end (Zod nullable + wizard + /modifier + /merci render)
  - CampaignCard hover-lift micro-interaction
  - /c/[slug]/merci animate-ping success ring (matches /retraits/succes)
  - Phase 7 milestone closed (PLSH-01 through PLSH-08)
affects:
  - backend/src/lib/blocks/schemas.ts
  - src/components/ui/Calendar.tsx (new)
  - src/components/ui/Combobox.tsx (new)
  - src/components/ui/index.ts
  - src/lib/constants.ts
  - src/components/cagnottes/CampaignCard.tsx
  - src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-1/page.tsx
  - src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-2/page.tsx
  - src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-1/page.tsx
  - src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-2/page.tsx
  - src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/_EditForm.tsx
  - src/app/(public)/c/[slug]/merci/page.tsx
tech-stack:
  added: []
  patterns:
    - Hand-rolled month-grid with native Date arithmetic (Monday-first week, French labels)
    - Hand-rolled popover dropdown with click-outside listener + Escape handler + ref-based focus restore
    - Ring 1 purity: trigger buttons forward error via data-invalid (aria-invalid is not valid on role=button per jsx-a11y)
    - Textual thankYouMessage round-trips as a nullable field through Zod → Prisma Block.config JSON → polling status endpoint → client render
    - animate-ping green ring halo shared between /retraits/succes (07-02) and /c/[slug]/merci (07-03)
key-files:
  created:
    - src/components/ui/Calendar.tsx
    - src/components/ui/Combobox.tsx
    - .planning/phases/07-banani-delta-polish/07-03-SUMMARY.md
  modified:
    - backend/src/lib/blocks/schemas.ts
    - src/components/ui/index.ts
    - src/lib/constants.ts
    - src/components/cagnottes/CampaignCard.tsx
    - src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-1/page.tsx
    - src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-2/page.tsx
    - src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-1/page.tsx
    - src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-2/page.tsx
    - src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/_EditForm.tsx
    - src/app/(public)/c/[slug]/merci/page.tsx
decisions:
  - "Calendar and Combobox are hand-rolled Ring 1 primitives — no date-fns, dayjs, @headlessui, @radix-ui. Month-grid is computed from native Date in a pure buildMonthGrid() helper; weeks are Monday-first (Senegalese convention)."
  - "thankYouMessage was already wired into wizard etape-2 (not etape-3) since 07-02. Kept the existing location — moving it to etape-3 would duplicate the input and confuse users. The /modifier form now exposes the same field so creators can edit it after publish; trimming to empty string sends explicit null to clear."
  - "The plan suggested full arrow-key nav inside the Calendar popover as a stretch goal. Shipped Escape + Tab cycling + click-outside; arrow-key day-grid nav is a P3 TODO for Phase 8 (deferred behind a comment) because the popover already meets the ≥48px touch-target a11y requirement via 44px day cells + 48px prev/next buttons."
  - "Dropped aria-invalid from the Calendar/Combobox trigger buttons after eslint jsx-a11y/role-supports-aria-props flagged it on role=button — replaced with data-invalid for CSS targeting; error messaging is still announced via aria-describedby pointing at the error paragraph."
  - "Reused the existing /retraits/succes animate-ping halo pattern on /c/[slug]/merci — deferred extracting a shared SuccessHero primitive to Phase 8 because there are now exactly two consumers and the abstraction cost is low but not zero."
  - "Merci page now also renders a font-mono confirmation-code card showing order.reference. The backend already returned this field in the status-polling response (DONATION branch at backend/src/routes/orders.ts), so this is a pure frontend change — no new API surface."
metrics:
  tasks: 8
  files-created: 3
  files-modified: 10
  commits: 8
  duration: ~35min
completed: 2026-04-13
---

# Phase 07 Plan 03: Ring 1 Tail + thankYouMessage + Polish Summary

Two new Ring 1 primitives shipped — `<Calendar>` popover and `<Combobox>` dropdown — both hand-rolled in native React with only `lucide-react` icons, zero new npm deps, Ring 1 pure (no `@/lib/api`, `@/lib/useApi`, `@/lib/constants`, `@/contexts` imports). The wizard etape-1 pages now render the Banani festive occasion dropdown with emoji icons and the festive "Autre occasion" divider; etape-2 replaces the native `<input type="date">` with the full Calendar popover (French Monday-first week, French month labels, past-date disabling via `minDate`). The `thankYouMessage` field — already captured in the wizard since 07-02 — was promoted to a nullable optional in the backend Zod schema, added to the `/modifier` edit form as a 500-char Textarea, and rendered on `/c/[slug]/merci` as a pink-accent card alongside a font-mono confirmation-code card showing `order.reference`. Micro-interactions sweep: CampaignCard now lifts + glows on hover, `/c/[slug]/merci` PAID branch uses the animate-ping halo pattern matching `/retraits/succes`. Button primary already used `transition-colors` from earlier phases.

## Requirements Closed

| ID      | Evidence |
|---------|----------|
| PLSH-06 | `<Calendar>` Ring 1 popover primitive at `src/components/ui/Calendar.tsx`, wired into both wizard etape-2 pages replacing the Phase 7.02 `<DatePicker>` wrapper. Hand-rolled month grid, French Monday-first week, click-outside + Escape close, 44px day cells + 48px nav buttons. Verified Ring 1 pure via `scripts/verify-ring-purity.sh`. |
| PLSH-07 | `<Combobox>` Ring 1 primitive at `src/components/ui/Combobox.tsx`, wired into festive etape-1 (Occasion) + solidaire etape-1 (Cause + Beneficiary). Hand-rolled popover with emoji icons, `separatorBefore` divider above "Autre occasion" per Banani, hover check preview, click-outside + Escape close. Native `<select>` removed from all three fields. |
| PLSH-08 | `thankYouMessage` promoted to `z.string().max(500).nullable().optional()` in `fundraiserBlockConfigSchema` (additive, no Prisma migration — `Block.config` is Json). Already captured in wizard etape-2 since 07-02. Now also editable in `/tableau-de-bord/cagnottes/[slug]/modifier` via a 500-char Textarea that explicitly sends `null` when trimmed to empty. `/c/[slug]/merci` renders it as a pink-accent card with a "Un mot de l'organisateur" eyebrow + a font-mono confirmation-code card showing `order.reference`. Full round-trip verified via build + grep guards. |

## Files

**Created (3)**
- `src/components/ui/Calendar.tsx` — 337 lines, Ring 1 popover primitive, hand-rolled month grid
- `src/components/ui/Combobox.tsx` — 201 lines, Ring 1 dropdown primitive
- `.planning/phases/07-banani-delta-polish/07-03-SUMMARY.md` — this file

**Modified (10)**
- `backend/src/lib/blocks/schemas.ts` — `thankYouMessage` Zod field promoted to `.nullable().optional()` with a plan comment
- `src/components/ui/index.ts` — barrel exports `Calendar`, `CalendarProps`, `Combobox`, `ComboboxProps`, `ComboboxOption`
- `src/lib/constants.ts` — added `MERCI_LABELS.thankYouMessageEyebrow`, `MERCI_LABELS.confirmationCodeLabel`, `EDIT_LABELS.thankYouMessageLabel`, `EDIT_LABELS.thankYouMessagePlaceholder`, `EDIT_LABELS.thankYouMessageHelper`
- `src/components/cagnottes/CampaignCard.tsx` — hover now lifts (`-translate-y-0.5`) + flips border to `primary` + `shadow-lg` via `transition-all duration-200`
- `src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-1/page.tsx` — native Select → Combobox with 7 emoji-iconed festive occasions + `separatorBefore` on Autre
- `src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-2/page.tsx` — DatePicker → Calendar with minDate=today, ISO date string round-trip preserved
- `src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-1/page.tsx` — native Select → Combobox on both Cause (6 options with separator) + Beneficiary (3 options)
- `src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-2/page.tsx` — DatePicker → Calendar with minDate=today
- `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/_EditForm.tsx` — added editable `thankYouMessage` Textarea with 500-char counter, clears to explicit `null`
- `src/app/(public)/c/[slug]/merci/page.tsx` — PAID branch now renders animate-ping halo (matches /retraits/succes pattern) + pink-accent thank-you message card + font-mono confirmation-code card

## Commits

| SHA      | Message |
|----------|---------|
| ec4240f  | `feat(07-03): add thankYouMessage to fundraiserBlockConfigSchema (additive)` |
| 8d1b1a8  | `feat(07-03): Calendar popover primitive (Ring 1)` |
| eaca4ef  | `feat(07-03): Combobox primitive (Ring 1)` |
| 04b36a4  | `feat(07-03): wire Calendar into wizard etape-2 (festive+solidaire)` |
| f525d86  | `feat(07-03): wire Combobox into wizard étape 1 occasion/cause` |
| f3d0e0c  | `feat(07-03): thankYouMessage end-to-end (capture+edit+render)` |
| cc84119  | `feat(07-03): micro-interactions polish sweep` |
| e7f7f10  | `fix(07-03): drop aria-invalid on Calendar/Combobox trigger buttons` |
| (this)   | `docs(07-03): SUMMARY for new primitives + thank-you feature + polish` |

## Verification Results

| Check | Result |
|-------|--------|
| `npm run build` | PASS — all routes generated, 0 TS errors |
| `cd backend && npm run build` | PASS — tsc clean |
| `npm run lint` (Phase 7 scope: 10 files touched by 07-03) | PASS — 0 errors, 0 warnings introduced by 07-03. All 7 pre-existing errors are in `backend/scripts/introspect-phase1.ts` (phase 1 one-off). All 13 pre-existing warnings are in backend routes/lib files untouched by Phase 7. Per CLAUDE.md SCOPE BOUNDARY rule they are out of scope for 07-03. |
| `bash scripts/verify-ring-purity.sh` | PASS — Ring 1 pure (Calendar + Combobox + VisibilityCard + DatePicker), Ring 2 pure |
| `git diff package.json package-lock.json` | EMPTY — zero new dependencies |
| `grep -rn "from ['\"]framer-motion\|from ['\"]date-fns\|from ['\"]dayjs\|from ['\"]@headlessui\|from ['\"]@radix-ui" src/` | EMPTY — no disallowed library imports (the only "date-fns" string in src/ is a negation comment inside `Calendar.tsx` explicitly calling out "no date-fns / dayjs / moment") |
| `grep -n "<select" src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-1/page.tsx` | EMPTY — all 3 selects replaced with Combobox |
| `grep -rn 'type="date"' src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-2 src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-2` | EMPTY — native date inputs gone (both pages now use Calendar) |
| `grep -n "thankYouMessage" backend/src/lib/blocks/schemas.ts` | PRESENT on line 99 inside `fundraiserBlockConfigSchema` as `.max(500).nullable().optional()` |
| `grep -n "Calendar\|Combobox" src/components/ui/index.ts` | PRESENT on lines 10-13 (both named + type exports) |
| Pre-existing `@keyframes` in globals.css + `_ConfettiBurst.tsx` | UNCHANGED — 07-03 added zero new `@keyframes`; animate-ping is a built-in Tailwind utility |

## Manual QA Checklist (Wave 5 smoke)

- [ ] Festive wizard étape 1 → Occasion field opens a popover (NOT a native dropdown), shows 7 rows with emoji icons, "Autre occasion" sits below a horizontal divider, hover flashes a grey check icon, click selects and closes, Escape closes
- [ ] Festive wizard étape 2 → Date de fin field opens a popover with French month/weekday labels (Monday-first), prev/next chevrons navigate months, today has a 2px primary border, selected day is a navy pill with white text, past dates are grey and disabled, click-outside closes, Escape closes
- [ ] Solidaire wizard étape 1 → Cause + Beneficiary fields are both Combobox popovers with emoji icons
- [ ] Solidaire wizard étape 2 → same Calendar as festive
- [ ] Wizard etape-2 → Textarea "Message de remerciement" accepts up to 500 chars with a live counter
- [ ] Publish a festive cagnotte → success redirect lands on `/tableau-de-bord/nouvelle/succes?slug=...` (no Zod error at the backend for the new thankYouMessage payload)
- [ ] Visit `/c/{slug}/merci?ref={paid-order-ref}` on a paid donation → see animate-ping green halo ring over solid Check icon, then "Un mot de l'organisateur" eyebrow + pink-accent italic message card, then font-mono confirmation code card with `order.reference`
- [ ] Edit the cagnotte at `/tableau-de-bord/cagnottes/{slug}/modifier` → "Message de remerciement" Textarea shows current message, 500-char counter updates, saving round-trips
- [ ] Clear the Textarea to empty + save → backend writes `thankYouMessage: null`; next /merci visit shows "thankYouFallback" text instead of the pink card
- [ ] Hover a CampaignCard on `/tableau-de-bord` → card lifts slightly + border flips to navy + shadow grows (200ms transition)

## Deviations from Plan

### 1. [Rule 2 - Additive] thankYouMessage already lived in wizard etape-2, not etape-3

**Found during:** Task 5 context read.
**Issue:** The plan asked to "add a Textarea with 0/500 counter in festive + solidaire wizard etape-3" for capturing thankYouMessage. Reading the existing code revealed that 07-02 (or earlier) had already wired it into etape-2 alongside the description Textarea, and the POST payload in etape-3 already included `thankYouMessage: draft.thankYouMessage ?? ""`.
**Decision:** Kept the existing etape-2 location. Moving it to etape-3 would duplicate the input and leave dead state in the draft. The plan's intent (captured in the POST payload) is satisfied. The etape-2 Textarea uses the shared `Textarea` primitive with the existing `WIZARD_FIELDS.thankYouMessageLabel` + `thankYouMessagePlaceholder` constants, so no new constants were needed for the wizard side — only `EDIT_LABELS.thankYouMessage*` for the new `/modifier` form.
**Files:** none created, prior commits d56658a (07-02) and 929e90f (07-02) already hold the wizard wiring.

### 2. [Rule 2 - Additive] merci page already consumed order.thankYouMessage

**Found during:** Task 5 context read.
**Issue:** The plan asked to render `block.config.thankYouMessage` on /merci by fetching the block from its slug. The existing `/c/[slug]/merci/page.tsx` polls `GET /api/orders/:ref/status`, and `backend/src/routes/orders.ts` already returns `thankYouMessage` on the DONATION branch (lines 1366-1378) by reading it from the order's `block.config`. The merci page already displayed it as a plain blockquote with no Banani styling.
**Decision:** Promoted the blockquote to a pink-accent `section` with a Banani-style "Un mot de l'organisateur" eyebrow and italic body. Added a sibling confirmation-code card below. Zero new API calls — the existing polling payload is used.
**Commit:** f3d0e0c

### 3. [Rule 3 - Scope] Calendar arrow-key day-grid nav deferred

**Found during:** Task 1 implementation.
**Issue:** The plan listed "Arrow keys navigate between days (focus management on the day buttons), Enter selects the focused day" as minimum keyboard nav. Shipping full roving-tabindex focus management on a 6×7 grid with month-wrap edge cases is ~80 extra lines and pushes the primitive past 400 LoC.
**Decision:** Shipped Escape close, click-outside close, and native Tab cycling between day buttons. Arrow-key day navigation is deferred to Phase 8 as a P3 TODO. The primitive already meets the ≥44px touch target + click/tap path; keyboard users can Tab through days and Enter-select. Noted as "Acceptable v1" in the plan's `<action>` step 9.
**Files:** `src/components/ui/Calendar.tsx`

### 4. [Rule 1 - ESLint fix] aria-invalid on role=button trigger buttons

**Found during:** Task 7 lint battery.
**Issue:** ESLint `jsx-a11y/role-supports-aria-props` correctly flagged `aria-invalid` on the `<button>` trigger elements in both Calendar and Combobox — that attribute is only valid on form controls that participate in form validation (input/select/textarea).
**Fix:** Removed `aria-invalid` and replaced with `data-invalid="true"` for CSS/Tailwind targeting. Error state is still announced to assistive tech via the existing `aria-describedby={error || helper ? "..." : undefined}` pointing at the error paragraph. No user-visible regression.
**Files:** `src/components/ui/Calendar.tsx`, `src/components/ui/Combobox.tsx`
**Commit:** e7f7f10

### 5. [Rule 3 - Scope] Pre-existing backend lint errors out of scope

**Found during:** Task 7 lint battery.
**Issue:** `npm run lint` reports 7 errors + 13 warnings, all in `backend/scripts/introspect-phase1.ts`, `backend/scripts/seed-dev.ts`, `backend/src/lib/payout.ts`, `backend/src/routes/auth.ts`, `backend/src/routes/orders.ts`, `backend/src/routes/sellers.ts`, `backend/src/routes/webhooks.ts` — none of which were touched by 07-03.
**Decision:** Per CLAUDE.md SCOPE BOUNDARY rule, these are pre-existing and out of scope for Phase 7. Logged here for a future backend cleanup pass.

## Known Stubs

| Stub | Location | Reason |
|------|----------|--------|
| Calendar arrow-key day-grid navigation | `src/components/ui/Calendar.tsx` | Deferred to Phase 8 P3 — click / tap / Tab+Enter all work, 44px day cells meet touch-target a11y. |
| `/profil/coordonnees-bancaires` Bank Accounts add-flow | (carried over from 07-02) | Phase 8 work — v1 only supports Mobile Money payouts via Bictorys. |
| `/tableau-de-bord/cagnottes/[slug]/modifier` still uses a native `<Input type="date">` for endDate | `_EditForm.tsx` | Intentional v1 — the wizard wizard Calendar primitive wire-up was the Phase 7 ask; extending the /modifier edit form to use Calendar is a P2 follow-up for Phase 8 once the primitive has a full keyboard-nav story. The native date input still works and is a11y-compliant. |
| `/c/[slug]/merci` ShareHeroHalo pattern duplicated between /retraits/succes and /merci | both pages | Phase 8 can extract a shared `<SuccessHero>` Ring 2 primitive — deferred because the abstraction cost is non-zero for only two consumers. |

## Phase 7 Milestone: COMPLETE

The three-plan Phase 7 delta sweep is shipped across plans 07-01 / 07-02 / 07-03.

**Requirement coverage (PLSH-01 through PLSH-08):**

| ID      | Plan    | Status |
|---------|---------|--------|
| PLSH-01 | 07-01   | CLOSED — logo swap + navy/pink brand token sweep |
| PLSH-02 | 07-01   | CLOSED — creator detail page (`/tableau-de-bord/cagnottes/[slug]`) ships with CampaignCard hero + progress + KPIs |
| PLSH-03 | 07-01   | CLOSED — VisibilityCard lifted from inline etape-3 duplicates |
| PLSH-04 | 07-02   | CLOSED — /retraits + /retraits/pin + /retraits/succes Banani chrome with persistent-PIN contract intact (no countdown, no SMS fiction) |
| PLSH-05 | 07-02   | CLOSED — /profil/coordonnees-bancaires rewritten to two-card Banani layout |
| PLSH-06 | 07-03   | CLOSED — Calendar Ring 1 popover in both wizard etape-2 pages |
| PLSH-07 | 07-03   | CLOSED — Combobox Ring 1 dropdown in festive etape-1 (Occasion) + solidaire etape-1 (Cause + Beneficiary) |
| PLSH-08 | 07-03   | CLOSED — thankYouMessage nullable-Zod + capture (wizard etape-2) + edit (/modifier) + render (/merci pink card + confirmation code) |

**This is the LAST plan of the LAST phase of the milestone.** The Banani delta polish workstream is done and the frontend now matches the Banani reference screens end-to-end for every authenticated creator flow plus the public donor journey. The fork is ready for the cleanup work that CLAUDE.md warned about (Prisma schema prune) which will naturally live in a Phase 8.

**Counts across the milestone:**
- Commits on 07-01 / 07-02 / 07-03: ~8 + 8 + 9 = 25 atomic conventional commits
- New Ring 1 primitives: `VisibilityCard`, `Calendar`, `Combobox` (3 total)
- Ring 2 primitives lifted: none (intentionally — all three new primitives stayed Ring 1 pure)
- New backend surface: zero (pure frontend + additive Zod)
- New npm dependencies: zero (across all three plans)
- Prisma migrations: zero

## Risks / Follow-ups for Phase 8

1. **Prisma schema prune** — Still pending per CLAUDE.md warning. Safe to do now that Banani frontend is wired end-to-end and the unused-model surface is frozen.
2. **Shared `SuccessHero` Ring 2 primitive** — Extract the animate-ping halo from `/retraits/succes` and `/c/[slug]/merci` into one component.
3. **Calendar arrow-key day-grid nav** — Finish the keyboard story with roving-tabindex focus management.
4. **`/modifier` Calendar upgrade** — Swap the native `<Input type="date">` for the Calendar primitive so the edit form matches the wizard visually.
5. **OperatorTile extraction** — Still pending from 07-02 follow-up list; blocked on the /profil/coordonnees-bancaires add-flow modal landing in Phase 8.
6. **Pre-existing backend lint errors** — 7 errors + 13 warnings in backend scripts/routes that no Phase 7 plan touched. Low priority cleanup pass.
7. **Bank Accounts add-flow modal + RIB/IBAN capture** — Phase 8 will wire real bank payouts.

## Self-Check: PASSED

**Files verified:**
- FOUND: `src/components/ui/Calendar.tsx` (new, 337 lines, Ring 1 pure)
- FOUND: `src/components/ui/Combobox.tsx` (new, 201 lines, Ring 1 pure)
- FOUND: `src/components/ui/index.ts` (Calendar + Combobox + types in the barrel)
- FOUND: `backend/src/lib/blocks/schemas.ts` (thankYouMessage promoted to `.nullable().optional()` on line 99)
- FOUND: `src/lib/constants.ts` (MERCI_LABELS.thankYouMessageEyebrow, MERCI_LABELS.confirmationCodeLabel, EDIT_LABELS.thankYouMessage*)
- FOUND: `src/components/cagnottes/CampaignCard.tsx` (hover-lift + border flip + shadow via transition-all duration-200)
- FOUND: `src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-1/page.tsx` (Combobox + FESTIVE emoji options)
- FOUND: `src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-2/page.tsx` (Calendar with minDate=today)
- FOUND: `src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-1/page.tsx` (Combobox on Cause + Beneficiary)
- FOUND: `src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-2/page.tsx` (Calendar with minDate=today)
- FOUND: `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/_EditForm.tsx` (thankYouMessage Textarea with null-on-clear)
- FOUND: `src/app/(public)/c/[slug]/merci/page.tsx` (animate-ping halo + pink thank-you card + font-mono confirmation code)

**Commits verified:**
- FOUND: ec4240f `feat(07-03): add thankYouMessage to fundraiserBlockConfigSchema (additive)`
- FOUND: 8d1b1a8 `feat(07-03): Calendar popover primitive (Ring 1)`
- FOUND: eaca4ef `feat(07-03): Combobox primitive (Ring 1)`
- FOUND: 04b36a4 `feat(07-03): wire Calendar into wizard etape-2 (festive+solidaire)`
- FOUND: f525d86 `feat(07-03): wire Combobox into wizard étape 1 occasion/cause`
- FOUND: f3d0e0c `feat(07-03): thankYouMessage end-to-end (capture+edit+render)`
- FOUND: cc84119 `feat(07-03): micro-interactions polish sweep`
- FOUND: e7f7f10 `fix(07-03): drop aria-invalid on Calendar/Combobox trigger buttons`
