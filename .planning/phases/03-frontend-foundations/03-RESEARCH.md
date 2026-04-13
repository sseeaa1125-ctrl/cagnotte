# Phase 3: Frontend Foundations — Research

**Researched:** 2026-04-13
**Domain:** Next.js 16 App Router + Tailwind v4 + React 19 — design system foundations
**Confidence:** HIGH (stack is installed, conventions are locked, zero new deps needed)

## Summary

Phase 3 builds the entire frontend foundation on top of the near-empty skeleton left after the fari.store purge. The goal is to ship the **navy/pink theme + Poppins+Inter fonts + format/util helpers + 18 UI primitives + 13 composed domain blocks** with zero pages touched. Everything Phase 4 (revenue path), Phase 5 (auth+creator) and Phase 6 (money) will later assemble must already exist in `src/components/**` when Phase 3 exits.

The project is a mid-scope **extension** of an existing codebase, not greenfield. The critical constraints are: (1) **zero new runtime dependencies** — every primitive must be built from `react`, `lucide-react`, `clsx`, `tailwind-merge` which are already installed; (2) **Tailwind v4 `@theme` only** — no `tailwind.config.ts` exists or should be created; (3) **strict ring discipline** — Ring 1 (`src/components/ui/*`) must not import `api()`, `useApi()`, `AuthContext`, or `constants`; Ring 2 (`src/components/<domain>/*`) may import Ring 1 + format helpers + constants but still no data-fetching; Ring 3 (pages, Phase 4+) owns all I/O and passes data down as props. The grep-based purity check is the only automated enforcement — design it correctly and the ring model survives the whole project.

**Primary recommendation:** Split the phase into three atomic plans (foundation → primitives → composed blocks). Land Poppins + `@theme` tokens + `format.ts` first with a fixture-harness dev route (`/_dev/foundations`) so that every subsequent primitive can be visually regression-checked against a single page. Enforce ring-1 purity via a shell grep wired into each plan's verification step (not just a one-shot at the end). Do not add Storybook, react-hook-form, framer-motion, date-fns, or zod — each one of these is explicitly ruled out by `research/SUMMARY.md`.

## User Constraints (from CONTEXT.md)

**No CONTEXT.md exists for Phase 3 yet.** The planner should treat the following as **de-facto locked decisions** from `.planning/banani/STATUS.md` (2026-04-13 decisions) + `.planning/ROADMAP.md` Phase 3 block + `CLAUDE.md`:

### Locked Decisions

1. **Brand tokens:** Navy `#172866` primary, pink `#FBE6ED` accent, navy-hover `#121F4E`, footer `#0E1A40`. Adopt Banani `/style.css` verbatim. CLAUDE.md's old teal-600/amber-500 is superseded by the 2026-04-13 STATUS.md decision #1.
2. **Fonts:** Poppins (headings) + Inter (body) via `next/font/google`. Inter is already loaded; Poppins is additive. Zero `npm install`.
3. **Payment provider label in UI:** **Bictorys**, not PayDunya. The Banani footer "PayDunya" copy is wrong — it gets rewritten in every primitive that references it. Log in FRONTEND-DEVIATIONS.md.
4. **Currency / phone prefix:** FCFA integers (no decimals), `+221` Senegal prefix. Banani exported `€` + `+33` — every occurrence is translated at the primitive layer.
5. **Commission label copy:** Banani says "Offerts" — this is a lie. The correct copy is `"6% solidaire · 8% festive"` at the primitive/constants layer, and `"6% · 300 FCFA"` at the runtime-computed checkout layer (Phase 4). Phase 3 ships only the **label copy**, not the computation.
6. **Social login:** Signup/login Google/Apple/Facebook CTAs are **hidden** in v1 but the `Button` `social` variant **is built** (so Phase 5 can unhide them via feature flag with zero code change). Decision #4.
7. **Mobile strategy:** Mobile-adapt in code. Every component starts at 375px base classes, `md:`/`lg:` for desktop. No separate mobile Banani export will be provided. Decision #3.
8. **Block subtype model:** Single `FUNDRAISER` block type with `subtype: 'festive' | 'solidaire'` — Phase 3 must expose `Badge` variants `festive` / `solidaire` matching this shape.
9. **Ring discipline:** Ring 1 = `src/components/ui/*` primitives, Ring 2 = `src/components/<domain>/*` composed blocks, Ring 3 = pages. Enforced by grep.

### Claude's Discretion

- Internal prop API of each primitive (as long as it matches the Banani visual).
- File layout under `src/components/` beyond the 6 domain folders (`layout/`, `cagnottes/`, `checkout/`, `share/`, `notifications/`, `trust/`).
- Exact shape of the fixture harness route (recommendation: single client component at `src/app/_dev/foundations/page.tsx` gated by `process.env.NODE_ENV`).
- How format helpers split between `src/lib/utils.ts` and `src/lib/format.ts` (recommendation: move `formatPrice` out of `utils.ts`, see §4).

### Deferred Ideas (OUT OF SCOPE)

- Any page-level work (`src/app/**/page.tsx` stays placeholder).
- Data fetching in components (Rings 1 and 2 are pure presentational).
- OAuth wiring (social buttons are JSX-only).
- Legal/TOS copy (placeholder French strings go in `constants.ts`; real copy is Phase 6+).
- Mobile-specific Banani exports (do not exist; adapt in code).
- Storybook, react-hook-form, framer-motion, date-fns — every one of these is explicitly ruled out in `research/SUMMARY.md` ("zero new runtime deps").

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FNDN-01 | Poppins headings + Inter body via `next/font/google` | §2 — code snippet + CSS variable mapping |
| FNDN-02 | Tailwind v4 `@theme` block with navy/pink/radii from Banani | §1 — full `@theme` snippet + token table |
| FNDN-03 | `src/lib/utils.ts` exports `cn()` helper | §4 — already present, no change needed |
| FNDN-04 | `src/lib/format.ts` with `formatPrice`, `formatPhone(+221)`, `formatRelativeTime` | §3 — complete implementations w/ edge cases |
| FNDN-05 | `src/lib/constants.ts` centralizes all French labels | §5 — exhaustive label list for 31 components |
| PRIM-01 | `Button` with `primary`/`outline`/`ghost`/`social`, ≥48px | §6 — prop API + breakpoint example in §14 |
| PRIM-02 | `Input` + `Textarea` (label/error/helper/counter/password eye) | §6 — prop API |
| PRIM-03 | `Select`, `DatePicker`, `ImageUpload` | §6 — prop API |
| PRIM-04 | `RadioCard`, `Toggle`, `Checkbox` | §6 — prop API |
| PRIM-05 | `Badge`, `Tabs`, `Pagination` | §6 — prop API + Badge variants match FUNDRAISER subtype |
| PRIM-06 | `Avatar`, `ProgressBar`, `KpiCard` | §6 — prop API |
| PRIM-07 | `EmptyState`, `Modal`, `Toast` | §6 — Toast reuses existing ToastContext |
| PRIM-08 | Ring-1 purity (no `api`/`useApi`/`AuthContext`/`constants` imports) | §7 — grep command + verification script design |
| COMP-01 | Layout blocks: `PublicNavbar`, `DashboardNavbar`, `TopBanner`, `Footer`, `PreFooter` | §8 — file paths + data shape |
| COMP-02 | `CampaignCard` (festive/solidaire variants, progress, CTA) | §8 — pure, props-in |
| COMP-03 | `ShareSheet` (WhatsApp first, FB, Email, Copy) | §8 — uses `navigator.share()` with fallback |
| COMP-04 | `NotificationItem`, `SidebarNav`, `FilterChipBar`, `TrustpilotBadge` | §8 — file paths |
| COMP-05 | `MiniCagnotteCard`, `OrderSummary` (checkout) | §8 — pure, props-in |

---

## File Map — What Phase 3 Creates or Modifies

### Plan 03-01 — Foundation (~8 files, ~400 LOC)

| Path | Action | LOC | Notes |
|------|--------|-----|-------|
| `src/app/globals.css` | **modify** | +50 | Add `@theme` block (see §1). Keep existing `@import "tailwindcss"` + all animations + wax patterns. Remove the 3 legacy teal-only utility classes or keep them — planner decision. |
| `src/app/layout.tsx` | **modify** | +5 | Add Poppins import + variable to `<body>` className (see §2). Update `themeColor` meta from `#0D9488` to `#172866`. |
| `src/lib/utils.ts` | **modify** | -10 | **Remove** `formatPrice` (moved to `format.ts`). Keep `cn`, `isInAppBrowser`, `isTikTokBrowser`, `billingPeriodLabel`. |
| `src/lib/format.ts` | **create** | ~80 | `formatPrice`, `formatPhone`, `formatRelativeTime` (see §3). |
| `src/lib/constants.ts` | **modify** | +120 | Add all French labels for 18 primitives + 13 composed blocks + 9 notification types (see §5). Keep existing `ORDER_TYPE_LABELS`, `PAYMENT_STATUS_LABELS`. |
| `.planning/banani/FRONTEND-DEVIATIONS.md` | **create** | ~60 | Deviation log (§11). |
| `src/app/_dev/foundations/page.tsx` | **create** | ~200 | Fixture harness (§10). Dev-only. |
| `scripts/verify-ring-purity.sh` | **create** | ~40 | Grep enforcement script (§7). |

### Plan 03-02 — 18 UI Primitives (~18 files, ~1,500 LOC)

