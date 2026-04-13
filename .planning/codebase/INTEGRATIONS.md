# External Integrations

**Analysis Date:** 2026-04-13

## Payment Processing

**Bictorys (Wave, Orange Money, Free Money):**
- What: Mobile money payment gateway for Senegal + West Africa
- SDK/Client: Custom integration in `backend/src/lib/payments/bictorys.ts`
- Auth: Two separate API keys
  - `BICTORYS_API_KEY` - For customer charges
  - `BICTORYS_PRIVATE_KEY` - For seller payouts
  - `BICTORYS_MERCHANT_SECRET_CODE` - Merchant identifier
- Webhook: `BICTORYS_WEBHOOK_SECRET` - Signature verification (timing-safe comparison)
- Endpoint: `BICTORYS_API_URL` - API base URL
- Retry: 3 attempts on 403 WAF blocks with exponential backoff (2s, 4s, 8s)
- Webhook handler: `backend/src/routes/webhooks.ts` (monolithic legacy; only FUNDRAISER/DONATION paths active)
- Rate limiting: Exempt from global 300 req/15min limit

**Payment redirect:**
- Bictorys returns success/error URLs — must detect in-app browser (TikTok, Instagram, Facebook) and proxy through `src/app/api/pay-redirect/route.ts`
- See `audits/audit-008-inapp-browser-payment.md` and `audits/audit-009-tiktok-payment-flow.md` for detailed workaround (base64-encoded URLs, `navigator.share()` on mobile, same-window redirects)
- Direct R2 URLs rewritten as proxy URLs via `backend/src/routes/files.ts`

## Seller Payouts

**Bictorys Payouts:**
- Implementation: `backend/src/lib/payout.ts`
- Flow: Withdrawal request → seller KYC approval → Bictorys payout
- Commission: Calculated server-side (tariff TBD for cagnottes.sn)
- Route: `backend/src/routes/withdrawals.ts`
- Rate limiting: Exempt from global limit

## Email

**Resend:**
- Service: Transactional email via Resend API
- Client: `resend` package (v4.5.2)
- Auth: `RESEND_API_KEY`
- From address: `EMAIL_FROM` env var (default `noreply@cagnottes.sn`)
- Implementation: `backend/src/lib/email.ts`
- Features:
  - Branded HTML email templates (Izy Store branding — to be replaced with Banani design)
  - RFC 2369 List-Unsubscribe headers
  - Delivered via EmailQueue (Upstash Redis-backed)
- Emails sent async via `backend/src/lib/queues/emailQueue.ts` on job dispatch

## File Storage

**Cloudflare R2:**
- Service: S3-compatible object storage
- Auth:
  - `R2_ACCOUNT_ID` - Account ID
  - `R2_ACCESS_KEY_ID` - Access key
  - `R2_SECRET_ACCESS_KEY` - Secret key
  - `R2_BUCKET_NAME` - Bucket name
  - `R2_PUBLIC_URL` - Public base URL (e.g., `https://pub-xxxxx.r2.dev`)
- Client: AWS SDK v3 (`@aws-sdk/client-s3`)
- Implementation: `backend/src/lib/storage.ts`
- Usage:
  - Cover image uploads: `POST /api/upload` → R2
  - KYC document uploads (ID, selfie): `POST /api/upload`
  - Proxy access: `GET /api/files/:key` (public, no auth)
- HTTPS only; S3-compatible endpoint at `https://{ACCOUNT_ID}.r2.cloudflarestorage.com`
- Timeout: 5s connection, 30s socket
- Max 200 concurrent sockets with keep-alive

## Queue & Task Management

**Upstash Redis (REST API):**
- Service: Managed Redis for persistent job queues and rate limiting
- Auth:
  - `UPSTASH_REDIS_REST_URL` - REST endpoint
  - `UPSTASH_REDIS_REST_TOKEN` - API token
- Implementation: `backend/src/lib/redis.ts`
- Queues:
  - EmailQueue: Email dispatch (`backend/src/lib/queues/emailQueue.ts`)
  - JobQueue: Generic background jobs (`backend/src/lib/queues/JobQueue.ts`)
- Scheduled jobs (on server boot in `backend/src/index.ts`):
  - Order expiration: Every 5min (PENDING → EXPIRED after 30min)
  - Verification code cleanup: Every 1h
  - Webhook log cleanup: Every 6h (deletes logs > 90 days)
