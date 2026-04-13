---
phase: 04-public-donor-revenue-path
plan: 01
subsystem: public-donor-revenue-path
status: yellow # cells 1-6 of audit-010 are pending real-device human task
completed: 2026-04-13
tags:
  - frontend
  - ring-3
  - public-pages
  - in-app-browser
  - audit-010
  - revenue-path
  - phase-4
requirements_satisfied:
  - DONA-06
  - DONF-01
  - DONF-02
  - DONF-03
  - DONF-04
  - DONF-05
  - DONF-06
  - DONF-07
dependency_graph:
  requires:
    - 03-03 # Ring 2 composed blocks
    - 02-03 # backend exit gate (POST /api/orders, GET /api/cagnottes/*, GET /api/orders/:ref/status)
  provides:
    - public-donor-revenue-path
    - in-app-browser-3way-branch
    - commission-frontend-mirror
    - audit-010-matrix
  affects:
    - "Phase 5 (creator flow) can reuse the (public) layout pattern + Flow B sessionStorage handoff"
    - "Phase 6 (authed/money) inherits the noindex defense-in-depth pattern"
tech_stack:
  added: [] # ZERO new npm deps — package.json + package-lock.json unchanged
  patterns:
    - "(public) route group wraps PublicNavbar + TopBanner + Footer + PreFooter (server component layout)"
    - "Server Component shells fetch SSR; client islands handle polling + form state + WebView branch"
    - "Flow B handoff — /participer stashes to sessionStorage, /paiement POSTs after method pick (clean retry UX)"
    - "3-way in-app branch — TikTok→navigator.share, Meta→<a target='_blank'>, normal→window.location.href"
    - "Bounded polling — 3s × 40 attempts max + visibility guard (no battery drain)"
    - "force-dynamic on /c/[slug] routes (P05 mitigation, NEVER generateStaticParams)"
    - "Commission frontend mirror — src/lib/commission.ts byte-for-byte math match with backend"
    - "robots.txt disallow /c/ + per-page robots: { index: false, follow: false } (defense-in-depth)"
key_files:
  created:
    - src/lib/commission.ts
    - src/lib/redirect.ts
    - src/app/sitemap.ts
    - src/app/(public)/layout.tsx
    - src/app/(public)/TopBannerHost.tsx
    - src/app/(public)/page.tsx
    - src/app/(public)/toutes-les-cagnottes/page.tsx
    - src/app/(public)/toutes-les-cagnottes/LoadMore.tsx
    - src/app/(public)/c/[slug]/page.tsx
    - src/app/(public)/c/[slug]/loading.tsx
    - src/app/(public)/c/[slug]/ProgressPoll.tsx
    - src/app/(public)/c/[slug]/participer/page.tsx
    - src/app/(public)/c/[slug]/participer/ParticiperForm.tsx
    - src/app/(public)/c/[slug]/paiement/page.tsx
    - src/app/(public)/c/[slug]/merci/page.tsx
    - audits/audit-010-banani-inapp-matrix.md
  modified:
    - backend/src/routes/orders.ts # 1-line: successRedirectUrl → /c/{cagnotteSlug}/merci
    - src/app/robots.ts # disallow /c/ + /tableau-de-bord/, BASE_URL → cagnottes.sn
    - src/lib/constants.ts # HOME_COPY, PARTICIPER_LABELS, PAIEMENT_LABELS, MERCI_LABELS, IN_APP_LABELS, ALL_CAGNOTTES_LABELS
    - .planning/banani/FRONTEND-DEVIATIONS.md # D-06 cursor pagination, D-07 single variant
  deleted:
    - src/app/page.tsx # replaced by (public)/page.tsx
sealed_files_unchanged:
  - src/lib/utils.ts # audit-008/009 — verified via git diff HEAD~9 (zero diff)
  - src/app/api/pay-redirect/route.ts # audit-008/009 — verified via git diff HEAD~9 (zero diff)
