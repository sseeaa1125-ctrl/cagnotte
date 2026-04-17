# Audit 030 -- Infrastructure, Configuration & Cross-Cutting Quality Review

**Date:** 2026-04-16
**Reviewer:** Claude (gsd-code-reviewer)
**Scope:** package.json, tsconfig, Prisma schema, env config, Docker, git hygiene, middleware chain, error handling, logging, scripts, ESLint, dead code

---

## CRITICAL

### CR-01: No global Express error handler

**File:** `backend/src/index.ts`
**Issue:** The Express app has no error-handling middleware (`app.use((err, req, res, next) => {...})`). Any unhandled synchronous throw in a route handler or middleware will produce a raw Express 500 with HTML stack trace in development and a generic error in production, potentially leaking internals. Express 5 does handle rejected async route promises, but synchronous throws and middleware errors still need an explicit handler.
**Severity:** CRITICAL
**Fix:** Add a global error handler at the bottom of the middleware chain (before `app.listen`):

```typescript
// Global error handler — must be 4-arg signature for Express to recognize it
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("[unhandled-route-error]", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Erreur interne du serveur" });
});
```

### CR-02: No process-level signal handlers or graceful shutdown

**File:** `backend/src/index.ts`
**Issue:** No `process.on("SIGTERM")`, `process.on("SIGINT")`, `process.on("uncaughtException")`, or `process.on("unhandledRejection")` handlers exist anywhere in the backend. On Railway (or any container platform), a SIGTERM is sent before kill. Without handling it, in-flight requests are dropped, Prisma connections are not cleanly closed, and background cron timers are not cleared. An unhandled rejection in Node 20+ defaults to `--unhandled-rejections=throw`, which crashes the process without cleanup.
**Severity:** CRITICAL
**Fix:**

```typescript
async function gracefulShutdown(signal: string) {
  logger.log(`[shutdown] ${signal} received, draining...`);
  // Stop accepting new connections
  server.close(() => logger.log("[shutdown] HTTP server closed"));
  // Disconnect Prisma
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error("[unhandledRejection]", reason instanceof Error ? reason : new Error(String(reason)));
});
```

Store the return value of `app.listen()` as `const server = app.listen(...)`.

---

## HIGH

### HI-01: Google Client Secret in local backend/.env (not committed, but still present)

**File:** `backend/.env:35`
**Value:** `GOOGLE_CLIENT_SECRET="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"`
**Issue:** While `backend/.env` is correctly gitignored and NOT tracked, this is a real Google OAuth client secret sitting in a local file. The `.env.example` does not even list Google credentials, suggesting this is a leftover from the fari.store fork. If this secret is still valid, it should be rotated in the Google Cloud Console. Additionally, `backend/.env` contains this credential for a feature (Google Calendar integration) that is documented as removed from the cagnottes.sn fork.
**Severity:** HIGH (secret hygiene -- not a committed secret, but a rotation concern)
**Fix:** Rotate this secret in Google Cloud Console. Remove the `GOOGLE_CLIENT_SECRET` and `GOOGLE_CLIENT_ID` lines from `backend/.env` since Google integration is not used.

### HI-02: Redundant `@@index([slug])` on Block model

**File:** `backend/prisma/schema.prisma:189`
**Issue:** `Block.slug` has `@unique` on line 163, which already creates a unique index. The explicit `@@index([slug])` on line 189 is a redundant index consuming storage and write overhead. The schema author already noted and removed similar redundancies on `Seller` (line 126 comment) but missed this one.
**Severity:** HIGH (wasted DB resources on every Block write)
**Fix:** Remove line 189 (`@@index([slug])`) and run `npx prisma db push`.

### HI-03: Backend Dockerfile does not copy the generated Prisma client correctly

**File:** `backend/Dockerfile:19-20`
**Issue:** The builder stage generates Prisma client into `src/generated/prisma/` (per schema.prisma `output = "../src/generated/prisma"`). The compiled JS in `dist/` imports from `../generated/prisma/client.js` (relative to `dist/`). The runner stage copies `dist/` and `node_modules/` but does NOT copy `src/generated/`. The `COPY --from=builder /app/dist ./dist` will contain the compiled TS output, but the Prisma generated client lives in `src/generated/`, not `dist/`. The app will crash at startup with a module-not-found error.
**Severity:** HIGH
**Fix:** Add the generated client to the runner stage:

```dockerfile
COPY --from=builder /app/src/generated ./src/generated
```

Or adjust the Prisma output to land inside `node_modules/.prisma/client` (default) so it ships with `node_modules/`.

---

## MEDIUM

