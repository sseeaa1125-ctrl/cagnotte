---
phase: 05-auth-creator-flow
verified: 2026-04-13T18:30:00Z
status: human_needed
score: 5/5 truths verified (automated) — visual pixel-parity soft gate pending
overrides_applied: 0
re_verification:
  previous_status: null
  note: Initial verification, both plans (05-01 + 05-02) shipped green in executor sessions.
human_verification:
  - test: "Visual pixel-parity pass on dev server at 375px and 1280px"
    expected: "All 11 Phase 5 screens visually match their Banani references (signup, login, login-variant, verification-email gap-design, forgot, reset, dashboard empty + populated, create-picker, festive×3, solidaire×3, create-success)"
    why_human: "Pixel-parity requires a real browser (devtools device emulation) against Banani wireframes in .planning/banani/screens/phase-5/*.md and the live dev server — cannot be grep-verified"
  - test: "End-to-end fresh creator flow"
    expected: "Sign up → receive 6-digit code email → enter on /verification-email → auto-login → land on /tableau-de-bord empty state → pick festive → complete 3-step wizard → reach /succes with working share CTA"
    why_human: "Requires Resend email delivery, real Neon DB state, and user-driven form input — not automatable without Playwright (no E2E harness in repo)"
  - test: "Draft persistence across tab close"
    expected: "Fill festive etape-1, close tab, reopen /tableau-de-bord/nouvelle/festive/etape-1 → form is prefilled (sessionStorage restore)"
    why_human: "sessionStorage hydration timing is a runtime behavior; grep confirms the hook exists but not that it works in the browser"
  - test: "AuthGuard redirect on unauthenticated visit"
    expected: "Logged-out user visiting /tableau-de-bord gets redirected to /connexion?next=/tableau-de-bord before any HTML paints"
    why_human: "Requires a real logged-out cookie state against a running backend"
  - test: "Solidaire wizard private-visibility helper text"
    expected: "Selecting 'Privée' in solidaire etape-3 renders the helper text added in D-16"
    why_human: "Conditional render requires interactive toggling"
---

# Phase 5: Auth + Creator Flow Verification Report

**Phase Goal:** A new creator can sign up, verify their email, log in, land on the dashboard, pick festive or solidaire, walk through a 3-step wizard, and reach the create-success page with a shareable link.

