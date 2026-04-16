# Phase 4: Public Donor Revenue Path — Research

**Researched:** 2026-04-13
**Domain:** Next.js 16 App Router public pages + Bictorys mobile-money redirect + in-app browser escape (TikTok/IG/FB)
**Confidence:** HIGH (everything is grounded in existing code, audits 008/009, Phase 2/3 summaries, and live backend contracts)
**No CONTEXT.md:** this phase was spawned by `/gsd-research-phase` directly. No locked decisions from `/gsd-discuss-phase` to copy. Decisions must be made by the planner / user. ROADMAP + REQUIREMENTS are the locked inputs.

---

## Summary

Phase 4 ships **the** revenue path for cagnottes.sn — the 7-screen flow a donor walks from social-media link tap to Bictorys completion to thank-you. Every other phase is preamble. Ring 2 composed blocks (Phase 3) are all on disk and purity-enforced; the backend surface (`POST /api/orders`, `GET /api/cagnottes/:slug`, `GET /api/cagnottes/:slug/participants`, `GET /api/orders/:ref/status`, `/api/pay-redirect`) is **already live and does not need modification for Phase 4 to ship**. The work is: wire pages, branch the pay CTA three ways, compute the commission client-side matching `lib/commission.ts`, and validate 8 real devices.

Two non-negotiables drive the whole phase:

1. **Audit 008/009 must NOT regress.** Any change to `isInAppBrowser()`, `isTikTokBrowser()`, or `/api/pay-redirect/route.ts` is grounds for immediate rollback. The only new surface is a `src/lib/redirect.ts` helper that *consumes* those three primitives without mutating them.
2. **The commission label is "8% · 800 FCFA", NEVER "Offerts".** Client-side mirror of `backend/src/lib/commission.ts` — identical basis points, identical `Math.floor`, identical invariant.

**Primary recommendation:** one atomic plan `04-01` that ships the 7 pages + `redirect.ts` helper + `commission.ts` frontend mirror + `audit-010-banani-inapp-matrix.md`, scoped to ~10-12 files new / 2 files modified, with the 8-cell device matrix as the exit gate. No backend edits. Deferred items (slug rename, creator edit, stats) stay in Phase 5/6.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DONA-06 | Donor in TikTok / IG / FB in-app browser is routed through the audit-008/009 workaround without regression | §1 audit summary, §2 pay-redirect internals, §3 helpers, §15 branching snippet |
| DONF-01 | Home page (screen 1) — hero + featured + features + FAQ + footer, pixel-parity 1280px + mobile-adapted 375px | §10 home composition, §20 directory structure |
| DONF-02 | All-cagnottes discovery (screen 2) — search + chip filters + paginated grid | §11 all-cagnottes composition, §21 route slugs |
| DONF-03 | Public cagnotte detail `/c/[slug]` (screens 21/22) — cover + description + participants + sticky "Je participe" CTA + WhatsApp share | §12 detail composition, §6 SSR+client progress, §7 OG meta, §9 generateStaticParams |
| DONF-04 | Participate form `/c/[slug]/participer` (screen 23) — 3-step inline form + sticky order summary | §13 form composition, §17 React 19 useActionState |
| DONF-05 | Payment page `/c/[slug]/paiement` (screen 24) — Wave/OM/Free/Carte + commission label + Bictorys submit | §14 payment composition, §16 commission mirror |
| DONF-06 | Thank-you page — polling on `GET /api/orders/:ref/status`, share CTA, "Voir la cagnotte" link | §5 status endpoint, §19 thank-you design |
| DONF-07 | In-app branching: TikTok → `navigator.share`, IG/FB → `target="_blank"`, normal → `window.location.href`; 8-cell matrix is exit gate | §15 branching snippet, §18 audit-010 template |

**All 8 requirements map to a single atomic plan (04-01).** Per ROADMAP §Phase 4, splitting would break the shared state between `/participer` and `/paiement` and defeat the purpose of the 8-cell matrix which validates end-to-end, not per-screen.

---

## Project Constraints (from CLAUDE.md)

Repeated verbatim so the planner cannot drift. Any task that contradicts these is invalid.

### Never use
- NextAuth.js / Redux / Zustand / Framer Motion / Axios / MongoDB — **forbidden**
- Stripe — **forbidden**; Bictorys only

### Styling
- Tailwind CSS v4 only, no CSS modules, no styled-components
- No `style={{}}` except vendor theme variables
- Primary: navy `#172866`, accent: pink `#FBE6ED`, navy-hover `#121F4E`, footer `#0E1A40`
- Poppins headings + Inter body via `next/font/google` (already wired in [src/app/layout.tsx:6-15](../../../src/app/layout.tsx))
- Mobile-first 375px base, touch targets ≥ 48px, buttons `py-3.5` minimum

### Data & validation
- All monetary amounts are **integers** in FCFA
- All API inputs validated with Zod — frontend must mirror backend schemas, not invent new ones
- Client-supplied commission fields are **ignored server-side** — client label must match server recomputation or donors will see "800 FCFA" on pay page but debit "799 FCFA" on Bictorys (not a real risk since server recomputes, but the *label* must be stable)

### Payments
- Bictorys two keys (never mix): `BICTORYS_API_KEY` (charges) vs `BICTORYS_PRIVATE_KEY` (payouts). Phase 4 only touches the first, indirectly, via `POST /api/orders`
- Commission is **6% solidaire / 8% festive** computed server-side via `computeCommission(gross, subtype)` in [backend/src/lib/commission.ts](../../../backend/src/lib/commission.ts). Client-supplied commission fields are ignored.
- 3 retries on 403 WAF with exponential backoff already in `lib/payments/bictorys.ts` — **do not touch**
- Circuit breaker 5 failures/30s → 60s cooldown → 503 — **do not touch**
- `/api/pay-redirect` route — **treat as sealed**; Phase 4 uses it but never modifies it

### Naming
- Components PascalCase, utilities camelCase, API routes kebab-case
- Route slugs French: `/c/[slug]`, `/c/[slug]/participer`, `/c/[slug]/paiement`, `/c/[slug]/merci`, `/toutes-les-cagnottes`
- Constants in `src/lib/constants.ts` — zero French strings hardcoded in JSX

### Known quirks
- **In-app browser payment** — see audit-008/audit-009 **before** touching payment CTA (§1 below reproduces the decisions in full)
- Payment URLs are base64-encoded and proxied through [src/app/api/pay-redirect/route.ts](../../../src/app/api/pay-redirect/route.ts) to bypass TikTok's WebView query-param scanner

---

## Standard Stack

All stack items are already installed. Phase 4 adds **zero new npm deps**.

### Core (already installed, verified in package.json via Phase 3 summaries)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.x | App Router, SSR, ISR, `generateMetadata`, `generateStaticParams`, `revalidateTag` | Project foundation, not up for debate |
| react | 19.x | `useActionState`, `useOptimistic`, native `<form>` actions | Paired with Next 16, built-in |
| typescript | 5.x | Type safety | Mandated by CLAUDE.md |
| tailwindcss | v4 | `@theme` tokens, utility classes | Mandated by CLAUDE.md |
| clsx + tailwind-merge | - | `cn()` helper | Used via [src/lib/utils.ts:7](../../../src/lib/utils.ts) |
| lucide-react | - | Icons (Share2, WhatsApp via inline SVG, Wave/OM/Free logos) | Already used by Phase 3 blocks |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/font/google | built-in | Poppins + Inter loaded in root layout | Headings font-headings, body default |
| next/link | built-in | Client-side navigation | Internal links |
| next/image | built-in | Cover images with LCP priority | Cagnotte covers, hero images |
| `@/lib/api` | local | fetch wrapper + auto-refresh + CSRF | POST /api/orders, GET /api/orders/:ref/status |
| `@/lib/useApi` | local | SWR-style client cache (2min TTL) | Progress polling, participants pagination |

### Alternatives Considered (and rejected)

| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| Native `<form>` + `useActionState` | react-hook-form | CLAUDE.md forbids. React 19 built-ins are sufficient for 3 fields. [VERIFIED via research/SUMMARY.md:28] |
| `fetch` via `api()` wrapper | TanStack Query | CLAUDE.md forbids. `useApi` (in-memory stale-while-revalidate) already handles the polling case. |
| Built-in `<Link>` | next/navigation `router.push` | Prefer declarative. `router.push` only for programmatic redirects (post-submission). |
| ISR `revalidate = 60` | On-demand `revalidateTag` from webhook | See §6 open question — recommend `revalidate = 60` for v1 (webhook-triggered revalidation is a Phase 5 polish) |
| React 19 server actions for POST | Client fetch via `api()` | **Client fetch recommended.** `api()` already handles CSRF, 401 auto-refresh, 30s timeout, and offline/retry. Server actions would require re-implementing all of that for marginal benefit. [CITED: src/lib/api.ts:70-165] |

**Installation:** None. `npm install` / `npm ci` is unchanged. `package.json` must be byte-identical to `HEAD` after plan 04-01 commits.

**Version verification:** All dependencies are already pinned by Phase 3. `package.json` diff must be empty. A CI-style check in the plan verification step: `git diff --stat HEAD~N package.json package-lock.json` returns zero lines of change.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (public)/              # NEW route group for public pages (Phase 4)
│   │   ├── layout.tsx         # NEW: PublicNavbar + TopBanner + Footer + PreFooter wrapper
│   │   ├── page.tsx           # NEW: home (screen 1)
│   │   ├── toutes-les-cagnottes/
│   │   │   └── page.tsx       # NEW: all-cagnottes (screen 2)
│   │   └── c/
│   │       └── [slug]/
│   │           ├── page.tsx               # NEW: detail (screens 21/22)
│   │           ├── loading.tsx            # NEW: skeleton
│   │           ├── participer/page.tsx    # NEW: form (screen 23)
│   │           ├── paiement/page.tsx      # NEW: method picker (screen 24)
│   │           └── merci/page.tsx         # NEW: we design
│   ├── robots.ts              # MODIFY: disallow /c/ + /tableau-de-bord/
│   ├── layout.tsx             # keep as-is (ToastProvider + fonts)
│   ├── page.tsx               # DELETE? (currently placeholder; (public)/page.tsx replaces it)
│   └── api/pay-redirect/      # UNCHANGED (sealed — audit 008/009)
├── components/
│   ├── ui/                    # Ring 1 — untouched
│   ├── layout/                # Ring 2 — untouched (PublicNavbar, Footer, TopBanner, PreFooter exist)
│   ├── cagnottes/             # Ring 2 — untouched (CampaignCard, FilterChipBar exist)
│   ├── checkout/              # Ring 2 — untouched (MiniCagnotteCard, OrderSummary exist)
│   └── share/                 # Ring 2 — untouched (ShareSheet exists)
├── lib/
│   ├── commission.ts          # NEW: frontend mirror of backend/src/lib/commission.ts
│   ├── redirect.ts            # NEW: openPaymentUrl(url) with 3-way in-app branching
│   ├── api.ts                 # UNCHANGED
│   ├── useApi.ts              # UNCHANGED
│   ├── utils.ts               # UNCHANGED (isInAppBrowser / isTikTokBrowser are sealed per audit-009)
│   ├── format.ts              # UNCHANGED
│   └── constants.ts           # MODIFY: add COMMISSION_LABELS.formatPercent helper + PARTICIPER_STEPS labels
```

**Route group choice:** `(public)` is recommended over adding to root `app/` directly because Phase 5 will need a parallel `(auth)` group (for signup/login with a cleaner layout, no footer) and Phase 6 will need `(authed)` (with DashboardNavbar + SidebarNav wrapper, no PublicNavbar). Establishing the `(public)` group in Phase 4 gives Phase 5/6 a clean pattern to follow.

### Pattern 1: SSR shell + client-polled progress for cagnotte detail

**What:** Load metadata + cover + description + static bits on the server, but poll `totalRaised` / `donorCount` from the client so the "viral moment" (donation pouring in) updates live without SSR revalidation lag.

**When to use:** Any page where a critical number changes in real-time faster than the ISR revalidate interval. For cagnottes, the goal bar moving *while the user is looking at it* is part of the social-proof loop.

**Example (recommended for `/c/[slug]/page.tsx`):**

```typescript
// src/app/(public)/c/[slug]/page.tsx — RSC
// Source: combines Next 16 App Router + lib/api semantics
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CampaignDetailClient } from "./CampaignDetailClient";

export const revalidate = 60; // 60s ISR for public cagnottes
// For private, we override per-request via headers or `Cache-Control` (but SSR respects visibility)