### ME-01: `kycStatus` stored as free-text String instead of Prisma enum

**File:** `backend/prisma/schema.prisma:58`
**Issue:** `Seller.kycStatus` is `String @default("NONE")` with valid values documented in a comment (`NONE | PENDING | APPROVED | REJECTED`). This should be a Prisma enum for type safety and DB-level constraint enforcement. Currently, any string can be written to this column (e.g., a typo like `"APPROVE"` would silently succeed).
**Severity:** MEDIUM
**Fix:** Create an enum `KycStatus { NONE PENDING APPROVED REJECTED }` and change the field to `kycStatus KycStatus @default(NONE)`.

### ME-02: `Report.status` and `Report.reason` stored as free-text Strings

**File:** `backend/prisma/schema.prisma:1035-1038`
**Issue:** Same pattern as ME-01. `Report.status` (`PENDING | REVIEWED | DISMISSED`) and `Report.reason` (`SPAM | SCAM | INAPPROPRIATE | IMPERSONATION | OTHER`) are free-text strings. Both should be enums.
**Severity:** MEDIUM

### ME-03: Logger suppresses ALL non-error output in production

**File:** `backend/src/lib/logger.ts:20-24`
**Issue:** The `log()` function is completely silenced in production (`if (!IS_PROD)`). This means all operational messages -- cron completion counts, reconciliation outcomes, order expirations -- produce zero output in production. Only `warn()` and `error()` emit. This makes production debugging very difficult. Consider adding an `info()` level that emits in production (with redaction).
**Severity:** MEDIUM
**Fix:** Add an `info()` function that logs in production with redaction, and use it for important operational messages (cron results, startup banners, etc.):

```typescript
export function info(message: string, ...args: unknown[]): void {
  if (IS_PROD) {
    console.info(redact(message));
  } else {
    console.info(message, ...args);
  }
}
```

### ME-04: No ESLint configuration for the backend

**File:** `eslint.config.mjs:26`
**Issue:** The root ESLint config explicitly ignores `backend/**`. There is no separate ESLint config inside `backend/`. The backend codebase (Express routes, Prisma queries, crypto, auth) has zero linting coverage. TypeScript compiler catches type errors, but linting rules (no-console, no-unused-vars, consistent-return, etc.) are absent.
**Severity:** MEDIUM
**Fix:** Add `backend/eslint.config.mjs` with `@typescript-eslint/recommended` rules at minimum.

### ME-05: `withdrawals` route missing `requireAuth` middleware

**File:** `backend/src/index.ts:168`
**Issue:** The withdrawals route is mounted as `app.use("/api/withdrawals", verifyCsrf, withdrawalsRouter)` -- it has CSRF protection but no `requireAuth` at the router level. If the individual route handlers inside `withdrawalsRouter` don't all independently call `requireAuth`, unauthenticated requests could reach withdrawal logic. Compare with other protected routes: `sellersRouter`, `notificationsRouter`, `blocksRouter`, and `uploadRouter` all have `writeLimiter` applied; withdrawals also skips `writeLimiter`.
**Severity:** MEDIUM
**Fix:** Verify that `withdrawalsRouter` internally applies `requireAuth` on every handler. If not, add it at mount: `app.use("/api/withdrawals", requireAuth, writeLimiter, verifyCsrf, withdrawalsRouter)`.

### ME-06: Duplicate health check endpoints

**File:** `backend/src/index.ts:91-93` and `backend/src/index.ts:202-204`
**Issue:** Two health check endpoints exist: `GET /health` (line 91) and `GET /api/health` (line 202). They return slightly different shapes (`{ ok: true }` vs `{ status: "ok", timestamp: ... }`). This is confusing for monitoring configuration.
**Severity:** MEDIUM (maintenance confusion)
**Fix:** Consolidate to a single endpoint. If `/health` is needed for platform probes, keep it above rate limiters. Remove `/api/health` or make it redirect.

---

## LOW

### LO-01: Frontend `sanitize-html` and `@tiptap/*` dependencies may be unnecessary

**File:** `package.json:12-14,22`
**Issue:** Tiptap (rich text editor) and sanitize-html are frontend dependencies, but per CLAUDE.md the frontend is "a skeleton awaiting Banani design integration." These packages add ~500KB to the install. `src/components/ui/RichTextEditor.tsx` and `src/lib/sanitize.ts` exist but may be premature. This is not a bug, but dead weight if Banani does not use Tiptap.
**Severity:** LOW

### LO-02: `file-type` pinned to v16 (CJS) in backend