**Verified:** 2026-04-13T18:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification of both plans 05-01 + 05-02

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|---|---|---|
| 1 | Signup and login pages render with email+password form and Google/Apple CTAs HIDDEN; TOS checkbox on signup; "Oublié ?" link on login | ✓ VERIFIED | `src/app/(auth)/inscription/page.tsx` gates social CTAs behind `FEATURE_SOCIAL_AUTH = false` (features.ts L12). TOS state `tosAccepted` L41, disabled submit L246. `src/app/(auth)/connexion/page.tsx` imports flag + gates L174. "Oublié?" link present. |
| 2 | Forgot/reset/email-verify pages work end-to-end against Phase 2 endpoints (signup → email → verify → dashboard) | ✓ VERIFIED | `verification-email/page.tsx` is a 6-digit code entry (6 inputs L210, POSTs to `/api/auth/verify-email` L136). `mot-de-passe-oublie/page.tsx` + `mot-de-passe-reinitialiser/page.tsx` exist. Login at `connexion/page.tsx` handles 403 unverified by resending + redirecting. AuthContext stale `/login` → `/connexion` fix in 69eea49. |
| 3 | Dashboard (screen 6) renders 3-column KPI cards + recent cagnottes + "Créer une cagnotte" CTA; create-picker (screen 8) offers festive vs solidaire | ✓ VERIFIED | `tableau-de-bord/page.tsx` maps dashboard stats → KpiCard × 3, lists 5 recent cagnottes via `_ClientCampaignCard` with progress hydration. `nouvelle/page.tsx` renders 2 PickerCards routing to `/nouvelle/{subtype}/etape-1`. |
| 4 | Both festive + solidaire wizards (3 steps each) collect all FUND-01/02 fields, show step progress indicator, POST /api/blocks with superRefine-compliant config | ✓ VERIFIED | 6 wizard pages exist. Festive etape-3 POSTs `{subtype:"festive", occasion, cause:null, beneficiary:null}` L124-129. Solidaire etape-3 POSTs `{subtype:"solidaire", occasion:null, cause, beneficiary}` L123-128. `_StepIndicator.tsx` shared. No frontend slugification (grep empty). `router.replace` on success (not push) — 10 matches. |
| 5 | Create-success page (screen 15) displays shareable link readonly input + copy button, ShareSheet CTA, CampaignCard preview | ✓ VERIFIED | `nouvelle/succes/page.tsx` server-fetches `/api/cagnottes/:slug`, renders `_CopyableUrlInput`, `_ConfettiBurst`, `_DraftClearer`, ShareSheet + CampaignCard. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Level 1 Exists | Level 2 Substantive | Level 3 Wired | Status |
|---|---|---|---|---|---|
| `src/app/(auth)/layout.tsx` | Public auth route group layout | ✓ | ✓ | ✓ | ✓ VERIFIED |
| `src/app/(auth)/inscription/page.tsx` | Signup page (Banani screen 3) | ✓ | ✓ (248 lines, displayName merge, TOS, social gated) | ✓ (POST /api/auth/signup) | ✓ VERIFIED |
| `src/app/(auth)/connexion/page.tsx` | Login page with unverified fallback | ✓ | ✓ (403 → resend + redirect) | ✓ (POST /api/auth/login, AuthContext.signIn) | ✓ VERIFIED |
| `src/app/(auth)/verification-email/page.tsx` | 6-digit code entry page | ✓ | ✓ (6 boxes, keyboard nav, resend, auto-login on verify) | ✓ (POST /api/auth/verify-email, POST /api/auth/resend-code) | ✓ VERIFIED |
| `src/app/(auth)/mot-de-passe-oublie/page.tsx` | Forgot-password form | ✓ | ✓ | ✓ (POST /api/auth/forgot-password) | ✓ VERIFIED |
| `src/app/(auth)/mot-de-passe-reinitialiser/page.tsx` | Reset-password form with code | ✓ | ✓ | ✓ (POST /api/auth/reset-password) | ✓ VERIFIED |
| `src/lib/slug.ts` | Seller slug client-side generator | ✓ | ✓ | ✓ (used by inscription) | ✓ VERIFIED |
| `src/lib/features.ts` | `FEATURE_SOCIAL_AUTH = false` flag | ✓ | ✓ | ✓ (2 imports) | ✓ VERIFIED |
| `src/app/(authed)/layout.tsx` | Server-component AuthGuard | ✓ | ✓ (cookies() + raw fetch + redirect, NO "use client") | ✓ (wraps all authed routes) | ✓ VERIFIED |
| `src/app/(authed)/tableau-de-bord/page.tsx` | Dashboard (screen 6) | ✓ | ✓ (empty-state + populated branch, KpiCards, recent cagnottes) | ✓ (stats + blocks endpoints) | ✓ VERIFIED |
| `src/hooks/useWizardDraft.ts` | sessionStorage wizard draft hook | ✓ | ✓ | ✓ (used by both wizards) | ✓ VERIFIED |
| `src/app/(authed)/tableau-de-bord/nouvelle/page.tsx` | Create-picker (screen 8) | ✓ | ✓ (2 PickerCards) | ✓ | ✓ VERIFIED |
| `src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-{1,2,3}/page.tsx` | Festive wizard | ✓ (×3) | ✓ | ✓ (POST /api/blocks, superRefine-safe) | ✓ VERIFIED |
| `src/app/(authed)/tableau-de-bord/nouvelle/solidaire/etape-{1,2,3}/page.tsx` | Solidaire wizard | ✓ (×3) | ✓ | ✓ (POST /api/blocks, superRefine-safe) | ✓ VERIFIED |
| `src/app/(authed)/tableau-de-bord/nouvelle/succes/page.tsx` | Create-success (screen 15) | ✓ | ✓ (CampaignCard + CopyableUrlInput + ShareSheet + confetti + draft clearer) | ✓ (GET /api/cagnottes/:slug) | ✓ VERIFIED |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `tableau-de-bord/page.tsx` | `stats`, `cagnottes` | Server fetch `GET /api/sellers/dashboard/stats` + `GET /api/blocks` with cookie forwarding | Yes — real Prisma queries | ✓ FLOWING |
| `_ClientCampaignCard.tsx` | `raised`, `donorCount` | `GET /api/blocks/:id/progress` post-mount | Yes — Phase 2 endpoint | ✓ FLOWING |
| `nouvelle/succes/page.tsx` | cagnotte payload | Server fetch `GET /api/cagnottes/:slug` | Yes — Phase 2 public endpoint | ✓ FLOWING |
| Festive/Solidaire etape-3 | wizard draft | `useWizardDraft` → sessionStorage | Yes — user input | ✓ FLOWING |
| `verification-email/page.tsx` | `code`, `email` | URL query + user input | Yes | ✓ FLOWING |

