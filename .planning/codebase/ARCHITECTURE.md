# Architecture

**Analysis Date:** 2026-04-13

## Pattern Overview

**Overall:** Two-tier monolith — Next.js 16 frontend (App Router) communicates with Express 5 REST API backend. Separation at HTTP layer with shared authentication (JWT + CSRF). Frontend awaiting Banani design integration; backend handles all business logic, payments, and persistence.

**Key Characteristics:**
- Cookie-based auth with JWT tokens (access 15min, refresh 7-day)
- CSRF protection via double-submit cookies (httpOnly + readable token)
- Async job queue (Upstash Redis) for email delivery and background cleanup
- Rate limiting per endpoint (Redis-backed) — global 300 req/15min, write 30 req/60s
- Database: PostgreSQL via Prisma with custom client output path
- File storage: Cloudflare R2 (S3-compatible) proxied through backend `/api/files`
- Payment provider: Bictorys (Wave, Orange Money, Free Money, card) with webhook verification

## Layers

**Frontend (Next.js 16):**
- Purpose: User-facing UI for cagnotte creation, donor payment, and creator dashboard (skeleton awaiting Banani design)
- Location: `/src`
- Contains: React components (mostly deleted), contexts (auth/toast), utility functions, middleware for slug rewriting
- Depends on: Backend API via `api()` fetch wrapper, Tailwind CSS for styling
- Used by: Web browsers (3G-optimized mobile-first at 375px)

**Backend (Express 5):**
- Purpose: Core API — seller auth, block/fundraiser CRUD, order processing, Bictorys payment integration, file uploads, webhooks, withdrawals
- Location: `/backend/src`
- Contains: Route handlers, middleware, Prisma models, payment logic, job queues
- Depends on: PostgreSQL (Neon), Upstash Redis, Resend email, Cloudflare R2, Bictorys API
- Used by: Frontend via HTTP, Bictorys webhooks (incoming), email deliveries (async)

**Data Layer:**
- Location: `/backend/prisma/schema.prisma`
- ORM: Prisma (generated client: `/backend/src/generated/prisma`)
- Primary entities: Seller, Block (FUNDRAISER type), Order, Withdrawal, FileUpload, VerificationCode, WebhookLog

## Data Flow

**Fundraiser Creation Flow:**

1. Frontend: Seller signs in via `/api/auth/login` → Backend validates credentials, sets `izy-token` (httpOnly) + `izy-csrf` (readable)
2. Frontend: Call `/api/blocks` (POST) with `type: FUNDRAISER`, `config: { title, goalAmount, endDate, showDonorCount, ... }` — CSRF token in header
3. Backend: `requireAuth` middleware re-queries seller from DB (bypasses stale JWT), validates config with Zod against `fundraiserBlockConfigSchema`
4. Database: Block row created with `type = FUNDRAISER`, config stored as JSON
5. Frontend: Display cagnotte at `/slug` (next phase — awaiting Banani design)

**Payment Flow (Donor):**

1. Frontend: Donor visits `/slug` → reads block via `GET /api/blocks/:id` (public, no auth)
2. Frontend: Donor clicks "Donate" → calls `POST /api/orders` with `{ blockId, amount, donorEmail, paymentType: "wave_money"|"orange_money"|... }`
3. Backend: Validates amount (integer FCFA), creates Order row with `paymentStatus: PENDING`, calls Bictorys API
4. Bictorys: Returns `redirectUrl` or QR code → Backend returns to frontend
5. Frontend: Redirects donor to Bictorys (or shows QR for in-app browser)
6. Donor: Completes payment on mobile money → Bictorys redirects to `/:slug/success`
7. Bictorys: Async webhook POST to `/api/webhooks` with signed `x-secret-key` header
8. Backend: Verifies signature, logs to `WebhookLog`, updates Order to `paymentStatus: PAID` if valid
9. Background job: Email queue processes send confirmation to donor + seller

**Withdrawal (Seller Payout):**

1. Frontend: Seller calls `POST /api/withdrawals` with amount (must have `withdrawalPinHash` + KYC approved)
2. Backend: Validates PIN, checks available balance (sum of PAID orders minus previous withdrawals), rate-limits
3. Backend: Calls Bictorys payout API with `BICTORYS_PRIVATE_KEY` (distinct from charge key)
4. Bictorys: Processes via selected `payoutProvider` (Wave/Orange Money)
5. Database: Withdrawal row marked `status: PENDING`, later webhook updates to `COMPLETED`

**File Upload & Proxy:**

1. Frontend: Call `POST /api/upload` with file → middleware rewrites response URL
2. Backend: Uploads to R2, returns `{ url: "https://r2-public-url.../key" }`
3. Middleware: Intercepts response, rewrites to `{ url: "http://localhost:4000/api/files/key" }`
4. Public access: `/api/files/:key` proxies through R2 (no auth required, cached)

**State Management:**
- Backend: Prisma ORM + DB as source-of-truth
- Frontend: React Context (AuthContext) for user + token state; useState for UI; custom `useApi()` hook with in-memory SWR cache (2min TTL)
- Rate limiting state: Redis (Upstash)
- Background jobs: Redis (Upstash) persistent queue — survives server restart

## Key Abstractions

