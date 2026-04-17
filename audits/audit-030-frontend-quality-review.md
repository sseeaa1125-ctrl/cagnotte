# Audit 030 -- Frontend Quality & Best Practices Review

**Date:** 2026-04-16
**Scope:** All files under `src/` plus `middleware.ts`, `next.config.ts`, `package.json`
**Reviewer:** Claude (gsd-code-reviewer)

---

## Executive Summary

The frontend is well-architected overall: good server/client component boundaries, solid auth flow, proper sanitization defense-in-depth, comprehensive French constant extraction, and thoughtful in-app browser handling. The codebase is production-ready with a few targeted improvements needed.

**Findings: 2 CRITICAL, 6 HIGH, 12 MEDIUM, 10 LOW, 8 INFO**

---

## CRITICAL

### CR-01: `dangerouslySetInnerHTML` on cagnotte description -- XSS defense depends on single function

**File:** `src/app/(public)/c/[slug]/page.tsx:362`
**Severity:** CRITICAL

The cagnotte detail page renders user-provided HTML descriptions via `dangerouslySetInnerHTML`:
```tsx
dangerouslySetInnerHTML={{
  __html: normalizeLegacyDescription(cagnotte.description),
}}
```

While `normalizeLegacyDescription` calls `sanitizeRichText` (which uses `sanitize-html`), this is the single render-time XSS barrier for the most public-facing page. The `normalizeLegacyDescription` function has a fork: if the input "looks like HTML" it sanitizes, otherwise it manually escapes and wraps. The manual escape path (line 56-62 of `sanitize.ts`) does handle the main vectors (`<`, `>`, `&`, `"`, `'`), but there is a subtle issue:

**The `looksLikeHtml` regex only checks for a small tag list.** Content like `<script>alert(1)</script>` would NOT match the regex (it checks for `p|strong|em|b|i|u|a|br` only), so it falls through to the "plain text" branch which correctly escapes `<` to `&lt;`. However, a string like `<strong>safe</strong><img onerror=alert(1) src=x>` WOULD match `looksLikeHtml` and go through `sanitizeRichText`, which correctly strips `<img>`. The defense is sound in practice but the logic is fragile.

**Fix:** Always run ALL user content through `sanitizeRichText` regardless of whether it "looks like HTML." Remove the `looksLikeHtml` fork entirely -- `sanitize-html` handles plain text fine (it will just return the text unchanged).

```ts
export function normalizeLegacyDescription(input: string): string {
  if (!input) return "";
  const sanitized = sanitizeRichText(input);
  // If no HTML tags were present, wrap in <p> with <br> for newlines
  if (sanitized === input || !/<\/?[a-z]/i.test(sanitized)) {
    const withBreaks = sanitized.replace(/\n/g, "<br>");
    return `<p>${withBreaks}</p>`;
  }
  return sanitized;
}
```

### CR-02: AuthProvider wraps entire app including public pages -- unnecessary auth calls

**File:** `src/app/layout.tsx:62-63`
**Severity:** CRITICAL (functional)

`AuthProvider` is mounted in the root layout, meaning EVERY page load (including public pages like `/`, `/c/slug`, `/cagnottes`) triggers a `GET /api/auth/me` request. For anonymous visitors this:
1. Creates unnecessary server load (401 responses for every visitor)
2. Counts against rate limits (global 300 req/15min)
3. Wastes ~100-300ms on first paint for public pages

The `(authed)` route group already has server-side auth via `requireSellerMe()`. Public pages that need auth state should opt in, not get it by default.

**Fix:** Move `AuthProvider` from root layout to the `(authed)` layout only. For pages that need optional auth awareness (e.g., navbar login state), use a separate lightweight context that reads the cookie presence without making a network request.

---

## HIGH

### H-01: Massive dead types in `src/types/index.ts` -- fari.store remnants

**File:** `src/types/index.ts:4, 48-241`
**Severity:** HIGH (code quality)

