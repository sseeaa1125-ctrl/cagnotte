# Banani → cagnottes.sn Frontend Deviations

Running log of intentional deviations between the Banani design export and the shipped UI. Every deviation must be justified.

**Rule:** If the Banani export says X but we ship Y, it goes here with rationale. If you can't justify the deviation, fix the code to match Banani instead.

**Updated:** 2026-04-13 (seeded during Phase 3 plan 03-01)

***

## Active Deviations (v1)

### D-01 — Currency: € → FCFA
- **Banani:** `15 000 €`, `€` symbol in order summary
- **cagnottes.sn:** `15 000 FCFA`, space as thousands separator (via `formatPrice`)
- **Rationale:** Senegalese market. FCFA has no sub-unit, so all monetary values are integers.
- **Enforcement:** `src/lib/format.ts` `formatPrice()` is the only money formatter. No hardcoded `€` in any primitive or block.
- **Introduced by:** Plan 03-01

### D-02 — Phone prefix: +33 → +221
- **Banani:** `+33 6 XX XX XX XX` in signup/participate forms
- **cagnottes.sn:** `+221 77 XXX XX XX` via `formatPhone`
- **Rationale:** Senegal country code. Bictorys requires Senegalese mobile money numbers.
- **Enforcement:** `src/lib/format.ts` `formatPhone()` always prepends `+221`. `MISC.prefixTelephone === "+221"`.
- **Introduced by:** Plan 03-01

### D-03 — Payment provider label: PayDunya → Bictorys
- **Banani:** The payment page footer mentions "Paiement sécurisé par PayDunya"
- **cagnottes.sn:** No provider name shown in v1. If shown later, must say "Bictorys".
- **Rationale:** cagnottes.sn integrates Bictorys (not PayDunya) per CLAUDE.md mandate. PayDunya is a competing Senegalese PSP and would be misleading.
- **Enforcement:** Plan 03-03 `OrderSummary` block MUST NOT render a provider name. If a composed block or Phase 4 page references PayDunya, reject in review.
- **Introduced by:** Plan 03-01 (pre-emptive)

### D-04 — Commission copy: "Offerts" → "6% solidaire · 8% festive"
- **Banani:** The payment page shows "Frais de plateforme: Offerts" (Free)
- **cagnottes.sn:** Shows the real commission. Phase 3 labels (`COMMISSION_LABELS` in constants.ts):
  - Festive: "8% de commission pour les cagnottes festives"
  - Solidaire: "6% de commission pour les cagnottes solidaires"
  - Phase 4 checkout: `"8% · 1 200 FCFA"` (formatted runtime computation)
- **Rationale:** "Offerts" is a lie — the commission is real (6%/8% basis points enforced server-side in `lib/commission.ts`). Transparency is our differentiator vs tip-based competitors.
- **Enforcement:** Plan 03-03 `OrderSummary` displays pre-computed `commissionAmount` passed as a prop. Phase 4 computes the amount client-side matching the server helper.
- **Introduced by:** Plan 03-01

### D-05 — Social login CTAs hidden (but Button variant kept)
- **Banani:** Signup/login screens show Google + Apple + Facebook buttons
- **cagnottes.sn:** These CTAs are **hidden** in v1 (no OAuth in backend) BUT the `Button` primitive still exposes a `variant: 'social'` + `socialProvider` prop so Phase 5 can unhide them via a feature flag with zero code change.
- **Rationale:** Building OAuth plumbing is out of scope for v1; keeping the variant avoids a rewrite in v2.
- **Enforcement:** Plan 03-02 `Button` primitive implements the full social variant. Plan 05-01 (signup/login pages) MUST NOT render the social button JSX (hidden via feature flag `NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN === "true"` which is never set in v1).
- **Introduced by:** Plan 03-01

