# Technology Stack

**Analysis Date:** 2026-04-13

## Languages

**Primary:**
- TypeScript 5.x - All backend and frontend code
- JavaScript (JSX/TSX) - React components

**Runtime Version:**
- Node.js 22.14.0 (system default, no .nvmrc file)
- npm 10.9.2

## Frameworks & Core Libraries

**Frontend:**
- Next.js 16.1.6 - App Router with server components by default
- React 19.2.3 - Component framework
- Tailwind CSS 4 - Styling (mobile-first, 375px baseline)

**Backend:**
- Express 5.1.0 - HTTP server on port 4000
- Prisma 7.4.1 - ORM with PostgreSQL client
- @prisma/adapter-neon 7.4.1 - Serverless PostgreSQL adapter

## Database & ORM

**Primary:**
- PostgreSQL (Neon serverless)
- Prisma Client 7.4.1 - Generated to `backend/src/generated/prisma` (custom output path)
- @neondatabase/serverless 1.0.2 - Neon driver

**Schema:**
- `backend/prisma/schema.prisma` - 100+ models (many legacy from fari.store fork, unused in cagnottes.sn)
- Kept models: Seller, Block (type=FUNDRAISER), Order, WebhookLog, VerificationCode, Withdrawal
- Dead models retained: Product, BookingService, Community, TelegramBot, PushSubscription, Admin (for surgical removal later)

## Authentication & Security

**JWT:**
- jose 6.0.11 - JWT signing and verification
- Bcryptjs 3.0.3 - Password hashing (12 rounds)

**Token scheme:**
- Access token: 15-minute JWT (`izy-token` httpOnly cookie)
- Refresh token: 7-day JWT (`izy-refresh` httpOnly cookie, scoped to `/api/auth`)
- CSRF token: 7-day readable cookie (`izy-csrf`, double-submit pattern)

**Other security:**
- helmet 8.1.0 - Security headers
- cors 2.8.5 - Multi-origin CORS via `ALLOWED_ORIGINS` env var
- express-rate-limit 8.2.1 - Rate limiting (Redis-backed via Upstash)

## File Storage

**Provider:**
- Cloudflare R2 (S3-compatible)

**Client:**
- @aws-sdk/client-s3 3.998.0 - AWS SDK for R2 uploads/downloads
- Multer 2.0.2 - Multipart form parsing
- heic-convert 2.1.0 - HEIC → JPEG conversion for iOS images
- file-type 16.5.4 - MIME type detection

**Proxy:**
- `backend/src/routes/files.ts` proxies R2 files through `/api/files/:key` (public, no auth)

## Data Validation

**Runtime validation:**
- zod 3.25.32 - Schema validation for API inputs and block configs

## Background Jobs

**Message queue:**
- @upstash/redis 1.36.3 - Upstash Redis (REST API, persistent)
- JobQueue and EmailQueue in `backend/src/lib/queues/`
- Jobs survive server restarts
- Scheduled on boot: order expiration (5min), verification code cleanup (1h), webhook log cleanup (6h)

## Rate Limiting

**Store:**
- @upstash/ratelimit 2.0.8 - Redis-backed rate limiting
- RedisRateLimitStore in `backend/src/lib/rateLimitStore.ts`
- Global: 300 req/15min (skips `/withdrawals`, `/orders`, `/auth`)
- Write operations: 30 req/60s

## Email

**Provider:**
- Resend 4.5.2 - Transactional email service

**Configuration:**
- `RESEND_API_KEY` - API credentials
- `EMAIL_FROM` - Sender address (default: `noreply@cagnottes.sn`)
- RFC 2369 List-Unsubscribe headers for compliance

## Compression & HTTP

**Libraries:**
- compression 1.8.1 - gzip compression middleware
- cookie-parser 1.4.7 - Cookie parsing
- nanoid 5.1.5 - URL-safe ID generation

## Build & Development

**Frontend tooling:**
- Turbopack (integrated in Next.js 16)
- TypeScript 5.x (type checking, no tsc build needed for frontend)
- Prettier 3.8.1 - Code formatting
- eslint 9 + eslint-config-next 16.1.6 - Linting
- prettier-plugin-tailwindcss 0.7.2 - Tailwind class sorting

**Backend tooling:**
- tsx 4.19.0 - TypeScript executor for dev (`tsx watch`)
- TypeScript 5.8.0 - Compilation to dist/ via `tsc`
- Prisma CLI - Schema management and studio

## Configuration Files

**Frontend:**
- `tsconfig.json` - Target ES2017, path alias `@/*` → `src/*`
- `next.config.ts` - Image domains, security headers (CSP), API rewrites to backend

**Backend:**
- `backend/tsconfig.json` - Target ES2022, outDir `dist/`, module `NodeNext`
- `backend/prisma/schema.prisma` - Database schema

**Environment:**
- `.env.local` (frontend) - `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BASE_URL`
- `.env` (backend) - See INTEGRATIONS.md for full list

## Platform Requirements

**Development:**
- Node.js 22.x recommended (no version lock enforced)
- npm 10.x
- PostgreSQL connection string (Neon serverless)
- Redis/Upstash credentials for queues

**Production:**
- Deployed frontend to Vercel (Next.js native)
- Deployed backend to Railway or similar Node.js host
- Edge-compatible runtime (Neon serverless, Upstash REST-only)

## Key Dependency Decisions

**Why these, not alternatives:**
- **No NextAuth.js** - Custom bcrypt + JWT in httpOnly cookies (lighter, more control)
- **No Redux/Zustand** - React Context + useState (minimal complexity)
- **No Stripe** - Bictorys for West African mobile money (Wave, Orange Money, Free Money)
- **No Framer Motion** - CSS transitions only (3G performance target)
- **No Axios/curl** - Native `fetch` API
- **No MongoDB** - PostgreSQL + Prisma
- **No styled-components/CSS modules** - Tailwind CSS v4 only

---

*Stack analysis: 2026-04-13*