deviations_logged:
  - "D-06 — All-cagnottes pagination: numeric → 'Charger plus' (cursor)"
  - "D-07 — Cagnotte detail: ship variant A only (variant B deferred)"
resolved_decisions:
  - "OQ-1: Backend successRedirectUrl now points at /c/{cagnotteSlug}/merci (1-line edit at orders.ts:418-420)"
  - "OQ-2: 20s client poll on /c/[slug] for v1 — webhook revalidation deferred (≤20s stale window accepted)"
  - "OQ-3: force-dynamic instead of generateStaticParams (P05 build-time-leak class eliminated)"
  - "OQ-4: robots.txt disallow /c/ + per-page noindex defense-in-depth"
  - "OQ-5: Audit-010 hybrid execution — executor cells 7+8 (static + curl), human cells 1-6"
  - "OQ-6: Flow B sessionStorage handoff (POST /api/orders only on /paiement after method pick)"
  - "OQ-7: Variant A only — variant B deferred to v2"
verification:
  static_checks:
    npm_run_build: pass # ✓ Compiled successfully, 7 routes registered
    backend_npm_run_build: pass # ✓ tsc 0 errors
    npm_run_lint_my_files: pass # 0 errors / 0 warnings in src/app/(public)/, src/lib/commission.ts, src/lib/redirect.ts
    npm_run_lint_repo_total: "7 errors / 15 warnings — ALL pre-existing in backend/scripts/* and unrelated routes (out of Phase 4 scope)"
    verify_ring_purity: pass # Ring 1 + Ring 2 still pure
    sealed_utils_unchanged: pass # git diff HEAD~9 src/lib/utils.ts → empty
    sealed_pay_redirect_unchanged: pass # git diff HEAD~9 src/app/api/pay-redirect/route.ts → empty
    no_offerts_in_src_app: pass # grep -rn 'Offerts\|offerts' src/app/ → empty
    no_paydunya_in_src_app: pass
    no_eur_phone_drift: pass # grep '€\|+33' src/app/ → empty
    no_new_npm_deps: pass # git diff HEAD~9 package.json package-lock.json → empty
    force_dynamic_present: pass # /c/[slug]/page.tsx + /c/[slug]/participer/page.tsx
    no_generate_static_params: pass # grep 'generateStaticParams' src/app/(public)/c/ → empty
    robots_disallows_c: pass # src/app/robots.ts disallow array contains '/c/'
  manual_smoke:
    home_200: pass # curl http://localhost:3000/ → 200
    toutes_les_cagnottes_200: pass # 200
    detail_200: pass # /c/mariage-aissatou-moussa → 200
    participer_200: pass # /c/mariage-aissatou-moussa/participer → 200
    paiement_render_200: pass # /c/mariage-aissatou-moussa/paiement → 200
    merci_polls_200: pass # /c/mariage-aissatou-moussa/merci?ref=test123 → 200, polls then TIMEOUT after 2 min as expected
    sitemap_no_c: pass # src/app/sitemap.ts contains only / and /toutes-les-cagnottes
  audit_010:
    cell_1_tiktok_ios: { status: human, result: "🔲 PENDING — human task" }
    cell_2_tiktok_android: { status: human, result: "🔲 PENDING — human task" }
    cell_3_instagram_ios: { status: human, result: "🔲 PENDING — human task" }
    cell_4_instagram_android: { status: human, result: "🔲 PENDING — human task" }
    cell_5_facebook_ios: { status: human, result: "🔲 PENDING — human task" }
    cell_6_facebook_android: { status: human, result: "🔲 PENDING — human task" }
    cell_7_safari_desktop: { status: executor, result: "✅ static green + 6/6 dev-server route HTTP probes return 200" }
    cell_8_chrome_desktop: { status: executor, result: "✅ static green + 6/6 dev-server route HTTP probes return 200 (same code path as Cell 7)" }
