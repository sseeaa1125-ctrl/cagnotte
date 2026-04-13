# Roadmap: Cagnottes.sn — Banani Integration (v1.0)

## Overview

Cagnottes.sn extends the cleaned fari.store fork into a dedicated Senegalese cagnotte platform by delivering 24 Banani-designed screens on top of 12 backend gaps. The journey is strictly **backend-first**: we harden the data model, slug generation, FUNDRAISER extension and commission helper (Phase 1), then wire the cagnottes routes, notifications subsystem, KYC/auth gap-fill and the seed + smoke exit gate (Phase 2). Only once every endpoint is green do we build the frontend foundations and primitives (Phase 3), immediately followed by the single **revenue path** — public cagnotte detail → participer → paiement → merci with the TikTok/IG/FB in-app browser workaround (Phase 4). Auth, creator wizards and authed/money screens follow last (Phases 5-6). Every critical pitfall from `research/PITFALLS.md` is mapped to the phase that must mitigate it.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Backend Foundations** - Schema migration, slug helper, FUNDRAISER extension, commission helper (pure, testable, no routes touched yet)
- [ ] **Phase 2: Backend Surfaces & Exit Gate** - Public cagnottes routes, notifications lib + hooks + routes, orders extension, auth/KYC gap-fill, seed + smoke-test exit gate
- [ ] **Phase 3: Frontend Foundations** - Tailwind @theme tokens, Poppins+Inter fonts, format/cn helpers, 18 UI primitives, composed domain blocks (no pages yet)
- [ ] **Phase 4: Public Donor Revenue Path** - Home, all-cagnottes, `/c/[slug]` detail, participer, paiement, merci + in-app browser matrix (ships before any other FE phase)
- [ ] **Phase 5: Auth + Creator Flow** - Signup, login, email verify, password reset, dashboard, festive/solidaire wizards, create-success
- [ ] **Phase 6: Authed + Money Screens** - Profile, notif preferences, participations, notifications feed, bank details, withdrawal, KYC, stats, cagnotte edit, security

## Phase Details

### Phase 1: Backend Foundations
**Goal**: The data model, slug generation, FUNDRAISER config and commission calculation are extended, pure-tested and ready — no routes touched yet.
**Depends on**: Nothing (first phase)
**Requirements**: SCHM-01, SCHM-02, SCHM-03, SCHM-04, SCHM-05, FUND-01, FUND-02, FUND-03, FUND-04, FUND-05, FUND-06, FUND-07, DONA-04, VERI-03, VERI-04
**Success Criteria** (what must be TRUE):
  1. `cd backend && npx prisma migrate dev --name phase1_cagnotte_foundations` applies `Block.slug @unique`, `Order.isAnonymous`, `Order.messageIsPrivate`, the `Notification` model with `dedupeKey String @unique`, and `WebhookLog @@unique([externalId, eventType])` against the Neon dev DB with zero errors, producing a named migration file
  2. `tsx backend/scripts/test-slug.ts` passes 50 French title fixtures including diacritics (`Coumba Ndiaye`, `Fatoumata Dramé`), reserved words (`admin` → `admin-1`), and numeric-suffix collisions (`les-30-ans-de-thomas` → `-2` → `-3`) — never random hex
  3. `tsx backend/scripts/test-commission.ts` passes 100 fixtures for both subtypes and verifies the invariant `commission + net === gross` using `Math.floor` (favor seller) with no drift
  4. `fundraiserBlockConfigSchema.superRefine` rejects `subtype: "festive"` without `occasion`, rejects `subtype: "solidaire"` without `cause` + `beneficiary`, and locks `subtype` once paid orders exist on the block
  5. `cd backend && npm run build` completes with 0 TypeScript errors
**Plans**: 3 plans

Plans:
- [x] 01-01: Prisma schema migration — add `Block.slug` + reserved-words guard, `Order.isAnonymous/messageIsPrivate`, `Notification` model + `dedupeKey @unique`, `WebhookLog @@unique([externalId,eventType])`. Use `prisma migrate dev` (not `db push`) so prod gets a named migration. Verify with `db:studio`.
- [x] 01-02: Pure `lib/cagnottes/slug.ts` (NFD normalize → collapse → reserved list → numeric suffix retry on P2002, up to 10 attempts, 4-char timestamp fallback) + `backend/scripts/test-slug.ts` standalone test harness.
- [x] 01-03: `lib/blocks/schemas.ts` FUNDRAISER extension (subtype/occasion/cause/beneficiary/visibility/hideAmount/hideDonors with superRefine) + `lib/commission.ts` pure helper (`FUNDRAISER_COMMISSION_BP = { solidaire: 600, festive: 800 }`, `Math.floor`, invariant-asserted) + `backend/scripts/test-commission.ts`.

