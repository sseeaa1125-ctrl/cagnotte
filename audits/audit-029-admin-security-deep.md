# Audit 029 — Admin Dashboard: Deep Security, Scalability & Robustness Review

**Date:** 2026-04-16  
**Scope:** 25 admin dashboard files — backend routes, middleware, auth, frontend  
**Platform context:** Financial platform (FCFA fundraising, mobile money payouts)

---

## 1. SECURITY

---

### CRITICAL-01 — CSRF validation skipped when `izy-admin-csrf` cookie is absent

**File:** `backend/src/lib/adminAuth.ts`, `verifyAdminCsrf()`, lines ~183–198

```ts
if (cookieToken) {
  // timing-safe compare
} else {
  // ← falls through to next() — no cookie = no CSRF check
}
next(); // reached even when cookieToken is undefined
```

**Impact:** If an attacker tricks an admin into visiting a malicious page *before* the CSRF cookie is set (e.g., first login of the session, or after cookie was cleared by `clearAdminCsrfToken()`), ALL mutation endpoints (KYC approval, seller deletion, withdrawal retry, broadcast notifications, config writes) are vulnerable to CSRF. This is a complete bypass on a financial platform.

**Fix:** Treat missing cookie as an invalid token — return 403 when `cookieToken` is falsy.

```ts
if (!cookieToken) {
  res.status(403).json({ error: "Token CSRF invalide" });
  return;
}
```

---

### CRITICAL-02 — Authorization header fallback enables token exfiltration bypass

**File:** `backend/src/middleware/requireAdmin.ts`, lines ~322–330

```ts
if (!token) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
}
```

**Impact:** The admin auth system is designed around `httpOnly` cookies (not extractable by JS). The `Authorization: Bearer` fallback creates a path where a stolen token (e.g., from server-side logs, proxy, or JWT stored in localStorage by a misconfigured client) can be used. Worse, Bearer tokens bypass the SameSite cookie protection that CSRF relies on — a crafted cross-origin request with an `Authorization` header could authenticate if the attacker holds a token. This should be cookie-only for the admin surface.

**Fix:** Remove the `Authorization` header fallback entirely. Admin tokens are cookie-only by design.

---

### HIGH-01 — KYC approval race condition: no atomic transaction

**File:** `backend/src/routes/admin/kyc.ts`, lines ~1836–1876

```ts
// Step 1: Check status (non-atomic)
if (seller.kycStatus !== "PENDING") { return 409; }

// Step 2: Update (separate query — window between check and write)
await prisma.seller.update({ where: { id: sellerId }, data: { kycStatus: status } });

// Step 3: Fire notification (no rollback if this fails)
await fireKycApproved({ id: sellerId });
```

**Impact:** Two admins can simultaneously pass the "PENDING" check and both approve. The second update is a no-op but two `KYC_APPROVED` notifications fire, two log entries are created. On a financial platform this can cause a seller to erroneously believe they have double approval or bypass fraud checks.

**Fix:** Wrap check + update in a `$transaction` with `updateMany({ where: { id, kycStatus: "PENDING" } })` — check `count === 0` to detect the race.

---

### HIGH-02 — `config` PUT accepts arbitrary key names — no allowlist

**File:** `backend/src/routes/admin/config.ts`, lines ~1913–1929

```ts
const key = req.params.key as string; // unsanitized
const upsertSchema = z.object({ value: z.unknown() }); // completely open value
await prisma.platformConfig.upsert({ where: { key }, update: { value }, create: { key, value } });
```

**Impact:** A compromised SUPER_ADMIN (or a CSRF bypass via CRITICAL-01) can insert arbitrary keys and arbitrary JSON values into `PlatformConfig`. If any backend logic reads config values and uses them to control behavior (commission rates, feature flags, allowed amounts), an attacker can manipulate platform behavior. `z.unknown()` provides zero type safety on the stored value.

**Fix:** Add a Zod enum allowlist of valid config keys and a per-key value schema (e.g. `commission_rate` must be a number in [0,5000]).

---

### HIGH-03 — Admin logout does not invalidate the server-side cache

**File:** `backend/src/routes/admin/auth.ts` (logout), `backend/src/middleware/requireAdmin.ts` (cache)

