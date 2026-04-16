---
phase: 04-public-donor-revenue-path
verified: 2026-04-13T00:00:00Z
status: human_needed
score: 9/9 must-haves verified programmatically (6/8 audit-010 cells await real-device testing)
overrides_applied: 0
re_verification:
  previous_status: null
  previous_score: null
human_verification:
  - test: "audit-010 Cell 1 — TikTok iOS real device"
    expected: "Tap cagnotte link in TikTok iOS → /participer → /paiement → Wave button → navigator.share() fires OS share sheet → Safari → Wave → /merci?ref=... shows PAID within 2 min"
    why_human: "TikTok WebView navigation policies cannot be reproduced in desktop devtools (UA spoof is insufficient). Per audit-009, this is the only way to validate the navigator.share path."
  - test: "audit-010 Cell 2 — TikTok Android real device"
    expected: "Same as Cell 1, with Android share sheet"
    why_human: "Android TikTok WebView differs from iOS; needs physical device"
  - test: "audit-010 Cell 3 — Instagram iOS real device"
    expected: "Tap cagnotte link in Instagram iOS → /participer → /paiement → Wave button → POST /api/orders succeeds → buttons morph into <a target='_blank'> → second tap opens Safari → Wave → /merci shows PAID"
    why_human: "Meta WebView target='_blank' behavior cannot be emulated; this is the audit-008 workaround regression guard"
  - test: "audit-010 Cell 4 — Instagram Android real device"
    expected: "Same as Cell 3, with Chrome"
    why_human: "Android IG WebView differs from iOS"
  - test: "audit-010 Cell 5 — Facebook iOS real device"
    expected: "Tap cagnotte link in Facebook iOS → same as Cell 3"
    why_human: "Facebook WebView is distinct from Instagram despite Meta ownership; needs physical device"
  - test: "audit-010 Cell 6 — Facebook Android real device"
    expected: "Same as Cell 5, with Chrome"
    why_human: "Android FB WebView differs from iOS"
  - test: "T8 interactive form submission + Bictorys staging payment on desktop (complements Cells 7-8)"
    expected: "Safari/Chrome → /participer → fill form → /paiement → Wave button → POST /api/orders 200 → window.location.href navigates to pay.wave.com or checkout.bfrpay.com → complete staging flow → /merci polls and shows PAID"
    why_human: "Bictorys staging deeplink cannot complete on a desktop browser without a mobile money test account; executor covered the static + HTTP-probe half of Cells 7-8"
---

# Phase 4: Public Donor Revenue Path — Verification Report

**Phase Goal:** A donor on a 375px Android phone in a TikTok/IG/FB WebView can tap a cagnottes.sn link, read the cagnotte, submit a donation, complete the Bictorys mobile-money payment, and land on a thank-you page that polls for PAID — with zero regressions on audit-008/009.

**Verified:** 2026-04-13
**Status:** human_needed
**Re-verification:** No — initial verification

## Verdict Summary

All 9 programmatically verifiable must-haves PASS. All 8 requirements (DONA-06 + DONF-01..07) are shipped. Static checks, build, lint (Phase-4 scope), ring purity, sealed-file immutability, and drift greps are green. The phase is code-complete.

**The remaining work is a legitimate human gate**, not a code gap: 6 of the 8 audit-010 device matrix cells require physical iOS and Android devices with the TikTok, Instagram, and Facebook apps installed to validate the 3-way in-app browser branch end-to-end. Desktop devtools cannot substitute for real-device WebView navigation policies (per audit-008 and audit-009).

