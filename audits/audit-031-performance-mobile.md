# Audit 031 — Mobile Performance & Bundle Weight

**Date**: 2026-04-16
**Scope**: Frontend performance for 3G Senegalese mobile users (375px, 300-500kbps)
**Reviewer**: Claude (performance audit)

---

## Executive Summary

The codebase is reasonably well-structured for mobile: server components are used for SEO-critical pages, the public cagnotte detail page is fully SSR, and there are no massive third-party analytics scripts loaded. However, there are **5 critical** and **8 high-severity** issues that significantly inflate the JavaScript payload and degrade Time to Interactive on 3G connections.

The two biggest wins are: (1) moving `sanitize-html` (~100KB) to server-only, and (2) using `next/image` instead of raw `<img>` tags for R2-hosted images, which would enable automatic WebP/AVIF conversion and responsive `srcset`.

---

## Findings

### CRITICAL — Must fix for 3G usability

#### PERF-01: `sanitize-html` (~100KB gzipped) ships to the client bundle

**Files:** `src/lib/sanitize.ts`, `src/app/(public)/c/[slug]/page.tsx`, `src/components/ui/RichTextEditor.tsx`

`sanitize-html` is imported in `src/lib/sanitize.ts` which is consumed by:
1. `src/app/(public)/c/[slug]/page.tsx` — a **Server Component** (good, no client cost here)
2. `src/components/ui/RichTextEditor.tsx` — a `"use client"` component that imports `stripHtml` from `@/lib/sanitize`

Because `RichTextEditor.tsx` imports from `@/lib/sanitize`, the entire `sanitize-html` library (~100KB minified + gzipped, with htmlparser2 transitive dependency ~60KB) is pulled into the client bundle. The RichTextEditor only uses `stripHtml()` for character counting.

**Impact:** ~160KB added to every page that loads RichTextEditor (all cagnotte creation/edit flows).

**Fix:**
```ts
// src/lib/sanitize-client.ts — lightweight client-only HTML stripping
export function stripHtml(html: string): string {
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  }
  // Fallback regex for SSR (not security-critical — just character counting)
  return html.replace(/<[^>]*>/g, "").trim();
}
```
Then update `RichTextEditor.tsx` to import from `@/lib/sanitize-client` instead of `@/lib/sanitize`. Keep the real `sanitize-html` import only in `src/lib/sanitize.ts` which is consumed by server components.

**Severity:** CRITICAL

---

#### PERF-02: TipTap rich text editor (~200KB) is not lazy-loaded

**Files:** `src/components/ui/RichTextEditor.tsx`, any page that imports it

`@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-link` together are ~200KB gzipped. They are statically imported in `RichTextEditor.tsx`. Any page that renders this component pays the full cost upfront, even if the user hasn't scrolled to the editor yet.

**Impact:** ~200KB on cagnotte creation pages (authed flows). Not on public pages (good).

**Fix:**
```tsx
// In pages that use RichTextEditor, use next/dynamic:
import dynamic from "next/dynamic";
const RichTextEditor = dynamic(
  () => import("@/components/ui/RichTextEditor").then(m => ({ default: m.RichTextEditor })),
  { ssr: false, loading: () => <div className="min-h-40 animate-pulse rounded-lg border bg-muted" /> }
);
```

**Severity:** CRITICAL (for creator flow pages)

---

#### PERF-03: No `next/image` on public pages — no responsive images, no WebP/AVIF

**Files:**
- `src/app/(public)/c/[slug]/page.tsx` (line 326-331: seller avatar)
- `src/components/cagnottes/CagnotteMediaViewer.tsx` (lines 157-163: main cover, lines 222-229: thumbnails)
- `src/app/(public)/_home/_PublicCampaignsList.tsx` (lines 112-116: campaign cards)
- `src/app/(public)/_home/_FeaturesPink.tsx` (lines 25-48: payment logos)
- `src/app/(public)/c/[slug]/paiement/page.tsx` (6 occurrences: operator logos, cover)

