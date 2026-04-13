# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Fari.store** is a link-in-bio platform with integrated digital sales and mobile money payments for French-speaking West African creators (think: Linktree + Gumroad, for markets without Stripe). The entire UI is in French, prices are in FCFA (integer amounts, no decimals), and payments go through **Bictorys** (Wave, Orange Money, Free Money).

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
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

**Backend commands (from `/backend`):**
```bash
npm run db:push    # Apply Prisma schema changes to DB
npm run db:seed    # Seed test data (seller "Awa Fitness")
npm run db:studio  # Open Prisma GUI on port 5555
npm run build      # Compile TypeScript
npm start          # Run compiled server
```

No test framework is configured yet.

## Architecture

### Frontend (`/src`)
Next.js 16 App Router with server components by default. `"use client"` only where interactivity or hooks are required. Path alias: `@/*` → `src/*`.

Key paths:
- `src/app/store/[slug]/` — Public vendor page (SSR for SEO, must load < 2s on 3G)
- `src/app/dashboard/` — Protected seller dashboard
- `src/app/(auth)/` — Signup/login flows
- `src/components/ui/` — Custom UI primitives (no shadcn/ui)
- `src/components/dashboard/` — Dashboard-specific components
- `src/components/store/blocks/` — Block render components (`SaleBlock.tsx`, `BookingBlock.tsx`, etc.)
- `src/lib/api.ts` — `api<T>(path, options)` fetch wrapper with auto-refresh on 401, CSRF header injection, 30s timeout, and network retry
- `src/lib/useApi.ts` — `useApi<T>(path)` hook with in-memory stale-while-revalidate cache (2min TTL). Use `invalidateCache(path)` after mutations.
- `src/lib/utils.ts` — `cn()` (clsx + twMerge), `formatPrice()`
- `src/lib/constants.ts` — French UI labels for order types, payment statuses, operators
- `src/contexts/` — AuthContext (cookie-based), ToastContext
- `src/types/index.ts` — All shared TypeScript interfaces, theme definitions (`THEMES`, `FONTS`), utility functions (`getResolvedTheme`, `getButtonStyle`, `getBackgroundStyle`)

### Backend (`/backend/src`)
Express 5 on port 4000 with Prisma + PostgreSQL (Neon serverless). Prisma client is generated to `backend/src/generated/prisma` (custom output path).

Key paths:
- `routes/` — REST endpoints (auth, google-auth, sellers, blocks, orders, webhooks, webhooksTelegram, upload, files, analytics, customers, withdrawals, partnerships, leads, telegram, communities)
- `lib/payments/bictorys.ts` — Bictorys charge implementation (`BICTORYS_API_KEY`), 3 retries on 403 WAF
- `lib/payments/payout.ts` — Seller payouts via separate key (`BICTORYS_PRIVATE_KEY`)
- `lib/blocks/schemas.ts` — Zod schemas for all block config types + `validateBlockConfig(type, config)` dispatcher
- `lib/auth.ts` — JWT signing/verification (jose), CSRF validation (`verifyCsrf` middleware)
- `lib/queues/` — Custom in-memory job queues (email + community notifications) — no Redis
- `lib/cron/` — Background jobs (community billing, order expiration, code cleanup)
- `lib/email.ts` — Resend integration with RFC 2369 List-Unsubscribe headers
- `lib/telegram.ts` — TelegramService (invite links, ban/unban, messages, webhook setup)
- `lib/crypto.ts` — AES-256-GCM encryption for sensitive data (Telegram bot tokens)
- `lib/logger.ts` — Logger with production redaction (emails, phones, order refs)
- `middleware/auth.ts` — `requireAuth` middleware; reads `izy-token` cookie, re-queries seller plan from DB to prevent stale JWT bypass
- `prisma/schema.prisma` — Full schema with soft-delete (`deletedAt`) on Seller and Order