async function getCagnotte(slug: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const res = await fetch(`${base}/api/cagnottes/${slug}`, {
    // Tag the fetch so we can revalidateTag('cagnotte:slug') from a webhook later
    next: { tags: [`cagnotte:${slug}`], revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load ${slug}`);
  return res.json();
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const cagnotte = await getCagnotte(slug);
  if (!cagnotte) return { title: "Cagnotte introuvable" };

  // Private cagnottes are noindex — see §9
  const isPrivate = cagnotte.visibility === "private";

  return {
    title: cagnotte.title,
    description: cagnotte.description?.slice(0, 155) ?? "Soutenez cette cagnotte",
    openGraph: {
      title: cagnotte.title,
      description: cagnotte.description?.slice(0, 200) ?? "Soutenez cette cagnotte",
      images: cagnotte.coverUrl ? [{ url: cagnotte.coverUrl, width: 1200, height: 630 }] : [],
      url: `https://cagnottes.sn/c/${slug}`,
      type: "website",
      siteName: "Cagnottes.sn",
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title: cagnotte.title,
      description: cagnotte.description?.slice(0, 200) ?? "Soutenez cette cagnotte",
      images: cagnotte.coverUrl ? [cagnotte.coverUrl] : [],
    },
    robots: isPrivate ? { index: false, follow: false } : { index: true, follow: true },
    // Per research recommendation: even for public, robots.txt disallows /c/ in v1.
    // generateMetadata noindex is a defense-in-depth second layer.
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cagnotte = await getCagnotte(slug);
  if (!cagnotte) notFound();

  return <CampaignDetailClient initial={cagnotte} slug={slug} />;
}
```

```typescript
// src/app/(public)/c/[slug]/CampaignDetailClient.tsx — "use client"
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function CampaignDetailClient({ initial, slug }: { initial: any; slug: string }) {
  const [progress, setProgress] = useState({
    totalRaised: initial.totalRaised,
    donorCount: initial.donorCount,
  });

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        // Re-fetch detail endpoint — it returns fresh aggregates on every call
        const fresh = await api<typeof initial>(`/api/cagnottes/${slug}`);
        if (!cancelled && fresh) {
          setProgress({ totalRaised: fresh.totalRaised, donorCount: fresh.donorCount });
        }
      } catch {
        // silent — polling is best-effort
      }
    };
    // Only poll when page is visible (mobile users on 3G shouldn't burn battery)
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    const interval = setInterval(tick, 20_000);
    return () => { cancelled = true; clearInterval(interval); document.removeEventListener("visibilitychange", onVis); };
  }, [slug]);

  return <CampaignDetailView cagnotte={{ ...initial, ...progress }} />;
}
```

**Why this pattern:** keeps SSR/OG meta intact for WhatsApp crawler, polls only when the tab is foregrounded, bounded cost (20s interval = 3 req/min max), reuses existing detail endpoint (no new `/progress` route needed in Phase 4).

### Pattern 2: React 19 `useActionState` + client fetch for participate form

**What:** Native `<form>` submission with React 19 `useActionState` hook managing pending/error/success state, posting via the existing `api()` wrapper (NOT Next.js server actions).

**Why not server actions:** server actions would bypass `src/lib/api.ts`, which already handles CSRF + 401 refresh + 30s timeout + offline retry. Duplicating that logic is waste. See [src/lib/api.ts:70-165](../../../src/lib/api.ts).

**Example (recommended for `/c/[slug]/participer/page.tsx`):**

```typescript
// Source: React 19 docs + src/lib/api.ts pattern
"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

type FormState = { error: string | null; pending: boolean };
const initialState: FormState = { error: null, pending: false };

async function submitDonation(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const res = await api<{ order: { reference: string }; redirectUrl: string }>("/api/orders", {
      method: "POST",
      body: {
        sellerSlug: formData.get("sellerSlug"),
        cagnotteSlug: formData.get("cagnotteSlug"),
        orderType: "DONATION",
        amount: Number(formData.get("amount")),
        paymentType: "wave_money", // overwritten on paiement page
        customerName: `${formData.get("firstName")} ${formData.get("lastName")}`.trim(),
        customerEmail: formData.get("email") || undefined,
        customerPhone: formData.get("phone"),
        donorMessage: formData.get("message") || undefined,
        isAnonymous: formData.get("isAnonymous") === "on",
        messageIsPrivate: formData.get("messageIsPrivate") === "on",
      },
    });
    // Store the reference in sessionStorage so /paiement can read it
    sessionStorage.setItem(`order:${res.order.reference}`, JSON.stringify(res));
    // Navigate to payment page — this is inside the action, but useRouter is client-side
    window.location.href = `/c/${formData.get("cagnotteSlug")}/paiement?ref=${res.order.reference}`;
    return { error: null, pending: false };
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : "Erreur réseau";
    return { error: msg, pending: false };
  }
}

export default function ParticiperPage() {
  const [state, formAction, isPending] = useActionState(submitDonation, initialState);
  return (
    <form action={formAction}>
      {/* ... fields ... */}
      <button type="submit" disabled={isPending}>
        {isPending ? "Envoi..." : "Continuer vers le paiement"}
      </button>
      {state.error && <p role="alert" className="text-red-600">{state.error}</p>}
    </form>
  );
}
```

**Why `useActionState` over `useState` + handler:** the pending state is tracked automatically, the action becomes a pure function testable in isolation, form resubmission is blocked during pending. It's the React 19 idiom and avoids ad-hoc boolean juggling.

### Anti-patterns to avoid

- **Don't rewrite `isInAppBrowser()` or `isTikTokBrowser()`.** They are audit-009 output. [src/lib/utils.ts:27-42](../../../src/lib/utils.ts) is sealed. If you need a new detection, add a new function next to them.
- **Don't touch `/api/pay-redirect/route.ts`.** [src/app/api/pay-redirect/route.ts:1-48](../../../src/app/api/pay-redirect/route.ts) is sealed. Phase 4 consumes it (TikTok path base64-encodes → wraps in `/api/pay-redirect?t=...`).
- **Don't put the Bictorys redirect URL in a `<Link>` or `<form action>`.** Must go through the 3-way branch. See §15.
- **Don't fetch `/api/cagnottes/:slug` from a Ring 2 composed block.** Pages own the fetch; blocks receive props. Phase 3 purity rule.
- **Don't server-action the donation submit.** Use client `api()` — keeps CSRF + 401 refresh + retry centralized.
- **Don't render the server-returned commission as the label** without recomputing. The server returns `redirectUrl` from Bictorys but does not include a `commission` field in the POST response. The label is purely client-side — compute it from `{ amount, subtype }` using the frontend mirror.
- **Don't ship a sitemap entry for `/c/`** until the FRONTEND-DEVIATIONS log has an explicit opt-in entry. v1 is disallow-all.
- **Don't use `window.open` for payments.** TikTok + IG + FB all block it. Use `window.location.href` or `navigator.share()` per the branching rules.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug URL generation | Custom React Router | Next.js App Router `[slug]` folder | Built-in, SSR, ISR, metadata — everything we need |
| Payment redirect | Custom WebView detection | `isInAppBrowser() / isTikTokBrowser()` from `src/lib/utils.ts` | Battle-tested via audits 008/009 — 2 weeks of debugging already banked |
| TikTok URL bypass | Custom proxy | `src/app/api/pay-redirect/route.ts` base64 scheme | Already sealed; audit-009 proves every other approach (including this one in TikTok) fails, but it succeeds for IG/FB |
| Commission math | Hand-rolled percentages | Mirror of [backend/src/lib/commission.ts:49-74](../../../backend/src/lib/commission.ts) | Pure, tested, invariant-enforced. Any drift here = Banani "Offerts" lie 2.0 |
| Form state machine | Custom `useReducer` | React 19 `useActionState` | Built-in, typed, pending state auto-managed |
| SSR data fetch | `useEffect` on the client | RSC `fetch` in `page.tsx` | Next.js server-renders the HTML with real data; WhatsApp crawler needs this |
| OG meta tags | Hand-written `<head>` | `generateMetadata` in `page.tsx` | Typed, merged with root metadata, supports dynamic per-slug |
| Progress polling | WebSocket / SSE | `setInterval` + `api()` | v1 simplicity; 20s cadence is fine for 3G |
| Thank-you polling | Custom retry loop | `setInterval` with visibility guard + bounded retry count | Same reasoning |
| CSRF token injection | Manual header | `api()` wrapper auto-attaches `x-csrf-token` | [src/lib/api.ts:82-89](../../../src/lib/api.ts) |
| 401 refresh | Manual refresh logic | `api()` wrapper auto-calls `/api/auth/refresh` | [src/lib/api.ts:111-118](../../../src/lib/api.ts) |
| WhatsApp share URL | Custom encoding | `https://wa.me/?text=${encodeURIComponent(text)}` in `ShareSheet` | Already implemented in [src/components/share/ShareSheet.tsx](../../../src/components/share/ShareSheet.tsx) |
| Cover image sizing | Raw `<img>` | `next/image` with `priority` on the hero | Built-in LCP optimization, automatic `srcset`, no-deps |

**Key insight:** Phase 4 is **assembly**, not authorship. Every hard problem (payment proxy, in-app detection, CSRF, refresh, commission math, OG meta, ISR) has an existing solution on disk. The work is wiring.

---

## Common Pitfalls

### Pitfall 1: Regressing audit-008 TikTok flow
**What goes wrong:** Refactoring `isInAppBrowser()` to "clean it up", removing TikTok from the regex, or calling `window.open()` instead of `navigator.share()` inside TikTok.
**Why it happens:** The helpers look "too simple" or "redundant". Someone tries to collapse the 3-way branch into a 2-way.
**How to avoid:** Include `grep -c "TikTok|musical_ly|BytedanceWebview" src/lib/utils.ts` as a verification assertion in the plan — must return `2` (one for each helper). Any diff to `src/lib/utils.ts` in plan 04-01 is a blocker.
**Warning signs:** "can we simplify isInAppBrowser?" — **no**. Audit 009 already tried simplification and it broke TikTok.

### Pitfall 2: Commission label drift ("Offerts" resurrection)
**What goes wrong:** A Phase 4 page hardcodes "Offerts", or forgets to pass `commissionAmount` to `OrderSummary`, or computes `Math.round(amount * 0.08)` instead of `Math.floor(amount * 800 / 10000)` — producing a 1-FCFA drift.
**Why it happens:** Banani JSX literally says "Frais de plateforme: Offerts" and pressure to "match the design" overrides the D-04 deviation.
**How to avoid:**
  1. `src/lib/commission.ts` is the single client-side source of truth — import from there, never inline
  2. Plan verification step: `grep -ri "offerts" src/app/` must return empty
  3. Plan verification step: `grep -ri "Math\.round.*commission\|0\.06\|0\.08" src/app/` must return empty
**Warning signs:** anyone proposing to "just show the amount without percent" — the Banani design explicitly has the percent, so does D-04. Show both.

### Pitfall 3: Private cagnotte SEO leak (P05)
**What goes wrong:** Sitemap includes `/c/<private-slug>`, or `robots.txt` doesn't disallow `/c/`, or `generateStaticParams` builds private pages at build time.
**Why it happens:** The list endpoint `/api/cagnottes` is already visibility-filtered at the SQL level [verified in backend/src/routes/cagnottes.ts:110-112], so it *feels* safe to use as a build-time source. It is — but you still have to opt in via robots. Separately, `generateStaticParams` uses the SAME filtered list, so it's safe; the danger is if someone adds a "hydrate all blocks" fallback that queries `/api/blocks` (the private-inclusive creator endpoint) instead.
**How to avoid:**
  1. `robots.txt` disallows `/c/` in v1 — see §9
  2. `generateStaticParams` MUST source from `/api/cagnottes` (public list, SQL-filtered), never from `/api/blocks` or direct Prisma
  3. The detail page's `generateMetadata` sets `robots: { index: false, follow: false }` on `visibility === 'private'` as defense-in-depth (second layer)
  4. `/c/[slug]/page.tsx` does NOT export `dynamicParams: false` — we accept on-demand rendering for non-pre-generated slugs
**Warning signs:** anyone proposing to "pre-render all cagnottes" — ask: filtered how? Check the query source.

### Pitfall 4: ISR stale progress during viral moments
**What goes wrong:** `revalidate = 60` gives stale progress during a donation wave (10k FCFA goal hits 100% but page still shows 50% for 60s).
**Why it happens:** ISR cache doesn't know a donation came in.
**How to avoid:** client-side poll in `CampaignDetailClient.tsx` (§Pattern 1 above) updates progress every 20s while tab is visible. SSR provides the initial paint + OG meta; client updates the numbers.
**Warning signs:** anyone proposing to remove the `useEffect` poll — the ISR-only path has a 60s staleness window during the most important moment.

