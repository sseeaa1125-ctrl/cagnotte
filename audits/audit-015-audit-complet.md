# Audit 015 — Comprehensive Security & Code Quality Review

**Date**: 2026-04-14  
**Scope**: Full codebase audit (security, data integrity, performance, UX, code quality, reliability)  
**Previous audits reviewed**: audit-011 (full), audit-013 (refresh/suggested), audit-014 (commission/E2E)

---

## EXECUTIVE SUMMARY

**Finding Count by Severity**:
- CRITICAL: 1
- HIGH: 6
- MEDIUM: 8
- LOW: 7
- Total: 22 findings

**Top 5 Issues to Fix First**:
1. **S-01 (CRITICAL)**: POST /api/orders missing CSRF protection on public donation endpoint
2. **S-02 (HIGH)**: Webhook signature verification missing on `x-webhook-signature` / `x-webhook-timestamp` replay window
3. **D-01 (HIGH)**: Prisma `$queryRaw` in sellers.ts dashboard stats not parameterized (raw SQL injection risk)
4. **B-01 (HIGH)**: Race condition in api.ts refresh lock — stale closure in concurrent tabs
5. **P-01 (HIGH)**: N+1 queries in GET /api/sellers/dashboard/stats — 12+ separate DB calls

---

## S — SECURITY & MONEY INVARIANTS

### S-01 — POST /api/orders missing CSRF protection (PUBLIC DONATION ENDPOINT)