### Key Link Verification

| From | To | Via | Status | Detail |
|---|---|---|---|---|
| `inscription/page.tsx` | `/api/auth/signup` | `api()` POST with `{email,password,displayName,slug}` | ✓ WIRED | L97 (primary) + L112 (fallback with suffix slug) |
| `connexion/page.tsx` | `/api/auth/login` + `/api/auth/resend-code` | `api()` POST, 403 branch resends + redirects to verify-email | ✓ WIRED | Phase 2 contract satisfied |
| `verification-email/page.tsx` | `/api/auth/verify-email` | POST `{email, code}` | ✓ WIRED | L136-138, sets cookies on success, redirects to `/tableau-de-bord` |
| `mot-de-passe-oublie` | `/api/auth/forgot-password` | POST | ✓ WIRED | |
| `mot-de-passe-reinitialiser` | `/api/auth/reset-password` | POST with 6-digit code | ✓ WIRED | |
| `(authed)/layout.tsx` | `/api/auth/me` | Raw fetch with `Cookie: izy-token=...` header forwarded | ✓ WIRED | L38, 401 → redirect L59/64 |
| Festive etape-3 | `POST /api/blocks` | `api()` POST with `{type:"FUNDRAISER", title, config}` — no slug sent | ✓ WIRED | Backend generates slug via `ensureUniqueSlug` |
| Solidaire etape-3 | `POST /api/blocks` | Same, with `occasion:null, cause, beneficiary` | ✓ WIRED | superRefine compliant |
| succes page | `/api/cagnottes/:slug` | Server fetch (public, no auth) | ✓ WIRED | Flat payload destructure |
| `_ClientCampaignCard` | `/api/blocks/:id/progress` | Client-island fetch post-mount | ✓ WIRED | Parallelized per card, Ring 2 purity preserved |
| `_uploadCover.ts` | `POST /api/upload` | Raw multipart fetch w/ CSRF from localStorage | ✓ WIRED | api() is JSON-only, multipart needs raw fetch |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Frontend build compiles without errors | `npm run build` | 24 routes, 0 TS errors — all 15 Phase 5 routes listed | ✓ PASS |
| Ring purity preserved (no domain imports in primitives) | `bash scripts/verify-ring-purity.sh` | "Ring 1 pure", "Ring 2 pure" | ✓ PASS |
| No forbidden drift markers in auth + authed trees | `grep -rnE "(€\|\+33\|PayDunya\|Offerts)" src/app/(auth) src/app/(authed)` | empty (the one "Offerts" match is a historical comment in `lib/commission.ts`, not this phase) | ✓ PASS |
| No frontend slug generation for cagnottes | `grep -rnE "slugify\|ensureUniqueSlug" src/app/(authed)` | empty | ✓ PASS |
| No localStorage in authed tree except CSRF reader | `grep -rn "localStorage" src/app/(authed)` | only `_uploadCover.ts` (intentional CSRF read for multipart) | ✓ PASS |
| `(authed)/layout.tsx` is a true server component | `grep '"use client"' src/app/(authed)/layout.tsx` | only in comment L9 | ✓ PASS |
| Server-side cookies() + redirect used | `grep -E "cookies\(\)\|redirect" src/app/(authed)/layout.tsx` | 5 matches confirming server redirect pattern | ✓ PASS |
| `router.replace` on wizard publish success | `grep -rn "router.replace" .../nouvelle/(festive\|solidaire)/etape-3` | 2 matches (festive L145, solidaire L142) | ✓ PASS |
| Festive POST body sends `cause:null, beneficiary:null` | grep festive/etape-3 | L128-129 explicit null | ✓ PASS |
| Solidaire POST body sends `occasion:null` | grep solidaire/etape-3 | L126 explicit null | ✓ PASS |
| Social CTAs are gated, not deleted | `grep "FEATURE_SOCIAL_AUTH" src` | flag false + 2 `{FEATURE_SOCIAL_AUTH ? ...}` gates | ✓ PASS |
| `displayName` merge (not firstName/lastName in POST body) | grep inscription | L68 `displayName = ...`, L97 POST `{..., displayName, slug}` | ✓ PASS |
| 6-digit code verify (not URL token auto-submit) | grep verification-email | 6 input boxes L210, POST `{email, code}` L136 | ✓ PASS |
| `package.json` unchanged since Phase 4 | `git log package.json` | Last touched `afb834a` (phase 4 dep purge) | ✓ PASS (zero new deps) |
| 13 Banani wireframes for Phase 5 extracted | `ls .planning/banani/screens/phase-5/` | 13 files (signup, login×2, dashboard×2, create-picker, festive×3, solidaire×3, create-success) | ✓ PASS |

