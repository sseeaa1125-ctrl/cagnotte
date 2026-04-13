# Requirements: Cagnottes.sn — Banani Integration Milestone

**Defined:** 2026-04-13
**Core Value:** A creator in Senegal can launch a cagnotte in under 5 minutes, share one link, and receive mobile-money contributions with zero payment friction for donors.

This milestone covers the backend extensions and frontend build-out needed to ship 24 Banani-designed screens on top of the existing cagnottes.sn skeleton. Each requirement is atomic, user-centric, and testable. IDs use the `[CATEGORY]-[NUMBER]` format.

## v1 Requirements

### Schema (SCHM)

- [x] **SCHM-01**: The data model supports a unique per-cagnotte slug so every cagnotte gets a shareable URL `cagnottes.sn/c/<slug>`
- [x] **SCHM-02**: The data model supports a donor anonymity flag that masks identity from the public participants list while remaining visible to the organizer
- [x] **SCHM-03**: The data model supports a private-message flag that hides a donor's message from the public wall
- [x] **SCHM-04**: The data model supports persisted in-app notifications with a deduplication key to prevent double-fires from webhook/cron concurrency
- [x] **SCHM-05**: The webhook log enforces idempotency via a unique constraint on `(externalId, eventType)` so double-delivered webhooks cannot double-credit orders

### Fundraiser Types (FUND)

- [ ] **FUND-01**: A creator can publish a **festive** cagnotte with a required occasion (anniversaire, mariage, pot de départ, cadeau commun, naissance, voyage)
- [ ] **FUND-02**: A creator can publish a **solidaire** cagnotte with a required cause (santé, éducation, projet solidaire, urgence, animaux) and beneficiary (moi-même, un proche, une association)
- [ ] **FUND-03**: A creator can mark a cagnotte as **public** (listed in discovery) or **private** (accessible only by direct URL, excluded from list and sitemap)
- [ ] **FUND-04**: A creator can toggle "hide amount" and "hide donor list" on their cagnotte; the public detail endpoint respects both flags
- [ ] **FUND-05**: The slug for a new cagnotte is derived from the title, human-readable (`les-30-ans-de-thomas`), and collides cleanly with a numeric suffix (`-2`, `-3`) — never a random hex
- [ ] **FUND-06**: A slug cannot collide with reserved app routes (api, admin, login, signup, dashboard, tableau-de-bord, profil, notifications, etc.)
- [ ] **FUND-07**: A creator can edit the title / description / cover / goal of an existing cagnotte without changing its slug (slug rename is an explicit separate action, not an implicit consequence)

### Public Discovery (DISC)

- [ ] **DISC-01**: A visitor can load `GET /api/cagnottes` to retrieve a paginated list of **public** cagnottes with search + subtype filter + cursor pagination
- [ ] **DISC-02**: A visitor can load `GET /api/cagnottes/:slug` to retrieve a full cagnotte detail payload (metadata + organizer + progress + stats) in one call
- [ ] **DISC-03**: A visitor can load `GET /api/cagnottes/:slug/participants` to retrieve a paginated participants list, with anonymous donors masked and private messages omitted
- [ ] **DISC-04**: A private cagnotte does **not** appear in the list endpoint, is excluded from any sitemap, and returns `Cache-Control: private, no-store` on its detail endpoint
- [ ] **DISC-05**: A public cagnotte detail page is cacheable (SSR + revalidation on payment webhook) for viral moments without staleness on progress

### Donation Flow (DONA)

- [ ] **DONA-01**: A donor can submit a donation via `POST /api/orders` for a FUNDRAISER block, specifying amount, first name, last name, email, optional phone, and optional message
- [ ] **DONA-02**: A donor can opt to hide their identity publicly (`isAnonymous: true`) while the organizer can still see the real name
- [ ] **DONA-03**: A donor can opt to keep their message private so it's not displayed on the public wall (`messageIsPrivate: true`)
- [ ] **DONA-04**: The platform commission is **6% for solidaire** and **8% for festive** cagnottes, computed server-side with a pure helper that satisfies `commission + net === gross` (basis points on `Order.commissionRate`)
- [ ] **DONA-05**: Donation creation is rate-limited: 20/min per IP, 100/hour per IP, 5/min per customer email, with a circuit breaker on Bictorys upstream failures
- [ ] **DONA-06**: A donor in a TikTok / Instagram / Facebook in-app browser is routed through the existing audit-008/009 workaround (base64-encoded proxied redirect) without regression
- [ ] **DONA-07**: A donor can poll `GET /api/orders/:ref/status` to check payment status from the thank-you page
- [ ] **DONA-08**: On `PaymentStatus: PAID`, the webhook handler credits the order exactly once even under double delivery (pessimistic lock + `@@unique` webhook log constraint)

