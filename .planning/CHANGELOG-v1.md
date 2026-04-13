# Cagnottes.sn — v1 Milestone Changelog

Fork of Fari.store → dedicated Senegalese online-fundraiser (cagnotte) platform. Creators sign up, publish a cagnotte with a shareable link, contributors donate via **Bictorys** (Wave, Orange Money, Free Money, card). All UI in French, FCFA integer amounts.

**Milestone scope:** 6 phases, 14 plans, 95 requirements, ~100 atomic commits. Zero new npm dependencies.

---

## Phase 1 — Backend Foundations

**Goal:** Data model, slug generation, FUNDRAISER schema, commission logic.

### Schema
- `Block.slug String? @unique` — cagnotte slug for public URLs
- `Block.endingSoonNotifiedAt DateTime?` — ending-soon cron dedupe
- `Order.isAnonymous Boolean` + `Order.messageIsPrivate Boolean` — donor-controlled flags
- `Notification` model with `dedupeKey String @unique` (at-most-once delivery)
- `NotificationType` enum (9 types)
- `WebhookLog @@unique([externalId, eventType])` — atomic webhook idempotency
- `Seller.notifications` relation

### Libraries
- `backend/src/lib/cagnottes/slug.ts` — pure `slugify()` + `ensureUniqueSlug()` with 15-entry reserved-words set + numeric suffix retry + deterministic base36 timestamp fallback. Zero randomness. 68 test fixtures.
- `backend/src/lib/commission.ts` — `computeCommission(gross, subtype)`. Basis points: `{ solidaire: 600, festive: 800 }`. `Math.floor` (favor seller). Invariant `commission + net === gross`. 116 test fixtures.
- `backend/src/lib/blocks/schemas.ts` — `fundraiserBlockConfigSchema` extended with subtype/occasion/cause/beneficiary/visibility/hideAmount/hideDonors + superRefine (festive → occasion required, solidaire → cause+beneficiary required).

**Requirements:** SCHM-01..05, FUND-01..07, DONA-04, VERI-03, VERI-04

---

## Phase 2 — Backend Surfaces & Exit Gate

**Goal:** Every endpoint the Banani screens need is live, rate-limited, idempotent, smoke-tested.

### New routes
- `GET /api/cagnottes` — public list, SQL-level `visibility='public'` filter (P05 mitigation)
- `GET /api/cagnottes/:slug` — public detail with `Cache-Control: private, no-store` on private variants
- `GET /api/cagnottes/:slug/participants` — masked donor list (anonymous → "Anonyme")
- `GET /api/notifications`, `/count`, `POST /mark-read`, `GET/PATCH /prefs` — authed with `writeLimiter + verifyCsrf`
- `POST /api/orders` extended with `isAnonymous`, `messageIsPrivate`, `cagnotteSlug`

### Infrastructure
- **Bictorys circuit breaker** (`backend/src/lib/payments/circuitBreaker.ts`, 88 LOC) — 5 failures / 30s → open 60s
- **Composed rate limiters** on `/api/orders`: 20/min IP + 100/hour IP + 5/min per customerEmail
- **PENDING TTL** reduced 30→10 min
- **Webhook exactly-once** via `WebhookLog.upsert` + Serializable `$transaction` + **post-commit** notification dispatch (Neon 2s ceiling)
- **Notifications subsystem** (`backend/src/lib/notifications/`): index + templates (9 French) + dispatch + milestones + endingSoonCron with `Block.endingSoonNotifiedAt` dedup + boot catch-up. Triple-protected exactly-once: WebhookLog @@unique + Serializable SSI + Notification.dedupeKey @unique.

### Scripts
- `backend/scripts/seed-dev.ts` — 2 sellers, 4 cagnottes (2 festive, 2 solidaire, 1 private), 10 PAID orders, 5 notifications per seller
- `backend/scripts/smoke-test.ts` — **Phase 0 exit gate** — 15 assertions including explicit P01 (webhook dedup), P03 (commission invariant), P05 (private absence), P07 (rate limit + circuit breaker) gates. **15/15 green.**

**Requirements:** DISC-01..05, DONA-01..08, NOTF-01..12, AUTH-01..03, KYC-01..04, VERI-01..07

---

## Phase 3 — Frontend Foundations