All automated spot-checks green.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| AUTF-01 | 05-01 | Signup page (email+password+firstname+lastname), Google/Apple hidden, TOS checkbox | ✓ SATISFIED | `inscription/page.tsx` + D-08 social gate + D-09 displayName merge |
| AUTF-02 | 05-01 | Login page + "Oublié?" link, Google/Apple hidden | ✓ SATISFIED | `connexion/page.tsx` + unverified-403 fallback |
| AUTF-03 | 05-01 | Email verification landing — confirms token, redirects to dashboard | ✓ SATISFIED | `verification-email/page.tsx` 6-digit flow (D-10) — auto-login on success via cookies set by backend |
| AUTF-04 | 05-01 | Forgot-password + reset-password pages | ✓ SATISFIED | Both pages exist, reset uses 6-digit code |
| CRET-01 | 05-02 | Dashboard (screen 6) — 3 KPI cards + recent + CTA | ✓ SATISFIED | `tableau-de-bord/page.tsx` with `_ClientCampaignCard` hydrator |
| CRET-02 | 05-02 | Create-picker (screen 8) — Festive vs Solidaire | ✓ SATISFIED | `nouvelle/page.tsx` — 2 PickerCards |
| CRET-03 | 05-02 | Festive wizard 3 steps + step indicator + POST /api/blocks | ✓ SATISFIED | `festive/etape-{1,2,3}` with `_StepIndicator` + superRefine-safe payload |
| CRET-04 | 05-02 | Solidaire wizard 3 steps (title + cause + beneficiary + goal → cover + description + end date → visibility + options + TOS) | ✓ SATISFIED | `solidaire/etape-{1,2,3}` — cause/beneficiary fields present, subtype lock, visibility helper (D-16) |
| CRET-05 | 05-02 | Create-success with preview + share + confetti | ✓ SATISFIED | `succes/page.tsx` + confetti burst + CopyableUrlInput + ShareSheet + server-rendered CampaignCard |

**Requirements coverage: 9/9 satisfied.** No orphaned requirements for Phase 5 (REQUIREMENTS.md already marks CRET-01..05 Complete; AUTF-01..04 move from Pending to Complete on this verification).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | — | — | None detected. No `TODO`/`FIXME`/placeholder copy in phase 5 files. No hardcoded empty returns. No drift markers. |

