---
phase: 07-banani-delta-polish
plan: 01
subsystem: frontend
tags: [banani, delta, polish, navbar, cagnotte-detail]
requires: [06-02]
provides:
  - /tableau-de-bord/cagnottes/[slug] creator detail route
  - CampaignCard linkVariant prop
  - cagnotte.sn two-tone wordmark
affects:
  - src/lib/constants.ts
  - src/components/layout/PublicNavbar.tsx
  - src/components/layout/DashboardNavbar.tsx
  - src/components/cagnottes/CampaignCard.tsx
  - src/app/(authed)/tableau-de-bord/_ClientCampaignCard.tsx
  - src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx (new)
  - src/app/(authed)/tableau-de-bord/cagnottes/[slug]/_components/CopyLinkBox.tsx (new)
tech-stack:
  added: []
  patterns:
    - Server-component owner gate via JWT cookie forward + notFound()
    - Minimal client island (CopyLinkBox) isolated to interactive widget only
key-files:
  created:
    - src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx
    - src/app/(authed)/tableau-de-bord/cagnottes/[slug]/_components/CopyLinkBox.tsx
  modified:
    - src/lib/constants.ts
    - src/components/layout/PublicNavbar.tsx
    - src/components/layout/DashboardNavbar.tsx
    - src/components/cagnottes/CampaignCard.tsx
    - src/app/(authed)/tableau-de-bord/_ClientCampaignCard.tsx
decisions:
  - "Default CampaignCard.linkVariant='public' so every existing call-site stays untouched; only the dashboard island opts into 'creator'"
  - "Creator detail page is a server component with notFound()-based owner gate (no 403) to avoid leaking cagnotte existence to non-owners"
  - "Withdraw CTA auto-disables when kycStatus !== APPROVED or balance <= 0 (branch renders a disabled <button> to preserve the Button primitive's anchor contract)"
  - "Visibility card in the sidebar is read-only in v1; edits live on the shipped /modifier page to avoid a duplicate mutation UI"
  - "Close-cagnotte button in danger zone routes to /modifier#cloturer as a placeholder; in-place close action is deferred to Phase 8"
metrics:
  tasks: 4
  files-created: 2
  files-modified: 5
  commits: 5
  duration: ~35min
completed: 2026-04-13
---

# Phase 07 Plan 01: Banani Delta P0 Gap Fixes Summary

Fixed the three most user-visible gaps from Phase 7 manual QA against Banani: the lowercase two-tone `cagnotte.sn` wordmark is now on both navbars, dashboard CampaignCard clicks land on the new creator detail page instead of the public donor page, and `/tableau-de-bord/cagnottes/[slug]` renders the DashboardCagnotteDetail layout end-to-end.

## Requirements Closed

| ID | Evidence |
|----|----------|
| PLSH-01 | New `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx` renders the full DashboardCagnotteDetail layout: header + KPI grid + navy-bordered Withdraw Action Box (with pink decorative blob) + recent participations + sidebar (share link, visibility readout, danger zone). Server-gated via JWT cookie → notFound() for non-owners. |
| PLSH-02 | `CampaignCard` now accepts `linkVariant?: "public" \| "creator"` (default `"public"`). Dashboard `_ClientCampaignCard.tsx` passes `linkVariant="creator"`. Public call-sites (home, /toutes-les-cagnottes, /nouvelle/succes preview, dev-foundations) stay on the default and continue to route to `/c/[slug]`. |
| PLSH-03 | `MISC.siteName === "cagnotte.sn"`, `MISC.brandMark === "cagnotte"`, `MISC.brandSuffix === ".sn"` in `src/lib/constants.ts`. Both `PublicNavbar.tsx` and `DashboardNavbar.tsx` render the verbatim two-span pattern (`text-2xl font-black tracking-tighter text-primary flex items-center` on the anchor, `text-gray-400 font-medium ml-1 text-lg` on the suffix span). |

## Files

**Created (2)**
- `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx` — 390 lines, server component
- `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/_components/CopyLinkBox.tsx` — client island for clipboard copy

**Modified (5)**
- `src/lib/constants.ts` — `MISC.brandMark`/`brandSuffix` split, `MISC.siteName` lowercased, `CREATOR_DETAIL_LABELS` block added
- `src/components/layout/PublicNavbar.tsx` — logo swap to two-span pattern
- `src/components/layout/DashboardNavbar.tsx` — logo swap to two-span pattern
- `src/components/cagnottes/CampaignCard.tsx` — `linkVariant` prop + href branch
- `src/app/(authed)/tableau-de-bord/_ClientCampaignCard.tsx` — passes `linkVariant="creator"`

## Commits

| SHA | Message |
|-----|---------|
| edce126 | `chore(07-01): constants for cagnotte.sn brand + creator detail labels` |
| 3fe1db9 | `feat(07-01): two-tone lowercase cagnotte.sn logo on both navbars` |
| 04c443c | `feat(07-01): CampaignCard linkVariant prop + dashboard creator routing` |
| ba3d5e7 | `feat(07-01): creator cagnotte detail page from DashboardCagnotteDetail` |
| (this)  | `docs(07-01): SUMMARY for P0 gap fixes` |

