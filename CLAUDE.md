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
- **Auth**: [routes/auth.ts](backend/src/routes/auth.ts) — signup, login, logout, refresh, me, email verification, forgot/reset password. **Watch-out:** `change-password` is **PUT** (not POST) — frontend must use PUT.
- **Sellers**: [routes/sellers.ts](backend/src/routes/sellers.ts) — profile CRUD + `POST /api/sellers/kyc` (document submission) + withdrawal-pin endpoints (`status`, `set`, `forgot`, `reset`)
- **Blocks**: [routes/blocks.ts](backend/src/routes/blocks.ts) — CRUD for fundraiser blocks + `GET /:id/progress` (total collected, donor count). FUNDRAISER POST uses `ensureUniqueSlug()` to generate `Block.slug`.
- **Cagnottes (public)**: [routes/cagnottes.ts](backend/src/routes/cagnottes.ts) — `GET /api/cagnottes`, `GET /api/cagnottes/:slug`, `GET /api/cagnottes/:slug/participants`. Mounted before CSRF group (no CSRF, public). SQL-level visibility filter on the list endpoint (`config.path=["visibility"], equals: "public"`); `Cache-Control: private, no-store` branch on private detail + participants. Centralized `maskDonation()` helper redacts anonymous donors and private messages.
- **Notifications (authed)**: [routes/notifications.ts](backend/src/routes/notifications.ts) — `GET /`, `GET /count`, `POST /mark-read`, `GET/PATCH /prefs`. Behind `requireAuth + writeLimiter + verifyCsrf`. Every query filters by `req.seller!.sub` (cross-seller leak guard, T-02-14). Unread state is `Notification.readAt: null`.
- **Orders**: [routes/orders.ts](backend/src/routes/orders.ts) — create donation → Bictorys charge. **Three composed rate limiters** (`order-ip-min` 20/min, `order-ip-hour` 100/hour, `order-email-min` 5/min). FUNDRAISER commission via `computeCommission()`. Hand-rolled in-memory **Bictorys circuit breaker** (5 failures / 30s → 60s cooldown) short-circuits to 503. PENDING TTL is **10 min** (cron sweep every 5 min).
- **Webhooks**: [routes/webhooks.ts](backend/src/routes/webhooks.ts) — Bictorys payment confirmation handler. PAID branch uses `WebhookLog.upsert` inside a Serializable `$transaction` with **post-commit notification dispatch** (Neon 2s ceiling). Triple-protected against double-delivery: `WebhookLog @@unique([externalId, eventType])` + Serializable isolation + `Notification.dedupeKey @unique`.
- **Upload**: [routes/upload.ts](backend/src/routes/upload.ts) — R2 uploads (cover image, KYC docs)
- **Files**: [routes/files.ts](backend/src/routes/files.ts) — R2 proxy (`/api/files/:key`)
- **Withdrawals**: [routes/withdrawals.ts](backend/src/routes/withdrawals.ts) — Seller payout flow. Enforces `kycStatus === "APPROVED"` (403 otherwise) and verifies `withdrawalPinHash` if set (`code: "PIN_REQUIRED"` when missing). Fires `firePayoutCompleted` / `firePayoutFailed` post-commit on state transitions.

Kept libs:
- [lib/payments/bictorys.ts](backend/src/lib/payments/bictorys.ts) — Bictorys charge implementation (`BICTORYS_API_KEY`), 3 retries on 403 WAF
- [lib/payments/circuitBreaker.ts](backend/src/lib/payments/circuitBreaker.ts) — In-memory Bictorys circuit breaker (5 failures / 30s rolling window → open 60s). **Single-instance only** — multi-instance scaling requires a Redis-backed swap (T-02-09 accepted v1 risk).
- [lib/commission.ts](backend/src/lib/commission.ts) — `computeCommission(gross, subtype)` — **6% solidaire / 8% festive**, `Math.floor` (favors seller), invariant `commission + net === gross` enforced inside the helper.
- [lib/cagnottes/slug.ts](backend/src/lib/cagnottes/slug.ts) — `slugify()` + `ensureUniqueSlug(base, createFn)` closure-based unique-slug generation with reserved-words guard and numeric suffix fallback. Backed by `Block.slug @unique`.
- [lib/notifications/](backend/src/lib/notifications) — Single entry point for every Notification row (`createNotification`). 9 typed wrappers in [dispatch.ts](backend/src/lib/notifications/dispatch.ts) (`fireDonationReceived`, `fireMilestone`, `fireEndingSoon`, `fireCagnotteEnded`, `fireDonationMessage`, `firePayoutCompleted`, `firePayoutFailed`, `fireKycApproved`, `fireKycRejected`). 9 French templates in [templates.ts](backend/src/lib/notifications/templates.ts) (PROVISIONAL — confirm against Banani screen 20 in Phase 5). Pure `detectCrossed()` for milestones. `runEndingSoonSweep()` cron with `Block.endingSoonNotifiedAt` dedup. Every dispatcher composes a deterministic `dedupeKey` and the `Notification.dedupeKey @unique` constraint enforces at-most-once delivery via duck-typed P2002 catch.
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
- **`change-password` is PUT not POST.** The endpoint is `PUT /api/auth/change-password` — frontend integrations must use the PUT verb.