### D-06 — All-cagnottes pagination: numeric → "Charger plus" (cursor)
- **Banani:** Numeric pagination (page 1, 2, 3, ... at the bottom of the grid)
- **cagnottes.sn:** "Charger plus" button using cursor-based pagination
- **Rationale:** Backend `/api/cagnottes` is cursor-paginated (no count query — see [backend/src/routes/cagnottes.ts](../../backend/src/routes/cagnottes.ts) list handler which uses `take: limit+1` to detect `hasMore` without a count). Numeric pagination over cursors would require an extra count query that's expensive on growing tables. "Load more" is also more mobile-friendly and matches the social-feed mental model donors already have.
- **Enforcement:** Phase 4 plan 04-01 task T2 ships the cursor pattern. The `Pagination` Phase 3 primitive remains available for authed paginated tables in Phase 6.
- **Introduced by:** Plan 04-01

### D-07 — Cagnotte detail: ship variant A only
- **Banani:** Two variants of the cagnotte detail page (screens 21 + 22) — variant A (full description, standard layout) vs variant B (collapsed description, expanded participants wall).
- **cagnottes.sn:** Single variant (variant A only). Variant B is deferred.
- **Rationale:** The variant delta was not crisply specified during Banani export. Shipping ONE clean implementation faster, layering variant B post-launch if user feedback demands it.
- **Enforcement:** Phase 4 plan 04-01 task T3 ships ONE component at `src/app/(public)/c/[slug]/page.tsx`. No variant flag, no toggle.
- **Introduced by:** Plan 04-01

### D-08 — Social login CTAs hidden behind FEATURE_SOCIAL_AUTH (Phase 5)
- **Banani:** Signup (screen 3) and login (screen 4) show Google + Apple social CTAs directly under the primary submit button.
- **cagnottes.sn:** The JSX for Google + Apple `<Button variant="social" socialProvider="...">` is **retained** in `src/app/(auth)/inscription/page.tsx` and `src/app/(auth)/connexion/page.tsx`, wrapped in `{FEATURE_SOCIAL_AUTH && ...}`. Since `FEATURE_SOCIAL_AUTH = false` in `src/lib/features.ts`, the buttons never render in v1.
- **Rationale:** v1 backend has no OAuth plumbing (confirmed in `backend/src/routes/auth.ts` — only email/password). Keeping the JSX tree means v2 ships OAuth with a 1-line flag flip, not a rewrite. Extends D-05 with the concrete plan 05-01 enforcement point.
- **Enforcement:** Plan 05-01 tasks T2+T3 gate the social button block with `FEATURE_SOCIAL_AUTH &&`. Lint guard: a grep in task T6 asserts `FEATURE_SOCIAL_AUTH` is present in both auth pages.
- **Introduced by:** Plan 05-01

### D-09 — Signup: Prénom + Nom merged client-side into displayName
- **Banani:** Screen 3 shows two separate inputs (Prénom, Nom) as a 2-column grid.
- **cagnottes.sn:** The two inputs are kept for UX symmetry with Banani, but the frontend merges them into `displayName = (firstName.trim() + " " + lastName.trim()).trim()` and ONLY `displayName` is sent in the `POST /api/auth/signup` body (backend schema at `backend/src/routes/auth.ts:37-46` expects `displayName: string`, NOT firstName/lastName). The frontend also auto-generates a seller `slug` via `src/lib/slug.ts::slugifySellerName()` + `ensureAvailableSellerSlug()` — Banani screen 3 has no slug field.
- **Rationale:** The `Seller` Prisma model has a single `displayName` column. Adding firstName/lastName columns is a schema migration; we avoid the rabbit hole and respect the locked decision "Don't try to clean the schema as a side task." The two-input UI is kept for familiarity.
- **Enforcement:** Plan 05-01 task T2 verify step greps `! grep -qE "tosAccepted.*body|body.*tosAccepted"` to ensure the request body NEVER contains firstName/lastName/tosAccepted fields.
- **Introduced by:** Plan 05-01

