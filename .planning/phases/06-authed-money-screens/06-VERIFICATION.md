---
phase: 06-authed-money-screens
verified: 2026-04-13T20:30:00Z
status: human_needed
score: 4/5 must-haves verified (SC-5 is soft human gate)
overrides_applied: 0
human_verification:
  - test: "Phase 4 audit-010 real-device cells 1-6 (in-app browser payment flow)"
    expected: "TikTok / Instagram / Facebook WebView → pay-redirect → Wave / Orange Money complete end-to-end on a real device"
    why_human: "Soft gate inherited from Phase 4. Cannot be simulated on dev server; requires physical iPhone + Android with each app installed."
  - test: "Phase 5 visual walkthrough against Banani screens 1-15"
    expected: "Every public + auth + wizard + create-success screen matches the Banani flow visually (navy/pink palette, Poppins/Inter, spacing, CTA styles)"
    why_human: "Visual/UX fidelity cannot be grepped — must be eye-checked against the Banani design file."
  - test: "Phase 6 visual walkthrough against Banani screens 16-24"
    expected: "/profil, /profil/preferences, /participations, /notifications, /profil/coordonnees-bancaires, /profil/securite, /profil/kyc, /retraits (4 routes), /tableau-de-bord/cagnottes/[slug]/stats, /tableau-de-bord/cagnottes/[slug]/modifier all visually match"
    why_human: "Visual/UX fidelity cannot be grepped — must be eye-checked against the Banani design file."
  - test: "End-to-end withdrawal flow on dev with real seller"
    expected: "Seller with kycStatus=APPROVED + set PIN + positive balance can complete /retraits → /retraits/pin → /retraits/confirmation → /retraits/succes and a Withdrawal row is created; wrong PIN returns a clean error toast"
    why_human: "Requires running both servers + seed-dev.ts + manual approve-kyc.ts + interactive click-through."
  - test: "Cagnotte stats + edit on dev with real paid donations"
    expected: "Owner can see KPIs + top messages + timeline chart; non-owner hits notFound; edit preserves full config and PUTs without slug"
    why_human: "Requires seeded paid donations to observe the CSS bar chart and top messages block."
---

# Phase 6: Authed + Money Screens Verification Report

**Phase Goal:** A logged-in creator can manage their profile, notification preferences, participations, notifications feed, bank details, KYC, withdrawals, cagnotte stats, cagnotte edits and security — everything needed to operate a cagnotte end-to-end.