All images on the critical public path use raw `<img>` tags with `eslint-disable @next/next/no-img-element`. This means:
- **No automatic WebP/AVIF conversion** — R2-hosted PNGs/JPEGs are served as-is
- **No responsive `srcset`** — a 1200x630 cover image is downloaded at full resolution on a 375px phone
- **No lazy loading optimization** by Next.js (though manual `loading="lazy"` is set on some)
- **No blur placeholder** for perceived performance

On a 3G connection downloading a 200KB JPEG cover image takes ~4 seconds. With `next/image` + WebP, this drops to ~1.5s.

**Fix:** Replace `<img>` with `<Image>` from `next/image` on all public pages. Use `sizes` prop:
```tsx
<Image
  src={coverUrl}
  alt={title}
  width={1200}
  height={630}
  sizes="(max-width: 768px) 100vw, 66vw"
  priority={isCover}  // only for above-the-fold hero
  className="h-full w-full object-cover"
/>
```
For the campaign card grid: `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`.

**Note:** `next.config.ts` already has `remotePatterns` for R2 — `next/image` will work with external URLs.

**Severity:** CRITICAL

---

#### PERF-04: `og-default.png` referenced in layout.tsx metadata does not exist

**File:** `src/app/layout.tsx` (line 40)

```ts
images: [{ url: "/og-default.png", width: 1200, height: 630, ... }],
```

The file `public/og-default.png` does not exist on disk. Every page that doesn't override the OG image will have a broken social preview card. This directly impacts virality on WhatsApp/Facebook — the primary sharing channels for Senegalese users.

**Impact:** Broken social previews on homepage, /cagnottes, /aide, /tarifs, all legal pages.

**Fix:** Create `public/og-default.png` (1200x630, <100KB) with the cagnotte.sn branding. Consider generating it with the same `ImageResponse` pattern used in `opengraph-image.tsx`.

**Severity:** CRITICAL (directly impacts growth via social sharing)

---

#### PERF-05: `AuthProvider` wraps entire app including public pages

**File:** `src/app/layout.tsx` (line 62)

`AuthProvider` is a `"use client"` component that wraps the root layout. For anonymous visitors on public pages (the 90% use case — donors), it:
1. Forces the layout to be a client boundary
2. Ships `AuthContext.tsx` + `api.ts` + `useApi.ts` to every page
3. Checks for `izy-csrf` cookie on mount (fast, but unnecessary hydration cost)

The smart cookie-check optimization (audit 030 CR-07) prevents the API call, but the JS bundle cost is paid regardless.

**Impact:** ~15-20KB of auth-related JS on every public page load.

**Fix:** Move `AuthProvider` to the `(authed)` layout only. Public pages that need auth-aware UI (PublicNavbar login/signup buttons) can use a lighter `useOptionalAuth()` that reads the cookie directly without the full AuthContext machinery. Or use a Server Component check (as `_Hero.tsx` already does with `cookies()`).

**Severity:** CRITICAL

---

### HIGH — Significant impact

#### PERF-06: 600+ line globals.css with ~30 keyframe animations

**File:** `src/app/globals.css` (607 lines)

The CSS file contains ~30 `@keyframes` definitions, many from the fari.store fork that are no longer used:
- `wax-slide`, `bg-wax`, `bg-wax-teal` — fari.store Wax patterns (lines 242-255)
- `design-pulse` — fari.store teal pulse (line 261)
- `float-1`, `float-2`, `float-3` — landing page floats (lines 331-345)
- `slide-up-phone` — unused phone animation (line 347)
- `avatar-pulse` — unused teal avatar pulse (line 353)
- `ocean` — unused ocean blobs (line 359)
- `shine` — duplicate of `button-shine-sweep` (line 368)
- `pulse-gold`, `pulse-teal` — unused pulsing effects (lines 375-392)
- `draw`, `flicker` — unused SVG/flame effects (lines 394-410)
- `marquee` — unused horizontal scroll (line 412)
- `.store-theme-root` rules (lines 189-200) — fari.store theme system, dead code
- `.izy-driver-popover` rules (lines 564-607) — driver.js tour, not used in production
- `.country-row`, `.time-slot-btn` rules (lines 516-524) — fari.store form patterns