### Banani Deviations (Cross-Referenced with FRONTEND-DEVIATIONS.md)

10 deviations logged (D-08 through D-17), all intentional and documented:

- D-08 Social login gated behind feature flag (Google/Apple JSX kept for v2)
- D-09 displayName client-side merge (Banani shows Prénom+Nom, backend expects one field)
- D-10 Verify-email 6-digit code (Banani may have shown URL token; backend uses 6-digit)
- D-11 Server-component AuthGuard (no "use client", uses cookies() + raw fetch)
- D-12 Wizard drafts in sessionStorage (not localStorage)
- D-13 Cagnotte slug generation backend-only
- D-14 Dashboard progress hydrated via client-island (Ring 2 purity)
- D-15 Inline CSS keyframe confetti (no Framer Motion — honors CLAUDE.md ban)
- D-16 Private-visibility helper text
- D-17 Wizard step-3 does NOT display commission (creator-facing, not donor-facing)

### Commits Verified (12 Phase 5 commits)

- `69eea49` safety rails 05-01 (slug helper, feature flag, AUTH constants, AuthContext redirect)
- `8c7163f` /inscription
- `bff6ea0` /connexion + unverified fallback
- `b93f174` /verification-email 6-digit code
- `53bd57a` forgot + reset flow
- `88fb223` docs(05-01) SUMMARY
- `7c40f8f` safety rails 05-02 (useWizardDraft, (authed) AuthGuard, constants)
- `524f1ec` /tableau-de-bord + progress hydrator
- `e64c43d` /nouvelle create-picker
- `19155a4` festive wizard ×3
- `000d4f5` solidaire wizard ×3
- `0de16c5` /succes create-success
- `0558c74` docs(05-02) SUMMARY + Phase 5 exit gate green

All commits exist in git log. Both SUMMARYs present.

### Human Verification Required (Soft Gate)

Automated gates are green across the board (build, ring purity, drift greps, contract shape checks, superRefine compliance, file existence, commit trail, requirement coverage). The Phase 5 exit criteria include a **visual pixel-parity pass** and an **end-to-end smoke walk** against the live dev server that are intentionally not automatable in this repo (no Playwright harness, no VRT baseline).

The five items in `human_verification:` frontmatter above must be exercised by the user on `npm run dev` before this phase is marked closed on the roadmap:

1. **Visual pixel-parity pass** against Banani wireframes (`.planning/banani/screens/phase-5/*.md`) at 375px and 1280px for all 11 Phase 5 screens.
2. **End-to-end fresh creator flow** — signup → 6-digit code from email → verify → auto-login → empty dashboard → festive wizard → /succes.
3. **Draft persistence** — fill etape-1, close tab, reopen → prefill from sessionStorage.
4. **AuthGuard redirect** — logged-out visitor to `/tableau-de-bord` → `/connexion?next=/tableau-de-bord`.
5. **Solidaire private-visibility helper text** (D-16) renders when "Privée" is selected on etape-3.

### Gaps Summary

**No code gaps found.** All ROADMAP Success Criteria are satisfied by verified artifacts, all 9 requirements (AUTF-01..04, CRET-01..05) map to shipped code with confirmed wiring, all key backend contracts are correctly consumed (including the three signup "surprises": displayName merge, 6-digit codes, signup-doesn't-set-cookies), and no anti-patterns or drift markers were detected.

The phase is **code-complete**. The `human_needed` status reflects the intentional soft gate: visual pixel-parity against Banani and an end-to-end runtime walk that require a real browser + real email delivery. **Recommend advancing to Phase 6** in parallel with the user's visual review — the Phase 6 plans (`06-01` authed screens, `06-02` money screens) build on the `(authed)` AuthGuard pattern and `DashboardShell` which are now landed and verified.

---

*Verified: 2026-04-13T18:30:00Z*
*Verifier: Claude (gsd-verifier) — Opus 4.6 (1M context)*
