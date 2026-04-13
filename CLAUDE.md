# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Cagnottes.sn** is a dedicated online-fundraiser (cagnotte) platform for the Senegalese market: a creator signs up, publishes one or more cagnottes with a shareable link (`cagnottes.sn/<slug>`), and contributors participate via **Bictorys** (Wave, Orange Money, Free Money, card). All UI is in French; prices are in FCFA (integer amounts, no decimals).

This codebase is a **fork of Fari.store** (a multi-feature link-in-bio). Only the infrastructure needed for the fundraiser use-case was kept: auth, Bictorys payments, webhooks, file storage, email queue, withdrawal/payout. The rest of the fari.store surface (commerce, booking, community, partnership, etc.) was cleaned out in a series of `phase N` commits on `main` — see `git log --oneline` for the trail.

### Fork cleanup status (important)

- **Routes deleted**: `admin/`, `communities`, `partnerships`, `leads`, `customers`, `integrations`, `google-auth`, `telegram`, `webhooksTelegram`, `analytics`, `notifications`, `inbox`, `reports`, `linkPreview`, `dev`.
- **Libs deleted**: `email-marketing`, `google-calendar`, `telegram`, `push-notifications`, `cron/communityBilling`, `queues/communityQueue`.
- **Webhook handler**: dynamic imports of deleted libs were stubbed out inline (look for `NOTE: cagnottes.sn fork — … removed` in [backend/src/routes/webhooks.ts](backend/src/routes/webhooks.ts)). The handler still dispatches on `orderType` for legacy types; only `DONATION`/`FUNDRAISER` paths run in practice because no other block types can be created via the frontend.
- **Frontend**: stripped to a placeholder homepage + [src/app/api/pay-redirect/route.ts](src/app/api/pay-redirect/route.ts). The real UI will be plugged in from a Banani design.
- **Prisma schema**: **intentionally left intact**. Removing unused models (Product, BookingService, Community, TelegramBot, PushSubscription, Admin, etc.) would require a 5-8h surgical refactor of ~175 field references in the kept route files. The dead models stay in DB for now; prune in a future pass once the Banani frontend is wired up. **Don't try to clean the schema as a side task — it's a rabbit hole.**

## Running the Project

Two separate servers must run simultaneously:

```bash
# Terminal 1 — Frontend (http://localhost:3000)
npm run dev

# Terminal 2 — Backend (http://localhost:4000)
cd backend && npm run dev
```

**Frontend commands:**
```bash
npm run build    # Production build (Next.js 16 + Turbopack)
npm run start    # Start production server
npm run lint     # ESLint check
```

**Backend commands (from `/backend`):**
```bash
npm run db:push    # Apply Prisma schema changes to DB (Neon)
npm run db:studio  # Open Prisma GUI on port 5555
npm run build      # tsc compile to dist/
npm start          # Run compiled server
```

No test framework is configured yet.

## Architecture

### Frontend (`/src`)
Next.js 16 App Router with server components by default. `"use client"` only where interactivity or hooks are required. Path alias: `@/*` → `src/*`. **The frontend is a skeleton awaiting Banani design integration** — most pages and components from the fari.store fork were deleted.

Kept surface:
- [src/app/layout.tsx](src/app/layout.tsx) — Root layout with `ToastProvider`, Inter font, French locale
- [src/app/page.tsx](src/app/page.tsx) — Placeholder homepage
- [src/app/error.tsx](src/app/error.tsx), [src/app/not-found.tsx](src/app/not-found.tsx)
- [src/app/api/pay-redirect/route.ts](src/app/api/pay-redirect/route.ts) — **Critical**: TikTok in-app browser workaround (see "Known Quirks")
- [src/app/robots.ts](src/app/robots.ts)
- [src/middleware.ts](src/middleware.ts) — Simplified: only slug lowercase normalization (the fari.store `/slug → /store/slug` rewrite was removed; Banani will define routing)
- [src/lib/api.ts](src/lib/api.ts) — `api<T>(path, options)` fetch wrapper with auto-refresh on 401, CSRF header injection, 30s timeout, network retry. **Do not modify without reason** — battle-tested.
- [src/lib/useApi.ts](src/lib/useApi.ts) — `useApi<T>(path)` hook with in-memory stale-while-revalidate cache (2min TTL). Use `invalidateCache(path)` after mutations.
- [src/lib/utils.ts](src/lib/utils.ts) — `cn()` (clsx + twMerge), `formatPrice()`, `isInAppBrowser()`, `isTikTokBrowser()`
- [src/lib/constants.ts](src/lib/constants.ts) — French labels, operators
- [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) — Cookie-based auth provider
- [src/contexts/ToastContext.tsx](src/contexts/ToastContext.tsx)
- [src/types/index.ts](src/types/index.ts) — Shared interfaces (still references fari.store theme types; trim as Banani lands)