**Recommendation:** Phase 5 (auth + creator flow) can proceed IN PARALLEL with the real-device audit-010 task. Phase 5 does not touch the donor revenue path, so it cannot regress the work under human verification.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Donor on 375px Android phone can tap link, see cagnotte detail, start donation | VERIFIED | `/c/[slug]/page.tsx:86-287` SSR fetches detail, renders hero/description/sticky CTA with `Link href="/c/{slug}/participer"` (line 277-281). Mobile-first container pattern. |
| 2 | TikTok WebView completes payment via `navigator.share()` (audit-009) | VERIFIED (code) | `paiement/page.tsx:89-93` branches TikTok FIRST via `isTikTokBrowser()`; `paiement/page.tsx:150` calls `openPaymentUrl` for non-meta; `src/lib/redirect.ts:78-96` TikTok branch fires `navigator.share({url})` then clipboard fallback. REAL-DEVICE testing pending (audit-010 cells 1-2). |
| 3 | IG/FB WebView completes payment via `target='_blank'` (audit-008) | VERIFIED (code) | `paiement/page.tsx:89-93` detects meta via `isInAppBrowser()` after TikTok short-circuit; `paiement/page.tsx:150` skips `openPaymentUrl` for meta; `paiement/page.tsx:207-220` renders `<a href={redirectInfo.redirectUrl} target="_blank" rel="noopener noreferrer">`. REAL-DEVICE testing pending (audit-010 cells 3-6). |
| 4 | Normal Safari/Chrome completes payment via `window.location.href` | VERIFIED | Executor smoke: 6/6 dev-server route probes return 200. `src/lib/redirect.ts:99-102` normal branch sets `window.location.href = url`. Full Bictorys staging flow pending T8 human checkpoint. |
| 5 | Pay page shows `"8% · 800 FCFA"` (festive) or `"6% · 600 FCFA"` (solidaire), NEVER "Offerts" | VERIFIED | `src/lib/commission.ts:42-67` mirrors backend `computeCommission` byte-for-byte (`Math.floor`, invariant `commission+net===gross`). `paiement/page.tsx:97-106` and `ParticiperForm.tsx:76-85` compute live commission from `stashed.cagnotteSubtype` and pass to `<OrderSummary commissionBp/commissionAmount/netAmount>`. Drift grep empty. `formatCommissionLabel` (commission.ts:78-88) returns `"${percent}% · ${amountStr} FCFA"`. |
| 6 | `/merci` polls `/api/orders/:ref/status` and resolves to PAID within 2 minutes | VERIFIED | `merci/page.tsx:13-14` `POLL_INTERVAL_MS = 3_000`, `MAX_POLLS = 40`; `merci/page.tsx:57-95` bounded setTimeout loop with visibility guard (line 67-69) + TIMEOUT state (line 60-62) after 40 attempts. Resolved endpoint `/api/orders/${reference}/status` at line 73. |
| 7 | Private cagnottes are noindex via robots.txt + per-page robots metadata | VERIFIED | `src/app/robots.ts:16` disallow `/c/`. `/c/[slug]/page.tsx:125` `generateMetadata` returns `robots: { index: false, follow: false }` for ALL slugs. `/c/[slug]/participer/page.tsx:15` same. `force-dynamic` on both pages eliminates build-time slug leak. Three-layer defense-in-depth confirmed. |
| 8 | Home renders 6 featured cagnottes (or marketing-only state if seed empty) | VERIFIED | `(public)/page.tsx:33` fetches `GET /api/cagnottes?limit=6` with 60s ISR. Empty-state fallback via `.filter(c => Boolean(c.slug))` on line 40 returns empty array cleanly. |
| 9 | `audit-010-banani-inapp-matrix.md` exists with 8 cells; cells 7-8 filled by executor; cells 1-6 pending human | VERIFIED | `audits/audit-010-banani-inapp-matrix.md` exists (212 lines). Matrix section (lines 62-71) has all 8 cells. Cells 1-6 marked "PENDING — human task". Cells 7-8 filled with executor results (static green + 6/6 HTTP 200 probes, lines 75-151). Sign-off section (lines 196-211) tracks human vs executor closure. |