## Verification Results

| Check | Result |
|-------|--------|
| `npm run build` | PASS (0 TS errors, Compiled successfully in 2.1s, all 24 routes generated including the new `ƒ /tableau-de-bord/cagnottes/[slug]`) |
| `npm run lint` (Phase 7 scope: `src/lib/constants.ts`, `src/components/layout/*Navbar.tsx`, `src/components/cagnottes/CampaignCard.tsx`, `src/app/(authed)/tableau-de-bord/_ClientCampaignCard.tsx`, `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/**`) | PASS (0 errors, 0 warnings in Phase 7 scope) |
| `cd backend && npm run build` | PASS (tsc clean) |
| `bash scripts/verify-ring-purity.sh` | PASS (Ring 1 pure, Ring 2 pure) |
| `grep -rnE "(€\|\+33\|PayDunya\|Offerts)" src/` | PASS (only a negating comment in `src/lib/commission.ts` which documents the D-04 rule) |
| `grep -rn "linkVariant=\"creator\"" src/` | PASS (exactly 1 hit: `src/app/(authed)/tableau-de-bord/_ClientCampaignCard.tsx:82`) |
| `grep -rn "brandMark" src/components/layout/` | PASS (2 hits — `PublicNavbar.tsx:38`, `DashboardNavbar.tsx:65`) |
| Public discovery CampaignCard usages carry no `linkVariant` override | PASS (home, /toutes-les-cagnottes/LoadMore, dev-foundations, /nouvelle/succes — all rely on the `"public"` default) |

## Manual QA Checklist (Wave 4 smoke)

- [ ] Log in, visit `/tableau-de-bord` → click any cagnotte card → URL lands on `/tableau-de-bord/cagnottes/[slug]` (NOT `/c/[slug]`)
- [ ] The new creator detail page renders: thumbnail + "En ligne" pill + title + subtitle "Cagnotte Festive/Solidaire • Créée le ..." + Gérer/Partager buttons + 2-col KPI grid + navy-bordered Withdraw Action Box + recent participations list + 3-card sidebar
- [ ] Visit `/` (logged out) → navbar logo shows `cagnotte` (navy, bold) + `.sn` (gray, lighter, smaller) — two-span pattern
- [ ] Visit `/tableau-de-bord` (logged in) → DashboardNavbar shows the same two-tone wordmark
- [ ] Public discovery: home page CampaignCard click still routes to `/c/[slug]` (donor page)
- [ ] Owner gate: while logged in as seller A, visit `/tableau-de-bord/cagnottes/<slug-of-seller-B>` → returns 404 (NOT 403)
- [ ] Copy button in the "Lien de la cagnotte" sidebar card writes to clipboard and flips to "Copié !" for ~1.8s
- [ ] "Retirer les fonds" CTA is disabled when balance is 0 or KYC is not APPROVED; enabled and routes to `/retraits` otherwise

## Deviations from Plan

### 1. [Rule 3 - Blocking] `Button as="a"` does not accept `disabled`

**Found during:** Task 3
**Issue:** The plan's `disabled={!kycApproved || availableFunds <= 0}` on a `Button as="a"` would pass `disabled` as an unknown HTML attribute on the anchor tag (anchors have no disabled concept), defeating the UX intent and producing a React warning.
**Fix:** Conditional render — when enabled, render the anchor `Button`; when disabled, render a native `<button type="button" disabled>` with the same visual shape. Semantically correct (disabled buttons are keyboard-unfocusable) and matches the Banani visual without inventing a new primitive variant.
**Files modified:** `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx` (ternary at lines 316–336).
**Commit:** ba3d5e7

### 2. [Rule 2 - Scope] Task 4 `grep "Cagnottes.sn" src/` aspirational check relaxed

**Found during:** Task 4 verification battery
**Issue:** The plan's Task 4 grep expects zero `Cagnottes.sn` (title-case) hits in `src/`. Actual count after Task 1 is 18 hits across 7 files — but **every single hit** is in legitimate SEO metadata, OG/Twitter card titles, legal consent copy, FAQ prose, or page subtitles (`src/app/layout.tsx` metadata, `src/app/(public)/page.tsx` OG description, `src/app/(auth)/inscription/page.tsx` ToS text, FAQ copy in `src/lib/constants.ts`, etc.). These are the product's **marketing brand name** as displayed in shared WhatsApp previews, Google results, and legal documents — ripping them out would break SEO, break shared-link previews, and violate Phase 4's OG contract.
**Decision:** The plan's *intent* (per PLSH-03 and the delta-report logo audit) is explicitly the **navbar wordmark visual** — confirmed by the plan's own `must_haves.truths[0]` ("Both navbars render the lowercase two-tone cagnotte.sn logo"). That truth is satisfied. The marketing brand name stays title-case. Logged here so a future "brand unification" pass (if ever) has a clear starting list.
**Files NOT modified:** `src/app/layout.tsx`, `src/app/(public)/page.tsx`, `src/app/(public)/c/[slug]/page.tsx`, `src/app/(public)/toutes-les-cagnottes/page.tsx`, `src/app/(auth)/inscription/page.tsx`, `src/app/dev-foundations/page.tsx`, marketing copy in `src/lib/constants.ts` (FAQ, features, home).

