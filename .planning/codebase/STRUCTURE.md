# Codebase Structure

**Analysis Date:** 2026-04-13

## Directory Layout

```
cagnottes-sn/
├── src/                         # Next.js 16 frontend (App Router)
│   ├── app/                     # Route segments + layout
│   │   ├── layout.tsx           # Root layout (ToastProvider, metadata)
│   │   ├── page.tsx             # Placeholder homepage (awaiting Banani)
│   │   ├── error.tsx            # Error boundary
│   │   ├── not-found.tsx        # 404 page
│   │   ├── robots.ts            # SEO robots.txt
│   │   └── api/
│   │       └── pay-redirect/    # TikTok WebView payment redirect workaround
│   │           └── route.ts
│   ├── contexts/                # React Context providers
│   │   ├── AuthContext.tsx      # User + token state
│   │   └── ToastContext.tsx     # Toast notifications
│   ├── lib/                     # Frontend utilities
│   │   ├── api.ts              # HTTP client (auto-refresh, CSRF, timeout, retry)
│   │   ├── useApi.ts           # Hook wrapper for api() with SWR cache
│   │   ├── utils.ts            # Helper functions (cn, formatPrice, isInAppBrowser)
│   │   ├── constants.ts        # French labels, operators
│   │   └── types/
│   │       └── index.ts        # Shared interfaces
│   ├── middleware.ts            # Next.js middleware (slug lowercase normalization)
│   ├── globals.css              # Tailwind CSS
│   └── [deleted routes]/        # Removed: admin/, communities, partnerships, etc.
├── backend/                     # Express 5 REST API
│   ├── src/
│   │   ├── index.ts            # Express app setup, middleware chain, background jobs
│   │   ├── routes/             # HTTP route handlers
│   │   │   ├── auth.ts         # Login, signup, refresh, logout, password reset, email verification
│   │   │   ├── blocks.ts       # CRUD for fundraiser blocks + progress endpoint
│   │   │   ├── orders.ts       # Create donation → Bictorys charge, fetch order status
│   │   │   ├── sellers.ts      # Seller profile CRUD, store listing
│   │   │   ├── webhooks.ts     # Bictorys payment confirmation + legacy order type dispatch
│   │   │   ├── withdrawals.ts  # Initiate payout, track withdrawal status
│   │   │   ├── upload.ts       # File upload to R2
│   │   │   └── files.ts        # R2 file proxy (public access)
│   │   ├── middleware/
│   │   │   └── auth.ts         # requireAuth: JWT verify + stale JWT bypass prevention
│   │   ├── lib/                # Business logic & integrations
│   │   │   ├── auth.ts         # JWT sign/verify (jose), CSRF validation
│   │   │   ├── prisma.ts       # Prisma client singleton
│   │   │   ├── logger.ts       # Logging with redaction
│   │   │   ├── email.ts        # Resend email client
│   │   │   ├── storage.ts      # R2 S3 client wrapper
│   │   │   ├── crypto.ts       # AES-256-GCM (legacy: Telegram tokens)
│   │   │   ├── payout.ts       # Seller withdrawal to Wave/Orange Money
│   │   │   ├── redis.ts        # Upstash Redis client
│   │   │   ├── rateLimitStore.ts # Redis store for express-rate-limit
│   │   │   ├── zodErrors.ts    # Zod error formatting
│   │   │   ├── utils.ts        # Helper functions
│   │   │   ├── phone.ts        # Phone validation
│   │   │   ├── blocks/
│   │   │   │   └── schemas.ts  # Zod schemas for all block config types
│   │   │   ├── payments/
│   │   │   │   ├── bictorys.ts # Bictorys payment provider (Wave/Orange Money/card)
│   │   │   │   └── types.ts    # Payment provider interface
│   │   │   └── queues/
│   │   │       ├── JobQueue.ts       # Generic Redis-backed job processor
│   │   │       ├── emailQueue.ts     # Email delivery wrapper
│   │   │       └── index.ts          # Queue exports
│   │   └── generated/           # Generated Prisma client (custom output)
│   │       └── prisma/
│   │           ├── client.ts        # Prisma client
│   │           ├── enums.ts         # Database enums
│   │           ├── models.ts        # Type exports
│   │           └── models/          # Individual model types
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (PostgreSQL + Neon)
│   │   └── seed.ts             # Database seeding script
│   ├── scripts/                # Admin/testing scripts
│   │   ├── test-bictorys-*.ts  # Bictorys API debugging
│   │   ├── cleanup-*.ts        # Data cleanup utilities
│   │   └── query-orders.ts     # Order query tool
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── dist/                   # Compiled JavaScript (output)
├── .planning/                  # GSD planning output
│   └── codebase/              # These analysis documents
├── audits/                     # Audit reports
│   ├── audit-008-inapp-browser-payment.md
│   └── audit-009-tiktok-payment-flow.md
├── public/                     # Static assets (favicons, manifest, etc.)
├── docs/                       # Documentation
├── package.json                # Frontend root
├── tsconfig.json               # Frontend TypeScript config
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── eslint.config.mjs           # ESLint rules
├── middleware.ts               # Next.js middleware (exported from src/)
├── CLAUDE.md                   # Project instructions (authoritative)
├── README.md                   # Setup guide
└── .env.example                # Environment variables template
```

