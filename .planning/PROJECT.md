# Cagnottes.sn

## What This Is

Cagnottes.sn is a dedicated online-fundraiser (cagnotte) platform for the Senegalese market. A creator signs up, publishes one or more cagnottes with a shareable link (`cagnottes.sn/c/<slug>`), and contributors participate via Bictorys (Wave, Orange Money, Free Money, card). All UI is in French; prices are in FCFA (integer amounts, no decimals).

## Core Value

**A creator in Senegal can launch a cagnotte in under 5 minutes, share one link, and receive mobile-money contributions with zero payment friction for donors.** Everything else — dashboards, stats, profiles, notifications — is subordinate to that one flow working cleanly on a 375px Android phone over a 3G network.

## Requirements

### Validated

<!-- Shipped and confirmed. Inferred from the surviving fari.store fork. -->

- ✓ **Seller auth** — bcrypt 12 rounds + JWT in httpOnly cookies, CSRF double-submit, 15min access + 7d refresh, stale-JWT bypass protection ([backend/src/routes/auth.ts](../backend/src/routes/auth.ts), [backend/src/middleware/auth.ts](../backend/src/middleware/auth.ts))
- ✓ **Seller profile CRUD** — `GET/PUT /api/sellers/*`, KYC submission, dashboard stats ([backend/src/routes/sellers.ts](../backend/src/routes/sellers.ts))
- ✓ **Blocks CRUD** — generic block model with per-type Zod config; FUNDRAISER type exists with title/goalAmount/suggestedAmounts/checkoutFields ([backend/src/routes/blocks.ts](../backend/src/routes/blocks.ts), [backend/src/lib/blocks/schemas.ts](../backend/src/lib/blocks/schemas.ts))
- ✓ **Public fundraiser progress** — `GET /api/blocks/:id/progress`, `GET /api/blocks/:id/donations` ([backend/src/routes/blocks.ts](../backend/src/routes/blocks.ts))
- ✓ **Orders (donations)** — `createOrderSchema` with `donorMessage`, seller slug lookup, Bictorys charge flow ([backend/src/routes/orders.ts](../backend/src/routes/orders.ts))
- ✓ **Bictorys payments** — customer charges with 3 retries on 403 WAF, webhook signature verification + WebhookLog audit ([backend/src/lib/payments/bictorys.ts](../backend/src/lib/payments/bictorys.ts), [backend/src/routes/webhooks.ts](../backend/src/routes/webhooks.ts))
- ✓ **Seller payouts** — withdrawal flow with PIN, Bictorys payout via separate private key ([backend/src/routes/withdrawals.ts](../backend/src/routes/withdrawals.ts), [backend/src/lib/payout.ts](../backend/src/lib/payout.ts))
- ✓ **R2 storage** — Cloudflare R2 S3 client with proxy route, used for cover images + KYC docs ([backend/src/lib/storage.ts](../backend/src/lib/storage.ts), [backend/src/routes/upload.ts](../backend/src/routes/upload.ts), [backend/src/routes/files.ts](../backend/src/routes/files.ts))
- ✓ **Email queue** — Upstash Redis-backed persistent JobQueue, Resend with RFC 2369 unsubscribe ([backend/src/lib/queues/emailQueue.ts](../backend/src/lib/queues/emailQueue.ts), [backend/src/lib/email.ts](../backend/src/lib/email.ts))
- ✓ **Rate limiting** — Upstash Redis store, 300 req/15min global + 30 req/60s on write endpoints ([backend/src/lib/rateLimitStore.ts](../backend/src/lib/rateLimitStore.ts))
- ✓ **KYC data model** — `Seller.kycStatus`, `kycIdUrl`, `kycSelfieUrl`, `kycFullName`, `kycSubmittedAt`, `kycReviewedAt` ([backend/prisma/schema.prisma](../backend/prisma/schema.prisma))
- ✓ **Withdrawal PIN** — `Seller.withdrawalPinHash` (bcrypt), enforced on `POST /api/withdrawals`
- ✓ **TikTok in-app browser workaround** — base64-encoded proxied pay-redirect ([src/app/api/pay-redirect/route.ts](../src/app/api/pay-redirect/route.ts), documented in [audits/audit-008-inapp-browser-payment.md](../audits/audit-008-inapp-browser-payment.md))
- ✓ **Background jobs** — order expiration (5min), verification code cleanup (1h), webhook log cleanup (6h, keeps 90d) via `setInterval` in [backend/src/index.ts](../backend/src/index.ts)