### D-10 — Verify-email uses 6-digit CODE, not URL token
- **Banani:** No verify-email, forgot-password, or reset-password screens were exported at all — Banani shipped only signup + login.
- **cagnottes.sn:** We design `/verification-email`, `/mot-de-passe-oublie`, `/mot-de-passe-reinitialiser` in Banani visual language (navy primary, pink accent, Poppins headings, `max-w-md` centered card). The key contract: all three flows use a **6-digit numeric code** typed manually into 6 separate `<Input maxLength={1}>` boxes with auto-advance + paste support — NOT a URL token like `?token=abc123`. This is locked by the backend schemas at `auth.ts:53-57`, `auth.ts:638-642`.
- **Rationale:** Backend sends a 6-digit code via email (`generateVerificationCode()`), never a link. Frontend must match. This also enables offline/cross-device recovery (user can read the code on their phone and type it into their laptop).
- **Enforcement:** Plan 05-01 tasks T4+T5 implement 6-input OTP pattern inline (no new OTP npm dep). Verify step greps for `inputMode="numeric"` and `storeCsrfToken` (verify-email is a login — it issues cookies, reset-password is NOT — user logs in fresh).
- **Introduced by:** Plan 05-01

### D-11 — (authed) AuthGuard is a SERVER component with raw fetch, not `api()`
- **Banani:** N/A — Banani doesn't prescribe routing architecture.
- **cagnottes.sn:** `src/app/(authed)/layout.tsx` is a Next 16 server component that reads `izy-token` from `cookies()` and calls `/api/auth/me` via raw `fetch` with the cookie forwarded in `headers.cookie`. It NEVER imports `@/lib/api`, because `api()` is window-only (reads `document.cookie` for CSRF, uses `localStorage`). Any 401 / network error → `redirect("/connexion?next=/tableau-de-bord")` BEFORE JSX renders.
- **Rationale:** A client-side AuthGuard flashes protected content for ~200ms before redirecting, which is a security smell and a FOUC. A server component redirects pre-render. The navbar is split out into a small client island `DashboardShell` that owns the `useAuth()` logout callback.
- **Enforcement:** Plan 05-02 verify step greps `! grep -q "\"use client\"" src/app/(authed)/layout.tsx` and `grep -q "cookies()" src/app/(authed)/layout.tsx`.
- **Introduced by:** Plan 05-02

### D-12 — Wizard drafts persist in sessionStorage (not localStorage)
- **Banani:** Banani wizards don't show an explicit "draft saved" UI — persistence is an executor choice.
- **cagnottes.sn:** `src/hooks/useWizardDraft.ts` stores festive and solidaire drafts under `cagnotte.wizard.${subtype}.draft.v1` in **sessionStorage**, NOT `localStorage`. Entries older than 24h are cleared on mount. Success page wipes both keys via a `DraftClearer` client island on mount.
- **Rationale:** `localStorage` survives logout and tab close, leaking draft data on shared browsers. `sessionStorage` is per-tab — the wizard is a short-lived multi-step flow; per-tab grain is correct.
- **Enforcement:** Plan 05-02 verify greps `! grep -q "localStorage" src/hooks/useWizardDraft.ts` and `! grep -rn "localStorage" src/app/(authed)/`.
- **Introduced by:** Plan 05-02

### D-13 — Cagnotte slug generation is BACKEND-ONLY
- **Banani:** N/A.
- **cagnottes.sn:** The wizard publish step posts `{ type: "FUNDRAISER", title, config }` — NEVER a `slug` field. Backend's `ensureUniqueSlug()` (Phase 1 helper) handles P2002 retry and reserved-word collisions. The seller slug helper at `src/lib/slug.ts` is ONLY used for the signup flow (seller vanity URL) — wizards must not touch it.
- **Rationale:** Double-generating slugs on client + server invites collisions and drift. The backend owns the invariant.
- **Enforcement:** Plan 05-02 verify greps `! grep -rE "slugify|ensureUniqueSlug" src/app/(authed)/tableau-de-bord/nouvelle/`.
- **Introduced by:** Plan 05-02