```ts
// logout route
adminAuthRouter.post("/logout", (_req, res) => {
  clearAdminAuthCookies(res);  // clears cookies only
  clearAdminCsrfCookie(res);
  res.json({ ok: true });
});
// Cache TTL = 30s — no eviction on logout
```

**Impact:** After logout, the access token (15 min) + cached DB entry (30s) remain valid server-side. If a token is replayed within 30s of logout (e.g., from another tab, or intercepted), `requireAdmin` will serve from cache and grant access without a DB check. For a financial admin panel this is an unacceptable window.

**Fix:** On logout, explicitly delete the admin's entry from `adminCache` (pass admin ID from the verified token). Also consider a short-lived token denylist (Redis key `admin:revoked:<jti>`) keyed on JWT `jti` claim.

---

### HIGH-04 — Admin users endpoint: no pagination — unbounded SELECT on `Admin` table

**File:** `backend/src/routes/admin/users.ts`, lines ~2358–2373

```ts
const admins = await prisma.admin.findMany({
  select: { id, email, name, role, isActive, createdAt, updatedAt },
  orderBy: { createdAt: "desc" },
  // ← no take/skip
});
```

**Impact:** While the Admin table is small today, this pattern is a scalability landmine and leaks every admin account's email and name in one response. Consistent with the logs endpoint issue (MEDIUM-03), this is also a policy violation — an ADMIN-role user can enumerate all SUPER_ADMIN email addresses.

**Fix:** Add `take: 100` maximum and pagination. Restrict email field for non-SUPER_ADMIN callers.

---

### HIGH-05 — Logs endpoint leaks all admin identities on every paginated request

**File:** `backend/src/routes/admin/logs.ts`, lines ~1519–1530

```ts
// Always fetched regardless of pagination — no limit
const admins = await prisma.admin.findMany({
  select: { id: true, name: true, email: true },
  orderBy: { name: "asc" },
});
const distinctActions = await prisma.adminLog.findMany({
  distinct: ["action"], select: { action: true }, orderBy: { action: "asc" },
});
```

**Impact:** Every GET to `/api/admin/logs` (even page 100 of results) returns the full list of admin accounts with email addresses, and every distinct action string ever logged. An ADMIN-role user can enumerate SUPER_ADMIN emails. The `distinctActions` query will grow unboundedly over time.

**Fix:** Move admin/action dropdown data to a separate endpoint or cache it. Add `take` limit.

---

### HIGH-06 — Sellers GET list uses manual `parseInt` without Zod — no validation on query params

**File:** `backend/src/routes/admin/sellers.ts`, lines ~1047–1083

```ts
const page = Math.max(1, parseInt(req.query.page as string) || 1);
const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
// search is used directly in Prisma contains — not Zod-validated
const search = (req.query.search as string)?.trim();
```

**Impact:** While `search` goes through Prisma ORM (safe from SQL injection), there is no length cap on the search string. A 1MB search string will be sent to PostgreSQL `ILIKE`. No Zod schema means inconsistent validation and harder future maintenance. Other list endpoints (cagnottes, sellers detail) have the same pattern.

**Fix:** Introduce a Zod schema for query params matching the logs router pattern (`listQuerySchema`). Add `z.string().max(200)` on search.

---

### MEDIUM-01 — JWT tokens share the same secret across admin and seller surfaces

**File:** `backend/src/lib/adminAuth.ts`, line ~53

```ts
import { JWT_SECRET_BYTES } from "./auth.js"; // same secret as seller tokens
```

**Impact:** A leaked seller JWT secret also compromises admin tokens. The `aud: "admin"` claim provides separation at the application layer, but if the secret is shared and `verifyAdminToken` has a bug in audience checking, seller tokens could be replayed as admin tokens. Defense-in-depth requires separate secrets.

**Fix:** Add `ADMIN_JWT_SECRET` env var and use it exclusively for `createAdminAccessToken` / `verifyAdminToken`.

---

### MEDIUM-02 — No `jti` (JWT ID) claim on admin tokens — no revocation capability

**File:** `backend/src/lib/adminAuth.ts`

**Impact:** There is no way to revoke individual admin tokens before expiry. If a SUPER_ADMIN's token is compromised, the only option is to deactivate the account (requires another SUPER_ADMIN) and wait up to 15 minutes. On a financial platform with actions like seller deletion and config writes, this window is significant.