## Directory Purposes

**`/src`:**
- Purpose: Next.js 16 App Router frontend
- Contains: React components, contexts, utilities, middleware, styling
- Key files: `layout.tsx` (root), `page.tsx` (homepage), `api/pay-redirect/route.ts` (TikTok workaround)

**`/src/app`:**
- Purpose: Next.js App Router segments
- Contains: Route handlers and server/client components
- Key files: `layout.tsx`, `error.tsx`, `not-found.tsx`, `robots.ts`

**`/src/contexts`:**
- Purpose: React Context providers (global state)
- Contains: `AuthContext.tsx` (user + token), `ToastContext.tsx` (notifications)

**`/src/lib`:**
- Purpose: Frontend utilities and adapters
- Contains: HTTP client (`api.ts`), hooks (`useApi.ts`), helpers, constants, types
- Key files: `api.ts` (handles 401 auto-refresh, CSRF, timeout, retry), `useApi.ts` (SWR cache wrapper)

**`/backend/src`:**
- Purpose: Express 5 API server source
- Contains: Route handlers, middleware, business logic, integrations

**`/backend/src/routes`:**
- Purpose: HTTP endpoint handlers
- Contains: 8 main routers — auth, blocks, orders, sellers, webhooks, withdrawals, upload, files
- Key files: `orders.ts` (59KB — largest, complex payment flow), `auth.ts` (25KB), `blocks.ts` (32KB)

**`/backend/src/middleware`:**
- Purpose: Express middleware
- Contains: `auth.ts` (`requireAuth` — JWT verify + stale JWT prevention)

**`/backend/src/lib`:**
- Purpose: Shared business logic and integrations
- Contains: Auth (JWT/CSRF), Prisma client, email, storage, payments, job queues, logging, validation

**`/backend/src/lib/blocks`:**
- Purpose: Block type validation schemas
- Contains: `schemas.ts` — Zod definitions for FUNDRAISER, PRODUCT, BOOKING, LEAD_MAGNET, etc.

**`/backend/src/lib/payments`:**
- Purpose: Payment provider abstraction
- Contains: `bictorys.ts` (Wave/Orange Money/card), `types.ts` (PaymentProvider interface)

**`/backend/src/lib/queues`:**
- Purpose: Async job processing
- Contains: `JobQueue.ts` (Redis-backed processor), `emailQueue.ts` (email delivery wrapper), `index.ts` (exports)

**`/backend/prisma`:**
- Purpose: Database schema and migrations
- Contains: `schema.prisma` (Neon PostgreSQL), `seed.ts` (test data)

**`/backend/scripts`:**
- Purpose: Admin and testing utilities
- Contains: Bictorys debugging, data cleanup, order querying tools

**`/.planning/codebase`:**
- Purpose: GSD analysis documents (generated by `/gsd-map-codebase`)
- Contains: STACK.md, INTEGRATIONS.md, ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**`/audits`:**
- Purpose: Audit reports and investigation logs
- Contains: `audit-008-inapp-browser-payment.md`, `audit-009-tiktok-payment-flow.md` (payment flow context)

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: React root layout, metadata, ToastProvider
- `src/app/page.tsx`: Homepage (placeholder, awaiting Banani design)
- `backend/src/index.ts`: Express app entry point, middleware setup, route registration

**Configuration:**
- `.env.example`: Template for environment variables
- `backend/.env`: Backend secrets (DATABASE_URL, JWT_SECRET, API keys)
- `next.config.ts`: Next.js build config (Turbopack)
- `tsconfig.json`: TypeScript frontend config
- `backend/tsconfig.json`: TypeScript backend config
- `tailwind.config.ts`: Tailwind CSS (teal-600 primary, amber-500 accent)
- `eslint.config.mjs`: Linting rules

**Core Logic:**
- `src/lib/api.ts`: HTTP client with auto-refresh, CSRF, timeout, retry
- `backend/src/routes/auth.ts`: Auth endpoints (login, signup, refresh, verify email)
- `backend/src/routes/blocks.ts`: Fundraiser CRUD + progress calculation
- `backend/src/routes/orders.ts`: Donation creation + Bictorys charge
- `backend/src/routes/webhooks.ts`: Bictorys webhook handler
- `backend/src/lib/auth.ts`: JWT sign/verify, CSRF validation
- `backend/src/middleware/auth.ts`: Auth middleware with stale JWT prevention
- `backend/src/lib/payments/bictorys.ts`: Bictorys charge implementation
- `backend/src/lib/queues/emailQueue.ts`: Email delivery queue