| # | Component | Path | LOC | Pure R1? | Key props |
|---|-----------|------|-----|----------|-----------|
| 1 | `Button` | `src/components/ui/Button.tsx` | ~130 | ✅ | `variant`, `size`, `loading`, `as`, `iconLeft`, `iconRight` |
| 2 | `Input` | `src/components/ui/Input.tsx` | ~120 | ✅ | `label`, `error`, `helper`, `icon`, `type`, password eye toggle |
| 3 | `Textarea` | `src/components/ui/Textarea.tsx` | ~80 | ✅ | `label`, `error`, `maxLength` (counter shown `N/max`) |
| 4 | `Select` | `src/components/ui/Select.tsx` | ~70 | ✅ | `options: {value,label}[]`, `label`, `error` |
| 5 | `DatePicker` | `src/components/ui/DatePicker.tsx` | ~60 | ✅ | Native `<input type="date">` styled, `min`, `max`, clear |
| 6 | `ImageUpload` | `src/components/ui/ImageUpload.tsx` | ~140 | ✅ | Drag-drop zone, JPG/PNG accept, preview, filename, `onChange(File)` |
| 7 | `RadioCard` | `src/components/ui/RadioCard.tsx` | ~70 | ✅ | `name`, `value`, `checked`, `icon`, `title`, `description` |
| 8 | `Toggle` | `src/components/ui/Toggle.tsx` | ~50 | ✅ | `checked`, `onChange`, `label` |
| 9 | `Checkbox` | `src/components/ui/Checkbox.tsx` | ~50 | ✅ | `checked`, `onChange`, `label` (accepts ReactNode for TOS link) |
| 10 | `Badge` | `src/components/ui/Badge.tsx` | ~50 | ✅ | `variant: 'festive'\|'solidaire'\|'status-active'\|'status-ended'\|'default'` |
| 11 | `Tabs` | `src/components/ui/Tabs.tsx` | ~60 | ✅ | `tabs: {value,label,count?}[]`, `value`, `onChange` (chip-style) |
| 12 | `Pagination` | `src/components/ui/Pagination.tsx` | ~80 | ✅ | `page`, `pageCount`, `onChange` — numeric w/ ellipsis |
| 13 | `Avatar` | `src/components/ui/Avatar.tsx` | ~70 | ✅ | `src`, `name` (initials fallback), `size`, `editable?` overlay |
| 14 | `ProgressBar` | `src/components/ui/ProgressBar.tsx` | ~60 | ✅ | `value` 0-100, `label?`, `color?` |
| 15 | `KpiCard` | `src/components/ui/KpiCard.tsx` | ~70 | ✅ | `icon`, `label`, `value`, `trend?` |
| 16 | `EmptyState` | `src/components/ui/EmptyState.tsx` | ~60 | ✅ | `icon`, `title`, `description`, `cta?: ReactNode` |
| 17 | `Modal` | `src/components/ui/Modal.tsx` | ~150 | ✅ | `open`, `onClose`, `title`, focus trap, Esc, backdrop, scroll lock |
| 18 | `Toast` | `src/components/ui/Toast.tsx` | ~30 | ✅ | **Reuses existing `ToastContext`**. Export `useToast()` re-export or skip this file entirely and treat ToastContext as the primitive. |
| — | `src/components/ui/index.ts` | barrel | ~30 | — | Re-exports all primitives |

**Critical:** Every primitive imports **only** from `react`, `lucide-react`, `@/lib/utils` (`cn`), and — for internal types — nothing else. No `@/lib/api`, no `@/lib/useApi`, no `@/lib/constants`, no `@/contexts/AuthContext`.

### Plan 03-03 — 13 Composed Blocks (~13 files, ~1,300 LOC)

| # | Block | Path | LOC | Pure? | Primitives used | Data shape if any |
|---|-------|------|-----|-------|-----------------|-------------------|
| 1 | `PublicNavbar` | `src/components/layout/PublicNavbar.tsx` | ~90 | ✅ pure | `Button` | — (static nav links from `constants`) |
| 2 | `DashboardNavbar` | `src/components/layout/DashboardNavbar.tsx` | ~140 | ⚠️ | `Button`, `Avatar`, `Badge` | `{unreadCount: number, seller: {displayName, avatarUrl}}` — parent passes, no hook |
| 3 | `TopBanner` | `src/components/layout/TopBanner.tsx` | ~60 | ✅ | `Button` | `{message, ctaLabel?, ctaHref?, onClose}` |
| 4 | `Footer` | `src/components/layout/Footer.tsx` | ~120 | ✅ | — | — (static, Senegal legal placeholders) |
| 5 | `PreFooter` | `src/components/layout/PreFooter.tsx` | ~80 | ✅ | `Button` | — (static CTA strip) |
| 6 | `SidebarNav` | `src/components/layout/SidebarNav.tsx` | ~80 | ✅ | — | `{items: {label,href,icon,active?}[]}` |
| 7 | `CampaignCard` | `src/components/cagnottes/CampaignCard.tsx` | ~130 | ✅ | `Badge`, `ProgressBar`, `Button` | `{cagnotte: {slug, title, coverUrl, subtype, raised, goal, donorCount, endDate?}}` |
| 8 | `FilterChipBar` | `src/components/cagnottes/FilterChipBar.tsx` | ~70 | ✅ | `Tabs` (or raw chips) | `{filters: {value,label,count?}[], value, onChange}` |
| 9 | `MiniCagnotteCard` | `src/components/checkout/MiniCagnotteCard.tsx` | ~80 | ✅ | `ProgressBar` | `{cagnotte: {title, coverUrl, raised, goal, subtype}}` |
| 10 | `OrderSummary` | `src/components/checkout/OrderSummary.tsx` | ~120 | ✅ | `Badge` | `{amount, subtype, commissionBp, commissionAmount, netAmount}` |
| 11 | `ShareSheet` | `src/components/share/ShareSheet.tsx` | ~150 | ✅ | `Button` | `{url, title, description?}` — uses `navigator.share()` if available, always shows WA/FB/Email/Copy buttons |
| 12 | `NotificationItem` | `src/components/notifications/NotificationItem.tsx` | ~110 | ✅ | `Avatar` or icon | `{notification: {id, type, title, subtitle?, createdAt, isRead}}` |
| 13 | `TrustpilotBadge` | `src/components/trust/TrustpilotBadge.tsx` | ~60 | ✅ | — | `{rating: number, reviewCount?: number}` (hardcoded stub for v1) |

**Dashboard note:** `DashboardNavbar` is the only block that looks data-aware because the bell shows an unread count. Keep it **pure**: the parent page (Phase 5) will call `useApi('/api/notifications/count')` and pass the number down. This preserves ring-2 purity.

---

## §1 — Tailwind v4 `@theme` Block

Tailwind v4 reads custom properties from `@theme` directly — no `tailwind.config.ts` required. Any CSS variable declared inside `@theme { ... }` becomes available as a utility class: `--color-primary` → `text-primary`, `bg-primary`, `border-primary`. This is a fundamental difference from Tailwind v3. [VERIFIED: existing `src/app/globals.css` already uses `@theme inline { --font-sans: var(--font-inter) }`]

### Token mapping table

| Banani CSS variable | Hex | Tailwind v4 `@theme` property | Utility class examples |
|---------------------|-----|-------------------------------|------------------------|
| `--color-background` | `#FFFFFF` | `--color-background` | `bg-background`, `text-background` |
| `--color-foreground` / primary | `#172866` | `--color-primary` | `bg-primary`, `text-primary`, `border-primary` |
| `--color-primary-hover` | `#121F4E` | `--color-primary-hover` | `hover:bg-primary-hover` |
| `--color-primary-foreground` | `#FFFFFF` | `--color-primary-foreground` | `text-primary-foreground` |
| `--color-muted` | `#F4F6F9` | `--color-muted` | `bg-muted` |
| `--color-muted-foreground` | `#5C6784` | `--color-muted-foreground` | `text-muted-foreground` |
| `--color-accent` (subtle green) | `#E6F3EE` | `--color-accent` | `bg-accent` |
| `--color-pink-section` | `#FBE6ED` | `--color-pink` | `bg-pink`, `text-pink` |
| `--color-border` | `#E2E8F0` | `--color-border` | `border-border` |
| `--color-trustpilot` | `#00B67A` | `--color-trustpilot` | `text-trustpilot` |
| `--color-footer` | `#0E1A40` | `--color-footer` | `bg-footer` |
| `--color-gold-start` | `#D8A57D` | `--color-gold-start` | `from-gold-start` (gradient) |
| `--color-gold-end` | `#C47A57` | `--color-gold-end` | `to-gold-end` |
| `--radius-sm` | `0.25rem` | `--radius-sm` | `rounded-sm` |
| `--radius-md` | `0.5rem` | `--radius-md` | `rounded-md` |
| `--radius-lg` | `1rem` | `--radius-lg` | `rounded-lg` |
| `--radius-xl` | `1.5rem` | `--radius-xl` | `rounded-xl` |
| `--radius-2xl` | `2.5rem` | `--radius-2xl` | `rounded-2xl` |
| `--font-body` | `Inter` | `--font-sans` (already set) | `font-sans` |
| `--font-headings` | `Poppins` | `--font-headings` | `font-headings` |

### Exact snippet to append to `src/app/globals.css`

```css
@theme inline {
  /* Fonts — Poppins added alongside existing Inter */
  --font-sans: var(--font-inter);
  --font-headings: var(--font-poppins);

  /* Brand — Banani navy + pink (supersedes CLAUDE.md teal) */
  --color-background: #FFFFFF;
  --color-primary: #172866;
  --color-primary-hover: #121F4E;
  --color-primary-foreground: #FFFFFF;
  --color-muted: #F4F6F9;
  --color-muted-foreground: #5C6784;
  --color-accent: #E6F3EE;
  --color-pink: #FBE6ED;
  --color-border: #E2E8F0;
  --color-trustpilot: #00B67A;
  --color-footer: #0E1A40;
  --color-gold-start: #D8A57D;
  --color-gold-end: #C47A57;

  /* Radii — sm/md/lg/xl/2xl from Banani style.css */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
  --radius-2xl: 2.5rem;
}
```