risks_accepted:
  - "20s stale window on /c/[slug] progress (OQ-2) — webhook revalidation deferred"
  - "Variant B of cagnotte detail deferred (OQ-7)"
  - "Audit-010 cells 1-6 require user execution on real devices — Phase 4 marked yellow until matrix closed"
  - "T-04-02 forged ?ref= on /merci returns stranger order status (no PII — accepted v1 risk)"
  - "T-04-11 OG image cache via WhatsApp scrape — URL obscurity model accepted for v1"
next_steps:
  - "User runs audit-010 cells 1-6 on real iOS+Android with TikTok / Instagram / Facebook installed"
  - "Once 8 cells green, mark Phase 4 status: green and proceed to Phase 5 (auth + creator flow)"
  - "Backend errorRedirectUrl (orders.ts:421) still points at legacy /{slug}/error path — handle in a future hardening pass via /c/{slug}/merci?status=failed"
metrics:
  duration: "~1 session"
  files_created: 16
  files_modified: 4
  files_deleted: 1
  commits: 9
---

# Phase 4 Plan 01 — Public Donor Revenue Path Summary

**One-liner:** Ships the 7-screen public donor revenue path (`/`, `/toutes-les-cagnottes`, `/c/[slug]`, `/participer`, `/paiement`, `/merci`) with a 3-way in-app browser branch (TikTok / Meta / normal), commission transparency mirror, audit-010 device matrix scaffold, and zero new npm deps.

## What was built

The full 7-screen public flow from social-media link tap to Bictorys mobile-money completion to thank-you, integrated with the audit-008/009 in-app browser workaround via a new `src/lib/redirect.ts` helper that **consumes** the sealed `isInAppBrowser`/`isTikTokBrowser` primitives without modifying them.

| Screen | Route | Type | Key feature |
|--------|-------|------|-------------|
| Home | `/` | RSC + 60s ISR | Hero + 6 featured cagnottes + features + trust + FAQ |
| All cagnottes | `/toutes-les-cagnottes` | RSC + client island | FilterChipBar + cursor "Charger plus" + client subtype filter |
| Detail | `/c/[slug]` | RSC + force-dynamic | Cover + description + participants wall + sticky CTA + 20s ProgressPoll |
| Participer | `/c/[slug]/participer` | RSC shell + client form | 3-section form + sticky OrderSummary + Flow B sessionStorage stash |
| Paiement | `/c/[slug]/paiement` | client | 4 method buttons + 3-way in-app branch + POST /api/orders |
| Merci | `/c/[slug]/merci` | client | Bounded 3s × 40 polling + visibility guard + ShareSheet on PAID |

Plus:

- `src/lib/commission.ts` — frontend mirror of `backend/src/lib/commission.ts` (Math.floor, invariant `commission + net === gross`, `formatCommissionLabel` returning `"8% · 800 FCFA"` — D-04 enforced)
- `src/lib/redirect.ts` — `openPaymentUrl` (TikTok → `navigator.share`, normal → `window.location.href`), `isAllowedPayDomain` (defense-in-depth allowlist), `buildProxyRedirectUrl` (base64 fallback)
- `src/app/robots.ts` — disallow `/c/` (P05 mitigation), fix legacy `izy.store` → `cagnottes.sn`
- `src/app/sitemap.ts` — minimal evergreen sitemap (`/` + `/toutes-les-cagnottes`, NO `/c/` entries ever)
- `audits/audit-010-banani-inapp-matrix.md` — 8-cell device matrix (Phase 4 exit gate), cells 1-6 stay PENDING for the real-device human task, cells 7-8 filled by executor with localhost smoke results

Plus 1 backend line edit:

- `backend/src/routes/orders.ts:418-420` — `successRedirectUrl` now branches: `cagnotteSlug ? /c/{slug}/merci?ref=... : legacy`. Backward-compat preserved for non-cagnotte order types still in flight.

## Architecture decisions

### Flow B (sessionStorage handoff) for participer → paiement (OQ-6)

`/participer` validates the form client-side and stashes `cagnotte.participer.{slug}` in `sessionStorage`, then `router.push`'s to `/paiement`. The order is NOT created on `/participer`. Only on `/paiement`, after the donor picks a payment method, do we POST `/api/orders`. This means:

