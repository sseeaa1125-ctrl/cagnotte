# Phase 5: Auth + Creator Flow — Research

**Researched:** 2026-04-13
**Domain:** Next.js 16 App Router pages wired to existing auth / blocks / sellers routes, Banani design translation (13 screens, 11 fetched from Banani + 2 we design ourselves)
**Confidence:** **HIGH** — every backend contract verified at line numbers in the fork; zero new runtime deps; every Phase 3 primitive/block needed already exists.

---

## Summary

Phase 5 ships the full creator onboarding + cagnotte creation UX on top of Phase 3's primitives/blocks and Phase 4's `(public)` layout pattern. It's split across 2 plans:

- **05-01 (public auth)** — 4 routes: `/inscription`, `/connexion`, `/verification-email`, `/mot-de-passe-oublie` + `/mot-de-passe-reinitialiser`. Banani supplies 3 screens (signup, login, login-variant); we design the verify-email + forgot/reset flow ourselves in Banani visual language.
- **05-02 (creator flow)** — 7 screens: dashboard, create-picker, festive wizard ×3, solidaire wizard ×3, create-success. All 7 Banani designs exist (screens 6-15).

**Primary recommendation:** Ship 05-01 first (unblocks the "new creator lands on dashboard" path), then 05-02. Use a new `(auth)` route group that **reuses `(public)/layout.tsx`** (simpler, the PublicNavbar already exposes `/inscription` + `/connexion` CTAs). Creator flow gets a new `(authed)` route group with a **server-side auth guard** (Next `cookies()` + `/api/auth/me`) that redirects to `/connexion?next=...` on unauth. Wizards persist draft in `sessionStorage` keyed `wizard.{subtype}.draft` so a P2002 slug retry cannot blow away form state. Commission is NOT displayed in wizards (no donation, no commission yet — it only surfaces on the donor-facing `OrderSummary` block shipped in Phase 3). Zero new npm deps.

**Critical backend contract quirks to surface early:**

1. **`POST /api/auth/signup` takes `{ email, password, displayName, slug }`** — NOT firstName/lastName and NOT tosAccepted. The schema at `backend/src/routes/auth.ts:37-46` expects a seller `slug` (their vanity page slug on cagnottes.sn) which the Banani signup form does NOT show. Phase 5 must generate the slug client-side from displayName via a slug helper (or derive `displayName`-based slug with `/api/auth/check-slug` availability check).
2. **`POST /api/auth/verify-email` uses a 6-digit CODE, not a URL token.** The backend sends a 6-character numeric code (`backend/src/routes/auth.ts:305`) via email. There is no `?token=abc123` URL to land on — the donor gets the code in their inbox and types it into a `/verification-email` form. This changes the verify-email page UX drastically from what was suggested in the research brief.
3. **`POST /api/auth/reset-password` takes `{ email, code, newPassword }`** (same 6-digit code flow), not a URL token. Same for forgot-password — email → type the code.
4. **Signup does NOT return a JWT cookie.** The cookie is only set after `POST /api/auth/verify-email` succeeds. So the creator path is `signup → verify-email (types code) → JWT set → dashboard`. Login with an unverified email returns `403 "Email non vérifié"` (line 524-527).
5. **`POST /api/blocks` with `type: "FUNDRAISER"`** auto-generates the slug via `ensureUniqueSlug()` — the wizard must NOT send a slug, only the title + validated config. Backend retries on P2002 up to 10 times.
6. **`change-password` is `PUT`, not POST** (line 702) — not used in Phase 5 but noted in CLAUDE.md.

---

## User Constraints (from ROADMAP + CLAUDE.md + Locked Decisions)

### Locked Decisions (from STATUS.md + PROJECT.md — cannot re-litigate)

- **Navy `#172866` primary + pink `#FBE6ED` accent** — Phase 3 shipped the tokens; Phase 5 pages inherit them via the `(public)` / `(authed)` layout.
- **Poppins (headings) + Inter (body)** via `next/font/google` — already mounted in `src/app/layout.tsx`.
- **French-only UI** — all strings in `src/lib/constants.ts`, zero English in JSX.
- **FCFA integer amounts** via `formatPrice()` from `src/lib/format.ts`. No decimals. `formatPhone` always prepends `+221`.
- **Mobile-first at 375px**, Banani designs are desktop-only — translator adapts downward. Touch targets ≥ 48px, buttons ≥ `py-3.5`.
- **Social login (Google/Apple) CTAs HIDDEN** per locked decision #4 — JSX wrapped behind `FEATURE_SOCIAL_AUTH = false` constant so v2 can flip the flag.
- **Zero new npm dependencies.** `git diff package.json` must be empty after Phase 5. No react-hook-form, no zod on the client, no date-fns, no framer-motion.
- **Single `FUNDRAISER` block type with `subtype: festive | solidaire`** in `config` (locked by Phase 1 `fundraiserBlockConfigSchema`).
- **Commission is server-side only (6% solidaire / 8% festive)** — the wizard does NOT display commission because the creator isn't donating. Commission transparency is a donor-facing concern, locked in Phase 3 `OrderSummary` block.
- **Slug generation is backend-only** — wizard sends title, backend generates slug. Phase 5 must NOT reimplement slugify in the client.
- **Private cagnottes by URL obscurity only** (v1) — the wizard collects `visibility: 'public' | 'private'` as a config flag.

### Claude's Discretion (research must recommend)

- Route group architecture: new `(auth)` group vs. reuse `(public)`? → **Recommend: new `(auth)` route group that imports the existing `(public)/layout.tsx` pattern (PublicNavbar + TopBanner + PreFooter + Footer)**. This keeps auth pages inside the public shell (same navbar links `/connexion` + `/inscription` that visitors expect) without needing to branch the navbar for "already on /connexion" state.
- Wizard state management: React Context vs. sessionStorage vs. URL params? → **Recommend: `sessionStorage` draft keyed `wizard.{subtype}.draft`, with a custom `useWizardDraft(type)` hook**. Survives reload + P2002 retries + tab switches. Clear on successful create.
- Wizard step navigation: one route per step (`/etape-1`, `/etape-2`, `/etape-3`) vs. single route with `?step=` query? → **Recommend: one route per step**. Back/forward button works for free, deep-linking works for debugging, and each step owns its own Zod client validation.
- Auth guard strategy: server component (`cookies()` + `/api/auth/me`) vs. client-side `AuthContext` guard? → **Recommend: server-side guard**. Redirects fire BEFORE JSX renders (no FOUC). Uses `next/navigation` `redirect('/connexion?next=/tableau-de-bord')`.
- Dashboard variant (screen 7) vs base (screen 6): separate route or same route + branch? → **Recommend: same route, branch on "does seller have ≥1 cagnotte?"**. Empty-state variant when `cagnottes.length === 0` (uses `EmptyState` primitive). Never a separate URL.
- Login-variant (screen 5) vs base (screen 4): separate route or error state? → **Recommend: same route, different in-component state** (shows validation error from API).
- Profile-variant (screen 18): OUT of scope — Phase 6 problem.

### Deferred Ideas (OUT OF SCOPE)

- **OAuth (Google / Apple)** — v2. Button variants exist; JSX hidden.
- **Slug rename** — v2 (locked by PROJECT.md).
- **Admin panel for KYC** — v2 (manual CLI `approve-kyc.ts` remains).
- **Commission config UI** — v2 (hard-coded 6%/8%).
- **Trending / category / popular filters** — discovery is v2.
- **PDF export, dashboard history download** — v2.
- **Wizard preview step** — the Banani designs show 3 steps only, no preview.
- **Create-picker subtype preview** — the picker goes straight to step 1.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **AUTF-01** | Signup page with email+password+name, Google/Apple HIDDEN, TOS checkbox | `POST /api/auth/signup` schema at `auth.ts:37-46` (email, password, displayName, slug — NO tosAccepted in schema; TOS checkbox is frontend-only gate). Slug generated client-side from displayName via `slugify()` + `GET /api/auth/check-slug`. |
| **AUTF-02** | Login page with email+password and "Oublié ?" link | `POST /api/auth/login` at `auth.ts:499`. Returns `{seller, csrfToken}` + sets `izy-token` cookie. 403 if email not verified (redirect to `/verification-email?email=...`). |
| **AUTF-03** | Email-verify landing page | `POST /api/auth/verify-email` at `auth.ts:305` takes `{email, code}` 6-digit — **NOT a URL token**. Page layout = email hint + 6-input code field + "Renvoyer le code" CTA (→ `POST /api/auth/resend-code`). On success: `{seller, csrfToken}` + cookie set → redirect to `/tableau-de-bord`. |
| **AUTF-04** | Forgot-password + reset-password flow | Two pages. `/mot-de-passe-oublie` → `POST /api/auth/forgot-password` with `{email}`. `/mot-de-passe-reinitialiser` → `POST /api/auth/reset-password` with `{email, code, newPassword}`. Same 6-digit code pattern as verify-email. |
| **CRET-01** | Dashboard with 3-column KPI cards + recent cagnottes + "Créer" CTA | `GET /api/sellers/dashboard/stats` at `sellers.ts:320` returns `{revenue, revenueToday, salesCount, totalOrders, recentOrders, period}`. `GET /api/blocks` at `blocks.ts:136` returns `{blocks}`. Rendered via `KpiCard` (Phase 3) + `CampaignCard` (Phase 3) + `DashboardNavbar` (Phase 3) + `EmptyState` (Phase 3) branch when empty. |
| **CRET-02** | Create-picker with Festive vs Solidaire option cards | Uses Phase 3 `RadioCard` primitive. Pure navigation page — no API. Each card → `router.push("/tableau-de-bord/nouvelle/{subtype}/etape-1")`. |
| **CRET-03** | Festive wizard (3 steps) | Collects `{title, occasion, goalAmount}` + `{coverUrl via /api/upload, description, endDate}` + `{visibility, hideAmount, hideDonors, tosAccepted}`. `POST /api/blocks` at `blocks.ts:268`. Validates against Phase 1 `fundraiserBlockConfigSchema.superRefine`. |
| **CRET-04** | Solidaire wizard (3 steps) | Same structure; step 1 = `{title, cause, beneficiary, goalAmount}`. Same `POST /api/blocks`. |
| **CRET-05** | Create-success page with shareable link + copy + share sheet + preview card | Server component, loads `GET /api/cagnottes/:slug` (public route shipped in Phase 2) to render `CampaignCard` preview. URL: `/tableau-de-bord/nouvelle/succes?slug=<new-slug>`. |

---

## Standard Stack