**Score:** 9/9 truths verified programmatically. Truths 2, 3, 4 carry a human-side validation requirement for end-to-end Bictorys completion.

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/commission.ts` | VERIFIED | Contains `FUNDRAISER_COMMISSION_BP`, `computeCommission`, `formatCommissionLabel`. Byte-for-byte math mirror of backend. Imported by `ParticiperForm.tsx` (line 14-17) and `paiement/page.tsx` (line 13-16). |
| `src/lib/redirect.ts` | VERIFIED | Contains `PAY_REDIRECT_ALLOWED_DOMAINS`, `isAllowedPayDomain`, `buildProxyRedirectUrl`, `openPaymentUrl` with TikTok-first branch. Imports only `isTikTokBrowser` from sealed utils (line 16). Imported by `paiement/page.tsx:11`. |
| `src/app/(public)/layout.tsx` | VERIFIED | Server Component wrapping `TopBannerHost`, `PublicNavbar`, `main`, `PreFooter`, `Footer`. All Ring 2 composed blocks from Phase 3-03. |
| `src/app/(public)/page.tsx` | VERIFIED | Home with hero + 6 featured cagnottes fetch + 60s ISR + trust/FAQ sections. |
| `src/app/(public)/toutes-les-cagnottes/page.tsx` | VERIFIED | SSR shell + `LoadMoreCagnottes` client island with cursor pagination (D-06). |
| `src/app/(public)/c/[slug]/page.tsx` | VERIFIED | SSR shell + `force-dynamic` (line 17) + `generateMetadata` with OG tags and `robots: {index:false,follow:false}` (line 125) + `<ProgressPoll>` + sticky CTA. |
| `src/app/(public)/c/[slug]/ProgressPoll.tsx` | VERIFIED | Client component (confirmed via import in page.tsx:9). |
| `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx` | VERIFIED | 3-section form (amount/info/message) + live commission (line 76-85) + sessionStorage stash on submit (line 123-127) + router.push to `/paiement` (line 132). Flow B handoff confirmed. |
| `src/app/(public)/c/[slug]/paiement/page.tsx` | VERIFIED | 3-way in-app branch in correct order (TikTok → meta → normal, line 89-93). POST `/api/orders` via `api()` (line 126-129). `openPaymentUrl` call gated on `browser !== "meta"` (line 150). Meta branch renders `<a target="_blank">` (line 207-220). |
| `src/app/(public)/c/[slug]/merci/page.tsx` | VERIFIED | Bounded polling (3s × 40 = 2 min, line 13-14). Visibility guard (line 67-69, 98-108). `?ref=` authoritative over sessionStorage (line 36, 44-54). ShareSheet on PAID (line 179-183). |
| `audits/audit-010-banani-inapp-matrix.md` | VERIFIED | 8-cell matrix, cells 1-6 PENDING, cells 7-8 filled. Exit gate checklist at lines 196-211. |

### Key Link Verification

| From | To | Status | Details |
|------|-----|--------|---------|
| `paiement/page.tsx` | `redirect.ts::openPaymentUrl` | WIRED | Line 11 import, line 151 call inside click handler AFTER `POST /api/orders` succeeds, gated on non-meta branch (line 150) |
| `paiement/page.tsx` | `commission.ts::computeCommission` | WIRED | Line 13 import, line 102 memoized call in render path, wired to `<OrderSummary>` props (line 273-279) |
| `ParticiperForm.tsx` | `/c/[slug]/paiement` | WIRED | Line 124-126 `sessionStorage.setItem('cagnotte.participer.${slug}', JSON.stringify(payload))`, line 132 `router.push('/c/${slug}/paiement')` |
| `merci/page.tsx` | `/api/orders/:ref/status` | WIRED | Line 72-74 `api<OrderStatusResponse>('/api/orders/${reference}/status')` inside bounded setTimeout loop with visibility guard |
| `backend/routes/orders.ts` | `/c/{cagnotteSlug}/merci` | WIRED | Line 419 `${BICTORYS_REDIRECT_URL}/c/${data.cagnotteSlug}/merci?ref=${reference}` |

All 5 key links verified.

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `(public)/page.tsx` | featured grid | `GET /api/cagnottes?limit=6` (real SQL query in backend/routes/cagnottes.ts) | Yes (empty seed → empty grid, marketing-only state renders cleanly) | FLOWING |
| `/c/[slug]/page.tsx` | `cagnotte` / `participantsData` | `GET /api/cagnottes/:slug` + `/participants` (real SQL queries) | Yes | FLOWING |
| `ProgressPoll.tsx` | totalRaised/donorCount | 20s poll of `/api/cagnottes/:slug` | Yes | FLOWING |
| `ParticiperForm.tsx` | commissionResult | `computeCommission(amount, subtype)` (pure math) | Yes | FLOWING |
| `paiement/page.tsx` | `stashed` + `commissionResult` | sessionStorage (from `/participer`) + pure math | Yes | FLOWING |
| `merci/page.tsx` | `order` | Bounded polling of `/api/orders/:ref/status` | Yes — on a real PAID order | FLOWING (requires human E2E to confirm full round-trip) |

No hollow components found. MiniCagnotteCard on /paiement shows `raised: 0, goal: 0` but this is an INTENTIONAL collapse (documented in SUMMARY as "donors are committing, not browsing") — title + cover + subtype are the real displayed fields.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Frontend production build | `npm run build` | `✓ Compiled successfully in 1965ms`, 7 routes; `/c/[slug]`, `/c/[slug]/merci`, `/c/[slug]/paiement`, `/c/[slug]/participer` all marked `ƒ` (dynamic) | PASS |
| Phase-4 scoped lint | `npx eslint 'src/app/(public)' src/lib/commission.ts src/lib/redirect.ts src/app/sitemap.ts` | 0 errors / 0 warnings | PASS |
| Repo-total lint | `npm run lint` | 7 errors / 13 warnings — ALL in `backend/scripts/*` and `backend/src/*` (pre-existing, out of Phase 4 scope) | PASS (scope) |
| Ring purity | `bash scripts/verify-ring-purity.sh` | `✅ Ring 1 pure`, `✅ Ring 2 pure` | PASS |
| `force-dynamic` present on `/c/[slug]` routes | grep under `src/app/(public)/c/` | 2 hits: `page.tsx:17`, `participer/page.tsx:10` | PASS |
| No `generateStaticParams` under `/c/[slug]` | grep under `src/app/(public)/c/` | No matches | PASS |
| Sealed file immutability | `git diff 22c59c9 HEAD -- src/lib/utils.ts src/app/api/pay-redirect/route.ts` | 0 lines | PASS |
| Package manifest unchanged | `git diff 22c59c9 HEAD -- package.json package-lock.json` | 0 lines | PASS |
| Drift grep — €, +33, PayDunya, Offerts in src/ | `grep -rE "(€|\+33|PayDunya|Offerts)" src/` | Only a negative docstring in `src/lib/commission.ts:72` (`NEVER returns "Offerts"`) — no user-visible drift | PASS |
| Backend redirect edit | `grep "/c/" backend/src/routes/orders.ts` | Line 419 `${BICTORYS_REDIRECT_URL}/c/${data.cagnotteSlug}/merci?ref=${reference}` | PASS |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| DONA-06 | TikTok/IG/FB donor routed through audit-008/009 workaround without regression | SATISFIED | Code: `paiement/page.tsx:89-93` 3-way branch, `redirect.ts::openPaymentUrl`. Device testing: audit-010 cells 1-6 pending human. |
| DONF-01 | Home page with hero/featured/features/FAQ | SATISFIED | `(public)/page.tsx` renders hero + 6 featured + trust + FAQ |
| DONF-02 | All-cagnottes discovery (priority-deferred per research) | SATISFIED | `(public)/toutes-les-cagnottes/page.tsx` SSR + cursor load-more (D-06 logged) |
| DONF-03 | `/c/[slug]` detail with cover, description, participants, sticky sidebar, share | SATISFIED | `/c/[slug]/page.tsx` + `ProgressPoll.tsx` + ShareSheet (line 258-263) |
| DONF-04 | `/participer` 3-section form with sticky order summary | SATISFIED | `ParticiperForm.tsx` sections at lines 151-263, sticky `<aside>` at line 271-290 |
| DONF-05 | `/paiement` with Wave/Orange/Free/Carte + commission transparency | SATISFIED | `paiement/page.tsx:47-52` METHOD_LIST + `<OrderSummary>` with live commission via `computeCommission` (line 97-106) |
| DONF-06 | Thank-you with polling on `/api/orders/:ref/status` + share CTA + back link | SATISFIED | `merci/page.tsx` bounded polling + `<ShareSheet>` on PAID + back button |
| DONF-07 | In-app detection: TikTok→share, IG/FB→target=_blank, normal→location.href + audit-010 8-cell matrix | SATISFIED | Code: verified. Matrix: `audits/audit-010-banani-inapp-matrix.md` exists; cells 7-8 green; cells 1-6 await human. |

All 8 requirements SATISFIED at the code level. DONA-06 and DONF-07 carry a real-device validation tail that is part of the human gate.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `paiement/page.tsx` | 196-203 | `MiniCagnotteCard` props `raised: 0, goal: 0` | Info | Intentional — documented in SUMMARY "Known Stubs". Title + cover + subtype are the displayed fields on the payment screen; progress is collapsed on purpose to keep donor focused on committing. Not a blocker. |
| `backend/src/routes/orders.ts` | 421 (approx) | `errorRedirectUrl` still points at legacy `/{sellerSlug}/error` | Info | Explicitly deferred to a future hardening pass per plan T0. Failed payments will land on the legacy URL until then — acceptable graceful-degradation. |
| `src/components/layout/PublicNavbar.tsx` | — | Hardcoded `/cagnottes` link (should be `/toutes-les-cagnottes`) | Warning | Ring-2 file from Phase 3 left untouched in Phase 4 to preserve ring purity. Logged as stub for Phase 5 follow-up. Home hero CTA correctly points at `/toutes-les-cagnottes`. |

No blockers. All findings are pre-documented intentional deferrals.

### Human Verification Required

See `human_verification` in frontmatter. Summary:

1. **audit-010 cells 1-6** — Six real-device tests (TikTok iOS/Android, Instagram iOS/Android, Facebook iOS/Android) to validate the 3-way in-app browser branch end-to-end against Bictorys staging. The test plan is documented in `audits/audit-010-banani-inapp-matrix.md` (lines 40-58). Each cell is a ~5-minute test.

2. **T8 desktop interactive checkpoint** — Complete one desktop end-to-end via Bictorys staging (Wave test number from Bictorys merchant dashboard) to cover the gap between executor HTTP probes and a real PAID round-trip.

### Deviations Logged

- **D-06** — All-cagnottes pagination: numeric → "Charger plus" (cursor)
- **D-07** — Cagnotte detail: ship variant A only (variant B deferred to v2)

Both logged in `.planning/banani/FRONTEND-DEVIATIONS.md`.

### Gaps Summary

**Zero code-level gaps.** Phase 4 is code-complete. The only outstanding work is the 6-cell real-device matrix, which is a legitimate human task that automation cannot substitute. This is **not a failure mode**; it's a pre-planned exit gate (OQ-5 in the plan: "hybrid execution — executor cells 7+8, human cells 1-6").

**Status justification for `human_needed` (not `gaps_found`):**

- All 9 programmatic must-haves PASS
- All 8 requirements SATISFIED at code level
- Build, lint, ring-purity, sealed files, drift greps all green
- Cells 1-6 are a documented human gate, not a missing artifact
- Re-running the code verification will not change the result — only running the device matrix can close the phase

**Recommendation:** Phase 5 (auth + creator flow) can start in parallel. Phase 5 does not touch `/c/[slug]/*` routes, `redirect.ts`, `commission.ts`, or the audit-008/009 sealed primitives, so it cannot regress the work that the human is about to validate on real devices. Once cells 1-6 close, promote this report's status from `human_needed` to `passed` and flip the ROADMAP Phase 4 checkbox.

---

_Verified: 2026-04-13_
_Verifier: Claude (gsd-verifier)_