**Watch out for**:
- **P04 (Slug reservation race)** — unique index MUST exist before BE-03 retry code runs; loop up to 10 attempts catching P2002; NEVER random hex.
- **P03 (Commission rounding drift)** — single `computeCommission()` helper, `Math.floor` (favor seller), invariant `commission + net === gross` asserted in the test script.
- **P08 (Neon migration timeout)** — if `SELECT COUNT(*) FROM "Block"` > 1000, add `slug` nullable first, backfill, then unique index in a second migration.

---

### Phase 2: Backend Surfaces & Exit Gate
**Goal**: Every endpoint the 24 Banani screens will call is live, rate-limited, idempotent, and smoke-tested; Phase 0 exit gate is green.
**Depends on**: Phase 1
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DONA-01, DONA-02, DONA-03, DONA-05, DONA-07, DONA-08, NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06, NOTF-07, NOTF-08, NOTF-09, NOTF-10, NOTF-11, NOTF-12, AUTH-01, AUTH-02, AUTH-03, KYC-01, KYC-02, KYC-03, KYC-04, VERI-01, VERI-02, VERI-05, VERI-06, VERI-07
**Success Criteria** (what must be TRUE):
  1. `GET /api/cagnottes` returns only public + active cagnottes (private ones are SQL-excluded, verified by smoke-test fixture); `GET /api/cagnottes/:slug` returns the full detail payload (respecting `hideAmount`/`hideDonors`) with `Cache-Control: private, no-store` for private variants; `GET /api/cagnottes/:slug/participants` masks anonymous donors and omits private messages
  2. A PAID webhook delivered twice produces exactly ONE `Notification` per type per order — enforced by `WebhookLog @@unique` + pessimistic `$transaction` lock on `Order` + `Notification.dedupeKey` (`donation_received:orderId`, `milestone:blockId:50`, `ending_soon:blockId`, `payout:withdrawalId:completed`)
  3. An authed creator can call `GET /api/notifications`, `GET /api/notifications/count`, `POST /api/notifications/mark-read`, `GET/PATCH /api/notifications/prefs`, `POST /api/auth/change-password`, `POST /api/auth/forgot-password` → `POST /api/auth/reset-password`, `POST /api/auth/verify-email`, `POST /api/sellers/kyc`, `POST /api/sellers/withdrawal-pin`, `GET /api/withdrawals/balance`, `POST /api/withdrawals` — all return expected shapes, all reject unauthenticated calls, all CSRF-protected on mutations
  4. `POST /api/orders` is rate-limited (20/min IP, 100/hour IP, 5/min per `customerEmail`) with circuit breaker on 5 consecutive Bictorys failures in 30s, PENDING TTL reduced to 10min, and the existing base64 pay-redirect path is untouched
  5. `tsx backend/scripts/seed-dev.ts` creates 2 sellers, 4 cagnottes (2 festive + 2 solidaire, 1 private), 10 paid orders with mixed anonymity, 5 notifications per seller; `tsx backend/scripts/smoke-test.ts` hits every new/changed route and explicitly asserts P01 (webhook dedup), P03 (commission invariant), P05 (private cagnotte absent from list endpoint) — exits 0; `CLAUDE.md` reflects navy/pink tokens, Poppins, new routes, new fields
**Plans**: 3 plans

Plans:
- [x] 02-01: `routes/cagnottes.ts` (GET-only public trio, mounted before CSRF group, SQL-level `visibility='public'` filter on list, `Cache-Control` branch on detail) + `routes/orders.ts` extension (`isAnonymous`/`messageIsPrivate`/`cagnotteSlug`, commission per subtype via `computeCommission()`, dedicated per-email+IP rate limiter replacing the `/api/orders` skip, Bictorys circuit breaker).
- [ ] 02-02: `lib/notifications/` rebuild (index + templates + dispatch + milestones, French templates from Banani screen 20 copy, `createNotification()` enforces `dedupeKey`, email dispatch enqueued via `emailQueue` with `jobKey = dedupeKey`) + hooks into `routes/webhooks.ts` (PAID → DONATION_RECEIVED + MILESTONE + DONATION_MESSAGE, post-transaction milestone diff), `routes/withdrawals.ts` (PAYOUT_COMPLETED/FAILED with attempt counter), ending-soon cron with `Block.endingSoonNotifiedAt` dedupe field + `routes/notifications.ts` (authed feed + count + mark-read + prefs).
- [ ] 02-03: Auth gap-fill (`change-password`, `forgot-password`, `reset-password`, `verify-email` end-to-end) + KYC/withdrawal verification (KYC gate 403, `POST /api/sellers/withdrawal-pin`, `GET /api/withdrawals/balance`) + `backend/scripts/seed-dev.ts` + `backend/scripts/smoke-test.ts` (asserts P01/P03/P05) + `CLAUDE.md` refresh. **Exit gate for Phase 0.**