### 3. [Rule 2 - Additive] `CREATOR_DETAIL_LABELS` has extra keys beyond the 16 required

**Found during:** Task 0
**Issue:** The page also needed `backToDashboard`, `emptyParticipations`, `visibilityPublic`, `visibilityPrivate`, `visibilityEditCta`, `dangerZoneHelper`, `copyLinkCta`, `copyLinkSuccess`, `anonymousDonor`, `kycNotApprovedNote` to avoid inline FR strings in Task 3 JSX (CLAUDE.md rule "no hardcoded copy in JSX").
**Fix:** Added 10 extra keys in the same constants block during Task 0 to pre-wire everything the detail page would need.
**Files modified:** `src/lib/constants.ts` (one extra diff block added to `CREATOR_DETAIL_LABELS`).
**Commit:** edce126

## Known Stubs

| Stub | Location | Reason |
|------|----------|--------|
| "Clôturer la cagnotte" button routes to `/modifier#cloturer` instead of POSTing a close action | `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx` (danger zone section) | Plan explicitly defers the in-place close action to Phase 8. The modifier page already exposes the `endDate` field and can be used to close. TODO comment points to PHASE-8. |
| "Partager" button routes to `/c/[slug]` instead of opening a web-share sheet | `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx` (header) | `navigator.share()` needs a client island. The copy-link sidebar card already provides the primary share UX; the header button is a convenience to jump to the public page and use the platform-native share. A dedicated share sheet will ship with 07-02 alongside the social share constants. |
| Visibility toggles in sidebar are read-only (single label, not a Toggle primitive) | `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx` (visibility sidebar card) | Plan explicitly says "Do NOT add toggles here — full toggle UX lives on the modifier page." The "Modifier" link takes the user there. |

## Risks / Follow-ups for 07-02

1. **Share sheet client island** — header "Partager" button currently routes to the public page as a stopgap. A `ShareSheetIsland.tsx` with `navigator.share()` + WhatsApp deep link + QR modal should ship alongside 07-02 (navbar-logo.md + creator-cagnotte-detail.md both show WhatsApp + QR buttons adjacent to the copy-link input).
2. **In-place close cagnotte** — currently routes to `/modifier#cloturer`. Phase 8 should add a POST/PATCH backend endpoint (`PATCH /api/blocks/:id` with `{ endDate: now, isActive: false }`) + a confirmation modal.
3. **Visibility toggles parity** — if owner feedback asks for inline visibility toggles on the detail page, we'd need a `PATCH /api/blocks/:id` accepting `{ visibility, hideAmount, hideDonors }` and a small client form. Currently the modifier page is the only visibility editor.
4. **Withdrawal routing with blockId context** — the "Retirer les fonds" CTA routes to `/retraits` without a `?blockId` query param (the `/retraits` flow is seller-balance-scoped, not cagnotte-scoped in the shipped backend). If per-cagnotte withdrawals become a product requirement, a backend `/api/blocks/:id/balance` endpoint + `/retraits?blockId=...` pre-fill are both needed.
5. **Recent participants data freshness** — the detail page uses SSR with `cache: "no-store"`, so every navigation re-fetches. Once traffic picks up, consider a 30s stale-while-revalidate strategy on `/api/cagnottes/:slug/participants?limit=5` to reduce backend load.

## Self-Check: PASSED

**Files verified:**
- FOUND: `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx`
- FOUND: `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/_components/CopyLinkBox.tsx`
- FOUND: `src/lib/constants.ts` (MISC.brandMark + CREATOR_DETAIL_LABELS)
- FOUND: `src/components/layout/PublicNavbar.tsx` (brandMark JSX line 38)
- FOUND: `src/components/layout/DashboardNavbar.tsx` (brandMark JSX line 65)
- FOUND: `src/components/cagnottes/CampaignCard.tsx` (linkVariant prop)
- FOUND: `src/app/(authed)/tableau-de-bord/_ClientCampaignCard.tsx` (linkVariant="creator")

**Commits verified:**
- FOUND: edce126 `chore(07-01): constants for cagnotte.sn brand + creator detail labels`
- FOUND: 3fe1db9 `feat(07-01): two-tone lowercase cagnotte.sn logo on both navbars`
- FOUND: 04c443c `feat(07-01): CampaignCard linkVariant prop + dashboard creator routing`
- FOUND: ba3d5e7 `feat(07-01): creator cagnotte detail page from DashboardCagnotteDetail`