### Active

<!-- Current scope. Derived from BACKEND-PLAN.md (12 backend tasks) + STATUS.md (frontend phases A-H). -->

**Backend Phase 0 — required for any Banani screen to work:**

- [ ] **BE-01** `Block.slug` field + unique index + simple numeric-suffix collision handling (`les-30-ans-de-thomas`, `-2`, `-3`)
- [ ] **BE-02** `Order.isAnonymous` + `Order.messageIsPrivate` flags for public participant masking
- [ ] **BE-03** Prisma `Notification` model + 9-type enum (DONATION_RECEIVED, MILESTONE_REACHED, CAGNOTTE_ENDING_SOON, CAGNOTTE_ENDED, DONATION_MESSAGE, PAYOUT_COMPLETED, PAYOUT_FAILED, KYC_APPROVED, KYC_REJECTED)
- [ ] **BE-04** Extended FUNDRAISER Zod schema (subtype festive/solidaire, occasion, cause, beneficiary, visibility, hideAmount, hideDonors) with superRefine cross-field validation
- [ ] **BE-05** Public `GET /api/cagnottes` list (excludes private), `GET /api/cagnottes/:slug` detail (returns private), `GET /api/cagnottes/:slug/participants` paginated (respects anonymous + hide flags)
- [ ] **BE-06** `POST /api/orders` extension (isAnonymous, messageIsPrivate, commission 6% solidaire / 8% festive hard-coded in basis points)
- [ ] **BE-07** Rebuilt `lib/notifications/` with French templates + webhook hook on PAID + milestone detection + withdrawal hooks + cron hook for ending-soon at J-3
- [ ] **BE-08** `routes/notifications.ts` — authed feed, count badge, mark-read, GET/PATCH prefs
- [ ] **BE-09** Withdrawal flow verification — KYC gate, PIN enforcement, `POST /api/sellers/withdrawal-pin` endpoint if missing
- [ ] **BE-10** Auth gap-fill — `change-password`, `forgot-password`, `reset-password`, `verify-email` end-to-end smoke
- [ ] **BE-11** Seed + smoke-test scripts (`backend/scripts/seed-dev.ts`, `backend/scripts/smoke-test.ts`) — 2 sellers, 4 fundraisers mixed subtypes/visibility, 10 paid orders, 5 notifications each
- [ ] **BE-12** Update CLAUDE.md (navy/pink tokens, Poppins headings, new routes, new fields)

**Frontend Phases A-H — ship after Phase 0 exit criteria green:**

- [ ] **FE-A** Foundation — Poppins via `next/font/google`, `@theme` tokens in globals.css, `cn()` helper, `src/lib/constants.ts` (French labels), `src/lib/format.ts` (`formatPrice`, `formatPhone +221`)
- [ ] **FE-B** UI primitives — Button, Input, Textarea, Select, DatePicker, ImageUpload, RadioCard, Toggle, Checkbox, Badge, Tabs, Pagination, Avatar, ProgressBar, KpiCard, EmptyState, Modal, Toast
- [ ] **FE-C** Composed blocks — PublicNavbar, DashboardNavbar, TopBanner, Footer, PreFooter, CampaignCard, ShareSheet, NotificationItem, SidebarNav, FilterChipBar, TrustpilotBadge, MiniCagnotteCard, OrderSummary
- [ ] **FE-D** Public donor flow (6 screens) — Home, AllCagnottes, cagnotte detail `/c/<slug>`, participate `/c/<slug>/participer`, payment `/c/<slug>/paiement`, thank-you (we design thank-you)
- [ ] **FE-E** Public auth (4 screens) — Signup, Login, email-verify landing, password-reset flow (we design verify + reset)
- [ ] **FE-F** Creator flow (7 screens) — Dashboard, type-picker (Festive/Solidaire), Festive wizard x3 steps, Solidaire wizard x3 steps, create-success
- [ ] **FE-G** Authed screens (5 screens) — Profile, profile variant, Notif preferences, Participations table, Notifications feed
- [ ] **FE-H** Money screens (6 screens, we design these) — Bank details, Withdrawal flow, KYC upload, Cagnotte stats, Cagnotte edit, Security/password change

### Out of Scope

