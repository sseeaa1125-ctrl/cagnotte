# Research Summary — Banani integration milestone

Synthesized: 2026-04-13
Inputs: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
Confidence: **HIGH** overall (narrow milestone, every critical pitfall has a concrete phase-mapped mitigation)

## Executive Summary

Cagnottes.sn is a scoped extension milestone on a working Next.js 16 / Express 5 / Prisma / Bictorys fork — not a greenfield. The existing stack covers ~95% of the 24 Banani screens and 12 backend gaps with **zero new runtime dependencies** (only a Poppins font added via built-in `next/font/google`). The real work is narrow: add `Block.slug` + `Order.isAnonymous` + `Notification` models, introduce ONE new shared lib (`lib/notifications/`), one pure slug helper (`lib/cagnottes/slug.ts`), two new route files (`routes/cagnottes.ts` public, `routes/notifications.ts` authed), and wire commission-by-subtype (600bp solidaire / 800bp festive) into existing order creation.

The product lives or dies on ONE revenue path: **public cagnotte detail → participer → paiement → merci → webhook → notifications**. The defensible differentiator is the **festive/solidaire commission split** combined with **WhatsApp-first sharing** and **Wave-first payment UX**. Risk is concentrated in 7 critical pitfalls, each with a concrete phase-mapped mitigation.

## Stack (HIGH confidence)

**Zero new runtime deps.** Every concern maps to already-installed packages.

- **Frontend additions:**
  - Poppins heading font via built-in `next/font/google` (no `npm install`)
  - Tailwind v4 `@theme` block in `src/app/globals.css` (navy `#172866` primary, pink `#FBE6ED` accent)
  - React 19 `useActionState` + native `<form>` for all 6 Banani forms
  - `src/lib/format.ts` using native `Intl.*` (`formatPrice`, `formatPhone +221`, `formatRelativeTime`)
  - Reuse existing `src/lib/api.ts` + `useApi` + `AuthContext`
- **Backend additions (code-only, zero new libs):**
  - Hand-rolled 35-LOC slug helper (NFD normalize + reserved words + numeric suffix) — beats `slugify`/`@sindresorhus/slugify` because our requirements are fully locked
  - Commission as 4-LOC const lookup in `routes/orders.ts` (`FUNDRAISER_COMMISSION_BP = { solidaire: 600, festive: 800 }`)
  - Notifications lib as Prisma + existing `emailQueue` (Upstash-backed) + Resend glue
- **Explicit anti-recommendations:** no `slugify`, no `react-hook-form`, no TanStack Query, no `date-fns`, no BullMQ / Novu / Knock, no Zod 4 bump, no NextAuth / OAuth, no Framer Motion, no Redux / Zustand.

**Roadmap implication:** Phase 0 can commit zero `package.json` changes except Poppins import. Reduces risk of npm audit / build breakage.

## Features (MEDIUM-HIGH confidence)

**Donation happy path is the whole product.** Every feature that doesn't serve *creator signs up → publishes → shares on WhatsApp → donor taps Wave/OM → thank-you* is P2 or later.

**Table stakes (must be in v1):**

- Shareable `/c/<slug>` URL with cover, progress bar, donor count, participants wall
- Wave / Orange Money / Free Money / card via Bictorys (Wave first, biggest button)
- `Order.isAnonymous` + `Order.messageIsPrivate` toggles
- Suggested amount chips + custom amount, FCFA integer formatting
- Cover image upload (R2), donor message wall, thank-you with async Bictorys status polling
- Creator dashboard (KPIs + bell), festive/solidaire 3-step wizards, create-success share screen
- KYC upload (ID + selfie) + withdrawal PIN + Bictorys payout
- Edit cagnotte (title, description, cover, goal — **NOT slug**), milestone 50%/100% notifications
- WhatsApp share button + OG meta tags (tested against WhatsApp debugger)
- In-app browser workaround — audit-008/009 patterns MUST NOT regress
- Commission transparency label ("6% · 300 FCFA" — the Banani "Offerts" copy is a lie)
- Email receipts via existing `emailQueue` + Resend