**Verified:** 2026-04-13T20:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification
**This is the final phase of the v1 milestone.**

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| SC-1 | Profile (17), prefs (19), participations (16), notifications (20) render with sidebar nav, consume Phase 2 endpoints, mark-read wires to `POST /api/notifications/mark-read` | VERIFIED | `src/app/(authed)/profil/page.tsx`, `.../preferences/page.tsx`, `.../participations/page.tsx`, `.../notifications/page.tsx` all exist + use `ProfileSidebar`. `_NotificationsClient.tsx` POSTs `/api/notifications/mark-read` with `{ids:[id]}` (per-row) and `{all:true}` (bulk). `_PreferencesForm.tsx` auto-saves via `PATCH /api/notifications/prefs`. Backend `GET /api/sellers/me/participations` at `backend/src/routes/sellers.ts:323`. |
| SC-2 | Bank details, KYC upload (R2 proxy + status pill), withdrawal flow (amount + recipient + PIN + confirmation) work end-to-end; APPROVED seller can POST `/api/withdrawals` with correct PIN check | VERIFIED (live flow = human soft gate) | `src/app/(authed)/profil/coordonnees-bancaires/page.tsx` (2 providers, PUT `/api/sellers/profile`), `.../profil/kyc/page.tsx` + `_KycForm.tsx` (multipart upload → `POST /api/sellers/kyc`, 4-state pill, previews via `/api/files/:key`), 4-route `retraits/` flow (`page.tsx`, `pin/page.tsx`, `confirmation/page.tsx`, `succes/page.tsx`). `useWithdrawalDraft` sessionStorage + `lib/withdrawal/schema.ts` PIN regex `^\d{4}$`. Human walkthrough pending (server run + seeded APPROVED seller). |
| SC-3 | Stats page renders per-cagnotte breakdown (donors/average/top message/timeline); edit page PATCHes title/desc/cover/goal/endDate/suggested BUT NOT slug | VERIFIED | `.../stats/page.tsx` (6.8KB) + `_TimelineChart.tsx` (CSS bar chart, D-23); server-side owner check via `notFound()` at lines 103/107. `.../modifier/page.tsx` + `_EditForm.tsx`: `grep '"slug":' modifier/` = EMPTY; verb is PUT (line 180); destructure `const { slug, ...safeConfig } = initial.config` pattern preserves subtype superRefine. Note: verb is PUT not PATCH — ROADMAP language says "PATCHes" but real backend is `PUT /api/blocks/:id`; semantic intent preserved. |
| SC-4 | Security/password change calls `POST /api/auth/change-password` and rotates JWT; wrong password → clean error toast | VERIFIED (with deviation) | `.../profil/securite/_PasswordForm.tsx:45` uses `method: "PUT"` (not POST). This is the correct contract — CLAUDE.md explicitly flags: "`change-password` is PUT not POST." The ROADMAP criterion text is stale; the code matches reality. Both 403 and 401 are mapped to "Mot de passe actuel incorrect" toast per summary §3. |
| SC-5 | Full 24-screen visual review against Banani; `FRONTEND-DEVIATIONS.md` lists every intentional deviation with rationale | DEVIATIONS LOGGED / visual review pending (HUMAN SOFT GATE) | `.planning/banani/FRONTEND-DEVIATIONS.md` carries D-01..D-29 (29 deviations including currency, prefix, Bictorys, 6%/8%, no slug rename, 2 providers, 4-digit PIN, CSS chart, etc). Visual walkthrough is a human-only activity. |

**Score:** 4/5 criteria fully code-verified. SC-5 is a soft human gate by design.

### Required Artifacts

All 21 files from 06-02 + 10 files from 06-01 verified to exist with substantive content (min 350 bytes for the simple retraits/pin and confirmation index pages that delegate to client-side steps, up to 7KB for stats page with CSS chart logic).

| Category | Count | Status |
| -------- | ----- | ------ |
| 06-01 Ring 2 block + renderer + 4 page pairs + backend route | 10 files + 2 backend edits | VERIFIED |
| 06-02 schema + hook + 6 profile subpages + 4 retraits routes + stats + modifier | 21 files + 1 backend edit | VERIFIED |
| Commits d836676..84bd7a8 (15 commits across both plans) | 15 | ALL PRESENT in `git log` |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `/profil` | PUT `/api/sellers/profile` | `_ProfileForm.tsx` fetch | WIRED |
| `/profil/preferences` | PATCH `/api/notifications/prefs` | auto-save on toggle flip | WIRED |
| `/participations` | GET `/api/sellers/me/participations` | SSR raw fetch + CSR load-more | WIRED (backend route confirmed) |
| `/notifications` | POST `/api/notifications/mark-read` | per-row + all:true | WIRED |
| `/profil/coordonnees-bancaires` | PUT `/api/sellers/profile` (payout* fields) | `_BankForm.tsx` | WIRED (Wave + Orange only — D-22) |
| `/profil/securite` password | PUT `/api/auth/change-password` | `_PasswordForm.tsx:45` | WIRED (verb=PUT matches CLAUDE.md) |
| `/profil/securite` PIN | POST `/api/sellers/withdrawal-pin` + GET `/status` | `_PinForm.tsx` | WIRED (4-digit) |
| `/profil/kyc` | POST `/api/upload?purpose=kyc` → POST `/api/sellers/kyc` | multipart + JSON | WIRED (previews via `/api/files/:key` proxy) |
| `/retraits` | GET `/api/withdrawals/balance` | SSR gates KYC + PIN | WIRED |
| `/retraits/confirmation` | POST `/api/withdrawals` | `_ConfirmStep.tsx` | WIRED (503 circuit breaker handled) |
| `/tableau-de-bord/cagnottes/[slug]/stats` | GET `/api/cagnottes/:slug` + `/api/cagnottes/:slug/participants` + `/api/blocks/:id/progress` | SSR two-wave fetch | WIRED + owner check via `notFound()` |
| `/tableau-de-bord/cagnottes/[slug]/modifier` | GET `/api/blocks/:id` → PUT `/api/blocks/:id` | `_EditForm.tsx:180` | WIRED, verb=PUT, NO slug in body |