**Goal:** Theme + fonts + format helpers + 18 primitives + 13 composed blocks. No pages yet.

### Foundation
- Poppins (headings) + Inter (body) via `next/font/google` — no npm install
- Tailwind v4 `@theme inline` block in `src/app/globals.css`: navy `#172866` primary, navy-hover `#121F4E`, pink `#FBE6ED` accent, footer `#0E1A40`, all radii from Banani style.css
- `src/lib/format.ts` — `formatPrice(15000) === "15 000 FCFA"` (ASCII space normalized from NBSP), `formatPhone` (+221), `formatRelativeTime` (fr-FR Intl.RelativeTimeFormat)
- `src/lib/constants.ts` — every French UI label centralized (nav, actions, forms, validation, 9 notification labels)
- `.planning/banani/FRONTEND-DEVIATIONS.md` — 27 Banani→cagnottes.sn drift entries logged

### Ring 1 — 18 primitives (`src/components/ui/`)
Button (primary/outline/ghost/social), Input, Textarea, Select, DatePicker, ImageUpload, RadioCard, Toggle, Checkbox, Badge, Tabs, Pagination, Avatar, ProgressBar, KpiCard, EmptyState, Modal, Toast (re-export of ToastContext).

### Ring 2 — 13 composed blocks
`layout/` PublicNavbar, DashboardNavbar, TopBanner, Footer, PreFooter, SidebarNav. `cagnottes/` CampaignCard (festive/solidaire variants), FilterChipBar. `checkout/` MiniCagnotteCard, OrderSummary (commission transparency label). `share/` ShareSheet (WhatsApp-first). `notifications/` NotificationItem. `trust/` TrustpilotBadge.

### Enforcement
- `scripts/verify-ring-purity.sh` — Ring 1 forbids `@/lib/api`, `@/lib/useApi`, `@/contexts/AuthContext`; Ring 2 same + forbids `useApi` / direct API imports. **Whitelisted exception:** `Toast.tsx` may import `@/contexts/ToastContext`.
- `src/app/dev-foundations/page.tsx` — NODE_ENV-gated fixture page rendering every primitive + block.

**Requirements:** FNDN-01..05, PRIM-01..08, COMP-01..05

---

## Phase 4 — Public Donor Revenue Path

**Goal:** Donor on a 375px Android phone in a TikTok/IG/FB WebView can complete a Bictorys mobile-money donation. **THE revenue path.**

### Routes
- `/` — home page with top 6 featured cagnottes
- `/toutes-les-cagnottes` — discovery with FilterChipBar + cursor "Charger plus"
- `/c/[slug]` — cagnotte detail, `export const dynamic = "force-dynamic"`, SSR + `ProgressPoll` client island (20s visibility-guarded polling), `robots: noindex` on every cagnotte (v1 defers public SEO)
- `/c/[slug]/participer` — 3-section form (amount → donor → message), React 19 `useActionState` + native `<form>`, sticky `OrderSummary`, sessionStorage stash (Flow B)
- `/c/[slug]/paiement` — method picker, POST `/api/orders`, **in-app 3-way branch**
- `/c/[slug]/merci` — bounded polling 3s × 40 + ShareSheet on PAID

### Safety rails (`src/lib/`)
- `commission.ts` — frontend mirror (600/800 bp, Math.floor, invariant) — commission label NEVER renders "Offerts"
- `redirect.ts` — `openPaymentUrl()` 3-way branch: **TikTok → navigator.share + clipboard fallback → Meta (IG/FB) → `target="_blank"` → normal → `window.location.href`**
- Uses existing base64 `/api/pay-redirect` route **unchanged** (sealed per audit-008/009)
- `robots.txt` disallows `/c/` in v1

### P02 mitigation (in-app browser)
`isInAppBrowser()` / `isTikTokBrowser()` from `src/lib/utils.ts` are **sealed** per audit-008/009 — never modified. `/api/pay-redirect/route.ts` also sealed.

### Exit gate (pending human)
`audits/audit-010-banani-inapp-matrix.md` — 8-cell device matrix. Cells 7-8 filled by executor (Safari/Chrome macOS), cells 1-6 await real-device testing by user (TikTok/IG/FB × iOS/Android).