The types file still defines `Product`, `ProductFile`, `Review`, `OrderBump`, `BookingService`, `BookingSlot`, `Customer`, `Community`, `CommunitySubscription`, and their supporting types. The `Block` interface references `product`, `bookingService`, and `community` fields. The `BlockType` union includes `LINK`, `SALE`, `BOOKING`, `PAYMENT`, `DONATION`, `FORMATION`, `LEAD_MAGNET`, `WAITING_LIST`, `PARTNERSHIP`, `COMMUNITY` -- but only `FUNDRAISER` is used.

This is ~200 lines of dead code that misleads developers into thinking these features exist.

**Fix:** Strip types to only what cagnottes.sn uses: `FUNDRAISER` block type, `DONATION` order type, and the Seller/Block/Order interfaces pruned to fundraiser-only fields. Keep a `// Legacy types removed -- see git history` comment.

### H-02: Theme data blob in types/index.ts (~700 lines) should be separate module

**File:** `src/types/index.ts:246-1007`
**Severity:** HIGH (bundle size)

The `THEMES` array (20 theme objects with ~40 properties each) plus all theme utility functions live in `types/index.ts`. This file is imported everywhere. Any component importing a single type from this file gets the entire THEMES array in its bundle. These themes appear to be fari.store link-in-bio themes -- cagnottes.sn uses a fixed navy/pink design system.

**Fix:** Move `THEMES`, `FONTS`, and all theme utilities to a dedicated `src/lib/themes.ts`. Only import where actually needed (likely nowhere in cagnottes.sn v1). Consider removing entirely if unused.

### H-03: `useApi` cache eviction interval never clears

**File:** `src/lib/useApi.ts:17-28`
**Severity:** HIGH (resource leak)

The `setInterval` at module scope runs forever (every 5 minutes). In a long-running SPA session this is acceptable, but there is no cleanup mechanism. If the module were somehow re-evaluated (edge case with HMR), intervals would stack.

More importantly, the cache `Map` is shared across all components. When a user logs out and logs in as a different user, the cache still holds data from the previous session.

**Fix:** Clear the entire cache on logout. In `AuthContext.tsx` `logout()`, call `invalidateCachePrefix("/api/")` before redirecting.

### H-04: Merci page visibility-change handler does not re-trigger polling

**File:** `src/app/(public)/c/[slug]/merci/page.tsx:98-108`
**Severity:** HIGH (bug)

The visibility-change handler calls `setAttempts((n) => (n >= MAX_POLLS ? n : n))` -- this is a no-op. The identity function `n => n` does not trigger a React re-render since the value is unchanged. The comment says "Force a re-tick by bumping attempts" but the code does not actually bump anything.

**Fix:**
```ts
setAttempts((n) => (n >= MAX_POLLS ? n : n + 0.001));
// Or better: use a separate trigger ref
```

Actually, the proper fix is to use a separate `tickRef`:
```ts
const [wakeTick, setWakeTick] = React.useState(0);
// In handler:
setWakeTick((n) => n + 1);
// In effect deps: add wakeTick
```

### H-05: CSP `script-src 'unsafe-inline'` undermines Content-Security-Policy

**File:** `next.config.ts:95`
**Severity:** HIGH (security)

The CSP includes `script-src 'self' 'unsafe-inline' ...`. The `unsafe-inline` directive effectively nullifies the XSS protection that CSP provides for scripts. An attacker who achieves HTML injection can execute inline scripts.

**Fix:** Use Next.js nonce-based CSP instead. Generate a nonce per request in middleware, inject it via `script-src 'nonce-xxx'`, and pass it to Next.js via the `csp` metadata property. Remove `'unsafe-inline'`.

### H-06: `adminApi.ts` missing accents in French error messages

**File:** `src/lib/adminApi.ts:155-158`
**Severity:** HIGH (consistency, user-facing)

