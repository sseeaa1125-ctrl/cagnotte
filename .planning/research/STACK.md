# Stack Research

**Domain:** Senegalese crowdfunding / cagnotte platform — Banani-designed frontend + 12 backend gaps on an existing Next.js 16 / Express 5 / Prisma / Bictorys fork
**Researched:** 2026-04-13
**Confidence:** HIGH
**Mode:** Ecosystem (scoped to additions only — existing stack is locked)

---

## Scope of this research

The existing stack (Next.js 16.1.6, React 19.2.3, Tailwind v4, Express 5.1, Prisma 7.4.1, Neon, Upstash Redis, Cloudflare R2, Bictorys, Resend 4.5.2, bcryptjs 3.0.3, jose 6.0.11, zod 3.25.32, lucide-react 0.575.0, clsx 2.1.1, tailwind-merge 3.5.0) is **validated and not up for debate** per [.planning/codebase/STACK.md](../codebase/STACK.md) and CLAUDE.md.

This file recommends **only the marginal additions** needed for:

1. Public cagnotte detail + donation checkout (24 Banani screens, mobile-first 375px)
2. Rebuilt notifications lib (in-app feed + email dispatch)
3. `Block.slug` generation + uniqueness
4. FUNDRAISER commission per subtype (6% solidaire / 8% festive, basis points)
5. Keeping everything compatible with existing Prisma + Express + Bictorys

The **headline finding** is that the existing stack already covers 95% of the gap. Four of the five concerns need **zero new runtime dependencies**. Only one concern (Poppins headings) needs a new font load. The cost of discipline here is far lower than the cost of shipping ORM/form/validation creep into a codebase that is already opinionated.

---

## Recommended Stack Additions

### Frontend — 1 real addition, 0 new npm packages

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `next/font/google` → Poppins | built-in (Next 16.1.6) | Heading font for Banani navy/pink brand | Zero new dep. `next/font` self-hosts Google fonts at build time, no runtime DNS/CDN hit on 3G, no CLS (size-adjust baked in). Used same way Inter is already wired. |
| `next/font/google` → Inter | built-in (Next 16.1.6) | Body font (already present) | Unchanged — confirm it's kept alongside Poppins. |
| Tailwind v4 `@theme` block | already installed (Tailwind 4) | Navy `#172866` primary + pink `#FBE6ED` accent tokens | Tailwind v4 exposes `@theme` directives in `globals.css` — no `tailwind.config.ts` edits required. Matches Banani export convention. |
| **Native HTML5 forms + React 19 `useActionState`** | React 19.2.3 | Signup, login, participate, wizard steps | **Do NOT add react-hook-form.** React 19's `useActionState` + server actions + native `<form>` validation covers every Banani form (signup/login/participate/wizard). For a 6-form surface, importing a 12 kB form library is gratuitous. Validate on the server with existing Zod. |
| **Plain `fetch` + existing `src/lib/api.ts`** | already present | All backend calls | `api.ts` is battle-tested per CLAUDE.md ("do not modify without reason"). It handles 401 refresh, CSRF injection, 30s timeout, network retry. New pages reuse this wrapper verbatim. |
| **`useApi` hook + `invalidateCache`** | already present (`src/lib/useApi.ts`) | Stale-while-revalidate reads (notif count badge, progress polling) | Already implements 2min TTL cache. No need for TanStack Query for 4 cached GETs. |