**Impact:** ~10-15KB of unused CSS shipped to every page. CSS blocks rendering.

**Fix:** Remove all fari.store-era animations and rules. Keep only: `fade-in-up`, `slideUp`, `button-shine-sweep`, `progress-shimmer`, `hero-slide-up`, `hero-gradient-flow`, `top-banner-in/out`, `step-enter/pop`, `shake`, `pageEnter`, `slide-up-bar`. Run a Tailwind purge audit after cleanup.

**Severity:** HIGH

---

#### PERF-07: `PublicNavbar` imports 12 Lucide icons eagerly

**File:** `src/components/layout/PublicNavbar.tsx` (lines 8-19)

```ts
import { Bell, BookOpen, ChevronRight, HandHeart, HelpCircle, Home, Info, LogOut, Menu, User, Wallet, X } from "lucide-react";
```

12 icons imported in a single statement. lucide-react uses named exports so tree-shaking works per-icon (~1.5KB per icon). The 12 icons = ~18KB. However, several are only used in the mobile drawer (which 50%+ of users may never open): `Bell`, `BookOpen`, `ChevronRight`, `HandHeart`, `HelpCircle`, `Home`, `Info`, `LogOut`, `User`, `Wallet`.

lucide-react tree-shakes correctly with named imports, so this is not as bad as importing the full library. But the mobile drawer content could be code-split.

**Impact:** ~12KB of icon JS for drawer-only icons that most visitors never see.

**Fix:** Consider lazy-loading the mobile drawer content. Or accept this as reasonable since lucide-react tree-shakes correctly.

**Severity:** HIGH (downgraded to MEDIUM if drawer usage is high)

---

#### PERF-08: `CookieBanner` loads on every public page visit

**File:** `src/components/layout/CookieBanner.tsx`, `src/app/(public)/layout.tsx`

The `CookieBanner` is a `"use client"` component that mounts on every page load, reads localStorage, and conditionally renders. For returning users (who already accepted/rejected), it still incurs:
- Component hydration cost
- localStorage read on mount
- Render cycle before bail-out

**Impact:** ~3KB JS + hydration cost on every public page for returning visitors.

**Fix:** Wrap with `next/dynamic` with `ssr: false`:
```tsx
const CookieBanner = dynamic(() => import("@/components/layout/CookieBanner").then(m => ({ default: m.CookieBanner })), { ssr: false });
```

**Severity:** HIGH

---

#### PERF-09: `LayoutChrome` is a client component just for pathname matching

**File:** `src/app/(public)/LayoutChrome.tsx`

This component exists solely to conditionally hide Footer/PreFooter based on pathname. It's marked `"use client"` because it uses `usePathname()`. This forces `Footer` and `PreFooter` (both server components) to be bundled as client components.

**Impact:** Footer + PreFooter HTML + any client JS for their subtree.

**Fix:** Move the route-specific footer hiding to a server-side check. Since `(public)/layout.tsx` is a server component, create separate layouts for routes that need no footer:
- `(public)/c/[slug]/layout.tsx` — no PreFooter/Footer
- `(public)/c/[slug]/participer/layout.tsx` — hidden on mobile

Or use the `x-pathname` header already set by middleware:
```tsx
// In (public)/layout.tsx — Server Component
import { headers } from "next/headers";
const pathname = (await headers()).get("x-pathname") || "";
const hideChrome = /^\/c\/[^/]+$/.test(pathname);
```

**Severity:** HIGH

---

#### PERF-10: `TopBannerHost` client component with timer-based animation state

**File:** `src/app/(public)/TopBannerHost.tsx`

A `"use client"` wrapper that manages enter/close animation states. Renders on every public page load. The banner itself is a marketing nudge ("Lance ta cagnotte en 2 minutes") that appears on every visit (no persistence).

**Impact:** ~2KB client JS + hydration for a marketing banner.

**Fix:** Consider persisting the dismiss state in localStorage (like CookieBanner does) so returning visitors don't see it repeatedly. Also consider making it a pure CSS animation without JS state management.