<!-- Explicit boundaries. -->

- **Social login (Google/Apple)** — no OAuth in v1 backend, even though Banani shows the CTAs. Rationale: cost of OAuth plumbing is not justified for a v1 Senegalese market ship. Banani CTAs will be hidden in Phase E.
- **Admin panel for commission overrides** — commission is hard-coded 6%/8% basis points in code for v1. Rationale: no admin UI exists in the fork and rebuilding one triples v1 scope. Ship config-driven in v2.
- **Private cagnotte shareable token** — v1 uses URL-obscurity only (if you have the slug, you can load it). Rationale: 99% of "private" cagnottes are family/friends sharing a link, not hostile actors. Token-based privacy deferred to v2.
- **Mobile Banani export** — Banani exports desktop-only. Rationale: mobile responsiveness is in scope, but the mobile adaptation happens in code (Tailwind `md:`/`lg:` prefixes), not as a separate Banani export.
- **PDF export on participations + dashboard history download** — deferred. Rationale: v1 focus is donation happy-path; exports are polish.
- **Reports, stats deep-dive, "Voir les statistiques" UI** — deferred to Phase H. Rationale: non-blocking for donation flow.
- **Telegram bot, push notifications, email marketing integrations, community billing** — deliberately removed during the fork cleanup (phases 1-5 on git log). Rationale: not relevant to a cagnotte-only platform. Orphan fields in Prisma schema stay for now (see Concerns below).
- **Reviews on cagnottes** — no review/comment system in v1 beyond donor messages. Rationale: moderation cost.
- **Senegalese legal copy** (CGU, privacy, mentions légales) — deferred to end of v1. Rationale: user will provide copy. Placeholder links until then.
- **Card-brand selection UX on payment page** — Bictorys handles card routing. Rationale: less UI state, fewer edge cases.

## Context

**The fork story.** cagnottes.sn is a fork of fari.store, a multi-feature link-in-bio for Senegal. In phases 1-5 on `main`, the fork stripped admin routes, community/Telegram, partnerships, analytics, email-marketing libs, and the entire frontend (down to a skeleton placeholder). What remains is the minimum surface needed for a cagnotte-only product: auth, sellers, blocks, orders, webhooks, uploads, withdrawals. The Prisma schema was **intentionally left intact** (dead models kept) because a full schema purge would require surgical refactoring of ~175 field references across kept routes — not worth it until the Banani frontend is wired. Dead models include Product, BookingService, Community, TelegramBot, PushSubscription, Admin, Partnership. Orphan fields on Seller (googleId, telegramUrl, metaPixelId, etc.) stay too.