### Pitfall 5: WhatsApp OG cache staleness
**What goes wrong:** Creator updates cover image, WhatsApp crawler has cached the old one, share preview is wrong for hours.
**Why it happens:** WhatsApp caches OG tags aggressively (~1 week) keyed by URL. `og:image` without cache-busting is sticky.
**How to avoid:**
  1. Include a content hash or `updatedAt` in the `og:image` URL (e.g. `?v=<blockId>_<updatedAt>`)
  2. Document the WhatsApp debugger URL in the plan: `https://developers.facebook.com/tools/debug/` (WhatsApp uses Facebook's scraper) — creator can force-refresh on change
  3. Plan 04-01 does NOT need to implement cache-busting for v1; document as §Open Questions
**Warning signs:** bug report "my cover changed but WhatsApp shows old" — it's WhatsApp, not us. Point to debugger.

### Pitfall 6: Thank-you page polls forever
**What goes wrong:** Bictorys never fires the webhook (or webhook signature fails), thank-you page polls `/api/orders/:ref/status` every 3s indefinitely, burns battery on 3G.
**Why it happens:** Naive `setInterval` without a stop condition.
**How to avoid:** bounded poll — every 3s for up to 2 minutes (40 polls max), then show "Paiement en cours de vérification" with manual retry button. Stop polling on status `PAID`, `FAILED`, or `EXPIRED`. Also stop when tab is hidden.
**Warning signs:** `setInterval` with no `clearInterval` exit path in the plan.

### Pitfall 7: In-app branch fires before hydration
**What goes wrong:** Server-rendered button uses `window.location.href` (default); hydration flips it to `navigator.share()` in TikTok; user taps during the gap, wrong code runs.
**Why it happens:** SSR doesn't know the UA. The branch must run client-side only.
**How to avoid:**
  1. Payment button is `"use client"` and reads `navigator.userAgent` inside `useEffect` (or on click, which is guaranteed post-hydration)
  2. Never branch at render time based on `navigator.*` — do it on click
**Warning signs:** server error "navigator is not defined" during build — branch is in a server component. Fix: move to client component.

### Pitfall 8: sessionStorage loss between `/participer` and `/paiement`
**What goes wrong:** TikTok WebView sometimes drops sessionStorage on navigation, so the order ref saved on `/participer` is gone by the time `/paiement` loads.
**Why it happens:** in-app browser sandboxing.
**How to avoid:** pass `?ref=<reference>` as a URL query param to `/paiement` AND read from sessionStorage as a hydration source. Query param is authoritative. Then fetch `/api/orders/:ref/status` to get full order shape.
**Warning signs:** plan relies purely on sessionStorage for state transfer.

### Pitfall 9: Building home & all-cagnottes with hero/discovery data but no test fixtures
**What goes wrong:** Home page fetches `/api/cagnottes?limit=6` at SSR, seed DB is empty, hero cards render as empty state, visual diff fails.
**Why it happens:** Phase 2's `seed-dev.ts` (plan 02-03) provides 4 cagnottes, but in a fresh clone the DB may be empty.
**How to avoid:** Plan 04-01 includes a reminder task: "run `tsx backend/scripts/seed-dev.ts` before the visual review" in the verification checklist. Also: home page must render gracefully with empty state (0 cagnottes → show marketing hero only + "Soyez le premier" CTA).
**Warning signs:** plan assumes seed data is present without stating it.

### Pitfall 10: Payment method picker collapses mobile money into single button
**What goes wrong:** Banani design shows 4 buttons (Wave, Orange Money, Free Money, Carte), but Phase 4 ships a single "Payer" button that lets Bictorys route — losing the Wave-first UX advantage documented in research/SUMMARY.md:39.
**Why it happens:** It's simpler to post a single `paymentType`.
**How to avoid:** 4 distinct buttons, each sets `paymentType` to `wave_money | orange_money | moov | card` before POST. Phase 4 MUST preserve the 4-button UX. The `paymentType` enum is already accepted by [backend/src/routes/orders.ts:35](../../../backend/src/routes/orders.ts).
**Warning signs:** plan task "add payment button" (singular).

---

## Code Examples

Verified patterns from official sources and existing codebase.

### 1. In-app browser 3-way branch — canonical snippet

```typescript
// src/lib/redirect.ts — NEW in Phase 4
// Source: audits 008 + 009 decisions, transcribed faithfully
import { isInAppBrowser, isTikTokBrowser } from "@/lib/utils";

const PAY_REDIRECT_ALLOWED_DOMAINS = [
  "pay.wave.com",
  "checkout.bfrpay.com",
  "checkout.bfrpay.net",
  "pay.bfrpay.com",
  "pay.bictorys.com",
];

type OpenResult = "navigated" | "shared" | "copied" | "unsupported";

function encodeForPayRedirect(url: string): string {
  // Base64 the URL so TikTok's query-param scanner can't see pay.wave.com
  if (typeof window === "undefined") return "";
  return btoa(url);
}

function isAllowedPayDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return PAY_REDIRECT_ALLOWED_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

/**
 * Open a Bictorys payment redirect URL honoring audit-008/audit-009 constraints.
 *
 * - Safari/Chrome/normal: same-window navigation via window.location.href
 * - Instagram/Facebook WebView: target="_blank" is handled by the caller's <a>
 *   tag. This function is invoked ONLY from Safari/Chrome/TikTok paths. The
 *   IG/FB path is a plain <a target="_blank" rel="noopener"> in the JSX,
 *   which opens the system browser.
 * - TikTok WebView: navigator.share() on user-gesture. Fallback: clipboard.
 *
 * Must be called from a click handler (user-gesture) for share/navigation to
 * work in WebViews.
 */
export async function openPaymentUrl(url: string): Promise<OpenResult> {
  if (!isAllowedPayDomain(url)) {
    // Defensive — caller should never pass a non-Bictorys URL
    console.warn("[openPaymentUrl] Unknown domain, refusing:", url);
    return "unsupported";
  }

  // TikTok branch: navigator.share() is the ONLY way out per audit-009.
  // target="_blank" is blocked, window.location.href is blocked, 302 is blocked.
  if (isTikTokBrowser()) {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url });
        return "shared";
      } catch {
        // User cancelled share — fall through to clipboard
      }
    }
    // Fallback: copy to clipboard + toast
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        return "copied";
      } catch {}
    }
    return "unsupported";
  }

  // Instagram / Facebook: target="_blank" is handled in JSX, not here.
  // If this function is reached inside IG/FB, it's a same-window fallback.

  // Normal browsers (Safari, Chrome): same-window navigation.
  if (typeof window !== "undefined") {
    window.location.href = url;
    return "navigated";
  }
  return "unsupported";
}

/** Builds the base64-encoded /api/pay-redirect URL for TikTok paths where
 *  even navigator.share fails (rare; keeps the route alive as ultimate fallback). */
export function buildProxyRedirectUrl(bictorysUrl: string): string {
  const encoded = encodeForPayRedirect(bictorysUrl);
  return `/api/pay-redirect?t=${encoded}`;
}
```

### 2. Payment button — 3-way branch in JSX

```tsx
// src/app/(public)/c/[slug]/paiement/PaiementClient.tsx
"use client";
import { useState, useEffect } from "react";
import { openPaymentUrl, buildProxyRedirectUrl } from "@/lib/redirect";
import { isInAppBrowser, isTikTokBrowser } from "@/lib/utils";
import { api } from "@/lib/api";
import { Button } from "@/components/ui";

type PaymentType = "wave_money" | "orange_money" | "moov" | "card";

export function PayButton({
  redirectUrl,
  paymentType,
}: {
  redirectUrl: string;      // from POST /api/orders response
  paymentType: PaymentType;
}) {
  // Detect WebView on client only (SSR-safe via useEffect)
  const [browser, setBrowser] = useState<"tiktok" | "meta" | "normal" | "unknown">("unknown");
  useEffect(() => {
    if (isTikTokBrowser()) setBrowser("tiktok");
    else if (isInAppBrowser()) setBrowser("meta");
    else setBrowser("normal");
  }, []);

  const label = paymentTypeLabel(paymentType);

  // Meta WebView: <a target="_blank"> — this is THE way that works for IG/FB
  if (browser === "meta") {
    return (
      <a
        href={redirectUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary-lg w-full text-center"
      >
        {`Payer avec ${label}`}
      </a>
    );
  }

  // TikTok: button triggering navigator.share() on user gesture
  // Normal: button triggering window.location.href
  return (
    <Button
      variant="primary"
      size="lg"
      fullWidth
      onClick={async () => {
        const result = await openPaymentUrl(redirectUrl);
        if (result === "copied") {
          // Show toast: "Lien copié — ouvre-le dans Safari/Chrome"
        }
      }}
    >
      {`Payer avec ${label}`}
    </Button>
  );
}

function paymentTypeLabel(t: PaymentType): string {
  return {
    wave_money: "Wave",
    orange_money: "Orange Money",
    moov: "Free Money",
    card: "Carte bancaire",
  }[t];
}
```

**Key points:**
- `browser` is `"unknown"` until the `useEffect` runs (first client tick) — button is interactive from that moment. During SSR the default path (normal browser button) renders, which is the safest fallback.
- Meta (IG/FB) path is a real `<a target="_blank">` — NOT a `Button` — because `target="_blank"` is what works in those WebViews. Verified by audit-008 table.
- TikTok path calls `openPaymentUrl` which handles the share/clipboard cascade internally.
- `rel="noopener noreferrer"` on the Meta path for security.

### 3. Commission frontend mirror

```typescript
// src/lib/commission.ts — NEW in Phase 4
// Mirror of backend/src/lib/commission.ts — any drift = Pitfall 2
// ANY EDIT TO THIS FILE MUST BE MIRRORED IN backend/src/lib/commission.ts

export const FUNDRAISER_COMMISSION_BP = {
  solidaire: 600, // 6%
  festive: 800,   // 8%
} as const;

export type FundraiserSubtype = keyof typeof FUNDRAISER_COMMISSION_BP;

export interface CommissionResult {
  rate: number;       // basis points
  commission: number; // FCFA integer
  net: number;        // FCFA integer
}

/**
 * Compute commission client-side matching backend/src/lib/commission.ts:49-74.
 * Math.floor (favor seller), invariant commission + net === gross.
 */
export function computeCommission(
  gross: number,
  subtype: FundraiserSubtype,
): CommissionResult {
  if (!Number.isInteger(gross) || gross < 0) {
    throw new Error(`computeCommission: gross must be a non-negative integer, got ${gross}`);
  }
  if (!(subtype in FUNDRAISER_COMMISSION_BP)) {
    throw new Error(`computeCommission: unknown subtype "${subtype}"`);
  }
  const rate = FUNDRAISER_COMMISSION_BP[subtype];
  const commission = Math.floor((gross * rate) / 10000);
  const net = gross - commission;
  if (commission + net !== gross) {
    throw new Error(`computeCommission invariant violated: ${commission} + ${net} !== ${gross}`);
  }
  return { rate, commission, net };
}

/** "8% · 800 FCFA" label for the pay page — NEVER "Offerts" */
export function formatCommissionLabel(gross: number, subtype: FundraiserSubtype): string {
  const { rate, commission } = computeCommission(gross, subtype);
  const percent = (rate / 100).toFixed(0);
  // Use formatPrice for consistent FCFA spacing
  return `${percent}% · ${commission.toLocaleString("fr-FR").replace(/\u202F|\u00A0/g, " ")} FCFA`;
}
```

### 4. `generateStaticParams` for public detail (optional — recommend disabled)

```typescript
// src/app/(public)/c/[slug]/page.tsx
// RECOMMENDATION: skip generateStaticParams entirely in v1.
// Next 16 dynamic rendering on first request + ISR cache is sufficient.
// Uncomment below if we want static pre-render of the top N cagnottes at build time.

// export async function generateStaticParams() {
//   // SOURCE: /api/cagnottes — SQL-filtered to visibility='public' at
//   // backend/src/routes/cagnottes.ts:110-112. Never hit Prisma directly
//   // or /api/blocks (which is creator-scoped and returns private rows).
//   const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
//   const res = await fetch(`${base}/api/cagnottes?limit=50`);
//   if (!res.ok) return [];
//   const data = (await res.json()) as { cagnottes: { slug: string }[] };
//   return data.cagnottes.map((c) => ({ slug: c.slug }));
// }
```

**Recommendation:** do NOT ship `generateStaticParams` in v1. Reasons:
- Build-time fetch requires the backend to be up during `npm run build` — fragile in CI
- ISR on first request gives near-identical UX (1 slow fetch, then cached for 60s)
- Eliminates the entire class of "private cagnotte rendered at build time" bugs
- Private cagnottes via URL obscurity are dynamically rendered, never statically

Flag as open question §OQ-3 if the user wants to pre-render.

### 5. Updated `robots.ts`

```typescript
// src/app/robots.ts — MODIFY in Phase 4
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://cagnottes.sn";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/tableau-de-bord/",  // authed area
          "/api/",              // all API routes
          "/admin/",            // v2 (currently empty)
          "/c/",                // NEW: all cagnottes, public and private, disallowed in v1
                                // per ROADMAP P05 mitigation + PROJECT.md "URL obscurity only"
                                // Revisit in v2 once moderation + trust signals are in place.
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
```

Note: `sitemap.xml` is referenced but Phase 4 does NOT create it. For v1, we can either (a) ship `src/app/sitemap.ts` that returns only the home + all-cagnottes page (no `/c/`), or (b) not ship the route and let Next return 404. **Recommendation: ship (a)** — a minimal `sitemap.ts` with the 2 evergreen marketing pages. It's 10 LOC and closes the robots reference.

### 6. Audit-010 matrix template

```markdown
# Audit 010 — Banani in-app browser matrix (Phase 4 exit gate)

**Date initial test:** YYYY-MM-DD
**Tester:** {user name}
**cagnottes.sn commit:** `{git sha}`
**Bictorys mode:** staging (BICTORYS_API_KEY=...)
**Test cagnotte:** `/c/test-audit-010` (seed-dev.ts fixture, solidaire, 5000 FCFA goal)
**Test amount:** 500 FCFA
**Test payment type:** wave_money

## Matrix

| # | Browser | OS | Device | App version | Result | Taps | Screenshot | Notes |
|---|---------|-----|--------|-------------|--------|------|------------|-------|
| 1 | TikTok | iOS 17 | iPhone 14 | vXX.X.X | ✅/❌/⚠️ | N | `shots/audit-010/tiktok-ios.png` | ... |
| 2 | TikTok | Android 14 | Pixel 7 | vXX.X.X | | | | |
| 3 | Instagram | iOS 17 | iPhone 14 | vXX.X.X | | | | |
| 4 | Instagram | Android 14 | Pixel 7 | vXX.X.X | | | | |
| 5 | Facebook | iOS 17 | iPhone 14 | vXX.X.X | | | | |
| 6 | Facebook | Android 14 | Pixel 7 | vXX.X.X | | | | |
| 7 | Safari | iOS 17 | iPhone 14 | native | | | | |
| 8 | Chrome | Android 14 | Pixel 7 | vXX.X.X | | | | |

**Result legend:**
- ✅ Donation completed end-to-end (PAID received on `/merci`)
- ⚠️ Donation completed but UX friction (e.g. extra tap, unclear copy)
- ❌ Blocked — cannot complete donation

**Cell is green** if result is ✅ AND no regression versus the Safari baseline row.

## Expected flows per cell (reference)

| Cell | Expected flow (from audit-009) |
|------|-------------------------------|
| TikTok iOS/Android | Tap Payer → interstitielle → "Ouvrir dans le navigateur" → share sheet → Safari/Chrome → Wave → /merci. 3 taps. |
| Instagram iOS/Android | Tap Payer → interstitielle → "Ouvrir Wave" (target=_blank) → Safari/Chrome → Wave → /merci. 2 taps. |
| Facebook iOS/Android | Same as Instagram. 2 taps. |
| Safari iOS | Tap Payer → window.location.href → Wave → /merci. 1 tap. |
| Chrome Android | Same as Safari. 1 tap. |

## Regressions from audits 008 / 009

If any cell breaks compared to the matrices in audit-008 and audit-009, roll back Phase 4 plan 04-01 commit and investigate before resuming.

## Sign-off

- [ ] All 8 cells green
- [ ] No regression from audit-008 Facebook/Instagram matrix
- [ ] No regression from audit-009 TikTok matrix
- [ ] Tester: {name}, date: {YYYY-MM-DD}
- [ ] Reviewed by: {name}, date: {YYYY-MM-DD}

**Phase 4 exit gate closed:** ☐
```

---

## Runtime State Inventory

**Skipped — Phase 4 is greenfield frontend only.** No renames, no refactors, no data migrations. All backend state (DB, Redis, env vars) is unchanged. The only runtime concern is client sessionStorage (for order-ref handoff between `/participer` and `/paiement`), which is non-persistent.

Explicit checks:

| Category | Items found | Action required |
|----------|-------------|-----------------|
| Stored data | None — Phase 4 writes no new DB rows beyond what `POST /api/orders` already writes | None |
| Live service config | None — Bictorys config unchanged, no new webhook, no new rate limiter | None |
| OS-registered state | None — no cron, no launchd, no Task Scheduler | None |
| Secrets/env vars | No new env vars. Phase 4 consumes `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_BASE_URL` which already exist | None |
| Build artifacts | Standard Next.js build output. `.next/` regenerates on each build. No stale egg-info / cache concerns | None |

---

## Environment Availability

Phase 4 depends on runtime services being available during build + dev + manual testing.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev + build | — | ≥20 (for React 19) | — |
| Next.js 16 | App Router, RSC, `useActionState` | ✓ | pinned in package.json | — |
| Backend Express on :4000 | SSR `fetch` to `/api/cagnottes/:slug` during dev | depends on local env | N/A | `NEXT_PUBLIC_API_URL` can point to staging if local not running |
| Neon Postgres | Backend data | depends on `DATABASE_URL` | serverless | — |
| Upstash Redis | rate limiters on POST /api/orders | depends on `UPSTASH_REDIS_*` | REST API | — |
| Bictorys staging | Live payment creation | depends on `BICTORYS_API_KEY` | staging | Cannot test E2E without it; smoke-test 02-03 already asserts |
| Real devices (TikTok + IG + FB apps installed, iOS + Android) | Audit-010 matrix | user must arrange | — | **Matrix cannot be faked on desktop devtools UA spoof** — WebView quirks only reproduce on real devices |
| WhatsApp (for OG meta test) | Validate share preview | user must arrange | — | Use Facebook debugger as substitute |
| ngrok or Tailscale funnel | Expose localhost to WhatsApp crawler for OG test | optional | — | Test OG tags post-deploy only |

**Missing dependencies with no fallback:**
- Real mobile devices with TikTok / IG / FB apps — **BLOCKING** for the 8-cell matrix. The plan must call this out as a human dependency.

**Missing dependencies with fallback:**
- Bictorys staging: use Neon dev DB + staging key (Phase 2 smoke-test already uses this)
- ngrok for OG testing: deferred to post-deploy

---

## State of the Art

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router `getServerSideProps` | App Router RSC + `fetch` + `generateMetadata` | Next.js 13+ (we're on 16) | Metadata is typed, dynamic per-slug, collocated with the page |
| `useEffect` + `useState` + `fetch` for form state | React 19 `useActionState` | React 19 (shipped 2024) | Pending state auto-managed, server/client uniform |
| `getStaticPaths` + `getStaticProps` | `generateStaticParams` + RSC fetch with `next: { tags }` | Next 13+ | `revalidateTag` enables on-demand invalidation from webhooks |
| Custom base64 URL encoding for WebView bypass | Same pattern (still the current state of the art in 2026) | — | TikTok still blocks plain redirects per audit-009 |
| `<script>` tags for social share | `navigator.share()` on mobile, `wa.me` URL on desktop | 2023+ | Already wired in `ShareSheet.tsx` |

**Deprecated / outdated:**
- `getServerSideProps` — use RSC
- `next/router.push` in render — use `<Link>` declaratively or `router.push` only in event handlers (client component)
- `useRouter` from `next/router` — use `next/navigation`

---

## Validation Architecture

Per `.planning/config.json` — if `workflow.nyquist_validation` is set, include this. Phase 3 ran without automated tests. Phase 4 continues that pattern but adds **manual device matrix as the exit gate**.

### Test framework

| Property | Value |
|----------|-------|
| Framework | **None configured** (frontend has no Vitest/Jest/Playwright) |
| Config file | none |
| Quick run command | `npm run lint && npm run build` |
| Full suite command | `npm run lint && npm run build && bash scripts/verify-ring-purity.sh` |

### Phase requirements → verification map

| Req ID | Behavior | Test type | Automated command | Status |
|--------|----------|-----------|-------------------|--------|
| DONF-01 | Home renders at 1280px and 375px | visual | `npm run build && npm run start` + manual browser | manual |
| DONF-02 | All-cagnottes renders with filter + pagination | visual | same | manual |
| DONF-03 | `/c/[slug]` SSR + poll works | integration | same + real slug from seed-dev | manual |
| DONF-04 | Participate form posts and advances | e2e | manual w/ Bictorys staging | manual |
| DONF-05 | Paiement selector + commission label | unit-ish | `grep -q "formatCommissionLabel" src/app/(public)/c/\[slug\]/paiement/` | `grep` |
| DONF-06 | Merci polls and resolves | e2e | manual w/ real donation | manual |
| DONF-07 + DONA-06 | 3-way branch on real devices | **audit-010 matrix** | manual, 8 cells | **exit gate** |

### Sampling rate

- **Per task commit:** `npm run build` + `npm run lint` — must be 0 errors, 0 warnings
- **Per plan merge:** full suite above + `grep -ri "offerts\|paydunya" src/app/` must be empty
- **Phase gate:** audit-010.md has 8 green cells + tester + reviewer signatures

### Wave 0 gaps

- [ ] `scripts/verify-phase4.sh` — static checks (no "offerts", no "PayDunya", no "€", no "+33" in `src/app/` + `grep` for `isInAppBrowser` usage count)
- [ ] Manual WhatsApp crawler test for OG meta — not scripted, user-run
- [ ] Real device matrix — not scripted, user-run

*(If the project adds Playwright in Phase 5+, rewrite these as e2e tests. For now, manual is acceptable per Phase 3 precedent.)*

---

## Security Domain

If `security_enforcement` is enabled (default ON absent explicit `false`), Phase 4 must address:

### Applicable ASVS categories

| ASVS category | Applies | Standard control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 4 pages are public; no auth required for donor |
| V3 Session Management | partial | `sessionStorage` for order ref handoff — non-sensitive, accepted |
| V4 Access Control | yes | Private cagnottes — URL obscurity + noindex + robots disallow (P05) |
| V5 Input Validation | yes | Client form inputs — Zod mirror on frontend OR trust backend `createOrderSchema` (recommended: trust backend, display errors from ApiError) |
| V6 Cryptography | no | No new crypto; Bictorys handles its own. `/api/pay-redirect` base64 is obfuscation, not security |
| V7 Error Handling | yes | `ApiError` messages shown to user; no stack traces |
| V10 Malicious Code | yes | `next/image` for covers (no raw HTML injection), React auto-escapes; description is plain text, not dangerouslySetInnerHTML |
| V14 Config | yes | `NEXT_PUBLIC_*` env vars only; no server secrets in client bundle |

### Known threat patterns for this stack

| Pattern | STRIDE | Standard mitigation |
|---------|--------|---------------------|
| Stored XSS in cagnotte description | Tampering | React auto-escaping (descriptions come from backend; Phase 2 responsibility to sanitize on write). Phase 4 renders as React text, never `dangerouslySetInnerHTML` |
| SSRF via OG image URL | Tampering | Backend returns `coverUrl` via `/api/files/:key` proxy — known-safe domain. Frontend doesn't hit arbitrary URLs |
| Open redirect via `/api/pay-redirect?t=...` | Spoofing | **Already mitigated** by allowlist in [src/app/api/pay-redirect/route.ts:25-32](../../../src/app/api/pay-redirect/route.ts). Phase 4 relies on this allowlist; `openPaymentUrl` in `redirect.ts` also re-checks the same list defense-in-depth |
| CSRF on POST /api/orders | Tampering | `api()` wrapper auto-attaches `x-csrf-token`; backend `verifyCsrf` is on the /api/orders group unless the plan 02-01 explicitly bypasses for public orders. **Verify with backend team** — if /api/orders requires CSRF, the public donor has no CSRF cookie yet. See §Open Questions |
| Private cagnotte SEO leak | Information disclosure | robots.txt disallow /c/ + per-page `robots: { index: false }` on private + `generateStaticParams` skipped |
| Donor email harvesting | Information disclosure | Public participants endpoint masks names, never returns `customerEmail`. Verified [backend/src/routes/cagnottes.ts:88](../../../backend/src/routes/cagnottes.ts) |
| Donation replay | Spoofing | Backend rate-limits 20/min IP + 100/hr IP + 5/min per email + circuit breaker. Frontend does not add replay protection |

---

## Q&A — Detailed Findings (1 through 25)

The rest of this document is a per-question walkthrough matching the research_focus prompt. Every question is answered with line-number citations where possible.

---

### §1 — Audit-008 and Audit-009 decisions (full reproduction)

**This is the most important section. The planner and executor will re-read this before writing any pay button.**

#### Audit-008 summary ([audits/audit-008-inapp-browser-payment.md](../../../audits/audit-008-inapp-browser-payment.md))

**The problem:** TikTok's WebView blocks `<a target="_blank">` to `pay.wave.com`. TikTok shows its own interstitial "Ouvre ce lien dans ton navigateur" and the user cannot proceed.

**Root cause:** A prior commit had removed TikTok from `isInAppBrowser()`, so the code tried `window.location.href` for TikTok — which TikTok also blocks.

**The fix:** `src/lib/utils.ts` was patched to include `TikTok|musical_ly|BytedanceWebview` in `isInAppBrowser()`, AND a dedicated `isTikTokBrowser()` helper was added. Two code paths diverged.

**The matrix (reproduced from audit-008 lines 27-40):**

| | Facebook / Instagram | TikTok |
|---|---|---|
| **Primary button** | `<a target="_blank">` "Ouvrir Wave" | `navigator.share()` "Ouvrir dans Safari/Chrome" |
| **Secondary** | `navigator.share()` "Safari/Chrome" | `clipboard.writeText()` "Copier le lien" |
| **Tertiary** | "Copier le lien" (discreet) | — |
| **Message** | "ouvre le lien de paiement dans ton navigateur" | "Ce navigateur ne peut pas ouvrir Wave directement" |

**Fallback if `navigator.share` unavailable in TikTok:** "Copier le lien de paiement" becomes the primary filled button.

**Verification checklist (audit-008 lines 43-46):**
- [ ] From TikTok: "Ouvrir dans Safari/Chrome" button opens native share sheet
- [ ] From Instagram: "Ouvrir Wave" button opens Wave via `target="_blank"`
- [ ] From Facebook: same as Instagram
- [ ] From Safari/Chrome mobile: normal flow (direct redirect, no interstitial)

#### Audit-009 summary ([audits/audit-009-tiktok-payment-flow.md](../../../audits/audit-009-tiktok-payment-flow.md))

**Status:** ✅ Ready to push (2026-03-24).

**Detection table (audit-009 lines 17-22):**

| Function | Detects | User-Agent patterns |
|---|---|---|
| `isInAppBrowser()` | FB + IG + TikTok | `FBAN\|FBAV\|Instagram\|TikTok\|musical_ly\|BytedanceWebview` |
| `isTikTokBrowser()` | TikTok only | `TikTok\|musical_ly\|BytedanceWebview` |

**Per-browser flow (audit-009 lines 26-58):**

**Safari / Chrome (normal):**
```
Tap Payer → API → window.location.href = pay.wave.com → Wave opens directly ✅
After payment: Wave redirects to /{slug}/success ✅
```
- Interstitial: none
- Taps: 1

**Instagram / Facebook (Meta WebView):**
```
Tap Payer → API → our custom interstitial (polling in background)
→ "Ouvrir Wave" button (target="_blank") → Wave opens in Safari ✅
→ After payment: Wave redirects to /{slug}/success ✅
→ Original page: polling detects PAID → redirects too ✅
```
- Interstitial: our custom modal
- Primary button: "Ouvrir Wave" (`<a target="_blank">`)
- Secondary: "Ouvrir dans Safari/Chrome" (`navigator.share`)
- Tertiary: "Copier le lien"
- Taps: 2

**TikTok (ByteDance WebView):**
```
Tap Payer → API → our custom interstitial (polling in background)
→ "Ouvrir dans le navigateur" button (navigator.share) → share sheet → Safari → Wave ✅
→ After payment: Wave redirects to /{slug}/success ✅
```
- Interstitial: our custom modal (NOT TikTok's)
- Primary: "Ouvrir dans le navigateur" (`navigator.share()`)
- Secondary: "Copier le lien" (`navigator.clipboard`)
- Taps: 3

**Why TikTok is different (audit-009 lines 64-76):**

TikTok blocks **all** outbound navigation from its WebView:

| Method | Instagram/FB | TikTok |
|---|---|---|
| `<a target="_blank">` | ✅ opens Safari | ❌ blocked |
| `window.location.href` (async) | ❌ blocked | ❌ blocked |
| `window.location.href` (user click) | — | ❌ blocked |
| 302 server redirect | — | ❌ blocked |
| 302 + base64 URL | — | ❌ blocked |
| `navigator.share()` | ✅ | ✅ **(only way out)** |

`navigator.share()` is the only way out of TikTok's WebView because it's an OS-level system API (iOS/Android), not a web navigation.

**Rejected approaches (audit-009 lines 81-86):**
1. Remove TikTok from `isInAppBrowser()` → `window.location.href` after API = blocked by TikTok interstitial
2. `window.location.href` on direct user gesture → blocked
3. Proxy redirect `/api/pay-redirect?url=...` → TikTok scans query params, blocked
4. Proxy redirect + base64 `/api/pay-redirect?t=BASE64_URL` → **also blocked** (but the route stays alive as a fallback for IG/FB cases where query-param scanning is more lenient)

**Files modified (audit-009 lines 90-94):**
- `src/lib/utils.ts` → `isInAppBrowser()` includes TikTok, adds `isTikTokBrowser()`
- `src/components/store/PaymentModal.tsx` → TikTok branch with `navigator.share` as primary *(NOTE: this component was deleted in the fork cleanup; Phase 4 must rebuild the equivalent in the (public)/c/[slug]/paiement page)*
- `src/app/api/pay-redirect/route.ts` → route created but **not used for TikTok** (TikTok blocks it too). **Still used for IG/FB** where the base64 trick defeats their (less aggressive) query scanner.

**Post-payment return (audit-009 lines 100-106 — no risk):**

Backend sets `successRedirectUrl` when creating the order:
```
successRedirectUrl: ${BICTORYS_REDIRECT_URL}/${sellerSlug}/success?ref=${reference}&type=${orderType}
errorRedirectUrl: ${BICTORYS_REDIRECT_URL}/${sellerSlug}/error?ref=${reference}
```
Verified at [backend/src/routes/orders.ts:418](../../../backend/src/routes/orders.ts). After payment, the user is **always** redirected to the success page regardless of origin browser. Polling in the payment modal is a bonus for FB/IG where the original page stays open.

**⚠ Phase 4 consequence:** the Bictorys `successRedirectUrl` points to `${BICTORYS_REDIRECT_URL}/${sellerSlug}/success?ref=...` — that's `/{sellerSlug}/success`, not `/c/{cagnotteSlug}/merci`. The sellerSlug path was the fari.store convention. Phase 4 has TWO options:

**Option A (recommended, no backend change):** Accept that Bictorys redirects to `/{sellerSlug}/success?ref=...` and create a Next.js redirect from that path to `/c/{cagnotteSlug}/merci?ref=...`. The sellerSlug → cagnotteSlug mapping requires a lookup, so:
  1. Create `src/app/[sellerSlug]/success/page.tsx` (RSC) that reads `ref` from searchParams
  2. Fetch `/api/orders/:ref/status` to get `blockId` and resolve `cagnotteSlug`
  3. Use `redirect()` from `next/navigation` to send to `/c/{cagnotteSlug}/merci?ref=...`

**Option B (clean but backend edit):** Change `BICTORYS_REDIRECT_URL` construction in [backend/src/routes/orders.ts:418](../../../backend/src/routes/orders.ts) to `${BICTORYS_REDIRECT_URL}/c/${data.cagnotteSlug}/merci?ref=${reference}`. **This is a 1-line backend change** that cleanly owns the URL shape. Phase 2 already added `cagnotteSlug` to `createOrderSchema` (verified at [backend/src/routes/orders.ts:56](../../../backend/src/routes/orders.ts)). Option B is **cleaner** — flag as OQ-1 for user decision.

#### Decisions extracted (the "don't do X" list)

| Don't | Why |
|-------|-----|
| Don't remove TikTok from `isInAppBrowser()` | Audit-008 root cause |
| Don't use `<a target="_blank">` in TikTok | Blocked |
| Don't use `window.location.href` (async or user-gesture) in TikTok | Blocked |
| Don't use server 302 for TikTok payment URL | Blocked |
| Don't rely on `/api/pay-redirect?t=...` for TikTok | Blocked (audit-009 "approach 4 rejected") |
| Do use `navigator.share()` in TikTok | Only exit |
| Do use `<a target="_blank">` in IG/FB | Works per audit-008 table |
| Do use `window.location.href` in Safari/Chrome | Works per audit-009 line 32 |
| Do test with a custom interstitial (polling in background) for IG/FB/TikTok | Expected by audit-009 |
| Don't regress audit-008 or audit-009 matrices | Grounds for rollback |

---

### §2 — `/api/pay-redirect` internals

**Verbatim reproduction of [src/app/api/pay-redirect/route.ts:1-48](../../../src/app/api/pay-redirect/route.ts) is already in my context. Key facts:**

- **Method:** `GET`, query param `?t=<base64>`
- **Decoding:** `atob(encoded)` — standard browser base64
- **Allowlist:** `pay.wave.com`, `checkout.bfrpay.com`, `checkout.bfrpay.net`, `pay.bfrpay.com`, `pay.bictorys.com` (and their subdomains)
- **Hostname check:** `parsed.hostname === d || parsed.hostname.endsWith(`.${d}`)`
- **On success:** `NextResponse.redirect(url, 302)` — server-side 302
- **On failure:** 400 "Missing parameter" | 400 "Invalid encoding" | 403 "Domain not allowed" | 400 "Invalid url"

**Edge cases:**
- No query param → 400
- Query param that doesn't base64-decode → 400
- Decodes to a non-URL string → 400 (caught by `new URL(url)`)
- Decodes to a valid URL but unknown host → 403
- All good → 302 to the target

**Used for:** Instagram + Facebook payment redirects, where the base64 query-param trick defeats Meta's query scanner. TikTok blocks this entire pattern per audit-009 approach 4 — the route exists but is not effective for TikTok. **For Phase 4, IG/FB can either hit `/api/pay-redirect?t=...` via `<a target="_blank">` OR hit the raw `pay.wave.com` URL directly via `<a target="_blank">`.** Audit-009 documents the raw URL as working for IG/FB (line 43: "Bouton 'Ouvrir Wave' (target="_blank") → Wave s'ouvre dans Safari ✅"), so Phase 4 can use the raw Bictorys redirect URL directly for IG/FB without needing `/api/pay-redirect`.

**Recommendation:** Phase 4 uses raw `redirectUrl` for IG/FB and TikTok (for TikTok it goes through `navigator.share`). The `/api/pay-redirect` route stays on disk as a fallback for future browsers. **Zero change to the route file.**

---

### §3 — `isInAppBrowser()` and `isTikTokBrowser()` helpers (verbatim)

From [src/lib/utils.ts:27-42](../../../src/lib/utils.ts):

```typescript
/**
 * Détecte si le navigateur est un WebView in-app (Facebook, Instagram, TikTok).
 * Ces navigateurs bloquent les redirections vers les apps de paiement (Wave, Orange Money).
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|TikTok|musical_ly|BytedanceWebview/i.test(ua);
}

/**
 * Détecte spécifiquement le WebView TikTok.
 * target="_blank" ne fonctionne PAS dans TikTok (bloqué).
 * On utilise window.location.href sur clic direct (same-window navigation).
 */
export function isTikTokBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /TikTok|musical_ly|BytedanceWebview/i.test(ua);
}
```

**Observations:**
- Both are **SSR-safe** via the `typeof navigator === "undefined"` guard
- Both return `false` on the server (so SSR renders the normal-browser branch, which is correct — client hydrates and the `useEffect` runs the real check)
- UA patterns:
  - `FBAN` — Facebook Android
  - `FBAV` — Facebook iOS
  - `Instagram` — Instagram iOS + Android
  - `TikTok` — TikTok iOS (sometimes)
  - `musical_ly` — legacy TikTok identifier (both iOS + Android fallback)
  - `BytedanceWebview` — TikTok Android (current)
- Case-insensitive (`/i` flag)
- **No Android/iOS distinction within each brand** — both platforms get the same branch, which matches audit-009's findings (both behave identically within each app)

**Phase 4 usage pattern:**
```typescript
if (isTikTokBrowser()) { /* navigator.share */ }
else if (isInAppBrowser()) { /* target=_blank (IG/FB) */ }
else { /* window.location.href */ }
```

Note that `isTikTokBrowser()` and `isInAppBrowser()` are NOT mutually exclusive — `isInAppBrowser()` returns true for TikTok too (it's a superset). The ordering matters: check TikTok first.

---

### §4 — `POST /api/orders` request / response shapes

From [backend/src/routes/orders.ts:31-57](../../../backend/src/routes/orders.ts):

**Request body (Zod schema):**
```typescript
{
  sellerSlug: string,               // required
  orderType: "SALE" | "BOOKING" | "PAYMENT" | "DONATION",  // required — use "DONATION"
  amount: integer,                  // required, 500 ≤ amount ≤ 10_000_000 FCFA
  paymentType: "orange_money" | "wave_money" | "maxit" | "mtn_money" | "moov" | "togocell" | "mobicash" | "card",
  paymentCountry?: string,          // 2-char, optional
  customerEmail?: string,           // optional for DONATION
  customerName?: string,
  customerPhone: string,            // REQUIRED (not optional per schema)
  donorMessage?: string,            // max 500 chars
  blockId?: string,                 // optional
  referrer?: string,
  timezone?: string,
  // Phase 2 fields:
  isAnonymous: boolean,             // default false
  messageIsPrivate: boolean,        // default false
  cagnotteSlug?: string,            // 1-120 chars
}
```

**Rate limiters applied (stacked middleware):** [backend/src/routes/orders.ts:70-106](../../../backend/src/routes/orders.ts)
1. `orderIpMinuteLimiter` — 20/min per IP (Redis store)
2. `orderIpHourLimiter` — 100/hr per IP (Redis store)
3. `orderEmailMinuteLimiter` — 5/min per lowercased email, anonymous donors collapse to `"email:anon"`

**Circuit breaker:** [backend/src/routes/orders.ts:398-406](../../../backend/src/routes/orders.ts) — `isBictorysCircuitOpen()` returns 503 with message "Paiement temporairement indisponible. Réessaye dans 1 minute." if 5 Bictorys failures in 30s.

**Success response (201):** [backend/src/routes/orders.ts:444-450](../../../backend/src/routes/orders.ts)
```typescript
{
  order: { id: string, reference: string },
  redirectUrl: string,   // ← THE key field: pay.wave.com URL or Bictorys checkout URL
  link?: string,         // optional alternate link
  qrCode?: string,       // optional QR
  message?: string,
}
```

**Frontend usage:**
- On submit, POST the form data + `orderType: "DONATION"` + `cagnotteSlug`
- On 201, read `redirectUrl`
- Stash `order.reference` in sessionStorage + URL query for `/merci`
- Pass `redirectUrl` to `openPaymentUrl()` / render `<a href={redirectUrl}>` per the branch

**Error responses:**
- 400 `{ error }` — Zod validation or vendor mismatch
- 404 `{ error: "Vendeur introuvable" }`
- 409 `{ error: "Ce créneau est déjà réservé" }` — booking only, irrelevant here
- 429 `{ error: "Trop de commandes..." }` — rate-limited
- 503 `{ error: "Paiement temporairement indisponible..." }` — circuit breaker
- 500 `{ error: "Erreur interne" }`

---

### §5 — Thank-you polling `GET /api/orders/:ref/status`

**Endpoint exists** and is production-grade. From [backend/src/routes/orders.ts:1153-1379](../../../backend/src/routes/orders.ts):

- **Rate-limit:** 20/min on `statusPollLimiter` — accommodates ~3s polling cadence for 2 minutes
- **Lookup:** by `reference`, returns `{ status, orderType, reference, downloadUrl?, amount?, currency?, customerName?, seller?, donorMessage?, thankYouMessage? }`
- **Fallback:** if DB status is still PENDING and `paymentExternalId` is set, the endpoint **actively hits Bictorys** (with 30s in-memory cache) to confirm/reject — this is a huge UX win for the thank-you page because webhook latency doesn't delay the "PAID" flip
- **If Bictorys confirms PAID:** endpoint updates the DB (serializable `$transaction`) and returns the enriched order. **Emails are NOT sent from this path** (webhook owns email dispatch to avoid duplicates — see comment at [backend/src/routes/orders.ts:1305-1306](../../../backend/src/routes/orders.ts))
- **Returns for DONATION:** includes `donorMessage` and `thankYouMessage` (fetched from `Block.config.thankYouMessage` at lines 1362-1373)

**Recommended polling cadence for Phase 4 `/merci`:**
- Poll every 3s for up to 2 minutes (40 polls max), respects rate limit (60 polls/min allowed, we use 20)
- Stop on status `PAID` | `FAILED` | `EXPIRED`
- Stop when `document.visibilityState !== "visible"`
- On timeout: show "Vérification en cours…" + manual retry button

**Requirement DONA-07 is listed as Phase 2 Complete** in REQUIREMENTS.md line 244. Phase 4 relies on this endpoint; zero backend work needed.

---

### §6 — SSR + client-polled progress pattern

Covered in Pattern 1 above. Key decisions:

- **`export const revalidate = 60`** on `/c/[slug]/page.tsx` — 60s ISR
- **Client `useEffect` + `setInterval`** updates `{ totalRaised, donorCount }` every 20s while tab visible
- **Re-fetches the detail endpoint** (not a separate `/progress` endpoint — doesn't exist, not needed)
- **`revalidateTag('cagnotte:' + slug)` from webhook** — flag as open question. Phase 2 backend does NOT currently call `revalidateTag` (Express backend has no Next.js instance to revalidate against — it would need an HTTP call to a Next.js route handler). For v1, the 20s client poll is sufficient. Webhook-triggered revalidation is a Phase 6 polish.
- **Do NOT implement webhook → revalidateTag round trip in Phase 4.** The 20s poll is the v1 strategy. OQ-2.

---

### §7 — OG meta for WhatsApp share

`generateMetadata` snippet is in Pattern 1 above. Full expected tag set:

```typescript
{
  title: cagnotte.title,
  description: cagnotte.description?.slice(0, 200) ?? fallback,
  openGraph: {
    title: cagnotte.title,
    description: ...,
    images: [{ url: cagnotte.coverUrl, width: 1200, height: 630 }],
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/c/${slug}`,
    type: "website",
    siteName: "Cagnottes.sn",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: ..., description: ..., images: [cagnotte.coverUrl],
  },
}
```

**Critical requirements for WhatsApp:**
1. `og:image` must be an **absolute URL** (not relative) — `metadataBase` in root layout [src/app/layout.tsx:33](../../../src/app/layout.tsx) already handles this conversion
2. `og:image` must be **public** (no auth) — R2 proxy via `/api/files/:key` is public, ✓
3. Recommended dimensions: **1200×630** (16:8.4) — Banani covers are typically 1200×450, may need padding or crop. Document in FRONTEND-DEVIATIONS.md if we ship a non-standard ratio.
4. Absolute URL prefix from `NEXT_PUBLIC_BASE_URL` or `metadataBase`

**Cache-busting advice:**
- WhatsApp caches OG tags for ~7 days keyed by URL
- Creator-initiated cover change: append `?v=<blockId>_<updatedAt>` to the `og:image` URL so WhatsApp sees a new URL
- Manual refresh: use Facebook's debugger at `https://developers.facebook.com/tools/debug/` (WhatsApp uses FB scraper)
- **Phase 4 v1 does NOT need to implement cache-busting** — creators can manually refresh via debugger; log as Open Question OQ-4

---

### §8 — `robots.txt` disallow `/c/`

Current [src/app/robots.ts](../../../src/app/robots.ts) disallows `/dashboard/`, `/api/`, `/admin/`. **Phase 4 adds `/c/` to the disallow list.**

Code snippet in §Code Examples #5 above.

**Rationale:**
- v1 has no moderation, no trust signals, no "report this cagnotte" flow
- Public vs private cagnottes both use the `/c/<slug>` URL — disallowing all is the simplest P05 mitigation
- Future v2 opt-in: move public cagnottes to `/cagnottes/<slug>` or add a per-page `robots` metadata check that uses `visibility` — still noindex private ones
- Banani wireframes do NOT include a "featured cagnottes" public SEO surface; the home page lists 6 recent but doesn't imply search-engine surfacing

**Also add:** Update `src/app/sitemap.ts` (new file) to list only evergreen marketing pages (`/`, `/toutes-les-cagnottes`). Do NOT list any `/c/<slug>` in v1.

---

### §9 — `generateStaticParams` private filter

Covered in §Code Examples #4 above. **Recommendation: do NOT ship `generateStaticParams` in v1.**

If the user insists on build-time pre-render:
- Source: `fetch('${API_URL}/api/cagnottes?limit=50')` — this endpoint is **SQL-filtered** at [backend/src/routes/cagnottes.ts:110-112](../../../backend/src/routes/cagnottes.ts):
  ```typescript
  config: { path: ["visibility"], equals: "public" },
  ```
- **Never source from:** direct Prisma, `/api/blocks` (creator endpoint, returns private), or any raw list without the SQL filter
- Map each row to `{ slug }` and return

**Phase 4 v1 recommendation:** skip pre-render, let Next.js render on-demand + ISR for 60s. Simpler, safer, no build-time backend dep.

---

### §10 — Home page (screen 1)

From [`.planning/banani/STATUS.md:27`](../../../.planning/banani/STATUS.md) screen 1 is "Hero, featured campaigns, features, FAQ, footer".

**Data shape:**
- Hero: static marketing copy (in `src/lib/constants.ts` — Phase 3 has `HOME_COPY` or equivalent, verify)
- Featured campaigns: **server-side fetch** of `GET /api/cagnottes?limit=6`, sort by `createdAt desc` (this is the default per [backend/src/routes/cagnottes.ts:120](../../../backend/src/routes/cagnottes.ts))
- Features section: static marketing (3-6 Lucide icons + copy)
- FAQ: static — could use a simple `<details>` / `<summary>` or the `Modal` primitive
- Trust: `<TrustpilotBadge />` from Phase 3 (hardcoded rating)

**Composition:**
```tsx
// src/app/(public)/page.tsx — RSC
import { CampaignCard } from "@/components/cagnottes/CampaignCard";
import { TrustpilotBadge } from "@/components/trust/TrustpilotBadge";

export default async function HomePage() {
  const featured = await fetch(`${API}/api/cagnottes?limit=6`, { next: { revalidate: 60 } })
    .then(r => r.json())
    .catch(() => ({ cagnottes: [] }));

  return (
    <>
      <HeroSection />
      <FeaturedCampaigns cagnottes={featured.cagnottes} />
      <FeaturesSection />
      <TrustpilotBadge rating={4.8} reviewCount={127} />
      <FaqSection />
      {/* Footer + PreFooter are in (public)/layout.tsx */}
    </>
  );
}
```

**Empty state:** if `featured.cagnottes.length === 0`, show marketing hero only + "Soyez le premier à créer une cagnotte" CTA. Do not show empty grid.

**Wrap in route group layout:** `(public)/layout.tsx` provides `PublicNavbar`, `TopBanner`, `Footer`, `PreFooter`.

---

### §11 — All-cagnottes page (screen 2)

**Composition:** `FilterChipBar` + `CampaignCard` grid + `Pagination`.

**Data:** `GET /api/cagnottes?cursor=<id>&limit=20` — cursor-based per [backend/src/routes/cagnottes.ts:96-99](../../../backend/src/routes/cagnottes.ts).

**⚠ Mismatch note:** The Phase 3 `Pagination` primitive is numeric (per PRIM-05 "Pagination numeric"), but the backend uses cursor-based pagination. Two options:
1. Adapt the pagination primitive to receive `nextCursor` / `onNext` / `onPrev` (degrades numeric UI to prev/next)
2. Accept that all-cagnottes uses cursor-based "Load more" button instead of numeric pagination (simpler, matches the cursor API shape)

**Recommendation:** ship all-cagnottes with a **"Charger plus"** button (cursor-based), not numeric pagination. Numeric pagination over cursors is possible but requires an additional count query which is expensive. "Load more" is mobile-friendly anyway. Flag as FRONTEND-DEVIATIONS.md entry D-06.

**Filter state:** use URL search params for shareability:
```
/toutes-les-cagnottes?subtype=festive
/toutes-les-cagnottes?subtype=solidaire
/toutes-les-cagnottes  (all)
```

**Note:** the current `/api/cagnottes` list endpoint **does NOT support subtype filtering** — it just filters by `visibility='public'` and `isActive`. Filter must be client-side (fetch all, filter in React) OR the plan adds a backend query param. **Recommendation: client-side filter for v1** because the page loads max ~50 cagnottes anyway. Log OQ-5 if the user wants backend filtering.

**No URL for filter means:** refresh loses state. For v1, that's acceptable per research/SUMMARY.md:141 "/toutes-les-cagnottes deferred". DONF-02 is "priority-deferred" per REQUIREMENTS.md:115 — but still must ship in Phase 4 per the requirement ID list.

---

### §12 — `/c/[slug]` detail page (screens 21/22)

**Composition:**
- Cover image (`next/image` with `priority`)
- Title + subtype Badge
- Organizer info (name + avatar from `cagnotte.seller`)
- Description (plain text, React-escaped)
- `ProgressBar` (from Phase 3 UI primitives) — `raised / goal` + percent + `donorCount`
- Sticky sidebar (right on desktop, bottom-dock on mobile): "Je participe" CTA (primary-lg button → `/c/[slug]/participer`)
- Participants wall: paginated list using `GET /api/cagnottes/:slug/participants`
- `ShareSheet` block at the bottom (WhatsApp first)

**Variant 21 vs 22:**
STATUS.md line 48: "Variant of 21 — need to clarify delta". Recommendation — ship ONE implementation and decide at the design-review step whether a variant flag is needed. Default assumption (treating 22 as "description-collapsed" state):

```tsx
const [showFullDescription, setShowFullDescription] = useState(false);
// Collapse description to 200 chars + "Voir plus" button when > 400 chars
```

This is a single component with a local boolean, not two separate routes. Log as FRONTEND-DEVIATIONS.md entry D-07 if the delta turns out to be bigger (e.g. completely different layout — in which case, ship the simpler one for v1 and defer the second to v2).

**Private variant:** if `cagnotte.visibility === "private"`, the page still renders BUT:
- `<meta name="robots" content="noindex,nofollow">` via `generateMetadata`
- Header banner: "Cagnotte privée — accessible uniquement via le lien"
- Participants list hidden if `cagnotte.hideDonors` (already masked by backend)
- Amount hidden if `cagnotte.hideAmount` (already masked)

---

### §13 — `/c/[slug]/participer` — 3-step inline form (screen 23)

**Banani shows a single scrollable form with 3 sections**, not 3 separate routes. Keep it as one route.

**Sections:**
1. **Montant** — suggested chips (from `cagnotte.config.suggestedAmounts` or default `[1000, 2500, 5000, 10000, 25000]` FCFA) + "Autre montant" custom input
2. **Vos informations** — prénom, nom, email (optional), téléphone (+221 prefix via `Input` primitive with `leadingAddon`)
3. **Message** (optional) — textarea (char counter from Phase 3 Textarea primitive) + two Toggle primitives: "Don anonyme" + "Message privé"

**Layout:** desktop = 2-column (form left, sticky `OrderSummary` right). Mobile = single column, `OrderSummary` docks to bottom via `position: sticky; bottom: 0`.

**Commission computation:** on every `amount` change, recompute `formatCommissionLabel(amount, subtype)` and pass to `OrderSummary`.

**Submit:** React 19 `useActionState` → `api('/api/orders', { method: 'POST', body })` → navigate to `/c/[slug]/paiement?ref=<ref>`. See Pattern 2 above.

**Validation:**
- `amount >= 500` (matches backend [orders.ts:34](../../../backend/src/routes/orders.ts))
- `customerPhone` required (Senegalese format — validate via `formatPhone` non-empty return)
- `customerName` required by UX (not by backend)
- `donorMessage` max 500 chars
- Everything else is optional

**Trust:** `x-csrf-token` auto-attached by `api()` wrapper. **But** `POST /api/orders` is in the order-routes group — confirm whether Phase 2 applies CSRF. Looking at [backend/src/routes/orders.ts:109-114](../../../backend/src/routes/orders.ts): no `verifyCsrf` middleware in the stack (only rate limiters). **Good — public donors without a CSRF cookie can still POST.** ✓ Verified.

---

### §14 — `/c/[slug]/paiement` — payment method picker (screen 24)

**Separate route or inline step?** Banani shows it as a distinct screen. **Recommendation: separate route** for:
- URL shareability (retry flow: user comes back from a failed payment to retry)
- Cleaner state: the page reads `ref` from URL query, fetches order shape from `/api/orders/:ref/status`, renders the 4 payment methods

**Composition:**
- `MiniCagnotteCard` (from Phase 3) showing the target cagnotte
- `OrderSummary` with the amount + commission (same as /participer)
- 4 large buttons (each is a `RadioCard` or custom `Button` variant):
  - Wave (primary, highlighted — Senegalese default)
  - Orange Money
  - Free Money
  - Carte bancaire
- On select → POST `/api/orders` again? **NO** — the order is already created from /participer. **This is a key decision.**

**Two possible flows:**

**Flow A (recommended):** `/participer` creates the order (`paymentType: "wave_money"` default) → `/paiement` just shows the Bictorys redirectUrl. User selects a method here that **overrides** the `paymentType` for Bictorys. But Bictorys already got `paymentType` at order creation. This is contradictory.

**Flow B (simpler):** `/participer` collects fields and stashes them in sessionStorage (no POST yet) → `/paiement` adds the selected `paymentType` and POSTs the full order → receives `redirectUrl` → branches in-app. This is **cleaner** because the `paymentType` choice belongs on /paiement, not /participer.

**Recommendation: Flow B.** `/participer` is a pure form-collect + stash, `/paiement` is the API call + redirect. The `useActionState` lives on `/paiement`, not `/participer`.

**Revised Pattern 2 (Flow B applied):**

```tsx
// src/app/(public)/c/[slug]/participer/page.tsx
// Client component; on submit, stash to sessionStorage and navigate to /paiement
"use client";
const handleSubmit = (data: FormData) => {
  sessionStorage.setItem("donation:pending", JSON.stringify(Object.fromEntries(data)));
  router.push(`/c/${slug}/paiement`);
};
```

```tsx
// src/app/(public)/c/[slug]/paiement/page.tsx
// Client; reads sessionStorage, renders 4 buttons, each POSTs with a specific paymentType
"use client";
const [pending, setPending] = useState<string | null>(null);
const data = JSON.parse(sessionStorage.getItem("donation:pending") || "null");

async function pay(paymentType: PaymentType) {
  setPending(paymentType);
  try {
    const res = await api("/api/orders", { method: "POST", body: { ...data, paymentType } });
    // Branch 3-way
    await openPaymentUrl(res.redirectUrl);
  } finally { setPending(null); }
}
```

Flag as OQ-6 — Flow A vs Flow B — planner can lock the decision. **I strongly recommend Flow B.**

---

### §15 — In-app branching code

See §Code Examples #1 and #2 above for the full `redirect.ts` helper and the `PayButton` component.

**Three branches, in order:**
1. **TikTok first** (because `isInAppBrowser()` returns true for TikTok too — specificity matters)
2. **Meta (IG/FB) second**
3. **Normal browser default**

**Code citation:**
- Helpers: [src/lib/utils.ts:27-42](../../../src/lib/utils.ts) (sealed)
- Rejected approaches (do NOT resurrect): audit-009 lines 81-86

---

### §16 — Commission transparency label

See §Code Examples #3 above for the `src/lib/commission.ts` frontend mirror.

**Label format (locked by D-04 in FRONTEND-DEVIATIONS.md):** `"8% · 800 FCFA"` (festive, 10000 gross) or `"6% · 600 FCFA"` (solidaire, 10000 gross). Middle dot is `·` (U+00B7), not a period or hyphen.

**Existing `OrderSummary` block** ([src/components/checkout/OrderSummary.tsx:27](../../../src/components/checkout/OrderSummary.tsx)) already formats as `"{amount} FCFA ({percent})"` in two parts. Phase 4 can either:
- Pass `commissionAmount` + `commissionBp` separately (current block contract) — keeps the block unchanged
- Or add a new prop `labelFormat: "inline" | "split"` — more invasive

**Recommendation:** keep the block API and pass `commissionBp` + `commissionAmount` pre-computed by the page. The page computes these via `computeCommission(amount, subtype)` from the new `src/lib/commission.ts`. The page also separately computes `formatCommissionLabel(amount, subtype)` if it needs the inline `"8% · 800 FCFA"` string elsewhere (e.g., in a confirmation modal). **Both functions live in `src/lib/commission.ts`.**

**Mirror maintenance:** Any edit to `backend/src/lib/commission.ts` must be mirrored in `src/lib/commission.ts`. Add a lint-style verification: `diff backend/src/lib/commission.ts src/lib/commission.ts | head` — should differ only in imports/exports, not math. Or better: a unit test in Phase 5+ that asserts output parity for 20 fixtures. For v1, a comment in both files pointing at the other is sufficient.

---

### §17 — Donation form state

Covered in Pattern 2 above. Key points:
- React 19 `useActionState` for pending + error state
- Client `api()` fetch (not server action) to preserve CSRF / 401 / retry / timeout
- Native `<form action={...}>` (no react-hook-form)
- `FormData` → object → POST body

---

### §18 — Audit-010 structure

Full template in §Code Examples #6 above.

**8 cells:**
1. TikTok iOS
2. TikTok Android
3. Instagram iOS
4. Instagram Android
5. Facebook iOS
6. Facebook Android
7. Safari iOS
8. Chrome Android

**Who runs it:** user — the planner should include a task "User runs audit-010 matrix" with explicit instructions. Claude Code cannot install apps on real devices.

**How to capture results:** checklist in `audits/audit-010-banani-inapp-matrix.md` with screenshots under `audits/shots/audit-010/`. User fills in each row with date/device/OS/app-version/result.

**Phase 4 cannot close without this file green.** The plan's verification step MUST reference this file's "Sign-off" section.

---

### §19 — Thank-you page `/c/[slug]/merci`

**Route name decision:** `merci` or `success`? Backend sets Bictorys `successRedirectUrl` to `/{sellerSlug}/success?ref=...` [orders.ts:418](../../../backend/src/routes/orders.ts). Options:
- Keep `/{sellerSlug}/success` and redirect internally to `/c/{cagnotteSlug}/merci` (Option A)
- Change backend to point to `/c/{cagnotteSlug}/merci?ref=...` (Option B, 1-line backend edit)

**Recommendation: Option B**, flag as OQ-1. It's 1 line in backend and cleanly owns the URL.

**Composition:**
- Hero: big check icon, "Merci !" + donor name
- `MiniCagnotteCard` of the donated cagnotte
- Amount + "Votre don de `{formatPrice(amount)}`"
- `thankYouMessage` (from order status response) if set
- `ShareSheet` with cagnotte URL pre-filled — donor can share to amplify
- "Voir la cagnotte" button → `/c/[slug]`
- Status badge (polling): "En attente de confirmation…" → "Paiement confirmé ✓" / "Paiement échoué"

**Polling logic:**
```typescript
// Bounded poll: 3s × 40 = 2 min max
const POLL_INTERVAL = 3000;
const MAX_POLLS = 40;
const [status, setStatus] = useState<"PENDING" | "PAID" | "FAILED" | "EXPIRED">("PENDING");
const [attempts, setAttempts] = useState(0);

useEffect(() => {
  if (status !== "PENDING" || attempts >= MAX_POLLS) return;
  if (document.visibilityState !== "visible") return;
  const id = setTimeout(async () => {
    const data = await api(`/api/orders/${ref}/status`);
    setStatus(data.status);
    setAttempts(n => n + 1);
  }, POLL_INTERVAL);
  return () => clearTimeout(id);
}, [status, attempts, ref]);
```

**On PAID:** auto-expand the `ShareSheet`, show celebration (CSS transitions only per CLAUDE.md — no framer-motion).

**On timeout (40 polls):** show "La vérification prend plus de temps que prévu. Tu recevras une notification par email dès la confirmation. [Réessayer]" + manual retry button.

**On FAILED / EXPIRED:** show error, "Réessayer" button → `/c/[slug]/paiement` (re-flow).

---

### §20 — Frontend directory structure

Layout group decision: `(public)` group wraps all donor-facing pages in `PublicNavbar + TopBanner + Footer + PreFooter`. See §Architecture Patterns "Recommended Project Structure" above.

Phase 5 will add `(auth)` group (signup/login — cleaner layout, no footer).
Phase 6 will add `(authed)` group (creator dashboard — DashboardNavbar + SidebarNav, no PublicNavbar).

**Phase 4 creates:** `src/app/(public)/layout.tsx` + all donor pages under it.

**Deletion:** the current [src/app/page.tsx](../../../src/app/page.tsx) placeholder is replaced by `src/app/(public)/page.tsx`. Cannot have both (Next will error on duplicate routes). Delete `src/app/page.tsx` in plan 04-01.

---

### §21 — French route slugs

**Locked French routes:**
- `/` — home
- `/toutes-les-cagnottes` — discovery
- `/c/[slug]` — cagnotte detail
- `/c/[slug]/participer` — participate form
- `/c/[slug]/paiement` — payment picker
- `/c/[slug]/merci` — thank-you (Phase 4 design)
- `/a-propos` — about page (deferred to Phase 5+; not in this phase)

**Plus Phase 5 will add:** `/connexion`, `/inscription`, `/verifier-email`, `/mot-de-passe-oublie`, `/reinitialiser-mot-de-passe`
**Phase 6 will add:** `/tableau-de-bord/*`, `/profil/*`, `/retraits/*`, `/kyc`

**No /en, /fr locale split** — French only per CLAUDE.md and research/SUMMARY.md:200.

---

### §22 — Expected file list (with LOC estimates)

Single atomic plan `04-01`. Target: ~13 new files, ~2 modified, 0 deleted backend files.

| File | Kind | LOC (est.) | Purpose |
|------|------|-----------|---------|
| `src/app/(public)/layout.tsx` | NEW | 40 | Public route group layout — PublicNavbar + TopBanner + Footer + PreFooter |
| `src/app/(public)/page.tsx` | NEW | 120 | Home (screen 1) — hero + featured + features + FAQ |
| `src/app/(public)/toutes-les-cagnottes/page.tsx` | NEW | 150 | All-cagnottes (screen 2) — FilterChipBar + CampaignCard grid + cursor "Load more" |
| `src/app/(public)/c/[slug]/page.tsx` | NEW | 100 | RSC shell — `generateMetadata`, `getCagnotte`, hand off to client |
| `src/app/(public)/c/[slug]/CampaignDetailClient.tsx` | NEW | 180 | Client wrapper — progress poll + render the detail layout with sticky CTA |
| `src/app/(public)/c/[slug]/loading.tsx` | NEW | 40 | Skeleton — 1280px cover + text placeholders |
| `src/app/(public)/c/[slug]/participer/page.tsx` | NEW | 200 | Participate form — 3 sections + sticky OrderSummary + sessionStorage stash |
| `src/app/(public)/c/[slug]/paiement/page.tsx` | NEW | 180 | Payment picker — 4 buttons + 3-way branch + POST /api/orders on click |
| `src/app/(public)/c/[slug]/merci/page.tsx` | NEW | 150 | Thank-you — bounded polling + ShareSheet + MiniCagnotteCard |
| `src/lib/commission.ts` | NEW | 50 | Frontend mirror of backend/src/lib/commission.ts |
| `src/lib/redirect.ts` | NEW | 80 | `openPaymentUrl` + `buildProxyRedirectUrl` helpers (§Code Examples #1) |
| `src/app/robots.ts` | MODIFY | +2 | Add `/c/` to disallow |
| `src/app/sitemap.ts` | NEW | 25 | 2 evergreen URLs only, no `/c/` |
| `src/app/page.tsx` | DELETE | -30 | Replaced by `(public)/page.tsx` |
| `src/lib/constants.ts` | MODIFY | +20 | Add `HOME_COPY`, `PARTICIPER_STEPS` labels if not already present |
| `audits/audit-010-banani-inapp-matrix.md` | NEW | 120 | 8-cell matrix template + sign-off |
| `.planning/banani/FRONTEND-DEVIATIONS.md` | MODIFY | +20 | Add D-06 (cursor pagination) + D-07 (single 21/22 variant) |

**Total:** ~1500 LOC of application code + 120 LOC of docs across ~17 files.

**No new primitives.** Amount chips use existing `Button` + `Tabs` or a simple flex layout. If a reusable "AmountChipPicker" emerges from writing /participer, **Phase 4 promotes it to a Ring 1 primitive in a follow-up commit** — flag as possible future Phase 5 cleanup.

**No npm deps added.** `package.json` + `package-lock.json` byte-identical.

---

### §23 — Testing

No automated test framework in the frontend (per CLAUDE.md "No test framework is configured yet"). Phase 4 verification is:

| Check | Command | Expected |
|-------|---------|----------|
| TypeScript | `npm run build` | 0 errors |
| Lint | `npm run lint` | 0 warnings |
| Ring purity | `bash scripts/verify-ring-purity.sh` | Both rings green |
| No "Offerts" | `grep -ri "offerts" src/app/` | empty |
| No "PayDunya" | `grep -ri "paydunya" src/app/` | empty |
| No "€" | `grep -rn "€" src/app/(public)/` | empty |
| No "+33" | `grep -rn "+33" src/app/(public)/` | empty |
| Helpers sealed | `git diff HEAD~N src/lib/utils.ts` | empty (no changes) |
| pay-redirect sealed | `git diff HEAD~N src/app/api/pay-redirect/route.ts` | empty |
| Visual 375px | `npm run dev` + Chrome DevTools iPhone 14 | matches Banani screens 1, 2, 21, 23, 24 |
| Visual 1280px | `npm run dev` + desktop | matches Banani screens 1, 2, 21, 23, 24 |
| Commission label | manual inspection on /paiement with amount=10000, subtype=festive | shows "8% · 800 FCFA" or equivalent split |
| Audit-010 matrix | user runs on 8 real device/browser combos | all 8 cells green |

**Cadence:**
- Per commit: TypeScript + lint + ring-purity
- Per plan merge: all static checks + local visual smoke
- Per phase gate: audit-010 signed off

---

### §24 — Depends-on from backend

**Backend surface required (all shipped or confirmed by Phase 2):**
- `GET /api/cagnottes` — Phase 2 Complete ✓ ([backend/src/routes/cagnottes.ts:101](../../../backend/src/routes/cagnottes.ts))
- `GET /api/cagnottes/:slug` — Phase 2 Complete ✓ ([cagnottes.ts:207](../../../backend/src/routes/cagnottes.ts))
- `GET /api/cagnottes/:slug/participants` — Phase 2 Complete ✓ ([cagnottes.ts:312](../../../backend/src/routes/cagnottes.ts))
- `POST /api/orders` — Phase 2 Complete ✓ with commission per subtype ([orders.ts:109](../../../backend/src/routes/orders.ts))
- `GET /api/orders/:ref/status` — **DONA-07 is marked Phase 2 Complete in REQUIREMENTS.md:244** ✓ ([orders.ts:1162](../../../backend/src/routes/orders.ts))
- `/api/pay-redirect` — frontend Next.js route, sealed ([src/app/api/pay-redirect/route.ts](../../../src/app/api/pay-redirect/route.ts))

**Optional backend tweak (OQ-1):** Change `successRedirectUrl` in [backend/src/routes/orders.ts:418](../../../backend/src/routes/orders.ts) from `/{sellerSlug}/success` to `/c/{cagnotteSlug}/merci` — 1-line edit. Blocked if plan 04-01 chooses Option A instead.

**Nothing else.** Phase 4 should not need any backend changes beyond the optional OQ-1.

---

### §25 — Handoff to Phase 5

What Phase 4 deliberately does NOT ship (Phase 5/6 scope):

- No signup / login pages (Phase 5 AUTF-01/02)
- No email verify / password reset (Phase 5 AUTF-03/04)
- No creator dashboard (Phase 5 CRET-01)
- No wizards — festive / solidaire (Phase 5 CRET-03/04)
- No create-success (Phase 5 CRET-05)
- No profile / notif prefs / participations / notifications feed (Phase 6 ATHD-*)
- No KYC / bank details / withdrawal / stats / edit / security (Phase 6 MNYS-*)

**Phase 4 establishes:** the `(public)` route group pattern, the 3-way in-app branching helper, the commission frontend mirror, the audit-010 matrix precedent, and the thank-you polling pattern — all reusable in Phase 5/6 where applicable.

**Phase 4 does NOT establish:** an `(auth)` group, an `(authed)` group, authed data fetching via `useApi`, AuthContext integration, or any mutation that requires CSRF (orders don't — donors are anonymous).

---

## Assumptions Log

Claims that weren't verifiable in this session and require user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `HOME_COPY` and `PARTICIPER_STEPS` may not exist in `src/lib/constants.ts` yet — I did not read the full file | §22 file list | plan adds LOC that's redundant; harmless, cheap to verify |
| A2 | Phase 3 primitive `Tabs` supports a single-active "chip tabs" mode suitable for `FilterChipBar` | §11 | if Tabs is strictly multi-tab, all-cagnottes filter UI needs re-thinking (recommend: custom button row instead) |
| A3 | The current `/api/cagnottes` list endpoint does NOT support `?subtype=festive` filter | §11 | if it does, client-side filter is unnecessary. Verified via reading [cagnottes.ts:96-99](../../../backend/src/routes/cagnottes.ts) where the Zod schema only has `cursor` + `limit` — confirmed NOT supported |
| A4 | Phase 3 `Button` primitive supports `fullWidth` prop | §Code Examples #2 | if not, add className fallback (`"w-full"`) |
| A5 | Phase 3 `OrderSummary` block accepts `commissionBp` + `commissionAmount` + `netAmount` | §16 | **VERIFIED** via [OrderSummary.tsx:7-17](../../../src/components/checkout/OrderSummary.tsx) ✓ |
| A6 | WhatsApp scraper uses Facebook's debugger in 2026 | §7 | if WhatsApp has its own debugger now, the cache-busting advice changes — impact limited to documentation |
| A7 | The Banani 21 vs 22 variant delta is minor (collapsed description) | §12 | if it's a full layout rewrite, plan 04-01 needs a second render path — flagged as OQ-7 |
| A8 | `isBictorysCircuitOpen` 503 response is surfaced as a retryable error to the user | §Pitfalls | if the user sees a 503 as "app broken", UX needs a specific error-state screen |
| A9 | React 19 `useActionState` is available in Next 16 out-of-the-box | §Pattern 2 | if React is still 18 in package.json, form state uses `useState` + manual pending boolean — minor rewrite |
| A10 | Bictorys `redirectUrl` is always a `pay.wave.com` or `*.bictorys.com` URL that matches the allowlist in `/api/pay-redirect` | §Code Examples #1 | if Bictorys ever returns a URL not in the allowlist, `isAllowedPayDomain` returns false and `openPaymentUrl` refuses — need to widen allowlist |

**Highest-risk assumptions:** A7 (variant delta), A10 (allowlist). Both should be verified during plan drafting.

---

## Open Questions

Maximum 5 open questions per template — I have 7 worth flagging. Listed in priority order; planner / user should pick top 5.

### OQ-1: Post-payment redirect URL shape (Option A vs Option B)

**Context:** Bictorys currently receives `${BICTORYS_REDIRECT_URL}/${sellerSlug}/success?ref=...` [orders.ts:418](../../../backend/src/routes/orders.ts). The cagnottes.sn URL structure is `/c/{cagnotteSlug}/merci`.

**What we know:** Phase 2 already added `cagnotteSlug` to the order schema, so the backend has the data to construct a cagnotte-scoped URL.

**What's unclear:** Whether to (A) keep the backend unchanged and add a Next.js redirect at `/{sellerSlug}/success` → `/c/{cagnotteSlug}/merci`, or (B) change the backend's `successRedirectUrl` construction to `/c/{cagnotteSlug}/merci?ref=...`.

**Recommendation:** **Option B.** 1-line backend edit, cleaner URL ownership, less frontend plumbing. Requires cross-phase coordination (backend change) but the edit is trivial and can be committed as task T0 of plan 04-01.

---

### OQ-2: Webhook → `revalidateTag` round trip

**Context:** Next.js 16 supports on-demand ISR via `revalidateTag('cagnotte:slug')`. Express backend has no direct Next API — it would need an HTTP call to a Next route handler that calls `revalidateTag`.

**What we know:** Phase 2 webhook already dispatches notifications post-commit. A `revalidateTag` call could be added to the same post-commit path.

**What's unclear:** Whether the 20s client poll is sufficient for v1, or if webhook-triggered revalidation is worth the added infrastructure.

**Recommendation:** **20s client poll for v1.** Defer webhook-triggered revalidation to Phase 6 polish or v2. The 20s window during a viral moment is acceptable; real-time progress is a nice-to-have.

---

### OQ-3: `generateStaticParams` pre-render

**Context:** Next.js can pre-render the top N public cagnottes at build time.

**What we know:** The SQL filter on `/api/cagnottes` guarantees public-only results, so build-time fetch is safe. But build-time depends on backend availability during CI.

**What's unclear:** Whether the user wants build-time pre-render (faster first paint, CI dependency) or on-demand ISR (simpler CI, 1s slower first paint for uncached slugs).

**Recommendation:** **Skip `generateStaticParams` for v1.** On-demand ISR with 60s cache is sufficient. Eliminates CI coupling and build-time backend dependency.

---

### OQ-4: WhatsApp OG cache-busting on cover update

**Context:** WhatsApp caches OG image for ~7 days keyed by URL. Creator cover update doesn't propagate.

**What we know:** Can append `?v=<blockId>_<updatedAt>` to force a new URL. Can also direct creators to FB debugger.

**What's unclear:** Whether v1 needs automated cache-busting or manual debugger workflow is OK.

**Recommendation:** **Manual workflow for v1.** Add a note to creator onboarding (Phase 5 or post-launch) pointing to the FB debugger.

---

### OQ-5: Subtype filter backend support

**Context:** `/toutes-les-cagnottes` has festive/solidaire filter chips. Backend list endpoint doesn't support `?subtype=` yet.

**What we know:** Client-side filter on 50 rows is cheap. Backend filter is one extra `where` clause.

**What's unclear:** Whether Phase 4 should add the backend param or filter client-side.

**Recommendation:** **Client-side for v1.** Backend filter can be added in a future plan without breaking clients. Keeps Phase 4 strictly zero-backend-change (aside from OQ-1).

---

### OQ-6: /participer POST timing — Flow A vs Flow B

**Context:** The order can be created on /participer (then /paiement just displays redirectUrl) or on /paiement (then /participer just stashes).

**What we know:** Flow A is simpler one-shot; Flow B lets user change paymentType without re-creating the order.

**What's unclear:** Whether retry UX is important enough to justify the split.

**Recommendation:** **Flow B.** Allows clean retry flow and puts `paymentType` selection adjacent to the method picker UI where it belongs. Slight complexity tradeoff (sessionStorage stash) is worth it.

---

### OQ-7: Banani screen 21 vs 22 delta

**Context:** Banani exported two cagnotte-detail variants. STATUS.md says "need to clarify delta". Research guessed "collapsed description", but could be anything.

**What we know:** Both are public-detail views of a cagnotte. Both render cover, title, CTA.

**What's unclear:** Whether the delta is meaningful (different layout / different data fields) or cosmetic (collapsed state).

**Recommendation:** **Ship ONE implementation with a `showFullDescription` toggle.** If the variant is structurally different, defer variant 22 to Phase 6 polish. Log as FRONTEND-DEVIATIONS.md D-07.

---

## Sources

### Primary (HIGH confidence)
- [CLAUDE.md](../../../CLAUDE.md) — project constraints, audit references, payment rules
- [audits/audit-008-inapp-browser-payment.md](../../../audits/audit-008-inapp-browser-payment.md) — TikTok fix, decision matrix
- [audits/audit-009-tiktok-payment-flow.md](../../../audits/audit-009-tiktok-payment-flow.md) — full in-app flow with 6-row block table
- [src/lib/utils.ts:27-42](../../../src/lib/utils.ts) — `isInAppBrowser` / `isTikTokBrowser` verbatim
- [src/app/api/pay-redirect/route.ts](../../../src/app/api/pay-redirect/route.ts) — base64 proxy (48 LOC)
- [backend/src/routes/orders.ts](../../../backend/src/routes/orders.ts) — POST schema (lines 31-57), rate limiters (70-106), Bictorys redirect URL (418), status endpoint (1162)
- [backend/src/routes/cagnottes.ts](../../../backend/src/routes/cagnottes.ts) — public GET trio, SQL visibility filter (110-112)
- [backend/src/lib/commission.ts](../../../backend/src/lib/commission.ts) — invariant-enforced commission helper
- [src/components/checkout/OrderSummary.tsx](../../../src/components/checkout/OrderSummary.tsx) — verified prop shape for A5
- [.planning/REQUIREMENTS.md](../../../.planning/REQUIREMENTS.md) — DONA-06, DONF-01..07, traceability table
- [.planning/ROADMAP.md](../../../.planning/ROADMAP.md) — Phase 4 scope + watch-outs
- [.planning/banani/STATUS.md](../../../.planning/banani/STATUS.md) — 24-screen inventory, variant clarifications, locked decisions 1-14
- [.planning/banani/FRONTEND-DEVIATIONS.md](../../../.planning/banani/FRONTEND-DEVIATIONS.md) — D-01..D-05 locked deviations
- [.planning/phases/03-frontend-foundations/03-03-SUMMARY.md](../03-frontend-foundations/03-03-SUMMARY.md) — Ring 2 block contracts for Phase 4 assembly
- [.planning/research/SUMMARY.md](../../research/SUMMARY.md) — P01..P07 pitfalls, stack locks

### Secondary (MEDIUM confidence)
- [src/lib/api.ts](../../../src/lib/api.ts) — CSRF / refresh / timeout semantics
- [src/lib/format.ts](../../../src/lib/format.ts) — `formatPrice` / `formatPhone` verbatim
- [src/app/layout.tsx](../../../src/app/layout.tsx) — Poppins/Inter wiring, existing OG meta baseline
- [src/app/robots.ts](../../../src/app/robots.ts) — current disallow list
- [src/middleware.ts](../../../src/middleware.ts) — only slug lowercase, no other rewrites

### Tertiary (LOW / training-knowledge — flag for validation)
- React 19 `useActionState` API shape — training data, assumed stable in Next 16
- Next 16 `generateMetadata` / `generateStaticParams` behavior — training + pattern match against known Next 14/15 conventions
- WhatsApp OG caching behavior (~7 days) — folklore; real behavior may vary by region / crawler version
- TikTok WebView UA strings may have evolved since audit-009 (March 2026) — if tests fail on new TikTok versions, update the regex in utils.ts and re-run the matrix

---

## Metadata

**Confidence breakdown:**
- Audit 008/009 summary: HIGH — verbatim reproduction of audit files
- Backend contracts: HIGH — direct file reads with line citations
- Phase 3 Ring 2 block contracts: HIGH — read from 03-03-SUMMARY.md
- Next 16 + React 19 patterns: MEDIUM — training data + pattern match with verified project conventions
- WhatsApp OG behavior: LOW — known unknowns, flagged in OQ-4
- Banani screen 21 vs 22 delta: LOW — flagged in OQ-7 / A7
- Overall: **HIGH** — every critical path has a file citation; risk concentrated in minor UI unknowns

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days) — sooner if audit-008/009 matrices regress or if TikTok ships a new WebView version

**Pre-submission checklist:**
- [x] Audit-008 fully reproduced (§1)
- [x] Audit-009 fully reproduced (§1)
- [x] `/api/pay-redirect` internals documented (§2)
- [x] `isInAppBrowser`/`isTikTokBrowser` quoted verbatim (§3)
- [x] POST /api/orders request + response shapes documented (§4)
- [x] GET /api/orders/:ref/status confirmed existing (§5)
- [x] SSR + client poll pattern specified (§6)
- [x] OG meta `generateMetadata` snippet provided (§7)
- [x] robots.txt disallow `/c/` documented (§8)
- [x] `generateStaticParams` private filter documented (§9)
- [x] Home / all-cagnottes / detail / participate / paiement / merci compositions specified (§10-14, §19)
- [x] 3-way branch snippet written (§15)
- [x] Commission mirror snippet written (§16)
- [x] `useActionState` pattern documented (§17)
- [x] audit-010 template written (§18)
- [x] File list + LOC estimates (§22)
- [x] Testing cadence (§23)
- [x] Backend dependencies identified (§24)
- [x] Phase 5 handoff boundary (§25)
- [x] Assumptions logged (A1..A10)
- [x] Open questions ≤7 (OQ-1..OQ-7)
- [x] Zero new npm deps claim verified (§Standard Stack)
- [x] ASVS categories addressed (§Security Domain)
- [x] Security threats enumerated (§Security Domain)
- [x] Every critical claim has a file:line citation

**Ready for /gsd-plan-phase.**