**Severity:** HIGH

---

#### PERF-11: No image optimization configuration in `next.config.ts`

**File:** `next.config.ts`

Missing image optimization settings:
```ts
images: {
  formats: ['image/avif', 'image/webp'],  // MISSING — defaults to webp only
  deviceSizes: [375, 640, 750, 828, 1080, 1200],  // MISSING
  imageSizes: [16, 32, 48, 64, 96, 128, 256],  // MISSING
  minimumCacheTTL: 60 * 60 * 24 * 30,  // MISSING — 30 day cache
}
```

Even if `next/image` were used, without `formats: ['image/avif', 'image/webp']`, Next.js 16 defaults to WebP only. AVIF is 20-30% smaller than WebP — meaningful on 3G.

**Fix:** Add the configuration above.

**Severity:** HIGH

---

#### PERF-12: No `Cache-Control` on static assets in `next.config.ts`

**File:** `next.config.ts` `headers()` function

The security headers apply to all routes `(.*)` but there are no caching headers for static assets. Next.js handles `/_next/static/*` automatically, but public directory assets (`/wave.png`, `/orange-money.png`, etc.) get no explicit `Cache-Control`.

**Fix:** Add to headers():
```ts
{
  source: "/:path*.(png|jpg|jpeg|svg|webp|avif|ico|woff2)",
  headers: [
    { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
  ],
},
```

**Severity:** HIGH

---

#### PERF-13: CSP allows extensive third-party scripts that are not loaded

**File:** `next.config.ts` (lines 94-100)

The CSP `script-src` allows:
- `https://accounts.google.com` — Google Auth was removed
- `https://connect.facebook.net` — No Facebook SDK loaded
- `https://www.googletagmanager.com` — No GTM loaded
- `https://www.google-analytics.com` — No GA loaded
- `https://googleads.g.doubleclick.net` — No Google Ads
- `https://www.googleadservices.com` — No Google Ads
- `https://analytics.tiktok.com` — No TikTok Pixel

No third-party analytics scripts are actually loaded (confirmed by grep). The CSP is a fari.store leftover. While this doesn't add bytes to the page, it widens the attack surface unnecessarily.

**Fix:** Tighten CSP to `script-src 'self' 'unsafe-inline'` only. Add back specific domains when analytics are actually integrated.

**Severity:** HIGH (security + signal of unclean fork state)

---

### MEDIUM

#### PERF-14: `ProgressPoll` polls every 20s unconditionally on cagnotte detail page

**File:** `src/app/(public)/c/[slug]/ProgressPoll.tsx`

The component polls `/api/cagnottes/:slug` every 20 seconds. This is fine on WiFi but on 3G, each poll is a ~500ms-1s request that competes with user-initiated navigation. The full cagnotte detail payload is fetched (not just progress).

**Fix:** Consider a lighter endpoint (just `{totalRaised, donorCount}`) or increase the interval to 60s. Also, stop polling after `status === "closed"`.

**Severity:** MEDIUM

---

#### PERF-15: Dead public directory assets (~1.5MB of fari.store logos)

**File:** `public/logo/` (916KB), various unused images

- `public/logo/` — 916KB of Izy.store logos (1x PNG + SVG variants). Not referenced anywhere in cagnottes.sn.
- `public/izy-store-og-green.png` — 27KB, fari.store OG image
- `public/brevo.png`, `public/systemeio.png`, `public/telegram.jpeg` — integration logos no longer used
- `public/mobicash.png`, `public/moov.png`, `public/mtn_money.png`, `public/togocell.png` — operators not available in Senegal
- `public/visa-mastercard.png` — card payments dropped in v1

**Impact:** ~1.5MB of dead files in the repo. Not served unless directly requested, but pollutes deploys and git history.

**Fix:** Delete all unused assets. Keep only: `wave.png`, `orange-money.png`, `free-money.png`, `maxit.png`, `apple-touch-icon.png`, `icon-*.png`, `favicon.ico`, `testimonial/` (used), SVGs if referenced.

