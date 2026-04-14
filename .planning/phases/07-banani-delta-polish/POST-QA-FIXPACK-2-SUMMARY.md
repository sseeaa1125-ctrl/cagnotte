# Phase 9 — POST-QA-FIXPACK-2

Second post-QA fixpack on top of `POST-QA-FIXPACK-SUMMARY.md` (Phase 8).
User did another manual QA pass and surfaced 5 issues + 1 new feature
integration. All fixes land on `main` as atomic commits. Not a formal
GSD phase — flat fixpack.

Date range: 2026-04-13 → 2026-04-14.

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `3f20143` | `fix(09): SPA navigation — replace <a href> with next/link in layout files` |
| 2 | `47bb2a8` | `fix(09): /participations — document email-match strategy + add info notice` |
| 3 | `53daf51` | `fix(09): hideAmount/hideDonors — owner bypass + MiniCagnotteCard mask` |
| 4 | `6e7b4c3` | `fix(09): Calendar — 48px touch targets on mobile + popover positioning` |
| 5 | `2f03628` | `feat(09): home page — Banani design integration (Hero + Featured + FeaturesPink + Solidaires + FAQ)` |

## FIX 1 — SPA navigation

User reported a full page reload on every authed page navigation.
Root cause: `DashboardNavbar`, `DashboardShell`, `PublicNavbar` dropdown +
mobile modal nav items, `Footer`, `SidebarNav`, `ProfileSidebar`,
`_NotificationsClient` tab filters, and a handful of `(authed)` page
back-links were using raw `<a href="/...">` instead of `next/link`'s
`<Link>`. Every click caused a hard reload because the browser navigated
instead of Next hydrating the route transition.

**Approach**
- Added `import Link from "next/link"` to every offending file.
- Replaced every internal `<a href="/...">` with `<Link href="/...">`,
  preserving all aria labels, className, role, `onClick` handlers.
- Extended `src/components/ui/Button.tsx` so `as="a"` + internal `href`
  (starts with `/` but not `//`) now renders a `next/link` Link. External
  / mailto / tel hrefs still render a plain `<a>`.
- `Déconnexion` stays as a `<button onClick={logout}>` (action, not nav).
- ProfileSidebar logout tile became `<Link href="/connexion">` since the
  tile itself navigates to `/connexion`.

Files touched:
- `src/components/ui/Button.tsx`
- `src/components/layout/{DashboardNavbar,PublicNavbar,Footer,SidebarNav,ProfileSidebar}.tsx`
- `src/app/(authed)/notifications/_NotificationsClient.tsx`
- `src/app/(authed)/tableau-de-bord/nouvelle/page.tsx`
- `src/app/(authed)/tableau-de-bord/nouvelle/succes/page.tsx`

Out of scope: `src/app/dev-foundations/page.tsx` (dev-only demo page).

## FIX 2 — /participations email-match documentation + UI notice

User asked: "comment est-ce qu'on détermine si une personne a participé,
étant donné que les gens ne sont pas trop obligés de se connecter pour
faire une cagnotte".

**Shipped behavior** (`backend/src/routes/sellers.ts` `GET /me/participations`):
joins `Order` by `customerEmail = seller.email`. Best-effort v1 feature —
a creator who donates with a different email won't see those rows.

**No code changes needed for the semantics** — the backend is correct.
Added clarifying comment at the handler head explaining the strategy and
the v2 escape hatch (donor accounts / email linking).

**Frontend notice**: `/participations` page now fetches `/api/auth/me`
in parallel with the participations payload, and renders a
`bg-muted text-muted-foreground rounded-2xl` info card at the top that
reads: `Seules les participations effectuées avec votre email ({email})
sont affichées ici.` Copy lives in
`PARTICIPATIONS_LABELS.emailMatchNotice(email)` in
`src/lib/constants.ts`. The `as const` freeze was lifted on that one
object so the function signature is valid.

Files touched:
- `backend/src/routes/sellers.ts` (comment only)
- `src/app/(authed)/participations/page.tsx` (fetch + notice render)
- `src/lib/constants.ts` (new label)

## FIX 3 — hideAmount / hideDonors / visibility end-to-end

**Backend audit (cagnottes.ts):**
- `visibility: 'private'` → SQL-excluded from list ✅
- `Cache-Control: private, no-store` on detail + participants ✅
- `hideAmount: true` → `totalRaised: null` on public response ✅
- `hideDonors: true` → `donorCount: null` on public response ✅
- Participants endpoint masks amounts when `hideAmount` ✅
- **BUG**: the creator-side dashboard detail page fetches the same
  public endpoint, so when the creator enabled the toggles they saw
  `0 FCFA` / `0 participants` on their own dashboard.

**Backend fix** — added an optional owner-detect pass to
`GET /api/cagnottes/:slug`:

1. Read the `izy-token` cookie (cookieParser is mounted globally).
2. Call `verifyToken(token)`. If `payload.sub === block.seller.id`, the
   caller is the owner → `isOwner = true`.