**Watch out for**:
- **P01 (Webhook double-processing)** — `@@unique([externalId,eventType])` upsert, `$transaction` + pessimistic lock on Order, notification dispatch via queue with `jobKey` dedupe, NOT inline. Pre/post-transaction milestone diff.
- **P05 (Private cagnotte SEO leak)** — SQL-level `WHERE visibility='public'` in list (not JS post-filter), `Cache-Control: private, no-store` on private detail, smoke-test asserts absence from list endpoint.
- **P06 (Notification re-fire)** — every dispatch goes through `createNotification()` with explicit `dedupeKey`. Ending-soon cron checks existence before firing. `PAYOUT_FAILED` uses attempt counter.
- **P07 (/api/orders DDoS)** — remove skip-list, add dedicated 20/min IP + 5/min per email limiter, Bictorys circuit breaker, reduce PENDING TTL to 10min, cron every 2min.

---

### Phase 3: Frontend Foundations
**Goal**: The Next.js app has the navy/pink theme, Poppins+Inter fonts, format helpers, all 18 UI primitives and all composed domain blocks — ready to assemble pages, no pages yet.
**Depends on**: Phase 2
**Requirements**: FNDN-01, FNDN-02, FNDN-03, FNDN-04, FNDN-05, PRIM-01, PRIM-02, PRIM-03, PRIM-04, PRIM-05, PRIM-06, PRIM-07, PRIM-08, COMP-01, COMP-02, COMP-03, COMP-04, COMP-05
**Success Criteria** (what must be TRUE):
  1. `src/app/layout.tsx` loads Poppins (headings) + Inter (body) via `next/font/google`; `src/app/globals.css` contains a Tailwind v4 `@theme` block with navy `#172866` primary, pink `#FBE6ED` accent, navy-hover `#121F4E`, footer `#0E1A40`, and all radii from Banani `/style.css`
  2. `src/lib/utils.ts` exports `cn()`, `src/lib/format.ts` exports `formatPrice(15000) === "15 000 FCFA"`, `formatPhone` with `+221` prefix, and `formatRelativeTime`; `src/lib/constants.ts` centralizes every French UI label (zero hardcoded French in JSX)
  3. All 18 primitives (`Button` w/ social variants, `Input`, `Textarea`, `Select`, `DatePicker`, `ImageUpload`, `RadioCard`, `Toggle`, `Checkbox`, `Badge`, `Tabs`, `Pagination`, `Avatar`, `ProgressBar`, `KpiCard`, `EmptyState`, `Modal`, `Toast`) render with ≥48px touch targets; a lint/grep check confirms NO primitive imports `api()`, `useApi()`, `AuthContext`, or `constants` (ring-1 purity)
  4. All composed blocks (`PublicNavbar`, `DashboardNavbar`, `TopBanner`, `Footer`, `PreFooter`, `CampaignCard` festive/solidaire variants, `ShareSheet` WhatsApp-first, `NotificationItem`, `SidebarNav`, `FilterChipBar`, `TrustpilotBadge`, `MiniCagnotteCard`, `OrderSummary`) exist and render against a Storybook-style fixture page
  5. `npm run build` (frontend) completes with 0 TypeScript errors and 0 ESLint warnings
**Plans**: 3 plans

Plans:
- [x] 03-01: Foundation — Poppins + Inter via `next/font/google`, `@theme` tokens in `globals.css`, `cn()`, `formatPrice`/`formatPhone`/`formatRelativeTime` in `src/lib/format.ts`, French labels in `src/lib/constants.ts`.
- [x] 03-02: 18 UI primitives in `src/components/ui/*` with ring-1 purity (no domain imports). Button supports social variants (Google/Apple/WhatsApp/Facebook/Email) even where we hide them.
- [x] 03-03: Composed domain blocks in `src/components/{layout,cagnottes,checkout,share,notifications,trust}/*` — all blocks used by Phase 4 revenue path ship first.

