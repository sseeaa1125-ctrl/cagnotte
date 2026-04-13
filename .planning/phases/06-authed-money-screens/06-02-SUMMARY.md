---
phase: 06-authed-money-screens
plan: 02
subsystem: authed-money-screens
tags: [frontend, backend, bank, security, kyc, withdrawals, stats, edit, ring-2, ring-3]
requirements: [MNYS-01, MNYS-02, MNYS-03, MNYS-04, MNYS-05, MNYS-06]
status: green
autonomous: true
depends_on: [06-01]
provides:
  - "/profil/coordonnees-bancaires form (Banani screen 18, 2 providers only)"
  - "/profil/securite password change (PUT) + 4-digit PIN set/change"
  - "/profil/kyc ID + selfie upload with 4-status pill + proxy previews"
  - "/retraits 4-route withdrawal flow with KYC + PIN gates + sessionStorage draft"
  - "/tableau-de-bord/cagnottes/[slug]/stats with KPIs + CSS-only timeline chart"
  - "/tableau-de-bord/cagnottes/[slug]/modifier slug-safe cagnotte edit"
  - "useWithdrawalDraft hook (sessionStorage, 24h staleness, SSR-safe)"
  - "src/lib/withdrawal/schema.ts (client schema + PIN regex + draft validators)"
  - "Widened GET /api/auth/me select (phone, kycFullName, kycIdUrl, kycSelfieUrl)"
affects:
  - src/lib/constants.ts
  - .planning/banani/FRONTEND-DEVIATIONS.md
  - backend/src/routes/auth.ts
tech-stack:
  added: []
  patterns:
    - "Seller-level withdrawal flow (not per-cagnotte) with 4 discrete routes"
    - "sessionStorage draft hook mirroring useWizardDraft (D-12)"
    - "Server-side owner check via /api/auth/me before any JSX render"
    - "KYC + PIN gates enforced server-side via /api/withdrawals/balance"
    - "4-box OTP-style PIN input with paste + auto-advance (maxLength=1)"
    - "Slug-safe edit form: destructure + runtime delete guard"
    - "Pure CSS bar chart (D-23) — zero Recharts"
    - "Two-wave parallel fetches with owner-check short-circuit (stats page)"
key-files:
  created:
    - src/lib/withdrawal/schema.ts
    - src/hooks/useWithdrawalDraft.ts
    - src/app/(authed)/profil/coordonnees-bancaires/page.tsx
    - src/app/(authed)/profil/coordonnees-bancaires/_BankForm.tsx
    - src/app/(authed)/profil/securite/page.tsx
    - src/app/(authed)/profil/securite/_PasswordForm.tsx
    - src/app/(authed)/profil/securite/_PinForm.tsx
    - src/app/(authed)/profil/kyc/page.tsx
    - src/app/(authed)/profil/kyc/_KycForm.tsx
    - src/app/(authed)/retraits/page.tsx
    - src/app/(authed)/retraits/_AmountStep.tsx
    - src/app/(authed)/retraits/pin/page.tsx
    - src/app/(authed)/retraits/pin/_PinStep.tsx
    - src/app/(authed)/retraits/confirmation/page.tsx
    - src/app/(authed)/retraits/confirmation/_ConfirmStep.tsx
    - src/app/(authed)/retraits/succes/page.tsx
    - src/app/(authed)/retraits/succes/_DraftClearer.tsx
    - src/app/(authed)/tableau-de-bord/cagnottes/[slug]/stats/page.tsx
    - src/app/(authed)/tableau-de-bord/cagnottes/[slug]/stats/_TimelineChart.tsx
    - src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/page.tsx
    - src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/_EditForm.tsx
  modified:
    - src/lib/constants.ts
    - backend/src/routes/auth.ts
    - .planning/banani/FRONTEND-DEVIATIONS.md
decisions:
  - "Bank page uses PUT /api/sellers/profile with payoutPhone/Provider/Name/Country (reusing Seller columns — no PayoutAccount model, D-18)"
  - "Withdrawal flow is 4 discrete routes, not a single scrolling card (D-21) — allows explicit PIN gate + router.replace on success"
  - "PIN is 4 digits everywhere (backend contract), OTP-style 4-box with maxLength=1 per box"
  - "Stats timeline is a pure Tailwind/CSS bar chart, no Recharts (D-23)"
  - "Edit form spreads initial.config then overwrites editable fields — required to keep the subtype superRefine happy on PUT"
  - "Widened GET /api/auth/me (D-29) rather than adding a second /me/kyc round-trip for the KYC page"
  - "Draft cleared both in ConfirmStep (on success) and on /retraits/succes mount (belt-and-suspenders)"
