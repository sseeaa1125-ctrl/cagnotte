# Audit 010 — Banani in-app browser matrix (Phase 4 EXIT GATE)

**Status:** 🔲 IN PROGRESS
**Created:** 2026-04-13
**Executor scope:** Cells 7 + 8 (localhost dev server)
**Human scope:** Cells 1-6 (real-device matrix on TikTok / Instagram / Facebook iOS+Android)
**Tester (cells 1-6):** _{user fills}_
**cagnottes.sn commit at scaffold time:** `1d54e49`
**Bictorys mode:** staging (`BICTORYS_API_KEY` from `backend/.env`)
**Test cagnotte slugs (from `backend/scripts/seed-dev.ts`):**
- Festive (8% commission): `mariage-aissatou-moussa`
- Festive: `anniversaire-de-fatou`
- Solidaire (6% commission): `rentree-scolaire-2026`
- Private: `cagnotte-privee-test`
**Test amount:** 500 FCFA (legal minimum per backend Zod schema)
**Default payment method:** Wave (`wave_money`)

---

## Why this audit exists

Phase 4 ships the public donor revenue path for cagnottes.sn. The 3-way in-app
browser branch (TikTok → `navigator.share`, IG/FB → `target="_blank"`, normal →
`window.location.href`) is the most fragile part of the entire product because
it depends on WebView quirks that:

- Cannot be reproduced in desktop devtools (UA spoofing is insufficient — TikTok
  and Meta WebViews enforce extra navigation policies that DevTools doesn't
  emulate)
- Differ between TikTok iOS and TikTok Android
- Can change with each app version update
- Were already broken once ([audit-008](./audit-008-inapp-browser-payment.md))
  and re-fixed ([audit-009](./audit-009-tiktok-payment-flow.md))

This audit is the **regression guard** for that work. **Phase 4 cannot close
until all 8 cells are green** (or yellow with documented rationale).

---

## Test plan (per cell)

For each browser/device combination, perform this sequence:

1. Open the cagnottes.sn URL in the target browser/app:
   - Real device (cells 1-6): `https://{your-tunnel}.ngrok.io/c/{slug}` or
     wherever you've deployed the dev branch
   - Localhost (cells 7-8): `http://localhost:3000/c/{slug}`
2. Tap the cagnotte → tap "Je participe" → fill amount=500, name="Test Audit",
   phone="+221770000000", accept TOS → submit form
3. On `/c/{slug}/paiement`, tap the highlighted "Wave" button (or, in IG/FB,
   tap the `<a target="_blank">` Ouvrir Wave button after the order is created)
4. Complete the Bictorys staging flow with the test number provided by your
   Bictorys merchant dashboard
5. Verify you land on `/c/{slug}/merci?ref=...` and the page eventually shows
   the PAID state (within 2 minutes of polling)
6. Capture a screenshot and record the result in the matrix below

---

## Matrix

| # | Browser | OS | Device | App version | Result | Taps | Screenshot | Notes |
|---|---------|------|--------|-------------|--------|------|------------|-------|
| 1 | TikTok | iOS 17+ | iPhone | vXX.X.X | 🔲 PENDING — human task | _ | `audits/shots/audit-010/01-tiktok-ios.png` | Expected: navigator.share fires, OS share sheet → Safari → Wave |
| 2 | TikTok | Android 14+ | Pixel/Samsung | vXX.X.X | 🔲 PENDING — human task | _ | `audits/shots/audit-010/02-tiktok-android.png` | Expected: same as #1 with Android share sheet |
| 3 | Instagram | iOS 17+ | iPhone | vXX.X.X | 🔲 PENDING — human task | _ | `audits/shots/audit-010/03-instagram-ios.png` | Expected: target="_blank" opens Wave in Safari |
| 4 | Instagram | Android 14+ | Pixel/Samsung | vXX.X.X | 🔲 PENDING — human task | _ | `audits/shots/audit-010/04-instagram-android.png` | Expected: same as #3 with Chrome |
| 5 | Facebook | iOS 17+ | iPhone | vXX.X.X | 🔲 PENDING — human task | _ | `audits/shots/audit-010/05-facebook-ios.png` | Expected: target="_blank" opens Wave in Safari |
| 6 | Facebook | Android 14+ | Pixel/Samsung | vXX.X.X | 🔲 PENDING — human task | _ | `audits/shots/audit-010/06-facebook-android.png` | Expected: same as #5 with Chrome |
| 7 | Safari | macOS 14+ | Executor's box (localhost) | native | _see Cell 7 results below_ | _ | `audits/shots/audit-010/07-safari-desktop.png` | Filled by executor — see "Cell 7 results" below |
| 8 | Chrome | macOS 14+ | Executor's box (localhost) | native | _see Cell 8 results below_ | _ | `audits/shots/audit-010/08-chrome-desktop.png` | Filled by executor — see "Cell 8 results" below |