**Requirements:** DONA-06, DONF-01..07

---

## Phase 5 — Auth + Creator Flow

**Goal:** New creator can sign up → verify email → log in → dashboard → pick type → 3-step wizard → create-success with shareable link.

### Plan 05-01 — Public auth (`src/app/(auth)/`)
- `/inscription` — signup with **displayName merge** (Prénom + Nom merged client-side — backend expects `displayName`, not firstName/lastName)
- `/connexion` — login with **unverified-email fallback** (403 → auto-resend → redirect to `/verification-email?email=...`)
- `/verification-email` — **6-digit code manual entry** (not URL token — backend uses a code, not a link)
- `/mot-de-passe-oublie` + `/mot-de-passe-reinitialiser` — 6-digit code flow
- `src/lib/slug.ts` — seller slug client-side generator + `/api/auth/check-slug` probe
- `src/lib/features.ts` — `FEATURE_SOCIAL_AUTH = false` (Google/Apple CTAs kept in JSX behind gate for v2 flip)

### Plan 05-02 — Creator flow (`src/app/(authed)/`)
- **Server-side AuthGuard** in `(authed)/layout.tsx` via `cookies()` + raw `fetch('/api/auth/me')` + `redirect('/connexion?next=...')` — no FOUC, redirect before any JSX renders
- `/tableau-de-bord` — dashboard with 3-column KpiCards + recent cagnottes + `_ClientCampaignCard` progress hydrator (`GET /api/blocks/:id/progress` per card post-mount, since `GET /api/blocks` doesn't return `raised`/`donorCount`)
- `/tableau-de-bord/nouvelle` — festive vs solidaire picker
- `/tableau-de-bord/nouvelle/festive/etape-{1,2,3}` — 3-step wizard (title+occasion+goal → cover+message+endDate → visibility+options+TOS)
- `/tableau-de-bord/nouvelle/solidaire/etape-{1,2,3}` — same structure, solidaire sends `occasion:null`; festive sends `cause:null, beneficiary:null` (superRefine compliance)
- `/tableau-de-bord/nouvelle/succes` — ConfettiBurst (inline CSS keyframes, zero dep) + CampaignCard preview + copyable URL + ShareSheet + DraftClearer
- `src/hooks/useWizardDraft.ts` — sessionStorage-backed draft hook. Key pattern: `cagnotte.wizard.{subtype}.draft.v1`. Never localStorage. Cleared on success mount.
- Frontend **never** generates cagnotte slugs — backend handles slug + P2002 retry. Wizard submits `{ title, config }` only.
- `router.replace` on publish (anti double-submit via back-button)

**Requirements:** AUTF-01..04, CRET-01..05

---

## Phase 6 — Authed + Money Screens

**Goal:** Everything a creator needs to operate end-to-end.

### Plan 06-01 — Authed screens
- **Backend prelude:** `GET /api/sellers/me/participations` added to `routes/sellers.ts` (~30 LOC) — donor-side order list with cursor pagination
- **Backend prelude:** notification prefs zod schema widened with 6 Banani toggle keys
- `src/components/layout/ProfileSidebar.tsx` — Ring 2 composed block, shared shell for all `/profil/*` routes
- `src/lib/notifications/renderContent.tsx` — client-side per-type parser turning `Notification.type` + `data` into rich JSX segments
- `/profil` — profile edit with avatar multipart upload (birthDate dropped, D-25)
- `/profil/preferences` — 6 notification toggles with **auto-save on flip** (no save button, inline success pulse)
- `/participations` — donor-side table (desktop) / card stack (mobile) with cursor "Charger plus"
- `/notifications` — 2-tab feed (Toutes / Non lues) via URL search param, per-row + mark-all-read actions, client-side `readAt === null` filter fallback
- DashboardShell avatar dropdown: added "Retirer mes fonds" link (D-27)

### Plan 06-02 — Money screens (6 pages + 4-route withdrawal flow)
- `/profil/coordonnees-bancaires` — bank details form using existing `Seller.payout*` columns. **wave_money + orange_money ONLY** (NO Free Money — Bictorys payout constraint, D-22)
- `/profil/securite` — password change (**`PUT /api/auth/change-password`**, not POST) + PIN set/change (**4 digits**, not 6)
- `/profil/kyc` — 2 ImageUploads (ID document + selfie) via multipart `POST /api/sellers/kyc`, status pill (PENDING/APPROVED/REJECTED/BLOCKED), preview via `/api/files/:key` proxy (never direct R2)
- **Withdrawal flow** (`/retraits` → `/retraits/pin` → `/retraits/confirmation` → `/retraits/succes`):
  - KYC gate: `kycStatus !== 'APPROVED'` → blocked empty state with CTA to `/profil/kyc`
  - PIN gate: `withdrawalPinHash === null` → redirect to `/profil/securite`
  - `src/hooks/useWithdrawalDraft.ts` — sessionStorage draft across 3 steps (same pattern as `useWizardDraft`)
  - `router.replace` on success + draft clearer
- `/tableau-de-bord/cagnottes/[slug]/stats` — server owner-check (`seller.id === block.sellerId` or `notFound()`), CSS-only bar chart timeline (no Recharts, no new dep)
- `/tableau-de-bord/cagnottes/[slug]/modifier` — **`PUT /api/blocks/:id`** (not PATCH), `{ slug, ...editableFields }` destructure guard (edit NEVER sends slug in PUT body — slug rename deferred to v2)

**Requirements:** ATHD-01..04, MNYS-01..06

---

## Gates & Invariants (all green)

### Automated (every phase)
- `npm run build` (frontend + backend) — 0 TypeScript errors
- `npm run lint` — 0 new warnings in Phase scope
- `bash scripts/verify-ring-purity.sh` — Ring 1 + Ring 2 pure
- `grep -rnE "(€|\+33|PayDunya|Offerts)" src/` — empty (Banani drift guard)
- `git diff package.json package-lock.json` — **byte-identical throughout the entire milestone** (zero new npm deps)

### Contract facts honored
- `PUT /api/auth/change-password` (verified `routes/auth.ts:702`)
- `PUT /api/blocks/:id` (verified `routes/blocks.ts:450`)
- PIN = 4 digits (verified `routes/sellers.ts:932/933/1060`)
- Bictorys payouts = wave_money + orange_money only (verified `routes/withdrawals.ts:42`)
- `POST /api/upload` is multipart/form-data
- Frontend never generates cagnotte slugs
- Notifications: exactly-once via WebhookLog @@unique + Serializable SSI + dedupeKey @unique (triple protected)
- `(authed)/layout.tsx` is a true server component (no `"use client"`, uses `cookies()` + `redirect()`)

### Sealed files (audit-008/009 — NEVER modified)
- `src/lib/utils.ts` — `isInAppBrowser()`, `isTikTokBrowser()`
- `src/app/api/pay-redirect/route.ts`

---

## Known limitations (v1)

- **Social login** (Google / Apple) — CTAs gated behind `FEATURE_SOCIAL_AUTH = false`, JSX kept for v2 flip
- **Cagnotte slug rename** — not editable in v1 (deferred to v2 with `SlugHistory` 301)
- **Cagnotte delete** — not in v1 UI (creators contact support, D-26)
- **Public SEO** — `robots.txt` disallows `/c/` entirely in v1 (URL-secrecy model for private, public SEO deferred)
- **Free Money payouts** — not supported by Bictorys, only customer charges
- **KYC admin panel** — manual via `backend/scripts/approve-kyc.ts <seller-slug>`. v2 ships admin UI.
- **Ending-soon cron** — in-process `setInterval`, lost on restart, boot catch-up handles the common case. Multi-instance scaling requires Redis.
- **Bictorys circuit breaker** — in-memory, single-instance. Multi-instance needs Redis-backed swap.
- **Audit-010 matrix** — 6/8 cells pending real-device testing (TikTok/IG/FB × iOS/Android)

---

## Stats

- **6 phases**, **14 plans**, **6 VERIFICATION.md** reports
- **95 requirements** across 17 categories — 100% satisfied
- **~100 atomic commits** on `main`
- **Zero new npm dependencies** (package.json byte-identical from phase 1 bootstrap)
- **Backend regression harness:** `backend/scripts/smoke-test.ts` — 15/15 green at Phase 2 exit
- **Banani drift log:** `.planning/banani/FRONTEND-DEVIATIONS.md` — 29 entries (D-01..D-29)