### Notifications (NOTF)

- [ ] **NOTF-01**: The notifications library exposes a single `createNotification()` entry point that persists to `Notification` and optionally enqueues an email via the existing `emailQueue`
- [ ] **NOTF-02**: A creator receives a **DONATION_RECEIVED** notification whenever their cagnotte gets a paid donation
- [ ] **NOTF-03**: A creator receives a **MILESTONE_REACHED** notification exactly once when their cagnotte crosses 50% and 100% of the goal (dedup via `Notification.dedupeKey`)
- [ ] **NOTF-04**: A creator receives a **CAGNOTTE_ENDING_SOON** notification exactly once, 3 days before the end date (dedup via dedicated `Block.endingSoonNotifiedAt` field)
- [ ] **NOTF-05**: A creator receives a **DONATION_MESSAGE** notification when a donor leaves a message (fires in addition to DONATION_RECEIVED)
- [ ] **NOTF-06**: A creator receives **PAYOUT_COMPLETED** / **PAYOUT_FAILED** notifications on withdrawal state transitions
- [ ] **NOTF-07**: A creator receives **KYC_APPROVED** / **KYC_REJECTED** notifications on KYC state transitions
- [ ] **NOTF-08**: A creator can fetch `GET /api/notifications` for a cursor-paginated feed with `unreadOnly` filter
- [ ] **NOTF-09**: A creator can fetch `GET /api/notifications/count` for an unread-badge count
- [ ] **NOTF-10**: A creator can mark notifications as read via `POST /api/notifications/mark-read` (either specific IDs or all)
- [ ] **NOTF-11**: A creator can fetch and update their notification preferences via `GET` / `PATCH /api/notifications/prefs`
- [ ] **NOTF-12**: Email dispatch is enqueued (not inline) so webhook latency is unaffected; the queue dedupes per `dedupeKey` to survive retries

### Auth Gap-Fill (AUTH)

- [ ] **AUTH-01**: An authed creator can change their password via `POST /api/auth/change-password` (requires current password, returns new JWT)
- [ ] **AUTH-02**: A creator can recover a lost password via `POST /api/auth/forgot-password` → emailed token → `POST /api/auth/reset-password`
- [ ] **AUTH-03**: A creator can verify their email via `POST /api/auth/verify-email` end-to-end

### KYC & Withdrawal (KYC)

- [ ] **KYC-01**: A creator can submit KYC documents (ID photo + selfie + full name) via `POST /api/sellers/kyc`, moving status to PENDING
- [ ] **KYC-02**: `POST /api/withdrawals` rejects creators whose `kycStatus !== APPROVED` with a clean 403 + actionable error
- [ ] **KYC-03**: `POST /api/withdrawals` enforces the creator's `withdrawalPinHash`; the PIN is set/changed via `POST /api/sellers/withdrawal-pin` (new endpoint if missing)
- [ ] **KYC-04**: `GET /api/withdrawals/balance` returns `{ availableAmount, pendingAmount }` in FCFA integer units

### Backend Verification (VERI)