### KYC Approval Workflow
KYC approval is **manual** in v1 (no admin panel yet). The fork has no `/admin` route (T-02-19 accepted risk). To approve or reject:

```bash
cd backend && npx tsx scripts/approve-kyc.ts <seller-slug> [APPROVED|REJECTED] [reason]
```

The script flips `Seller.kycStatus` (default APPROVED) and fires `KYC_APPROVED` / `KYC_REJECTED` via `createNotification`. The actor (`process.env.USER`) is logged with a timestamp for audit trail. v2 will replace this with an admin panel.

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
- Primary: **navy `#172866`** (Tailwind: `navy-600`). Accent: **pink `#FBE6ED`** (Tailwind: `pink-100`). Navy hover: `#121F4E`. Footer: `#0E1A40`.
- Fonts: **Poppins** (headings) + **Inter** (body), both loaded via `next/font/google`.
- Mobile-first at 375px. Touch targets ≥ 48px. Buttons: `py-3.5` minimum.

### Data & Validation
- All monetary amounts are **integers** (FCFA has no cents). Never use Float for money.
- Always use `cuid()` for IDs in Prisma.
- All API inputs validated with **Zod** — never trust client data.
- Block `config` JSON must be Zod-validated before saving.
- Fundraiser slugs are unique per cagnotte via `Block.slug @unique`, generated by `lib/cagnottes/slug.ts` with reserved-words guard and numeric suffix fallback. Never random hex. PATCH (slug rename) is intentionally NOT implemented in v1 — slug change is v2.
- `Order.isAnonymous` and `Order.messageIsPrivate` are donor-controlled flags. The public participants endpoint masks accordingly (anonymous → "Anonyme"; private message → `null`). The creator-side feed (`/api/notifications`) preserves the real donor name in `Notification.data.donorDisplayName` plus a `wasAnonymous: true` flag for thanking purposes.
- `Notification` model has `dedupeKey String @unique` enforcing **at-most-once** delivery (P01 + P06 mitigation). `lib/notifications/index.ts::createNotification` is the **single entry point** — no inline `prisma.notification.create` anywhere in routes/.
- `Block.endingSoonNotifiedAt DateTime?` is the cron dedup field for the J-3 ending-soon sweep (set on both create-success and dedupe-hit paths so a block is permanently retired from the candidate set).
- `WebhookLog @@unique([externalId, eventType])` is the atomic webhook idempotency gate. The PAID branch upserts on this composite key inside a Serializable `$transaction`.

### Payments
- Bictorys uses **two separate keys**: `BICTORYS_API_KEY` for charges (customer payments), `BICTORYS_PRIVATE_KEY` for payouts (seller withdrawals). Never mix them.
- Commission is **6% solidaire / 8% festive**, computed server-side via `computeCommission(gross, subtype)` in [lib/commission.ts](backend/src/lib/commission.ts). Uses `Math.floor` (favors seller). The invariant `commission + net === gross` is enforced inside the helper. Client-supplied commission fields are ignored.
- Bictorys retry: 3 retries on 403 WAF blocks with exponential backoff (2s, 4s, 8s).
- A hand-rolled in-memory **circuit breaker** ([lib/payments/circuitBreaker.ts](backend/src/lib/payments/circuitBreaker.ts)) trips after 5 failures within a 30s rolling window and short-circuits new orders to 503 for 60s.
- Always verify webhook signature (timing-safe comparison of `x-secret-key` header, or HMAC-SHA256 via `x-webhook-signature` + `x-webhook-timestamp` with 5-minute replay window) before processing.
- Always log webhooks to `WebhookLog` table before acting on them. The PAID branch in `routes/webhooks.ts` runs inside a Serializable `$transaction` that contains zero email/network work — all notification dispatch happens **post-commit** (Neon 2s tx ceiling).

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

## Regression Harness

[backend/scripts/smoke-test.ts](backend/scripts/smoke-test.ts) is the **Phase 2+ exit-gate harness** — 15 assertions covering every Phase 2 surface plus P01 / P03 / P05 invariants. Run order:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd backend && npx tsx scripts/seed-dev.ts        # idempotent fixtures
cd backend && npx tsx scripts/smoke-test.ts      # must print 15/15 + GREEN ✓
```

The smoke-test resets the order rate-limit Redis counters at startup so re-runs are not poisoned by tests 09/10 (the intentional flood tests). Dev-only — never run against production.
