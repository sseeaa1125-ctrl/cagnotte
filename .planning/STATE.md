---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: Completed 07-01-PLAN.md
last_updated: "2026-04-13T21:54:00.195Z"
last_activity: 2026-04-13
progress:
  total_phases: 7
  completed_phases: 6
  total_plans: 17
  completed_plans: 15
  percent: 88
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-13)

**Core value:** A creator in Senegal can launch a cagnotte in under 5 minutes, share one link, and receive mobile-money contributions with zero payment friction for donors.
**Current focus:** Phase 1 — backend-foundations

## Current Position

Phase: 1 (backend-foundations) — EXECUTING
Plan: 3 of 3
Status: Phase complete — ready for verification
Last activity: 2026-04-13

Progress: [░░░░░░░░░░] 0% (0/14 plans)

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: — min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Backend Foundations | 0/3 | — | — |
| 2. Backend Surfaces & Exit Gate | 0/3 | — | — |
| 3. Frontend Foundations | 0/3 | — | — |
| 4. Public Donor Revenue Path | 0/1 | — | — |
| 5. Auth + Creator Flow | 0/2 | — | — |
| 6. Authed + Money Screens | 0/2 | — | — |

**Recent Trend:**

- Last 5 plans: —
- Trend: Not started

*Updated after each plan completion*
| Phase 01-backend-foundations P01 | 30min | 4 tasks | 3 files |
| Phase 01-backend-foundations P02 | 10min | 3 tasks | 2 files |
| Phase 01-backend-foundations P03 | 25min | 3 tasks | 4 files |
| Phase 02 P01 | 35min | 3 tasks | 6 files |
| Phase 03-frontend-foundations P01 | 15m | 7 tasks | 7 files |
| Phase 03 P02 | ~30 min | 6 tasks | 20 files |
| Phase 03-frontend-foundations P03 | 35 | 7 tasks | 14 files |
| Phase 04-public-donor-revenue-path P01 | 1 session | 10 tasks | 20 files |
| Phase 05 P02 | 75 | 6 tasks | 18 files |
| Phase 06-authed-money-screens P01 | 10m | 6 tasks | 15 files |
| Phase 06 P02 | 60 | 8 tasks | 24 files |
| Phase 07 P01 | 35min | 4 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Brand tokens: navy `#172866` + pink `#FBE6ED` (overrides old fari.store teal/amber)
- Commission: 6% solidaire / 8% festive, hard-coded basis points server-side
- Private cagnottes: URL-obscurity only (excluded from list endpoint, accessible by direct slug)
- Slugs: readable + numeric suffix on conflict (no random hex)
- Single FUNDRAISER block type with `subtype: festive | solidaire`
- Backend-first strategy — every endpoint green before a single frontend file changes
- Phase 4 (public donor revenue path) ships before Phases 5-6 even though deps allow reordering
- [Phase 01-backend-foundations]: Apostrophe handling: C'est la fête → c-est-la-fete (single-pass regex, no special-case)
- [Phase 01-backend-foundations]: Duck-typed Prisma P2002 detection (instanceof OR .code === 'P2002') stays in production for async-boundary safety
- [Phase 01-backend-foundations]: FUNDRAISER commission rates locked at 6% (solidaire) / 8% (festive) basis points using Math.floor; computeCommission helper enforces commission + net === gross invariant inline
- [Phase 01-backend-foundations]: fundraiserBlockConfigSchema gates festive/solidaire subtype via Zod superRefine with French error messages; subtype-lock against post-payment changes is comment-only in Phase 1 (Phase 2 PATCH route enforces)
- [Phase 02]: Slug wired in 02-01 (not 02-03) so cagnottes routes have data to serve in dev/CI
- [Phase 02]: Circuit breaker at route layer not Bictorys lib (avoid double retry policy)
- [Phase 02]: 10min PENDING TTL with 5min cron tick (worst case ~14m45s stale)
- [Phase 03-frontend-foundations]: Adopt Banani navy #172866 + pink #FBE6ED as Tailwind v4 tokens; move formatPrice from utils.ts to format.ts
- [Phase 03]: Button discriminated union ButtonAsButton|ButtonAsAnchor keeps href typed only when as='a'
- [Phase 03]: Modal focus trap is simple (restore on close); full tab-cycling deferred
- [Phase 03]: Toast.tsx is 1-line re-export of @/contexts/ToastContext — only Ring 1 file whitelisted in verify-ring-purity.sh
- [Phase 03-frontend-foundations]: DashboardNavbar accepts unreadCount as prop (parent fetches, block is Ring 2 pure)
- [Phase 03-frontend-foundations]: OrderSummary displays pre-computed commission fields (commissionBp/Amount/netAmount) — never 'Offerts'
- [Phase 03-frontend-foundations]: ShareSheet uses inline WhatsApp SVG (simple-icons path) — no new npm dep for WA icon
- [Phase 04-public-donor-revenue-path]: OQ-1: Backend successRedirectUrl now branches to /c/{slug}/merci when cagnotteSlug present
- [Phase 04-public-donor-revenue-path]: OQ-3: force-dynamic on /c/[slug] (no generateStaticParams — P05 mitigation)
- [Phase 04-public-donor-revenue-path]: OQ-6: Flow B sessionStorage handoff between /participer and /paiement (clean retry without order duplication)
- [Phase 04-public-donor-revenue-path]: DONF-07: 3-way in-app branch — TikTok→navigator.share, Meta→a target=_blank, normal→window.location.href
- [Phase 05]: Server-side AuthGuard in (authed)/layout.tsx via cookies() + raw fetch — redirect before JSX renders, api() is window-only
- [Phase 05]: Dashboard progress hydrated via client island _ClientCampaignCard — preserves Ring 2 CampaignCard purity and parallelizes N requests
- [Phase 05]: Wizard drafts in sessionStorage (never localStorage) keyed cagnotte.wizard.{subtype}.draft.v1 — per-tab scope prevents logout leakage
- [Phase 05]: Frontend NEVER generates cagnotte slugs — backend ensureUniqueSlug owns the invariant, wizard POSTs {type, title, config} only
- [Phase 06-authed-money-screens]: Profile writes use PUT /api/sellers/profile not /api/sellers/me (plan contract was wrong)
- [Phase 06-authed-money-screens]: Notifications tab filter is client-side on readAt===null (backend has no filter param)
- [Phase 06]: Bank page PUT /api/sellers/profile with payoutPhone/Provider/Name/Country (D-18 single payout record)
- [Phase 06]: Withdrawal flow split into 4 routes (amount → PIN → confirm → success) not single-page
- [Phase 06]: PIN is 4 digits everywhere via OTP-style 4-box input
- [Phase 06]: Stats timeline is a pure CSS bar chart (no Recharts dep)
- [Phase 06]: Cagnotte edit destructures slug out of config + runtime delete guard
- [Phase 06]: Widened GET /api/auth/me select with KYC + phone fields (D-29)
- [Phase 07]: CampaignCard.linkVariant defaults to 'public' to preserve every public discovery call-site; only dashboard island opts into 'creator'
- [Phase 07]: Creator detail page uses notFound()-based owner gate (no 403) so non-owners cannot probe cagnotte existence

### Pending Todos

None yet. Capture ideas via `/gsd-add-todo` during execution.

### Blockers/Concerns

**Inherited from research/PITFALLS.md — must be mitigated in the mapped phase:**

- **P01** webhook double-processing → Phase 2 (`@@unique` + tx lock + queue dedupe)
- **P02** in-app browser kills donations → Phase 4 (re-read audits 008/009, audit-010 matrix exit gate)
- **P03** commission rounding drift → Phase 1 (`Math.floor`, invariant test)
- **P04** slug reservation race → Phase 1 (unique index before retry logic)
- **P05** private cagnotte SEO leak → Phase 2 (SQL-level filter) + Phase 4 (robots + caching)
- **P06** notification re-fire → Phase 2 (`Notification.dedupeKey` + ending-soon field)
- **P07** `/api/orders` DDoS → Phase 2 (dedicated limiter + circuit breaker)

## Session Continuity

Last session: 2026-04-13T21:54:00.191Z
Stopped at: Completed 07-01-PLAN.md
Resume file: None