**File:** `backend/package.json:14`
**Issue:** `file-type` v16.5.4 is the last CJS version. The backend is ESM (`"type": "module"`). While v16 works via esModuleInterop, this pin prevents security patches from v17+ (which is ESM-native). Consider migrating to the current ESM version.
**Severity:** LOW

### LO-03: Auth cache in `requireAuth` is unbounded

**File:** `backend/src/middleware/auth.ts:17-28`
**Issue:** The `authCache` Map grows without bound (cleanup runs every 5 minutes by expiry, but between cleanups, every unique seller ID adds an entry). Under normal traffic this is fine, but there is no `maxSize` cap. A theoretical attack flooding with valid but distinct JWTs could grow memory.
**Severity:** LOW (theoretical; mitigated by JWT verification cost)

### LO-04: Backend scripts directory contains many leftover scripts

**File:** `backend/scripts/`
**Issue:** 28 scripts exist, many from the fari.store fork or one-off debugging: `cleanup-subs.ts`, `simulate-community-billing.ts`, `cleanup-test-data.ts`, `migrate-inbox-read.ts`, `introspect-phase1.ts`, `test-bictorys-debug.ts`, `test-bictorys-country.ts`, etc. These reference dead models (Community, Subscription) and create maintenance confusion.
**Severity:** LOW
**Fix:** Archive or delete scripts for removed features. Keep: `seed-dev.ts`, `smoke-test.ts`, `approve-kyc.ts`, `create-admin.ts`, `seed-simulation.ts`.

### LO-05: Frontend `.env.example` has inconsistent `NEXT_PUBLIC_BASE_URL`

**File:** `.env.example:2`
**Issue:** `NEXT_PUBLIC_BASE_URL=https://cagnottes.sn` is set to the production URL in the example file. Developers copying this file as `.env.local` will have a production base URL in development, which could cause OG image generation or link building to point to production.
**Severity:** LOW
**Fix:** Change to `NEXT_PUBLIC_BASE_URL=http://localhost:3000` with a comment noting to change for production.

---

## INFO

### IN-01: TypeScript configs are well-configured

Both `tsconfig.json` (frontend) and `backend/tsconfig.json` have `strict: true` enabled. Frontend targets ES2017 (appropriate for Next.js), backend targets ES2022 (appropriate for Node 22). Path aliases configured correctly. No issues.

### IN-02: Prisma schema -- no Float for money (clean)

All monetary fields (`amount`, `price`, `commissionAmount`, `sellerAmount`, `merchantFee`, etc.) are `Int`. No `Float` types found. This is correct per the FCFA integer requirement.

### IN-03: .gitignore coverage is adequate

`.env*` files are properly gitignored (with `!.env.example` exception). `backend/.gitignore` covers `node_modules/`, `dist/`, `src/generated/`, `.env`, `.env.*`. No `.env` files are tracked in git history.

### IN-04: CORS configuration is solid

Production boot guard (line 52-63) rejects wildcard origins and non-HTTPS origins. Origin callback uses allowlist comparison. `credentials: true` with explicit `allowedHeaders`. `maxAge: 86400` (24h preflight cache). Well-implemented.

### IN-05: Middleware ordering is correct

The chain follows security best practices: Helmet -> CORS -> compression -> raw body (webhooks only) -> JSON parser -> cookie parser -> rate limiters -> routes. Health check is placed before rate limiters. CSRF is applied per-route (not globally), allowing webhooks and public order creation to bypass it correctly.

### IN-06: Seed and smoke-test scripts are high quality

`seed-dev.ts` is idempotent, uses upserts, has `--reset` flag, and is well-documented. `smoke-test.ts` covers 15 assertions, has proper cleanup in `finally`, resets rate limiters, and handles cookie/CSRF correctly. Both scripts properly disconnect Prisma on exit.

---

## Summary

| Severity | Count | Key Themes |
|----------|-------|------------|
| CRITICAL | 2 | Missing error handler, no graceful shutdown |
| HIGH     | 3 | Dockerfile bug, redundant index, stale secret |
| MEDIUM   | 6 | Missing enum constraints, no backend linting, logger gap |
| LOW      | 5 | Dead dependencies, unbounded cache, stale scripts |
| INFO     | 6 | Positive findings (strict TS, correct money types, good CORS) |

**Overall assessment:** The infrastructure is generally solid -- security fundamentals (CORS, CSRF, cookie auth, rate limiting, webhook verification) are well-implemented. The two critical gaps (no error handler, no graceful shutdown) are standard Express oversights that should be fixed before production traffic. The Dockerfile Prisma client bug (HI-03) will prevent containerized deployment from working at all.