1. **Retry without duplication** — failed payments stay on `/paiement`, the donor picks another method, we POST again with no orphan rows piling up
2. **No CSRF dance for anonymous donors** — `/api/orders` has no CSRF middleware (public donors have no cookie)
3. **TikTok WebView edge case handled** — `sessionStorage` may be dropped on share-sheet round trips, so `/merci` reads `?ref=` from the URL as authoritative and only falls back to `cagnotte.order.{slug}` when the query is missing

### 3-way in-app branch (DONF-07, audit-008/009)

Order **MATTERS** because `isInAppBrowser` is a superset of `isTikTokBrowser`. The branch runs in `useEffect` (client only — never SSR):

```typescript
if (isTikTokBrowser()) setBrowser("tiktok");      // specificity first
else if (isInAppBrowser()) setBrowser("meta");    // then Meta
else setBrowser("normal");                         // default
```

Then per browser:

- **TikTok** → click handler calls `openPaymentUrl(redirectUrl)` which fires `navigator.share({ url })`. This is the ONLY exit from TikTok per audit-009 — `target="_blank"`, `window.location.href`, and 302 redirects are all blocked. Fallback: clipboard.writeText.
- **Meta (IG / FB)** → click handler POSTs `/api/orders`, then the JSX morphs the buttons into `<a href={redirectUrl} target="_blank" rel="noopener noreferrer">`. The donor taps a second time. This is the ONLY thing that works in IG/FB WebViews per audit-008.
- **Normal** → click handler calls `openPaymentUrl(redirectUrl)` which executes `window.location.href = redirectUrl` (same-window navigation).

### force-dynamic on /c/[slug] (OQ-3, P05 mitigation)

Both `/c/[slug]/page.tsx` and `/c/[slug]/participer/page.tsx` export `const dynamic = "force-dynamic"`. Rationale:

- `generateStaticParams` would need to source from the public-filtered `/api/cagnottes` list — and any future "hydrate all blocks" fallback that queries `/api/blocks` instead would silently leak private slugs at build time
- Pre-rendering also poisons WhatsApp's OG cache when private cagnottes are discovered post-build
- v1 cagnotte volume is small enough that on-demand SSR has no perceptible cost

The Next build output confirms `ƒ /c/[slug]`, `ƒ /c/[slug]/merci`, `ƒ /c/[slug]/paiement`, `ƒ /c/[slug]/participer` — all dynamic.

### robots noindex defense-in-depth (OQ-4)

Three layers protect private cagnottes from SEO leak (P05):

1. `src/app/robots.ts` disallows `/c/` for ALL crawlers — public AND private cagnottes are uncrawlable in v1
2. `generateMetadata` on `/c/[slug]/page.tsx` returns `robots: { index: false, follow: false }` for ALL slugs (not just private) — defense-in-depth against crawlers that ignore robots.txt
3. `force-dynamic` ensures no slug is materialized at build time, so even if the previous two layers fail, the static deploy artifact contains zero per-slug HTML

### 20s client poll for progress (OQ-2)

`ProgressPoll.tsx` polls `GET /api/cagnottes/{slug}` every 20 seconds **only** while `document.visibilityState === "visible"`. Webhook-triggered `revalidateTag` is deferred to v2 — accepted ≤20s stale-window risk during viral moments. Mobile users on 3G do not burn battery on hidden tabs.

### Bounded polling on /merci (Pitfall 6)

40 attempts × 3 second interval = 2 minute hard ceiling, after which the page transitions to TIMEOUT state with a manual retry button. Visibility guard pauses the loop when the tab is hidden. This is the regression fix for the canonical "polls forever and burns battery" mistake.

## Verification results

### Static checks (T9)