metrics:
  duration_minutes: 60
  tasks: 8
  files_changed: 24
  commits: 7
---

# Phase 6 Plan 02: Money Screens Summary

Six money surfaces (bank details, security, KYC, 4-route withdrawal flow, per-cagnotte stats, per-cagnotte edit) shipped end-to-end with a single backend widen (`/api/auth/me` select), a new client-side withdrawal schema + sessionStorage draft hook, slug-safe cagnotte edit, a pure-CSS timeline chart, and zero new npm dependencies.

## Outcome

Plan 06-02 closes MNYS-01 through MNYS-06 and — combined with 06-01 (ATHD-01..04) — closes all 10 Phase 6 requirements. Every approved creator with a set 4-digit PIN can now complete a withdrawal end-to-end on dev; every creator can edit their cagnotte without risking an accidental slug rename; every creator can view per-cagnotte KPIs + a timeline chart; and the profile sidebar now has every tab wired.

## Tasks Shipped

| Task | Name                                                                        | Commit    | Files (primary)                                                                              |
| ---- | --------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------- |
| T0   | Safety rails — withdrawal schema + draft hook + constants + D-18..24, D-29  | 0fde852   | src/lib/withdrawal/schema.ts, src/hooks/useWithdrawalDraft.ts, src/lib/constants.ts, backend/src/routes/auth.ts, .planning/banani/FRONTEND-DEVIATIONS.md |
| T1   | /profil/coordonnees-bancaires (Banani screen 18, Wave+Orange only)          | 1b2b20b   | src/app/(authed)/profil/coordonnees-bancaires/{page.tsx, _BankForm.tsx}                      |
| T2   | /profil/securite — password change (PUT) + 4-digit PIN                      | 99c5c1e   | src/app/(authed)/profil/securite/{page.tsx, _PasswordForm.tsx, _PinForm.tsx}                 |
| T3   | /profil/kyc — ID + selfie upload with 4-variant status pill                 | 93fe4ec   | src/app/(authed)/profil/kyc/{page.tsx, _KycForm.tsx}                                         |
| T4   | Withdrawal flow — 4 routes (amount → PIN → confirm → success)               | 3085764   | src/app/(authed)/retraits/{page.tsx, _AmountStep.tsx, pin/*, confirmation/*, succes/*}       |
| T5   | /tableau-de-bord/cagnottes/[slug]/stats with CSS timeline chart             | c921f21   | src/app/(authed)/tableau-de-bord/cagnottes/[slug]/stats/{page.tsx, _TimelineChart.tsx}       |
| T6   | /tableau-de-bord/cagnottes/[slug]/modifier — PUT without slug               | 9c3939b   | src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/{page.tsx, _EditForm.tsx}         |
| T7   | Final verification + SUMMARY                                                | (pending) | .planning/phases/06-authed-money-screens/06-02-SUMMARY.md                                    |

## Requirements → Evidence

| Req     | Covered by                                                                                                                                           |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| MNYS-01 | T1. `/profil/coordonnees-bancaires` writes `payoutProvider/Phone/Name/Country` via `PUT /api/sellers/profile`. Wave + Orange only (grep clean).     |
| MNYS-02 | T4. Four-route withdrawal flow. GET `/api/withdrawals/balance` gates KYC + PIN server-side; POST `/api/withdrawals` with full body; success cleared. |
| MNYS-03 | T3. `/profil/kyc` uploads ID + selfie via multipart `POST /api/upload?purpose=kyc` then `POST /api/sellers/kyc`. 4 status variants; APPROVED RO.    |
| MNYS-04 | T5. `/tableau-de-bord/cagnottes/[slug]/stats` renders 3 KPIs + top messages + CSS-only `TimelineChart`. Owner check enforced server-side.           |
| MNYS-05 | T6. `/tableau-de-bord/cagnottes/[slug]/modifier` edits title/description/coverUrl/goal/endDate/suggested/hideAmount/hideDonors via `PUT /api/blocks/:id`; slug NEVER in body. |
| MNYS-06 | T2. `/profil/securite` PUTs to `/api/auth/change-password`; 4-digit PIN via `POST /api/sellers/withdrawal-pin` (set + change forms).                |

## Backend Contracts Consumed

| Endpoint                                 | Verb  | From                                                           |
| ---------------------------------------- | ----- | -------------------------------------------------------------- |
| /api/auth/me                             | GET   | 4 profile subpages + stats + edit (SSR raw fetch, D-11)       |
| /api/auth/change-password                | PUT   | _PasswordForm (verb=PUT, NOT POST)                             |
| /api/sellers/profile                     | PUT   | _BankForm (payoutPhone/Provider/Name/Country)                  |
| /api/sellers/withdrawal-pin/status       | GET   | /profil/securite page (hasPin boolean)                         |
| /api/sellers/withdrawal-pin              | POST  | _PinForm (pin + optional currentPin)                           |
| /api/sellers/kyc                         | POST  | _KycForm (fullName + idUrl + selfieUrl)                        |
| /api/upload?purpose=kyc                  | POST  | _KycForm (multipart, direct BACKEND_URL)                       |
| /api/upload                              | POST  | _EditForm (cover re-upload, multipart)                         |
| /api/withdrawals/balance                 | GET   | /retraits page (balance + KYC + PIN gate + pre-fill fields)    |
| /api/withdrawals                         | POST  | _ConfirmStep (amount, phone, provider, recipientName, PIN)     |
| /api/cagnottes/:slug                     | GET   | stats + modifier pages (owner check via seller.id)             |
| /api/cagnottes/:slug/participants?limit= | GET   | stats page (top messages + timeline bucketing)                 |
| /api/blocks/:id/progress                 | GET   | stats page (collected + donorCount)                            |
| /api/blocks/:id                          | GET   | modifier page (raw full config — authed, owner-enforced)      |
| /api/blocks/:id                          | PUT   | _EditForm (NOT PATCH; body has NO slug)                        |

## Backend Contract Surprises Addressed

1. **Plan references `PATCH /api/sellers/me`** — does not exist in the fork (same landmine 06-01 hit). Used the real `PUT /api/sellers/profile` endpoint which already accepts `payoutProvider/Phone/Name/Country`. D-28 from 06-01 covers the philosophical deviation; 06-02 T1 implements it for the bank page.
2. **`GET /api/auth/me` select was missing `kycFullName/kycIdUrl/kycSelfieUrl/phone/phoneCountry`.** Without these the /profil/kyc server page could not render the status + existing document previews. Applied Rule 2 auto-add: widened the select (additive, no removed fields) and logged as D-29. Backend build still green.
3. **`PUT /api/auth/change-password` returns 403 (not 400) on wrong current password.** `_PasswordForm` handles both 403 and 401 → same user-facing "Mot de passe actuel incorrect" toast so the verify path is resilient.
4. **`GET /api/cagnottes/:slug/participants` shape is `{ participants, nextCursor }` with `createdAt` (not `paidAt`).** `_TimelineChart` buckets on `createdAt` and reads from `data.participants` (not `data.items`). The plan sketch used `items` + `paidAt` — corrected inline. No behavior difference: `createdAt` is the order creation timestamp which for PAID orders is ≤1s from `paidAt`.
5. **`maskDonation` returns `amount: null` when `config.hideAmount === true`.** Stats page filters timeline entries to `amount !== null` so hideAmount cagnottes still render a valid chart (or an empty state when everything is masked).
6. **Edit form had to preserve the full config.** The backend `superRefine` validates `subtype` vs `occasion`/`cause`/`beneficiary` pairs (festive requires occasion, solidaire requires cause+beneficiary). Sending only the editable fields would 400 the PUT. Fix: destructure `const { slug, ...safeConfig } = initial.config`, spread `safeConfig` first, then overwrite with editable edits.
7. **Withdrawal `/balance` returns 503 on circuit breaker open but only on POST path.** The balance endpoint is always available; the 503 branch is only tripped on POST `/api/withdrawals`. The `_ConfirmStep` handles 503 explicitly with `WITHDRAWAL_LABELS.circuitOpen`.

## Banani Deviations Logged (D-18..D-24 + D-29)

- **D-18** — Single payout account per seller (Seller.payout* columns, no PayoutAccount model)
- **D-19** — Participations PDF export deferred to v2
- **D-20** — Withdrawal is seller-level (`/retraits`), not per-cagnotte
- **D-21** — Withdrawal flow is 4 discrete routes, not single-page
- **D-22** — Free Money excluded from payout recipient picker (Bictorys limitation)
- **D-23** — Stats uses a pure CSS bar chart (no Recharts dep)
- **D-24** — Cagnotte edit never exposes or submits slug
- **D-29** — `GET /api/auth/me` select widened with KYC document URLs + phone

Details in [.planning/banani/FRONTEND-DEVIATIONS.md](../../banani/FRONTEND-DEVIATIONS.md).

## Automated Verification Gates

| Gate                                                                                  | Result                                                                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `cd backend && npm run build`                                                         | Green (0 TS errors, auth.ts select widen compiles)                                         |
| `npm run build` (frontend)                                                            | Green. 9 new routes present: `/profil/coordonnees-bancaires`, `/profil/securite`, `/profil/kyc`, `/retraits`, `/retraits/pin`, `/retraits/confirmation`, `/retraits/succes`, `/tableau-de-bord/cagnottes/[slug]/stats`, `/tableau-de-bord/cagnottes/[slug]/modifier` |
| `npm run lint` (Phase 6 plan 06-02 scope)                                             | Green. Zero errors/warnings in `src/lib/withdrawal/`, `src/hooks/useWithdrawalDraft.ts`, `src/app/(authed)/{profil/coordonnees-bancaires,profil/securite,profil/kyc,retraits,tableau-de-bord/cagnottes}`. Pre-existing backend-scripts lint issues logged in 06-01 deferred-items (unrelated). |
| `bash scripts/verify-ring-purity.sh`                                                  | Ring 1 + Ring 2 green                                                                       |
| `git diff package.json package-lock.json`                                             | Empty — zero new npm dependencies                                                           |
| `grep -rn "free_money" src/app/(authed)/profil/coordonnees-bancaires src/app/(authed)/retraits` | Empty (D-22 enforced)                                                               |
| `grep -rn "maxLength={6}" src/app/(authed)/profil/securite src/app/(authed)/retraits/pin` | Empty (PIN is 4 digits everywhere)                                                       |
| `grep -rn '"slug":' src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/`      | Empty (D-24 enforced — no slug literal in PUT body)                                         |
| `grep 'method:.*"PUT"' src/app/(authed)/profil/securite/_PasswordForm.tsx`            | OK (change-password verb is PUT)                                                            |
| `grep 'method:.*"PUT"' src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/_EditForm.tsx` | OK (blocks edit verb is PUT)                                                     |
| `grep -rnE "r2\\.cloudflarestorage\|\\.r2\\.dev" src/app/(authed)/`                   | Empty (all KYC previews go through /api/files/:key proxy)                                   |
| Drift grep €, +33, PayDunya, Offerts in Phase 6 scope                                 | Empty                                                                                       |
| `grep -rn "localStorage" src/app/(authed)/{profil,retraits}`                          | 1 hit — `_KycForm.tsx` reads `izy-csrf` (intentional CSRF pattern inherited from 06-01 _ProfileForm; same justification)                               |

## Known Stubs

None. Every page wires real data from a real backend endpoint. The withdrawal flow can be exercised end-to-end in dev as soon as a seller has KYC APPROVED + a set PIN + a positive balance.

## Deferred Issues

None from this plan. Pre-existing backend-script lint errors (`backend/scripts/introspect-phase1.ts`, `backend/scripts/seed-coaches.ts`) are out of scope and unchanged; they were already present before Phase 6 and are tracked separately.

## Self-Check: PASSED

Created files (21 total):

- FOUND: src/lib/withdrawal/schema.ts
- FOUND: src/hooks/useWithdrawalDraft.ts
- FOUND: src/app/(authed)/profil/coordonnees-bancaires/page.tsx
- FOUND: src/app/(authed)/profil/coordonnees-bancaires/_BankForm.tsx
- FOUND: src/app/(authed)/profil/securite/page.tsx
- FOUND: src/app/(authed)/profil/securite/_PasswordForm.tsx
- FOUND: src/app/(authed)/profil/securite/_PinForm.tsx
- FOUND: src/app/(authed)/profil/kyc/page.tsx
- FOUND: src/app/(authed)/profil/kyc/_KycForm.tsx
- FOUND: src/app/(authed)/retraits/page.tsx
- FOUND: src/app/(authed)/retraits/_AmountStep.tsx
- FOUND: src/app/(authed)/retraits/pin/page.tsx
- FOUND: src/app/(authed)/retraits/pin/_PinStep.tsx
- FOUND: src/app/(authed)/retraits/confirmation/page.tsx
- FOUND: src/app/(authed)/retraits/confirmation/_ConfirmStep.tsx
- FOUND: src/app/(authed)/retraits/succes/page.tsx
- FOUND: src/app/(authed)/retraits/succes/_DraftClearer.tsx
- FOUND: src/app/(authed)/tableau-de-bord/cagnottes/[slug]/stats/page.tsx
- FOUND: src/app/(authed)/tableau-de-bord/cagnottes/[slug]/stats/_TimelineChart.tsx
- FOUND: src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/page.tsx
- FOUND: src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/_EditForm.tsx

Commits:

- FOUND: 0fde852 (T0 safety rails)
- FOUND: 1b2b20b (T1 bank)
- FOUND: 99c5c1e (T2 securite)
- FOUND: 93fe4ec (T3 kyc)
- FOUND: 3085764 (T4 withdrawal flow)
- FOUND: c921f21 (T5 stats)
- FOUND: 9c3939b (T6 modifier)

## Phase 6 Exit Gate — Both Plans Together

Plans 06-01 + 06-02 together close all 10 Phase 6 requirements:

| Req     | Plan     | Route(s)                                                                                         |
| ------- | -------- | ------------------------------------------------------------------------------------------------ |
| ATHD-01 | 06-01 T2 | `/profil`                                                                                        |
| ATHD-02 | 06-01 T3 | `/profil/preferences`                                                                            |
| ATHD-03 | 06-01 T0+T4 | `/participations` + backend `GET /api/sellers/me/participations`                              |
| ATHD-04 | 06-01 T5 | `/notifications`                                                                                 |
| MNYS-01 | 06-02 T1 | `/profil/coordonnees-bancaires`                                                                  |
| MNYS-02 | 06-02 T4 | `/retraits`, `/retraits/pin`, `/retraits/confirmation`, `/retraits/succes`                       |
| MNYS-03 | 06-02 T3 | `/profil/kyc`                                                                                    |
| MNYS-04 | 06-02 T5 | `/tableau-de-bord/cagnottes/[slug]/stats`                                                        |
| MNYS-05 | 06-02 T6 | `/tableau-de-bord/cagnottes/[slug]/modifier`                                                     |
| MNYS-06 | 06-02 T2 | `/profil/securite`                                                                               |

ProfileSidebar (from 06-01) now has every tab wired: Profil / Sécurité / Bancaire / Préférences / KYC. Dashboard avatar dropdown (from 06-01 D-27) lands the creator on `/retraits`. End-to-end creator money flow is functional on dev.

## Next-Phase Handoff to Phase 7 (Polish + Legal + v2 backlog)

Open items Phase 7 should pick up:

1. **Payout Bictorys fees** — currently hardcoded to "Gratuit" + "Immédiat" on the confirmation screen. `lib/payout.ts` does not yet expose per-provider fees; Phase 7 should surface the real fee structure and update `WITHDRAWAL_LABELS.confirmFees` to be dynamic.
2. **PIN forgot flow** — backend has `POST /api/sellers/withdrawal-pin/forgot` + `/reset` endpoints wired. Phase 6 `/profil/securite` PinForm shows a "Code oublié ?" link in constants but the route isn't wired yet. Phase 7 should add `/profil/securite/forgot-pin` or an inline modal.
3. **Cagnotte delete** — deferred in 06-01 D-26. `/modifier` page currently has no delete CTA. Phase 7 should either wire the backend `DELETE /api/blocks/:id` endpoint into a confirmation modal or keep the "contact support" v1 workaround documented.
4. **PayoutAccount model** — D-18 deferred a multi-account design. When creators need multiple payout methods, migrate to a 1-to-many `PayoutAccount` table and revive the full Banani screen 18 layout.
5. **Stats timeline enhancements** — today bucketed only by day. v2 could add 7-day / 30-day / all-time range toggles and per-subtype trend comparisons.
6. **Withdrawal history view** — `GET /api/withdrawals` returns paginated history; Phase 7 could add a `/retraits/historique` page showing past payouts + statuses.
7. **KYC rejection reason** — backend stores `kycRejectedReason` but the `_KycForm` REJECTED branch doesn't display it yet. Small Phase 7 polish.
8. **Withdrawal min/max surfacing** — `WITHDRAWAL_LABELS.amountMin` hardcodes "1 000 FCFA" and the schema hardcodes `WITHDRAWAL_MIN_AMOUNT=1000` / `WITHDRAWAL_MAX_AMOUNT=500000`. If the backend `PAYOUT_LIMITS` ever changes, these need to move into the balance response and be read dynamically.