### D-14 — Dashboard progress is hydrated via client island (per-card fetch)
- **Banani:** Each campaign card on the dashboard shows the current raised / goal / donor count inline.
- **cagnottes.sn:** `GET /api/blocks` does NOT return `raised` / `donorCount` — these live on `GET /api/blocks/:id/progress`. The server component renders each `CampaignCard` initially with `raised=0, donorCount=0`, and a client sibling `ProgressHydrator` fetches progress per card after mount via `api()`. `CampaignCard` stays pure (Ring 2): props-only, no data fetching.
- **Rationale:** Fetching N progress endpoints from the server would serialize all of them; hydrating client-side parallelizes, respects Ring 2 purity, and keeps the first paint fast. The Phase 2 backend is the single source of truth — we do NOT mutate the backend to fold progress into `GET /api/blocks`.
- **Enforcement:** Plan 05-02 keeps data-fetching in `_ClientCampaignCard.tsx` (a client island inside `src/app/(authed)/tableau-de-bord/`), NOT in `src/components/cagnottes/CampaignCard.tsx`. Ring purity script passes.
- **Introduced by:** Plan 05-02

### D-15 — Create-success confetti uses inline CSS keyframes (zero dep)
- **Banani:** Screen 15 shows a static green check circle — no confetti.
- **cagnottes.sn:** The success page plays a subtle CSS-only confetti burst on mount (~25 LOC of Tailwind arbitrary `@keyframes` via a `<style>` tag), navy + pink + cream particles falling once. Zero new npm deps.
- **Rationale:** The moment of publication is a celebration beat — a restrained confetti burst sells the outcome. Framer Motion is banned by `CLAUDE.md`; CSS keyframes are the only sanctioned animation primitive. The static Banani mock loses nothing by adding this.
- **Enforcement:** Plan 05-02 verify step runs `git diff package.json` — must be empty. Confetti lives in an inline client island on the success page.
- **Introduced by:** Plan 05-02

### D-16 — Private-visibility helper text added per creator open-question
- **Banani:** Step-3 radio cards show only title + description (2 lines each).
- **cagnottes.sn:** Under the Private radio card, a small muted helper paragraph (`visibilityPrivateHelper`) explicitly states that the cagnotte won't be listed and only direct-link visitors can access it. This mirrors backend `T-02-02` `Cache-Control: private, no-store` behaviour in human language.
- **Rationale:** The creator open-question list flagged confusion between "private cagnotte" and "hide amount / hide donors" — the helper copy disambiguates at the point of decision.
- **Enforcement:** Plan 05-02 step-3 pages import `WIZARD_FIELDS.visibilityPrivateHelper` and render it under the private option.
- **Introduced by:** Plan 05-02

### D-17 — Wizard step-3 does NOT display commission to the creator
- **Banani:** No commission copy appears on any wizard step.
- **cagnottes.sn:** Keep it that way. Commission (6% solidaire / 8% festive) is **donor-facing** (shown on `/c/[slug]/paiement`), NOT creator-facing. The wizard is a creation flow — showing commission here would be anxiety-inducing and contradicts the "share freely" celebratory framing.
- **Rationale:** Commission is honestly disclosed to the paying party (donors) per D-04. The creator sees the real payout totals on the dashboard after the first PAID order. No deception — just correct placement of the disclosure.
- **Enforcement:** Plan 05-02 verify step greps `! grep -E "Offerts|6%|8%" src/app/(authed)/tableau-de-bord/nouvelle/`.
- **Introduced by:** Plan 05-02

### D-25 — birthDate dropped from profile form
- **Banani:** Screen 17 shows a "Date de naissance" field ("14 / 05 / 1992") in the profile form.
- **cagnottes.sn:** The field is OMITTED from `/profil`. Only Prénom, Nom, Email (readonly), Téléphone + avatar edit are shown.
- **Rationale:** The `Seller` Prisma model has no `birthDate` column and adding it is a schema migration. CLAUDE.md locks this: "Don't try to clean the schema as a side task." The field has no downstream consumer (KYC captures full name + ID, not DOB) and would silently black-hole if added without a matching column.
- **Enforcement:** Plan 06-01 T2 verify greps `! grep -q birthDate src/app/(authed)/profil/_ProfileForm.tsx`.
- **Introduced by:** Plan 06-01