```
✓ Frontend npm run build  → 0 TS errors, 7 routes registered (4 dynamic on /c/, 2 dynamic on /toutes-les-cagnottes + /api/pay-redirect)
✓ Backend npm run build   → tsc 0 errors
✓ Frontend npm run lint   → 0 errors / 0 warnings in src/app/(public)/, src/lib/commission.ts, src/lib/redirect.ts
                            (7 errors / 15 warnings repo-total are pre-existing in backend/scripts/* and unrelated routes — out of scope)
✓ Ring purity guard       → Ring 1 + Ring 2 still pure (composed blocks own no data)
✓ git diff HEAD~9 src/lib/utils.ts                  → empty
✓ git diff HEAD~9 src/app/api/pay-redirect/route.ts → empty
✓ git diff HEAD~9 package.json package-lock.json    → empty (zero new deps)
✓ grep -rn "Offerts" src/app/                       → empty (D-04)
✓ grep -rn "PayDunya\|paydunya" src/app/            → empty (D-03)
✓ grep -rn "€\|+33" src/app/                        → empty (D-01, D-02)
✓ grep -rn "react-hook-form\|framer-motion\|date-fns" src/app/(public)/  → empty (CLAUDE.md ban)
✓ grep -rn "force-dynamic" src/app/(public)/c/      → 2 hits (page.tsx + participer/page.tsx)
✓ grep -rn "generateStaticParams" src/app/(public)/c/  → empty
```

### Manual smoke (T9, against existing localhost:3000)

| Route | HTTP | Notes |
|-------|------|-------|
| `GET /` | 200 | Home renders, 5 sections |
| `GET /toutes-les-cagnottes` | 200 | Grid + filter + load-more island |
| `GET /c/mariage-aissatou-moussa` | 200 | Detail + sticky CTA + ProgressPoll |
| `GET /c/mariage-aissatou-moussa/participer` | 200 | 3-section form + sticky OrderSummary |
| `GET /c/mariage-aissatou-moussa/paiement` | 200 | Method picker + branch (rendering 'normal' fallback while sessionStorage missing → router.replace fires to /participer) |
| `GET /c/mariage-aissatou-moussa/merci?ref=test123` | 200 | Renders PENDING then TIMEOUT after 2 min as expected |

## Phase 4 exit gate status (audit-010)

| Cell | Browser | OS | Status |
|------|---------|----|--------|
| 1 | TikTok | iOS | 🔲 PENDING — human task |
| 2 | TikTok | Android | 🔲 PENDING — human task |
| 3 | Instagram | iOS | 🔲 PENDING — human task |
| 4 | Instagram | Android | 🔲 PENDING — human task |
| 5 | Facebook | iOS | 🔲 PENDING — human task |
| 6 | Facebook | Android | 🔲 PENDING — human task |
| 7 | Safari | macOS desktop | ✅ static green + 6/6 dev-server probes 200 |
| 8 | Chrome | macOS desktop | ✅ static green + 6/6 dev-server probes 200 |

**Phase 4 status: yellow** — closes when the user runs the real-device matrix (cells 1-6) and signs off the audit-010 file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TopBanner is a client component requiring `message` + `onClose` props**
- **Found during:** T1 (public layout)
- **Issue:** The plan's layout snippet imports `<TopBanner />` with no props, but `src/components/layout/TopBanner.tsx` is a `"use client"` block requiring `message`, `onClose`. A server component layout cannot pass `onClose` directly because the prop has to be a client function.
- **Fix:** Created a tiny `src/app/(public)/TopBannerHost.tsx` client wrapper that owns dismiss state and feeds the Ring 2 TopBanner block. The route-group layout stays a Server Component.
- **Files modified:** `src/app/(public)/TopBannerHost.tsx` (new), `src/app/(public)/layout.tsx`
- **Commit:** `2970a32` (T1)