**Severity:** MEDIUM

---

#### PERF-16: `RotatingHeadline` client component on homepage hero

**File:** `src/app/(public)/_home/_RotatingHeadline.tsx`

A `"use client"` component that cycles text every 3 seconds with animation. The hero section (`_Hero.tsx`) is a server component but includes this client island. This is actually the correct pattern (client island in server page). However:

- The `will-change-transform` class is set permanently, which reserves GPU memory
- The `aria-live="polite"` on a 3s rotation will overwhelm screen readers

**Fix:**
- Remove `will-change-transform` (the animation is short enough not to need GPU hints)
- Change `aria-live="polite"` to `aria-live="off"` or remove it — decorative rotating text should not be announced

**Severity:** MEDIUM

---

#### PERF-17: No code splitting — `next/dynamic` is not used anywhere

**Files:** Entire `src/` directory

Grep confirms zero uses of `next/dynamic`, `React.lazy`, or dynamic `import()` in the frontend codebase. Every component is statically imported. Heavy components that should be lazy-loaded:

| Component | Size est. | Used on |
|-----------|-----------|---------|
| `RichTextEditor` (TipTap) | ~200KB | Create/edit cagnotte |
| `GalleryBuilder` | ~15KB | Create/edit cagnotte |
| `ImageUpload` | ~8KB | Create/edit, KYC, profile |
| `Calendar`/`DatePicker` | ~12KB | Create cagnotte |
| `Combobox` | ~8KB | Forms |
| `CagnotteMediaViewer` | ~5KB | Cagnotte detail |
| `ShareSheet` | ~4KB | Detail + merci pages |
| `CookieBanner` | ~3KB | All public pages |

**Fix:** Use `next/dynamic` with `{ ssr: false }` for all interactive-only components that are not above the fold.

**Severity:** MEDIUM (most heavy components are on authed pages, not the critical donor path)

---

### LOW

#### PERF-18: Poppins font loads 4 weights (400, 500, 600, 700)

**File:** `src/app/layout.tsx` (lines 12-15)

```ts
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});
```

Each weight is ~20KB (woff2). 4 weights = ~80KB of fonts. The codebase mostly uses `font-bold` (700) and `font-black` (which maps to 900 — not even loaded, so the browser synthesizes it). Weight 400 and 500 are rarely used for headings.

`next/font/google` handles subsetting and self-hosting well (no FOIT issues). But 4 weights is still heavy for 3G.

**Fix:** Reduce to `weight: ["600", "700"]` which covers the vast majority of heading usage. The `font-black` class should map to 700 with `font-weight: 800` or be adjusted.

**Severity:** LOW

---

#### PERF-19: `@tailwindcss/typography` adds ~10KB of CSS

**File:** `package.json`, `src/app/globals.css`

The `prose` class from `@tailwindcss/typography` is used only on the cagnotte description and RichTextEditor. It adds extensive CSS rules for all typographic elements. With Tailwind v4's JIT, unused rules should be purged, but the plugin adds base styles that may survive.

**Fix:** Acceptable for now. If bundle analysis shows significant unused prose CSS, consider replacing with hand-rolled styles for the 5 allowed tags (`p`, `strong`, `em`, `a`, `br`).

**Severity:** LOW

---

#### PERF-20: `HomeFeaturesPink` is a client component for a simple toggle

**File:** `src/app/(public)/_home/_FeaturesPink.tsx`

This component is `"use client"` solely for the Plaisir/Soutenir tab toggle. The toggle swaps content but both content sets are known at build time. The animation uses `key={mode}` to remount with CSS animation.

**Impact:** ~5KB of JS for a simple tab that could be done with CSS-only (`:target` or radio hack), though the current approach is cleaner.

**Fix:** Accept as-is. The toggle interaction genuinely needs client JS. Alternative: render both panels and use CSS `hidden`/visible toggle.

**Severity:** LOW

---

### INFO

#### PERF-21: `next/image` IS used on 2 authed pages but not on any public page