**Differentiators:**

- **Festive/solidaire commission split (6%/8%)** — single defensible differentiator, no competitor has it, aligns pricing with cultural weight (weddings subsidize funerals), pre-empts "why 8%?" objection
- Anonymity toggles (public vs. organizer-visible)
- Mobile-first 375px design on a 3G network — the Banani design is desktop but our code adapts

**Defer to P2:** `/toutes-les-cagnottes` discovery page (avoid "ghost town" effect at launch), stats view, slug rename + `SlugHistory`, PDF export, donor profile pages.

**Never build:** crypto payout, recurring donations, comments, upvotes, trending, matching, websockets, reviews, donor profiles, SMS notifications, social OAuth, admin panel (v1), tip-based commission.

## Architecture (HIGH confidence)

**Backend components (each becomes a phase):**

1. **Schema migration** — `Block.slug` unique, `Order.isAnonymous`, `Order.messageIsPrivate`, `Notification` model + `dedupeKey String @unique`, `WebhookLog @@unique([externalId, eventType])`
2. **Slug helper** — `lib/cagnottes/slug.ts` (pure, testable, 35 LOC)
3. **FUNDRAISER schema extension** — `lib/blocks/schemas.ts` superRefine for subtype/occasion/cause/beneficiary/visibility/hideAmount/hideDonors
4. **Public cagnottes routes** — `routes/cagnottes.ts` (GET-only, no CSRF, global rate limiter via `/api` prefix)
5. **Orders extension** — `computeCommission()` pure helper + dedicated per-email rate limiter replacing skip-list + circuit breaker
6. **Notifications dispatch lib** — `lib/notifications/{index,templates,dispatch,milestones}.ts`, single entry `createNotification()`, French templates
7. **Notifications hooks** — wire into `webhooks.ts` PAID event, `withdrawals.ts` transitions, ending-soon `setInterval` cron with boot catch-up
8. **Notifications routes** — `routes/notifications.ts` (authed, `writeLimiter + verifyCsrf`)
9. **Gap-fill** — withdrawal PIN endpoint, KYC verification, `change-password`, `forgot-password`, `reset-password`
10. **Seed + smoke** — `backend/scripts/seed-dev.ts` + `backend/scripts/smoke-test.ts` (standalone node, no test framework)
11. **CLAUDE.md refresh** — navy/pink tokens, Poppins, new routes, new fields

**Middleware chain — MUST NOT break:**

- Raw body parser for `/api/webhooks` stays first
- `/api/cagnottes` mounts BETWEEN `/api/orders` and `/api/upload`, gets global 300/15min limiter automatically via `/api` prefix, **no CSRF** (public GETs), **no write limiter**
- `/api/notifications` follows `/api/sellers` + `/api/blocks` pattern: `writeLimiter + verifyCsrf + router`
- Webhook handler stays the single nucleus for PAID side effects — no fork

**Frontend 3-ring component tree (24 Banani screens):**

- **Ring 1 — `src/components/ui/*`** — 18 primitives, zero domain logic, **forbidden from importing** `api()` / `useApi()` / `AuthContext` / `constants`
- **Ring 2 — `src/components/<domain>/*`** — composed blocks: `layout/`, `cagnottes/`, `checkout/`, `share/`, `notifications/`, `trust/`
- **Ring 3 — `src/app/**/page.tsx`** — pages own all data fetching; route slugs are French (`/c/[slug]`, `/c/[slug]/participer`, `/c/[slug]/paiement`, `/tableau-de-bord/*`, `/profil/*`)

**Donor checkout data flow (9 hops):**

SSR cagnotte load → participants fetch → route transitions → POST /api/orders (with commission 600/800bp) → 3-way redirect strategy (TikTok via `navigator.share`, IG/FB via `target="_blank"`, normal via `window.location.href`) → Bictorys → `/c/<slug>/success` → webhook → `fireDonationNotifications` → thank-you polling (`GET /api/orders/:ref/status`).

