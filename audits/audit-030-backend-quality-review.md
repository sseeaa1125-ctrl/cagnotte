# Audit 030 -- Backend Quality & Security Review

**Date:** 2026-04-16
**Scope:** All backend source files (`backend/src/`)
**Reviewer:** Claude (Opus 4.6)

---

## Executive Summary

The backend is well-structured with strong security practices (timing-safe comparisons, CSRF double-submit, Serializable transactions, webhook idempotency). The codebase shows evidence of many prior audits and iterative hardening. This review found **3 CRITICAL**, **7 HIGH**, **12 MEDIUM**, and **8 LOW** issues.

---

## CRITICAL

### CR-01: Order created but left dangling when circuit breaker is open

**File:** `backend/src/routes/orders.ts:421-425`
**Issue:** The circuit breaker check happens AFTER the Order row has been created in the Serializable transaction (line 346-416). If the breaker is open, the handler returns 503 but the Order row stays in `PENDING` status forever (or until the 10-min expiry cron). The Bictorys `paymentExternalId` is never set, so the order can never be reconciled.
**Fix:** Move the circuit breaker check BEFORE the `$transaction` call:
```typescript
// Move this block to BEFORE line 346
if (isBictorysCircuitOpen()) {
  res.status(503).json({
    error: "Paiement temporairement indisponible. Reessaye dans 1 minute.",
  });
  return;
}
// THEN create the order in the transaction
const order = await prisma.$transaction(/* ... */);
```

### CR-02: Google OAuth state comparison is not timing-safe

**File:** `backend/src/routes/auth.ts:1088`
**Issue:** The Google OAuth callback compares `state !== cookieState` using JavaScript `!==`, which is vulnerable to timing attacks. An attacker who can measure response times can iteratively brute-force the 64-character hex state value.
**Fix:**
```typescript
import crypto from "crypto";
// Replace: if (!code || !state || !cookieState || state !== cookieState)
if (!code || !state || !cookieState) { /* redirect error */ }
const stateBuf = Buffer.from(state);
const cookieBuf = Buffer.from(cookieState);
if (stateBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(stateBuf, cookieBuf)) {
  res.redirect(302, `${frontendUrl}/connexion?error=google_failed`);
  return;
}
```

### CR-03: Withdrawal cleanup in catch block is overly broad

**File:** `backend/src/routes/withdrawals.ts:470-477`
**Issue:** The catch-all error handler marks ALL `PENDING` withdrawals for the seller as `REJECTED`, not just the one that failed. If a concurrent request created another legitimate PENDING withdrawal, it gets incorrectly rejected. This is a data-loss bug.
**Fix:**
```typescript
// Track the withdrawal ID from the transaction, then clean up only THAT one
try {
  // ... existing code that creates `withdrawal`
} catch (err) {
  // Only clean up the specific withdrawal we just created
  if (typeof withdrawal !== 'undefined' && withdrawal?.id) {
    await prisma.withdrawal.update({
      where: { id: withdrawal.id, status: "PENDING" },
      data: { status: "REJECTED", failureReason: "Erreur interne lors du traitement" },
    }).catch(cleanupErr => logger.error("Erreur cleanup withdrawal", cleanupErr));
  }
}
```
Note: This is partially mitigated by the "no concurrent PENDING" check at line 301-307, but a race condition between the check and the exception can still cause the issue.

---

## HIGH

### HI-01: `GET /api/blocks/:id/donations` does not respect `isAnonymous`/`messageIsPrivate` flags

**File:** `backend/src/routes/blocks.ts:258-288`
**Issue:** The `/donations` endpoint returns `customerName` and `donorMessage` raw without checking `isAnonymous` or `messageIsPrivate`. Contrast with the cagnottes route which uses `maskDonation()`. This leaks anonymous donor names and private messages.
**Fix:** Apply the same masking as cagnottes:
```typescript
donations: donations.map((d) => ({
  id: d.id,
  amount: d.amount,
  name: d.isAnonymous ? "Anonyme" : (d.customerName || "Anonyme"),
  message: d.messageIsPrivate ? null : (d.donorMessage || null),
  createdAt: d.createdAt,
})),
```
Also add `isAnonymous` and `messageIsPrivate` to the select clause.