The admin API error messages lack French accents: "requete" should be "requete" -> "La requ**e**te a pris trop de temps", "Verifie" -> "V**e**rifie", "reseau" -> "r**e**seau", "Reessaye" -> "R**e**essaye". The main `api.ts` has correct accents.

**Fix:** Copy the exact French strings from `api.ts` lines 166-170 into `adminApi.ts`.

---

## MEDIUM

### M-01: `suppressHydrationWarning` on body element

**File:** `src/app/layout.tsx:61`
**Severity:** MEDIUM

`suppressHydrationWarning` on `<body>` hides legitimate hydration mismatches. This was likely added to suppress browser extension injection warnings but it silences ALL body-level hydration errors.

**Fix:** This is an accepted pattern for `<body>` specifically (browser extensions modify it). Document why it's there with a comment.

### M-02: Images using `<img>` instead of `next/image`

**Files:** `src/app/(public)/c/[slug]/page.tsx:327`, `src/app/(public)/c/[slug]/paiement/page.tsx:528-549, 575, 640`
**Severity:** MEDIUM

Multiple `<img>` tags with `eslint-disable-next-line @next/next/no-img-element` comments. These bypass Next.js image optimization (lazy loading, responsive sizing, format conversion). The cover images and operator logos could benefit from optimization, especially for the 3G performance target mentioned in CLAUDE.md.

**Fix:** Use `next/image` with `sizes` prop for responsive images. For small operator logos (28x28), the overhead is minimal but the format conversion (WebP/AVIF) still helps on slow networks.

### M-03: `sessionStorage` used for payment flow state -- lost on cross-tab navigation

**File:** `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx:142-149`
**Severity:** MEDIUM

The participation payload is stored in `sessionStorage`, which is tab-scoped. If a user shares the payment link or opens it in a new tab, the stash is lost. The paiement page correctly redirects to `/participer` in this case, but the user experience is confusing.

**Fix:** Consider using `localStorage` with a TTL (e.g., 30min expiry) instead. Or encode essential data in the URL query params (amount, anonymous flag) as a fallback.

### M-04: `formatRelative` in cagnotte page duplicates `formatRelativeTime` from `lib/format.ts`

**File:** `src/app/(public)/c/[slug]/page.tsx:149-169`
**Severity:** MEDIUM (code duplication)

A local `formatRelative()` function duplicates the functionality of `formatRelativeTime()` from `src/lib/format.ts`. The local version uses manual string formatting while the lib version uses `Intl.RelativeTimeFormat`.

**Fix:** Delete the local function and import `formatRelativeTime` from `@/lib/format`.

### M-05: Missing `key` stability in wizard draft hydration

**File:** `src/hooks/useWizardDraft.ts` (not fully read but referenced)
**Severity:** MEDIUM

Wizard state is persisted to `sessionStorage` by slug. If a user creates a solidaire cagnotte draft, navigates away, then starts a festive cagnotte, the draft from the wrong subtype could be loaded if they share a storage key namespace collision.

**Fix:** Include the subtype in the storage key: `cagnotte.wizard.${subtype}.step1`.

### M-06: `PLAN_LIMITS` uses different commission rates than `commission.ts`

**File:** `src/types/index.ts:1263-1278`
**Severity:** MEDIUM (potential confusion)

`PLAN_LIMITS.FREE.commissionRate` is `0.05` (5%) in production and `0.03` in dev. But `commission.ts` defines 6% solidaire / 8% festive. These are different systems (plan commission vs fundraiser commission) but the naming overlap is confusing and could lead to using the wrong rate.