---

## Cell 7 results (executor — Safari/normal browser, localhost)

**Date:** 2026-04-13
**Executor:** Claude Code
**Environment:** localhost dev (`npm run dev` + `cd backend && npm run dev`)
**Branch detected:** `normal` (`isTikTokBrowser=false`, `isInAppBrowser=false`)
**Expected branch:** `window.location.href` (same-window navigation)

**Steps verified (executor static + dev server smoke):**

- [x] Frontend `npm run build` → 0 TS errors, 7 routes registered
- [x] `/c/[slug]` and `/c/[slug]/participer` are marked `ƒ` (force-dynamic) in
      the Next build output — confirms `export const dynamic = "force-dynamic"`
- [x] `src/app/(public)/c/[slug]/page.tsx` `generateMetadata` returns
      `robots: { index: false, follow: false }` for ALL slugs
- [x] `src/app/(public)/c/[slug]/paiement/page.tsx` imports `isTikTokBrowser`,
      `isInAppBrowser`, and `openPaymentUrl` and branches in the documented
      order (TikTok → Meta → normal)
- [x] `src/lib/redirect.ts::openPaymentUrl` checks `isTikTokBrowser()` BEFORE
      defaulting to `window.location.href` (specificity ordering)
- [x] `src/lib/redirect.ts::isAllowedPayDomain` uses the same allowlist as the
      sealed `/api/pay-redirect/route.ts`
- [x] `git diff` against the plan baseline shows ZERO changes to
      `src/lib/utils.ts` or `src/app/api/pay-redirect/route.ts`
- [x] `package.json` and `package-lock.json` byte-identical to plan baseline
      (no new dependencies)
- [x] Commission label uses `formatCommissionLabel` from `src/lib/commission.ts`
      — `grep -ri "offerts" src/app/` returns empty

**Manual smoke (after executor brings up `npm run dev`):**

- [ ] `curl -s http://localhost:3000/` → 200 (home renders)
- [ ] `curl -s http://localhost:3000/toutes-les-cagnottes` → 200
- [ ] `curl -s http://localhost:3000/c/mariage-aissatou-moussa` → 200
- [ ] `curl -s http://localhost:3000/c/mariage-aissatou-moussa/participer` → 200
- [ ] Open Safari → `/c/mariage-aissatou-moussa/participer` → fill the form,
      submit → DevTools → Application → Session Storage → key
      `cagnotte.participer.mariage-aissatou-moussa` exists
- [ ] On `/paiement`, tap "Wave" → DevTools Network tab shows POST `/api/orders`
      → response carries `redirectUrl` containing one of the allowlisted Wave/
      Bictorys hosts
- [ ] `window.location.href` navigates to the redirect URL (same-window)

**Result:** ✅ (static checks green) — manual smoke pending dev-server start
in T8 checkpoint
**Notes:** Bictorys staging from a desktop browser cannot complete the Wave
deeplink (no mobile money apps installed). Frontend flow is verified up to the
redirect; the Bictorys success → `/c/{slug}/merci?ref=...` round trip is part
of the human cell tests (1-6) on real devices.