**Watch out for**:
- Banani export says "PayDunya", `€`, `+33`, and "Offerts" commission — these MUST be rewritten to Bictorys / FCFA / `+221` / "6% solidaire · 8% festive" as the primitives land. Log every deviation in `.planning/banani/FRONTEND-DEVIATIONS.md`.
- Primitive purity is enforced by a grep in the plan's verification step — catching it in code review is too late.

---

### Phase 4: Public Donor Revenue Path
**Goal**: A donor on a 375px Android phone in a TikTok/IG/FB WebView can tap a cagnottes.sn link, read the cagnotte, submit a donation, complete the Bictorys mobile-money payment, and land on a thank-you page that polls for PAID status — with zero regressions on audit-008/009.
**Depends on**: Phase 3
**Requirements**: DONA-06, DONF-01, DONF-02, DONF-03, DONF-04, DONF-05, DONF-06, DONF-07
**Success Criteria** (what must be TRUE):
  1. Home page (screen 1), all-cagnottes page (screen 2), and `/c/[slug]` detail page (screens 21/22) render pixel-adjacent to Banani at 1280px and mobile-adapted at 375px; detail page is SSR'd with client-polled progress (revalidation on webhook) and carries correct OG meta for WhatsApp share
  2. `/c/[slug]/participer` and `/c/[slug]/paiement` implement the 3-step inline form + sticky `OrderSummary`, submit a donation via `POST /api/orders` with `isAnonymous`/`messageIsPrivate`, display the commission transparency label (`"6% · 300 FCFA"` computed client-side from the subtype — NEVER "Offerts"), and redirect via the correct in-app branch
  3. The pay CTA branches: TikTok → `navigator.share({ url })` → clipboard fallback; Instagram/Facebook → `target="_blank"`; Safari/Chrome → `window.location.href`. The existing base64 `/api/pay-redirect` route is used unchanged and audit-008/009 are NOT regressed
  4. Thank-you page polls `GET /api/orders/:ref/status` until PAID, shows the share sheet, and links back to the cagnotte; a donor completes a real end-to-end donation on the dev Neon DB from at least one device in each matrix cell
  5. `audits/audit-010-banani-inapp-matrix.md` is written with an 8-cell device matrix (TikTok iOS/Android, Instagram iOS/Android, Facebook iOS/Android, Safari, Chrome) and every cell is green — **this is the Phase 4 exit gate**
**Plans**: 1 plan

Plans:
- [x] 04-01: Ship the full 7-screen revenue path as one atomic plan (Home → AllCagnottes → `/c/[slug]` → `/c/[slug]/participer` → `/c/[slug]/paiement` → thank-you) with the in-app browser branching, OG meta for WhatsApp, client-side commission label, and the audit-010 device matrix. This is a single plan because the screens share state and the matrix must be validated end-to-end.

**Watch out for**:
- **P02 (In-app browser kills donation flow)** — THE make-or-break pitfall. Re-read `audits/audit-008-inapp-browser-payment.md` and `audits/audit-009-tiktok-payment-flow.md` BEFORE writing any payment button. Use the existing `isInAppBrowser()` / `isTikTokBrowser()` helpers — do NOT rewrite them. Expose ONE button, branch hidden.
- **P05 (SEO leak on private slugs)** — `robots.txt` disallows `/c/` until explicit opt-in; `generateStaticParams` filters `visibility='public'`; private pages set `export const revalidate = 0`.
- The Banani copy "Frais de plateforme: Offerts" is a LIE — replace with `"6% · X FCFA"` for solidaire and `"8% · X FCFA"` for festive. Log in FRONTEND-DEVIATIONS.md.
**UI hint**: yes

---

### Phase 5: Auth + Creator Flow
**Goal**: A new creator can sign up, verify their email, log in, land on the dashboard, pick festive or solidaire, walk through a 3-step wizard, and reach the create-success page with a shareable link.
**Depends on**: Phase 4
**Requirements**: AUTF-01, AUTF-02, AUTF-03, AUTF-04, CRET-01, CRET-02, CRET-03, CRET-04, CRET-05
**Success Criteria** (what must be TRUE):
  1. Signup and login pages render with email+password form and the Google/Apple CTAs HIDDEN (Banani shows them; we hide them per locked decision); TOS checkbox on signup; "Oublié ?" link on login
  2. Forgot-password, reset-password and email-verify landing pages work end-to-end against Phase 2's endpoints (new creator goes signup → email → verify → dashboard without error)
  3. Dashboard (screen 6) renders 3-column KPI cards fed by `GET /api/sellers/dashboard/stats`, lists recent cagnottes, and exposes the "Créer une cagnotte" CTA; create-picker (screen 8) offers festive vs solidaire option cards
  4. Both festive and solidaire wizards (3 steps each) collect all required fields per FUND-01/FUND-02, show a step progress indicator, and `POST /api/blocks` with a valid FUNDRAISER config that passes the Phase 1 `superRefine` on first try
  5. Create-success page (screen 15) displays the shareable link in a readonly input with copy button, `ShareSheet` CTA, and the `CampaignCard` preview of the new cagnotte