### D-26 — No delete CTA on cagnotte edit (v1)
- **Banani:** Various cagnotte-edit surfaces hint at a destructive delete action.
- **cagnottes.sn:** v1 creators cannot self-delete cagnottes via UI — they contact support. A later plan will ship a soft-delete flow with a 7-day cooldown.
- **Rationale:** Delete is irreversible on donor-facing public pages and has to coordinate with webhook/payout reconciliation. v1 ships without it to avoid half-built recovery paths.
- **Enforcement:** Plan 06-02 T-cagnotte-edit MUST NOT render a delete button. Grep guard in 06-02 verify.
- **Introduced by:** Plan 06-01 (skeletal — enforced by 06-02)

### D-27 — "Retirer mes fonds" added to avatar dropdown
- **Banani:** The avatar dropdown on dashboard screens shows only "Mon profil" + "Se déconnecter".
- **cagnottes.sn:** We add a third menu item "Retirer mes fonds" → `/retraits` between "Mon profil" and "Se déconnecter". Rendered via `NAV_LABELS.retirerMesFonds`.
- **Rationale:** Withdrawals are the highest-intent action for an authenticated creator after KYC. Forcing the user to navigate through /profil/coordonnees-bancaires to reach retraits adds friction on the revenue-realization path. The dropdown is the obvious home.
- **Enforcement:** Plan 06-01 T1 adds the entry to `DashboardNavbar.tsx` (not `DashboardShell.tsx` — the dropdown JSX lives in the navbar). Plan 06-02 ships `/retraits` so the link is live by end of Phase 6.
- **Introduced by:** Plan 06-01

### D-28 — Profile uses GET /api/auth/me + PUT /api/sellers/profile (NOT /api/sellers/me)
- **Banani:** N/A — routing architecture.
- **cagnottes.sn:** The 06-01 PLAN.md interfaces section incorrectly describes `GET /api/sellers/me` and `PATCH /api/sellers/me` as existing endpoints. They do not exist in the fork. The real endpoints are `GET /api/auth/me` (already used by `(authed)/layout.tsx`) and `PUT /api/sellers/profile` (verb is PUT, path is `/profile`). The new `GET /api/sellers/me/participations` added in T0 is the ONLY `/me/*` endpoint — it's a separate specialised handler.
- **Rationale:** Phase 5 already wired `/api/auth/me` for the layout guard. Adding a redundant `/api/sellers/me` alias would create two sources of truth for seller identity. Respecting the existing contract (auth.me reads, sellers.put("/profile") writes) keeps the surface minimal.
- **Enforcement:** Plan 06-01 T2 `_ProfileForm.tsx` uses `api("/api/sellers/profile", { method: "PUT", ... })`. Server-side page reads via raw fetch to `/api/auth/me` (cookie forwarded). Grep guard in 06-01 T6 asserts `! grep -r "/api/sellers/me[^/]" src/app/(authed)/profil/`.
- **Introduced by:** Plan 06-01 (discovered during T2 implementation — Rule 1 auto-fix on incorrect plan contract)

### D-18 — Single payout account per seller (v1) — columns on Seller, no PayoutAccount model
- **Banani:** Screen 18 shows a CRUD list of payout accounts (add/delete multiple Wave / Orange / bank tiles) backed by an imagined `PayoutAccount` Prisma model and `/api/sellers/me/payout-accounts` REST surface.
- **cagnottes.sn:** v1 ships a single pre-registered payout method per seller stored as 4 columns on `Seller` (`payoutProvider`, `payoutPhone`, `payoutName`, `payoutCountry`). The "Coordonnées bancaires" page is a simple form (2 provider RadioCards + phone + name), saved via `PUT /api/sellers/profile` with those 4 fields. No list UI, no add/delete actions, no `PayoutAccount` table.
- **Rationale:** Backend already exposes `Seller.payout*` (schema.prisma:46-49) and both `GET /api/withdrawals/balance` and `POST /api/withdrawals` consume them directly. Adding a `PayoutAccount` model would be a 4-8h surgical refactor for zero v1 user value (the vast majority of creators have one payout method). v2 can migrate to a 1-to-many relation when use-cases appear.
- **Enforcement:** `src/app/(authed)/profil/coordonnees-bancaires/_BankForm.tsx` calls `api("/api/sellers/profile", { method: "PUT", body: { payoutProvider, payoutPhone, payoutName, payoutCountry } })`. No new endpoints created. `PayoutAccount` appears nowhere in `src/`.
- **Introduced by:** Plan 06-02 (design-time decision, confirmed against backend research)