**Block (Modularity):**
- Purpose: Represents a fundraiser or content unit on seller's store
- Examples: `backend/src/routes/blocks.ts`, `backend/prisma/schema.prisma` (Block model)
- Pattern: Single row with `type` enum + `config` JSON field. Config validated by Zod schemas in `backend/src/lib/blocks/schemas.ts`. Only `FUNDRAISER` type is reachable in current frontend.

**Order (Transaction Record):**
- Purpose: Represents a donation or purchase with payment status tracking
- Examples: `backend/src/routes/orders.ts`, Prisma Order model
- Pattern: Created in PENDING state when Bictorys charge initiated; transitioned to PAID/EXPIRED via webhook or background job. Links donor → block → seller.

**Seller (Auth Principal):**
- Purpose: Account holder — owns blocks, withdrawals, receives orders
- Examples: Prisma Seller model, `backend/src/routes/sellers.ts`
- Pattern: JWT payload embeds `sub` (seller ID), `slug`, `plan`. Token verified on every auth-required endpoint; stale JWT bypass prevented by re-querying `plan` + `deletedAt` from DB.

**JobQueue (Async Processing):**
- Purpose: Persistent background job executor (survives restart)
- Examples: `backend/src/lib/queues/JobQueue.ts`, `backend/src/lib/queues/emailQueue.ts`
- Pattern: Redis-backed. Jobs have `type`, `payload`, `maxRetries`. `emailQueue` wraps for email-specific retries. Jobs processed on worker poll.

**api() Fetch Wrapper (Frontend):**
- Purpose: Unified HTTP client with auto-refresh, CSRF injection, timeout, retry logic
- Examples: `src/lib/api.ts`
- Pattern: On 401 → calls `/api/auth/refresh` with lock (prevents concurrent refresh) → retries original request once. CSRF token stored in localStorage + cookie. Network errors retry once after 1s delay.

## Entry Points

**Backend:**
- Location: `backend/src/index.ts`
- Triggers: `npm run dev` → nodemon reloads on file changes; `npm start` → runs compiled `dist/`
- Responsibilities: Express app setup, middleware chain (helmet, CORS, rate limiting, CSRF), route registration, background job scheduling (setInterval)

**Frontend:**
- Location: `src/app/layout.tsx` (root) → `src/app/page.tsx` (homepage)
- Triggers: `npm run dev` → Next.js dev server on :3000; `npm run build` → Turbopack production build
- Responsibilities: Metadata, ToastProvider setup, Inter font, auth context initialization (awaiting Banani design to wire up remaining pages)

**API Routes:**
- `POST /api/auth/login` — Email + password → JWT + CSRF token
- `POST /api/auth/refresh` — Refresh access token (only endpoint with `:` constraint — see `backend/src/index.ts` line 91)
- `GET /api/blocks/:id` — Public read (no auth)
- `POST /api/blocks` — Create fundraiser (requires auth + CSRF)
- `POST /api/orders` — Donate (public, no auth — rate limited globally)
- `POST /api/webhooks` — Bictorys webhook (signature verified, raw body required)
- `POST /api/upload` — File upload to R2 (auth + CSRF)
- `POST /api/withdrawals` — Initiate payout (auth + CSRF + PIN)
- `GET /api/payment-methods` — Public payment config (Wave, Orange Money, etc.)

## Error Handling

**Strategy:** Type-safe Zod validation on all inputs; backend returns JSON errors with 4xx/5xx status codes. Frontend `api()` wrapper distinguishes network errors from API errors, provides French error messages.

**Patterns:**
- **Zod validation failure:** 400 + formatted error array (see `backend/src/lib/zodErrors.ts` — groups errors by field)
- **Auth failures:** 401 on missing/invalid token or stale JWT
- **Rate limit exceeded:** 429 (Upstash rate limiter)
- **Payment API failure:** 500 with Bictorys error details logged; order remains PENDING for retry
- **Network timeout (frontend):** Timeout error after 30s; user sees "La requête a pris trop de temps"
- **Offline (frontend):** Detects via `navigator.onLine`; shows "Pas de connexion internet"

## Cross-Cutting Concerns

**Logging:** 
- Backend: `backend/src/lib/logger.ts` — console output with redaction in production (emails, phones, order refs hidden from logs)
- Frontend: console-only, no persistence

**Validation:** 
- All POST/PUT/PATCH/DELETE inputs validated with Zod before business logic
- Block `config` JSON must match schema in `backend/src/lib/blocks/schemas.ts`
- Monetary amounts: always integers (FCFA), never floats

**Authentication:** 
- Tokens: JWT (jose library), signed with `JWT_SECRET`
- Access: 15min, stored in httpOnly cookie
- Refresh: 7-day, httpOnly cookie, scoped to `/api/auth` only
- CSRF: Double-submit — readable `izy-csrf` cookie + `x-csrf-token` header on mutations
- Re-validation: `requireAuth` re-queries seller from DB every request to catch stale JWT, deleted accounts, plan downgrades

**In-App Browser Payment Workaround:**
- Detect TikTok/Instagram/Facebook WebView via user-agent string
- TikTok: Treated as normal browser (direct redirect)
- Instagram/Facebook: Payment URL base64-encoded + proxied through `src/app/api/pay-redirect/route.ts` → returns 302 to real Bictorys URL (bypasses WebView query param scanner)
- See `audits/audit-008-inapp-browser-payment.md` and `audits/audit-009-tiktok-payment-flow.md` for context

---

*Architecture analysis: 2026-04-13*
