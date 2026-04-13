---
phase: 8
plan: post-qa-fixpack
subsystem: cross-cutting
tags: [fixpack, qa, routing, auth, google-oauth, brand, ux]
decisions: []
completed: 2026-04-13
---

# Phase 8 Post-QA Fixpack Summary

**One-liner:** 11 user-reported manual-QA bugs fixed as a flat sequence of atomic commits directly on `main`, including a hand-rolled Google OAuth end-to-end flow (zero new npm deps).

## Commit manifest (chronological)

| #  | Commit    | Fix          | Description                                                                 |
| -- | --------- | ------------ | --------------------------------------------------------------------------- |
| 1  | `a6a0d15` | FIX 1        | rename `/toutes-les-cagnottes` → `/cagnottes` + refs (sitemap, home, load-more, participations deep links, withdrawal success, participations empty CTA) |
| 2  | `33674d3` | FIX 2        | add `/comment` how-it-works stub page (3 numbered step cards + CTA)         |
| 3  | `6bede7a` | FIX 3        | add `/a-propos` about-us stub page (4-paragraph mission brief)              |
| 4  | `e4350fb` | FIX 4        | dashboard nav `/mes-participations` → `/participations`                     |
| 5  | `dae9e8b` | FIX 5 (+ #6) | `PublicNavbar` dynamic auth state via `useAuth` — ghost dropdown + logout — also the root cause for bug #6 (session persistence)                       |
| 6  | `739cbe9` | FIX 7        | cagnotte edit form — visibility editable via `VisibilityCard`, endDate via `<Calendar>` primitive |
| 7  | `da5ffd0` | FIX 8        | "En ligne" badge matches Banani tight green pill (`rounded-md px-2 py-1 text-xs font-bold bg-green-100 text-green-700`) |
| 8  | `84da999` | FIX 9        | brand URL consistency `cagnottes.sn` → `cagnotte.sn` (no S) — 11 files      |
| 9  | `710123c` | FIX 11 (BE)  | hand-rolled Google OAuth: `/api/auth/google/authorize` + `/google/callback` (zero new deps) |
| 10 | `4c9475c` | FIX 11 (FE)  | enable `FEATURE_SOCIAL_AUTH`, wire Google button on `/inscription` + `/connexion`, surface OAuth error toasts |

**Fixes 6 + 10 + 12:**
- **FIX 6 (session persistence):** no code change required — `AuthContext.fetchSeller()` already fires on mount and `api()` already auto-refreshes on 401. Root cause was #5 (PublicNavbar was hardcoded static).
- **FIX 10 (Calendar visual polish):** `Calendar.tsx` already matches the Banani reference closely (w-[320px], rounded-2xl shadow-xl, Monday-first grid, French month names, today ring, selected pill). The only minor deviations (cell size 11×11 vs 10×10, footer action buttons) were left as-is to preserve keyboard accessibility (48px touch target) and avoid regressing the primitive for other plans (Phase 7 wizard steps).
- **FIX 12 (home "Voir toutes" link):** covered by FIX 1 — home page now points at `/cagnottes`.

## What shipped

### Routing (1, 2, 3, 4, 12)
- `/toutes-les-cagnottes` renamed to `/cagnottes` (git mv + 5 frontend ref updates).
- `/comment` stub at `src/app/(public)/comment/page.tsx` with `HOW_IT_WORKS_LABELS` in constants.
- `/a-propos` stub at `src/app/(public)/a-propos/page.tsx` with `ABOUT_LABELS` in constants.
- `DashboardNavbar` participations link fixed to `/participations`.

### Auth state visibility (5, 6)
- `PublicNavbar.tsx` now imports `useAuth`. When `loading` shows a skeleton; when `seller` exists shows "Tableau de bord" + Avatar dropdown (profil / notifications / retraits / déconnexion); when null shows Connexion + Inscription CTAs. Mobile menu mirrors the conditional.

### Cagnotte edit form (7)
- `_EditForm.tsx` now exposes `visibility` as an editable field via two `<VisibilityCard>` radios (public/private).
- `endDate` field replaced `<Input type="date">` with the `<Calendar>` primitive (minDate = today, clearable).
- PUT body sent to `/api/blocks/:id` now carries `visibility` (backend Zod schema already accepted it).
- D-24 slug-safety contract preserved unchanged.

### Brand consistency (8, 9)
- `Badge` variant `status-active` rewritten per Banani reference. Dropped the manual green-dot indicator from the creator detail header.
- 11 files updated from `cagnottes.sn` → `cagnotte.sn` (sitemap/robots fallbacks, layout metadataBase, /c/[slug] OG siteName, /merci fallback, creator detail share URL, edit form read-only URL, home meta, signup slug preview, TOS acceptance string).

### Google OAuth (11)
- **Backend** (`backend/src/routes/auth.ts`): two new handlers added at the end of `authRouter` (outside CSRF group since they're GET):
  - `GET /api/auth/google/authorize` — generates 32-byte CSRF state, stores in httpOnly `izy-google-state` cookie (10 min, path=/api/auth, sameSite=lax), 302 redirects to `https://accounts.google.com/o/oauth2/v2/auth` with `openid email profile` scope.
  - `GET /api/auth/google/callback` — verifies state matches cookie, exchanges code for `id_token` via native `fetch` against `https://oauth2.googleapis.com/token`, decodes JWT middle segment (base64url → JSON), upserts `Seller` by email (links `googleId` to existing account or creates new one with `password=null`, `emailVerified=true`, auto-generated slug via `generateAvailableSlug`), issues `izy-token` + `izy-refresh` + `izy-csrf` cookies, 302 redirects to `${FRONTEND_URL}/tableau-de-bord`.
  - Error paths redirect to `${FRONTEND_URL}/connexion?error=google_failed` (token exchange failure, decode failure) or `?error=email_in_use` (account linked to different Google ID).
- **Frontend:**
  - `src/lib/features.ts` — `FEATURE_SOCIAL_AUTH` flipped to `true`.
  - `/inscription` + `/connexion` — Google button wired via `window.location.href = ${BACKEND_URL}/api/auth/google/authorize` (full redirect, not a fetch). Inscription form wrapped in `Suspense` to read `useSearchParams()`. Both pages surface OAuth error toasts. Apple button removed (not in scope).

## Security notes accepted as v1 trade-offs

- **id_token signature is not verified** — the callback trusts Google's HTTPS endpoint. v2 should fetch Google's JWKS and verify via `jose`. Documented inline in `backend/src/routes/auth.ts`.
- **Google state cookie** uses `sameSite: "lax"` always (not prod-conditional) — required for OAuth redirect to send the cookie back.

## Verification

- `npm run build` (frontend): 0 TS errors, all routes registered including `/cagnottes`, `/comment`, `/a-propos`.
- `cd backend && npm run build` (backend): 0 TS errors.
- `git diff package.json`: empty. `git diff backend/package.json`: empty.
- Forbidden-pattern grep (`€`, `+33`, `PayDunya`, `Offerts`): only a single-comment mention in `commission.ts` (historical reference). No user-visible leaks.
- 10 commits on `main`, none destructive, all follow `fix(08):` / `feat(08):` convention.

## Deferred / out of scope

- **Calendar footer Effacer/Appliquer buttons** — the Banani calendar-open reference includes a footer with "Effacer" and "Appliquer" buttons and a tight 10×10 day cell. Current `Calendar.tsx` uses an X clear button adjacent to the trigger and 11×11 cells to preserve 48px touch targets. Aligning would require a primitive rewrite with state buffering (value candidate vs confirmed). Deferred to a future polish pass.
- **Apple OAuth** — excluded from FIX 11 per plan scope. Requires Apple Developer account + private key generation + distinct JWKS handling.
- **Google id_token signature verification** — v2 hardening. See security notes above.
- **Footer `contact@cagnottes.sn` email** — left as-is because changing an inbox address requires DNS + Resend inbox setup, not a frontend fix. User can flag for infra.
- **`src/lib/slug.ts` doc comment** still references `cagnottes.sn/<slug>` — intentional, it describes a historical wording the debounced preview used to show. No user impact.

## Self-Check: PASSED

Files verified present:
- `src/app/(public)/cagnottes/page.tsx` (renamed), `src/app/(public)/cagnottes/LoadMore.tsx` (renamed)
- `src/app/(public)/comment/page.tsx` (new), `src/app/(public)/a-propos/page.tsx` (new)
- All 10 commits present in `git log --oneline` as `a6a0d15 … 4c9475c`.

Build green on both frontend (`npm run build`) and backend (`cd backend && npm run build`).