- Note: No catch-up or multi-instance guarantee (lost on restart, single-instance assumption)
- Rate limiting store: `backend/src/lib/rateLimitStore.ts` (Upstash-backed via `@upstash/ratelimit`)

## Database

**PostgreSQL (Neon serverless):**
- Connection: `DATABASE_URL` env var (e.g., `postgresql://user:pass@host/db`)
- Client: Prisma 7.4.1 + Neon adapter
- Schema: `backend/prisma/schema.prisma`
- Studio: `npm run db:push` (applies changes), `npm run db:studio` (GUI on port 5555)
- Features: Serverless (auto-scaling), connection pooling via Neon

## Authentication & Identity

**Auth Flow (no external provider currently active):**
- Email/password signup/login via `backend/src/routes/auth.ts`
- Password reset via email (verification codes in `VerificationCode` table)
- Email verification required
- Legacy Google OAuth fields in schema (unused — removed from frontend in cleanup)

**Custom implementation:**
- JWT signing via `jose` library
- Bcryptjs for password hashing
- CSRF protection via `verifyCsrf` middleware (`backend/src/lib/auth.ts`)
- Auth middleware: `backend/src/middleware/auth.ts` — reads `izy-token` cookie, re-queries seller from DB to prevent stale JWT plan bypass

## Monitoring & Observability

**Error Tracking:** None detected

**Logging:**
- Implementation: `backend/src/lib/logger.ts`
- Production redaction: Masks emails, phone numbers, order references
- No external service (logs to stdout)

## Webhooks & Callbacks

**Incoming (Bictorys → Backend):**
- `POST /api/webhooks` - Bictorys payment confirmation
- Signature verification: `x-secret-key` header (timing-safe comparison)
- Logged to `WebhookLog` table before processing
- Dispatch on `orderType` field (legacy: multiple types in schema; only FUNDRAISER/DONATION live)

**Outgoing:** None detected

## Network Configuration

**Frontend-Backend communication:**
- Next.js rewrites `/api/*` to backend (same-origin cookies fix for Safari ITP)
- Rewrite rule in `next.config.ts`: source `/api/:path*` → destination `${BACKEND_URL}/api/:path*`
- Direct backend URL (`BACKEND_URL`) used by public endpoints (file uploads, pay redirect) to bypass rewrite proxy
- 30-second timeout on all frontend API calls (`src/lib/api.ts`)
- Auto-refresh on 401 with stale-while-revalidate cache (2min TTL)

**CORS:**
- Multi-origin support via `ALLOWED_ORIGINS` env var (comma-separated list)
- Credentials: true
- Allowed headers: Content-Type, Authorization, x-csrf-token
- Max age: 86400 seconds

## Image Processing

**Tools:**
- heic-convert 2.1.0 - Convert HEIC (iOS) to JPEG
- file-type 16.5.4 - MIME type detection on upload
- Next.js Image component handles optimization (Vercel CDN in production, local in dev)

## Security Headers

**Configured in `next.config.ts` (Express mirrors these):**
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security: 63072000s (2 years) + includeSubDomains + preload
- Permissions-Policy: Deny camera, microphone, geolocation
- Content-Security-Policy: Restrictive (no eval, limited external scripts for analytics — legacy from fari.store, trim with Banani frontend)
- X-DNS-Prefetch-Control: on

## Environment Configuration

**Required env vars (backend):**
- Core: DATABASE_URL, PORT, NODE_ENV, FRONTEND_URL, BACKEND_URL, ALLOWED_ORIGINS
- Auth: JWT_SECRET, ENCRYPTION_KEY
- Payments: BICTORYS_API_URL, BICTORYS_API_KEY, BICTORYS_WEBHOOK_SECRET, BICTORYS_PRIVATE_KEY, BICTORYS_MERCHANT_SECRET_CODE, BICTORYS_REDIRECT_URL
- Email: RESEND_API_KEY, EMAIL_FROM
- Storage: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
- Redis: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

**Frontend env vars:**
- NEXT_PUBLIC_API_URL - Backend base (rewrite destination in next.config.ts)
- NEXT_PUBLIC_BASE_URL - Frontend base (for absolute URLs)

**Note:** No `.env` files committed to git. Use `.env.example` as template.

---

*Integration audit: 2026-04-13*