### HI-02: `bictorysStatusCache` is an unbounded Map (memory leak)

**File:** `backend/src/routes/orders.ts:1150-1173`
**Issue:** The cache cleanup runs every 5 minutes, but under high traffic thousands of entries can accumulate between cleanups. There is no maximum size cap. A DDoS on the status polling endpoint could exhaust memory.
**Fix:** Add a size cap:
```typescript
function setCachedBictorysStatus(externalId: string, result: ...): void {
  if (bictorysStatusCache.size > 10000) {
    // Evict oldest entries
    const iter = bictorysStatusCache.keys();
    for (let i = 0; i < 1000; i++) {
      const key = iter.next().value;
      if (key) bictorysStatusCache.delete(key);
    }
  }
  bictorysStatusCache.set(externalId, { result, expiresAt: Date.now() + BICTORYS_CACHE_TTL });
}
```

### HI-03: `DELETE /api/auth/account` reads seller email inside a transaction with a nested query

**File:** `backend/src/routes/auth.ts:915-917`
**Issue:** Inside the `$transaction`, the code runs `await tx.seller.findUnique(...)` to get the email for the verification code cleanup. But at this point, `tx.seller.update()` has already soft-deleted the seller (line 912). The `findUnique` query runs after the update within the same transaction, so `deletedAt` is already set. The `findUnique` with `where: { id: sellerId }` will still find the row (it does not filter `deletedAt`), so this works by accident. However, the pattern is fragile and the non-null assertion `!.email` could throw if the seller row does not exist.
**Fix:** Read the email BEFORE the transaction:
```typescript
const seller = await prisma.seller.findUnique({
  where: { id: sellerId },
  select: { email: true },
});
if (!seller) { res.status(404).json({ error: "Compte introuvable" }); return; }

await prisma.$transaction(async (tx) => {
  const now = new Date();
  await tx.order.updateMany({ where: { sellerId }, data: { deletedAt: now } });
  await tx.seller.update({ where: { id: sellerId }, data: { deletedAt: now } });
  await tx.verificationCode.deleteMany({ where: { email: seller.email } });
});
```

### HI-04: `POST /api/auth/reset-password` does not bump `tokenVersion`

**File:** `backend/src/routes/auth.ts:805-810`
**Issue:** When a user resets their password via the forgot-password flow, `tokenVersion` is NOT incremented. This means existing sessions (access + refresh tokens) remain valid even after a password reset. Compare with `PUT /change-password` (line 858) which correctly bumps `tokenVersion`. An attacker with a stolen session is not evicted after the legitimate user resets their password.
**Fix:**
```typescript
const hashed = await hashPassword(data.newPassword);
await prisma.seller.update({
  where: { email: data.email },
  data: {
    password: hashed,
    tokenVersion: { increment: 1 },  // <-- Add this
  },
});
```

### HI-05: `POST /api/orders` creates `Customer` outside the Serializable transaction

**File:** `backend/src/routes/orders.ts:324-342`
**Issue:** The Customer find-or-create happens before the Serializable transaction that creates the Order. Two concurrent orders from the same new customer could race and create duplicate Customer rows (or fail). This should be inside the transaction for atomicity.
**Fix:** Move the customer lookup/creation inside the `$transaction` block.

### HI-06: `GET /api/sellers/:slug` exposes `isFlagged` in public response

**File:** `backend/src/routes/sellers.ts:697`
**Issue:** The public seller endpoint includes `isFlagged: true` in the select clause, which means the public API response reveals whether a seller has been flagged by admins. This is sensitive internal state.
**Fix:** Remove `isFlagged` from the select clause in the public `/:slug` endpoint.

### HI-07: `withdrawalsRouter` missing `requireAuth` on the router level