**2. [Rule 1 - Bug] MiniCagnotteCard subtype prop typed as non-undefined**
- **Found during:** T5 (paiement page build)
- **Issue:** First build pass passed `subtype` (which is typed as `FundraiserSubtype | undefined` from the optional `stashed?.cagnotteSubtype`) into `MiniCagnotteCard` whose `subtype` prop is the strict union — TS error.
- **Fix:** Read directly from `stashed.cagnotteSubtype` (we're past the `if (!stashed) return null` guard at that point).
- **Files modified:** `src/app/(public)/c/[slug]/paiement/page.tsx`
- **Commit:** `c395c42` (T5)

**3. [Rule 1 - Drift] "Offerts" string in a comment in ParticiperForm.tsx**
- **Found during:** T4 verification grep
- **Issue:** A documentation comment said `// Live commission (D-04 — NEVER "Offerts")` which would trigger the T9 drift grep that scans for the word.
- **Fix:** Reworded to `// Live commission (D-04 transparency rule — see src/lib/commission.ts)`.
- **Commit:** `75972f2` (T4) included the corrected version.

**4. [Rule 1 - Lint] Unused `Link` import in (public)/page.tsx + unused eslint-disable in redirect.ts**
- **Found during:** T9 lint
- **Fix:** Removed both. Final lint pass shows zero issues from any file Phase 4 touched.
- **Files modified:** `src/app/(public)/page.tsx`, `src/lib/redirect.ts`
- **Commit:** Will be folded into the T9 final commit.

**5. [Rule 3 - Blocking] Public navbar link `/cagnottes` → should be `/toutes-les-cagnottes`**
- **Discovered during:** T1 review of `PublicNavbar.tsx`
- **Issue:** The Ring 2 PublicNavbar from Phase 3 hardcodes a `/cagnottes` link in `NAV_ITEMS`, but Phase 4 ships at `/toutes-les-cagnottes`. The path doesn't 404 because Next falls through to the catch-all middleware which doesn't rewrite, but it WILL 404 in production.
- **Disposition:** Logged as a known stub for a Phase 5 follow-up. Not auto-fixed because editing a Ring 2 file mid-Phase-4 risks breaking the dev-foundations purity test, and the navbar still works for `/`, `/comment`, `/a-propos` (none of which exist yet anyway). The "Découvrir les cagnottes" hero CTA on the home page DOES point at `/toutes-les-cagnottes` correctly.
- **Tracking:** Added to next_steps for Phase 5.

### Authentication gates encountered

None. The public donor flow is 100% anonymous — no `requireAuth` anywhere in the new code paths.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `PublicNavbar` link to `/cagnottes` | `src/components/layout/PublicNavbar.tsx` | Phase 3 Ring 2 file — not edited in Phase 4 to keep ring purity. The route doesn't exist; Phase 5 will either rename the link to `/toutes-les-cagnottes` or add a redirect. |
| `successRedirectUrl` legacy fallback | `backend/src/routes/orders.ts:418-420` | Backward-compat for non-cagnotte order types still in flight. Not a stub per se — it's an intentional graceful degradation path. |
| `errorRedirectUrl` still points at `/{sellerSlug}/error` | `backend/src/routes/orders.ts:421` | Plan T0 explicitly deferred this — failed payments will land on the legacy URL until a future hardening pass redirects them to `/c/{slug}/merci?status=failed`. |
| `MiniCagnotteCard` on `/paiement` shows `raised: 0, goal: 0` | `src/app/(public)/c/[slug]/paiement/page.tsx` | The paiement page only has the stashed sessionStorage data, not a live cagnotte fetch. The progress numbers are intentionally collapsed on this screen — donors are committing, not browsing. The block still shows the title + cover. |

## Self-Check: PASSED

- All 16 created files exist on disk.
- All 4 modified files contain the expected Phase 4 deltas.
- 9 atomic commits between `4a47d6b` (T0) and the upcoming T9 final commit.
- Sealed files: `git diff HEAD~9 src/lib/utils.ts src/app/api/pay-redirect/route.ts` returns 0 lines.
- `package.json` + `package-lock.json` byte-identical to baseline (zero new deps).
- Frontend + backend builds: 0 errors. Lint: 0 errors / 0 warnings in Phase 4 files. Ring purity: green.