**23-step build order** with two bottlenecks: **schema (step 1)** and **notifications dispatch lib (step 5)**. Everything downstream stalls without them.

**Anti-patterns called out:**

- Forking the webhook handler
- Global CagnotteContext
- Inline notification creation without templates
- Auto-regenerating slugs on title edit
- Exposing `/api/blocks/:id` for donor page (use slug endpoint)
- Inline styles

## Pitfalls (MEDIUM-HIGH confidence)

**7 critical pitfalls with phase-mapped mitigations:**

| # | Pitfall | Phase | Mitigation |
|---|---|---|---|
| **P01** | Webhook double-processing → double-credit + duplicate notifications | BE-01 + BE-07 | `@@unique([externalId, eventType])` on `WebhookLog`, `$transaction` with pessimistic lock on `Order`, queue-based dispatch with `jobKey` dedupe, pre/post-transaction milestone detection |
| **P02** | In-app browser (TikTok/IG/FB) kills donation flow | FE-D | Branch on `isInAppBrowser()` + `isTikTokBrowser()` (already in `src/lib/utils.ts`); TikTok = `navigator.share()`; IG/FB = `target="_blank"`; normal = `window.location.href`. Write `audits/audit-010-banani-inapp-matrix.md` with 8-cell device matrix. **Do NOT regress audits 008/009** |
| **P03** | Commission rounding drift (1 FCFA across 3 views) | BE-06 | Single pure `computeCommission()` helper using `Math.floor` (favor seller); invariant `commission + net === gross`; `backend/scripts/test-commission.ts` with 100 fixtures; lock `subtype` once paid orders exist |
| **P04** | Slug reservation race → P2002 or duplicate | BE-01 + BE-03 | Push unique index BEFORE retry logic; 10 retries on P2002; 4-char timestamp suffix as final fallback; reserved-words list in memory; Senegalese name fixtures in test |
| **P05** | Private cagnotte leaks via SEO / list / sitemap / ISR | BE-04 + FE-D | SQL-level `visibility = 'public'` filter in list; `robots.txt` disallows `/c/` until opt-in; `Cache-Control: private, no-store` on private detail; smoke-test asserts absence from list endpoint |
| **P06** | Notification re-fire from webhook + cron concurrency | BE-01 + BE-07 | Explicit `Notification.dedupeKey String @unique` computed per type (`"milestone:blockId:50"`, `"ending_soon:blockId"`, `"donation_received:orderId"`, `"payout:withdrawalId:status"`); `createNotification()` enforces; `PAYOUT_FAILED` uses attempt counter |
| **P07** | `/api/orders` DDoS burns Bictorys quota | BE-06 | Replace skip-list with dedicated limiter: 20/min IP, 100/hour IP, 5/min per `customerEmail`; circuit breaker on 5 Bictorys failures/30s; reduce PENDING TTL 30→10 min; cron every 2min; key on IP + phone (CGNAT-aware) |

**Recommendation:** Split BE-07 into:

- **BE-07a — notifications dispatch lib** (pure, testable in isolation)
- **BE-07b — notifications hooks** (into webhook / withdrawals / cron)

This lets the lib ship and be verified before the integration points are touched.

**Moderate pitfalls (9):** Neon migration timeout (use `migrate` not `db push` for unique index), Prisma select bloat, stored XSS via description (strip HTML in Zod transform, render as React text, CSP), ISR staleness on progress (split SSR shell + client-polled progress, `revalidateTag` on webhook), diacritic edge cases, Resend flood (throttle + batch digests), `setInterval` lost on restart (boot catch-up — v1 acceptable), PIN brute-force (Redis lockout counter), Bictorys 5-min replay (reduce to 60s + Redis replay cache).

**Minor pitfalls (9):** sitemap caching, OG meta tag cache busting, WhatsApp share URL encoding edge cases, etc. — addressed in FE-D polish pass.

## Suggested roadmap phases (11)

Derived from the architecture build order + pitfalls phase mapping + features priority:

1. **P0 — Schema foundation (BE-01, BE-02)** — `Block.slug` + unique index, `Order.isAnonymous`/`messageIsPrivate`, `Notification` model + `dedupeKey`, `WebhookLog @@unique`. Test on Neon branch first. **Blocks everything.**
2. **P1 — Slug helper + FUNDRAISER extension (BE-03, BE-04)** — pure functions, no routes touched yet.
3. **P2 — Commission + orders extension (BE-06)** — `computeCommission()` + per-email rate limiter + circuit breaker.
4. **P3 — Notifications dispatch lib (BE-07a)** — single entry `createNotification()`, pure `milestones.ts`, testable in isolation. **Second bottleneck.**
5. **P4 — Public cagnottes routes (BE-05)** — mount before CSRF group, explicit `select` on organizer, SQL-level visibility filter.
6. **P5 — Notifications hooks + routes (BE-07b/c/d, BE-08)** — wire lib into webhook / withdrawals / ending-soon cron, then expose authed routes.
7. **P6 — Gap-fill (BE-09, BE-10)** — withdrawal PIN, KYC verification, change-password, forgot/reset. **Parallel with P3-P5** where deps allow.
8. **P7 — Seed + smoke + CLAUDE.md refresh (BE-11, BE-12)** — exit gate for Phase 0. Smoke-test asserts P01 / P03 / P05 minimum.
9. **P8 — FE foundation + primitives + composed blocks (FE-A, FE-B, FE-C)** — Poppins, `@theme` tokens, `format.ts`, 18 primitives, composed domain blocks.
10. **P9 — Public donor flow (FE-D) — REVENUE PATH** — Home + `/c/[slug]` + participer + paiement + merci. **Ship before any other FE phase.** Includes audit-010 in-app device matrix.
11. **P10 — Auth + creator + authed + money screens (FE-E, FE-F, FE-G, FE-H)** — everything else. `/toutes-les-cagnottes` deferred.

## Open questions (for downstream resolution)

1. **Cagnotte detail caching** — SSR-only vs edge cache (Vercel/Cloudflare 60s). **Recommendation:** defer, measure after launch.
2. **Milestone detection race** — add `Block.milestonesNotified Int[]` to track fired thresholds, check set-membership before insert.
3. **Ending-soon cron dedupe storage** — dedicated `Block.endingSoonNotifiedAt DateTime?` field vs `Notification.dedupeKey` lookup. **Recommendation:** dedicated field.
4. **Slug rename UX** — `POST /api/blocks/:id/rename-slug` planned but no Banani screen. Needs confirmation modal design + `SlugHistory` 301 decision (P2).

## Gaps to address during requirements

- Smoke test must explicitly assert P01, P03, P05 (minimum)
- Any Senegal market stat in stakeholder copy needs 2025+ verification
- Running `.planning/banani/FRONTEND-DEVIATIONS.md` log: `€` → FCFA, `+33` → `+221`, "PayDunya" → "Bictorys", "Offerts" → "6%/8%"
- KYC admin review is manual/off-platform — ops runbook needed before launch
- Legal placeholders (Terms/privacy/tax) deferred per lock — placeholder routes only, don't block launch

## Confidence

| Area | Confidence | Notes |
|---|---|---|
| Stack | HIGH | Every "addition" is an extension of installed packages; verified in `package.json` |
| Architecture | HIGH | Middleware chain cross-checked against `backend/src/index.ts`; 23-step order has explicit deps |
| Features | MEDIUM-HIGH | Scope HIGH via PROJECT.md/BACKEND-PLAN.md locks; Senegal market stats LOW (spot-verify before marketing copy) |
| Pitfalls | MEDIUM-HIGH | P01/P02/P05/P06/P07 HIGH (grounded in CONCERNS.md + audits 008/009); P03/P04/P08-P13 MEDIUM |
| **Overall** | **HIGH** | Narrow milestone, catalogued unknowns, every critical pitfall has a concrete phase-mapped mitigation |