**Confidence: HIGH** — Next.js 16 `next/font/google` is the official, documented pattern ([nextjs.org/docs/app/api-reference/components/font](https://nextjs.org/docs/app/api-reference/components/font)). React 19 `useActionState` is GA in React 19.2.

### Backend — 0 new runtime dependencies

| Concern | Solution | New dep? | Why no new lib |
|---------|----------|----------|----------------|
| **Slug generation + uniqueness** | Hand-rolled `backend/src/lib/cagnottes/slug.ts` (~35 LOC) | **No** | Requirements lock the algorithm: NFD-normalize + strip diacritics + lowercase + `[a-z0-9-]` + reserved-words check + numeric suffix on conflict. Libraries like `slugify`, `@sindresorhus/slugify`, or `limax` each drag 10-50 kB + opinions on char maps. Node's built-in `String.prototype.normalize("NFD").replace(/\p{Diacritic}/gu, "")` does diacritics correctly for French (éèêàîôù) in 2 LOC. Reserved-word list is project-specific anyway. **Write it ourselves.** |
| **Commission per subtype (600 / 800 basis points)** | 4 LOC const + inline calculation in `routes/orders.ts` | **No** | Per [BACKEND-PLAN.md 0.5](../banani/BACKEND-PLAN.md), this is a hard-coded `{ solidaire: 600, festive: 800 }` lookup stored in `Order.commissionRate` (existing `Int` field). Zero abstraction justified. Document v2 migration to `PlatformConfig` table in a code comment. |
| **FUNDRAISER Zod schema extension** | Extend existing `fundraiserBlockConfigSchema` with `.superRefine()` | **No** — zod already installed | Zod 3.25.32 already present; `superRefine` is the canonical cross-field validation API. Don't upgrade to zod 4 — [zod.dev](https://zod.dev) v4 has breaking changes around error flattening and the existing codebase has not been audited for them. |
| **Notifications lib** | New `backend/src/lib/notifications/` — Prisma inserts + emailQueue push | **No** | Prisma, Upstash Redis (JobQueue), and Resend are all already wired. The lib is pure glue code: `createNotification(…)` → `prisma.notification.create` + `emailQueue.push`. No new lib solves this better than 80 LOC of hand code. |
| **Notifications routes** | New `backend/src/routes/notifications.ts` | **No** | Express 5 + existing `requireAuth` + existing CSRF middleware cover it entirely. |
| **Public cagnottes routes** | New `backend/src/routes/cagnottes.ts` | **No** | Same stack, public (no auth), cursor-paginated. Use existing `prisma.block.findMany` + `orderBy: { createdAt: "desc" }`. |

**Confidence: HIGH** — Every "addition" is an extension of already-installed packages. The instinct to reach for a library on each new feature is the wrong instinct here.

### Development / Design Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Banani JSX export | Frontend component scaffolding | Manual: import JSX, strip desktop-only inline styles, map to Tailwind tokens, rewrite € → FCFA and `+33` → `+221`. Document mappings in `.planning/banani/FRONTEND-DEVIATIONS.md` as the plan anticipates. |
| Prisma Studio (already installed) | Schema verification after migrations | `cd backend && npm run db:studio` after `0.1` migrations land. |
| Banani screens index | Requirements source of truth | [.planning/banani/STATUS.md](../banani/STATUS.md) — 24-screen inventory. |

---

## Installation

```bash
# Frontend — ZERO new runtime packages
# Poppins is loaded via next/font/google (built into Next 16)
# No npm install needed

# Backend — ZERO new runtime packages
# Everything is existing Prisma / Express / Zod / Upstash / Bictorys
# No npm install needed
```

If a new need emerges mid-build (e.g. CSV export for participations — currently out of scope per PROJECT.md), re-open this file and justify the addition **before** running `npm install`.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Hand-rolled `slug.ts` (~35 LOC) | `slugify` (npm, ~10 kB) | If we needed Turkish/Arabic/Asian char transliteration. French diacritics work fine with NFD normalize. |
| Hand-rolled `slug.ts` | `@sindresorhus/slugify` | Same as above — bigger char-map database, overkill for French. |
| React 19 `useActionState` + native forms | `react-hook-form` + `@hookform/resolvers/zod` | If we had 15+ forms with deep nested field arrays, dynamic field registration, or wizards with complex revalidation. Banani has 2 wizards × 3 linear steps — trivial with `useState`. |
| React 19 `useActionState` | TanStack Form | Same as above — overkill for linear wizards. |
| Existing `useApi` hook | TanStack Query (React Query v5) | If we had 20+ queries with interdependent invalidation, optimistic updates, or infinite scroll with prefetch. Banani has ~6 cached reads — `useApi` 2-min TTL covers it. |
| Existing `emailQueue` + inline notifications | BullMQ / pg-boss / Inngest | If notification throughput exceeded Upstash REST limits (1000 req/sec) or we needed multi-instance ordering guarantees. We will not. |
| Zod 3.25 | Zod 4 | When the rest of the codebase is audited for v4 breaking changes (not now — the fork still has ~20 files using v3 error flattening). |
| `next/font/google` Poppins | Self-hosted Poppins woff2 | If we wanted to reduce Google dependency further. `next/font` already self-hosts at build — we already get the benefit. |
| Hand-rolled notifications lib | `novu` / `knock` / `courier` | Never for v1 — these are hosted services priced per notification, overkill for a ≤1000 notifications/day use case. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **`slugify` / `@sindresorhus/slugify` / `limax`** | Adds 10-50 kB + char-map opinions we don't need. Our slug algorithm is explicitly locked in PROJECT.md decisions (no random hex, numeric suffix, specific reserved-word list). | 35-LOC helper in `backend/src/lib/cagnottes/slug.ts` using `String.prototype.normalize("NFD")` |
| **`react-hook-form`** | 12 kB runtime for 6 forms (2 auth + 2 wizards × 3 steps + 1 participate + 1 profile edit) is not worth it. React 19 native forms + `useActionState` + server-side Zod handle it cleanly. | Native `<form>` + React 19 `useActionState` + existing Zod validation on backend |
| **TanStack Query / SWR** | Existing `useApi` hook already implements stale-while-revalidate with 2-min TTL + `invalidateCache(path)`. Adding Query v5 (~13 kB) for 6 cached reads is waste. | Existing `src/lib/useApi.ts` |
| **Redux / Zustand / Jotai** | CLAUDE.md forbids it. React Context already covers AuthContext + ToastContext. Notification badge count = `useApi('/api/notifications/count')` — no global state needed. | React Context + `useState` + `useApi` |
| **Framer Motion / react-spring** | CLAUDE.md forbids it (3G performance target). Progress bar fill, modal open, toast slide-in are all 1-line CSS transitions. | `transition-[width] duration-500 ease-out` Tailwind utilities |
| **Zod 4** | Breaking changes to error-flattening API; existing routes use `.safeParse` + v3 error shape. Migration cost > zero benefit for Phase 0. | Stay on zod 3.25.32 |
| **BullMQ / pg-boss / Inngest / Temporal** | Notifications have <100 events/day expected in v1. Existing Upstash-backed `JobQueue` is sufficient and already proven for email dispatch. Adding BullMQ means running a Redis pub/sub worker process, which the Railway/Vercel topology does not currently support without infra work. | Existing `backend/src/lib/queues/JobQueue.ts` + new `notifications/` lib |
| **Novu / Knock / Courier / Customer.io** | Hosted notification SaaS priced per MAU / per notification. Overkill + privacy concern for Senegalese donor data. | Hand-rolled Prisma `Notification` model + `emailQueue` push |
| **react-query-firebase / supabase-js / etc** | No Firebase/Supabase in stack. Neon + Prisma is the source of truth. | Existing Prisma client from `backend/src/generated/prisma` |
| **Axios / got / ky** | CLAUDE.md forbids. Bictorys calls use native `fetch` with manual 3-retry WAF logic already. Frontend uses `src/lib/api.ts` native `fetch`. | Native `fetch` |
| **NextAuth / Clerk / Auth0 / Supabase Auth** | CLAUDE.md forbids. Custom bcrypt + jose JWT already implemented with CSRF double-submit and stale-JWT re-query. | Existing `backend/src/routes/auth.ts` |
| **i18next / react-intl / next-intl** | CLAUDE.md: "All UI text is in French. No English in user-facing strings." Single locale = no i18n framework needed. String constants go in `src/lib/constants.ts`. | `src/lib/constants.ts` |
| **date-fns / luxon / dayjs** | For "J-3 ending soon" logic + `formatPhone +221` + FCFA formatting, `Intl.DateTimeFormat` + `Intl.NumberFormat` + `Date` arithmetic cover every case. Existing `src/lib/utils.ts` has `formatPrice` — add `formatEndsInDays` the same way. | Native `Date` + `Intl.*` in `src/lib/format.ts` (new file per BACKEND-PLAN FE-A) |
| **Stripe / PayDunya / CinetPay** | Banani mentions "PayDunya" — this is a designer error. CLAUDE.md locks Bictorys as the sole payment provider. | Existing `backend/src/lib/payments/bictorys.ts` |
| **lodash / ramda / remeda** | Modern JS covers it. `Object.fromEntries`, `Array.prototype.flatMap`, `structuredClone` are all in Node 22. | Native ES2023 |
| **uuid** | `cuid()` via Prisma is the existing convention per CLAUDE.md. | `@paralleldrive/cuid2` is already pulled in transitively by Prisma — use `@default(cuid())` |

---

## Stack Patterns by Variant

**Public cagnotte detail page (`/c/<slug>`):**
- Server Component by default (Next 16 App Router) — SEO + first paint on 3G
- Fetch `GET /api/cagnottes/:slug` from the RSC with `fetch(..., { next: { revalidate: 60 } })` for 60s ISR-style caching
- Participants list = Client Component (`"use client"`) for cursor-paginated "Load more" — call `useApi` hook
- Progress bar = pure CSS (`width: ${percent}%` + `transition-[width]`)

**Donation checkout (`/c/<slug>/participer` → `/c/<slug>/paiement`):**
- Client Component (form state + two checkboxes for isAnonymous / messageIsPrivate)
- Submit via native `<form action={submitDonation}>` using React 19 server action that calls `POST /api/orders`
- On success, server action returns payment URL → client navigates via `window.location.href` (same-window for TikTok WebView compat per audit-008)
- Payment URLs must be base64-encoded and routed through existing `src/app/api/pay-redirect/route.ts`

**Creator wizard (3 steps festive / 3 steps solidaire):**
- Client Component with `useState` for the wizard state
- Each step validates locally (`try { schema.parse(partial) }`) for instant feedback, server re-validates on final submit
- Step state lives in component memory — **no localStorage**, **no URL query params**, **no Zustand**. User accepts that a browser refresh mid-wizard loses progress (acceptable for v1 per minimal-scope mandate)

**Notifications feed:**
- Client Component polling `GET /api/notifications` via `useApi`
- Badge count via `GET /api/notifications/count` with 30s poll (React `useEffect` + `setInterval`)
- `POST /api/notifications/mark-read` on item click + `invalidateCache('/api/notifications/count')`

**KYC upload:**
- Reuse existing `POST /api/upload` + multer + R2 flow
- Client-side HEIC detection before upload (`heic-convert` on backend handles conversion server-side)
- Preview via `URL.createObjectURL` before submit

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.1.6 | React 19.2.3 | React 19 is the minimum for Next 16. `useActionState` is React 19.2 GA. Confirmed at [nextjs.org/blog/next-16](https://nextjs.org/blog/next-16). |
| Tailwind v4 | PostCSS via `@tailwindcss/postcss` 4.x | No `tailwind.config.ts` in v4 — use `@theme` in `globals.css`. Already configured. |
| `next/font/google` Poppins | Next.js 16 | Self-hosted at build time. Supports `weight: ['500', '600', '700']` (headings-only range we need). |
| Prisma 7.4.1 | Neon adapter 7.4.1 + `@neondatabase/serverless` 1.0.2 | Custom client output path `backend/src/generated/prisma` — all new code must import from there, NOT `@prisma/client`. |
| Zod 3.25.32 | Express 5.1 + Prisma 7.4 | `.superRefine()` is v3 API — stable. Don't bump to v4. |
| Express 5.1.0 | `express-rate-limit` 8.2.1 + `@upstash/ratelimit` 2.0.8 | Already wired via `RedisRateLimitStore`. Public `GET /api/cagnottes` uses the global 300/15min limiter. |
| jose 6.0.11 | React 19 cookies | Edge-compatible (Vercel edge runtime safe). No change. |
| Bictorys API | Express 5.1 raw JSON parser | Signature verification uses raw body — existing middleware `app.use('/api/webhooks', express.raw({ type: 'application/json' }))` must stay before the JSON parser. Same pattern for new routes. |

---

## Integration Points with Existing Stack

### New frontend files (per BACKEND-PLAN FE-A)
- `src/app/fonts.ts` — `export const poppins = Poppins({ subsets: ['latin'], weight: ['500','600','700'], variable: '--font-poppins' })`
- `src/app/layout.tsx` — add `${poppins.variable}` to `<html>` className alongside existing Inter
- `src/app/globals.css` — add `@theme { --color-navy-500: #172866; --color-pink-100: #FBE6ED; --font-display: var(--font-poppins); }`
- `src/lib/format.ts` — `formatPrice`, `formatPhone`, `formatEndsInDays` (native `Intl.*`, no deps)
- `src/lib/constants.ts` — French labels + subtype enums + reserved slug list (mirror of backend)

### New backend files
- `backend/src/lib/cagnottes/slug.ts` — `slugify` + `ensureUniqueSlug` (zero deps, uses Prisma)
- `backend/src/lib/notifications/index.ts` — `createNotification` (uses existing Prisma + existing `emailQueue`)
- `backend/src/lib/notifications/templates.ts` — French template factory per `NotificationType`
- `backend/src/routes/cagnottes.ts` — public GET endpoints, mounted before CSRF
- `backend/src/routes/notifications.ts` — authed endpoints, behind `requireAuth` + CSRF
- `backend/scripts/seed-dev.ts` — uses existing Prisma client
- `backend/scripts/smoke-test.ts` — pure node + `fetch`, no test framework

### Touched existing files
- `backend/prisma/schema.prisma` — add `Block.slug`, `Order.isAnonymous`, `Order.messageIsPrivate`, `Notification` model + enum
- `backend/src/lib/blocks/schemas.ts` — extend `fundraiserBlockConfigSchema` + `.superRefine()`
- `backend/src/routes/orders.ts` — commission calculation + new flags
- `backend/src/routes/webhooks.ts` — call `createNotification` on `PAID`
- `backend/src/routes/withdrawals.ts` — call `createNotification` on state change
- `backend/src/index.ts` — mount new routers, wire J-3 ending-soon into existing `setInterval` cron

### Bictorys compatibility
- No new Bictorys calls — commission is computed before the existing `createBictorysCharge` call
- Webhook handler extension is additive only (add `createNotification` inside the existing `PAID` branch)
- Two-key convention preserved (`BICTORYS_API_KEY` for charges, `BICTORYS_PRIVATE_KEY` for payouts — never mixed)

### Prisma compatibility
- All new code imports from `backend/src/generated/prisma` (custom output path), NOT `@prisma/client`
- New `Notification` model adds a back-relation on `Seller` — existing `Seller` model edits are limited to one new field (`notifications Notification[]`)
- `Block.slug` is `String? @unique` (nullable for backward-compat with dead block types; enforced non-null in the FUNDRAISER creation route)

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Next 16 + React 19 + `useActionState` | HIGH | Official docs verified, React 19.2 GA is current |
| `next/font/google` Poppins | HIGH | Documented Next.js pattern, already used for Inter |
| Tailwind v4 `@theme` | HIGH | Official v4 API, matches Banani export convention |
| Hand-rolled slug helper | HIGH | Requirements are fully specified, NFD normalize is a documented JS primitive |
| Commission basis points | HIGH | Hard-coded per explicit product decision |
| Notifications via Prisma + emailQueue | HIGH | Reuses proven infra |
| Zero new deps for backend | HIGH | Every concern maps to an already-installed package |
| Anti-recommendations | HIGH | CLAUDE.md explicitly forbids Redux/Framer Motion/Axios/NextAuth; the rest are justified by scope |

---

## Sources

- [CLAUDE.md](../../CLAUDE.md) — locked stack rules, forbidden libraries, naming conventions (HIGH)
- [.planning/PROJECT.md](../PROJECT.md) — product decisions, commission rates, slug rules (HIGH)
- [.planning/banani/BACKEND-PLAN.md](../banani/BACKEND-PLAN.md) — 12 backend tasks + decision trail (HIGH)
- [.planning/codebase/STACK.md](../codebase/STACK.md) — validated current stack inventory (HIGH)
- [.planning/codebase/INTEGRATIONS.md](../codebase/INTEGRATIONS.md) — Bictorys / Resend / R2 / Upstash integration points (HIGH)
- [package.json](../../package.json) + [backend/package.json](../../backend/package.json) — installed versions (HIGH)
- [Next.js 16 Font docs](https://nextjs.org/docs/app/api-reference/components/font) — `next/font/google` API (HIGH)
- [React 19.2 release notes](https://react.dev/blog) — `useActionState` GA (HIGH)
- [Tailwind v4 `@theme` docs](https://tailwindcss.com/docs/theme) — theme token API (HIGH)
- [Zod 3.25 docs](https://zod.dev/v3) — `.superRefine()` cross-field validation (HIGH)

---

*Stack research for: Senegalese cagnotte platform — Banani integration milestone*
*Researched: 2026-04-13*
*Philosophy: zero new runtime deps. Every gap maps to an existing package. The only "addition" is a Poppins font declaration inside the built-in `next/font/google` API. When in doubt, don't install — extend.*