**Files:** `src/app/(authed)/retraits/_AmountStep.tsx`, `src/app/(authed)/profil/coordonnees-bancaires/_BankForm.tsx`

The team is aware of `next/image` (it's imported in 2 authed-area files) but all 27 `eslint-disable @next/next/no-img-element` comments on public pages suggest a deliberate choice. This may have been done to avoid layout shift with dynamic R2 URLs, but `next/image` handles this with `fill` or explicit dimensions.

**Severity:** INFO

---

#### PERF-22: No third-party analytics scripts loaded (good)

No Google Analytics, Facebook Pixel, TikTok Pixel, or any other third-party tracking script is loaded. This is excellent for 3G performance. The CSP allows them (PERF-13) but no actual `<script>` tags exist.

**Severity:** INFO (positive finding)

---

#### PERF-23: Server rendering is correctly used for SEO pages (good)

The homepage, cagnotte detail (`/c/[slug]`), and campaign list (`/cagnottes`) are all server-rendered with proper metadata. `force-dynamic` ensures fresh data. Client components are used as islands for interactivity only. The pattern is correct.

**Severity:** INFO (positive finding)

---

#### PERF-24: `api.ts` has proper timeout and offline detection (good)

**File:** `src/lib/api.ts`

The `api()` wrapper includes:
- 30s AbortController timeout (prevents hanging on 3G)
- Offline detection via `navigator.onLine`
- French error messages for network issues
- No retry on POST (prevents duplicate orders)

This is well-designed for flaky 3G connections.

**Severity:** INFO (positive finding)

---

## Priority Action Plan

### Phase A — Quick wins (< 1 day, biggest impact)

| # | Finding | Est. savings | Effort |
|---|---------|-------------|--------|
| 1 | PERF-01: Move `sanitize-html` to server-only | ~160KB JS | 30 min |
| 2 | PERF-06: Clean globals.css dead animations | ~10KB CSS | 1 hour |
| 3 | PERF-15: Delete dead public/ assets | ~1.5MB disk | 15 min |
| 4 | PERF-04: Create og-default.png | 0 (fixes bug) | 30 min |
| 5 | PERF-12: Add Cache-Control for static assets | 0 (cache hit) | 15 min |
| 6 | PERF-13: Tighten CSP | 0 (security) | 15 min |

### Phase B — Medium effort (1-2 days, high impact)

| # | Finding | Est. savings | Effort |
|---|---------|-------------|--------|
| 7 | PERF-03: Switch to `next/image` on public pages | 30-50% image bytes | 4 hours |
| 8 | PERF-11: Image optimization config | Enables AVIF | 15 min |
| 9 | PERF-05: Move AuthProvider out of root layout | ~15KB JS | 2 hours |
| 10 | PERF-09: Make LayoutChrome server-side | ~5KB JS | 1 hour |
| 11 | PERF-08: Lazy-load CookieBanner | ~3KB JS | 15 min |

### Phase C — Larger refactors (2-3 days)

| # | Finding | Est. savings | Effort |
|---|---------|-------------|--------|
| 12 | PERF-02: Lazy-load TipTap editor | ~200KB JS (creator pages) | 1 hour |
| 13 | PERF-17: Add code splitting across app | Varies | 4 hours |
| 14 | PERF-18: Reduce Poppins weights | ~40KB fonts | 30 min |

---

## Estimated Total Savings

| Category | Current (est.) | After fixes (est.) | Savings |
|----------|---------------|-------------------|---------|
| JS bundle (public pages) | ~350KB | ~180KB | ~170KB (~49%) |
| CSS (all pages) | ~45KB | ~35KB | ~10KB |
| Fonts | ~100KB | ~60KB | ~40KB |
| Images (per page, avg) | ~400KB | ~200KB | ~200KB (WebP/AVIF) |
| **Total first load (3G)** | **~895KB** | **~475KB** | **~420KB (~47%)** |

At 400kbps, this reduces first meaningful paint from ~18s to ~10s.

---

_Reviewed: 2026-04-16_
_Reviewer: Claude (performance audit)_
_Depth: deep_