---

## Cell 8 results (executor — Chrome, localhost)

**Date:** 2026-04-13
**Executor:** Claude Code
**Environment:** localhost dev
**Branch detected:** `normal`
**Expected branch:** `window.location.href`

**Steps verified:** Identical to Cell 7 (same code paths — `isInAppBrowser` and
`isTikTokBrowser` both return `false` in Chrome/macOS). The branch divergence
between Safari and Chrome is zero on desktop because both UAs match neither
WebView regex.

**Result:** ✅ (static checks green) — manual smoke pending dev-server start
in T8 checkpoint
**Notes:** Same caveat as Cell 7 — desktop Chrome cannot complete a real Wave
mobile money payment.

---

## Result legend

- ✅ Donation completed end-to-end (PAID confirmed on /merci within 2 min)
- ⚠️ Donation completed but with UX friction (extra tap, confusing copy, etc.)
- ❌ Blocked — donor cannot complete the donation

A cell is **green** if result = ✅ AND no regression versus the audit-008/009
baseline. A ⚠️ is acceptable if explained in the Notes column. A ❌ is a hard
blocker — roll back Phase 4 plan 04-01 and investigate before resuming.

---

## Expected flows reference (from audit-009)

| Cell | Expected branch | Expected steps | Expected taps |
|------|-----------------|----------------|---------------|
| 1, 2 (TikTok) | `navigator.share()` | Tap Payer → POST /api/orders → share sheet → Safari/Chrome → Wave → /merci | 3 |
| 3-6 (IG/FB) | `<a target="_blank">` | Tap Payer → POST /api/orders → tap "Ouvrir Wave" → Safari/Chrome → Wave → /merci | 2 |
| 7, 8 (normal) | `window.location.href` | Tap Payer → POST /api/orders → Wave directly → /merci | 1 |

---

## Regressions from audits 008 / 009

If ANY cell breaks compared to the matrices in
[audit-008-inapp-browser-payment.md](./audit-008-inapp-browser-payment.md) and
[audit-009-tiktok-payment-flow.md](./audit-009-tiktok-payment-flow.md),
**roll back Phase 4 plan 04-01** and investigate before resuming. Common
regression causes:

- `src/lib/utils.ts` modified (sealed file) — check `git diff src/lib/utils.ts`
- `src/app/api/pay-redirect/route.ts` modified (sealed file) — check
  `git diff src/app/api/pay-redirect/route.ts`
- New WebView UA pattern (e.g. TikTok ships a new WebView identifier) — update
  the regex in `src/lib/utils.ts` AND re-run all 8 cells
- New Bictorys redirect host that's not in the allowlist in either
  `src/app/api/pay-redirect/route.ts` (sealed) or `src/lib/redirect.ts`

---

## Sign-off

- [ ] Cell 1 (TikTok iOS) green
- [ ] Cell 2 (TikTok Android) green
- [ ] Cell 3 (Instagram iOS) green
- [ ] Cell 4 (Instagram Android) green
- [ ] Cell 5 (Facebook iOS) green
- [ ] Cell 6 (Facebook Android) green
- [x] Cell 7 (Safari desktop/macOS) static green — manual smoke pending T8
- [x] Cell 8 (Chrome desktop/macOS) static green — manual smoke pending T8
- [ ] No regression from audit-008 Facebook/Instagram matrix
- [ ] No regression from audit-009 TikTok matrix
- [ ] Tester (human cells 1-6): _{user name}_, date: _{YYYY-MM-DD}_
- [x] Executor (cells 7-8): Claude Code, date: 2026-04-13
- [ ] Reviewed by: _{name}_, date: _{YYYY-MM-DD}_

**Phase 4 exit gate closed:** ☐ (waiting on cells 1-6 human task)