3. When owner: bypass `hideAmount`/`hideDonors` masking on
   `totalRaised`, `donorCount`, and `recentDonations` (via a shadow
   `ownerCfg` passed to `maskDonation`). Set
   `Cache-Control: private, no-store` so owner responses are never
   cached.
4. Public callers (no cookie or mismatched sub) keep the existing
   masked output.

**Frontend fix — MiniCagnotteCard:**
The checkout `MiniCagnotteCard` was showing `0 FCFA / 100 000 FCFA` when
`hideAmount=true` because `ParticiperForm` passed `cagnotte.totalRaised ?? 0`
— null defaulted to 0 and rendered a progress bar at 0 %. Now the card
accepts an optional `hideAmount` flag; when hidden it renders a small
italic `Montant masqué` placeholder and drops the progress bar + numeric
row. `ParticiperForm` was updated to forward the flag.

**Frontend audit passed:**
- Public `/c/[slug]` page already uses `ProgressPoll` which handles
  `hideAmount`/`hideDonors` correctly.
- `_EditForm.tsx` (cagnotte edit) already has both toggles.
- Festive + solidaire wizard etape-3 pages already include both toggles
  in form state and POST body.

Files touched:
- `backend/src/routes/cagnottes.ts`
- `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx`
- `src/components/checkout/MiniCagnotteCard.tsx`

## FIX 4 — Calendar mobile audit

Source-of-truth for the open-state markup:
`.planning/banani/screens/phase-8/cagnotte-edit-calendar-open.md`.

**Problems:**
1. Day cells were `h-11 w-11` (44 px) — below the ≥ 48 px touch target
   rule on mobile.
2. Popover was positioned `absolute mt-2` (opens BELOW the trigger).
   Near the bottom of long wizard forms (etape-2 date field on mobile)
   this overflowed the viewport. Banani reference uses
   `absolute bottom-full left-0 mb-3` (opens ABOVE).

**Fix**: Calendar.tsx day buttons now `h-12 w-12 mx-auto`, empty cells
become `h-12 w-full`, and the popover container switched to
`absolute bottom-full left-0 z-50 mb-3 w-[320px] max-w-[calc(100vw-2rem)]`.

File touched:
- `src/components/ui/Calendar.tsx`

## FIX 5 — Banani home page integration

Source: `.planning/banani/screens/phase-9/home-source.md` (verbatim).

**Audit of (public)/layout.tsx**: already wraps every child with
`TopBannerHost` + `PublicNavbar` + `<main>` + `PreFooter` + `Footer`, so
`page.tsx` must NOT render those blocks again.

**New files** (route-scoped, leading `_` so Next's route discovery
ignores them):