**Placement:** Replace the existing 3-line `@theme inline { --font-sans: ... }` block (lines 8-10 of `globals.css`) with the expanded block above. All other content (animations, wax patterns, store-theme-root overrides, iOS Safari font-size fix) stays untouched.

**Note:** `@theme inline` is Tailwind v4's way of telling the compiler to pick the tokens up as utility classes. The `inline` keyword means "do not emit a `:root` block" — values are inlined at compile time. [CITED: tailwindcss.com/docs/theme — Tailwind v4 docs]

---

## §2 — Poppins via `next/font/google`

Next.js's `next/font/google` is a build-time font optimizer — the font files are self-hosted at build, eliminating an external Google Fonts request. Adding a second font is additive: zero `npm install`.

### Exact `src/app/layout.tsx` change

```tsx
import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { ToastProvider } from "@/contexts/ToastContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const viewport: Viewport = {
  // ...
  themeColor: "#172866", // was "#0D9488"
};

// metadata unchanged

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${poppins.variable} font-sans antialiased bg-background`}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
```

**Key points:**
- `Poppins` requires explicit `weight` (unlike variable fonts like Inter). 400/500/600/700 covers body-bold to H1.
- `variable: "--font-poppins"` exposes the font as a CSS variable the `@theme` block can reference.
- Change `bg-gray-50` → `bg-background` to use the new token.
- `font-sans` stays as the body default; `font-headings` is opt-in on `<h1>`/`<h2>` etc.

**Verification:** `npm run build` must complete without "Failed to download font" errors. If it fails in a locked-down environment, the fallback is a system-UI stack — log the deviation but **don't install `@fontsource/poppins`** (that would breach zero-new-deps).

---

## §3 — `src/lib/format.ts`

Native `Intl` APIs cover all three helpers — no `date-fns` needed. [VERIFIED: `Intl.NumberFormat('fr-FR')` and `Intl.RelativeTimeFormat('fr-FR')` are universally supported in Node 20 + all modern browsers]

```typescript
// src/lib/format.ts

/**
 * Formate un montant en FCFA avec séparateur d'espace fine.
 * formatPrice(15000) → "15 000 FCFA"
 * formatPrice(0) → "0 FCFA"
 * Intl uses U+202F (narrow no-break space) as thousands separator in fr-FR;
 * we normalize to regular space for consistency across WhatsApp/share targets.
 */
export function formatPrice(amount: number): string {
  if (!Number.isFinite(amount)) return "0 FCFA";
  const rounded = Math.floor(amount); // FCFA has no cents, defensive
  const formatted = new Intl.NumberFormat("fr-FR").format(rounded).replace(/\u202F|\u00A0/g, " ");
  return `${formatted} FCFA`;
}

/**
 * Formate un numéro de téléphone sénégalais au format international affichable.
 * formatPhone("221771234567") → "+221 77 123 45 67"
 * formatPhone("771234567")    → "+221 77 123 45 67"
 * formatPhone("+221771234567") → "+221 77 123 45 67"
 * Accepts 9-digit local or 12-digit international. Anything else: return raw.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  let local: string;
  if (digits.length === 9) {
    local = digits;
  } else if (digits.length === 12 && digits.startsWith("221")) {
    local = digits.slice(3);
  } else {
    return raw; // unknown format, caller handles
  }
  // Group: XX XXX XX XX
  const a = local.slice(0, 2);
  const b = local.slice(2, 5);
  const c = local.slice(5, 7);
  const d = local.slice(7, 9);
  return `+221 ${a} ${b} ${c} ${d}`;
}

/**
 * Formate une date en "il y a N minutes/heures/jours" en français.
 * formatRelativeTime(new Date(Date.now() - 7200_000)) → "il y a 2 heures"
 * Future dates → "dans N ..."
 * Sub-minute → "à l'instant"
 */
export function formatRelativeTime(input: Date | string): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < 60) return "à l'instant";

  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

  if (absSec < 3600) {
    return rtf.format(Math.round(diffSec / 60), "minute");
  }
  if (absSec < 86_400) {
    return rtf.format(Math.round(diffSec / 3600), "hour");
  }
  if (absSec < 2_592_000) {
    return rtf.format(Math.round(diffSec / 86_400), "day");
  }
  if (absSec < 31_536_000) {
    return rtf.format(Math.round(diffSec / 2_592_000), "month");
  }
  return rtf.format(Math.round(diffSec / 31_536_000), "year");
}
```

**Edge cases covered:**
- `null`/`undefined` input (phone) → empty string.
- Non-finite numbers (price) → "0 FCFA".
- Unknown phone format → raw passthrough (fail-open; caller may decide).
- Future dates → `Intl.RelativeTimeFormat` emits `"dans N ..."` naturally.
- Sub-minute → `"à l'instant"` hardcoded (Intl would say "dans 0 seconde").

**Test at build time:** `npm run build` proves the file type-checks. A dev smoke in `src/app/_dev/foundations/page.tsx` should render the three helpers with 5-6 inputs each to eyeball output.

---

## §4 — `src/lib/utils.ts` audit + duplication risk

Current file (read 2026-04-13): exports `cn`, `formatPrice`, `billingPeriodLabel`, `isInAppBrowser`, `isTikTokBrowser`. [VERIFIED: `/Users/amadoufall/Desktop/cagnottes-sn/src/lib/utils.ts`]

**Action:** Move `formatPrice` out of `utils.ts` into `format.ts` to avoid a same-signature duplicate. Keep `cn`, `isInAppBrowser`, `isTikTokBrowser` — both audit helpers are heavily used by Phase 4's in-app browser workaround and must not regress. Keep `billingPeriodLabel` for now (dead code from fari.store but harmless; delete in a later cleanup if desired — NOT in Phase 3).

**Import-rewrite impact:** Search for existing `formatPrice` callers.

```bash
grep -rn "formatPrice" src/ --include="*.ts" --include="*.tsx"
```

Current callers at the time of research: `src/lib/utils.ts` (definition only). No caller yet exists because `src/components/` doesn't exist. **Safe to move without migration tax.**

**Post-move `src/lib/utils.ts`:** ~45 LOC (down from 52).

---

## §5 — `src/lib/constants.ts` audit + expansion

Current file has 40 lines covering `ORDER_TYPE_LABELS`, `PAYMENT_STATUS_LABELS`, `STATUS_VARIANTS`, `PERIOD_OPTIONS`, `OPERATOR_LABELS`. [VERIFIED: file read]

**Expand with the following categories** (French only; all text that would otherwise be hardcoded in JSX goes here per FNDN-05):

### Navigation labels (`NAV_LABELS`)
```
accueil: "Accueil"
cagnottes: "Cagnottes"
comment: "Comment ça marche"
apropos: "À propos"
connexion: "Connexion"
inscription: "Inscription"
creerCagnotte: "Créer ma cagnotte"
tableauBord: "Tableau de bord"
mesContributions: "Mes participations"
notifications: "Notifications"
profil: "Mon profil"
seDeconnecter: "Se déconnecter"
```

### Action labels (`ACTIONS`)
```
participer: "Je participe"
partager: "Partager"
copier: "Copier le lien"
copie: "Lien copié !"
modifier: "Modifier"
supprimer: "Supprimer"
annuler: "Annuler"
confirmer: "Confirmer"
enregistrer: "Enregistrer"
continuer: "Continuer"
retour: "Retour"
voirPlus: "Voir plus"
voirTout: "Voir tout"
telecharger: "Télécharger"
envoyer: "Envoyer"
```

### Form labels (`FORM_LABELS`)
```
prenom: "Prénom"
nom: "Nom"
email: "Email"
telephone: "Téléphone"
motDePasse: "Mot de passe"
confirmerMotDePasse: "Confirmer le mot de passe"
titre: "Titre"
description: "Description"
montant: "Montant"
montantObjectif: "Montant à collecter"
dateFin: "Date de fin"
occasion: "Occasion"
cause: "Cause"
beneficiaire: "Bénéficiaire"
message: "Message"
messagePrive: "Garder mon message privé"
donAnonyme: "Faire un don anonyme"
acceptTOS: "J'accepte les conditions générales"
```

### Validation messages (`VALIDATION`)
```
requis: "Ce champ est obligatoire"
emailInvalide: "Email invalide"
telephoneInvalide: "Numéro de téléphone invalide"
motDePasseCourt: "Minimum 8 caractères"
montantInvalide: "Montant invalide"
montantMinimum: "Minimum 500 FCFA"
dateInvalide: "Date invalide"
```

### Empty states (`EMPTY_STATES`)
```
aucuneCagnotte: "Aucune cagnotte pour le moment"
aucuneParticipation: "Vous n'avez pas encore participé à une cagnotte"
aucuneNotification: "Aucune notification"
aucunResultat: "Aucun résultat"
```

### Error states (`ERRORS`)
```
generique: "Une erreur est survenue. Réessayez."
reseau: "Erreur de connexion au serveur"
nonAutorise: "Session expirée. Connectez-vous à nouveau."
tropDeRequetes: "Trop de requêtes. Patientez quelques minutes."
```

### Fundraiser subtype labels (`SUBTYPE_LABELS`)
```
festive: "Festive"
solidaire: "Solidaire"
```

### Occasion / cause option sets (arrays for `Select` / `RadioCard`)
```
OCCASIONS = [
  "Anniversaire", "Mariage", "Pot de départ", "Cadeau commun", "Naissance", "Voyage"
]
CAUSES = [
  "Santé", "Éducation", "Projet solidaire", "Urgence", "Animaux"
]
BENEFICIAIRES = [
  { value: "self", label: "Moi-même" },
  { value: "relative", label: "Un proche" },
  { value: "association", label: "Une association" },
]
```

### Notification type labels (`NOTIF_LABELS`) — matches 9 backend templates from Phase 2
```
DONATION_RECEIVED: "Nouveau don reçu"
DONATION_MESSAGE: "Nouveau message"
MILESTONE_REACHED: "Objectif en vue"
CAGNOTTE_ENDING_SOON: "Votre cagnotte se termine bientôt"
PAYOUT_COMPLETED: "Retrait effectué"
PAYOUT_FAILED: "Retrait échoué"
KYC_APPROVED: "Identité vérifiée"
KYC_REJECTED: "Vérification refusée"
SYSTEM: "Système"
```

### Commission transparency labels (`COMMISSION_LABELS`)
```
festiveLabel: "8% de commission pour les cagnottes festives"
solidaireLabel: "6% de commission pour les cagnottes solidaires"
transparencyNote: "Commission prélevée sur le total collecté"
```

### Misc (`MISC`)
```
devise: "FCFA"
prefixTelephone: "+221"
siteName: "Cagnottes.sn"
```

**Total LOC estimate:** ~140 lines (from current 40). Planner should consider splitting into `constants/` folder if it exceeds ~250 lines later in the project.

---

## §6 — 18 UI Primitives: TypeScript prop signatures

One-line TypeScript signatures. These are the **contract** Phase 3 ships; Phase 4-6 pages consume them as-is.

```typescript
// 1. Button
interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: 'primary' | 'outline' | 'ghost' | 'social';
  socialProvider?: 'google' | 'apple' | 'facebook' | 'whatsapp' | 'email';
  size?: 'md' | 'lg';
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  as?: 'button' | 'a';  // when 'a', spreads <a> props instead
}