**File:** `backend/src/routes/withdrawals.ts:59-103`, `backend/src/index.ts:168`
**Issue:** In `index.ts`, the withdrawals router is mounted with `verifyCsrf` but NOT `requireAuth`: `app.use("/api/withdrawals", verifyCsrf, withdrawalsRouter)`. The `requireAuth` is applied per-handler inside the router. The `GET /` handler at line 59 correctly adds `requireAuth`, but if a new route is added without it, it would be unauthenticated. The global limiter also SKIPS `/api/withdrawals` (index.ts:141), creating a gap. This is not currently exploitable but is a defense-in-depth concern.
**Fix:** Add `requireAuth` to the mount point: `app.use("/api/withdrawals", requireAuth, verifyCsrf, withdrawalsRouter)`.

---

## MEDIUM

### ME-01: `POST /api/orders` status poll fallback can transition PENDING->PAID without webhook log

**File:** `backend/src/routes/orders.ts:1288-1314`
**Issue:** The Bictorys status poll fallback path (when webhook hasn't arrived) updates the order to PAID inside a Serializable transaction, but does NOT create a `WebhookLog` entry. This breaks the audit trail that exists for the webhook path and could lead to duplicate processing if the webhook arrives later.
**Fix:** Add a `WebhookLog` upsert inside the fallback transaction, or use a flag on the order to indicate it was reconciled via polling.

### ME-02: `authCache` in `middleware/auth.ts` never evicts on soft-delete

**File:** `backend/src/middleware/auth.ts:17-28`
**Issue:** When a seller is soft-deleted, the auth cache retains the entry for up to 30 seconds. During this window, the deleted seller can still make authenticated requests. The periodic cleanup only prunes expired entries, not deleted sellers.
**Severity:** LOW risk in practice (30s window), but noted for completeness.

### ME-03: Email subjects reference "Izy Store" instead of "Cagnottes.sn"

**Files:** `backend/src/routes/auth.ts:238,323,735`, `backend/src/routes/sellers.ts:1136`
**Issue:** Multiple email subjects still reference the old "Izy Store" brand name instead of "Cagnottes.sn". Examples:
- Line 238: `"Verifie ton email -- Izy Store"`
- Line 323: `"Nouveau code -- Izy Store"`
- Line 735: `"Reinitialisation du mot de passe -- Izy Store"`
- sellers.ts:1136: `"Reinitialisation du code de retrait -- Izy Store"`
**Fix:** Replace all "Izy Store" references with "Cagnottes.sn" in email subjects.

### ME-04: `cleanPhoneForStorage` does not validate input

**File:** `backend/src/lib/phone.ts:83-91`
**Issue:** `cleanPhoneForStorage` blindly strips characters and prepends `+`, without any validation. It will happily store `+abc` or `+` if given garbage input. The Zod schemas at call sites validate length (min 1, max 30) but not content beyond that.
**Fix:** Add basic validation:
```typescript
export function cleanPhoneForStorage(phone: string): string {
  let clean = phone.replace(/[\s\-\.\(\)]/g, "");
  const hasPlus = clean.startsWith("+");
  if (hasPlus) clean = clean.slice(1);
  if (clean.startsWith("00")) clean = clean.slice(2);
  if (!/^\d{7,15}$/.test(clean)) {
    throw new Error(`Invalid phone number: ${phone}`);
  }
  return "+" + clean;
}
```

### ME-05: `GET /api/queues/stats` is accessible to any authenticated seller

**File:** `backend/src/index.ts:207-210`
**Issue:** The queue stats endpoint only requires `requireAuth`, meaning any logged-in seller can view email queue statistics (pending, failed, dead letter counts). This is internal operational data that should be admin-only.
**Fix:** Add admin check or remove the endpoint from the public API.

### ME-06: `res.json` monkey-patch on upload route is fragile

**File:** `backend/src/index.ts:105-116`
**Issue:** The upload route intercepts `res.json()` to rewrite R2 URLs. This monkey-patching pattern is fragile -- it assumes `body` is always an object with a `url` string, and the type cast `body: Record<string, unknown>` silently swallows arrays and other valid JSON. If `res.json()` is called with an array or null, this could cause unexpected behavior.
**Fix:** Move the URL rewriting into the upload route handler itself rather than a middleware that patches `res.json`.

### ME-07: `logger.log` is silenced in production

**File:** `backend/src/lib/logger.ts:21-24`
**Issue:** In production, `logger.log()` is a no-op. This means important operational logs like `[PAYOUT] Retrait complete` (withdrawals.ts:400), `[Webhook Bictorys] ref=... status=...` (webhooks.ts:283), and queue stats are completely invisible. Only `error` and `warn` are logged in production.
**Fix:** Add an `info` level that logs in production (without sensitive data redaction like `log`), or change critical operational messages to use `warn`.

### ME-08: Duplicate `timingSafeCompare` function

**Files:** `backend/src/routes/auth.ts:31-34`, `backend/src/routes/sellers.ts:21-24`
**Issue:** The same `timingSafeCompare` function is copy-pasted in both files. Should be extracted to a shared utility.
**Fix:** Move to `lib/crypto.ts` or `lib/utils.ts` and import from both files.

### ME-09: `POST /api/orders` fallback email `anon-${Date.now()}@noemail.local` is not collision-safe

**File:** `backend/src/routes/orders.ts:321`
**Issue:** When no customer email is provided, the code generates `anon-${Date.now()}@noemail.local`. Two orders created in the same millisecond (e.g., rapid automated testing, load test) will generate the same email, causing a `Customer.sellerId_email` unique constraint violation.
**Fix:** Add randomness: `anon-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@noemail.local`

### ME-10: `GET /api/orders/:ref/status` async IIFE in response construction

**File:** `backend/src/routes/orders.ts:1385-1395`
**Issue:** The status endpoint uses an immediately-invoked async function with `await` inside the response object literal to fetch `thankYouMessage`. This is unusual, hard to read, and if it throws, the error is swallowed by the spread operator returning `{}`. More importantly, it fires an extra DB query on every paid donation status poll.
**Fix:** Move the block query before the response construction into a normal variable assignment.

### ME-11: `POST /api/webhooks/bictorys` returns 200 with error payload on internal errors

**File:** `backend/src/routes/webhooks.ts:668-670`
**Issue:** The catch block returns `res.status(200).json({ received: true, error: "internal" })`. This is intentional to prevent Bictorys retries, but it means legitimate processing errors (e.g., DB down) are acknowledged as "received" and Bictorys will never retry them. The order stays in PENDING and relies on the 10-min expiry cron.
**Severity:** Accepted design trade-off, but worth documenting. If the DB is down, the WebhookLog was also not written, so there is no audit trail.

### ME-12: Admin routes mounted without global rate limiting

**File:** `backend/src/index.ts:159`
**Issue:** `app.use("/api/admin", adminRouter)` is mounted before the global rate limiter (which only covers `/api`), but the admin router is not in the skip list. However, the admin routes use their own authentication (`requireAdmin`). The issue is that there's no write limiter on admin routes, so an authenticated admin could make unlimited mutations.
**Fix:** Add a write limiter to the admin mount: `app.use("/api/admin", writeLimiter, adminRouter)`.

---

## LOW

### LO-01: Unused imports

**File:** `backend/src/routes/orders.ts:13-14`
**Issue:** `JWT_SECRET_BYTES` is imported from `../lib/auth.js` and `getFromR2`, `extractR2Key`, `streamFromR2` from `../lib/storage.js`. `getFromR2` is not used in the file (only `extractR2Key` and `streamFromR2` are used).
**Fix:** Remove unused `getFromR2` import.

### LO-02: `generateSubToken` is a no-op stub

**File:** `backend/src/routes/webhooks.ts:20`
**Issue:** `const generateSubToken = (_id: string): string => "";` always returns empty string. The community cancel URL includes `?token=` which is always empty. Anyone with the subscription ID can cancel.
**Severity:** LOW because community features are removed from the cagnottes.sn fork. Dead code.

### LO-03: `PLAN_LIMITS` set to `Infinity` for all plans

**File:** `backend/src/routes/blocks.ts:291-294`
**Issue:** All plan limits are `Infinity`, meaning the limit checks at lines 310-335 are dead code. They run DB queries but can never trigger.
**Fix:** Either remove the dead checks or set actual limits.

### LO-04: `POST /api/sellers/kyc` does not validate R2 URL domain

**File:** `backend/src/routes/sellers.ts:264-268`
**Issue:** The KYC schema only validates that `idUrl` and `selfieUrl` are valid URLs (`.url()`), but doesn't verify they point to the backend's own `/api/files/` proxy. A malicious user could submit KYC with URLs pointing to external sites, potentially tricking an admin reviewer.
**Fix:** Validate that URLs match the expected pattern: `z.string().url().startsWith(BACKEND_URL + "/api/files/")` or match the hex key pattern.

### LO-05: `redact()` in logger is overly aggressive

**File:** `backend/src/lib/logger.ts:8-17`
**Issue:** The path redaction regex `\/[\w\-./]+\.\w{2,4}\b` will redact legitimate log context like `/api/auth/refresh` or version numbers like `v1.2.34`. The phone regex `\b\d{8,15}\b` will redact order amounts, IDs, and timestamps.
**Severity:** Low -- affects log readability in production, not security.

### LO-06: `POST /api/orders` accepts `SALE` and `BOOKING` orderTypes but cagnottes.sn is donation-only

**File:** `backend/src/routes/orders.ts:33`
**Issue:** The `createOrderSchema` accepts `SALE`, `BOOKING`, `PAYMENT`, and `DONATION` order types, but CLAUDE.md states only `DONATION`/`FUNDRAISER` paths run in practice. The SALE and BOOKING code paths are dead weight that increases attack surface.
**Severity:** Low -- the code works correctly; it's just unnecessary surface area.

### LO-07: `alerting.ts` references "FARI" in alert text

**File:** `backend/src/lib/alerting.ts:42`
**Issue:** Alert text says `"ALERTE FARI"` instead of "ALERTE CAGNOTTES.SN".
**Fix:** Update the alert text.

### LO-08: `generateAvailableSlug` in auth.ts duplicates logic from `lib/cagnottes/slug.ts`

**File:** `backend/src/routes/auth.ts:990-1005`
**Issue:** The Google OAuth signup path has its own `slugifyDisplayName` and `generateAvailableSlug` functions that duplicate (with slight differences) the `slugify` and `ensureUniqueSlug` from `lib/cagnottes/slug.ts`. The auth version does not check `RESERVED_SLUGS` consistently and has a different fallback pattern.
**Fix:** Refactor to reuse the shared slug utilities.

---

## Architecture Notes (Informational)

1. **Dead fork code**: Significant surface area (SALE, BOOKING, PAYMENT, Community, Product, BookingService, OrderBump, Review routes) is kept from the fari.store fork but is unreachable in the cagnottes.sn context. Per CLAUDE.md this is intentional for now, but it increases maintenance burden and attack surface.

2. **Background jobs reliability**: All crons use `setInterval` (lost on restart). The boot catch-up timeouts (10s-60s) help, but there's no distributed lock -- scaling to 2+ instances would run duplicate crons. Documented as T-02-09 accepted risk.

3. **Transaction isolation**: Excellent use of Serializable isolation on critical paths (order creation, webhook processing, withdrawal balance check). The Neon 2s ceiling constraint is respected.

4. **Notification system**: Well-architected with deterministic dedupeKeys, at-most-once delivery via unique constraint, and fire-and-forget post-commit dispatch. The dual-pref-key system (legacy + Banani) is a pragmatic migration pattern.

---

_Reviewed: 2026-04-16T12:00:00Z_
_Reviewer: Claude (Opus 4.6)_