**Fix:** Rename `commissionRate` in `PLAN_LIMITS` to `saleCommissionRate` or add a comment clarifying this is for non-fundraiser orders (which don't exist in cagnottes.sn v1).

### M-07: Missing `aria-live` on polling status updates

**Files:** `src/app/(public)/c/[slug]/merci/page.tsx:142-155`, `src/app/(public)/c/[slug]/paiement/page.tsx:941-950`
**Severity:** MEDIUM (accessibility)

The polling status display ("Tentative 5/40", "En attente du paiement...") updates dynamically but lacks `aria-live="polite"` so screen readers don't announce status changes.

**Fix:** Add `aria-live="polite"` to the polling status containers.

### M-08: Missing loading states for admin pages

**File:** `src/app/(admin)/admin/*/page.tsx` (multiple files)
**Severity:** MEDIUM

The admin route group has pages but no `loading.tsx` files visible in the file listing, unlike the `(authed)` group which has loading skeletons.

**Fix:** Add `loading.tsx` to admin routes for better perceived performance.

### M-09: `comment` route path uses French URL but English code reference

**File:** `src/app/(public)/comment/page.tsx`
**Severity:** MEDIUM (SEO)

The route `/comment` (French for "how it works") could be confused with a comments feature. The robots.txt doesn't explicitly allow it, and the sitemap doesn't include it.

**Fix:** Add `/comment` to sitemap.ts static pages. Verify robots.txt allows it.

### M-10: Stale CSRF token after session expiry

**File:** `src/lib/api.ts:12-16`
**Severity:** MEDIUM (security edge case)

The CSRF token is stored in localStorage (persists across sessions) and cookie. If a user's session expires and they get a new session via refresh, the old CSRF token might still be in localStorage. The `refreshAccessToken` function updates it if the response includes one, but the fallback to the old localStorage token could cause 403s.

**Fix:** Clear CSRF token in the catch path of `refreshAccessToken` when refresh fails (line 62): add `clearCsrfToken()` in the `return false` path.

### M-11: `field-sizing: content` CSS property browser support

**File:** `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx:246`
**Severity:** MEDIUM

The comment mentions "Chrome 123+ / Safari 17+ / Firefox 123+" but these are all 2024 browsers. Users on older Android devices (common in Senegal) may not support this property. The input would fall back to default sizing, which might break the centered layout.

**Fix:** Add a fallback width (`min-w-[80px]` or similar) and test on older browsers common in the Senegalese market.

### M-12: `dynamic` and `revalidate` conflict in sitemap.ts

**File:** `src/app/sitemap.ts:3-4`
**Severity:** MEDIUM

```ts
export const dynamic = "force-dynamic";
export const revalidate = 3600;
```

`force-dynamic` means the route is never cached/revalidated -- it runs on every request. The `revalidate = 3600` is ignored when `dynamic = "force-dynamic"`. This is misleading.

**Fix:** Remove `revalidate = 3600` since it has no effect, or switch to `dynamic = "force-static"` with `revalidate = 3600` if hourly updates are sufficient.

---

## LOW

### L-01: `void` expressions for destructuring waste in Button.tsx

**File:** `src/components/ui/Button.tsx:114-121, 162-170`
**Severity:** LOW

The Button component destructures props then explicitly `void`s each unused variable. This is verbose -- use `_` prefix convention or rest spread pattern.

### L-02: `BILLING_PERIOD_LABELS` in utils.ts is dead code

**File:** `src/lib/utils.ts:11-21`
**Severity:** LOW

Community billing periods are fari.store remnants. `billingPeriodLabel()` is likely unused.

### L-03: `COUNTRY_OPERATORS` includes `OTHER: []` as empty array

**File:** `src/types/index.ts:1199`
**Severity:** LOW

`getOperatorsForCountry("OTHER")` returns an empty array, which means no payment method is available. If a user selects "Autre" country, they see no operators. This is by design but could use a user-facing message.

### L-04: Toast duration too short for error messages

**File:** `src/contexts/ToastContext.tsx:26`
**Severity:** LOW

`TOAST_DURATION = 3000` (3 seconds) for ALL toast types. Error messages with actionable content ("Trop de tentatives, attends 10 minutes") may need more reading time.

**Fix:** Use 3s for success, 5s for error.

### L-05: Missing error boundary at route group level

**File:** `src/app/(public)/layout.tsx`
**Severity:** LOW

The public layout has no `error.tsx`. The root `error.tsx` catches everything, but a route-group-level error boundary would preserve the public navbar/footer chrome.

### L-06: `lh3.googleusercontent.com` in next.config.ts image patterns

**File:** `next.config.ts:44-46`
**Severity:** LOW

Google user content domain is allowed for images, but the project uses no Google auth (explicitly forbidden in CLAUDE.md). This is a fari.store remnant.

### L-07: `dicebear.com` in image remote patterns

**File:** `next.config.ts:54-56`
**Severity:** LOW

DiceBear avatar API is allowed but likely unused in cagnottes.sn.

### L-08: Missing `<Suspense>` boundaries for `useSearchParams()`

**File:** `src/app/(public)/c/[slug]/merci/page.tsx:34`
**Severity:** LOW

`useSearchParams()` requires a `<Suspense>` boundary in Next.js 16 to avoid client-only rendering. The merci page is already `"use client"` but the parent `merci/layout.tsx` should wrap it.

### L-09: `api.dicebear.com` and `google` in CSP connect-src

**File:** `next.config.ts:99`
**Severity:** LOW

CSP connect-src allows connections to Google OAuth, Facebook, TikTok analytics, Google Analytics -- all of which are not used by cagnottes.sn. These are fari.store CSP rules that should be trimmed.

### L-10: `driver.js` CSS overrides for product tour

**File:** `src/app/globals.css:564-606`
**Severity:** LOW

CSS overrides for `driver.js` (product tour library) exist but `driver.js` is not in `package.json` dependencies. Dead CSS from fari.store.

---

## INFO

### I-01: Excellent French string extraction

All user-facing text is properly extracted into `src/lib/constants.ts` with named exports. Zero hardcoded French strings detected in JSX outside of comments. This is exemplary i18n readiness.

### I-02: Good sanitization defense-in-depth

The dual sanitization approach (backend ingest + frontend render) with `sanitize-html` is well-implemented. The `sanitize.ts` module is clean and focused.

### I-03: Solid auth flow architecture

Cookie-only auth with CSRF double-submit, refresh token lock to prevent concurrent refreshes, AbortController timeouts on refresh calls, and server-side `requireSellerMe()` for authed routes. Well-audited.

### I-04: Good use of `prefers-reduced-motion`

All custom animations respect `prefers-reduced-motion: reduce` via the global CSS rule at `globals.css:554-562`.

### I-05: Proper `noValidate` on forms with custom validation

The ParticiperForm correctly uses `noValidate` on the `<form>` element to prevent browser default validation UI, relying instead on custom validation with French error messages.

### I-06: Theme contrast utilities are thorough

The `ensureContrast()` function implements proper WCAG 2.x luminance calculation with gamma correction. Good accessibility engineering.

### I-07: Commission module is correctly zero-dependency (Ring 0)

`src/lib/commission.ts` maintains the documented "no imports" invariant and mirrors the backend implementation.

### I-08: Good use of `role="toolbar"` in RichTextEditor

The editor toolbar has proper `role="toolbar"` and `aria-label` attributes, with `aria-pressed` on toggle buttons.

---

## Summary Table

| Severity | Count | Key Areas |
|----------|-------|-----------|
| CRITICAL | 2     | XSS defense fragility, unnecessary auth calls on public pages |
| HIGH     | 6     | Dead code, cache leak, polling bug, CSP weakness |
| MEDIUM   | 12    | Image optimization, session storage, code duplication, a11y |
| LOW      | 10    | Cleanup, fari.store remnants, minor UX |
| INFO     | 8     | Positive patterns worth preserving |

**Priority recommendation:** Address CR-01 and CR-02 first, then H-04 (polling bug) and H-05 (CSP). The dead code cleanup (H-01, H-02) can be batched in a dedicated cleanup phase.