**Fix:** Add `.setJti(crypto.randomUUID())` to token creation. Store revoked JTIs in Redis with TTL matching token expiry. Check on each request in `requireAdmin`.

---

### MEDIUM-03 — Middleware only checks cookie existence, not validity

**File:** `src/middleware.ts`, lines ~2969–2973

```ts
if (isAdminPath && !isAdminPublic && !request.cookies.get(ADMIN_ACCESS_COOKIE)) {
  // redirect to /admin/connexion
}
```

**Impact:** The Next.js middleware only checks that the `izy-admin-token` cookie *exists*, not that it's a valid, unexpired JWT. An attacker with a forged or expired cookie can bypass the Next.js redirect gate and reach admin page components (server-side `requireAdminMe()` is the real gate, but this is defense-in-depth gap). The real auth check happens on the backend, but the UI is served to the browser before the backend validates — leaking the admin UI structure to unauthorized users.

**Fix:** This is acceptable as-is since `requireAdminMe()` validates server-side before rendering data. Document this explicitly as "UI gate only."

---

### MEDIUM-04 — Broadcast notification has no batch size / rate limit — DoS potential

**File:** `backend/src/routes/admin/notifications.ts` (broadcast endpoint, line ~2998+ — content was cut off)

**Impact (inferred from architecture):** A `POST /api/admin/notifications/broadcast` that calls `Promise.allSettled(sellers.map(s => createNotification(s.id, ...)))` with no chunking will:
- Load all active sellers into memory (100k rows = OOM risk)
- Saturate the Neon connection pool (max ~10 concurrent connections)
- Trigger notification dispatch for all sellers simultaneously

**Fix:** Use a batched queue: insert notification jobs into the Upstash queue in chunks of 100, process asynchronously. Add a `SUPER_ADMIN`-only gate on broadcast.

---

### MEDIUM-05 — CSRF token stored in `localStorage` — XSS leakage vector

**File:** `src/lib/adminApi.ts`, lines ~218–224

```ts
export function storeAdminCsrfToken(token: string): void {
  localStorage.setItem("izy-admin-csrf", token);
  // also sets cookie
}
function getAdminCsrfToken(): string | null {
  const fromStorage = localStorage.getItem("izy-admin-csrf");
  if (fromStorage) return fromStorage;
  // falls back to cookie
}
```

**Impact:** Storing the CSRF token in `localStorage` means any XSS vulnerability in the admin panel (even a third-party dependency) can exfiltrate the CSRF token and use it to perform authenticated mutations. The CSRF token's purpose is to be inaccessible to malicious cross-origin scripts; `localStorage` is not scoped by SameSite policy.

**Fix:** Remove `localStorage` fallback entirely. Read only from the `izy-admin-csrf` cookie (readable by JS by design — `httpOnly: false`). The cookie is already set on login.

---

### MEDIUM-06 — `requireRole` double-invokes `requireAdmin` — potential double DB query + response-already-sent crash

**File:** `backend/src/middleware/requireAdmin.ts`, lines ~1659–1666

```ts
export function requireRole(...roles: string[]) {
  return async (req, res, next) => {
    await requireAdmin(req, res, () => {
      // requireAdmin calls next() = this callback
      // then requireRole checks req.admin.role
    });
  };
}
```

**Impact:** When `requireRole` is used as the *only* middleware (e.g., `configRouter.use(requireRole("SUPER_ADMIN"))`), `requireAdmin` is invoked inside `requireRole`. If a route handler also calls `requireAdmin` separately (or if CSRF middleware also triggers), `requireAdmin` runs twice per request. More critically: if `requireAdmin` sends a 401/403 response and *also* calls the inner callback, Express will emit "Cannot set headers after they are sent." This is a robustness bug.

**Fix:** `requireRole` should trust that `requireAdmin` has already run and simply check `req.admin?.role`. Chain middlewares explicitly: `router.use(requireAdmin, requireRole("SUPER_ADMIN"))`.

---

### LOW-01 — Seller soft-delete has no cascade on active sessions / cagnottes

**File:** `backend/src/routes/admin/sellers.ts`, lines ~2757–2793

```ts
await prisma.seller.update({ where: { id }, data: { deletedAt: new Date() } });
```