### Backend (`/backend/src`)
Express 5 on port 4000 with Prisma + PostgreSQL (Neon serverless). Prisma client is generated to `backend/src/generated/prisma` (custom output path).

Kept routes:
- **Auth**: [routes/auth.ts](backend/src/routes/auth.ts) — signup, login, logout, refresh, me, email verification, password reset
- **Sellers**: [routes/sellers.ts](backend/src/routes/sellers.ts) — profile CRUD (still references fari.store Seller fields — noise that compiles fine)
- **Blocks**: [routes/blocks.ts](backend/src/routes/blocks.ts) — CRUD for fundraiser blocks + `GET /:id/progress` (total collected, donor count)
- **Orders**: [routes/orders.ts](backend/src/routes/orders.ts) — create donation → Bictorys charge
- **Webhooks**: [routes/webhooks.ts](backend/src/routes/webhooks.ts) — Bictorys payment confirmation handler (monolithic legacy; only FUNDRAISER/DONATION branch is live)
- **Upload**: [routes/upload.ts](backend/src/routes/upload.ts) — R2 uploads (cover image, KYC docs)
- **Files**: [routes/files.ts](backend/src/routes/files.ts) — R2 proxy (`/api/files/:key`)
- **Withdrawals**: [routes/withdrawals.ts](backend/src/routes/withdrawals.ts) — Seller payout flow

Kept libs:
- [lib/payments/bictorys.ts](backend/src/lib/payments/bictorys.ts) — Bictorys charge implementation (`BICTORYS_API_KEY`), 3 retries on 403 WAF
- [lib/payout.ts](backend/src/lib/payout.ts) — Seller payouts via separate key (`BICTORYS_PRIVATE_KEY`)
- [lib/blocks/schemas.ts](backend/src/lib/blocks/schemas.ts) — Zod schemas for all block config types (only `FUNDRAISER` is reachable in practice)
- [lib/auth.ts](backend/src/lib/auth.ts) — JWT signing/verification (jose), CSRF validation (`verifyCsrf` middleware)
- [lib/queues/emailQueue.ts](backend/src/lib/queues/emailQueue.ts) + [lib/queues/JobQueue.ts](backend/src/lib/queues/JobQueue.ts) — **Upstash Redis-backed** persistent job queue. The original CLAUDE.md claimed "no Redis" — that was wrong; queues have been Redis-persistent. Jobs survive restart.
- [lib/redis.ts](backend/src/lib/redis.ts) + [lib/rateLimitStore.ts](backend/src/lib/rateLimitStore.ts) — `RedisRateLimitStore` used by `express-rate-limit`. **Redis is used both for queues and rate limiting.**
- [lib/email.ts](backend/src/lib/email.ts) — Resend integration with RFC 2369 List-Unsubscribe headers
- [lib/crypto.ts](backend/src/lib/crypto.ts) — AES-256-GCM (historical: Telegram bot tokens — no longer called)
- [lib/storage.ts](backend/src/lib/storage.ts) — R2 S3 client wrapper
- [lib/logger.ts](backend/src/lib/logger.ts) — Logger with production redaction (emails, phones, order refs)
- [middleware/auth.ts](backend/src/middleware/auth.ts) — `requireAuth` middleware; reads `izy-token` cookie, re-queries seller from DB to prevent stale JWT bypass

### Auth Flow
- Cookie-only: backend sets `izy-token` (httpOnly, secure, sameSite) + `izy-csrf` (readable by JS)
- Access token: **15min** JWT. Refresh token: **7-day** JWT (httpOnly, scoped to `/api/auth`). CSRF cookie: **7 days**
- Token payload: `sub` (seller ID), `slug`, `plan` ("FREE"|"PRO"), `onboardingCompleted`
- Frontend `api()` auto-attaches `x-csrf-token` header on POST/PUT/PATCH/DELETE
- On 401, `api()` auto-calls `/api/auth/refresh` then retries once (with lock to prevent concurrent refreshes)
- `requireAuth` re-queries seller from DB on every request to prevent stale JWT plan bypass
- No token in localStorage/sessionStorage

### The Fundraiser Block
Cagnottes are stored as Prisma `Block` rows with `type = FUNDRAISER` and a `config` JSON field validated by Zod. Each authenticated seller (= cagnotte creator) can own multiple blocks. Config schema (see [backend/src/lib/blocks/schemas.ts](backend/src/lib/blocks/schemas.ts) `fundraiserBlockConfigSchema`): title, goalAmount (FCFA), endDate, showDonorCount, suggestedAmounts, checkoutFields, thank-you message.

Progress is computed on-demand via `GET /api/blocks/:id/progress` — sums `Order.amount` where `paymentStatus = PAID` + counts distinct donors.

### File Storage
Files stored in Cloudflare R2 (S3-compatible). Backend proxies file access through `/api/files/:key` — upload responses rewrite direct R2 URLs as proxy URLs.