### Data-Flow Trace (Level 4)

Every authed route SSR-fetches real data via cookie-forwarding raw fetch (D-11 pattern). No hardcoded empty props anywhere:

- `/participations` reads real orders from donor-side view
- `/notifications` reads real Notification rows + mark-read POSTs mutate DB
- `/retraits` reads live balance + KYC + PIN state from `/api/withdrawals/balance`
- `stats` timeline buckets actual `participants[].createdAt` after `maskDonation` filter
- `modifier` seeds form from real `GET /api/blocks/:id` and spreads full config

### Automated Gate Results

| Gate | Result |
| ---- | ------ |
| `cd backend && npm run build` | GREEN (0 TS errors) |
| `npm run build` (frontend) | GREEN. All 13 new Phase 6 routes present in build output. |
| `npm run lint` (Phase 6 scope) | GREEN. 0 errors / 0 warnings in `src/app/(authed)/{profil,participations,notifications,retraits,tableau-de-bord/cagnottes}`, `src/components/layout/ProfileSidebar.tsx`, `src/lib/notifications/renderContent.tsx`, `src/hooks/useWithdrawalDraft.ts`, `src/lib/withdrawal/schema.ts`. 7 pre-existing lint errors in `backend/scripts/*.ts` are out of scope (documented in `.planning/phases/06-authed-money-screens/deferred-items.md`, untouched since Phase 1). |
| `bash scripts/verify-ring-purity.sh` | GREEN. Ring 1 pure (ui/). Ring 2 pure (composed blocks own no data). ProfileSidebar is a server component with no `api`/`useApi`/`AuthContext` imports. |
| `git diff HEAD~18 HEAD -- package.json package-lock.json` | EMPTY — zero new npm deps across both plans. |
| `grep -rn "free_money" .../coordonnees-bancaires/ .../retraits/` | EMPTY (D-22) |
| `grep -rn "maxLength={6}" .../securite/ .../retraits/pin/` | EMPTY (PIN is 4 digits) |
| `grep -rn '"slug":' .../modifier/` | EMPTY (D-24) |
| `grep -rnE "€\|\+33\|PayDunya\|Offerts" src/` | Only hit is `src/lib/commission.ts:72` inside a NEGATIVE guard comment ("NEVER returns 'Offerts'"). Clean. |
| `grep -rnE "r2\.cloudflarestorage\|\.r2\.dev" src/app/(authed)/` | EMPTY (all previews via `/api/files/:key`) |
| `grep -n 'method.*"PUT"' _PasswordForm.tsx` | Line 45 — matches CLAUDE.md PUT rule |
| `grep -n 'method.*"PUT"' modifier/_EditForm.tsx` | Line 180 — blocks edit is PUT not PATCH |
| `grep -rn "localStorage" src/app/(authed)/` | Only `izy-csrf` reads in `_ProfileForm`, `_KycForm`, `_EditForm`, `_uploadCover.ts`, and a comment in `layout.tsx`. All intentional CSRF pattern — no user-data localStorage. |
| Backend `GET /api/sellers/me/participations` | Present at `backend/src/routes/sellers.ts:323` |
| Notif prefs schema widened | `newParticipation`, `milestoneReached`, `cagnotteEnded`, `donationMessages` present in `backend/src/routes/notifications.ts:156-171` |
| `(authed)/layout.tsx` | Still a server component (server `cookies()` import, no `"use client"` directive) |
| Stats + modifier owner check | Both use server-side `notFound()` after cross-checking `me.seller.id === cagnotte.seller.id` |

### Requirements Coverage (10/10)