**Plans**: 2 plans

Plans:
- [x] 05-01: Public auth screens (4 pages) — signup, login, email-verify landing, forgot/reset flow — wired to Phase 2 auth endpoints with CSRF.
- [x] 05-02: Creator flow (7 screens) — dashboard + create-picker + festive wizard (3 steps) + solidaire wizard (3 steps) + create-success.

**Watch out for**:
- Google/Apple CTAs are in the Banani export — HIDE them (don't delete the JSX, gate them behind a feature flag for v2).
- Wizard step-3 must persist draft state locally (via `sessionStorage`) so a P2002 collision from Phase 1's slug retry doesn't blow away the user's input.
**UI hint**: yes

---

### Phase 6: Authed + Money Screens
**Goal**: A logged-in creator can manage their profile, notification preferences, participations, notifications feed, bank details, KYC, withdrawals, cagnotte stats, cagnotte edits and security — everything needed to operate a cagnotte end-to-end.
**Depends on**: Phase 5
**Requirements**: ATHD-01, ATHD-02, ATHD-03, ATHD-04, MNYS-01, MNYS-02, MNYS-03, MNYS-04, MNYS-05, MNYS-06
**Success Criteria** (what must be TRUE):
  1. Profile (screen 17), notification preferences (screen 19), participations (screen 16) and notifications feed (screen 20) all render with the correct sidebar nav, consume Phase 2 endpoints, and the notifications feed marks items read via `POST /api/notifications/mark-read`
  2. Bank details, KYC upload (ID photo + selfie to R2 proxy, status pill), and withdrawal flow (amount + recipient + PIN entry + confirmation) work end-to-end; a creator with `kycStatus: APPROVED` can submit a real withdrawal that creates a `Withdrawal` row with the correct PIN check
  3. Cagnotte statistics page renders per-cagnotte breakdown (donors, average donation, top message, timeline) from the Phase 2 detail payload; cagnotte edit page PATCHes title/description/cover/goal/end date/suggested amounts BUT NOT the slug (slug rename is out of scope for v1)
  4. Security / password change page calls `POST /api/auth/change-password` and rotates the JWT; wrong current password returns a clean error toast
  5. Full 24-screen visual review against the Banani flow passes; `.planning/banani/FRONTEND-DEVIATIONS.md` lists every intentional deviation (currency, prefix, "Bictorys vs PayDunya", "6%/8% vs Offerts") with rationale
**Plans**: 2 plans

Plans:
- [ ] 06-01: Authed screens (4 pages) — profile, notification preferences, participations table with mobile-card fallback, notifications feed with tabs + "Tout marquer comme lu".
- [ ] 06-02: Money screens (6 pages we design from scratch) — bank details, withdrawal flow with PIN entry, KYC upload with R2 proxy, cagnotte stats, cagnotte edit (no slug), security/password change.

**Watch out for**:
- Slug rename is v2 — the cagnotte edit page must NOT expose a slug field even though the underlying `PATCH /api/blocks/:id` would technically accept it.
- KYC uploads MUST go through `/api/files/:key` proxy, not direct R2 URLs (CLAUDE.md rule).
- Withdrawal PIN brute-force: already mitigated server-side via Redis lockout per P10 — the UI just needs a "trop de tentatives" error state.
**UI hint**: yes

---

## Progress

**Execution Order:**
Phases execute in strict numeric order: 1 → 2 → 3 → 4 → 5 → 6. Phase 4 (revenue path) MUST ship before Phases 5-6 even though they depend only on Phase 3 technically.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Foundations | 0/3 | Not started | - |
| 2. Backend Surfaces & Exit Gate | 0/3 | Not started | - |
| 3. Frontend Foundations | 0/3 | Not started | - |
| 4. Public Donor Revenue Path | 0/1 | Not started | - |
| 5. Auth + Creator Flow | 0/2 | Not started | - |
| 6. Authed + Money Screens | 0/2 | Not started | - |

**Totals:** 6 phases, 14 plans, 78 v1 requirements (100% coverage).