**Impact:** After soft-delete, the seller's existing access token (15 min) remains valid since `requireAuth` checks `deletedAt` only if the middleware was written to do so. Need to verify that `requireAuth` includes `deletedAt: null` in the re-query. Additionally, active cagnottes remain publicly visible and able to receive donations — sellers should be blocked at the cagnotte level too.

**Fix:** Verify `requireAuth` guards `deletedAt`. On soft-delete, also set `Block.isActive = false` for all seller blocks. Optionally evict seller from the auth cache.

---

### LOW-02 — Admin login does not log failed attempts

**File:** `backend/src/routes/admin/auth.ts`, lines ~1316–1348

```ts
if (!admin) {
  res.status(401).json({ error: "Identifiants invalides" });
  return;
}
if (!admin.isActive) { ... return; }
const isValid = await verifyPassword(data.password, admin.passwordHash);
if (!isValid) {
  res.status(401).json({ error: "Identifiants invalides" });
  return; // ← no logAdminAction here
}
```

**Impact:** Failed logins (wrong password, inactive account) are not logged to `AdminLog`. Rate limiting (5/15min) is in place, but without audit logs, there's no forensic trail of brute-force attempts against admin accounts.

**Fix:** Add `logAdminAction(null, "LOGIN_FAILED", ...)` on failed attempts. Use a nullable `adminId` in `AdminLog` (or use a sentinel system-level ID).

---

## 2. SCALABILITY

---

### MEDIUM-S01 — Dashboard KPIs: 5 aggregate queries on every page load — no caching

**File:** `backend/src/routes/admin/dashboard.ts`

5 parallel `COUNT`/`aggregate` queries on full tables (`Order`, `Seller`, `Block`, `Withdrawal`) run on every dashboard load. As the platform scales:
- `Order.aggregate` (sum all PAID amounts) is a full table scan without index on `paymentStatus + amount`
- No `Cache-Control` or server-side cache — every tab refresh hits the DB

**Fix:** Cache KPIs in Redis for 60s. Add composite index `(paymentStatus, paidAt)` on `Order`.

---

### MEDIUM-S02 — Revenue chart uses `$queryRaw` — acceptable but bigint serialization risk

**File:** `backend/src/routes/admin/dashboard.ts`, lines ~2479–2500

`SUM(amount)` returns `bigint` in PostgreSQL. The code converts via `Number(row.revenue)`. For very large amounts (>2^53 FCFA), this loses precision silently.

**Fix:** Use `BigInt.toString()` and let the frontend parse as string, or cap at `Number.MAX_SAFE_INTEGER` with a warning.

---

### LOW-S01 — Logs endpoint makes 4 queries per request (paginated logs + count + all admins + all distinct actions)

Already documented under HIGH-05. At scale with many admin actions, `distinctActions` scan and `admins` fetch add unnecessary latency.

---

## 3. ROBUSTNESS

---

### HIGH-R01 — KYC route missing try/catch

**File:** `backend/src/routes/admin/kyc.ts`, lines ~1804–1821 (GET /)

```ts
kycRouter.get("/", async (req: Request, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  // ... await prisma.seller.findMany(...)
  // NO try/catch — unhandled rejection crashes the route
});
```

**Impact:** Any Prisma error (network blip, Neon timeout) on the KYC list endpoint results in an unhandled promise rejection, Express 5 will propagate it but the error response may expose stack traces if `NODE_ENV !== production`.

**Fix:** Wrap in `try/catch`.

---

### MEDIUM-R01 — Admin deactivation does not evict from cache immediately

**File:** `backend/src/routes/admin/users.ts` + `backend/src/middleware/requireAdmin.ts`

When `PATCH /api/admin/users/:id` sets `isActive: false`, the target admin's cache entry has up to 30s TTL remaining. During this window, the deactivated admin can still make requests without a DB hit.

**Fix:** After updating `isActive`, call `adminCache.delete(id)` directly. Export `adminCache` or add an `evictAdmin(id)` function from the module.

---

### MEDIUM-R02 — Concurrent admin creation with same email not atomic

**File:** `backend/src/routes/admin/users.ts`, lines ~2387–2410

```ts
const existing = await prisma.admin.findUnique({ where: { email } });
if (existing) { return 409; }
// ← Race window
await prisma.admin.create({ data: { email, ... } });
```