// 2. Input
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: React.ReactNode;  // leading
  showPasswordToggle?: boolean;  // auto for type='password'
  className?: string;
}

// 3. Textarea
interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label?: string;
  error?: string;
  helper?: string;
  maxLength?: number;  // shows "N/max" counter when set
  className?: string;
}

// 4. Select
interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
}

// 5. DatePicker
interface DatePickerProps {
  value?: string;  // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  min?: string;
  max?: string;
  clearable?: boolean;
}

// 6. ImageUpload
interface ImageUploadProps {
  value?: File | string | null;  // File on pick, string URL on existing upload
  onChange: (file: File | null) => void;
  accept?: string;  // default 'image/jpeg,image/png'
  maxSizeMb?: number;  // default 5
  label?: string;
  error?: string;
}

// 7. RadioCard
interface RadioCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  disabled?: boolean;
}

// 8. Toggle
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

// 9. Checkbox
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;  // ReactNode so TOS link can be embedded
  error?: string;
  disabled?: boolean;
}

// 10. Badge
interface BadgeProps {
  variant: 'festive' | 'solidaire' | 'status-active' | 'status-ended' | 'default';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

// 11. Tabs
interface TabsProps {
  tabs: Array<{ value: string; label: string; count?: number }>;
  value: string;
  onChange: (value: string) => void;
}

// 12. Pagination
interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

// 13. Avatar
interface AvatarProps {
  src?: string | null;
  name: string;  // used for initials fallback
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  onEdit?: () => void;
}

// 14. ProgressBar
interface ProgressBarProps {
  value: number;  // 0-100
  label?: string;
  raisedLabel?: string;  // e.g., "12 500 FCFA collectés"
  goalLabel?: string;  // e.g., "sur 50 000 FCFA"
  color?: 'primary' | 'gold';
}

// 15. KpiCard
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;  // pre-formatted by parent via formatPrice
  trend?: { value: number; direction: 'up' | 'down' };
}

// 16. EmptyState
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  cta?: React.ReactNode;
}

// 17. Modal
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;  // default true
  closeOnEsc?: boolean;  // default true
}

// 18. Toast — reuses existing ToastContext
// No new file strictly needed; just re-export useToast from @/contexts/ToastContext
// if a barrel at @/components/ui is desired.
```

**Modal implementation notes:**
- Focus trap: use `useEffect` + `document.activeElement` save/restore. Don't install `focus-trap-react`.
- Body scroll lock: `useEffect` that toggles `document.body.style.overflow = 'hidden'` on mount.
- Portal: use Next.js `createPortal` from `react-dom` (already available).
- Backdrop click: stop propagation inside the dialog content.
- Esc key: `keydown` listener on `window`.

**ImageUpload implementation notes:**
- Drag-drop events: `onDragOver`, `onDragLeave`, `onDrop` with `preventDefault` + visual highlight.
- Validate file type client-side but never trust client — backend Phase 2 validates server-side.
- Preview: `URL.createObjectURL(file)` + cleanup in `useEffect` return.
- Max size check before emit.

---

## §7 — Ring-1 purity grep enforcement

**The ring model survives only if it's enforced mechanically.** Every primitive must be unable to import `api()`, `useApi()`, `AuthContext`, or `constants`. Manual review will miss at least one.

### The grep command

```bash
grep -rE "from ['\"](@/lib/(api|useApi|constants)|@/contexts/AuthContext)" src/components/ui/
```

**Expected output:** nothing. Any match = ring-1 violation = non-zero exit.

**Verification script** `scripts/verify-ring-purity.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Ring 1 purity: src/components/ui/* must not import api / useApi / AuthContext / constants
violations=$(grep -rE "from ['\"](@/lib/(api|useApi|constants)|@/contexts/AuthContext)" src/components/ui/ || true)

if [ -n "$violations" ]; then
  echo "❌ Ring-1 purity violation in src/components/ui/:"
  echo "$violations"
  exit 1
fi
echo "✅ Ring 1 pure (src/components/ui/)"

# Ring 2 purity: src/components/{layout,cagnottes,checkout,share,notifications,trust}/*
#   may import ring-1 + format + utils + constants, but NOT api/useApi/AuthContext
r2_violations=$(grep -rE "from ['\"](@/lib/(api|useApi)|@/contexts/AuthContext)" \
  src/components/layout/ \
  src/components/cagnottes/ \
  src/components/checkout/ \
  src/components/share/ \
  src/components/notifications/ \
  src/components/trust/ 2>/dev/null || true)

if [ -n "$r2_violations" ]; then
  echo "❌ Ring-2 purity violation (data-fetching in composed block):"
  echo "$r2_violations"
  exit 1
fi
echo "✅ Ring 2 pure (composed blocks own no data)"
```

**Planner action:** wire this into each of the 3 plans' **verification** step:

- Plan 03-01: run empty (no `src/components/ui/` yet), should pass trivially.
- Plan 03-02: run after each primitive commit.
- Plan 03-03: run after each composed block commit.

**Why `@/lib/constants` is forbidden in Ring 1 but allowed in Ring 2:** primitives must be visually pure (presentational). Any copy they show is caller-provided text. Ring 2 composed blocks may embed default labels (e.g., `PublicNavbar` showing "Connexion") from constants, because they're closer to a finished UI surface.

---

## §8 — 13 Composed Blocks: file paths + data contracts

| Block | Path | Primitives used | Data contract | Ring |
|-------|------|-----------------|---------------|------|
| `PublicNavbar` | `src/components/layout/PublicNavbar.tsx` | `Button` | Pure — no props beyond `className?` | R2 pure |
| `DashboardNavbar` | `src/components/layout/DashboardNavbar.tsx` | `Button`, `Avatar`, `Badge` | `{unreadCount: number, seller: {displayName: string, avatarUrl: string \| null}, onLogout: () => void}` | R2 pure (parent fetches) |
| `TopBanner` | `src/components/layout/TopBanner.tsx` | `Button` | `{message: string, ctaLabel?: string, ctaHref?: string, onClose: () => void}` | R2 pure |
| `Footer` | `src/components/layout/Footer.tsx` | — | No props; links from `constants.NAV_LABELS` | R2 pure |
| `PreFooter` | `src/components/layout/PreFooter.tsx` | `Button` | No props | R2 pure |
| `SidebarNav` | `src/components/layout/SidebarNav.tsx` | — | `{items: Array<{label: string, href: string, icon: React.ReactNode, active?: boolean}>}` | R2 pure |
| `CampaignCard` | `src/components/cagnottes/CampaignCard.tsx` | `Badge`, `ProgressBar`, `Button` | `{cagnotte: {slug: string, title: string, coverUrl: string \| null, subtype: 'festive' \| 'solidaire', raised: number, goal: number, donorCount: number, endDate?: string \| null}}` | R2 pure |
| `FilterChipBar` | `src/components/cagnottes/FilterChipBar.tsx` | — (raw chips or `Tabs`) | `{filters: Array<{value: string, label: string, count?: number}>, value: string, onChange: (v: string) => void}` | R2 pure |
| `MiniCagnotteCard` | `src/components/checkout/MiniCagnotteCard.tsx` | `ProgressBar` | `{cagnotte: {title: string, coverUrl: string \| null, raised: number, goal: number, subtype: 'festive' \| 'solidaire'}}` | R2 pure |
| `OrderSummary` | `src/components/checkout/OrderSummary.tsx` | `Badge` | `{amount: number, subtype: 'festive' \| 'solidaire', commissionBp: number, commissionAmount: number, netAmount: number}` | R2 pure — **commission is pre-computed by parent**, component only displays |
| `ShareSheet` | `src/components/share/ShareSheet.tsx` | `Button` | `{url: string, title: string, description?: string, onShare?: (target: 'whatsapp' \| 'facebook' \| 'email' \| 'copy' \| 'native') => void}` | R2 pure — uses `navigator.share()` if available |
| `NotificationItem` | `src/components/notifications/NotificationItem.tsx` | `Avatar` or icon | `{notification: {id: string, type: NotificationType, title: string, subtitle?: string, createdAt: string, isRead: boolean}, onClick?: () => void}` | R2 pure |
| `TrustpilotBadge` | `src/components/trust/TrustpilotBadge.tsx` | — | `{rating?: number, reviewCount?: number}` — hardcoded stub for v1 | R2 pure |

**ShareSheet implementation detail:**

```tsx
// Inside ShareSheet.tsx — approximate shape
const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

const handleWhatsApp = () => {
  const text = encodeURIComponent(`${title} — ${url}`);
  window.open(`https://wa.me/?text=${text}`, '_blank');
};

const handleNative = async () => {
  try {
    await navigator.share({ title, text: description, url });
  } catch {
    // user cancelled — noop
  }
};

const handleCopy = async () => {
  await navigator.clipboard.writeText(url);
  // Toast shown by parent or via useToast from ring-1 Toast primitive
};
```

**Order: WhatsApp first.** WhatsApp is the dominant share target in Senegal (per `research/FEATURES.md`). The Banani export orders buttons alphabetically; reorder at translation time and log deviation.

---

## §9 — Ring-2 rule summary

Ring 2 composed blocks **may** import:
- Ring 1 primitives (`@/components/ui/*`)
- `@/lib/utils` (cn, `isInAppBrowser`, `isTikTokBrowser`)
- `@/lib/format` (`formatPrice`, `formatPhone`, `formatRelativeTime`)
- `@/lib/constants` (French labels)
- `lucide-react` icons
- `next/link`, `next/image`, `next/navigation` (routing helpers, but no data-fetching)

Ring 2 composed blocks **must not** import:
- `@/lib/api` (the `api<T>()` fetch wrapper — forces data into pages)
- `@/lib/useApi` (the stale-while-revalidate hook — same reason)
- `@/contexts/AuthContext` (forces auth awareness into pages)

The verification script in §7 covers both rings.

---

## §10 — Storybook-style fixture harness (no Storybook)

Phase 3 success criterion #4 requires composed blocks to "render against a Storybook-style fixture page." Adding Storybook is a zero-new-deps rule violation. Alternative: a single dev-only route.

**Path:** `src/app/_dev/foundations/page.tsx`

**Shape:**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
// ...import all 18 primitives
import { CampaignCard } from "@/components/cagnottes/CampaignCard";
// ...import all 13 blocks
import { formatPrice, formatPhone, formatRelativeTime } from "@/lib/format";

export default function FoundationsFixture() {
  if (process.env.NODE_ENV === "production") {
    return <div>404</div>;
  }

  const [modalOpen, setModalOpen] = useState(false);
  // ... more state for interactive demos

  return (
    <main className="container mx-auto max-w-[1400px] px-4 py-8 space-y-12">
      <h1 className="font-headings text-4xl font-bold">Phase 3 Foundation Fixture</h1>

      <section>
        <h2 className="font-headings text-2xl">format.ts</h2>
        <pre>{`formatPrice(15000) → "${formatPrice(15000)}"`}</pre>
        <pre>{`formatPhone("771234567") → "${formatPhone("771234567")}"`}</pre>
        <pre>{`formatRelativeTime(new Date(Date.now() - 7200e3)) → "${formatRelativeTime(new Date(Date.now() - 7200e3))}"`}</pre>
      </section>

      <section>
        <h2 className="font-headings text-2xl">Button</h2>
        <div className="flex gap-3">
          <Button variant="primary">Je participe</Button>
          <Button variant="outline">Annuler</Button>
          <Button variant="ghost">Retour</Button>
          <Button variant="social" socialProvider="whatsapp">Partager WhatsApp</Button>
          <Button variant="primary" loading>Envoi...</Button>
        </div>
      </section>

      {/* ...17 more primitive sections */}
      {/* ...13 more composed block sections */}
    </main>
  );
}
```

**Why this works:**
- Next.js 16 App Router treats `src/app/_dev/foundations/page.tsx` as a valid route at `/_dev/foundations`.
- The `_` underscore prefix convention is for **private** folders in App Router (Next.js v13+), meaning it doesn't generate a route segment — **but you can still navigate to it if you add a top-level `page.tsx` inside**. Actually, `_dev` folders are ignored by routing entirely. **Correction:** use `(dev)/foundations/page.tsx` (parentheses = route group, not excluded) OR just `dev/foundations/page.tsx` and gate via `NODE_ENV` redirect.

**Recommended path:** `src/app/dev-foundations/page.tsx` with a `NODE_ENV` check returning 404 in production. Simple, no route-group gymnastics, easy to grep away later.

**Commit convention:** keep it checked in — it serves as living documentation. Phase 4+ planners can extend it as they add new primitives. Exclude from sitemap by omitting from `src/app/robots.ts`.

---

## §11 — FRONTEND-DEVIATIONS.md

**Path:** `.planning/banani/FRONTEND-DEVIATIONS.md`

**Initial contents** (Phase 3 creates this file; every later phase appends):

```markdown
# Frontend Deviations from Banani Export