### Backend Middleware Chain
Configured in [backend/src/index.ts](backend/src/index.ts), order matters:
1. Helmet (security headers) → CORS (multi-origin via `ALLOWED_ORIGINS`) → Gzip compression
2. Raw JSON parser for `/api/webhooks` only (Bictorys needs raw body for signature verification)
3. JSON body parser + cookie parser
4. **Rate limiters** (Upstash Redis-backed): Global 300 req/15min (skips `/withdrawals`, `/orders`, `/auth`), Write 30 req/60s
5. CSRF verification on mutations except webhook routes

### Background Jobs
Started on server boot in `index.ts` via `setInterval` (⚠️ lost on restart, no catch-up, no multi-instance guarantee):
- **Order expiration**: Every 5min — PENDING → EXPIRED after 30min
- **Verification code cleanup**: Every 1h
- **Webhook log cleanup**: Every 6h — deletes logs > 90 days

## Critical Rules

### Never Use
- NextAuth.js → custom auth (bcrypt 12 rounds + JWT in httpOnly cookies)
- Redux/Zustand → React Context + useState
- Framer Motion → CSS transitions only (3G performance target)
- Axios → native `fetch`
- MongoDB/Firebase → PostgreSQL + Prisma
- **Stripe for payments → Bictorys** (Wave / Orange Money / Free Money)

### Styling
- **Tailwind CSS v4 only.** No CSS modules, no styled-components, no `style={{}}` except for vendor theme CSS variables.
- Primary: `teal-600` (#0D9488). Accent: `amber-500` (#F59E0B).
- Only font: Inter (loaded via `next/font/google`).
- Mobile-first at 375px. Touch targets ≥ 48px. Buttons: `py-3.5` minimum.

### Data & Validation
- All monetary amounts are **integers** (FCFA has no cents). Never use Float for money.
- Always use `cuid()` for IDs in Prisma.
- All API inputs validated with **Zod** — never trust client data.
- Block `config` JSON must be Zod-validated before saving.

### Payments
- Bictorys uses **two separate keys**: `BICTORYS_API_KEY` for charges (customer payments), `BICTORYS_PRIVATE_KEY` for payouts (seller withdrawals). Never mix them.
- Commission is calculated server-side (tariff TBD for cagnottes.sn).
- Bictorys retry: 3 retries on 403 WAF blocks with exponential backoff (2s, 4s, 8s).
- Always verify webhook signature (timing-safe comparison of `x-secret-key` header) before processing.
- Always log webhooks to `WebhookLog` table before acting on them.

### Naming Conventions
- Components: `PascalCase` (`FundraiserBlock.tsx`)
- Utilities: `camelCase` (`formatPrice.ts`)
- Prisma enums: `SCREAMING_SNAKE_CASE`
- API routes: `kebab-case` (`/api/verify-email`)

### Language
- All UI text is in **French**. No English in user-facing strings.
- Text goes in constants ([src/lib/constants.ts](src/lib/constants.ts)), not hardcoded in JSX.
- Price formatting: `formatPrice(15000)` → `"15 000 FCFA"` (space as thousands separator).

## Known Quirks

### In-app browser payment (TikTok, Instagram, Facebook) ⚠️
Mobile money redirects are blocked inside social media WebViews. See [audits/audit-008-inapp-browser-payment.md](audits/audit-008-inapp-browser-payment.md) and [audits/audit-009-tiktok-payment-flow.md](audits/audit-009-tiktok-payment-flow.md) before touching the payment redirect flow.

Current workaround:
- Detect in-app browser via `navigator.userAgent` — TikTok is **excluded** and treated like a normal browser (direct redirect)
- Primary CTA uses `navigator.share()` when available (forces OS-level browser choice)
- Payment URLs are **base64-encoded** and proxied through [src/app/api/pay-redirect/route.ts](src/app/api/pay-redirect/route.ts) to bypass TikTok's WebView query param scanner, which returns a same-domain 302 to the real Wave/Bictorys URL
- On direct user click, use `window.location.href` (same-window navigation) rather than `window.open`

Several other approaches were tried and reverted — read both audits first.

## Environment Variables

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Backend** (`backend/.env`): see [backend/.env.example](backend/.env.example)

Required: `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `BICTORYS_API_KEY`, `BICTORYS_API_URL`, `BICTORYS_WEBHOOK_SECRET`, `BICTORYS_PRIVATE_KEY`, `BICTORYS_MERCHANT_SECRET_CODE`, `RESEND_API_KEY`, `EMAIL_FROM`, R2 keys (`R2_*`), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## Audits Convention

When asked for an audit or correction, save results to `audits/audit-NNN-titre-court.md` (NNN = sequential number, check existing files first). Keep audit-001/002 (fundraiser) and audit-008/009 (TikTok payment) as historical context.