**Impact:** Two simultaneous SUPER_ADMIN requests could both pass the existence check and one will fail with a Prisma unique constraint error (P2002) — which is currently unhandled and would return a 500 instead of 409.

**Fix:** Catch `P2002` error code and return 409. Or use `upsert` with `create`-only semantics via a transaction.

---

### LOW-R01 — Frontend `handleLogout` ignores CSRF on POST to `/api/admin/auth/logout`

**File:** `src/app/(admin)/...AdminShell`, lines ~2872–2883

```ts
async function handleLogout() {
  await fetch("/api/admin/auth/logout", {
    method: "POST",
    credentials: "include",
    // ← no x-csrf-token header
  });
}
```

**Impact:** The logout POST goes through `verifyAdminCsrf`. If the CSRF cookie is present, this will fail with 403. The code silently ignores the error (`catch { // ignore }`), clears the local CSRF token, and redirects — leaving the server-side session alive. The admin appears logged out but their token remains valid.

**Fix:** Include the CSRF token in the logout request using `getAdminCsrfToken()`. Or exempt `/auth/logout` from CSRF (logout doesn't need CSRF protection if tokens are validated — it's already the case since the auth router is mounted before CSRF middleware, so this is actually safe as-is. Verify that `/api/admin/auth/logout` is under `/auth` which is pre-CSRF. **Confirmed safe from the barrel file** — `adminRouter.use("/auth", adminAuthRouter)` is mounted before `adminRouter.use(verifyAdminCsrf)`. LOW priority only.

---

## Summary Table

| ID | Severity | File | Issue |
|----|----------|------|-------|
| CRITICAL-01 | CRITICAL | `adminAuth.ts` | CSRF bypass when cookie absent |
| CRITICAL-02 | CRITICAL | `requireAdmin.ts` | Bearer header bypasses cookie-only design |
| HIGH-01 | HIGH | `kyc.ts` | KYC approval race condition — no transaction |
| HIGH-02 | HIGH | `config.ts` | Unrestricted config key/value upsert |
| HIGH-03 | HIGH | `auth.ts` + `requireAdmin.ts` | Logout doesn't evict server cache |
| HIGH-04 | HIGH | `users.ts` | Unbounded admin list — no pagination |
| HIGH-05 | HIGH | `logs.ts` | All admins + all actions leaked per paginated request |
| HIGH-06 | HIGH | `sellers.ts` | No Zod on list query params; unbounded search string |
| MEDIUM-01 | MEDIUM | `adminAuth.ts` | Shared JWT secret with seller tokens |
| MEDIUM-02 | MEDIUM | `adminAuth.ts` | No `jti` — no token revocation |
| MEDIUM-03 | MEDIUM | `middleware.ts` | Next.js gate checks cookie existence not validity |
| MEDIUM-04 | MEDIUM | `notifications.ts` | Broadcast notification — no batching, OOM risk |
| MEDIUM-05 | MEDIUM | `adminApi.ts` | CSRF token in localStorage — XSS exfiltrable |
| MEDIUM-06 | MEDIUM | `requireAdmin.ts` | `requireRole` double-invokes `requireAdmin` |
| MEDIUM-S01 | MEDIUM | `dashboard.ts` | KPI queries uncached — full table scans per request |
| MEDIUM-S02 | MEDIUM | `dashboard.ts` | bigint precision loss in revenue chart |
| MEDIUM-R01 | MEDIUM | `users.ts` | Deactivation doesn't evict from middleware cache |
| MEDIUM-R02 | MEDIUM | `users.ts` | Admin creation race — P2002 unhandled |
| HIGH-R01 | HIGH | `kyc.ts` | GET / missing try/catch |
| LOW-01 | LOW | `sellers.ts` | Soft-delete no cascade to blocks/sessions |
| LOW-02 | LOW | `auth.ts` | Failed logins not logged |
| LOW-R01 | LOW | `AdminShell` | Logout omits CSRF header (safe due to route ordering) |
| LOW-S01 | LOW | `logs.ts` | 4 queries per paginated request |

**Priority order for a financial platform:**  
CRITICAL-01 → CRITICAL-02 → HIGH-03 → HIGH-01 → HIGH-R01 → HIGH-02 → HIGH-05 → MEDIUM-05
