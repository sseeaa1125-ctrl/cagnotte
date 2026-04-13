---
phase: 05-auth-creator-flow
plan: 05-01
name: Public auth screens (inscription, connexion, verification-email, forgot/reset)
status: green
requirements: [AUTF-01, AUTF-02, AUTF-03, AUTF-04]
audited_from_prior_session: true
---

# Plan 05-01 — SUMMARY

## Outcome

Public auth is shipped. A new creator can sign up, receive a 6-digit verification code by email, enter it on the verify page, get auto-logged-in via the cookies the backend sets on successful verification, and land on the dashboard. Forgot-password → reset-password uses the same 6-digit code flow. Login with an unverified email auto-resends the code and redirects to `/verification-email?email=...`.

All 4 AUTF requirements satisfied. Verification gates green.

## Commits (shipped in prior session)

| Commit | Task | Message |
|---|---|---|
| `69eea49` | T0 | safety rails — slug helper, feature flag, AUTH constants, AuthContext redirect |
| `8c7163f` | T2 | /inscription signup page (Banani screen 3) |
| `bff6ea0` | T3 | /connexion login page with unverified-email fallback (Banani screens 4+5) |
| `b93f174` | T4 | /verification-email 6-digit code entry page |
| `53bd57a` | T5 | forgot-password + reset-password flow |

## Files created

- `src/app/(auth)/layout.tsx` — public auth route group layout, wraps `PublicNavbar` + minimal footer
- `src/app/(auth)/inscription/page.tsx` — signup page (Banani screen 3)
- `src/app/(auth)/connexion/page.tsx` — login page (Banani screens 4 + 5 merged as one route with error state)
- `src/app/(auth)/verification-email/page.tsx` — 6-digit code entry (gap screen, designed in-house)
- `src/app/(auth)/mot-de-passe-oublie/page.tsx` — forgot-password form
- `src/app/(auth)/mot-de-passe-reinitialiser/page.tsx` — reset-password form
- `src/lib/slug.ts` — seller slug client-side generator + `/api/auth/check-slug` probe
- `src/lib/features.ts` — `FEATURE_SOCIAL_AUTH = false` feature flag

## Files modified

- `src/lib/constants.ts` — auth labels, TOS copy, verify-email instructions, forgot/reset copy
- `src/contexts/AuthContext.tsx` — stale `/login` redirect fixed to `/connexion`
- `.planning/banani/FRONTEND-DEVIATIONS.md` — 3 new entries (see Deviations section below)

## Requirements → file mapping

| Req | File(s) | Status |
|---|---|---|
| AUTF-01 signup form + TOS + social CTAs hidden | [inscription/page.tsx](../../../src/app/(auth)/inscription/page.tsx), [features.ts](../../../src/lib/features.ts) | ✅ |
| AUTF-02 login form + "Oublié ?" link + unverified fallback | [connexion/page.tsx](../../../src/app/(auth)/connexion/page.tsx) | ✅ |
| AUTF-03 email-verify landing (6-digit code) + auto-login on success | [verification-email/page.tsx](../../../src/app/(auth)/verification-email/page.tsx) | ✅ |
| AUTF-04 forgot/reset flow end-to-end | [mot-de-passe-oublie/page.tsx](../../../src/app/(auth)/mot-de-passe-oublie/page.tsx), [mot-de-passe-reinitialiser/page.tsx](../../../src/app/(auth)/mot-de-passe-reinitialiser/page.tsx) | ✅ |

## Backend contract surprises — all addressed

1. **displayName merge** — `inscription/page.tsx` accepts prénom + nom as local form state, concatenates → `displayName` before POST `/api/auth/signup`. Grep confirms `displayName` present in the page and `firstName`/`lastName` are local-only. No `tosAccepted` field sent (TOS is UI-only).
2. **6-digit codes (not URL tokens)** — `verification-email/page.tsx` and `mot-de-passe-reinitialiser/page.tsx` both show a 6-digit code input. No URL-token auto-submit.
3. **Signup does NOT set cookies** — signup redirects to `/verification-email?email=...`. Only `verify-email` success sets cookies. `connexion/page.tsx` handles the 403 unverified case by auto-calling `/api/auth/verify-email/resend` and redirecting to the verify page.

## Banani → cagnottes.sn deviations (logged in FRONTEND-DEVIATIONS.md)

- **D-08 Social login gated** — Google / Apple / "Continuer avec email" CTAs kept in JSX behind `{FEATURE_SOCIAL_AUTH && ...}` gate in `features.ts`. V2 flips the flag.
- **D-09 displayName merge** — Banani signup form shows separate `Prénom` + `Nom` fields; backend expects a single `displayName`. Merged client-side.
- **D-10 Verify-email 6-digit code** — Banani may show a link-based flow; backend uses 6-digit codes. Gap-designed in Banani visual language (navy card, Poppins heading, 6-char input group).

## Verification gates (live check)

| Gate | Result |
|---|---|
| `npm run build` | 0 TS errors ✅ |
| `bash scripts/verify-ring-purity.sh` | Ring 1 + Ring 2 green ✅ |
| `grep -rnE "(€|\+33|PayDunya|Offerts)" src/app/(auth)/ src/lib/slug.ts src/lib/features.ts` | empty ✅ |
| `grep "displayName" src/app/(auth)/inscription/page.tsx` | present ✅ |
| `grep "localStorage" src/app/(auth)/` | empty (sessionStorage only) ✅ |
| `grep "code" src/app/(auth)/verification-email/page.tsx` | present ✅ |
| `grep "FEATURE_SOCIAL_AUTH" src/lib/features.ts` | 2 matches ✅ |
| Banani wireframes extracted | `.planning/banani/screens/phase-5/{signup,login,login-variant}.md` ✅ |

## Soft gate (human)

- **Visual pixel-parity pass** against Banani screens 3 + 4 at 375px and 1280px on dev server. The executor used the extracted wireframes (`.planning/banani/screens/phase-5/*.md`) as design reference. The user should visit `/inscription`, `/connexion`, `/verification-email`, `/mot-de-passe-oublie`, `/mot-de-passe-reinitialiser` in `npm run dev` and confirm visual fidelity.

## Handoff to 05-02

Plan 05-02 (creator flow) can proceed. The login happy path redirects to `/tableau-de-bord` — 05-02 T1 ships the `(authed)` layout + AuthGuard + dashboard. Wave 2 unblocked.

## Duration

Code shipped in prior session. This summary = audit-only pass, ~5 min.