**Testing:**
- No test framework configured yet
- Manual testing via `backend/scripts/test-*.ts`

## Naming Conventions

**Files:**
- Components: `PascalCase` (e.g., `AuthContext.tsx`, `ToastProvider`)
- Utilities: `camelCase` (e.g., `useApi.ts`, `formatPrice.ts`, `rateLimitStore.ts`)
- Routes: `camelCase` (e.g., `blocks.ts`, `orders.ts`)
- Schemas: `lowercase` (e.g., `schema.prisma`)

**Directories:**
- Features: `camelCase` (e.g., `contexts/`, `middleware/`, `queues/`)
- Multi-word: hyphenated or camelCase consistently

**Database:**
- Models: `PascalCase` (e.g., `Seller`, `Block`, `Order`)
- Enums: `SCREAMING_SNAKE_CASE` (e.g., `BlockType`, `PaymentStatus`, `Plan`)
- Fields: `camelCase` (e.g., `sellerId`, `paymentStatus`, `createdAt`)

**Functions:**
- Regular functions: `camelCase` (e.g., `formatPrice()`, `requireAuth()`)
- React components: `PascalCase` (e.g., `FundraiserBlock`, `AuthProvider`)

## Where to Add New Code

**New Frontend Feature (awaiting Banani design):**
- Primary code: `src/app/[new-page]/page.tsx` (server component) or `src/components/[NewComponent].tsx` (client component with `"use client"`)
- State/hooks: `src/contexts/[NewContext].tsx` or useState in component
- Utilities: `src/lib/[newUtil].ts`
- Styling: Tailwind CSS classes in JSX (no CSS modules)
- Constants: `src/lib/constants.ts`

**New Backend Endpoint:**
- Route handler: `backend/src/routes/[feature].ts` (new file if feature is significant)
- Middleware: Add to route registration in `backend/src/index.ts` (e.g., `app.use("/api/[path]", middleware, router)`)
- Business logic: `backend/src/lib/[feature].ts` if shared, else inline in route handler
- Validation: Add Zod schema to route file or `backend/src/lib/blocks/schemas.ts` if block-related

**New Database Model:**
- Schema: Add to `backend/prisma/schema.prisma`
- Indices: Use `@@index([field])` for frequently queried columns
- Relations: Define `@relation()` carefully to avoid N+1 queries
- Migration: Run `npm run db:push` to apply to Neon
- Type exports: Auto-generated in `backend/src/generated/prisma/models/`

**New Background Job:**
- Queue handler: `backend/src/lib/queues/[jobType].ts` (or extend `emailQueue.ts`)
- Trigger: Add `setInterval()` in `backend/src/index.ts` or call `enqueueJob()` in route handler
- Retry logic: Configure `maxRetries` in JobQueue

**Utilities & Helpers:**
- Frontend: `src/lib/[helper].ts`
- Backend: `backend/src/lib/[helper].ts`
- Shared (cross-codebase): Copy pattern from existing code (no monorepo, no npm link)

**Testing (future):**
- Unit tests: `[file].test.ts` co-located with source (once framework added)
- Integration tests: `backend/[feature].integration.test.ts`
- See TESTING.md when framework is chosen

## Special Directories

**`/backend/src/generated/prisma`:**
- Purpose: Prisma client auto-generated code
- Generated: Yes (by `prisma generate`)
- Committed: No (regenerate after schema changes)
- **Do not edit manually** — changes overwritten on next generate
- Custom output path configured in `backend/prisma/schema.prisma` via generator

**`/.next`:**
- Purpose: Next.js build cache
- Generated: Yes (during dev and build)
- Committed: No (.gitignore)

**`/backend/dist`:**
- Purpose: Compiled TypeScript output
- Generated: Yes (by `npm run build` → tsc)
- Committed: No (.gitignore)
- Command to rebuild: `cd backend && npm run build`

**`/node_modules` and `/backend/node_modules`:**
- Purpose: Installed dependencies
- Generated: Yes (by npm install)
- Committed: No (.gitignore)
- Lock files committed: `package-lock.json`, `pnpm-lock.yaml`

**`/.planning/`:**
- Purpose: GSD-generated planning documents
- Generated: By `/gsd-map-codebase`, `/gsd-plan-phase`, etc.
- Committed: Per team workflow (usually yes)

---

*Structure analysis: 2026-04-13*