- [ ] **VERI-01**: A `backend/scripts/seed-dev.ts` script seeds the dev Neon DB with 2 sellers, 4 fundraisers (2 festive + 2 solidaire, 1 private), 10 paid orders with mixed anonymity, and 5 notifications per seller
- [ ] **VERI-02**: A `backend/scripts/smoke-test.ts` script hits every new/changed route, asserts shapes, and exits 1 on any failure
- [ ] **VERI-03**: A `backend/scripts/test-commission.ts` script verifies the commission invariant (`commission + net === gross`) across 100 fixtures for both subtypes
- [ ] **VERI-04**: A `backend/scripts/test-slug.ts` script verifies slug generation against 50 French title fixtures including diacritics, reserved words, and collision resolution
- [ ] **VERI-05**: The smoke-test explicitly asserts the critical pitfalls P01 (webhook dedup), P03 (commission rounding), P05 (private SEO leak)
- [ ] **VERI-06**: `cd backend && npm run build` completes with 0 TypeScript errors
- [ ] **VERI-07**: `CLAUDE.md` is updated with navy/pink tokens, Poppins heading font, new `/api/cagnottes/*` and `/api/notifications/*` routes, and the new `Block.slug` / `Order.isAnonymous` / `Order.messageIsPrivate` fields

### Frontend Foundation (FNDN)

- [ ] **FNDN-01**: The Next.js app loads **Poppins** (headings) and **Inter** (body) via `next/font/google` with French locale
- [ ] **FNDN-02**: `src/app/globals.css` contains a Tailwind v4 `@theme` block with navy `#172866` primary, pink `#FBE6ED` accent, navy-hover `#121F4E`, footer `#0E1A40`, and all radii (sm/md/lg/xl/2xl) from the Banani `/style.css`
- [ ] **FNDN-03**: `src/lib/utils.ts` exports a `cn()` helper combining `clsx` + `tailwind-merge`
- [ ] **FNDN-04**: `src/lib/format.ts` exports `formatPrice(n)` → `"1 000 FCFA"`, `formatPhone(n)` with `+221` prefix, and `formatRelativeTime()` for participants list
- [ ] **FNDN-05**: `src/lib/constants.ts` centralizes all French UI labels; zero English strings in any JSX file

### UI Primitives (PRIM)