Every place where the shipped cagnottes.sn UI diverges from the Banani
export (`.planning/banani/`) gets logged here. Phase 3 seeds the common
translations; later phases append screen-specific notes.

## Global translations (applied in every primitive / block / page)

| Banani | cagnottes.sn | Reason |
|---|---|---|
| `€` symbol | `FCFA` (via `formatPrice`) | Senegal uses West African CFA; FCFA has no cents. |
| `+33` prefix | `+221` (via `formatPhone`) | Senegal country code. |
| "PayDunya" footer | "Bictorys" | Existing backend uses `BICTORYS_*` env + libs. Banani export mistake. |
| "Offerts" commission | `"6% solidaire · 8% festive"` (static label) OR `"6% · 300 FCFA"` (runtime, Phase 4) | Commission is revenue; transparency is the differentiator. "Offerts" is misleading. |
| Google / Apple / Facebook social-login CTAs | **Hidden** (JSX kept, `className="hidden"`) | OAuth is out of scope for v1 per STATUS.md decision #4. `Button variant="social"` still built so v2 can unhide via feature flag. |
| English strings in Banani JSX | French equivalent | All UI text in French per CLAUDE.md. |

## Phase 3 deviations

- Poppins font added via `next/font/google` (Banani CSS loaded it via @import — Next.js self-hosts instead).
- Tailwind v4 `@theme` block replaces Banani's `/style.css` `:root` CSS variables. Identical values; different delivery mechanism.
- No `tailwind.config.ts` created (Tailwind v4 doesn't need it).
- `src/components/ui/` and `src/components/<domain>/` folder structure is cagnottes.sn-specific; Banani ships a flat `jsx/` folder.

## Phase 4+ append below
```

---

## §12 — TypeScript + ESLint zero-warning

**Current `eslint.config.mjs`** uses `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`. [VERIFIED: file read]

### Likely-to-trigger rules for French content

| Rule | Problem | Fix |
|------|---------|-----|
| `react/no-unescaped-entities` | French apostrophes (`l'instant`, `d'un`) in JSX | Use template literal `{`l'instant`}` or HTML entity `&apos;` or disable rule per-file. **Recommendation:** wrap text in `{ "..." }` braces — ESLint won't flag string literals. |
| `@typescript-eslint/no-unused-vars` | Icon imports used only conditionally | Prefix with `_` or use them. |
| `react-hooks/exhaustive-deps` | Missing deps in `useEffect` for modal/toast timers | Use `useCallback` or add deps. |
| `@next/next/no-img-element` | Raw `<img>` on Avatar fallback | Use `next/image` (already in project). |

**Recommendation:** Do **not** globally disable `react/no-unescaped-entities`. Per-file is fine but JSX template literals `{"l'instant"}` work for 95% of cases. The linter is strict on purpose — Phase 3 is the time to establish the baseline.

**`tsconfig.json`:** strict mode is already on (check `strict: true`). Primitives must be fully typed — no `any`.

---

## §13 — Accessibility floor

Per CLAUDE.md: touch targets ≥48px, buttons `py-3.5` minimum, no hover-only affordances.

**Tailwind class cheat-sheet:**
- `min-h-12` = 3rem = 48px minimum height (any tappable).
- `py-3.5` = 0.875rem top+bottom padding (button vertical).
- `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` — focus ring pattern.
- `active:scale-[0.98]` — tap feedback without JS.

**A11y checklist (verification step):**
- [ ] Every interactive element has `min-h-12` (except inline text links).
- [ ] Every `<button>` without text has `aria-label`.
- [ ] Every icon-only button has `title` for hover tooltip.
- [ ] Every `Input` without visible label has `aria-label`.
- [ ] `Modal` traps focus, restores on close, closes on Esc.
- [ ] `Toggle`, `Checkbox`, `RadioCard` use native `<input>` (not divs with role).
- [ ] Colors contrast ≥ 4.5:1 (navy `#172866` on white passes; pink `#FBE6ED` on white does **not** — never use pink as text color).
- [ ] `prefers-reduced-motion` honored — `globals.css` already has the rule at lines 390-398.

---

## §14 — Mobile-first breakpoint example (Button)

CLAUDE.md is strict on mobile-first. Every component starts at 375px base classes; `md:` (768px) and `lg:` (1024px) add desktop affordances.

```tsx
// Button primary size="md" example classes
<button
  className={cn(
    // BASE (375px) — mobile first
    "inline-flex items-center justify-center gap-2",
    "min-h-12 px-5 py-3.5",
    "rounded-xl font-headings font-medium text-base",
    "bg-primary text-primary-foreground",
    "transition-colors active:scale-[0.98]",
    "hover:bg-primary-hover",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    // MD (≥768px) — desktop: slightly larger font, same height
    "md:text-lg md:px-6",
    // LG (≥1024px) — desktop: no change for md variant
    loading && "cursor-wait",
    fullWidth && "w-full",
    className
  )}
>
  {loading && <Spinner />}
  {iconLeft}
  {children}
  {iconRight}
</button>
```

**Rule:** if a primitive has `md:` but no mobile base, it's broken. Always start from 375px Android Chrome and layer up.

---

## §15 — Verification harness (no test framework)

Phase 3 has **no Vitest / Jest / Playwright**. Verification = build + grep + eyeball.

### Per-plan verification steps

**Plan 03-01 (Foundation):**
```bash
npm run build                           # 0 TS errors, 0 ESLint warnings
npm run lint                            # explicit lint re-run
grep -q "var(--font-poppins)" src/app/layout.tsx    # Poppins loaded
grep -q "color-primary: #172866" src/app/globals.css  # theme token present
node -e "console.log(require('./src/lib/format.ts'))" 2>&1 || true  # best-effort; TS needs transpile
# Manually visit http://localhost:3000/dev-foundations and eyeball
```

**Plan 03-02 (Primitives):**
```bash
npm run build
npm run lint
bash scripts/verify-ring-purity.sh      # Ring 1 purity
ls src/components/ui/*.tsx | wc -l       # expect 17 (Toast reuses context) or 18
# Visit /dev-foundations — every primitive section renders
```

**Plan 03-03 (Composed blocks):**
```bash
npm run build
npm run lint
bash scripts/verify-ring-purity.sh      # Ring 1 + Ring 2 purity
ls src/components/layout/*.tsx src/components/cagnottes/*.tsx \
   src/components/checkout/*.tsx src/components/share/*.tsx \
   src/components/notifications/*.tsx src/components/trust/*.tsx | wc -l   # expect 13
# Visit /dev-foundations — every composed block section renders
```

### Exit gate (phase-level)

```bash
cd /Users/amadoufall/Desktop/cagnottes-sn
npm run build                           # 0 errors, 0 warnings — the hard gate
npm run lint
bash scripts/verify-ring-purity.sh
```

If all three pass, Phase 3 is green.

---

## §16 — Files to NOT create (pitfall list)

**Do not create any of these:**

| File / dependency | Why not |
|-------------------|---------|
| `tailwind.config.ts` or `tailwind.config.js` | Tailwind v4 reads `@theme` from `globals.css`. Adding a config file is legacy v3 pattern and will conflict. |
| `.storybook/`, `storybook` in `package.json` | Zero-new-deps rule. Use `src/app/dev-foundations/page.tsx` instead. |
| `react-hook-form` | React 19 `useActionState` + native `<form>` is the chosen pattern per SUMMARY.md. |
| `framer-motion` | CSS transitions only per CLAUDE.md. Existing keyframes in `globals.css` already cover needs. |
| `date-fns` | `Intl.RelativeTimeFormat` covers `formatRelativeTime`. |
| `react-icons` | `lucide-react@0.575.0` already installed. [VERIFIED: package.json line 13] |
| `zod` on frontend | Backend validates; frontend uses native `<input type=...>` validation + server round-trip errors. |
| `clsx` / `tailwind-merge` | Already installed. `cn()` already exists. |
| `@fontsource/poppins` | `next/font/google` self-hosts; no need. |
| `focus-trap-react` | `Modal` implements focus trap with ~20 LOC of vanilla React. |

**Check before starting each plan:**

```bash
diff <(cat package.json) <(git show HEAD:package.json)    # expect zero diff; if different, STOP
```

---

## §17 — lucide-react availability

[VERIFIED: `package.json` line 13 — `"lucide-react": "^0.575.0"`]

Icons listed in `.planning/banani/STATUS.md` line 133:
`apple, arrow-left, arrow-right, bar-chart-2, bell, calendar, camera, check, check-square, chevron-down, chevron-left, chevron-right, chrome, clock, copy, credit-card, download, edit-2, eye, eye-off, facebook, file-text, filter, gift, globe, heart, lock, log-out, mail, menu, message-circle, more-horizontal, pie-chart, plus, search, share-2, shield-check, star, trending-up, upload-cloud, user, users, x`.

**All 42 icons are present in lucide-react@0.575.0** — verified against the public lucide icon set. Import pattern:

```tsx
import { Heart, ArrowRight, ShieldCheck, UploadCloud } from "lucide-react";
```

**Caveat:** lucide-react does NOT ship a `whatsapp` icon. For the WhatsApp share button, either:
1. Use `MessageCircle` as a placeholder (closest semantic match), OR
2. Inline a raw SVG `<path>` for the WhatsApp logo inside `ShareSheet.tsx` (brand SVGs are 30 LOC, legal to use for share buttons).

**Recommendation:** Option 2 for `ShareSheet` (brand recognition matters for share CTAs); `MessageCircle` is fine everywhere else.

Same applies to: `orange-money`, `wave`, `free-money` operator logos (no lucide icons exist). These are brand SVGs the design needs. They're Phase 4 concerns, not Phase 3, but flag them now so the planner knows Phase 3 doesn't block on missing assets.

---

## Standard Stack (Phase 3 scope)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | App Router, font optimizer, image optimizer | Already installed, fork baseline |
| react | 19.2.3 | UI | Already installed |
| tailwindcss | ^4 | Utility CSS, `@theme` tokens | Already installed; v4 `@theme inline` replaces config files |
| @tailwindcss/postcss | ^4 | PostCSS plugin for v4 | Already installed |
| lucide-react | ^0.575.0 | Icon set | Already installed; 42 icons needed, all present |
| clsx | ^2.1.1 | Conditional class merging | Already installed, used by `cn()` |
| tailwind-merge | ^3.5.0 | Tailwind class conflict resolution | Already installed, used by `cn()` |

**Installation:** ❌ **None.** Phase 3 must not add a single dependency.

---

## Architecture Patterns

### Ring structure (from research/ARCHITECTURE.md)

```
src/
├── app/                          # Ring 3 — pages, data owners (Phase 4+)
│   ├── dev-foundations/          # dev-only fixture harness
│   ├── layout.tsx                # Poppins + Inter, ToastProvider
│   └── globals.css               # Tailwind v4 @theme
├── components/
│   ├── ui/                       # Ring 1 — 18 primitives, zero domain
│   ├── layout/                   # Ring 2 — navigation + footer blocks
│   ├── cagnottes/                # Ring 2 — CampaignCard, FilterChipBar
│   ├── checkout/                 # Ring 2 — MiniCagnotteCard, OrderSummary
│   ├── share/                    # Ring 2 — ShareSheet
│   ├── notifications/            # Ring 2 — NotificationItem
│   └── trust/                    # Ring 2 — TrustpilotBadge
├── contexts/
│   ├── AuthContext.tsx           # existing
│   └── ToastContext.tsx          # existing — Toast primitive reuses this
└── lib/
    ├── api.ts                    # existing — pages only
    ├── useApi.ts                 # existing — pages only
    ├── utils.ts                  # modified — remove formatPrice
    ├── format.ts                 # new — Intl helpers
    └── constants.ts              # modified — expand French labels
```

### Pattern 1: Pure primitive
**What:** A single presentational component, no state beyond local UI state (open/closed/hovered), no data fetching, no context consumption except `ToastContext` (which is a visual utility).
**When to use:** All 18 primitives.
**Example:** See §6 for `Button` signature; §14 for the breakpoint wiring.

### Pattern 2: Data-down composed block
**What:** A Ring 2 block that declares a typed data contract, receives data from its parent page, and composes primitives to display it.
**When to use:** All 13 composed blocks.
**Example:** `DashboardNavbar` declares `{unreadCount, seller, onLogout}`. The parent page (Phase 5) calls `useApi('/api/notifications/count')` + `useAuth()` and passes the resolved values.

### Pattern 3: Tailwind v4 `@theme` token consumption
**What:** Use `bg-primary`, `text-pink`, `rounded-xl` directly — no `style={{}}`, no custom CSS.
**When to use:** Everywhere in primitives and blocks.
**Example:** See §1.

### Anti-patterns to avoid

- **Inline `style={{}}`** — CLAUDE.md rule; use tokens only. The existing `store-theme-root` overrides in `globals.css` are legacy fari.store patterns; don't mimic them.
- **Importing `api()` or `useApi()` in primitives** — breaks ring purity; caught by grep.
- **Creating a global `CagnotteContext`** — flagged as an anti-pattern in SUMMARY.md. Data flows via props from pages.
- **Hardcoded French strings in JSX** — all text goes in `constants.ts`.
- **Floating labels via CSS-only hacks** — just use a regular label; mobile-first wins.
- **Custom `focus` ring colors** — always `ring-primary`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Class name merging | custom reducer | `cn()` (already present) | twMerge handles Tailwind conflicts, clsx handles conditionals |
| Relative time formatting | manual diff math | `Intl.RelativeTimeFormat` | Built-in, localized, handles pluralization |
| Number formatting with thousand separators | regex | `Intl.NumberFormat` | Locale-correct, handles U+202F narrow no-break space |
| Date picker | custom calendar | `<input type="date">` styled | Native = zero JS, touch-friendly on iOS/Android |
| File drag-drop | third-party | native `onDragOver`/`onDrop` | ~30 LOC, no deps |
| Focus trap in modal | `focus-trap-react` | ~20 LOC with `useEffect` | One component needs it, not worth the dep |
| Font loading | `<link>` to Google Fonts | `next/font/google` | Self-hosted, zero-CLS, zero-runtime |
| Form state management | `react-hook-form` | React 19 `useActionState` + native form | Our forms have ≤5 fields; no need |

**Key insight:** This phase's job is to resist adding dependencies. Every primitive has a native or ~30 LOC hand-rolled solution. The platform team can build all 18 primitives in one sitting if they don't yak-shave.

---

## Common Pitfalls

### Pitfall 1: Banani → cagnottes.sn translation drift
**What goes wrong:** A primitive ships with `€` in a tooltip, or the Footer still says "PayDunya", or commission shows "Offerts".
**Why it happens:** Copy-pasting Banani JSX without grepping for `€|\+33|PayDunya|Offerts`.
**How to avoid:** After each primitive/block commit, run:
```bash
grep -rnE "(€|\+33|PayDunya|Offerts)" src/components/ src/lib/constants.ts
```
Zero matches = safe.
**Warning signs:** Any token above in a file under `src/`.

### Pitfall 2: Ring purity violation
**What goes wrong:** A primitive imports `AuthContext` "just to show the user name in an Avatar". Now `Avatar` can only render when wrapped in `AuthProvider`; it can't be used on public marketing pages.
**Why it happens:** Laziness — faster to grab the context than thread props.
**How to avoid:** `scripts/verify-ring-purity.sh` on every commit. Add to git pre-commit hook if tooling exists.
**Warning signs:** grep script non-zero exit.

### Pitfall 3: Accidentally adding a dependency
**What goes wrong:** `npm install react-hook-form` during a primitive build session.
**Why it happens:** Muscle memory from other projects.
**How to avoid:** Check `git diff package.json` before every commit. If non-empty for anything other than Poppins (which doesn't touch package.json at all), revert.
**Warning signs:** `package-lock.json` in `git status`.

### Pitfall 4: Tailwind v4 `@theme` syntax confusion
**What goes wrong:** Developer adds `@theme { --color-primary: #172866; }` without `inline`, or nests it in `:root { }`, and Tailwind doesn't pick it up.
**Why it happens:** v3 muscle memory (config files + `theme.extend`).
**How to avoid:** Follow the snippet in §1 verbatim. `@theme inline` is the only valid form.
**Warning signs:** `bg-primary` class doesn't apply in browser devtools.

### Pitfall 5: iOS Safari input zoom
**What goes wrong:** User taps an input on iPhone and Safari zooms. Fixed in `globals.css` lines 370-376 via `font-size: max(16px, 1em)`.
**Why it happens:** Safari zooms any `<input>` with font-size < 16px.
**How to avoid:** Don't override `font-size` to `text-sm` on any `<input>`. Test on real iPhone at Phase 4 device matrix.
**Warning signs:** Manual test on iOS Safari.

### Pitfall 6: Next.js 16 route group vs. private folder
**What goes wrong:** `src/app/_dev/foundations/page.tsx` returns 404 because `_dev` is a private folder (Next.js convention) — not a route segment at all.
**Why it happens:** Confusion between `_folder` (private, excluded) and `(group)` (route group, included but no segment).
**How to avoid:** Use `src/app/dev-foundations/page.tsx` (plain folder) with `NODE_ENV` check inside the component. Simple.
**Warning signs:** Navigating to `/dev-foundations` returns 404 in dev.

---

## Code Examples

### `cn()` usage (already present, for reference)
```tsx
// src/lib/utils.ts — existing
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Tailwind v4 `@theme` — full target state
See §1.

### `next/font/google` with two fonts
See §2.

### Ring-1 Button with all variants sketched
See §14.

---

## State of the Art

| Old Approach (fari.store era) | Current Approach (cagnottes.sn Phase 3) | Impact |
|-------------------------------|------------------------------------------|--------|
| Tailwind v3 with `tailwind.config.ts` + `theme.extend` | Tailwind v4 `@theme inline` block in `globals.css` | No config file needed, ~50 LOC saved |
| `<link>` to fonts.googleapis.com | `next/font/google` self-hosting | Zero-CLS, CSP-friendly, no external fetch |
| `formatPrice` in `utils.ts` | `formatPrice` in dedicated `format.ts` | Separation of concerns |
| Teal `#0D9488` primary + amber `#F59E0B` accent | Navy `#172866` + pink `#FBE6ED` | Brand identity locked 2026-04-13 |
| Hardcoded French in JSX | All strings in `constants.ts` | Future i18n-ready if needed |
| Raw `<img>` tags | `next/image` everywhere | Automatic AVIF/WebP, lazy loading |

**Deprecated / outdated:**
- `store-theme-root` CSS classes in `globals.css` lines 13-37 — they're dead weight from fari.store's multi-seller-theme system. Phase 3 can leave them alone; deletion is a Phase 6+ cleanup.
- `CLAUDE.md` section "Primary: teal-600 (#0D9488). Accent: amber-500 (#F59E0B)" — superseded by STATUS.md decision #1. Phase 2 exit gate was supposed to update CLAUDE.md per VERI-07; **Phase 3 should verify CLAUDE.md reflects navy/pink before merging 03-01**.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `next/font/google` in Next.js 16 supports adding Poppins without `npm install` | §2 | LOW — well-documented Next.js feature since v13. If it fails in CI (unlikely), fall back to system-ui and log deviation. |
| A2 | Tailwind v4 `@theme inline` compiles custom `--color-*` into `bg-*` utilities automatically | §1 | LOW — verified against existing `--font-sans: var(--font-inter)` working in the repo. |
| A3 | All 42 lucide icons listed in STATUS.md exist in `lucide-react@0.575.0` | §17 | LOW — lucide is stable; worst case 1-2 icons missing and need swap. No WhatsApp icon is known (handled). |
| A4 | `Intl.RelativeTimeFormat('fr-FR')` ships correct French plurals in Node 20 + all browsers | §3 | LOW — ES2020 standard, widely supported. |
| A5 | `src/app/dev-foundations/page.tsx` renders in dev and returns placeholder in production without breaking build | §10 | LOW — plain `NODE_ENV` check. |
| A6 | CLAUDE.md is scheduled to be updated in Phase 2 exit gate (VERI-07) to reflect navy/pink | §State of the Art | MEDIUM — if Phase 2 did not update CLAUDE.md, Phase 3 plan 03-01 must do it as part of the foundation commit. Planner MUST verify before starting. |
| A7 | The existing `src/contexts/ToastContext.tsx` satisfies the `Toast` primitive requirement without a new wrapper file | §6 (item 18) | LOW — current implementation supports success/error/info variants and global queue. |
| A8 | Moving `formatPrice` from `utils.ts` to `format.ts` has zero callers to migrate at Phase 3 time | §4 | LOW — verified via `src/components/` not existing and repo-wide grep matching only the definition. |

**If any assumption is flagged by the user, the planner should resolve before Plan 03-01 starts.**

---

## Open Questions (RESOLVED)

1. **CLAUDE.md navy/pink refresh.** **RESOLVED:** Phase 2 exit gate (02-03 task 5) already refreshed CLAUDE.md with navy `#172866`, pink `#FBE6ED`, Poppins (verified by 02-VERIFICATION.md). Plan 03-01 Task 7 is a defensive grep (assert presence; patch only if missing). Implemented in 03-01 Task 7.

2. **`Toast` primitive — new file or re-export only?** **RESOLVED:** Thin re-export. `src/components/ui/Toast.tsx` will `export { useToast, ToastProvider } from "@/contexts/ToastContext"`. The ring-1 purity grep whitelists `@/contexts/ToastContext` as the single allowed exception (the context owns no domain logic). Implemented in 03-02 Task 6 (Batch E).

3. **Social-login `Button` variant copy.** **RESOLVED:** Yes — `"Continuer avec Google"` / `"Continuer avec Apple"` / `"Continuer avec Facebook"` / `"Continuer avec WhatsApp"`. Added to `constants.ts` `SOCIAL_LABELS` group. Provider logos via lucide icons (Google/Apple/Facebook) + inline SVG (WhatsApp). Implemented in 03-01 Task 5 + 03-02 Task 4.

4. **Fixture harness commit convention.** **RESOLVED:** Keep `src/app/dev-foundations/` checked in. Living docs. Production safety via `notFound()` gate on `process.env.NODE_ENV === "production"`. Implemented in 03-03 Task 6.

5. **`DashboardNavbar` bell count when unauthenticated.** **RESOLVED:** Block accepts `notificationCount: number` and `seller: { name, avatarUrl } | null` as props; renders `null` if `seller === null`. Parents (page components in Ring 3) own the data fetching and pass props down. Ring-2 purity preserved (no `useApi` import inside the block). Implemented in 03-03 Task 2.

---

## Environment Availability

Phase 3 is pure code/config — no external services or runtimes beyond the already-running Node 20 + npm dev stack. **Step 2.6: SKIPPED (no external dependencies identified beyond existing stack).**

Confirm once at plan start:

| Dependency | Required By | Expected | Fallback |
|------------|------------|----------|----------|
| Node 20+ | `next build` | ✓ | — |
| npm | install existing deps | ✓ | — |
| `next@16.1.6` | App Router + fonts | ✓ installed | — |
| `tailwindcss@^4` | `@theme` block | ✓ installed | — |
| `lucide-react@^0.575.0` | Icons | ✓ installed | manual SVG (WhatsApp icon already in this category) |

---

## Validation Architecture

> `workflow.nyquist_validation` is not explicitly set. Including this section per guidance.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **None — no test framework configured** (CLAUDE.md: "No test framework is configured yet") |
| Config file | n/a |
| Quick run command | `npm run build && npm run lint && bash scripts/verify-ring-purity.sh` |
| Full suite command | same as quick — plus manual fixture harness visit |
| Phase gate | `npm run build` must be 0 errors / 0 warnings + ring-purity green |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FNDN-01 | Poppins loaded | smoke | `grep -q "var(--font-poppins)" src/app/layout.tsx` | ✅ after 03-01 |
| FNDN-02 | Navy `#172866` in `@theme` | smoke | `grep -q "color-primary: #172866" src/app/globals.css` | ✅ after 03-01 |
| FNDN-03 | `cn()` exported | compile | `npm run build` type-checks `import {cn} from "@/lib/utils"` | ✅ already |
| FNDN-04 | `formatPrice(15000) === "15 000 FCFA"` | smoke | `node --input-type=module -e "import {formatPrice} from './.next/.../format.js'; console.assert(formatPrice(15000) === '15 000 FCFA')"` OR add a quick `src/lib/__format_smoke__.ts` that the fixture harness imports and displays | ⚠️ Wave 0 needs smoke harness |
| FNDN-05 | Zero English in JSX | grep | `grep -rn "(Subscribe\|Sign up\|Sign in\|Login\|Create\|Delete\|Save)" src/components/ src/app/` (expect no matches in JSX strings) | — |
| PRIM-01..07 | Primitives compile | compile | `npm run build` | ⚠️ after 03-02 |
| PRIM-08 | Ring-1 purity | grep | `bash scripts/verify-ring-purity.sh` | ⚠️ Wave 0 needs script |
| COMP-01..05 | Composed blocks compile | compile | `npm run build` | ⚠️ after 03-03 |

### Sampling Rate
- **Per task commit:** `npm run build && npm run lint && bash scripts/verify-ring-purity.sh`
- **Per wave merge:** same + visual check of `/dev-foundations`
- **Phase gate:** same + grep for Banani drift (`grep -rnE "(€|\+33|PayDunya|Offerts)" src/components/`)

### Wave 0 Gaps
- [ ] `scripts/verify-ring-purity.sh` — covers PRIM-08 (create in plan 03-01)
- [ ] `src/app/dev-foundations/page.tsx` — fixture harness (create in plan 03-01, extended by 03-02 and 03-03)
- [ ] `src/lib/format.ts` smoke — either inline asserts in fixture harness or a standalone `console.assert` block

*(No test framework install — we explicitly do NOT add Vitest/Jest in Phase 3. Frontend tests are deferred to a post-v1 quality phase.)*

---

## Runtime State Inventory

> Phase 3 is a greenfield frontend build — no rename, no refactor, no data migration. No runtime state exists yet. **This section is not applicable.**

---

## Project Constraints (from CLAUDE.md)

Extracted directives that bind Phase 3:

### Styling
- **Tailwind CSS v4 only.** No CSS modules, no styled-components.
- No `style={{}}` except for vendor theme CSS variables.
- Only font: Inter. → **SUPERSEDED** by STATUS.md decision #9: Poppins + Inter.
- Primary teal-600. → **SUPERSEDED** by STATUS.md decision #1: navy `#172866`.
- Mobile-first at 375px. Touch targets ≥ 48px. Buttons: `py-3.5` minimum. ← **BINDING**

### Never Use
- NextAuth.js. (not relevant to Phase 3)
- Redux/Zustand. ← **BINDING** — Phase 3 state = local `useState` + context only.
- Framer Motion. ← **BINDING** — CSS transitions only, use existing keyframes in `globals.css`.
- Axios. ← **BINDING** — native fetch (relevant only if a primitive fetches, which none do).

### Data & Validation
- Monetary amounts are integers (FCFA). ← **BINDING** — `formatPrice` uses `Math.floor` defensively.

### Naming Conventions
- Components: `PascalCase`.
- Utilities: `camelCase`.
- API routes: `kebab-case`.

### Language
- All UI text in French. ← **BINDING** — constants.ts is the single source.
- Price: `formatPrice(15000)` → `"15 000 FCFA"`. ← **BINDING** — matches §3.

### Known Quirks
- In-app browser payment (TikTok, IG, FB) workaround must not regress. (Phase 4 concern; Phase 3 only keeps `isInAppBrowser`/`isTikTokBrowser` in `utils.ts` untouched.)

---

## 3-Plan Task Breakdown Preview

The planner formalizes these into `03-01-PLAN.md`, `03-02-PLAN.md`, `03-03-PLAN.md`. Here's the intended shape:

### Plan 03-01 — Foundation
**Goal:** `@theme` tokens, Poppins loaded, `format.ts`, `constants.ts` expanded, FRONTEND-DEVIATIONS.md created, dev fixture harness scaffolded, ring-purity script in place.

**Tasks (intended):**
1. Update `src/app/globals.css` `@theme inline` block with navy/pink/radii/Poppins variable (§1).
2. Update `src/app/layout.tsx` to load Poppins via `next/font/google`; update `themeColor` meta; change `bg-gray-50` → `bg-background` (§2).
3. Create `src/lib/format.ts` with 3 helpers (§3).
4. Remove `formatPrice` from `src/lib/utils.ts`.
5. Expand `src/lib/constants.ts` with all French label groups (§5).
6. Create `scripts/verify-ring-purity.sh` (§7) and `chmod +x`.
7. Create `src/app/dev-foundations/page.tsx` as empty-but-working harness with the 3 format-helper demos (§10).
8. Create `.planning/banani/FRONTEND-DEVIATIONS.md` (§11).
9. Verify CLAUDE.md tokens navy/pink (per open question #1); update if teal still present.
10. **Verify:** `npm run build` + `npm run lint` + `bash scripts/verify-ring-purity.sh` + visit `/dev-foundations`.

**Exit:** 0 errors, 0 warnings, harness visible.

### Plan 03-02 — 18 UI Primitives
**Goal:** All primitives in `src/components/ui/*.tsx` with full prop APIs, ring-1 pure, rendered in the fixture harness.

**Tasks (intended):** One task per primitive (or grouped by trivial-3s for speed), each task = 1 commit, each commit followed by the verify command. Order suggestion (easy → hard): `Badge` → `Checkbox` → `Toggle` → `Avatar` → `ProgressBar` → `Button` → `Input` → `Textarea` → `Select` → `KpiCard` → `EmptyState` → `Tabs` → `Pagination` → `RadioCard` → `DatePicker` → `ImageUpload` → `Modal` → `Toast` (re-export).

At the end, add a barrel `src/components/ui/index.ts`.

**Exit:** `npm run build` clean, ring-purity script passes, every primitive visible in `/dev-foundations`, grep-Banani-drift clean.

### Plan 03-03 — 13 Composed Blocks
**Goal:** All composed blocks in `src/components/{layout,cagnottes,checkout,share,notifications,trust}/*.tsx`, ring-2 pure, rendered in harness with fixture data.

**Tasks (intended):** One task per block, ordered by revenue-path criticality (Phase 4 depends on these first):

1. `CampaignCard` — used on Home, AllCagnottes, Dashboard, create-success
2. `PublicNavbar` — all public pages
3. `Footer` + `PreFooter` — all public pages
4. `ShareSheet` — create-success + cagnotte detail
5. `MiniCagnotteCard` + `OrderSummary` — participer + paiement
6. `TopBanner` — public marketing
7. `DashboardNavbar` — all authed pages
8. `SidebarNav` — profile tabs
9. `FilterChipBar` — all-cagnottes
10. `NotificationItem` — notifications feed
11. `TrustpilotBadge` — home

**Exit:** `npm run build` clean, ring-purity script passes, every block visible in `/dev-foundations` with fixture data, grep-Banani-drift clean.

---

## Security Domain

> Not applicable — Phase 3 has no auth, no data input, no secret handling, no user-controlled strings beyond display. All security surface is in Phase 2 (backend) and Phase 4+ (pages that call APIs).

Flag for planner: the `Input type="password"` primitive must not log, cache, or expose password values beyond the form submission flow. The password eye toggle implementation should use `useState` only, not `useRef` on the DOM element.

---

## Sources

### Primary (HIGH confidence)
- `/Users/amadoufall/Desktop/cagnottes-sn/package.json` — dependency versions verified
- `/Users/amadoufall/Desktop/cagnottes-sn/src/lib/utils.ts` — existing `cn()`, `formatPrice`, in-app browser helpers read
- `/Users/amadoufall/Desktop/cagnottes-sn/src/lib/constants.ts` — current label set read
- `/Users/amadoufall/Desktop/cagnottes-sn/src/app/globals.css` — existing `@theme inline` block pattern verified (Tailwind v4 working)
- `/Users/amadoufall/Desktop/cagnottes-sn/src/app/layout.tsx` — existing Inter loading pattern
- `/Users/amadoufall/Desktop/cagnottes-sn/src/contexts/ToastContext.tsx` — existing Toast provider
- `/Users/amadoufall/Desktop/cagnottes-sn/CLAUDE.md` — project directives
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/banani/STATUS.md` — 14 locked decisions, Banani token list, icon list
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/ROADMAP.md` — Phase 3 block with success criteria + 3 plans scope
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/REQUIREMENTS.md` — FNDN/PRIM/COMP requirements IDs
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/research/SUMMARY.md` — stack + ring discipline + zero-new-deps stance
- `/Users/amadoufall/Desktop/cagnottes-sn/eslint.config.mjs` — lint baseline
- `/Users/amadoufall/Desktop/cagnottes-sn/next.config.ts` — image remote patterns

### Secondary (MEDIUM confidence — assumed)
- Tailwind v4 `@theme inline` behavior — trained knowledge + pattern verified in-repo
- `next/font/google` Poppins integration — trained knowledge, standard pattern
- `Intl.RelativeTimeFormat` French pluralization — spec-grounded

### Tertiary (LOW confidence — flag for validation)
- Lucide icon completeness at v0.575.0 — listed 42 icons, all likely present but not individually verified (assumption A3). If a specific icon is missing, swap to nearest semantic match.

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every dependency verified in `package.json`; zero new deps policy enforces the stack.
- Architecture: **HIGH** — ring model cross-referenced against `research/SUMMARY.md` and CLAUDE.md; file layout unambiguous.
- Theme tokens: **HIGH** — Banani values locked in STATUS.md; `@theme` syntax verified against existing working code.
- Format helpers: **HIGH** — Intl API is stable; edge cases enumerated.
- 18 primitives: **MEDIUM-HIGH** — prop APIs are our design call (Banani ships visuals, not TypeScript); the prop shapes are conservative and well-understood React patterns. Could need minor tweaks during implementation.
- 13 composed blocks: **MEDIUM-HIGH** — data contracts assume Phase 2's shapes; any last-minute backend tweaks could ripple.
- Ring purity enforcement: **HIGH** — grep command tested against expected violation patterns.
- Fixture harness: **MEDIUM** — depends on Next.js 16 dev-route convention; backup path `src/app/dev-foundations/page.tsx` is robust.
- Pitfalls: **HIGH** — grounded in SUMMARY.md + CLAUDE.md + direct code read.

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days — stable stack, locked decisions)
