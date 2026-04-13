# Codebase Concerns

**Analysis Date:** 2026-04-13

## Tech Debt

### Prisma Schema Contains ~30 Dead Models & Orphan Fields

**Issue:** Codebase is a fork of fari.store; the Prisma schema intentionally retained dead models (Product, BookingService, Community, TelegramBot, PushSubscription, Admin, Report, PageView, BlockClick, Customer, PartnershipRequest, CommunityPayment, CommunitySubscription, CommunityNotification, EmailMarketingIntegration, GoogleIntegration, PushSubscription, TelegramVerification, SlugHistory, VerificationCode, WebhookLog) that no longer have corresponding routes or UI.

**Files:** `backend/prisma/schema.prisma`

**Impact:**
- DB stores unnecessary rows; migrations are slower
- Orphan fields on `Seller` model (instagramUrl, tiktokUrl, youtubeUrl, facebookUrl, whatsappNumber, twitterUrl, telegramUrl, snapchatUrl, websiteUrl, themeId, themeFont, themeColors, bgImageUrl, headerLayout, imageStyle, metaPixelId, googleAdsId, googleAnalyticsId, tiktokPixelId, notificationPrefs, lastInboxSeenAt, lastOrdersSeenAt, withdrawalBlocked, withdrawalBlockedAt, withdrawalBlockReason, customCommissionRate, hardDeletedAt, isFlagged, flaggedAt, flagReason) consume memory and create confusion
- Estimated ~175 field references exist in kept route files that reference these dead models; removing schema without updating route code would break compilation
- CLAUDE.md explicitly warns: "Don't try to clean the schema as a side task — it's a rabbit hole"

**Fix Approach:**
- Surgical refactor in dedicated phase (5-8h estimate)
- First: delete all orphan field references from `Seller` model in kept routes (`sellers.ts`, `auth.ts`, `orders.ts`, etc.)
- Then: migrate schema (drop tables, remove relations)
- Final: update Prisma client imports if necessary
- **Recommended:** defer until after Banani frontend is wired up and codebase is more stable

---

## Stale Code & Deleted Dependencies

### Webhook Handler Contains Stubbed Deleted Libraries

**Issue:** `backend/src/routes/webhooks.ts` still contains monolithic legacy webhook handler that references deleted fari.store libraries. When Bictorys webhooks arrive with legacy `orderType` values not created by current frontend (BOOKING, SALE, PRODUCT, PARTNERSHIP, etc.), the handler has inline stubs that do nothing (see lines 9, 134, 149, 403, 524).

**Files:** `backend/src/routes/webhooks.ts` lines 9-11, 134-135, 149-150, 403-405, 524-525

**Stubs:**
- Line 11: `const generateSubToken = (_id: string): string => "";` — for community subscriptions
- Line 134: Comment about "email marketing sync removed"
- Line 149: Comment about "push notifications removed"
- Line 403: Comment about "Google Calendar auto-Meet, email marketing sync, Systeme.io removed"
- Line 524: Comment about "Web Push notifications removed"

**Impact:**
- If legacy payment webhooks arrive (old shared URLs still in circulation), they hit these stubs and fail silently or malfunction
- Community billing still has code paths (lines 16-188) that are unreachable from current frontend
- Confuses future developers about what is/isn't supported

**Fix Approach:**
1. Delete entire `handleCommunityPaymentWebhook()` function (lines 16-188) — no routes create CM-\* references
2. Simplify webhook handler to only accept FUNDRAISER/DONATION order types
3. Add explicit rejection of other order types (log + return 200 to avoid Bictorys retry spam)
4. Add integration test to verify only FUNDRAISER/DONATION orders are processed

---

### Cryptography Library Never Used

**Issue:** `backend/src/lib/crypto.ts` contains AES-256-GCM encryption functions that were used only for Telegram bot tokens (now deleted).

**Files:** `backend/src/lib/crypto.ts`

**Current Status:** Imported nowhere, safe to delete

**Impact:** Dead code clutters codebase; increases attack surface (less code to audit)

**Fix Approach:** Delete file and any stubs that call it

---

## Background Jobs Have No Recovery

### setInterval-Based Jobs Lost on Server Restart

**Issue:** Background jobs in `backend/src/index.ts` (lines 154-210) use plain `setInterval()` with no persistence, recovery, or multi-instance coordination.

**Files:** `backend/src/index.ts` lines 154-210

**Jobs Affected:**
- Order expiration (every 5min) — PENDING → EXPIRED after 30min
- Verification code cleanup (every 1h) — deletes expired codes
- Webhook log cleanup (every 6h) — deletes logs > 90 days

**Impact:**
- If server crashes before a job runs, catch-up never happens
- PENDING orders might stay in DB indefinitely if server is down for >30min
- Verification codes might accumulate if cleanup stops
- No guarantees in multi-instance deployments (Railway, Vercel serverless)