### D-19 — Participations PDF export deferred to v2
- **Banani:** Screen 16 shows an "Exporter en PDF" button next to the Filter chip.
- **cagnottes.sn:** Both buttons are omitted in 06-01; creators who need an export can contact support. No jsPDF / @react-pdf/renderer dependency is added.
- **Rationale:** PDF export requires either a server-side renderer (Playwright / PDFKit) or a ~300KB client library. Both are out of scope for the v1 Phase 6 surface; the feed is already paginated and searchable from the DB if needed.
- **Enforcement:** `_ParticipationsClient.tsx` (06-01) has no export CTA. Zero PDF dependency in `package.json`.
- **Introduced by:** Plan 06-01 (surfaced again in 06-02 audit)

### D-20 — Withdrawal is seller-level, not per-cagnotte — route is /retraits (not /cagnottes/:slug/retrait)
- **Banani:** Withdrawal screens show a "Depuis la cagnotte" strip with a single cagnotte thumbnail; the target route is `/cagnottes/:slug/retrait`.
- **cagnottes.sn:** Withdrawals live at `/retraits` and operate on the seller-level aggregated balance (`GET /api/withdrawals/balance` returns `balance` across ALL cagnottes minus already-withdrawn/pending). There is no per-cagnotte retrait route. The balance strip reads "Solde disponible (toutes cagnottes confondues)".
- **Rationale:** The backend balance is computed seller-wide (`withdrawals.ts:95` — sum of `Order.sellerAmount` minus `Withdrawal` COMPLETED+PROCESSING minus PENDING). There is no per-block withdrawal accounting. Splitting the UX by cagnotte would require backend changes for zero functional gain.
- **Enforcement:** Route is `src/app/(authed)/retraits/page.tsx` (no `[slug]` segment). The avatar dropdown `Retirer mes fonds` entry added by 06-01 links to `/retraits`.
- **Introduced by:** Plan 06-02

### D-21 — Withdrawal flow is 4 routes (amount → PIN → confirm → success), not single-page
- **Banani:** Screen shows one long scrolling card with amount + destination + summary + confirm button all on the same page.
- **cagnottes.sn:** The flow is split into 4 dedicated routes for cleaner mobile UX and an explicit PIN gate: `/retraits` (amount + recipient), `/retraits/pin` (4-digit PIN entry), `/retraits/confirmation` (summary + `POST /api/withdrawals`), `/retraits/succes` (success screen). State persists across steps via `useWithdrawalDraft()` sessionStorage hook (key `cagnotte.withdrawal.draft.v1`).
- **Rationale:** Banani's long-scroll layout hides the PIN requirement (plan gap) and makes it hard to recover on error (the whole form rebuilds). Splitting into focused steps mirrors Phase 5 wizard (D-12 `useWizardDraft`), gives each step a single responsibility, and lets router `replace()` prevent back-button double-submits on success.
- **Enforcement:** 4 separate `page.tsx` files under `src/app/(authed)/retraits/`. `useWithdrawalDraft` cleared on success mount. Draft completeness checked on mount of pin/confirmation steps — incomplete draft → `router.replace("/retraits")`.
- **Introduced by:** Plan 06-02

### D-22 — Free Money excluded from payout recipient picker
- **Banani:** Screens hint at Wave / Orange Money / bank tiles (and CLAUDE.md calls for 3 providers: Wave / Orange / Free).
- **cagnottes.sn:** Only `wave_money` and `orange_money` are shown in the payout provider picker (both on `/profil/coordonnees-bancaires` and inside `/retraits`). Free Money option is excluded entirely.
- **Rationale:** `backend/src/routes/withdrawals.ts:42` enforces `provider: z.enum(["wave_money", "orange_money"])` — Bictorys payouts do not currently support Free Money disbursement. Exposing a Free Money tile in the UI would break at the API call. Bank RIB/IBAN is also excluded (covered by D-18 deferral).
- **Enforcement:** Grep guard `grep -rn "free_money" src/app/(authed)/profil/coordonnees-bancaires/ src/app/(authed)/retraits/` must return empty. `PayoutProvider` TS union in `src/lib/withdrawal/schema.ts` is explicitly `"wave_money" | "orange_money"`.
- **Introduced by:** Plan 06-02