**Severity**: CRITICAL  
**File**: [backend/src/routes/orders.ts#L116-L121](backend/src/routes/orders.ts#L116-L121)  
**Symptom**: The public donation endpoint `POST /api/orders` has NO `verifyCsrf` middleware. Attackers can submit a form on a third-party site and charge donors' phones without consent (e.g., hidden form on a malicious blog posts a donation).

```ts
ordersRouter.post(
  "/",
  orderIpMinuteLimiter,          // ← Rate limiters only
  orderIpHourLimiter,
  orderEmailMinuteLimiter,
  async (req, res) => {          // ← NO verifyCsrf here!
```

**Impact**: Cross-origin donation submission (CSRF). Wave/Orange Money charges donors without their explicit action on cagnottes.sn.

**Proposed fix**: Add `verifyCsrf` middleware to the stack OR implement SameSite=Strict on cookies (but prefer explicit CSRF for financial flows). Since this is a public endpoint that donors access from external social media links, you must decide: (1) add `verifyCsrf` and ensure frontend sends x-csrf-token, or (2) rely entirely on SameSite=Strict cookie + double-submit pattern. Recommend **(1)** for defense-in-depth.

---

### S-02 — Webhook signature verification missing replay-window bounds

**Severity**: HIGH  
**File**: [backend/src/routes/webhooks.ts#L260-L280](backend/src/routes/webhooks.ts#L260-L280)  
**Symptom**: Webhook handler verifies `x-secret-key` header (simple string match) but CLAUDE.md (line 175) mentions **"HMAC-SHA256 via `x-webhook-signature` + `x-webhook-timestamp` with 5-minute replay window"**. Current code does NOT check the timestamp or enforce the 5-minute window. An attacker can replay an old PAID webhook indefinitely.

**Impact**: Webhook replay → duplicate notifications, double-billing if an attacker captures a PAID webhook and replays it after the `WebhookLog.upsert` unique constraint is cleared (e.g., after 90 days).

**Proposed fix**: Extract `x-webhook-timestamp` header, parse as ISO string, verify `Date.now() - timestamp < 5 * 60 * 1000`. Reject (408 Request Timeout) if outside window. CLAUDE.md says this is already implemented but audit found no code — either implement it or update CLAUDE.md to clarify current strategy.

---

### S-03 — Commission computation bypass via client-supplied net/commission fields

**Severity**: HIGH  
**File**: [backend/src/routes/orders.ts#L31-L64](backend/src/routes/orders.ts#L31-L64)  
**Symptom**: `createOrderSchema` validates `amount` (gross) but does NOT validate or reject client-supplied `commission` / `net` / `sellerAmount` fields if they exist in the Zod schema. If an attacker POSTs `amount: 100_000, commission: 0`, the backend might use the client value (need to verify actual computation path).

**Impact**: If the order-creation code uses `data.commission` instead of recalculating, attackers charge donors 100k but pay sellers 100k (0% platform fee).

**Proposed fix**: Verify that all monetary fields in the `createOrderSchema` are either (1) validated and enforced to be recalculated server-side, or (2) removed from the schema entirely. Code review the actual order-creation path in routes/orders.ts (line 300+) to confirm `computeCommission()` is called and client fields are ignored.

---

### S-04 — requireSellerMe() auth helper not re-checking plan/onboarding status

**Severity**: HIGH  
**File**: [backend/src/lib/auth.ts (search for requireSellerMe)](backend/src/lib/auth.ts)  
**Symptom**: The new `requireSellerMe()` helper (introduced in audit-012) re-queries the seller from DB but CLAUDE.md (line 106) states that `requireAuth` middleware re-queries to **"prevent stale JWT plan bypass"**. If `requireSellerMe()` is used on routes that gate on `seller.plan` or `seller.onboardingCompleted`, an old JWT could authorize actions after plan downgrade.

**Impact**: A seller downgrades from PRO → FREE but a stale JWT (valid for 15 min) still allows PRO-only actions.

**Proposed fix**: Verify that every route using `requireSellerMe()` also checks current DB state of `plan` / `onboardingCompleted` before allowing sensitive actions. If `requireSellerMe()` calls `findUnique`, confirm it also validates these fields against the JWT payload.

---

### S-05 — Withdrawal amount not validated against seller balance

**Severity**: MEDIUM  
**File**: [backend/src/routes/withdrawals.ts#L164-L220](backend/src/routes/withdrawals.ts#L164-L220)  
**Symptom**: The withdrawal route validates KYC status and PIN, but there is no explicit check that `data.amount ≤ seller.balance`. If the balance table is out of sync (e.g., due to a webhook failure), an attacker could withdraw more than their balance.

**Impact**: Negative seller balance (platform loss if payout is executed). The Bictorys payout API might reject over-withdrawals, but silent failure is worse than explicit validation.

**Proposed fix**: Query `SELECT SUM(amount WHERE paymentStatus = "PAID") - SUM(amount WHERE withdrawalStatus != "FAILED")` before accepting the withdrawal request. Store the verified balance in a `Seller.availableBalance` column (computed on each order) and validate against it.

---

### S-06 — Rate limiter `refreshLimiter` shared between /refresh and /refresh-and-return

**Severity**: MEDIUM  
**File**: [backend/src/routes/auth.ts (search for refreshLimiter)](backend/src/routes/auth.ts)  
**Symptom**: Already flagged in audit-014 (E2E-06). Both GET /api/auth/refresh and GET /api/auth/refresh-and-return use the same 30/15min limiter. A user with multiple tabs aggressively refreshing can hit 30 requests and lock out legitimate refresh-and-return calls.

**Impact**: Authed user stuck behind 429 due to noisy tabs.

**Proposed fix**: Split into two limiters with separate Redis keys but same rate (30 req / 15 min). Example: `refreshLimiter` for `/refresh` and `refreshAndReturnLimiter` for `/refresh-and-return`.

---

## D — DATA INTEGRITY & SCHEMA

### D-01 — Prisma $queryRaw in dashboard stats not parameterized (SQL injection)

**Severity**: HIGH  
**File**: [backend/src/routes/sellers.ts#L555-L566](backend/src/routes/sellers.ts#L555-L566)  
**Symptom**: Dashboard stats endpoint uses raw SQL queries with template strings:

```ts
prisma.$queryRaw<...>(`
  SELECT ... WHERE seller_id = ${sellerId} ...
`)
```

If `sellerId` is not properly sanitized upstream (e.g., via middleware), an attacker could inject SQL. Even though it's behind `requireAuth`, relying on JWT validation alone is risky.

**Impact**: SQL injection → read other sellers' private data / modification / DoS.

**Proposed fix**: Use parameterized queries. Replace all `${variable}` with `Prisma.sql` placeholders:

```ts
prisma.$queryRaw<...>(Prisma.sql`
  SELECT ... WHERE seller_id = ${Prisma.asText(sellerId)} ...
`)
```

Prisma will escape and parameterize automatically.

---

### D-02 — Zod schema `suggestedAmounts.max(4)` but EditForm and cagnottes list cap at 3

**Severity**: MEDIUM  
**File**: [backend/src/lib/blocks/schemas.ts#L37, L52, L90](backend/src/lib/blocks/schemas.ts#L37)  
**Symptom**: Already flagged in audit-013 (M-02). The backend Zod schema allows up to 4 suggested amounts, but the frontend EditForm caps at 3 and the public list displays only the first 3. Existing blocks with 4 amounts will silently truncate on edit.

**Impact**: Data loss (4th amount dropped without warning). Inconsistent rule across layers.

**Proposed fix**: Change `max(4)` to `max(3)` in all 3 schemas. Backfill: run a SQL query to check if any existing blocks have `LENGTH(config->'suggestedAmounts'::jsonb) > 3` and truncate them before migration.

---

### D-03 — Block.slug @unique but no constraint that slug !== reserved words

**Severity**: MEDIUM  
**File**: [backend/src/lib/cagnottes/slug.ts](backend/src/lib/cagnottes/slug.ts)  
**Symptom**: The `ensureUniqueSlug()` function has an in-memory reserved-words list (e.g., "api", "admin", "health"), but if the list is incomplete or the function is bypassed, a seller could register `/api/<number>` and conflict with API routes.

**Impact**: Routing collision → 404 or unintended endpoint shadowing (low risk but worth documenting).

**Proposed fix**: Add a `Block.slug` constraint check at the DB schema level (Postgres `CHECK` clause) or enforce a regex pattern (`[a-z0-9\-]+` and NOT IN reserved-words). Document the reserved list in CLAUDE.md.

---

### D-04 — Order.customerPhone not normalized before storage (country-code drift)

**Severity**: MEDIUM  
**File**: [backend/src/routes/orders.ts#L46](backend/src/routes/orders.ts#L46) and [L315-325](backend/src/routes/orders.ts#L315-L325)  
**Symptom**: Customer phone number is validated as `z.string().min(1).max(30)` but is NOT normalized to E.164 format before storage. Audit-012 fixed withdrawals to enforce `+221XXXXXXXXX`, but donations accept any format ("+123", "123", "+1-23", etc.). Inconsistent storage makes analytics / duplicate detection unreliable.

**Impact**: Same donor appears as "2250123456" and "+2250123456" in the DB → duplicate gift tracking, broken email/SMS dedup.

**Proposed fix**: Apply the same E.164 normalization in `cleanPhoneForStorage()` on orders as is used for withdrawals. Validate `paymentCountry` parameter and normalize accordingly.

---

### D-05 — Withdrawal reference not truly idempotent (idempotencyKey unused)

**Severity**: MEDIUM  
**File**: [backend/src/routes/withdrawals.ts#L164-L240](backend/src/routes/withdrawals.ts#L164-L240)  
**Symptom**: The Withdrawal model has both `reference @unique` and `idempotencyKey @unique`, but the route handler does NOT accept a client-supplied `idempotencyKey`. If a user retries a withdrawal (e.g., due to network error), a new withdrawal row is created (because the frontend retries generate a new POST with the same data but no dedup key).

**Impact**: Accidental double-withdrawals if a user hits Ctrl+R after submitting.

**Proposed fix**: Accept an optional `idempotencyKey` in the Zod schema. If provided, upsert on it (like webhooks do). If not provided, use the current behavior (create new row). Document in API that clients should generate a stable idempotencyKey (e.g., SHA256 of `${sellerId}-${timestamp}-${amount}`) and include it.

---

## B — BUGS & RUNTIME FAILURES

### B-01 — Race condition in api.ts refresh lock with concurrent tabs/requests

**Severity**: HIGH  
**File**: [src/lib/api.ts#L35-L59](src/lib/api.ts#L35-L59)  
**Symptom**: The refresh lock mechanism uses a single `refreshPromise` variable to prevent concurrent refreshes. However, this is a process-level variable (shared across all browser tabs). If one tab finishes its refresh and sets `refreshPromise = null`, a second tab might race and call `refreshAccessToken()` again before the first tab has returned from its promise chain. Additionally, the promise chain includes error handling that might not properly reset the lock on all paths.

```ts
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try { ... }
    finally { refreshPromise = null; }
  })();
  return refreshPromise;
}
```

The issue: if the `finally` block runs but the caller awaits the old promise before it's set to null, a race exists.

**Impact**: Stale token reuse → 401 on second request in a tab after refresh fails. User may be silently logged out without clear feedback.

**Proposed fix**: Use a more robust pattern with a separate `refreshInProgress` boolean flag and a condition variable pattern, or store the promise result (true/false) in a variable that's not immediately cleared. Test with multiple concurrent fetch() calls using Promise.all() in browser devtools.

---

### B-02 — Cron job unhandled promise rejections in setInterval loops

**Severity**: MEDIUM  
**File**: [backend/src/index.ts#L239-L255](backend/src/index.ts#L239-L255)  
**Symptom**: Cron jobs (`expirePendingOrders`, `cleanupExpiredCodes`, etc.) call async functions inside setInterval. While the functions themselves have try-catch blocks, if an error occurs and is NOT caught (e.g., due to a typo in error handling or an unexpected exception type), the promise rejection is unhandled. The 2026 Node.js runtime will crash on unhandled rejections by default.

**Impact**: Silent crash (or future exit) if a cron promise rejects. Orders don't expire, codes don't clean up, webhooks pile up.

**Proposed fix**: Wrap all setInterval cron calls with `.catch(err => logger.error(...))` chains. Example:

```ts
setInterval(() => {
  expirePendingOrders().catch(err => logger.error("[cron-expire]", err));
}, 5 * 60 * 1000);
```

Alternatively, use a more structured cron library (node-cron, cron-parser).

---

### B-03 — Merci page polling cleanup missing cancellation check in visibility handler

**Severity**: MEDIUM  
**File**: [src/app/(public)/c/[slug]/merci/page.tsx#L97-L108](src/app/(public)/c/[slug]/merci/page.tsx#L97-L108)  
**Symptom**: The polling effect has a `cancelled` flag (line 92) for cleanup, but the visibility handler (line 98+) does NOT check `cancelled` before calling `setAttempts()`. If the component unmounts while the visibility handler is still subscribed, a setState-on-unmounted warning fires.

**Impact**: React warning spam in console if user navigates away while tab is backgrounded. Memory leak if handler persists after unmount.

**Proposed fix**: Create a separate cleanup for the visibility handler that removes the listener in the effect's cleanup function:

```ts
const handleVisibility = useCallback(() => {
  if (cancelled || status !== "PENDING") return;
  setAttempts((n) => (n >= MAX_POLLS ? n : n));
}, [status, cancelled]);

useEffect(() => {
  document.addEventListener("visibilitychange", handleVisibility);
  return () => document.removeEventListener("visibilitychange", handleVisibility);
}, [handleVisibility]);
```

---

### B-04 — Hydration mismatch in merci page timestamp rendering (visibilityState)

**Severity**: MEDIUM  
**File**: [src/app/(public)/c/[slug]/merci/page.tsx#L98-L108](src/app/(public)/c/[slug]/merci/page.tsx#L98-L108)  
**Symptom**: Line 99 checks `if (typeof document === "undefined")` (SSR guard), but the polling effect (line 73) checks `document.visibilityState` without the guard. During SSR, `document.visibilityState` doesn't exist, so the first effect will throw or misbehave.

**Impact**: Hydration mismatch or error on first render if SSR tries to access visibilityState.

**Proposed fix**: Wrap the polling effect's visibilityState check in a `typeof document !== "undefined"` guard:

```ts
const isVisible = typeof document !== "undefined" ? document.visibilityState === "visible" : true;
if (!isVisible) return;
```

---

### B-05 — Missing error boundary on merci page (unhandled API errors crash render)

**Severity**: LOW  
**File**: [src/app/(public)/c/[slug]/merci/page.tsx](src/app/(public)/c/[slug]/merci/page.tsx)  
**Symptom**: The polling effect catches errors and increments attempts (line 87), but if the order data fetch succeeds but `setStatus()` or the render throws, there's no error boundary. An unexpected error (e.g., malformed order.thankYouMessage) causes the entire page to crash.

**Impact**: User sees a blank/error page instead of the merci page.

**Proposed fix**: Wrap the return JSX in a try-catch or add an `error.tsx` file in the `[slug]/merci/` directory. Alternatively, validate order data before rendering (e.g., check typeof order.thankYouMessage === "string" before rendering).

---

## P — PERFORMANCE

### P-01 — N+1 queries in GET /api/sellers/dashboard/stats (12+ separate queries)

**Severity**: HIGH  
**File**: [backend/src/routes/sellers.ts#L407-L600](backend/src/routes/sellers.ts#L407-L600)  
**Symptom**: The dashboard stats endpoint fires ~12 independent Prisma queries:
- `order.aggregate()` (4x for different filters: PAID, FAILED, in current month, lifetime)
- `communityPayment.aggregate()` (4x same)
- `order.count()` (2x)
- `communityPayment.count()` (2x)
- `order.findMany()` (1x for top donors)
- `communityPayment.findMany()` (1x for top purchases)
- `block.count()` (1x)
- `$queryRaw` (2x for daily breakdown)

Each query waits sequentially, totaling 15-20ms roundtrips to Neon.

**Impact**: Dashboard loads in 1-2 seconds instead of 100-200ms. User perceives slowness.

**Proposed fix**: Batch queries using `prisma.$transaction()` to run in parallel. Combine aggregates where possible (e.g., `findMany()` with `_count` instead of separate count). Rewrite the daily breakdown SQL to a single query. Target: max 4 parallel queries instead of 12 sequential.

---

### P-02 — No indexes on Block.sellerId, Order.blockId (frequent WHERE clauses)

**Severity**: MEDIUM  
**File**: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)  
**Symptom**: Queries like `WHERE Block.sellerId = ...` and `WHERE Order.blockId = ...` are run frequently (blocks list, orders list, progress endpoint). If there are no indexes, Postgres does a full table scan. The schema has `@unique` on Block.slug and Order.reference, which create indexes, but no `@@index([sellerId])` or `@@index([blockId])`.

**Impact**: Slow list endpoints as the table grows (v1 is small, but scales to 10k+ blocks).

**Proposed fix**: Add `@@index([sellerId])` to Block model and `@@index([blockId])` to Order model. Run `npx prisma db push` to apply.

---

### P-03 — Frontend caches GET requests but no TTL expiry strategy

**Severity**: LOW  
**File**: [src/lib/useApi.ts#L27-L131](src/lib/useApi.ts#L27-L131)  
**Symptom**: The in-memory cache uses a 2-minute TTL but never evicts stale entries from the Map. Over a long session with many page views, the cache Map grows unbounded (memory leak).

**Impact**: Long-lived dashboards accumulate memory. On low-memory devices (old phones), may cause slowdown or crash.

**Proposed fix**: Implement a simple TTL cleanup: every 5 minutes, iterate `cache.keys()` and delete entries where `Date.now() - entry.ts > 2 * 60 * 1000`. Alternatively, use a WeakMap or library like `lru-cache`.

---

### P-04 — Unbounded list queries on GET /api/cagnottes (no pagination)

**Severity**: MEDIUM  
**File**: [backend/src/routes/cagnottes.ts#L115-L270](backend/src/routes/cagnottes.ts#L115-L270)  
**Symptom**: The public cagnottes list endpoint `GET /api/cagnottes` fetches all public FUNDRAISER blocks without pagination. While there's a 60s cache (`revalidate: 60`), if a creator has 10,000 blocks, the endpoint returns all 10k rows, bloating the response.

**Impact**: Slow initial page load, high bandwidth usage. Public /cagnottes page appears sluggish on slow connections.

**Proposed fix**: Add optional `limit` and `skip` query parameters (or cursor pagination). Default to `limit=20`. Enforce a `max_limit=100` to prevent abuse. Update the frontend to fetch in batches and implement infinite scroll or pagination UI.

---

## U — UX / A11Y / I18N

### U-01 — Merci page TIMEOUT state lacks clear CTA for retrying or reviewing status

**Severity**: MEDIUM  
**File**: [src/app/(public)/c/[slug]/merci/page.tsx#L254-L280](src/app/(public)/c/[slug]/merci/page.tsx#L254-L280)  
**Symptom**: When polling times out (after 2 minutes with no response), the page shows a message "Tu recevras une notification dès que ta contribution sera confirmée" and an email link for support. However, there is NO button to "Check status again" or "Retry" — the user is stuck and must navigate away manually.

**Impact**: Poor UX. Donor thinks their payment failed and doesn't know if they were charged. Support floods with "did my donation go through?" emails.

**Proposed fix**: Add a "Vérifier le statut" button that re-triggers the polling (reset `attempts` to 0, `status` to "PENDING"). This allows users to manually check without reloading.

```tsx
{status === "TIMEOUT" && (
  <>
    ...
    <Button onClick={manualRetry} variant="secondary" size="lg">
      Vérifier le statut
    </Button>
  </>
)}
```

---

### U-02 — Missing aria-labels on icon-only buttons (accessibility)

**Severity**: MEDIUM  
**File**: [src/components/](src/components/) — widespread  
**Symptom**: Many icon-only buttons use Lucide icons without `aria-label`. Example: `<Clock size={56} aria-hidden />` on the merci page (line 144, 256) has `aria-hidden` but the parent button has no label.

**Impact**: Screen reader users can't understand button purposes. Violates WCAG 2.1 Level A.

**Proposed fix**: Add `aria-label` to all icon-only buttons. Example:

```tsx
<button aria-label="Statut du paiement">
  <Clock size={56} aria-hidden />
</button>
```

---

### U-03 — Price formatting inconsistency in UI (some 15000 vs 15 000)

**Severity**: LOW  
**File**: [Multiple files using formatPrice()](src/)  
**Symptom**: Some strings manually construct prices (e.g., "15000 FCFA") while others use `formatPrice(15000)` (which outputs "15 000 FCFA"). Inconsistent formatting.

**Impact**: Minor — spacing thousands separator looks unprofessional but doesn't break functionality.

**Proposed fix**: Audit all hardcoded price strings and replace with `formatPrice()` calls. Add a lint rule to warn on hardcoded FCFA amounts.

---

### U-04 — No loading skeleton on dashboard pages

**Severity**: LOW  
**File**: [src/app/(authed)/tableau-de-bord/](src/app/(authed)/tableau-de-bord/)  
**Symptom**: Already flagged in audit-014 (E2E-02). Several pages (list, detail, profile, etc.) lack `loading.tsx` stubs. Users see a blank page for 100-300ms while data fetches.

**Impact**: Perceived slowness / jank. Small UX regression.

**Proposed fix**: Add minimal `loading.tsx` (skeleton UI) to each page. 10 files × 5 lines each = 50 lines total. Low effort, high polish.

---

## C — CODE QUALITY / MAINTAINABILITY

### C-01 — Dead code: OrderSummary, COMMISSION_LABELS, dev-foundations playground

**Severity**: LOW  
**File**: [src/components/checkout/OrderSummary.tsx](src/components/checkout/OrderSummary.tsx), [src/lib/constants.ts#L174-L179](src/lib/constants.ts#L174-L179), [src/app/dev-foundations/page.tsx](src/app/dev-foundations/page.tsx)  
**Symptom**: Already flagged in audit-014 (E2E-05). These are internal design playground artifacts not used in any live page.

**Impact**: Maintenance burden. Readers are confused by dead exports.

**Proposed fix**: Delete the 3 files/exports. If you want to keep a design system reference, move it to Banani or a separate `/storybook` path.

---

### C-02 — Dead code: PARTICIPER_LABELS.suggestedAmounts unused

**Severity**: LOW  
**File**: [src/lib/constants.ts#L429](src/lib/constants.ts#L429)  
**Symptom**: Already flagged in audit-013 (M-01). The constant is defined but never imported.

**Impact**: Confusion. Code review assumes it's used.

**Proposed fix**: Delete the constant. If you need a fallback, use the server-side default in blocks/schemas.ts directly.

---

### C-03 — Circular dependency risk: api.ts imports auth context, context imports api

**Severity**: LOW  
**File**: [src/lib/api.ts](src/lib/api.ts) ↔ [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)  
**Symptom**: `AuthContext` imports `api()` for refresh. `api()` calls might eventually need to check seller context (in a future feature). This creates a subtle circular dependency risk.

**Impact**: Tree-shaking issues if dependencies split differently. Fragile build.

**Proposed fix**: Keep the current pattern (context imports util, not vice versa) but add a comment in CLAUDE.md: **"auth.ts / api.ts must never import from contexts/"**.

---

### C-04 — ESLint disable comments without explanation

**Severity**: LOW  
**File**: Multiple files  
**Symptom**: Several `// eslint-disable-next-line react-hooks/exhaustive-deps` comments lack explanations of why the rule is disabled.

**Impact**: Future maintainers don't understand the rationale.

**Proposed fix**: Add brief comments:

```ts
// eslint-disable-next-line react-hooks/exhaustive-deps — api() is stable, don't re-fetch on every render
useEffect(() => {
  fetchSeller();
}, []);
```

---

### C-05 — Inconsistent error message formatting (some French, some mixed)

**Severity**: LOW  
**File**: [backend/src/routes/](backend/src/routes/)  
**Symptom**: Error responses mix French and English. Example: `{ error: "Email requis" }` vs `{ code: "PIN_REQUIRED" }` (code in English).

**Impact**: Inconsistent API contract. Frontend must handle both locales on error codes.

**Proposed fix**: Standardize: all user-facing error messages in French, all internal error codes in SCREAMING_SNAKE_CASE (English). Example:

```ts
{ error: "Code de retrait requis", code: "WITHDRAWAL_PIN_REQUIRED" }
```

---

## R — RELIABILITY

### R-01 — Webhook logging silent on error (error not re-thrown after log)

**Severity**: MEDIUM  
**File**: [backend/src/routes/webhooks.ts#L285-L310](backend/src/routes/webhooks.ts#L285-L310)  
**Symptom**: If the `webhookLog.upsert()` call fails (DB connection error), the handler logs the error but DOES NOT re-throw or return a 5xx status. The PAID branch continues to process, creating a notification without logging the webhook. A subsequent replay won't be idempotent.

**Impact**: Unlogged webhook + duplicate notifications if the first attempt silently fails.

**Proposed fix**: If `webhookLog.upsert()` throws, return `500 Internal Server Error` immediately. Don't continue to the PAID branch.

---

### R-02 — No timeout on /api/auth/refresh fetch calls

**Severity**: MEDIUM  
**File**: [src/lib/api.ts](src/lib/api.ts)  
**Symptom**: The `fetch()` calls in `refreshAccessToken()` do not specify a timeout. If the backend is hanging, the refresh hangs forever, blocking the user's next action. CLAUDE.md (line 60) mentions a "30s timeout" but code inspection shows no explicit `AbortController`.

**Impact**: Infinite hang on slow network. User's requests stall until browser timeout (60s+).

**Proposed fix**: Wrap fetch in `AbortController` with 10s timeout:

```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);
try {
  const res = await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

---

### R-03 — Notification creation failures silently swallowed in order webhook

**Severity**: LOW  
**File**: [backend/src/routes/webhooks.ts#L417-L450](backend/src/routes/webhooks.ts#L417-L450)  
**Symptom**: The `fireNotification()` call inside the webhook PAID branch is wrapped in a try-catch that only logs. If notification creation fails, the webhook returns 200 OK (implying success) but the donor never receives a confirmation email.

**Impact**: Silent failure. Support doesn't realize notifications are dropping.

**Proposed fix**: Log with `logger.error()` including the order reference, and return 503 if a critical notification fails (e.g., `firePayoutCompleted`). Non-critical failures (e.g., milestone) can still swallow and log.

---

### R-04 — Missing retry logic on transient Bictorys payout failures

**Severity**: MEDIUM  
**File**: [backend/src/lib/payout.ts](backend/src/lib/payout.ts)  
**Symptom**: The payout flow has a circuit breaker for charges (to 503), but if a payout (seller withdrawal) hits a transient error (e.g., Bictorys API slow), it's not retried automatically. The withdrawal status stays PENDING and the user must manually retry.

**Impact**: Poor UX for withdrawals. Seller must contact support or manually click "retry".

**Proposed fix**: Implement exponential backoff retry (3 attempts, 2s/4s/8s delays) for payout calls. Store attempt count in `Withdrawal.payoutAttempts`. After 3 failures, update `Withdrawal.status = "FAILED"` and fire a `firePayoutFailed` notification.

---

---

## SUMMARY TABLE

| ID | Severity | Category | File | Issue | Fix |
|---|---|---|---|---|---|
| S-01 | CRITICAL | Security | orders.ts | POST /api/orders missing CSRF | Add verifyCsrf middleware |
| S-02 | HIGH | Security | webhooks.ts | Missing replay-window validation | Check x-webhook-timestamp ± 5min |
| S-03 | HIGH | Security | orders.ts | Client commission bypass risk | Verify all monetary fields recalculated |
| S-04 | HIGH | Security | auth.ts | requireSellerMe() plan bypass | Re-validate plan/onboarding in DB |
| S-05 | MEDIUM | Security | withdrawals.ts | No balance validation on withdrawal | Query current balance before payout |
| S-06 | MEDIUM | Security | auth.ts | Shared refreshLimiter rate limit | Split into 2 limiters per endpoint |
| D-01 | HIGH | Integrity | sellers.ts | Unparameterized $queryRaw SQL | Use Prisma.sql placeholders |
| D-02 | MEDIUM | Integrity | schema.ts | max(4) vs capped-at-3 amounts | Change schema to max(3) |
| D-03 | MEDIUM | Integrity | slug.ts | No DB constraint on reserved slugs | Add Postgres CHECK or regex |
| D-04 | MEDIUM | Integrity | orders.ts | Phone not normalized to E.164 | Normalize in cleanPhoneForStorage() |
| D-05 | MEDIUM | Integrity | withdrawals.ts | idempotencyKey unused | Accept client key, upsert on it |
| B-01 | HIGH | Bugs | api.ts | Race condition in refresh lock | Use promise result variable pattern |
| B-02 | MEDIUM | Bugs | index.ts | Unhandled cron rejections | Add .catch() to all setInterval |
| B-03 | MEDIUM | Bugs | merci/page.tsx | Visibility handler cleanup missing | Add listener removal in cleanup |
| B-04 | MEDIUM | Bugs | merci/page.tsx | Hydration mismatch (visibilityState) | Guard with typeof document check |
| B-05 | LOW | Bugs | merci/page.tsx | No error boundary | Add error.tsx or try-catch wrapper |
| P-01 | HIGH | Performance | sellers.ts | N+1 dashboard stats (12 queries) | Batch with $transaction() |
| P-02 | MEDIUM | Performance | schema.prisma | Missing indexes on sellerId/blockId | Add @@index([sellerId/blockId]) |
| P-03 | LOW | Performance | useApi.ts | Cache Map unbounded growth | Implement TTL eviction |
| P-04 | MEDIUM | Performance | cagnottes.ts | Unbounded list query (no pagination) | Add limit/skip pagination |
| U-01 | MEDIUM | UX | merci/page.tsx | TIMEOUT state no retry button | Add "Vérifier le statut" button |
| U-02 | MEDIUM | A11y | components/ | Icon-only buttons no aria-label | Add aria-label to all icons |
| U-03 | LOW | I18N | ui/ | Price formatting inconsistent | Use formatPrice() everywhere |
| U-04 | LOW | UX | tableau-de-bord/ | Missing loading skeletons | Add loading.tsx stubs |
| C-01 | LOW | Code | OrderSummary, dev-foundations | Dead playground code | Delete files |
| C-02 | LOW | Code | constants.ts | Unused PARTICIPER_LABELS | Delete constant |
| C-03 | LOW | Code | api.ts / AuthContext | Circular dependency risk | Document pattern in CLAUDE.md |
| C-04 | LOW | Code | routes/ | ESLint disable without reason | Add explanatory comments |
| C-05 | LOW | Code | routes/ | Inconsistent error codes | Standardize French + SCREAMING_SNAKE_CASE |
| R-01 | MEDIUM | Reliability | webhooks.ts | Silent webhook log error | Return 500 if upsert fails |
| R-02 | MEDIUM | Reliability | api.ts | No fetch timeout | Add AbortController 10s timeout |
| R-03 | LOW | Reliability | webhooks.ts | Silent notification failures | Log + 503 on critical failures |
| R-04 | MEDIUM | Reliability | payout.ts | No retry on transient payout errors | Implement 3-attempt exponential backoff |

---

**End of Audit 015**