**Fix Approach:**
- Migrate to persistent job queue (Upstash already used for email queue, rate limiting)
- Use `JobQueue` (similar to `emailQueue.ts`) for all three jobs
- Add retry logic with exponential backoff
- Log job completions to DB for auditability

---

## No Test Framework Configured

**Issue:** No test runner (Jest, Vitest, Mocha) is set up. Zero tests exist in codebase.

**Files:** None (absence of config)

**Impact:**
- Cannot catch regressions in auth flow, payment webhooks, or upload logic
- Deployment to production is high-risk
- Developers have no way to validate changes locally

**Fix Approach:**
- Add Jest or Vitest to backend
- Add unit tests for: payment retry logic, webhook idempotency, CSRF validation
- Add integration tests for: auth flow, block creation, webhook processing
- Aim for ≥80% coverage on critical paths (auth, payments, webhooks)

---

## Security Concerns

### Webhook Signature Verification Has Timestamp Tolerance

**Issue:** `backend/src/routes/webhooks.ts` lines 225-231 accept webhooks within 5-minute timestamp window to prevent replay attacks.

**Files:** `backend/src/routes/webhooks.ts` lines 225-231

**Current Implementation:**
```typescript
const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
if (isNaN(ts) || Math.abs(Date.now() - ts) > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
  logger.warn(`Webhook timestamp invalide ou expiré: ${timestamp}`);
  return false;
}
```

**Risk:** 5-minute window is generous; if attacker intercepts webhook, they have 5 minutes to replay it with same signature.

**Recommendation:** Reduce to 60 seconds or add per-transactionId replay cache (e.g., Redis key `webhook:processed:{transactionId}` with 1h TTL)

---

### Logger Redaction May Have Gaps

**Issue:** `backend/src/lib/logger.ts` redacts emails, phone numbers, order refs, and file paths in production (lines 8-18), but regex patterns may miss edge cases.

**Files:** `backend/src/lib/logger.ts`

**Redaction Patterns:**
- Emails: `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g` — OK
- Phone numbers: `/\b\d{8,15}\b/g` — OK, but may match random 8-digit numbers in error messages
- Order refs: `/FA-[A-Z0-9]{8,}/g` — only covers FA-\* format
- File paths: `/\/[\w\-./]+\.\w{2,4}\b/g` — limited to certain extensions

**Impact:** Sensitive data could leak in error logs if:
- Phone appears in different format (e.g., with spaces/hyphens)
- Order reference uses different prefix
- URL query string contains sensitive params

**Fix Approach:**
- Add unit tests for logger redaction
- Use allowlist approach: only log safe fields (IDs, status, amounts)
- Store raw errors in secure audit table (not console) if detailed debugging needed

---

### CSRF Token Handling Relies on Single Header

**Issue:** `backend/src/lib/auth.ts` lines 163-192 verify CSRF with custom header only; cookie is optional fallback.

**Files:** `backend/src/lib/auth.ts` lines 176-189

**Code:**
```typescript
if (!headerToken) {
  res.status(403).json({ error: "Token CSRF invalide" });
  return;
}
// If cookie is also present, verify double-submit match
if (cookieToken) {
  // ... timing-safe compare
}
```

**Risk:** If custom header is stripped by proxy/CDN, CSRF protection degrades to cookie match only (weaker)

**Recommendation:** Log all CSRF rejections; monitor for proxy stripping headers

---

## Performance Concerns

### Authentication Cache May Not Invalidate Quickly

**Issue:** `backend/src/middleware/auth.ts` caches seller plan/slug in memory for 30 seconds (lines 14-25).

**Files:** `backend/src/middleware/auth.ts` lines 14-25, 54-79

**TTL:** 30 seconds

**Impact:**
- If seller plan changes (upgrade/downgrade) via admin action, change takes up to 30s to propagate
- If seller is soft-deleted (`deletedAt` set), stale JWT could still grant access for up to 30s
- In multi-instance deployments, each instance has its own cache — no cache invalidation

**Recommendation:**
- Reduce TTL to 10s for faster invalidation
- Add cache invalidation hook: if seller is updated outside auth flow, delete cache entry
- Use Redis cache instead of Map (shared across instances)

---

### Block Progress Computed On-Demand (No Caching)

**Issue:** `GET /api/blocks/:id/progress` recalculates total donation amount and donor count by summing all `Order` rows every request.

**Files:** `backend/src/routes/blocks.ts` (progress endpoint)

**Impact:**
- For active cagnottes with 1000+ donors, query is slow (full table scan)
- Dashboard refresh hammers DB

**Fix Approach:**
- Add `totalCollected` and `donorCount` fields to `Block` table
- Update these fields transactionally when order status changes to PAID
- Cache in-memory for 60s with Redis