### Auth Flow
- Cookie-only: backend sets `izy-token` (httpOnly, secure, sameSite) + `izy-csrf` (readable by JS)
- Access token: **15min** JWT. Refresh token: **7-day** JWT (httpOnly, scoped to `/api/auth`). CSRF cookie: **7 days** (not httpOnly, readable by JS)
- Token payload: `sub` (seller ID), `slug`, `plan` ("FREE"|"PRO"), `onboardingCompleted`
- Frontend `api()` auto-attaches `x-csrf-token` header on POST/PUT/PATCH/DELETE
- On 401, `api()` auto-calls `/api/auth/refresh` then retries once (with lock to prevent concurrent refreshes)
- `requireAuth` re-queries seller from DB on every request to prevent stale JWT plan bypass
- No token in localStorage/sessionStorage

### The Block System
Vendor pages are composed of configurable **blocks**. Each block has a `type` enum (`LINK`, `SALE`, `BOOKING`, `PAYMENT`, `LEAD_MAGNET`, `WAITING_LIST`, `PARTNERSHIP`, `COMMUNITY`) and a `config` JSON field validated by Zod.

Adding a new block type requires:
1. New enum value in `prisma/schema.prisma` `BlockType`
2. Zod schema in `backend/src/lib/blocks/schemas.ts` + add to `blockTypeToSchema` map
3. React render component in `src/components/store/blocks/`
4. Import + case in `src/app/store/[slug]/page.tsx` block renderer

### File Storage
Files are stored in Cloudflare R2 (S3-compatible). The backend proxies file access through `/api/files/:key` — upload responses are rewritten to return proxy URLs (not direct R2 URLs). Files stored with random hex names.

### Backend Middleware Chain
Configured in `backend/src/index.ts`, order matters:
1. Helmet (security headers) → CORS (multi-origin via `ALLOWED_ORIGINS`) → Gzip compression
2. Raw JSON parser for `/api/webhooks` only (Bictorys needs raw body for signature verification)
3. JSON body parser + cookie parser
4. **Rate limiters**: Global 300 req/15min, Auth 20 req/15min (skips `/me`, `/logout`), Write 30 req/60s, Track 30 req/60s
5. CSRF verification on all mutations (POST/PUT/PATCH/DELETE) except webhook routes
6. R2 URL rewriting: replaces direct R2 URLs with `/api/files/:key` proxy URLs in responses

### Job Queue System
Custom in-memory queues in `lib/queues/` — **no Redis**, jobs lost on restart (acceptable for emails/notifications).
- **Email queue**: 8 concurrent workers, 3 retries with exponential backoff (2s→4s→8s), priority tiers (0=auth/critical, 1=transactional, 2=notifications)
- **Community queue**: 3 concurrent workers, 100ms rate limit between jobs (Telegram-safe), handles email + Telegram DMs
- Health check: `GET /api/queues/stats`

### Cron Jobs
Started on server boot in `index.ts`:
- **Order expiration**: Every 5min — PENDING → EXPIRED after 30min
- **Verification code cleanup**: Every 1h — deletes expired codes
- **Webhook log cleanup**: Every 6h — deletes logs > 90 days
- **Community billing**: Every 1h — 7-step job:
  1. Recheck pending payments (catches missed Bictorys webhooks)
  2. Cleanup stale PENDING subscriptions (>24h)
  3. Health-check Telegram bots (detect if bot was removed from group)
  4. Detect members who left Telegram without webhook
  5. Send renewal reminders (J-3 before expiration)
  6. Process expirations → enter 3-day grace period
  7. Grace period: daily reminders, then kick on J+3

### Telegram Integration
- Bot tokens encrypted with AES-256-GCM (`lib/crypto.ts`, key = `ENCRYPTION_KEY` env) before DB storage
- `TelegramService` in `lib/telegram.ts`: invite links (1-use, 24h expiry), ban/unban, messages, webhook setup
- Webhook handler (`routes/webhooksTelegram.ts`): processes `chat_member` updates, detects joins via invite link
- Rate limit: 100ms between Telegram API calls

## Critical Rules

### Never Use
- NextAuth.js → custom auth (bcrypt 12 rounds + JWT in httpOnly cookies)
- Redux/Zustand → React Context + useState
- shadcn/ui → custom components in `src/components/ui/`
- Framer Motion → CSS transitions only (3G performance)
- Axios → native `fetch`
- MongoDB/Firebase → PostgreSQL + Prisma
- Stripe → Bictorys
- Redis/BullMQ → custom in-memory queues in `lib/queues/`