| Requirement | Plan | Route(s) | Status |
| ----------- | ---- | -------- | ------ |
| ATHD-01 Profile page (screen 17) | 06-01 T2 | `/profil` | SATISFIED |
| ATHD-02 Notification preferences (screen 19) | 06-01 T3 | `/profil/preferences` | SATISFIED |
| ATHD-03 Participations page (screen 16) | 06-01 T0+T4 | `/participations` + backend route | SATISFIED |
| ATHD-04 Notifications feed (screen 20) | 06-01 T5 | `/notifications` | SATISFIED |
| MNYS-01 Bank details form | 06-02 T1 | `/profil/coordonnees-bancaires` | SATISFIED |
| MNYS-02 Withdrawal flow (amount + PIN + confirmation) | 06-02 T4 | `/retraits{,/pin,/confirmation,/succes}` | SATISFIED (code-complete, live E2E = human) |
| MNYS-03 KYC upload (ID+selfie R2 proxy, status pill) | 06-02 T3 | `/profil/kyc` | SATISFIED |
| MNYS-04 Cagnotte stats page | 06-02 T5 | `/tableau-de-bord/cagnottes/[slug]/stats` | SATISFIED |
| MNYS-05 Cagnotte edit (no slug) | 06-02 T6 | `/tableau-de-bord/cagnottes/[slug]/modifier` | SATISFIED (D-24 enforced) |
| MNYS-06 Security / password change | 06-02 T2 | `/profil/securite` | SATISFIED (verb deviation already documented) |

REQUIREMENTS.md lines 139-151 and 304-313 already show all 10 IDs as `[x]` + `Complete`. No orphaned requirements.

### Banani Deviations Logged (D-25..D-29 added this phase)

- **D-25** — `birthDate` dropped from `/profil` (no DB column; schema rule)
- **D-26** — No delete CTA on cagnotte edit (v1 contact support)
- **D-27** — "Retirer mes fonds" added to DashboardNavbar avatar dropdown
- **D-28** — Profile uses `/api/auth/me` + PUT `/api/sellers/profile` (plan's `/api/sellers/me` doesn't exist)
- **D-29** — `GET /api/auth/me` select widened with KYC URLs + phone

### Anti-Patterns Found

None. No TODO/FIXME/placeholder/stub patterns in Phase 6 scope.

### Human Verification Required

See YAML `human_verification` block above. 5 items:

1. **Phase 4 audit-010 real-device cells 1-6** (inherited soft gate)
2. **Phase 5 visual walkthrough** (Banani screens 1-15)
3. **Phase 6 visual walkthrough** (Banani screens 16-24)
4. **End-to-end withdrawal on dev** (seed + approve-kyc + click through all 4 routes)
5. **Cagnotte stats + edit on dev with seeded donations** (verify CSS chart + non-owner `notFound`)

### Gaps Summary

Zero hard gaps. Every piece of code required by ROADMAP SC-1 through SC-4 exists, is substantive, is wired to real backend contracts, uses real data flows, passes build + lint + ring-purity, and ships without new npm dependencies. SC-5 is by definition a human visual review and is listed under human verification.

## Milestone-Level Completion Signal

**This is the final phase of the v1 milestone.** After this verification:

- **Phase 1 — Backend Foundations**: complete (prior verification)
- **Phase 2 — Backend Surfaces & Exit Gate**: complete (prior verification)
- **Phase 3 — Frontend Foundations**: complete (prior verification)
- **Phase 4 — Public Donor Revenue Path**: complete (prior verification, 6 real-device cells soft-gated)
- **Phase 5 — Auth + Creator Flow**: complete (prior verification, visual walkthrough soft-gated)
- **Phase 6 — Authed + Money Screens**: CODE COMPLETE this run. ATHD-01..04 + MNYS-01..06 all SATISFIED. Visual walkthrough + E2E withdrawal soft-gated.

**All 6 phases code-complete. All 10 Phase 6 requirements satisfied. The remaining path to v1 merge is the three soft human gates above (audit-010 real-device cells, Phase 5 visual, Phase 6 visual) + end-to-end withdrawal exercise on dev.** No re-planning is needed — the gap list is empty. The milestone can be marked code-complete pending the human soft gates.

---

_Verified: 2026-04-13T20:30:00Z_
_Verifier: Claude (gsd-verifier)_