**The Banani story.** The product owner designed 24 screens in Banani (https://app.banani.co, flow `RZ5SfmH_Utgp`): home, all cagnottes, signup, login, dashboard, 2 wizards × 3 steps, success, participations, profile + variants, notif preferences, notifications, public cagnotte detail + variant, participate, payment. Banani exports JSX source files + a shared `/style.css` with `@theme` tokens. Copy is already in French but amounts are in euros (€) and phone prefix is `+33` — must be swapped to FCFA and `+221`. Brand tokens are navy `#172866` primary + pink `#FBE6ED` accent — explicitly adopted, overriding the old fari.store teal/amber. Headings use Poppins (new, not yet loaded), body uses Inter (already loaded). Banani mentions "PayDunya" in the payment page footer — this is wrong, we keep Bictorys per CLAUDE.md.

**Codebase map.** Full map at `.planning/codebase/` — 7 documents (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS). Key concerns flagged: no test framework configured, dead Prisma models, `setInterval` background jobs lost on restart, stubbed dynamic imports in webhooks.ts, 5-minute webhook timestamp tolerance.

**Decisions already locked by the product owner** (2026-04-13):

- Brand: navy `#172866` + pink `#FBE6ED`
- Mobile-adapt in code (375px base)
- Hide Google/Apple OAuth CTAs
- Single FUNDRAISER with `subtype: 'festive' | 'solidaire'`
- Rebuild notifications lib (deleted at fork)
- KYC + bank details + withdrawal in scope for v1
- Commission: **6% solidaire (santé, aide, urgence) / 8% festive (mariage, anniversaire, pot commun)** — basis points on `Order.commissionRate`
- Private cagnottes: URL-obscurity only, excluded from list endpoint
- Slugs: simple, human-readable, numeric suffix on conflict (no random hex)
- Fonts: Poppins headings + Inter body, both via `next/font/google`
- Legal: deferred to end of project

**Ongoing source of truth.** `.planning/banani/STATUS.md` (24-screen inventory + locked decisions) and `.planning/banani/BACKEND-PLAN.md` (12-task backend breakdown) are the authoritative references. This PROJECT.md is synthesized from them.

## Constraints

- **Tech stack (frontend)**: Next.js 16 + React 19 + TypeScript + Tailwind v4. No inline styles, no CSS modules, no framer-motion, no axios, no Redux/Zustand. Path alias `@/*` → `src/*`. Why: enforced by CLAUDE.md + project simplicity + 3G performance target.
- **Tech stack (backend)**: Express 5 + Prisma + PostgreSQL (Neon serverless) + Upstash Redis. Prisma client output to `backend/src/generated/prisma` (custom path — import from there, NOT `@prisma/client`). Why: existing fork, not up for debate.
- **Payments**: Bictorys only. Two separate keys — `BICTORYS_API_KEY` for customer charges, `BICTORYS_PRIVATE_KEY` for seller payouts. Never mix. 3 retries on 403 WAF block. Webhook signatures verified timing-safe before acting. Why: Bictorys is the Senegalese mobile money aggregator and it's already integrated.
- **Money**: All amounts are **integers** in FCFA (no decimals). `Int` in Prisma, `number` in TypeScript. `formatPrice(15000)` → `"15 000 FCFA"`. Why: FCFA has no sub-unit.
- **Language**: All UI strings in **French**. Labels live in `src/lib/constants.ts`, not hardcoded. Why: Senegalese market.
- **Mobile-first**: base classes target **375px**. Touch targets ≥ 48px. Buttons `py-3.5` minimum. Why: target users are on Android phones on 3G.
- **Auth**: cookie-only (`izy-token` httpOnly + `izy-csrf` readable). Access 15min, refresh 7d. `requireAuth` re-queries seller from DB on every call (no stale-JWT bypass). Why: security + CLAUDE.md mandate.
- **IDs**: Prisma `cuid()` everywhere. Why: existing convention.
- **Validation**: all API inputs via **Zod** before any DB call. Why: existing convention.
- **Testing**: no test framework configured; smoke-test.ts script is the v1 test harness. Why: CLAUDE.md — adding Vitest is Phase 0.11 scope only if needed.
- **Commits**: atomic per plan (GSD default). Why: GSD workflow contract.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Backend-first strategy for Banani integration | 12 backend gaps identified from 24 screens; zero frontend value without API | — Pending |
| Adopt Banani navy/pink tokens over fari.store teal/amber | Designer shipped navy/pink — matching the designs is cheaper than re-theming | — Pending |
| Single FUNDRAISER block type with `subtype: festive \| solidaire` | Avoids two schemas, matches existing block architecture | — Pending |
| Commission 6% solidaire / 8% festive, hard-coded basis points | Festive cagnottes target higher-income events; solidaire should bear less overhead | — Pending |
| Private cagnottes by URL obscurity only | 99% of "private" is family sharing a link, not hostile actors | — Pending |
| Slug style: `les-30-ans-de-thomas` + numeric suffix on conflict | Readable > random, shareable > unique | — Pending |
| Rebuild notifications lib in scope | User explicitly asked; notifications are visible in the Banani dashboard | — Pending |
| Hide Google/Apple OAuth on signup/login | No OAuth in backend, v1 is email + password | — Pending |
| Mobile adaptation in code, not via Banani export | CLAUDE.md mandates 375px base; Banani is desktop-only | — Pending |
| Leave Prisma dead models intact | Surgical refactor blocked by ~175 field references; Phase 0 doesn't need the cleanup | — Pending |
| Keep `setInterval` background jobs for v1 | Upgrading to queue-based cron is Phase 0 scope-creep; document as concern | — Pending |
| Use GSD for orchestrating Phase 0 | User wants phase planning + verification + atomic commits automated | — Pending |
| Skip `/gsd-new-milestone` in favor of `/gsd-new-project --auto` | PROJECT.md + config missing; this is the bootstrap entry for a GSD-virgin repo | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-13 after initialization (auto mode, synthesized from `.planning/banani/BACKEND-PLAN.md` + `.planning/banani/STATUS.md` + codebase map)*