### Core (zero new additions)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.x | App Router routing, server components, `cookies()` for server auth guard | Already in `package.json` — the whole frontend is Next 16 [VERIFIED: src/app/layout.tsx uses Next 16 features] |
| react | 19.x | Client components for wizard forms + auth state | Already installed; React 19 `useActionState` is available but not required (Phase 4 did not use it; stay consistent) [VERIFIED] |
| typescript | 5.x | Strict TS on every file | CLAUDE.md mandate [VERIFIED] |
| tailwindcss | 4.x | Styling via `@theme` tokens + utility classes | CLAUDE.md mandate — no CSS modules, no styled-components [VERIFIED] |
| lucide-react | latest | Icon set | Already used in Phase 3 blocks (Bell, Eye, etc.) [VERIFIED: src/components/layout/DashboardNavbar.tsx:4] |

### Supporting (already shipped in Phase 3 — just import)

| Component | Path | Why Used in Phase 5 |
|-----------|------|----------------------|
| `Button` | `src/components/ui/Button.tsx` | Every CTA — supports `variant="primary"`, `"ghost"`, `"outline"`, `"social"` with `socialProvider` for hidden OAuth JSX |
| `Input` | `src/components/ui/Input.tsx` | Every text field (email, password with eye toggle, displayName, title) — supports floating label + helper text + error |
| `Textarea` | `src/components/ui/Textarea.tsx` | Wizard description fields + "message aux donateurs" (step 2 festive, step 2 solidaire) |
| `Select` | `src/components/ui/Select.tsx` | Occasion / cause / beneficiary dropdowns in wizard step 1 |
| `DatePicker` | `src/components/ui/DatePicker.tsx` | Wizard step 2 — end date (optional — Phase 1 schema says `endDate: z.string().nullable().optional()`) |
| `ImageUpload` | `src/components/ui/ImageUpload.tsx` | Wizard step 2 — cover image upload (calls `POST /api/upload`) |
| `RadioCard` | `src/components/ui/RadioCard.tsx` | Create-picker (festive vs solidaire) + wizard step 3 visibility (public vs private) |
| `Toggle` | `src/components/ui/Toggle.tsx` | Wizard step 3 — hideAmount, hideDonors |
| `Checkbox` | `src/components/ui/Checkbox.tsx` | Signup TOS + wizard step 3 TOS |
| `Badge` | `src/components/ui/Badge.tsx` | Create-success — cagnotte preview card category badge (inherited via CampaignCard block) |
| `Pagination` | `src/components/ui/Pagination.tsx` | Dashboard recent cagnottes list (if > 10 cagnottes, fallback — v1 likely doesn't need it) |
| `Avatar` | `src/components/ui/Avatar.tsx` | Dashboard header avatar dropdown (shipped via DashboardNavbar) |
| `ProgressBar` | `src/components/ui/ProgressBar.tsx` | Used by CampaignCard + wizard step indicator (if we compose one) |
| `KpiCard` | `src/components/ui/KpiCard.tsx` | Dashboard 3-column KPI grid (revenue / donors / campaigns) |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | Dashboard empty variant (no cagnottes yet — "dashboard-variant" screen 7) |
| `Modal` | `src/components/ui/Modal.tsx` | Password reset success confirmation; wizard exit-guard dialog if user navigates away mid-wizard |
| `useToast` | `src/components/ui/Toast.tsx` | Every mutation — success/error feedback ("Compte créé", "Cagnotte publiée !") |
| `PublicNavbar` | `src/components/layout/PublicNavbar.tsx` | Auth pages (signup / login / verify / forgot / reset) — inherits via `(public)/layout.tsx` reuse |
| `DashboardNavbar` | `src/components/layout/DashboardNavbar.tsx` | Creator pages (dashboard / picker / wizards / success) — takes `seller` + `unreadCount` + `onLogout` as props |
| `Footer` + `PreFooter` + `TopBanner` | `src/components/layout/*` | Auth pages inherit from `(public)/layout.tsx` |
| `SidebarNav` | `src/components/layout/SidebarNav.tsx` | NOT needed in Phase 5 (that's Phase 6 profile). Document it's available for Phase 6. |
| `CampaignCard` | `src/components/cagnottes/CampaignCard.tsx` | Dashboard recent cagnottes list + create-success preview |
| `ShareSheet` | `src/components/share/ShareSheet.tsx` | Create-success — copy link, WhatsApp, FB, Email. Already WhatsApp-first. |

### Helpers already shipped

| Helper | Path | Use |
|--------|------|-----|
| `api<T>()` | `src/lib/api.ts` | All API calls — auto-attaches CSRF header, auto-refreshes on 401, 30s timeout |
| `ApiError` | `src/lib/api.ts` | Typed API errors — `err.status`, `err.body`, `err.message` |
| `useAuth()` | `src/contexts/AuthContext.tsx` | Exposes `{seller, loading, loggingOut, error, refreshSeller, logout}` — **does NOT have `login()` / `signup()` methods**; pages call `api()` directly then call `refreshSeller()` to populate the context. |
| `formatPrice` | `src/lib/format.ts` | KPI card amounts |
| `formatPhone` | `src/lib/format.ts` | Any phone display (not needed in Phase 5 but available) |
| `formatRelativeTime` | `src/lib/format.ts` | Dashboard recent cagnottes "il y a 2 jours" |
| `cn()` | `src/lib/utils.ts` | Conditional Tailwind class merging |
| `slugify()` — **frontend version needed** | NEW `src/lib/slug.ts` (maybe) | Preview the auto-generated seller slug in signup form ("Ton site sera cagnottes.sn/amadou-fall"). This is a UX nicety; the real slug is still generated by the backend. |

### Alternatives Considered (all rejected)

| Instead of | Could Use | Tradeoff | Decision |
|------------|-----------|----------|----------|
| sessionStorage wizard draft | React Context provider at `(authed)/layout.tsx` | Context wipes on reload; sessionStorage survives | **sessionStorage** — P04 guard |
| One route per wizard step | Single page with `useState({step: 1\|2\|3})` | Browser back button doesn't work; no deep-link | **One route per step** — free back/forward |
| Client-side `fetch` directly | `api()` wrapper | Loses CSRF auto-attach + 401 refresh + timeout | **`api()` always** |
| React-hook-form | Manual `useState` + native form `onSubmit` | +bundle size, new dep, CLAUDE.md ban | **Manual** — Phase 4 proves the pattern works |
| Zod on the client | `src/lib/blocks/schemas.ts` export | Backend already has it; duplicating doubles maintenance | **Manual validation** in wizard step handlers; backend Zod is the source of truth |
| Shared `WizardContext` provider | Per-page sessionStorage read | Simpler mental model but loses the reload-safety | **sessionStorage + hook** |
| URL token `?token=abc123` verify-email | 6-digit code POST | Backend already ships codes | **Code, not token** — backend contract locks this |

**Installation:** None. `git diff package.json` must be empty.

**Version verification (not applicable — zero new deps):** Phase 5 is zero-add.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/
├── app/
│   ├── (auth)/                               # NEW — public auth pages
│   │   ├── layout.tsx                        # re-exports from (public)/layout.tsx pattern (or uses same blocks)
│   │   ├── inscription/
│   │   │   └── page.tsx                      # AUTF-01 — Banani screen 3
│   │   ├── connexion/
│   │   │   └── page.tsx                      # AUTF-02 — Banani screens 4 + 5
│   │   ├── verification-email/
│   │   │   └── page.tsx                      # AUTF-03 — we design (6-digit code input)
│   │   ├── mot-de-passe-oublie/
│   │   │   └── page.tsx                      # AUTF-04 — we design (email input → confirmation)
│   │   └── mot-de-passe-reinitialiser/
│   │       └── page.tsx                      # AUTF-04 — we design (code + new password)
│   │
│   ├── (authed)/                             # NEW — creator pages
│   │   ├── layout.tsx                        # server guard: cookies() → /api/auth/me → redirect if no seller
│   │   ├── tableau-de-bord/
│   │   │   ├── page.tsx                      # CRET-01 — Banani screens 6 + 7 (branched empty state)
│   │   │   └── nouvelle/
│   │   │       ├── page.tsx                  # CRET-02 — Banani screen 8
│   │   │       ├── festive/
│   │   │       │   ├── etape-1/page.tsx      # CRET-03 — Banani screen 9
│   │   │       │   ├── etape-2/page.tsx      # CRET-03 — Banani screen 10
│   │   │       │   └── etape-3/page.tsx      # CRET-03 — Banani screen 11
│   │   │       ├── solidaire/
│   │   │       │   ├── etape-1/page.tsx      # CRET-04 — Banani screen 12
│   │   │       │   ├── etape-2/page.tsx      # CRET-04 — Banani screen 13
│   │   │       │   └── etape-3/page.tsx      # CRET-04 — Banani screen 14
│   │   │       └── succes/
│   │   │           └── page.tsx              # CRET-05 — Banani screen 15
│   │   └── (future Phase 6 routes live here)
│   │
│   └── api/
│       └── (no new routes — Phase 5 is frontend-only)
│
├── hooks/                                    # NEW folder (optional — could be src/lib/)
│   └── useWizardDraft.ts                     # sessionStorage hook for wizard state
│
└── lib/
    ├── slug.ts                               # NEW — frontend slug preview helper (20 LOC, mirrors backend)
    ├── features.ts                           # NEW — feature flags: FEATURE_SOCIAL_AUTH = false
    └── constants.ts                          # EXTEND — add Phase 5 labels (AUTH_LABELS, WIZARD_LABELS, etc.)
```

**Why this structure:**

- **`(auth)` group** keeps auth pages co-located without forcing them under `(public)`. Visually, auth pages DO use the public navbar/footer — they're public routes. Choice between reusing `(public)/layout.tsx` verbatim or creating `(auth)/layout.tsx` with the same imports is an aesthetic call; **recommend `(auth)/layout.tsx` that imports the same 4 blocks directly** so Phase 5 isn't coupled to `(public)` folder internals.
- **`(authed)` group** has a server-side guard layout. Every nested route is auth-gated atomically — no per-page auth checks.
- **`useWizardDraft` hook** is the single place where sessionStorage keys live. If the draft schema changes, one file changes.

### Pattern 1: Server-Side Auth Guard (Ring 3)

**What:** `(authed)/layout.tsx` is a server component that reads the `izy-token` cookie via `next/headers` `cookies()`, hits `/api/auth/me` via fetch (NOT through `api()` which is client-only), and redirects to `/connexion?next=${pathname}` if unauthed. Passes the resolved seller as a context/prop.

**When to use:** Every route under `(authed)/`.

**Example:**
```typescript
// src/app/(authed)/layout.tsx — SERVER component
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

// NOTE: this fetch runs server-side. It hits the backend directly via
// BACKEND_URL env var — the `src/lib/api.ts` wrapper is client-only (uses
// localStorage for CSRF). Server components cannot use api().
async function fetchSellerFromCookie(token: string) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
  const res = await fetch(`${backendUrl}/api/auth/me`, {
    headers: { cookie: `izy-token=${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.seller as SellerInfo;
}

export default async function AuthedLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;

  if (!token) {
    redirect("/connexion?next=/tableau-de-bord");
  }

  const seller = await fetchSellerFromCookie(token);
  if (!seller) {
    redirect("/connexion?next=/tableau-de-bord");
  }

  // Wrap children in a client-side AuthProvider hydration shim that seeds
  // the AuthContext with the SSR-fetched seller (so nested client components
  // don't refetch). Pattern: <AuthedShell seller={seller}>{children}</AuthedShell>
  return (
    <div className="min-h-screen bg-background">
      <AuthedNavbarShell seller={seller} />
      <main className="container mx-auto px-4 py-6 md:py-10">{children}</main>
    </div>
  );
}
```

**Source:** Next.js 16 App Router docs, `cookies()` API. Phase 4 uses the same SSR-with-cookie pattern on `/c/[slug]/page.tsx` but for public fetches — Phase 5 extends it to authed.

**Pitfall:** `api()` at `src/lib/api.ts:70` reads `localStorage` for CSRF and uses same-origin proxy. This **cannot run server-side** (no `window`). Server components MUST `fetch()` directly with the `cookie` header forwarded from `cookies()`. The `BACKEND_URL` env var from `src/lib/api.ts:7` is exported for this purpose.

### Pattern 2: Wizard Draft via sessionStorage Hook

**What:** Each wizard step page reads/writes the draft via a `useWizardDraft(subtype)` hook. Single source of truth, single key schema. Clear on success.

**Draft key schema:**
```typescript
// src/hooks/useWizardDraft.ts
export type FestiveDraft = {
  // Step 1
  title?: string;
  occasion?: "anniversaire" | "pot_de_depart" | "cadeau_commun" | "mariage_pacs" | "naissance" | "voyage" | "autre";
  goalAmount?: number;
  // Step 2
  coverUrl?: string | null;      // /api/files/:key proxy URL from upload response
  description?: string;           // maps to config.description
  thankYouMessage?: string;       // maps to config.thankYouMessage (step 2 "message aux donateurs")
  endDate?: string | null;        // ISO 8601, optional
  // Step 3
  visibility?: "public" | "private";
  hideAmount?: boolean;
  hideDonors?: boolean;
  tosAccepted?: boolean;
  // Meta
  step?: 1 | 2 | 3;               // last reached step (for the progress indicator)
  updatedAt?: string;             // ISO, so stale drafts can be GC'd after 24h
};

export type SolidaireDraft = Omit<FestiveDraft, "occasion"> & {
  cause?: "sante_medical" | "education" | "projet_solidaire" | "urgence" | "animaux" | "autre";
  beneficiary?: "moi_meme" | "un_proche" | "une_association";
};

const KEY = (subtype: "festive" | "solidaire") => `cagnotte.wizard.${subtype}.draft.v1`;

export function useWizardDraft<T extends FestiveDraft | SolidaireDraft>(
  subtype: "festive" | "solidaire",
): {
  draft: T;
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  clear: () => void;
  isReady: boolean;  // false during SSR hydration
} {
  // ... reads from sessionStorage on mount, writes on setField
}
```

**Lifecycle:**
1. Create-picker → choose subtype → `router.push("/tableau-de-bord/nouvelle/festive/etape-1")` (draft is empty)
2. Step 1 fills `{title, occasion, goalAmount}` → `setField` writes to sessionStorage on each change → "Continuer" button validates current-step fields + navigates to `/etape-2`
3. Step 2 reads draft, fills image + description + date, navigates to `/etape-3`
4. Step 3 reads draft, final review, `POST /api/blocks` → on success → `clear()` + `router.replace("/tableau-de-bord/nouvelle/succes?slug=<newSlug>")`
5. On P2002 retry from backend (never visible to user — `ensureUniqueSlug` handles it) or network error → draft is still in sessionStorage, user can retry without re-typing
6. After 24h of no activity, `isStale(draft.updatedAt)` returns true and hook clears it on next mount

**Why not React Context:** Context wipes on page reload, wipes on router navigation if the provider lives in the wrong layout. sessionStorage is bulletproof for "restart from where you left off" UX.

**Anti-pattern:** Never use `localStorage` for wizard draft — it persists across browser sessions (leaks info across logout/login boundary) and across tabs (user opens two wizards, they race).

### Pattern 3: Signup → Verify-email handoff

**Flow:**
1. User submits `/inscription` form with `{email, password, displayName}`.
2. Frontend generates slug client-side from displayName (`slugify(displayName)` — frontend helper mirrors `backend/src/lib/cagnottes/slug.ts` logic) and calls `GET /api/auth/check-slug?slug=<slug>` to confirm available. If taken, append numeric suffix until available. **This is UX polish — the real uniqueness check happens in `POST /api/auth/signup` which returns 409 on collision.**
3. `api('/api/auth/signup', { method: 'POST', body: {email, password, displayName, slug} })` → on 201 response, backend has sent a verification code via email.
4. Frontend calls `router.push('/verification-email?email=<encoded-email>')`.
5. Verify-email page reads `email` from query param, shows 6-input code field, calls `POST /api/auth/verify-email` with `{email, code}`.
6. On 200: cookies are set (`izy-token` + `izy-csrf`), `csrfToken` is in response body → `storeCsrfToken(body.csrfToken)` then `refreshSeller()` from `AuthContext` → `router.replace('/tableau-de-bord')`.
7. On 400 "Code invalide": increment `attempts` in-place (the backend increments automatically; frontend just shows error toast).
8. Link "Renvoyer le code" → `POST /api/auth/resend-code` with `{email}` (1-minute cooldown enforced server-side at line 266).

**Anti-pattern:** Never send `tosAccepted` to `/api/auth/signup` — the backend schema doesn't know about it. TOS is a **frontend-only gate** that prevents the submit button from firing. The backend assumes TOS acceptance by the mere act of creating an account.

### Pattern 4: Create-success data source (URL param, not sessionStorage)

**What:** After `POST /api/blocks` returns the new block, the wizard navigates to `/tableau-de-bord/nouvelle/succes?slug=<new-slug>`. The success page is a **server component** that fetches `/api/cagnottes/:slug` (public, no auth needed) to render the `CampaignCard` preview. This guarantees freshness and works even if the user refreshes the page.

**Why not sessionStorage:** The draft has already been cleared by this point. Re-hydrating from server means the preview matches exactly what a shared donor would see.

### Anti-Patterns to Avoid

- **Do NOT hand-roll slug generation on the server** — use `POST /api/blocks` and let the backend's `ensureUniqueSlug()` handle collisions. The frontend just sends `title`.
- **Do NOT store JWT in localStorage or expose it in JS.** Cookies only. `izy-token` is `httpOnly`; `izy-csrf` is readable for the double-submit pattern and is already handled by `api.ts`.
- **Do NOT skip the `/api/auth/check-slug` preview** — if the user sees "cagnottes.sn/amadou-fall" on the signup form and then gets a 409 on submit, they're confused. Soft-check as they type.
- **Do NOT use `useAuth()` inside `(authed)/layout.tsx`** — it's a server component. Use `cookies()` + direct `fetch()`.
- **Do NOT fire `router.push` during component render** — fire inside `onSubmit` or `useEffect`.
- **Do NOT re-export `(public)/layout.tsx` — copy the imports.** Route-group layouts are not composable.
- **Do NOT re-render DashboardNavbar with stale seller data after logout** — when `logout()` fires, `window.location.href = "/"` does a full reload (already implemented in `AuthContext.tsx:95`), which clears React state.
- **Do NOT forget the `x-csrf-token` header on mutations** — `api()` handles it automatically as long as you use `api()`, not raw `fetch`.
- **Do NOT rely on `useApi()` for auth pages** — it has in-memory stale-while-revalidate cache that may serve stale unauth state. Use `api()` + `useState` + `useEffect` directly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug generation for cagnottes | Custom client-side slug logic | `POST /api/blocks` — backend's `ensureUniqueSlug()` | Already shipped in Phase 1; handles P2002 retry + reserved words + fallback |
| Slug generation for seller signup | Custom reserved-words list on frontend | `GET /api/auth/check-slug?slug=X` | Backend at `auth.ts:97-113` has the authoritative reserved list |
| Wizard form library | react-hook-form / Formik | Manual `useState` per field + native form submit | +150kb bundle, CLAUDE.md ban; Phase 4 proves manual is enough |
| Client-side Zod validation | Duplicate `fundraiserBlockConfigSchema` in frontend | Manual validation per step + backend Zod as source of truth | Dup doubles maintenance; backend errors surface via 400 response body |
| Session storage abstraction | `@zustand/persist` / `localForage` | Native `sessionStorage` + thin `useWizardDraft` hook | +dep, +bundle, overkill for a 3-step form |
| CSRF header wiring | Custom fetch wrapper per page | `api()` from `src/lib/api.ts` | Already auto-attaches `x-csrf-token` on POST/PUT/PATCH/DELETE |
| 401 refresh | Custom retry logic | `api()` auto-calls `/api/auth/refresh` with lock | Battle-tested, CLAUDE.md says don't touch |
| Date picker | `react-datepicker` / `flatpickr` | `src/components/ui/DatePicker.tsx` (Phase 3) | Already shipped, zero deps |
| Image upload | `react-dropzone` | `src/components/ui/ImageUpload.tsx` (Phase 3) | Already shipped, calls `POST /api/upload` |
| Clipboard copy | `clipboard-copy` dep | `navigator.clipboard.writeText` (already in ShareSheet) | Already used in Phase 3 ShareSheet |
| TOS modal content | Build legal copy generator | Hardcoded placeholder link to `/cgu` (Phase 6+ fills it) | PROJECT.md: legal deferred |
| Progress indicator | Install `react-steps` | 15-LOC inline component using Badge + dividers | Keep primitive surface minimal |
| WhatsApp share | Install `react-share` | `ShareSheet` block already WhatsApp-first (Phase 3) | Already shipped |
| OAuth buttons | Install `next-auth` | Hidden JSX behind `FEATURE_SOCIAL_AUTH = false` | v1 is email+password only |
| Confetti animation on create-success | `canvas-confetti` dep | None — ROADMAP says "confetti" but defer to v2 pickier animation | Zero-dep policy wins; use a simple celebratory Badge + Heading |

**Key insight:** Every form primitive Phase 5 needs already exists in `src/components/ui/` from Phase 3. Every composed block Phase 5 needs (`DashboardNavbar`, `CampaignCard`, `ShareSheet`) already exists in `src/components/{layout,cagnottes,share}/` from Phase 3. The entire 13-page Phase 5 is a pure "wire primitives + blocks to data" exercise — zero new UI components are needed apart from a tiny `StepIndicator` helper that's 15 LOC and can live inline per page.

---

## Runtime State Inventory

> Phase 5 is purely frontend — no renames, no refactors, no DB migrations, no config changes. This section is N/A.

---

## Common Pitfalls

### Pitfall 1: Signup schema mismatch (displayName vs firstName/lastName)

**What goes wrong:** Banani signup screen 3 likely shows `Prénom` + `Nom` + `Email` + `Mot de passe` + `TOS`, but the backend takes `displayName` (single name field).

**Why it happens:** Fari.store used `displayName` (brand/shop name for a link-in-bio). Phase 5 must merge Prénom + Nom into `displayName` client-side: `${firstName.trim()} ${lastName.trim()}`.

**How to avoid:** The signup form UI has two inputs (Prénom + Nom), but the submit handler concatenates them into `displayName` before calling `api('/api/auth/signup', {...})`. Document this in the signup page comments.

**Warning signs:** 400 response with `"displayName: Minimum 2 caractères"` in the body.

### Pitfall 2: Signup schema mismatch (slug required)

**What goes wrong:** The Banani signup form doesn't show a `slug` field, but the backend requires one (seller page vanity slug).

**Why it happens:** Again, fari.store heritage — every seller has a `/<slug>` page.

**How to avoid:** Frontend generates the seller slug from displayName via a client-side `slugify()`:
- "Amadou Fall" → `amadou-fall`
- Then `GET /api/auth/check-slug?slug=amadou-fall` → `{available: true}`.
- If taken, append `-2`, `-3`, etc. until available.
- Display the result as a preview: "Ton espace sera `cagnottes.sn/amadou-fall`".

Phase 5 must ship a new `src/lib/slug.ts` with a 20-LOC `slugify` that mirrors `backend/src/lib/cagnottes/slug.ts` (NFD normalize, collapse, lowercase, trim). This is NOT slug generation for cagnottes — that's backend-only. This is the seller page slug preview.

**Warning signs:** 409 on submit ("Ce nom de page est déjà pris") despite the slug looking fine.

### Pitfall 3: verify-email uses 6-digit code, NOT URL token

**What goes wrong:** The research brief assumed the verify-email page would read `?token=abc123` from the URL and auto-POST on mount. **This is wrong.** The backend sends a 6-character numeric code via email; the user types it into a form.

**Why it happens:** The backend was built for a mobile-oriented verification flow where users may receive the email on a different device than the one running signup.

**How to avoid:** Design the verify-email page as a **manual entry form**, not an auto-submit landing page. UI:
- Heading: "Vérifie ton email"
- Subtitle: "Un code à 6 chiffres a été envoyé à **{email}**."
- 6-input "OTP-style" code field (6 separate `<Input>`s that forward focus on keypress)
- Primary button "Vérifier"
- Secondary CTA: "Renvoyer le code" (disabled for 60s after each send)
- Footer: "Mauvaise adresse ? [Revenir à l'inscription](/inscription)"

`email` param comes via `/verification-email?email=<encoded>`. If missing, redirect to `/inscription`.

**Warning signs:** 400 "Code invalide ou expiré" when the user leaves the form idle > 10 minutes.

### Pitfall 4: Login with unverified email returns 403

**What goes wrong:** User signs up, closes the browser without verifying, comes back 2 days later, tries to log in — backend returns 403 "Email non vérifié" (`auth.ts:524-527`).

**Why it happens:** Backend gates login on `emailVerified === true`.

**How to avoid:** On 403 "Email non vérifié", frontend should automatically:
1. Call `POST /api/auth/resend-code` with the email (best-effort, fire-and-forget).
2. `router.push('/verification-email?email=<encoded>')`.
3. Show a toast: "Email non vérifié — un nouveau code a été envoyé."

**Warning signs:** User stuck on login screen with an opaque 403 error.

### Pitfall 5: Slug collision during wizard submission (P04)

**What goes wrong:** Two users simultaneously create cagnottes with the same title ("Mariage de Fatou"). Backend's `ensureUniqueSlug()` retries and one gets `mariage-de-fatou-2`, but if the wizard draft was re-submitted naively the user might see a stale slug.

**Why it happens:** Phase 1 slug helper handles P2002 via closure-based retry. Frontend never regenerates the slug.

**How to avoid:** Frontend sends ONLY `{title, config}` to `POST /api/blocks`. Backend returns the final block with `{block: {id, slug, config, ...}}`. Frontend reads `response.block.slug` for the success-page URL. Never compute the slug client-side for cagnottes.

**Warning signs:** Success page URL `/succes?slug=X` doesn't match the actual created cagnotte.

### Pitfall 6: Draft loss on wizard refresh

**What goes wrong:** User fills step 1, refreshes the page (mobile browser cold-killed the tab), loses everything.

**How to avoid:** `useWizardDraft` hook writes to sessionStorage on EVERY field change. On mount, reads sessionStorage and pre-fills state. The draft key is versioned (`.v1`) so a future schema change can bump to `.v2` without conflict.

**Warning signs:** User complaint "I lost my cagnotte data."

### Pitfall 7: Double-submit on create-success

**What goes wrong:** User double-clicks "Publier" on wizard step 3. Two `POST /api/blocks` requests fire in parallel, creating two cagnottes.

**How to avoid:**
1. Disable the submit button after first click (`useState isSubmitting`).
2. Clear the wizard draft only after 200 response.
3. `router.replace` (not `push`) to success page so back-button doesn't re-submit.

**Warning signs:** User ends up with duplicate cagnottes.

### Pitfall 8: Server-side auth guard + race with cookie refresh

**What goes wrong:** Cookie is 14 minutes old, server guard fetches `/api/auth/me`, backend returns 401, layout redirects to `/connexion` — but the user is actually valid (refresh token is still fresh).

**Why it happens:** Server components can't call `/api/auth/refresh` the way `api()` does client-side. The access token may have expired between the last client action and the server-render.

**How to avoid:**
1. Server guard accepts the happy path: `cookies().get('izy-token')` → `fetch('/api/auth/me')` → seller.
2. On 401, do NOT redirect immediately. Instead, render a **client-side hydration island** that reads the refresh token cookie and calls `/api/auth/refresh` via `api()`, then re-renders the page. If refresh also fails, THEN redirect.
3. Alternative (simpler): just redirect to `/connexion?next=...` on ANY 401. User types password once every 15 min in the worst case — acceptable for v1.

**Recommend the simpler path for Phase 5**; v2 can add client-side refresh.

**Warning signs:** Users complaining "it keeps logging me out" during long dashboard sessions.

### Pitfall 9: Commission display on wizard (false positive)

**What goes wrong:** Developer adds a "Commission: 8% (X FCFA)" line to wizard step 3 because "it's the standard donation page pattern."

**Why it's wrong:** The wizard is creator-facing. There's no donation yet, no donor, no amount to compute commission on. Commission is donor-facing only. The Banani wizards correctly don't show it.

**How to avoid:** Wizard step 3 shows visibility + hide flags + TOS. Nothing about commission. Commission transparency is Phase 3 `OrderSummary` territory (donor-facing).

### Pitfall 10: "dashboard-variant" (screen 7) treated as a separate route

**What goes wrong:** Developer creates `/tableau-de-bord/variant` page because Banani ships two screens.

**Why it's wrong:** Screen 6 = dashboard with cagnottes. Screen 7 = dashboard empty state. Same URL, different render branch.

**How to avoid:** Single `page.tsx` at `/tableau-de-bord`, branch on `cagnottes.length === 0`:
```jsx
{cagnottes.length === 0 ? <EmptyState ... /> : <CagnotteGrid ... />}
```

### Pitfall 11: TOS checkbox sent to backend

**What goes wrong:** Signup form POSTs `{..., tosAccepted: true}` — backend Zod schema rejects unknown field (if strict mode) or silently drops it.

**How to avoid:** TOS is frontend-only. Checkbox gates the submit button state; never part of the request body.

### Pitfall 12: Using `useAuth()` on a server component

**What goes wrong:** Developer tries `const { seller } = useAuth()` inside `(authed)/layout.tsx` — it's a server component, `useContext` doesn't work.

**How to avoid:** Server guard uses `cookies()` + `fetch()`. Client components (wizard pages that need user info for greeting) can safely use `useAuth()` because they're client-rendered under the SSR-hydrated shell.

---

## Code Examples

### Login page — happy path (`src/app/(auth)/connexion/page.tsx`)

```typescript
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Button, Checkbox, useToast } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, storeCsrfToken } from "@/lib/api";
import { AUTH_LABELS } from "@/lib/constants";

// Source: backend/src/routes/auth.ts:499 — POST /api/auth/login returns {seller, csrfToken}
interface LoginResponse {
  seller: { id: string; email: string; slug: string; displayName: string; plan: string; onboardingCompleted: boolean };
  csrfToken: string;
}

export default function ConnexionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "/tableau-de-bord";
  const { refreshSeller } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      storeCsrfToken(res.csrfToken);   // persist for next mutation
      await refreshSeller();            // hydrate AuthContext
      router.replace(nextUrl);          // replace so back-button doesn't re-submit
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403 && err.message.includes("Email non vérifié")) {
          // Pitfall 4 — auto-resend + redirect
          await api("/api/auth/resend-code", { method: "POST", body: { email } }).catch(() => {});
          showToast("Email non vérifié — nouveau code envoyé.", "info");
          router.push(`/verification-email?email=${encodeURIComponent(email)}`);
          return;
        }
        setError(err.message);
      } else {
        setError(AUTH_LABELS.errorGeneric);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-8 md:py-16">
      <h1 className="mb-6 font-headings text-3xl font-bold text-primary">{AUTH_LABELS.loginTitle}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          type="email"
          label={AUTH_LABELS.emailLabel}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          type="password"
          label={AUTH_LABELS.passwordLabel}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        {error ? <p className="text-sm text-error">{error}</p> : null}
        <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
          {AUTH_LABELS.loginCta}
        </Button>
        <a href="/mot-de-passe-oublie" className="text-sm text-primary hover:underline">
          {AUTH_LABELS.forgotPasswordCta}
        </a>
      </form>
    </div>
  );
}
```

### Wizard step 3 submit (`src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-3/page.tsx`)

```typescript
// Source: backend/src/routes/blocks.ts:268 — POST /api/blocks
// Source: backend/src/lib/blocks/schemas.ts — fundraiserBlockConfigSchema with superRefine
"use client";

import { useRouter } from "next/navigation";
import { useWizardDraft } from "@/hooks/useWizardDraft";
import { api, ApiError } from "@/lib/api";
// ... other imports

export default function FestiveStep3() {
  const router = useRouter();
  const { draft, clear } = useWizardDraft<FestiveDraft>("festive");
  const [submitting, setSubmitting] = React.useState(false);

  async function publish() {
    if (submitting) return;
    if (!draft.tosAccepted) return;
    // Client-side pre-flight check — backend has the real Zod authority
    if (!draft.title || !draft.occasion || !draft.goalAmount) {
      router.push("/tableau-de-bord/nouvelle/festive/etape-1");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api<{ block: { id: string; slug: string } }>("/api/blocks", {
        method: "POST",
        body: {
          type: "FUNDRAISER",
          title: draft.title,
          config: {
            title: draft.title,
            description: draft.description ?? "",
            goalAmount: draft.goalAmount,
            endDate: draft.endDate ?? null,
            coverUrl: draft.coverUrl ?? null,
            thankYouMessage: draft.thankYouMessage ?? "",
            subtype: "festive",
            occasion: draft.occasion,
            cause: null,
            beneficiary: null,
            visibility: draft.visibility ?? "public",
            hideAmount: draft.hideAmount ?? false,
            hideDonors: draft.hideDonors ?? false,
          },
        },
      });
      clear();  // wipe sessionStorage
      router.replace(`/tableau-de-bord/nouvelle/succes?slug=${res.block.slug}`);
    } catch (err) {
      if (err instanceof ApiError) {
        // 400 = Zod validation failed; 500 = server error. Show toast.
      }
      setSubmitting(false);
    }
  }

  // ... render
}
```

---

## State of the Art

Phase 5 is not a domain where "state of the art" matters — it's a Next.js 16 App Router wiring exercise using already-shipped primitives. The two relevant "current-approach" notes:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side auth guards with `useEffect` + `router.push` | Server-side guards via `cookies()` in layout server components | Next 13 (2022) | FOUC-free redirects; Phase 5 uses server guards |
| `useState` form libraries (Formik, react-hook-form) | Native `useState` + `<form onSubmit>` | React 18 (2022) with `useActionState` at 19 | Smaller bundles; CLAUDE.md mandates native |

**Deprecated/outdated:**
- `getServerSideProps` — replaced by server components (Next 13+).
- Custom CSRF generators — use the `izy-csrf` double-submit cookie already shipped.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Banani screens 3 (signup) shows Prénom + Nom (2 fields), not a single name field | Pitfall 1 + Plan 05-01 signup page | Signup form needs 1 name input, not 2 — minor refactor in plan |
| A2 | Banani screens 9 / 12 (wizard step 1) show occasion / cause / beneficiary as selects, not radio buttons | Plan 05-02 wizard step 1 | May need `RadioCard` grid instead of `Select` — both primitives exist |
| A3 | Wizard step 2 shows a "message aux donateurs" textarea (maps to `config.thankYouMessage`) | Pattern 2 draft schema | May need to move it to step 3; not a blocker |
| A4 | Create-success shows a `CampaignCard` preview (inferred from screen 15 "preview card" in STATUS.md) | Plan 05-02 success page | If design shows a different preview shape, re-compose |
| A5 | Dashboard-variant (screen 7) is the empty state of the same dashboard page | Pitfall 10 + CRET-01 | If it's actually a different state (e.g. onboarding tooltips), still same route, different branch |
| A6 | Login-variant (screen 5) is an error state of the login page | Claude's Discretion section | Same as above — same route, different in-component state |
| A7 | The Banani signup screen shows Google/Apple OAuth buttons we need to hide | Locked Decision #4 | If they're absent, the `FEATURE_SOCIAL_AUTH` flag still applies — just no JSX to hide |
| A8 | "TOS checkbox" on signup links to a `/cgu` placeholder — legal copy is deferred | Pitfall 11 | If user has already written legal copy, link to their URL |
| A9 | The wizard step-2 image upload proxies via `/api/files/:key` (R2 proxy), not a direct R2 URL | ImageUpload usage | `backend/src/routes/upload.ts:123` confirms `uploadToR2` returns proxy URL — VERIFIED [VERIFIED] |
| A10 | The success page uses `router.replace` (not push) so back-button doesn't re-trigger POST | Pitfall 7 | If back-button behavior matters for v1 (probably not) |

**If this table feels light:** It is. Phase 5 is the most predictable phase in the roadmap because every backend endpoint is live and every frontend primitive is shipped. The only unknowns are the exact Banani field compositions per screen — which the executor will discover by fetching with `mcp__banani__banani_get_selected_designs` task-by-task.

---

## Open Questions

1. **Should the signup form preview the seller slug as a subdomain (`amadou-fall.cagnottes.sn`) or a path (`cagnottes.sn/amadou-fall`)?**
   - What we know: existing Prisma `Seller.slug` is used as a path (`/<slug>` route). The fork previously had a subdomain pattern but that was stripped.
   - What's unclear: does the product want to show the path preview at all, or just ask for a "nom public" and not expose the URL shape at signup?
   - Recommendation: show as path preview (`cagnottes.sn/<slug>`) since the middleware already normalizes slugs to lowercase. Default assumption: path-based.

2. **Does the create-success page need confetti?**
   - What we know: ROADMAP says "confetti" in the Phase 5 success criteria.
   - What's unclear: zero new deps means no `canvas-confetti`. Options: (a) skip confetti, use a celebratory heading + pink background, (b) inline SVG burst animation (CSS only).
   - Recommendation: **option (b)** — 20-LOC CSS keyframe animation with 10 absolutely-positioned SVG bursts. Plays once on mount. Zero dep. If user hates it in review, option (a) is a 5-min revert.

3. **Does the wizard step 3 visibility toggle need to show a preview of what "Privée" means?**
   - What we know: Private = not listed, URL-only access. Banani may or may not show this tooltip.
   - Recommendation: add a small helper text under the RadioCard explaining "Privée : ton lien fonctionne, mais la cagnotte n'apparaît pas dans les recherches" — 1 string in constants.ts.

4. **Dashboard "recent cagnottes" count — 3, 5, or all?**
   - What we know: `GET /api/blocks` returns ALL seller blocks (not paginated).
   - What's unclear: Banani screen 6 shows a list — how long?
   - Recommendation: slice first 5 client-side; if > 5 exist, show "Voir tout" link to a Phase 6 `/tableau-de-bord/cagnottes` page (not built yet, link is a stub).

5. **Auto-login after verify-email?**
   - What we know: `POST /api/auth/verify-email` returns `{seller, csrfToken}` AND sets cookies. So verify-email IS a login.
   - Recommendation: yes, auto-login. On success → `refreshSeller()` → `router.replace('/tableau-de-bord')`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Next.js 16 | All Phase 5 pages | ✓ | 16.x | — |
| React 19 | All Phase 5 pages | ✓ | 19.x | — |
| Phase 3 primitives (18 in `src/components/ui/`) | All wizard/auth forms | ✓ | shipped | — |
| Phase 3 blocks (13 in `src/components/{layout,cagnottes,share,...}/`) | Dashboard, success, navbar | ✓ | shipped | — |
| `src/lib/api.ts` wrapper | Every API call | ✓ | shipped | — |
| `AuthContext` | Client-side seller state | ✓ | shipped | — |
| Backend `POST /api/auth/signup` | Signup page | ✓ | `auth.ts:145` | — |
| Backend `POST /api/auth/login` | Login page | ✓ | `auth.ts:499` | — |
| Backend `POST /api/auth/verify-email` | Verify-email page | ✓ | `auth.ts:305` | — |
| Backend `POST /api/auth/resend-code` | Verify-email resend | ✓ | `auth.ts:241` | — |
| Backend `POST /api/auth/forgot-password` | Forgot-password page | ✓ | `auth.ts:573` | — |
| Backend `POST /api/auth/reset-password` | Reset-password page | ✓ | `auth.ts:644` | — |
| Backend `GET /api/auth/me` | AuthContext + server guard | ✓ | `auth.ts:443` | — |
| Backend `POST /api/auth/refresh` | auto-refresh in `api()` | ✓ | `auth.ts:394` | — |
| Backend `GET /api/auth/check-slug` | Signup slug preview | ✓ | `auth.ts:97` | — |
| Backend `GET /api/sellers/dashboard/stats` | Dashboard KPIs | ✓ | `sellers.ts:320` | — |
| Backend `GET /api/blocks` | Dashboard recent cagnottes | ✓ | `blocks.ts:136` | — |
| Backend `POST /api/blocks` (FUNDRAISER) | Wizard submit | ✓ | `blocks.ts:268` with `ensureUniqueSlug()` | — |
| Backend `POST /api/upload` | Wizard step 2 image upload | ✓ | `upload.ts:82` (returns proxy URL) | — |
| Backend `GET /api/cagnottes/:slug` | Create-success preview | ✓ | Phase 2 plan 02-01 | — |
| `mcp__banani__banani_get_selected_designs` MCP tool | Each screen task (invoked by executor, not researcher) | ✓ | external MCP | Executor falls back to the we-design pattern if MCP unavailable |
| Banani screens 3, 4, 5 | 05-01 auth tasks | ✓ | on user's Banani account | We design if missing |
| Banani screens 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 | 05-02 creator tasks | ✓ | on user's Banani account | We design if missing |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **None** — CLAUDE.md mandates no test framework in v1. `backend/scripts/smoke-test.ts` is the backend regression harness. Frontend uses manual + `npm run build` + `npm run lint` + dev-server smoke. |
| Config file | none |
| Quick run command | `npm run lint && npm run build` |
| Full suite command | `cd backend && npm run dev` + `cd . && npm run dev` + manual 375/768/1280 browser check |
| Backend regression | `cd backend && npx tsx scripts/smoke-test.ts` — must still pass 15/15 after Phase 5 (Phase 5 shouldn't touch backend) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTF-01 | Signup form submits → 201 → redirect to verify-email | manual | `npm run dev` → fill form → observe `/verification-email?email=...` URL | ❌ new page |
| AUTF-01 | Social CTAs not rendered | static check | `grep -c "variant=\"social\"" src/app/(auth)/inscription/page.tsx` — expect 0 or behind flag | ❌ new page |
| AUTF-02 | Login → 200 → redirect to `/tableau-de-bord` | manual | fill form → observe `/tableau-de-bord` render with KPI cards | ❌ new page |
| AUTF-02 | Login with unverified email → redirect to verify-email | manual | create unverified user in seed, attempt login | ❌ new page |
| AUTF-03 | verify-email: 6-digit code input → 200 → cookie set → dashboard | manual | signup → check email log → paste code → observe redirect | ❌ new page |
| AUTF-04 | forgot-password → email sent → reset page with code → new password works | manual | full e2e | ❌ new pages |
| CRET-01 | Dashboard renders KPIs + recent cagnottes | manual | log in seeded Seller A → observe 3 KPI cards + cagnottes list | ❌ new page |
| CRET-01 | Empty state when 0 cagnottes | manual | log in seeded Seller C (new) → observe EmptyState | ❌ new page |
| CRET-02 | Create-picker navigates to wizard step 1 | manual | click festive → observe URL `/tableau-de-bord/nouvelle/festive/etape-1` | ❌ new page |
| CRET-03/04 | Wizard 3 steps → POST /api/blocks → 201 | manual | fill all 3 steps → observe `/tableau-de-bord/nouvelle/succes?slug=...` | ❌ new page |
| CRET-03/04 | Draft persists on reload at step 2 | manual | fill step 1 → refresh page → observe pre-filled values | ❌ new page |
| CRET-03/04 | Backend Zod error surfaces as toast | manual | submit step 3 with invalid endDate → observe error message | ❌ new page |
| CRET-05 | Create-success renders preview via `/api/cagnottes/:slug` | manual | after wizard → observe CampaignCard + copy button works | ❌ new page |
| Ring purity | Phase 5 pages don't import into ui/ or composed blocks | static | `bash scripts/verify-ring-purity.sh` | ✅ shipped in Phase 3 |
| No new deps | package.json unchanged | static | `git diff HEAD package.json package-lock.json` — empty | ✅ git command |
| Build green | TS + Next build both pass | static | `cd . && npm run build && cd backend && npm run build` | ✅ commands |
| D-05 enforcement | No rendered social buttons on signup/login | static | `grep -r 'variant="social"' src/app/\\(auth\\)/` — empty or flagged | ✅ grep |
| Smoke backend | Phase 2 smoke still passes | static | `cd backend && npx tsx scripts/smoke-test.ts` — 15/15 | ✅ shipped |

### Sampling Rate
- **Per task commit:** `npm run lint` + `npm run build` (frontend)
- **Per plan merge:** Full `npm run build` + dev-server manual smoke at 375/768/1280 + backend smoke-test still green
- **Phase gate:** All 13 routes manually tested end-to-end with seeded sellers; `audits/audit-010` cells from Phase 4 still green; `git diff package.json` empty

### Wave 0 Gaps
- [ ] `src/lib/slug.ts` — frontend slug preview helper (20 LOC, mirrors backend `slugify` without `ensureUniqueSlug`)
- [ ] `src/lib/features.ts` — `export const FEATURE_SOCIAL_AUTH = false` constant (3 LOC)
- [ ] `src/hooks/useWizardDraft.ts` — sessionStorage hook + FestiveDraft / SolidaireDraft types (80 LOC)
- [ ] Extend `src/lib/constants.ts` with `AUTH_LABELS`, `WIZARD_LABELS`, `DASHBOARD_LABELS`, `CREATE_SUCCESS_LABELS` (~200 LOC additions)
- [ ] No test framework install — stays manual smoke per CLAUDE.md

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | **yes** | bcrypt 12 rounds + JWT httpOnly cookie — already shipped in `backend/src/lib/auth.ts`; Phase 5 frontend just calls the existing endpoints |
| V3 Session Management | **yes** | CSRF double-submit cookie (`izy-csrf`) — already shipped in `src/lib/api.ts`; Phase 5 must use `api()` for every mutation |
| V4 Access Control | **yes** | Server-side guard at `(authed)/layout.tsx` + backend `requireAuth` middleware — both gates must agree |
| V5 Input Validation | **yes** | Zod on backend is the authority; frontend does UX pre-flight only. Do NOT duplicate Zod on frontend. |
| V6 Cryptography | no (for Phase 5) | Passwords + tokens handled entirely by backend. Frontend never sees a hash. |
| V7 Error Handling | **yes** | 401 → auto-refresh, 403 → redirect to verify-email, 429 → toast + disable button, 500 → retry prompt. No raw error bodies shown. |
| V8 Data Protection | **yes** | TOS acceptance is UX only. Draft data in sessionStorage is cleared on logout (via `clearCsrfToken()` in `AuthContext`). |
| V13 API | **yes** | All mutations go through `api()` which attaches CSRF + retries once on 401 |

### Known Threat Patterns for Phase 5

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CSRF on signup / login / mutations | Tampering | `api()` auto-attaches `x-csrf-token` from localStorage or cookie; backend `verifyCsrf` middleware enforces |
| JWT replay after logout | Spoofing | `logout()` clears cookies server-side + `clearCsrfToken()` + `window.location.href = "/"` full reload wipes state |
| Timing attack on login | Info disclosure | Backend uses generic "Email ou mot de passe incorrect" message for both bad email and bad password (line 507+513+520) |
| Verification-code brute force | Spoofing | Backend limits to 5 attempts per code + 6/15min rate limiter per IP — UX must gracefully surface "Trop de tentatives" |
| Forgot-password email enumeration | Info disclosure | Backend returns generic "Si ce compte existe, un code a été envoyé" (line 581, 617) regardless of whether email exists — frontend must NOT branch differently |
| Wizard draft leakage (sessionStorage contains goal amount, title) | Info disclosure | sessionStorage is origin-scoped; cleared on logout reload; never persists across tabs |
| XSS via cagnotte title in success preview | XSS | React escapes by default; the success preview uses `{title}` as text node, not `dangerouslySetInnerHTML` |
| Open redirect on `?next=...` | Redirect abuse | Validate `next` param starts with `/` and does NOT contain `//` or `http(s):` — allowlist internal paths only |
| Double-submit signup (race) | Resource exhaustion | Submit button disabled during `submitting` state; backend also has `signupLimiter` (5 req / 15 min per IP) |
| Wizard double-publish (race) | Integrity | Button disabled + `router.replace` after success + draft cleared |
| TOS bypass | Legal | Submit button disabled until checkbox checked — HTML-level only; backend doesn't enforce |

**Open redirect hardening — must-have for Phase 5:**

```typescript
function safeNextUrl(next: string | null): string {
  if (!next || !next.startsWith("/")) return "/tableau-de-bord";
  if (next.startsWith("//")) return "/tableau-de-bord";  // protocol-relative
  if (next.includes(":")) return "/tableau-de-bord";     // scheme injection
  return next;
}
```

Used in `/connexion?next=...` and `/inscription?next=...`.

---

## Banani Fetch Strategy

**The researcher does NOT fetch any Banani design.** The executor (per `banani-design-implementation` skill) fetches one screen per task, translates, and commits atomically. The researcher only documents the screen → page mapping and expected composition.

### Banani screen → page map

| Banani # | Banani leaf name (from STATUS.md) | Page file | Plan | What Banani provides | What we add |
|---|---|---|---|---|---|
| 3 | `main_next3.jsx` (signup) | `src/app/(auth)/inscription/page.tsx` | 05-01 | Form layout, Prénom+Nom+Email+Password fields, OAuth CTAs (hide), TOS checkbox | Slug preview, `safeNextUrl`, CSRF wiring, 403 handling |
| 4 | `main_next1.jsx` (login) | `src/app/(auth)/connexion/page.tsx` | 05-01 | Form layout, Email+Password, "Oublié ?" link | Error variant state (screen 5), `safeNextUrl`, auto-resend-code on unverified |
| 5 | `main_next1_next1.jsx` (login-variant) | *same route as #4* | 05-01 | Error display (likely) | Merged into same page via `error` state |
| — | — (no Banani) | `src/app/(auth)/verification-email/page.tsx` | 05-01 | — | **We design**: 6-input code field, resend CTA, auto-login on success |
| — | — (no Banani) | `src/app/(auth)/mot-de-passe-oublie/page.tsx` | 05-01 | — | **We design**: email input → confirmation → "check your email" state |
| — | — (no Banani) | `src/app/(auth)/mot-de-passe-reinitialiser/page.tsx` | 05-01 | — | **We design**: code + new password + confirm |
| 6 | `main_next1_next2.jsx` (dashboard) | `src/app/(authed)/tableau-de-bord/page.tsx` | 05-02 | KPI grid, recent cagnottes list, "Créer" CTA | Wire to `/api/sellers/dashboard/stats` + `/api/blocks` + EmptyState branch (screen 7) |
| 7 | `main_next1_next2_next1.jsx` (dashboard-variant) | *same route as #6* | 05-02 | Empty state or alt layout | Merged into `cagnottes.length === 0` branch with `EmptyState` primitive |
| 8 | `main_next1_next2_next2_next1.jsx` (create-picker) | `src/app/(authed)/tableau-de-bord/nouvelle/page.tsx` | 05-02 | 2-RadioCard layout (festive vs solidaire), trust-line copy | Navigation to step 1 of chosen subtype |
| 9 | `...next1_next1.jsx` (festive-step-1) | `src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-1/page.tsx` | 05-02 | Title + occasion + goal fields, step indicator (1/3) | Wire to `useWizardDraft('festive')`, validate, navigate to step 2 |
| 10 | `...next1_next1_next1.jsx` (festive-step-2) | `...festive/etape-2/page.tsx` | 05-02 | Cover upload + "message aux donateurs" (thankYouMessage) + end date | Call `POST /api/upload`, update draft, nav step 3 |
| 11 | `...next1_next1_next1_next1.jsx` (festive-step-3) | `...festive/etape-3/page.tsx` | 05-02 | Visibility RadioCard, hide toggles, TOS checkbox, "Publier" CTA | `POST /api/blocks`, clear draft, `router.replace` to success |
| 12 | `...next1_next2.jsx` (solidaire-step-1) | `...solidaire/etape-1/page.tsx` | 05-02 | Title + cause + beneficiary + goal fields | Wire to `useWizardDraft('solidaire')`, validate, navigate |
| 13 | `...next1_next2_next1.jsx` (solidaire-step-2) | `...solidaire/etape-2/page.tsx` | 05-02 | Cover upload + description + end date | Same upload pattern as festive step 2 |
| 14 | `...next1_next2_next1_next1.jsx` (solidaire-step-3) | `...solidaire/etape-3/page.tsx` | 05-02 | Visibility + hide + TOS + "Publier" | Same submit pattern as festive step 3 |
| 15 | `...next1_next1_next1_next1_next1.jsx` (create-success) | `...nouvelle/succes/page.tsx` | 05-02 | Confetti-ish celebration, share link readonly input + copy, ShareSheet, cagnotte preview card | Server component, reads `?slug=` query, fetches `/api/cagnottes/:slug`, composes CampaignCard + ShareSheet + copy-input |

### Executor workflow (per Banani screen task)

The planner will create ONE atomic task per screen. Each task:

1. Invoke `Skill(banani-design-implementation)` with the screen ID from STATUS.md and the expected output path.
2. Skill step 0 — Load CLAUDE.md, read `src/app/(public)/layout.tsx`, `src/contexts/AuthContext.tsx`, `src/lib/api.ts`, relevant Phase 3 primitives, relevant backend route.
3. Skill step 2 — `mcp__banani__banani_get_selected_designs` (either user has screen selected, or pass `screenIds` from the mapping above).
4. Skill step 3 — Write `.planning/banani/<screen-slug>.md` screen plan.
5. Skill step 5 — Implement the page, composing from Phase 3 primitives. Verify at 375 / 768 / 1280.
6. Commit atomically: `feat(banani): <screen-slug> — pixel parity`.
7. Update `.planning/banani/STATUS.md` to move the screen from Pending → Done with commit SHA.

**We-design pages (email-verify, forgot/reset) use the same skill but skip step 2** — no MCP fetch. The screen plan documents "we design" with reference to brand tokens + Phase 3 primitives.

**One Banani screen per executor task = one commit.** This is the Phase 4 precedent. 14 screen tasks total across 2 plans (11 Banani + 3 we-design), plus plan-wide tasks for hook/helper creation and the final verification.

---

## Data Flow Diagram: Dashboard (Ring 3)

```
┌──────────────────────────────────────────────────────────────┐
│ src/app/(authed)/layout.tsx  (Server Component)              │
│                                                               │
│  1. cookies().get('izy-token')                               │
│  2. fetch('BACKEND_URL/api/auth/me', {cookie: ...})          │
│  3. If 401 → redirect('/connexion?next=...')                 │
│  4. Return <AuthedShell seller={seller}>{children}</...>     │
└─────────────┬────────────────────────────────────────────────┘
              │ (props: seller)
              v
┌──────────────────────────────────────────────────────────────┐
│ src/app/(authed)/tableau-de-bord/page.tsx  (Server Component)│
│                                                               │
│  1. In parallel, fetch two endpoints with cookie forwarded:  │
│     - GET /api/sellers/dashboard/stats                        │
│     - GET /api/blocks                                         │
│  2. Compute `kpis = [revenue, donors, campaignCount]`         │
│  3. Slice `recentCagnottes = blocks.slice(0, 5)`              │
│  4. Branch:                                                   │
│     - if blocks.length === 0 → <EmptyCreatorState ...>        │
│     - else → <DashboardGrid kpis={kpis} cagnottes={...}>      │
└─────────────┬────────────────────────────────────────────────┘
              │
              v
┌──────────────────────────────────────────────────────────────┐
│ <DashboardNavbar seller={seller} unreadCount={0} onLogout..> │   ← Phase 3 Ring 2 block
│ <KpiCard label="Revenu" value={formatPrice(kpis[0])} ... />  │   ← Phase 3 Ring 1 primitive
│ <KpiCard label="Contributeurs" value={kpis[1]} ... />        │
│ <KpiCard label="Cagnottes" value={kpis[2]} ... />            │
│                                                               │
│ <Button href="/tableau-de-bord/nouvelle">Créer une cagnotte</│
│                                                               │
│ {recentCagnottes.map(c =>                                    │
│   <CampaignCard cagnotte={c} />   ← Phase 3 Ring 2 block     │
│ )}                                                            │
└──────────────────────────────────────────────────────────────┘
```

**Ring 3 rule respected:** The page owns all data fetching. Phase 3 blocks (`DashboardNavbar`, `CampaignCard`) accept data via props. `KpiCard` (Ring 1) accepts pre-computed values via props. Zero block or primitive calls `api()` or `useApi()` directly. `scripts/verify-ring-purity.sh` continues to pass.

**Note on recent cagnottes shape:** `GET /api/blocks` returns full block objects including `config`. The Phase 3 `CampaignCard` expects `{slug, title, coverUrl, subtype, raised, goal, donorCount, endDate}`. The dashboard page must **transform** each block to this shape:
```typescript
const cagnottes = blocks
  .filter(b => b.type === "FUNDRAISER")
  .map(b => ({
    slug: b.slug,
    title: b.title,
    coverUrl: b.config.coverUrl ?? null,
    subtype: b.config.subtype,
    raised: 0,  // ⚠ not returned by /api/blocks — see Gap 1 below
    goal: b.config.goalAmount,
    donorCount: 0,  // ⚠ same gap
    endDate: b.config.endDate ?? null,
  }));
```

**Gap 1 (accepted v1 risk):** `GET /api/blocks` does NOT return per-block `raised` / `donorCount`. The only way to get them is `GET /api/blocks/:id/progress` per block. For the dashboard recent list:
- **Option A (v1 recommended):** Display `raised = 0` initially, then client-side fetch `/api/blocks/:id/progress` for each via `useEffect` in a small client island. 2-5 additional requests on dashboard mount — acceptable.
- **Option B (v2):** Extend `/api/blocks` to return a `progress` subfield — backend work, not Phase 5.
- **Option C (v1):** For each cagnotte in the list, fetch via `GET /api/cagnottes/:slug` server-side in parallel. Adds latency but returns progress. Recommended if dashboard performance matters more than code simplicity.

**Recommend Option A** — simplest, keeps server component pure, progress hydrates after first render.

---

## Plan Breakdown Preview

### Plan 05-01 — Public Auth Screens (4 pages)

**Goal:** Ship `/inscription`, `/connexion`, `/verification-email`, `/mot-de-passe-oublie`, `/mot-de-passe-reinitialiser` wired to Phase 2 auth endpoints with CSRF.

**Dependencies:** Phase 3 primitives + blocks (shipped), Phase 2 auth endpoints (shipped).

**Atomic task list:**

1. **T1 — Foundation** (no commit): Read CLAUDE.md + AuthContext + api.ts + backend/routes/auth.ts. Verify all endpoints respond. Confirm Banani MCP connectivity.
2. **T2 — Helper files** (commit `feat(05-01): add slug.ts + features.ts + AUTH_LABELS`): Ship `src/lib/slug.ts` (20 LOC), `src/lib/features.ts` (3 LOC), extend `src/lib/constants.ts` with `AUTH_LABELS` group. No page changes.
3. **T3 — `(auth)` layout** (commit `feat(05-01): add (auth) route group layout`): Create `src/app/(auth)/layout.tsx` that composes PublicNavbar + TopBanner + PreFooter + Footer (same pattern as `(public)`). Server component. No auth guard (these pages are public).
4. **T4 — Signup page via Banani skill** (commit `feat(banani): signup — pixel parity`): Invoke skill with screen 3, translate to `src/app/(auth)/inscription/page.tsx`. Wire `POST /api/auth/signup`, slug preview, hide social CTAs, handle 409, redirect to `/verification-email?email=...`.
5. **T5 — Login page via Banani skill** (commit `feat(banani): login — pixel parity`): Screen 4 + screen 5 (same page). Wire `POST /api/auth/login`, handle 401/403/429, auto-resend on unverified, `safeNextUrl`.
6. **T6 — Verify-email page (we design)** (commit `feat(05-01): verify-email landing`): 6-input code field, `POST /api/auth/verify-email`, resend CTA with cooldown, auto-login on success.
7. **T7 — Forgot-password + reset-password (we design)** (commit `feat(05-01): password reset flow`): Two pages, `POST /api/auth/forgot-password` → `POST /api/auth/reset-password`, unified Banani-style design.
8. **T8 — Verification** (commit `docs(05-01): summary + STATUS.md update`): Manual smoke on 5 pages at 375/768/1280, `npm run build` green, `verify-ring-purity.sh` green, backend smoke still green, update STATUS.md + FRONTEND-DEVIATIONS.md if needed, write `05-01-SUMMARY.md`.

**Verification checklist (per plan):**
- [ ] Signup with real email creates account + sends code
- [ ] Verify-email with correct code → logged in → dashboard (Phase 5-02 skeleton placeholder if 05-02 not yet built)
- [ ] Login with seed Seller A → logged in
- [ ] Login with unverified email → redirect to verify-email + toast
- [ ] Forgot-password flow end-to-end with seed Seller A
- [ ] Social CTAs not rendered (FEATURE_SOCIAL_AUTH false)
- [ ] `npm run build` green, 0 TS errors
- [ ] `verify-ring-purity.sh` green
- [ ] `grep 'variant="social"' src/app/\(auth\)/` expect 0 matches or behind flag
- [ ] `git diff package.json` empty
- [ ] D-05 enforcement confirmed
- [ ] No English strings in `src/app/(auth)/**/*.tsx`
- [ ] Backend `tsx scripts/smoke-test.ts` still 15/15 green

**LOC estimate:** ~1,200 lines total (5 pages × ~200 LOC + helpers + constants).

### Plan 05-02 — Creator Flow (7 screens, 9 routes)

**Goal:** Ship `/tableau-de-bord`, `/tableau-de-bord/nouvelle`, 3×2 wizard steps, `/tableau-de-bord/nouvelle/succes` with server auth guard, sessionStorage draft, and atomic create flow.

**Dependencies:** Plan 05-01 (login flow works), Phase 3 primitives + blocks (shipped), Phase 2 backend endpoints (shipped), Phase 1 Zod schema (shipped).

**Atomic task list:**

1. **T1 — Foundation** (no commit): Read all Phase 5 research + plan 05-01. Verify test user login works.
2. **T2 — Hooks + `(authed)` layout** (commit `feat(05-02): (authed) group + useWizardDraft hook`):
   - Create `src/hooks/useWizardDraft.ts` (80 LOC).
   - Create `src/app/(authed)/layout.tsx` (server component with `cookies()` guard).
   - Create `src/app/(authed)/AuthedNavbarShell.tsx` (client island mounting `DashboardNavbar` with `useAuth()` logout handler + `useApi('/api/notifications/count')` for unread badge — or stub to 0 if notifications not yet wired).
3. **T3 — Dashboard page via Banani skill** (commit `feat(banani): dashboard — screens 6 + 7`):
   - Invoke skill with screen 6 + 7.
   - Server component fetches stats + blocks in parallel.
   - Branch on empty state (screen 7) via `EmptyState`.
   - Client island hydrates `raised` / `donorCount` per cagnotte via per-block `/progress` fetch (Option A from Gap 1 above).
4. **T4 — Create-picker page via Banani skill** (commit `feat(banani): create-picker — screen 8`):
   - Invoke skill with screen 8.
   - Pure navigation page: 2 RadioCards → router.push to chosen wizard step 1.
5. **T5 — Festive wizard steps 1-3 via Banani skill** (commits `feat(banani): festive-step-1/2/3 — screens 9/10/11`, 3 commits):
   - 3 atomic commits, one per screen.
   - Each step reads draft, validates current slice, navigates forward.
   - Step 3 is the submit — `POST /api/blocks` → clear draft → redirect.
6. **T6 — Solidaire wizard steps 1-3 via Banani skill** (commits `feat(banani): solidaire-step-1/2/3 — screens 12/13/14`, 3 commits):
   - Same pattern, different fields.
7. **T7 — Create-success page via Banani skill** (commit `feat(banani): create-success — screen 15`):
   - Server component, reads `?slug=`, fetches `/api/cagnottes/:slug`, renders CampaignCard + ShareSheet + readonly input + copy button.
8. **T8 — Verification** (commit `docs(05-02): summary + STATUS.md update`):
   - Manual e2e: login → dashboard → create cagnotte end-to-end both subtypes → verify both appear in dashboard list.
   - Manual smoke at 375/768/1280 for all 9 routes.
   - `npm run build` + `verify-ring-purity.sh` + backend smoke all green.
   - Update STATUS.md: 11 screens moved to Done.
   - Write `05-02-SUMMARY.md`.

**Verification checklist:**
- [ ] Dashboard renders KPIs + recent cagnottes (seeded Seller A)
- [ ] Dashboard empty state renders for new user (create in 05-01)
- [ ] Create-picker navigates to correct wizard
- [ ] Festive wizard creates FUNDRAISER with `subtype: 'festive' + occasion`
- [ ] Solidaire wizard creates FUNDRAISER with `subtype: 'solidaire' + cause + beneficiary`
- [ ] Wizard draft persists on mid-flow refresh
- [ ] Wizard draft cleared on success
- [ ] Create-success shows newly-created cagnotte preview + share link
- [ ] Copy-to-clipboard works
- [ ] Server auth guard redirects unauth users to `/connexion?next=...`
- [ ] `(authed)/layout.tsx` uses `cookies()` not `useAuth()`
- [ ] No page imports `api()` inside a Phase 3 block
- [ ] `git diff package.json` empty
- [ ] Backend smoke still 15/15 green
- [ ] Dev-fixtures page `/dev-foundations` still works (unchanged)

**LOC estimate:** ~2,000 lines total (dashboard 250, picker 80, 6 wizard steps @ ~250, success 200, layout 100, hook 80, constants additions 150).

---

## File Map with LOC Estimates

### Plan 05-01 (~1,200 LOC)

| File | LOC | Status | Notes |
|------|-----|--------|-------|
| `src/lib/slug.ts` | 20 | new | `slugify()` frontend helper |
| `src/lib/features.ts` | 5 | new | `FEATURE_SOCIAL_AUTH = false` |
| `src/lib/constants.ts` | +200 | modified | Add `AUTH_LABELS`, `VERIFY_EMAIL_LABELS`, `RESET_PASSWORD_LABELS` |
| `src/app/(auth)/layout.tsx` | 25 | new | Reuse public blocks directly |
| `src/app/(auth)/inscription/page.tsx` | 220 | new | Banani screen 3 |
| `src/app/(auth)/connexion/page.tsx` | 200 | new | Banani screens 4 + 5 merged |
| `src/app/(auth)/verification-email/page.tsx` | 200 | new | We design |
| `src/app/(auth)/mot-de-passe-oublie/page.tsx` | 150 | new | We design |
| `src/app/(auth)/mot-de-passe-reinitialiser/page.tsx` | 180 | new | We design |
| `.planning/banani/<slugs>.md` (screen plans) | — | new | 3 Banani plans + 3 we-design plans |
| `.planning/banani/STATUS.md` | +10 | modified | Mark screens 3 + 4 + 5 as Done |
| `.planning/phases/05-auth-creator-flow/05-01-SUMMARY.md` | — | new | Plan summary |

### Plan 05-02 (~2,000 LOC)

| File | LOC | Status | Notes |
|------|-----|--------|-------|
| `src/hooks/useWizardDraft.ts` | 100 | new | sessionStorage hook |
| `src/lib/constants.ts` | +250 | modified | `DASHBOARD_LABELS`, `PICKER_LABELS`, `WIZARD_LABELS`, `CREATE_SUCCESS_LABELS` |
| `src/app/(authed)/layout.tsx` | 80 | new | Server guard |
| `src/app/(authed)/AuthedNavbarShell.tsx` | 60 | new | Client island for DashboardNavbar |
| `src/app/(authed)/tableau-de-bord/page.tsx` | 270 | new | Banani screens 6 + 7 |
| `src/app/(authed)/tableau-de-bord/DashboardHydrate.tsx` | 80 | new | Client island for per-block progress hydration |
| `src/app/(authed)/tableau-de-bord/nouvelle/page.tsx` | 120 | new | Banani screen 8 |
| `src/app/(authed)/tableau-de-bord/nouvelle/WizardStepIndicator.tsx` | 40 | new | 3-step progress indicator |
| `src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-1/page.tsx` | 240 | new | Banani screen 9 |
| `src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-2/page.tsx` | 260 | new | Banani screen 10 |
| `src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-3/page.tsx` | 230 | new | Banani screen 11 |
| `src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-1/page.tsx` | 250 | new | Banani screen 12 |
| `src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-2/page.tsx` | 260 | new | Banani screen 13 |
| `src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-3/page.tsx` | 230 | new | Banani screen 14 |
| `src/app/(authed)/tableau-de-bord/nouvelle/succes/page.tsx` | 200 | new | Banani screen 15 |
| `.planning/banani/<slugs>.md` | — | new | 11 screen plans |
| `.planning/banani/STATUS.md` | +25 | modified | 11 screens Done |
| `.planning/phases/05-auth-creator-flow/05-02-SUMMARY.md` | — | new | Plan summary |

**Total Phase 5 estimate:** ~3,200 LOC across ~22 new files + modifications to constants.ts and STATUS.md. Zero new deps. Backend untouched.

---

## Sources

### Primary (HIGH confidence)

- **`backend/src/routes/auth.ts`** — lines 37-46 (signupSchema), 97-113 (check-slug), 145-230 (signup), 241-302 (resend-code), 305-384 (verify-email), 394-440 (refresh), 443-496 (me), 499-562 (login), 573-626 (forgot-password), 644-693 (reset-password), 702-738 (change-password PUT). All verified by direct Read.
- **`backend/src/routes/sellers.ts`** — lines 318-437 (`GET /api/sellers/dashboard/stats`). Verified.
- **`backend/src/routes/blocks.ts`** — lines 136-151 (`GET /api/blocks`), 268-447 (`POST /api/blocks` with FUNDRAISER slug generation), 268 onwards. Verified.
- **`backend/src/lib/blocks/schemas.ts`** — lines 84-183 (`fundraiserBlockConfigSchema` + `.superRefine`). Verified.
- **`backend/src/lib/cagnottes/slug.ts`** — `slugify()` + `ensureUniqueSlug()` + BLOCK_RESERVED_SLUGS. Verified.
- **`backend/src/middleware/auth.ts`** — `requireAuth` middleware + 30s seller cache. Verified.
- **`src/lib/api.ts`** — `api<T>()` wrapper, CSRF auto-attach, 401 auto-refresh, 30s timeout. Verified.
- **`src/contexts/AuthContext.tsx`** — `useAuth()` returns `{seller, loading, loggingOut, error, refreshSeller, logout}`. Verified (NO login/signup methods — pages call api() directly).
- **`src/components/ui/index.ts`** — exports all 18 primitives. Verified.
- **`src/components/layout/DashboardNavbar.tsx`** — props `{unreadCount, seller, onLogout}`. Verified.
- **`src/components/layout/PublicNavbar.tsx`** — CTAs already point at `/connexion` + `/inscription`. Verified.
- **`src/components/layout/SidebarNav.tsx`** — props-driven, available for Phase 6 but NOT used in Phase 5. Verified.
- **`src/components/cagnottes/CampaignCard.tsx`** — props `{cagnotte: {slug, title, coverUrl, subtype, raised, goal, donorCount, endDate}}`. Verified.
- **`src/components/share/ShareSheet.tsx`** — WhatsApp-first, copy button, share button. Verified (Phase 3 summary).
- **`src/lib/constants.ts`** — Existing labels (NAV_LABELS, FORM_LABELS, OCCASIONS, CAUSES, BENEFICIAIRES, SUBTYPE_LABELS, MISC). Verified.
- **`src/lib/format.ts`** — `formatPrice`, `formatPhone`, `formatRelativeTime`. Verified.
- **`src/app/(public)/layout.tsx`** — composition pattern (TopBannerHost + PublicNavbar + main + PreFooter + Footer). Verified.
- **`src/app/layout.tsx`** — Poppins + Inter fonts mounted. Verified.
- **`backend/prisma/schema.prisma`** — Seller has `displayName` (single field), `slug`, `kycStatus`, no firstName/lastName, no tosAccepted. Verified.
- **`.planning/banani/STATUS.md`** — 24-screen inventory + locked decisions. Verified.
- **`.planning/REQUIREMENTS.md`** — Phase 5 maps to AUTF-01..04 + CRET-01..05. Verified.
- **`.planning/ROADMAP.md`** — Phase 5 goal, plans, watch-outs. Verified.
- **`.planning/PROJECT.md`** — locked decisions, constraints, out-of-scope. Verified.
- **`.planning/phases/03-frontend-foundations/03-03-SUMMARY.md`** — Ring 2 composed blocks available contracts. Verified.
- **`.planning/phases/04-public-donor-revenue-path/04-01-SUMMARY.md`** — (public) layout pattern + server-side render precedent. Verified.
- **`.planning/phases/01-backend-foundations/01-03-SUMMARY.md`** — FUNDRAISER schema + computeCommission details. Verified.
- **`.planning/phases/02-backend-surfaces-exit-gate/02-03-SUMMARY.md`** — smoke-test baseline, change-password PUT confirmation. Verified.
- **`.planning/banani/FRONTEND-DEVIATIONS.md`** — D-01 to D-07 deviations. Verified; D-05 directly applies to Phase 5 social CTAs.
- **`~/.claude/skills/banani-design-implementation/SKILL.md`** — 6-step workflow. Verified (executor will invoke per screen).

### Secondary (MEDIUM confidence)

- Next.js 16 App Router `cookies()` / `redirect()` / route groups — [CITED: nextjs.org/docs] standard patterns, verified against existing Phase 4 `(public)` group usage.
- `sessionStorage` API (origin-scoped, cleared on tab close) — MDN Web Docs, standard web platform.

### Tertiary (LOW confidence — none)

No tertiary sources. Every claim is grounded in a file that was Read in this session or is standard web/Next.js API.

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every primitive/block shipped in Phase 3, every backend endpoint verified at line numbers, zero new deps
- Architecture: **HIGH** — route group pattern follows Phase 4 precedent, server guard pattern documented in Next 16 docs and straightforward
- Pitfalls: **HIGH** — the 3 surprise gotchas (signup slug required, 6-digit code verify-email, displayName merge) are verified from source code, not inferred

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days for stable milestone work) — re-verify if backend auth routes are touched

**Key gaps known:** 
- Gap 1 (dashboard per-block progress) — accepted as a client island hydration pattern (Option A)
- Banani field layouts per screen — resolved by executor fetching one at a time via skill

**Ready for planning:** Yes. The planner can now produce `05-01-PLAN.md` and `05-02-PLAN.md` with atomic task lists. Every contract is documented, every pitfall has a recommended mitigation, every file has a target path and LOC estimate. The executor invokes the `banani-design-implementation` skill per screen task; the researcher never fetches Banani designs.