### Styling
- **Tailwind CSS only.** No CSS modules, no styled-components, no `style={{}}` except for vendor theme CSS variables.
- Primary: `teal-600` (#0D9488). Accent: `amber-500` (#F59E0B).
- Onboarding buttons: `rounded-full`. Dashboard/store buttons: `rounded-xl`.
- Only font: Inter (loaded via `next/font/google`).
- Mobile-first at 375px. Touch targets ≥ 48px. Buttons: `py-3.5` minimum.

### Data & Validation
- All monetary amounts are **integers** (FCFA has no cents). Never use Float for money.
- Always use `cuid()` for IDs in Prisma.
- All API inputs validated with **Zod** — never trust client data.
- Block `config` JSON must be Zod-validated before saving.

### Payments
- Bictorys uses **two separate keys**: `BICTORYS_API_KEY` for charges (customer payments), `BICTORYS_PRIVATE_KEY` for payouts (seller withdrawals). Never mix them.
- Commission is **always calculated server-side**: products 5% free / 3% pro, communities 8% free / 4% pro.
- Bictorys retry: 3 retries on 403 WAF blocks with exponential backoff (2s, 4s, 8s).
- Always verify webhook signature (timing-safe comparison of `x-secret-key` header) before processing.
- Always log webhooks to `WebhookLog` table before acting on them.

### Naming Conventions
- Components: `PascalCase` (`SaleBlock.tsx`)
- Utilities: `camelCase` (`formatPrice.ts`)
- Prisma enums: `SCREAMING_SNAKE_CASE` (`PAID`, `BOOKING`)
- API routes: `kebab-case` (`/api/verify-email`)

### Reserved Slugs
These cannot be used as seller usernames: `login`, `signup`, `onboarding`, `dashboard`, `admin`, `api`, `store`, `download`, `settings`, `help`, `support`, `pricing`, `about`, `terms`, `privacy`, `blog`, `docs`, `status`

### Language
- All UI text is in **French**. No English in user-facing strings.
- Text goes in constants (`src/lib/constants.ts`), not hardcoded in JSX.
- Price formatting: `formatPrice(15000)` → `"15 000 FCFA"` (space as thousands separator).

## Environment Variables

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Backend** (`backend/.env`):
```
# Core
DATABASE_URL=postgresql://...         # Neon serverless
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
ALLOWED_ORIGINS=http://localhost:3000  # Comma-separated for multi-origin CORS

# Auth & Security
JWT_SECRET=...                        # 64+ char random string
ENCRYPTION_KEY=...                    # 64-char hex for AES-256-GCM (Telegram bot tokens)

# Payments — Charges
BICTORYS_API_URL=...
BICTORYS_API_KEY=...                  # Public key (charges)
BICTORYS_WEBHOOK_SECRET=...

# Payments — Payouts
BICTORYS_PRIVATE_KEY=...              # Secret key (payouts) — different from API_KEY
BICTORYS_MERCHANT_SECRET_CODE=...

# Email
RESEND_API_KEY=...
EMAIL_FROM=noreply@izy.store

# File Storage (Cloudflare R2)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=...                     # e.g. https://pub-xxx.r2.dev

# Telegram
TELEGRAM_WEBHOOK_SECRET=...
```

## Audits Convention

When asked for an audit or correction:
- Save results to `audits/audit-NNN-titre-court.md` (NNN = sequential number, check existing files first).
- Create the `audits/` directory if it doesn't exist.

## Reference Documents

The `instructions/` directory contains detailed specs (in French):
- `1_PRD.md` — Product requirements, features, personas
- `2_TECH_STACK.md` — All packages with versions and rationale
- `3_DESIGN_SYSTEM.md` — Colors, spacing, component specs, animations
- `4_DATABASE_SCHEMA.md` — Full schema with relationships and example queries
- `5_IMPLEMENTATION_PLAN.md` — Phased build order with verification steps per phase
- `6_FULL_AUDIT.md` — Full codebase audit
- `7_DASHBOARD_REFONTE.md` — Dashboard redesign spec

The `docs/` directory contains:
- `BICTORYS_INTEGRATION.md` — Detailed Bictorys payment integration guide