- [ ] **PRIM-01**: `Button` primitive with variants `primary` (navy), `outline`, `ghost`, plus social variants (Google/Apple/WhatsApp/Facebook/Email), sizes `md` / `lg`, touch target ≥ 48px
- [ ] **PRIM-02**: `Input` + `Textarea` primitives with floating label, helper text, character counter, password eye toggle, error state
- [ ] **PRIM-03**: `Select` + `DatePicker` + `ImageUpload` (drag-drop, JPG/PNG, preview) primitives
- [ ] **PRIM-04**: `RadioCard` + `Toggle` + `Checkbox` primitives with focus rings and touch-friendly hit areas
- [ ] **PRIM-05**: `Badge` (category + status pills), `Tabs` (chip style), `Pagination` (numeric) primitives
- [ ] **PRIM-06**: `Avatar` (with edit overlay), `ProgressBar` (amount / goal / donor count), `KpiCard` (icon + label + value + trend) primitives
- [ ] **PRIM-07**: `EmptyState`, `Modal`, `Toast` primitives designed from scratch (Banani didn't ship them)
- [ ] **PRIM-08**: No primitive imports `api()`, `useApi()`, `AuthContext`, or `constants` (ring-1 purity rule)

### Composed Blocks (COMP)

- [ ] **COMP-01**: `PublicNavbar` + `DashboardNavbar` + `TopBanner` + `Footer` + `PreFooter` composed blocks matching Banani design
- [ ] **COMP-02**: `CampaignCard` with festive/solidaire variants, progress, CTA — used on home, all-cagnottes, dashboard, success
- [ ] **COMP-03**: `ShareSheet` (WhatsApp / Facebook / Email / Copy link) with WhatsApp pre-filled text and OG meta tags
- [ ] **COMP-04**: `NotificationItem`, `SidebarNav` (profile tabs), `FilterChipBar`, `TrustpilotBadge` composed blocks
- [ ] **COMP-05**: `MiniCagnotteCard` + `OrderSummary` (sticky right column) composed blocks for participate/payment pages

### Public Donor Flow (DONF) — REVENUE PATH

- [ ] **DONF-01**: Home page (screen 1) — hero, featured campaigns, features section, FAQ, footer — pixel-perfect at 1280px and mobile-adapted at 375px
- [ ] **DONF-02**: All-cagnottes discovery page (screen 2) — search + chip filters + paginated grid — **in scope but priority-deferred** per research
- [ ] **DONF-03**: Public cagnotte detail page `/c/[slug]` (screens 21/22) — cover, description, participants list, sticky sidebar with progress + "Je participe" CTA, WhatsApp share
- [ ] **DONF-04**: Participate form page `/c/[slug]/participer` (screen 23) — 3-step inline form (amount, info, message) with sticky order summary
- [ ] **DONF-05**: Payment page `/c/[slug]/paiement` (screen 24) — Mobile Money (Wave/Orange/Free) + Carte selector with phone input, commission transparency label ("6% · 300 FCFA"), Bictorys submit
- [ ] **DONF-06**: Thank-you page (we design) — success confirmation with polling on `GET /api/orders/:ref/status`, share CTA, "Voir la cagnotte" link
- [ ] **DONF-07**: In-app browser detection routes TikTok donors through `navigator.share()`, IG/FB through `target="_blank"`, normal browsers through `window.location.href`; `audits/audit-010-banani-inapp-matrix.md` documents an 8-cell device matrix as exit gate

### Public Auth (AUTF)

- [ ] **AUTF-01**: Signup page (screen 3) — email + password + first name + last name, Google/Apple CTAs **hidden**, TOS checkbox
- [ ] **AUTF-02**: Login page (screen 4) — email + password with "Oublié ?" link, Google/Apple CTAs **hidden**
- [ ] **AUTF-03**: Email verification landing page (we design) — confirms the `verify-email` token and redirects to dashboard
- [ ] **AUTF-04**: Forgot-password + reset-password pages (we design) — email input → confirmation → reset with new password input

### Creator Flow (CRET)

- [ ] **CRET-01**: Dashboard page (screen 6) — 3-column KPI cards, recent cagnottes list, "Créer une cagnotte" CTA
- [ ] **CRET-02**: Create-picker page (screen 8) — Festive vs Solidaire option cards with trust-line
- [ ] **CRET-03**: Festive wizard — 3 steps (title + occasion + goal → cover + message + end date → visibility + options + TOS) with step progress indicator
- [ ] **CRET-04**: Solidaire wizard — 3 steps (title + cause + beneficiary + goal → cover + description + end date → visibility + options + TOS)
- [ ] **CRET-05**: Create-success page (screen 15) — confetti, shareable link readonly input with copy button, social share sheet, cagnotte preview card

### Authed Screens (ATHD)

- [ ] **ATHD-01**: Profile page (screen 17) — sidebar nav + personal info form (prénom, nom, email readonly, phone with +221, date of birth)
- [ ] **ATHD-02**: Notification preferences page (screen 19) — grouped toggle list for Mes cagnottes / Mes participations / Communications
- [ ] **ATHD-03**: Participations page (screen 16) — donor-side table with date / cagnotte / amount / status / actions, with mobile card fallback
- [ ] **ATHD-04**: Notifications feed page (screen 20) — tabs (Toutes / Non lues), feed items with unread dots, "Tout marquer comme lu" action, pagination

### Money Screens (MNYS) — we design

- [ ] **MNYS-01**: Bank details form page — creator sets `payoutPhone`, `payoutProvider`, `payoutName` for Bictorys payouts
- [ ] **MNYS-02**: Withdrawal flow page — amount input + recipient summary + PIN entry + confirmation
- [ ] **MNYS-03**: KYC upload page — ID photo + selfie upload (R2 proxy), full name input, status pill (NONE / PENDING / APPROVED / REJECTED)
- [ ] **MNYS-04**: Cagnotte statistics page — per-cagnotte breakdown (donors, average, top message, timeline chart)
- [ ] **MNYS-05**: Cagnotte edit page — edit title / description / cover / goal / end date / suggested amounts (but not slug)
- [ ] **MNYS-06**: Security / password change page — current password + new password + confirm

## v2 Requirements

Deferred but tracked.

### Discovery (DISC)

- **DISC-V2-01**: `/toutes-les-cagnottes` surfaced in the main nav once there are enough organic cagnottes to avoid a "ghost town"
- **DISC-V2-02**: Category + trending + popular sort on the discovery page
- **DISC-V2-03**: Creator public profile pages linkable from cagnotte detail

### Privacy (PRIV)

- **PRIV-V2-01**: Token-based private cagnotte access (`/c/:slug?k=<token>`) replacing URL-obscurity model

### Admin (ADMN)

- **ADMN-V2-01**: Admin panel for KYC review (currently manual/off-platform)
- **ADMN-V2-02**: Admin panel for commission override per cagnotte (currently hard-coded 6%/8%)
- **ADMN-V2-03**: Admin panel for fraud flagging + seller suspension

### Exports (EXPT)

- **EXPT-V2-01**: PDF export of participations list
- **EXPT-V2-02**: CSV/Excel export of dashboard history
- **EXPT-V2-03**: Tax receipts for donors

### Integrations (INTG)

- **INTG-V2-01**: Google / Apple OAuth signup (hidden CTAs shown)
- **INTG-V2-02**: Slug rename flow with `SlugHistory` 301 redirects

### Legal (LEGL)

- **LEGL-V2-01**: Senegalese CGU, privacy policy, mentions légales, tax policy copy

## Out of Scope

| Feature | Reason |
|---------|--------|
| Crypto payout | Out of scope for Senegalese mobile money market; regulatory complexity |
| Recurring donations | Scope creep; v1 focuses on one-off donations |
| Donor comments on cagnottes | Moderation cost too high for v1 |
| Creator reviews / upvotes | Doesn't serve the donation loop |
| Real-time websockets | Polling is sufficient for v1 payment status |
| SMS notifications | Cost + unreliability; email covers it |
| Telegram bot | Deliberately removed at fork (irrelevant to cagnotte product) |
| Push notifications | Deliberately removed at fork |
| Email marketing integrations (Mailchimp/Brevo) | Deliberately removed at fork |
| Community billing / Telegram community subscriptions | Deliberately removed at fork |
| Mobile Banani export | Mobile responsiveness handled in code via Tailwind `md:`/`lg:` — no separate export |
| Admin panel UI | No admin interface in v1; KYC review happens manually off-platform |
| Commission config UI | Hard-coded in code for v1; deferred to v2 with PlatformConfig |
| Per-cagnotte commission override | Hard-coded by subtype for v1 |
| Donor message private replies | v1 has one-way messages only |
| Legal copy (CGU, privacy, mentions légales) | User provides post-launch; placeholder routes until then |
| Tip-based commission (HelloAsso model) | Explicit 6%/8% is our differentiator |
| Live chat support | Support is email/phone only in v1 |
| Multi-currency | FCFA only in v1 |
| Multi-language | French only in v1 |

## Traceability

Every v1 requirement maps to exactly one phase. See `.planning/ROADMAP.md` for phase goals, success criteria, and plans.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHM-01 | Phase 1 | Complete |
| SCHM-02 | Phase 1 | Complete |
| SCHM-03 | Phase 1 | Complete |
| SCHM-04 | Phase 1 | Complete |
| SCHM-05 | Phase 1 | Complete |
| FUND-01 | Phase 1 | Pending |
| FUND-02 | Phase 1 | Pending |
| FUND-03 | Phase 1 | Pending |
| FUND-04 | Phase 1 | Pending |
| FUND-05 | Phase 1 | Pending |
| FUND-06 | Phase 1 | Pending |
| FUND-07 | Phase 1 | Pending |
| DONA-04 | Phase 1 | Pending |
| VERI-03 | Phase 1 | Pending |
| VERI-04 | Phase 1 | Pending |
| DISC-01 | Phase 2 | Pending |
| DISC-02 | Phase 2 | Pending |
| DISC-03 | Phase 2 | Pending |
| DISC-04 | Phase 2 | Pending |
| DISC-05 | Phase 2 | Pending |
| DONA-01 | Phase 2 | Pending |
| DONA-02 | Phase 2 | Pending |
| DONA-03 | Phase 2 | Pending |
| DONA-05 | Phase 2 | Pending |
| DONA-07 | Phase 2 | Pending |
| DONA-08 | Phase 2 | Pending |
| NOTF-01 | Phase 2 | Pending |
| NOTF-02 | Phase 2 | Pending |
| NOTF-03 | Phase 2 | Pending |
| NOTF-04 | Phase 2 | Pending |
| NOTF-05 | Phase 2 | Pending |
| NOTF-06 | Phase 2 | Pending |
| NOTF-07 | Phase 2 | Pending |
| NOTF-08 | Phase 2 | Pending |
| NOTF-09 | Phase 2 | Pending |
| NOTF-10 | Phase 2 | Pending |
| NOTF-11 | Phase 2 | Pending |
| NOTF-12 | Phase 2 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| KYC-01 | Phase 2 | Pending |
| KYC-02 | Phase 2 | Pending |
| KYC-03 | Phase 2 | Pending |
| KYC-04 | Phase 2 | Pending |
| VERI-01 | Phase 2 | Pending |
| VERI-02 | Phase 2 | Pending |
| VERI-05 | Phase 2 | Pending |
| VERI-06 | Phase 2 | Pending |
| VERI-07 | Phase 2 | Pending |
| FNDN-01 | Phase 3 | Pending |
| FNDN-02 | Phase 3 | Pending |
| FNDN-03 | Phase 3 | Pending |
| FNDN-04 | Phase 3 | Pending |
| FNDN-05 | Phase 3 | Pending |
| PRIM-01 | Phase 3 | Pending |
| PRIM-02 | Phase 3 | Pending |
| PRIM-03 | Phase 3 | Pending |
| PRIM-04 | Phase 3 | Pending |
| PRIM-05 | Phase 3 | Pending |
| PRIM-06 | Phase 3 | Pending |
| PRIM-07 | Phase 3 | Pending |
| PRIM-08 | Phase 3 | Pending |
| COMP-01 | Phase 3 | Pending |
| COMP-02 | Phase 3 | Pending |
| COMP-03 | Phase 3 | Pending |
| COMP-04 | Phase 3 | Pending |
| COMP-05 | Phase 3 | Pending |
| DONA-06 | Phase 4 | Pending |
| DONF-01 | Phase 4 | Pending |
| DONF-02 | Phase 4 | Pending |
| DONF-03 | Phase 4 | Pending |
| DONF-04 | Phase 4 | Pending |
| DONF-05 | Phase 4 | Pending |
| DONF-06 | Phase 4 | Pending |
| DONF-07 | Phase 4 | Pending |
| AUTF-01 | Phase 5 | Pending |
| AUTF-02 | Phase 5 | Pending |
| AUTF-03 | Phase 5 | Pending |
| AUTF-04 | Phase 5 | Pending |
| CRET-01 | Phase 5 | Pending |
| CRET-02 | Phase 5 | Pending |
| CRET-03 | Phase 5 | Pending |
| CRET-04 | Phase 5 | Pending |
| CRET-05 | Phase 5 | Pending |
| ATHD-01 | Phase 6 | Pending |
| ATHD-02 | Phase 6 | Pending |
| ATHD-03 | Phase 6 | Pending |
| ATHD-04 | Phase 6 | Pending |
| MNYS-01 | Phase 6 | Pending |
| MNYS-02 | Phase 6 | Pending |
| MNYS-03 | Phase 6 | Pending |
| MNYS-04 | Phase 6 | Pending |
| MNYS-05 | Phase 6 | Pending |
| MNYS-06 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: **95 total** (SCHM 5 + FUND 7 + DISC 5 + DONA 8 + NOTF 12 + AUTH 3 + KYC 4 + VERI 7 + FNDN 5 + PRIM 8 + COMP 5 + DONF 7 + AUTF 4 + CRET 5 + ATHD 4 + MNYS 6). *(Note: an earlier draft of this file stated "78 total" — that was a miscount. The category-by-category sum is 95.)*
- Mapped to phases: **95** (Phase 1: 15, Phase 2: 35, Phase 3: 18, Phase 4: 8, Phase 5: 9, Phase 6: 10)
- Unmapped: **0** ✓
- Orphans: **0** ✓

---
*Requirements defined: 2026-04-13 (synthesized from `.planning/banani/BACKEND-PLAN.md`, `.planning/banani/STATUS.md`, and `.planning/research/SUMMARY.md`)*
*Last updated: 2026-04-13 — traceability table populated by roadmapper (6 phases, 14 plans, 100% coverage)*