---

## Fragile Areas

### Webhook Idempotency Relies on Exact Transaction ID Match

**Issue:** `backend/src/routes/webhooks.ts` lines 351-396 use transaction ID to prevent duplicate processing, but only checks `WebhookLog` table for `eventType` + status match.

**Files:** `backend/src/routes/webhooks.ts` lines 351-396

**Scenario:**
1. Webhook arrives: `status=succeeded`, logged with `status: "received"`
2. Order marked PAID
3. Webhook log updated to `status: "processed"`
4. Same webhook arrives again (duplicate from Bictorys)
5. Check: is there a log with `externalId=X, eventType=succeeded, status=processed`? YES → skip
6. But if second webhook has slightly different `status` string or arrives before processing is complete, it might re-process

**Risk:** Low, because transaction is serializable, but double-processing could happen if:
- Webhook processing partial crashes after transaction commit but before log update
- Two different status values (e.g., "authorized" vs "succeeded") for same transaction

**Fix Approach:**
- Add unique constraint on `WebhookLog(externalId, eventType)` with upsert logic
- Log webhook before any processing (already done)
- Use pessimistic lock on Order row during processing

---

### Token Refresh Lock Could Deadlock Under High Concurrency

**Issue:** `src/lib/api.ts` lines 35-60 use a simple promise lock to prevent concurrent refresh calls.

**Files:** `src/lib/api.ts` lines 35-60

**Code:**
```typescript
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    // ... refresh logic
  })();
  return refreshPromise;
}
```

**Risk:**
- If 2 requests call `refreshAccessToken()` simultaneously:
  - First request: `refreshPromise` is null → creates promise, sets `refreshPromise`
  - Second request: `refreshPromise` is truthy → returns it
  - Both wait on same promise → OK
- But if refresh fails and sets `refreshPromise = null`, subsequent requests might trigger multiple refreshes
- Edge case: if refresh response is 401 (token truly invalid), both requests get false; original auth context doesn't catch this

**Impact:** Minor — worst case is multiple refresh attempts, not deadlock

**Fix Approach:**
- Add explicit state machine: `refreshing | idle | failed`
- If `failed`, don't retry; force logout
- Add timeout to lock (5s max)

---

## Missing Critical Features

### No Rate Limiting on Public Endpoints

**Issue:** Order creation (`/api/orders`) is explicitly skipped from rate limiting (line 91 in `index.ts`).

**Files:** `backend/src/index.ts` line 91

**Code:**
```typescript
skip: (req) => {
  const url = req.originalUrl || req.url;
  return url.startsWith("/api/withdrawals") || url.startsWith("/api/orders") || url.startsWith("/api/auth");
},
```

**Risk:** Attacker can DOS `/api/orders` by creating 1000s of PENDING orders, filling DB and slowing down legitimate payments

**Recommendation:**
- Add separate rate limiter for `/api/orders`: 100 orders/hour per IP
- Include customer email in rate limit key (per-email limit)

---

### Frontend is Skeleton Placeholder

**Issue:** Frontend has been stripped to bare bones (homepage + pay-redirect) pending Banani design integration.

**Files:** `src/app/page.tsx`, `src/app/layout.tsx`, most routes deleted

**Impact:**
- Cannot test end-to-end flows without Banani UI
- Deployed frontend at cagnottes.sn shows placeholder
- User acquisition blocked

**Status:** Known; documented in CLAUDE.md as intentional

---

## Test Coverage Gaps

### Critical Paths Have Zero Tests

**Untested Areas:**
1. Auth flow (signup, login, refresh, logout)
   - Files: `backend/src/routes/auth.ts`
   - Risk: Silent breakage in password hashing, token generation, CSRF handling

2. Webhook processing with concurrency
   - Files: `backend/src/routes/webhooks.ts`
   - Risk: Double-charging donors, lost orders, idempotency failures

3. Bictorys payment retry logic
   - Files: `backend/src/lib/payments/bictorys.ts`
   - Risk: Orders stuck in PENDING if WAF blocks retry sequence

4. File uploads and R2 proxy
   - Files: `backend/src/routes/upload.ts`, `files.ts`
   - Risk: Broken image links, CORS issues

5. Email queue persistence
   - Files: `backend/src/lib/queues/emailQueue.ts`
   - Risk: Transactional emails lost on server crash

**Priority:** HIGH

---

## Known Audits (Context)

Two previous audits document specific quirks:

- `audits/audit-008-inapp-browser-payment.md` — Mobile money redirects blocked in social WebViews
- `audits/audit-009-tiktok-payment-flow.md` — TikTok in-app browser workaround (base64 redirect proxy)

**Do not modify** `src/app/api/pay-redirect/route.ts` or payment redirect logic without reading both audits first.

---

*Concerns audit: 2026-04-13*