### D-23 — Cagnotte stats uses a pure CSS bar chart (no Recharts)
- **Banani:** N/A — there is no Banani stats screen. Designed ourselves.
- **cagnottes.sn:** `/tableau-de-bord/cagnottes/[slug]/stats` renders the "Dons au fil du temps" timeline as a pure Tailwind CSS bar chart — each bucket is a `<div>` with an inline `style={{ height }}` percentage, bucketed by day from the raw `Order.paidAt` timestamps returned by `GET /api/cagnottes/:slug/participants`.
- **Rationale:** Recharts adds ~90 KB gzipped for a single chart on a single page. The v1 chart needs only simple daily bars — CSS is sufficient. Zero new deps is a hard constraint (see `package.json` guard in the plan).
- **Enforcement:** `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/stats/_TimelineChart.tsx` contains no `recharts` import. `git diff package.json package-lock.json` must be empty.
- **Introduced by:** Plan 06-02

### D-24 — Cagnotte edit never exposes or submits `slug`
- **Banani:** N/A — there is no Banani edit screen.
- **cagnottes.sn:** `/tableau-de-bord/cagnottes/[slug]/modifier` shows the current slug as a disabled readonly field for orientation, but the `PUT /api/blocks/:id` body NEVER contains a `slug` key (neither at the top level nor inside `config`). Slug rename is a v2 feature (see D-13 for slug ownership).
- **Rationale:** Slug renames would break every previously shared link and QR code. The backend accepts only `title`, `config`, `isActive` on `PUT /api/blocks/:id` anyway — even if a rogue client sent `slug`, it would be ignored by the zod schema, but defending in depth prevents accidental drift.
- **Enforcement:** Grep guard `grep -rn '"slug":' src/app/(authed)/tableau-de-bord/cagnottes/\[slug\]/modifier/` must return empty. `_EditForm.tsx` destructures `const { slug: _ignored, ...safeConfig } = initial.config` before building the PUT body, and has a runtime `delete nextConfig.slug` defensive guard.
- **Introduced by:** Plan 06-02

### D-29 — `/api/auth/me` select widened to include KYC document URLs + phone
- **Banani:** N/A — routing architecture.
- **cagnottes.sn:** Phase 6 plan 06-02 needs the `/profil/kyc` server component to read `kycStatus`, `kycFullName`, `kycIdUrl`, `kycSelfieUrl` to render the status pill + existing document previews, and `/profil` already renders the phone input. The original `GET /api/auth/me` select (auth.ts:443) did not include these columns. Widened the select to add `phone`, `phoneCountry`, `kycFullName`, `kycIdUrl`, `kycSelfieUrl`.
- **Rationale:** Adding a second `/api/sellers/me/kyc` round-trip would be extra network work for data that already lives on `Seller`. The widen is additive (no removed fields) and only exposes data the authenticated seller already owns.
- **Enforcement:** Server read path in `/profil/kyc/page.tsx` uses `fetch(${BACKEND}/api/auth/me)` with cookie forward and reads the KYC fields directly. Grep guard in T3: `grep -rn "r2\\.cloudflarestorage\\|\\.r2\\.dev" src/app/(authed)/profil/kyc/` must return empty — we only render via `/api/files/:key` proxy URLs.
- **Introduced by:** Plan 06-02 (Rule 2 auto-widen: missing critical read path)

***

## Deviation Template (for future entries)

### D-NN — Short title
- **Banani:** what the export says
- **cagnottes.sn:** what we ship
- **Rationale:** why
- **Enforcement:** how we prevent regression
- **Introduced by:** Plan NN-NN
