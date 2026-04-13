---
phase: 07-banani-delta-polish
plan: 02
subsystem: frontend
tags: [banani, delta, polish, withdraw, visibility, datepicker, bank]
requires: [07-01]
provides:
  - /retraits Banani WithdrawFundsForm chrome
  - /retraits/pin Banani WithdrawOTP chrome (persistent PIN)
  - /retraits/succes animate-ping green ring
  - /profil/coordonnees-bancaires UserPaymentMethods two-card layout
  - VisibilityCard Ring 1 primitive
  - DatePicker button-shell wrapper restyle
affects:
  - src/lib/constants.ts
  - src/components/ui/VisibilityCard.tsx (new)
  - src/components/ui/index.ts
  - src/components/ui/DatePicker.tsx
  - src/app/(authed)/retraits/_AmountStep.tsx
  - src/app/(authed)/retraits/pin/_PinStep.tsx
  - src/app/(authed)/retraits/succes/page.tsx
  - src/app/(authed)/profil/coordonnees-bancaires/page.tsx
  - src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-3/page.tsx
  - src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-3/page.tsx
tech-stack:
  added: []
  patterns:
    - Button-shell wrapper + transparent absolute native input (DatePicker — preserves native mobile picker, no new deps)
    - Local OperatorTile radio card inside _AmountStep (Wave/Orange brand squares with Instantané chip)
    - animate-ping halo over bg-[#E6F3EE] success circle (WithdrawSuccess shared pattern)
    - rounded-[2.5rem] Banani signature card shell on /retraits/pin
    - Persistent PIN copy strategy: no SMS OTP backend, no countdown, no resend link — visual-only restyle keeps the shipped Seller.withdrawalPinHash flow intact
key-files:
  created:
    - src/components/ui/VisibilityCard.tsx
    - .planning/phases/07-banani-delta-polish/07-02-SUMMARY.md
  modified:
    - src/lib/constants.ts
    - src/components/ui/index.ts
    - src/components/ui/DatePicker.tsx
    - src/app/(authed)/retraits/_AmountStep.tsx
    - src/app/(authed)/retraits/pin/_PinStep.tsx
    - src/app/(authed)/retraits/succes/page.tsx
    - src/app/(authed)/profil/coordonnees-bancaires/page.tsx
    - src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-3/page.tsx
    - src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-3/page.tsx
decisions:
  - "VisibilityCard lifted as a Ring 1 primitive (NO domain imports — parent passes strings + lucide icon + controlled value), verified by scripts/verify-ring-purity.sh"
  - "Banani WithdrawOTP chrome applied to /retraits/pin but copy explicitly references 'votre code PIN à 4 chiffres' — NO phone-masked SMS fiction, NO countdown, NO resend button. The persistent PIN flow (Seller.withdrawalPinHash from Phase 5) is untouched"
  - "DatePicker kept the native <input type=date> behind an absolutely-positioned opacity-0 overlay rather than introducing a custom popover — the plan explicitly defers the Calendar popover primitive to 07-03"
  - "/profil/coordonnees-bancaires preserves the BankForm client island inline below the Mobile Money tile row (no new add-account modal in v1 per plan) — the card shows the currently-configured Wave/Orange provider as a read-only Banani tile, and the same form handles edit/add"
  - "Bank Accounts card renders as a disabled dashed-border empty state with a TODO PHASE-8 comment — v1 only supports Mobile Money payouts via Bictorys"
  - "OperatorTile on /retraits is local to _AmountStep rather than lifted to a shared primitive — the Phase 3 RadioCard has a different icon contract and there's only one consumer; a proper extraction can happen when /profil/coordonnees-bancaires grows a matching add-flow modal"
metrics:
  tasks: 7
  files-created: 2
  files-modified: 9
  commits: 8
  duration: ~10min
completed: 2026-04-13
---

# Phase 07 Plan 02: P1 Polish Batch Summary

Banani visual parity shipped across the withdraw flow, `/profil/coordonnees-bancaires`, the wizard etape-3 visibility picker and the DatePicker primitive. Zero new dependencies, zero new backend surface, zero changes to the persistent-PIN withdrawal contract. The withdraw pages now wear the Banani chrome (dark-navy hero, numbered pink step markers, rounded-[2.5rem] PIN card, shield hero, animate-ping success ring). `/profil/coordonnees-bancaires` was rewritten from `UserPaymentMethods.jsx` into a two-card layout with the existing Phase 6 BankForm preserved for edit/add. `VisibilityCard` is now a Ring 1 primitive consumed by both wizard etape-3 pages. `DatePicker` gained a Banani button-shell wrapper while keeping the native `<input type="date">` functional underneath.

## Requirements Closed

| ID | Evidence |
|----|----------|
| PLSH-04 | `/retraits`, `/retraits/pin`, `/retraits/succes` visually restyled to Banani `WithdrawFundsForm.jsx`, `WithdrawOTP.jsx`, `WithdrawSuccess.jsx`. The persistent PIN contract is preserved: no countdown, no "Renvoyer" link, no phone-masked SMS copy, no new backend endpoint. Copy sourced verbatim from `WITHDRAW_LABELS`, `WITHDRAW_PIN_LABELS`, `WITHDRAW_SUCCESS_LABELS`. |
| PLSH-05 | `/profil/coordonnees-bancaires` fully rewritten from `UserPaymentMethods.jsx` into the two-card Banani layout (Comptes Mobile Money + Comptes Bancaires empty state) with footer security notice. Wave/Orange brand tiles (W square `#3374FF` / O square `#FF6600`), Actif badge, inline BankForm edit/add form preserved. |

## Files

**Created (2)**
- `src/components/ui/VisibilityCard.tsx` — 78 lines, Ring 1 pure primitive
- `.planning/phases/07-banani-delta-polish/07-02-SUMMARY.md` — this file

**Modified (9)**
- `src/lib/constants.ts` — new `WITHDRAW_LABELS`, `WITHDRAW_PIN_LABELS`, `WITHDRAW_SUCCESS_LABELS`, `BANK_ACCOUNTS_LABELS`, `VISIBILITY_LABELS`, `DATE_PICKER_LABELS`, `WIZARD_EXTRA_LABELS` blocks with verbatim Banani French copy
- `src/components/ui/index.ts` — barrel export `VisibilityCard` + `VisibilityCardProps`
- `src/components/ui/DatePicker.tsx` — button-shell wrapper restyle with `formatDateDisplay('15 avril 2026')` helper and absolutely-positioned transparent native input
- `src/app/(authed)/retraits/_AmountStep.tsx` — dark-navy hero header, numbered pink step markers (1/2), local `OperatorTile` radio card with Wave/Orange brand squares, dashed-border Ajouter-un-compte CTA, uppercase RÉCAPITULATIF summary, lock-icon Transaction sécurisée footer
- `src/app/(authed)/retraits/pin/_PinStep.tsx` — outer `rounded-[2.5rem]` card, shield hero in `bg-blue-50 rounded-full w-20 h-20`, PIN-appropriate helper, 4-cell grid with `focus-within:ring-blue-50` + `animate-pulse` caret on active empty cell, stacked primary "Valider le retrait" + outline "Annuler" CTAs (NO countdown, NO resend)
- `src/app/(authed)/retraits/succes/page.tsx` — `animate-ping` halo over solid lucide `Check` (strokeWidth 3) inside `bg-[#E6F3EE]` circle, `WITHDRAW_SUCCESS_LABELS` copy
- `src/app/(authed)/profil/coordonnees-bancaires/page.tsx` — full rewrite to the two-card Banani layout with security notice footer
- `src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-3/page.tsx` — drops inline VisibilityCard duplicate, consumes lifted primitive + `VISIBILITY_LABELS`
- `src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-3/page.tsx` — same as festive

## Commits

| SHA | Message |
|-----|---------|
| 6020402 | `refactor(07-02): lift VisibilityCard to ui/ + polish constants block` |
| 3937874 | `feat(07-02): restyle /retraits to Banani WithdrawFundsForm` |
| f2db589 | `feat(07-02): restyle /retraits/pin to Banani WithdrawOTP chrome (persistent PIN, no countdown)` |
| ab724b5 | `feat(07-02): animate-ping green ring on /retraits/succes` |
| 1651530 | `feat(07-02): rewrite /profil/coordonnees-bancaires from UserPaymentMethods.jsx` |
| d56658a | `chore(07-02): wizard etape-3 copy + apostrophe sweep` |
| 929e90f | `feat(07-02): restyle DatePicker wrapper to Banani button shell` |
| (this)  | `docs(07-02): SUMMARY for P1 polish batch` |

## Verification Results

| Check | Result |
|-------|--------|
| `npm run lint` (Phase 7 scope: the 9 files touched by this plan) | PASS — 0 errors, 0 warnings |
| `npm run build` | PASS — all 24 routes generated, 0 TS errors |
| `cd backend && npm run build` | PASS — tsc clean |
| `bash scripts/verify-ring-purity.sh` | PASS — Ring 1 pure (VisibilityCard.tsx + DatePicker.tsx), Ring 2 pure |
| `git diff package.json package-lock.json` | EMPTY (zero new dependencies) |
| `grep -rn "framer-motion" src/ package.json` | EMPTY |
| `grep -rn "free_money" src/app/(authed)/profil/coordonnees-bancaires/` | Only in a doc comment that negates it ("D-22 Wave + Orange Money only (NO Free Money)") |
| `grep -rnE "Renvoyer\|otpResend\|setTimeout.*[0-9]{3,}" src/app/(authed)/retraits/pin/` | EMPTY — no countdown, no resend |
| `grep -rnE "(€\|\+33\|PayDunya\|Offerts)" src/` | Only the D-04 documentation negation in `src/lib/commission.ts:72` |
| `grep -n "rounded-\[2.5rem\]" src/app/(authed)/retraits/pin/_PinStep.tsx` | PASS — line 106 |
| `grep -n "animate-ping" src/app/(authed)/retraits/succes/page.tsx` | PASS — line 50 |
| `grep -rn "VisibilityCard" src/components/ui/ src/app/` | PASS — 1 primitive file, 1 barrel export, 3 festive usages, 3 solidaire usages |
| `grep -rE "from \"@/lib/(api\|useApi\|constants)\"\|from \"@/contexts" src/components/ui/VisibilityCard.tsx src/components/ui/DatePicker.tsx` | EMPTY — Ring 1 purity preserved |

## Manual QA Checklist (Wave 4 smoke)

- [ ] Log in, visit `/retraits` → dark-navy hero header, numbered pink step markers (1 Montant, 2 Destination), Wave/Orange operator tiles, uppercase RÉCAPITULATIF DU RETRAIT summary, lock-icon footer
- [ ] Enter an amount + pick an operator → click "Confirmer le retrait" → lands on `/retraits/pin`
- [ ] `/retraits/pin` shows the `rounded-[2.5rem]` card, shield hero in `bg-blue-50`, heading "Vérification de sécurité", helper text referencing "votre code PIN à 4 chiffres" (NO SMS OTP language, NO phone mask, NO countdown, NO "Renvoyer" link). 4-cell PIN grid has the `animate-pulse` caret on the currently-focused empty cell
- [ ] Enter valid PIN → continues to `/retraits/confirmation` (unchanged from Phase 6)
- [ ] Complete the confirmation → `/retraits/succes` shows the `animate-ping` green ring over the solid `Check` icon
- [ ] Visit `/profil/coordonnees-bancaires` → two cards (Mobile Money with the configured Wave/Orange tile + inline BankForm, Bank Accounts dashed empty-state with disabled button + TODO PHASE-8 note) + footer security notice
- [ ] Open festive wizard étape 3 → "Visibilité de la cagnotte" section shows two `VisibilityCard` options with the verbatim Banani copy ("Idéal pour les événements personnels.", "Votre cagnotte sera visible par tous…")
- [ ] Open solidaire wizard étape 3 → same `VisibilityCard` with default "Publique" pre-selected
- [ ] Open any wizard étape 2 page that uses DatePicker → the field renders as a Banani button shell (gray-300 border, rounded-xl, calendar icon right), hovering flips the border to navy. Tapping anywhere opens the native date picker. Selecting a date swaps the placeholder gray-400 text for a primary "15 avril 2026" formatted display

## Deviations from Plan

### 1. [Rule 2 - Additive] Added `WITHDRAW_LABELS.instantBadge` + `WIZARD_EXTRA_LABELS` during implementation

**Found during:** Task 1 and Task 5
**Issue:** The Banani `WithdrawFundsForm.jsx` source renders an "Instantané" green chip next to each operator tile; the plan's constants block didn't include it, and the wizard etape-3 pages still had an inline `Options d&apos;affichage` legend string.
**Fix:** Added `WITHDRAW_LABELS.instantBadge = "Instantané"` and `WIZARD_EXTRA_LABELS.displayOptionsLegend = "Options d'affichage"` to keep the "no hardcoded French in JSX" rule intact.
**Files modified:** `src/lib/constants.ts`, `src/app/(authed)/retraits/_AmountStep.tsx`, `src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-3/page.tsx`, `src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-3/page.tsx`.
**Commits:** 3937874, d56658a

### 2. [Rule 3 - Scope] `/retraits` OperatorTile kept local to `_AmountStep.tsx` instead of lifted to a primitive

**Found during:** Task 1
**Issue:** The plan shows inline JSX for the operator tile and notes "NO new primitives are introduced in this plan." The existing `RadioCard` in `@/components/ui` has a different icon contract (forced pill background around the icon) that doesn't match the Banani brand-square tile look. Lifting a new `OperatorTile` primitive would be scope creep for a single consumer and the plan gates against it.
**Decision:** Defined `OperatorTile` as a local function below the default export of `_AmountStep.tsx`. Single consumer, local scope, labeled with a comment so a future refactor (when `/profil/coordonnees-bancaires` grows an add-flow modal that also needs tile chrome) knows where to find the extraction candidate.
**Files modified:** `src/app/(authed)/retraits/_AmountStep.tsx`
**Commit:** 3937874

### 3. [Rule 3 - Scope] `/profil/coordonnees-bancaires` kept `BankForm` inline instead of building a read-only view + modal edit flow

**Found during:** Task 4
**Issue:** The plan's Banani reference shows a row with an "Ajouter" button, a `Trash2` delete icon, and a dashed add-account flow — all of which imply a modal-based add/edit pattern. The plan explicitly says "Do NOT add a real add-account modal in this plan." The existing Phase 6 `BankForm` island is the only way to actually mutate the payout record.
**Decision:** The Mobile Money card renders the configured account as a read-only Banani-style tile row (W/O brand square + formatted phone + Actif badge) and keeps `BankForm` inline below it under a `border-t` separator. When no account is configured, the tile row is replaced by a centered empty-state card and the form becomes the primary add affordance. This gives pixel-close visual parity without introducing a modal that the plan defers.
**Files modified:** `src/app/(authed)/profil/coordonnees-bancaires/page.tsx`
**Commit:** 1651530

### 4. [Rule 3 - Scope] `localStorage` grep for `src/app/(authed)/` returns pre-existing CSRF hits

**Found during:** Task 7 verification battery
**Issue:** The plan's guardrail `grep -rn "localStorage" src/app/(authed)/` is supposed to be empty. Actual count: 5 hits in `_ProfileForm.tsx`, `_KycForm.tsx`, `_EditForm.tsx`, `_uploadCover.ts`, and a comment in `layout.tsx`. Every hit is a legitimate CSRF cookie mirror read that ships with Phase 6 `api()` client, not Phase 7 scope.
**Decision:** Out of scope per the plan's SCOPE BOUNDARY rule — these are pre-existing CSRF reads, not introduced by 07-02. Logging here so a future Phase 8 pass can consider centralizing them.

## Known Stubs

| Stub | Location | Reason |
|------|----------|--------|
| `/profil/coordonnees-bancaires` Bank Accounts card button is disabled (aria-disabled, cursor-not-allowed) | `src/app/(authed)/profil/coordonnees-bancaires/page.tsx` (section 2) | v1 only supports Mobile Money payouts via Bictorys. TODO PHASE-8 comment points to the future RIB/IBAN capture + payout routing work. |
| `/profil/coordonnees-bancaires` Mobile Money card lacks a Trash delete button on the active tile row | Same file | Matches D-18 single-payout-per-seller: there is nothing to "delete" because the record is always overwritten by the inline BankForm. The Banani wireframe shows multiple rows for a multi-account world that v1 does not have. |
| DatePicker wrapper is a button-shell overlay on the native `<input type="date">` rather than a real popover calendar | `src/components/ui/DatePicker.tsx` | Plan 07-03 will replace this with a `<Calendar>` popover primitive in wizard etape-2. 07-02 scope is visual polish only. |

## Risks / Follow-ups for 07-03

1. **`<Calendar>` popover primitive** — 07-03 must build the full popover calendar with navy selected state, gray-100 hover, French month headers, click-outside, Escape close and keyboard arrow navigation per `solidaire-step-2-date-field.md` notes. The wizard etape-2 pages should swap their `DatePicker` consumption for the new primitive then.
2. **Shared SuccessHero extraction** — `/retraits/succes` and `/c/[slug]/participer/succes` (ParticipationSuccess) now both render the `animate-ping` halo pattern. A `SuccessHero` primitive could land in 07-03 or 07-04 to de-dup.
3. **OperatorTile extraction** — if `/profil/coordonnees-bancaires` grows a real add-account modal (Phase 8), lift `OperatorTile` from `_AmountStep.tsx` into `@/components/ui` so the modal and the withdraw step share the Wave/Orange tile chrome.
4. **BankForm visual polish** — the inline `BankForm` underneath the Mobile Money tile still uses the Phase 6 `RadioCard` picker. If the card-first layout gets feedback that the inline form feels redundant, 07-03 could hide the form until the user clicks the card "Ajouter" button (client toggle, no new backend).
5. **`withdrawalPinHash` forgot-PIN flow** — `/retraits/pin` has a `WITHDRAW_PIN_LABELS.pinForgot = "PIN oublié ?"` constant ready but the JSX does not yet render a link because the plan asked for "no resend." A future plan can add a link to `/profil/securite#pin` so users can reset their persistent PIN from the withdraw flow.

## Self-Check: PASSED

**Files verified:**
- FOUND: `src/components/ui/VisibilityCard.tsx` (new Ring 1 primitive, 78 lines)
- FOUND: `src/components/ui/index.ts` (VisibilityCard barrel export added)
- FOUND: `src/components/ui/DatePicker.tsx` (Banani button-shell wrapper, `rounded-xl px-4 py-3.5`, Calendar icon, `formatDateDisplay` helper)
- FOUND: `src/lib/constants.ts` (WITHDRAW_LABELS / WITHDRAW_PIN_LABELS / WITHDRAW_SUCCESS_LABELS / BANK_ACCOUNTS_LABELS / VISIBILITY_LABELS / DATE_PICKER_LABELS / WIZARD_EXTRA_LABELS)
- FOUND: `src/app/(authed)/retraits/_AmountStep.tsx` (dark-navy hero, numbered steps, OperatorTile)
- FOUND: `src/app/(authed)/retraits/pin/_PinStep.tsx` (rounded-[2.5rem], ShieldCheck hero, animate-pulse caret, no countdown)
- FOUND: `src/app/(authed)/retraits/succes/page.tsx` (animate-ping green halo, solid Check icon)
- FOUND: `src/app/(authed)/profil/coordonnees-bancaires/page.tsx` (two-card Banani layout)
- FOUND: `src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-3/page.tsx` (consumes lifted VisibilityCard)
- FOUND: `src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-3/page.tsx` (consumes lifted VisibilityCard)

**Commits verified:**
- FOUND: 6020402 `refactor(07-02): lift VisibilityCard to ui/ + polish constants block`
- FOUND: 3937874 `feat(07-02): restyle /retraits to Banani WithdrawFundsForm`
- FOUND: f2db589 `feat(07-02): restyle /retraits/pin to Banani WithdrawOTP chrome (persistent PIN, no countdown)`
- FOUND: ab724b5 `feat(07-02): animate-ping green ring on /retraits/succes`
- FOUND: 1651530 `feat(07-02): rewrite /profil/coordonnees-bancaires from UserPaymentMethods.jsx`
- FOUND: d56658a `chore(07-02): wizard etape-3 copy + apostrophe sweep`
- FOUND: 929e90f `feat(07-02): restyle DatePicker wrapper to Banani button shell`