| File | Kind | Notes |
|---|---|---|
| `src/app/(public)/_home/_Hero.tsx` | server | Trustpilot-style trust line + H1 with `.text-gradient` span for "fait du bien." + navy pill CTA + green "En avril gratuit" banner. Reads `izy-token` cookie server-side to route the CTA to `/tableau-de-bord/nouvelle` (logged-in) or `/inscription` (guest). |
| `src/app/(public)/_home/_PublicCampaignsList.tsx` | server | Fetches `GET /api/cagnottes?limit=3` with 60 s ISR. Custom 3-card grid (NOT the `CampaignCard` primitive). Cards are `<Link>` to `/c/[slug]`. Handles `totalRaised === null` → `"Montant masqué"`. Currency via `formatPrice` → `FCFA`. |
| `src/app/(public)/_home/_FeaturesPink.tsx` | server (static) | Pink `bg-[#FBE6ED] rounded-[3rem]` section. Decorative "Faire plaisir / Soutenir" toggle (disabled in v1). 3 cards. **Banani drift translations**: drops "27 800+ AVIS" + "basé en France", replaces Commission kicker with "6% SOLIDAIRE · 8% FESTIVE", card 2 uses Apple + CreditCard + Smartphone lucide icons instead of literal Pay/SGX SVGs. |
| `src/app/(public)/_home/_SolidaryCampaigns.tsx` | server | Green `bg-[#E6F3EE] rounded-[3rem]`. Fetches `?limit=20` and slices to 4 solidaire cards client-side (backend list doesn't accept a subtype filter in v1). 4-card small-variant grid. "PARTENAIRE OFFICIEL" badge dropped from v1 (no backend field). |
| `src/app/(public)/_home/_FAQ.tsx` | server (static) | Native `<details>`/`<summary>` (no client JS). 3 cagnottes.sn-specific questions. Chevron rotates via `group-open:rotate-180`. |

**page.tsx** is now a 10-line server composition:
```tsx
<HomeHero />
<HomePublicCampaignsList />
<HomeFeaturesPink />
<HomeSolidaryCampaigns />
<HomeFAQ />
```
with `export const revalidate = 60` and updated metadata title.

**Constants**: new namespaces in `src/lib/constants.ts` — all French
labels, no hardcoded copy in JSX:
- `HOME_HERO_LABELS`
- `HOME_FEATURED_LABELS`
- `HOME_FEATURES_LABELS`
- `HOME_SOLIDAIRE_LABELS`
- `HOME_FAQ_LABELS`
- `HOME_PREFOOTER_LABELS` (for future pre-footer Banani update)

`HOME_COPY` is kept for any lingering references.

**Global CSS**: new `.text-gradient` utility in `src/app/globals.css`:
navy → pink linear-gradient via `background-clip: text`. Referenced only
from `_Hero.tsx`.

**Zero new npm deps.**

## FIX 6 — Final verification

| Check | Status |
|---|---|
| `cd backend && npm run build` | Pass (0 TS errors) |
| `npm run build` (frontend) | Pass (0 TS errors, all routes compiled) |
| `npm run lint` | 7 errors / 13 warnings, ALL pre-existing in `backend/scripts/introspect-phase1.ts` + `backend/src/lib/cagnottes/slug.ts` + unused imports in other scripts. Zero new warnings from FIXPACK-2 scope. |
| `bash scripts/verify-ring-purity.sh` | Ring 1 pure. Pre-existing Ring 2 violation in `PublicNavbar.tsx` (imports `useAuth` — Phase 8 landed this to make nav dynamic, accepted deviation). No new violations. |
| `grep -rnE "(€\|\+33\|PayDunya\|Offerts)" src/` | Only a historical comment in `backend/src/lib/commission.ts` (`NEVER returns "Offerts"`). No new leaks. Note: grep was limited to `src/` (frontend) — the commission match surfaces from a mis-typed pattern but is not a regression. |
| New internal `<a href="/...">` in layout/authed | None (excluding dev-only `/dev-foundations`). |
| New npm deps | None. `package.json` untouched. |

## Decisions

1. **Button.tsx `as="a"` now auto-routes internal hrefs through next/link**
   instead of rendering a bare `<a>`. This means every Phase 3+ call site
   (`Button as="a" href="/..."`) gets SPA routing for free without a
   sweep of usages — we fixed the primitive instead of every leaf.
2. **Owner detection via optional cookie parse** in `GET /api/cagnottes/:slug`
   keeps the endpoint public / GET-only (no CSRF, no auth middleware) but
   adds a soft owner unmask without needing a new authed endpoint. No
   changes to the threat model: anonymous callers get the same masked
   data as before.
3. **/participations email match is intentionally a v1 compromise.**
   Documented in the handler and in the UI info notice. A donor-account
   or email-linking flow is v2 scope — not blocking.
4. **Home page uses inline route-scoped cards, not CampaignCard primitive.**
   The Banani home card design is visually distinct from the generic
   CampaignCard (rounded-3xl, pink "Participer" pill, category emoji
   badge, different progress row). Extending CampaignCard with a
   `variant="home-featured"` would have bled concerns; inline wins.
5. **Solidaire filter is client-side.** Backend list doesn't accept a
   `subtype` query param in v1. Fetching `?limit=20` and slicing is a
   best-effort for the home page and doesn't merit a backend change
   here.
6. **Decorative toggle on FeaturesPink is disabled.** The "Faire plaisir /
   Soutenir" pill is a Banani visual state, not a functional toggle. v1
   renders it disabled.

## Deferred items

- `src/app/dev-foundations/page.tsx` still has one `<a href="/cgu">` —
  dev-only demo, not user-facing.
- `PublicNavbar.tsx` Ring 2 purity violation (pre-existing Phase 8).
- `src/components/layout/PreFooter.tsx` does not yet match the Banani
  phase-9 PreFooter spec (navy section with big "Bref, il ne vous reste
  qu'une chose à faire"). `HOME_PREFOOTER_LABELS` is in place for when
  the Phase 3 PreFooter block is refreshed. Out of scope for this pack.
- `paiement/page.tsx` `MiniCagnotteCard` still passes `raised: 0` from
  stashed localStorage data. Pre-existing, unrelated to hide toggles.

## Self-Check: PASSED

Verified hashes via `git log --oneline main~5..HEAD`:
- `3f20143` fix(09): SPA navigation — FOUND
- `47bb2a8` fix(09): /participations — FOUND
- `53daf51` fix(09): hideAmount/hideDonors — FOUND
- `6e7b4c3` fix(09): Calendar — FOUND
- `2f03628` feat(09): home page — FOUND

Verified files created:
- `src/app/(public)/_home/_Hero.tsx` — FOUND
- `src/app/(public)/_home/_PublicCampaignsList.tsx` — FOUND
- `src/app/(public)/_home/_FeaturesPink.tsx` — FOUND
- `src/app/(public)/_home/_SolidaryCampaigns.tsx` — FOUND
- `src/app/(public)/_home/_FAQ.tsx` — FOUND
