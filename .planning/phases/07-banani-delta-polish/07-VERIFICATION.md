---
phase: 07-banani-delta-polish
verified: 2026-04-13T23:30:00Z
status: human_needed
score: 8/8 must-haves verified (automated); 6 soft-gate items pending human walkthrough
overrides_applied: 0
milestone: cagnottes-sn-v1
milestone_status: code_complete_all_phases
human_verification:
  - test: "Phase 7 — dashboard → creator detail navigation + owner gate"
    expected: "Log in as seller A, visit /tableau-de-bord, click any cagnotte card → lands on /tableau-de-bord/cagnottes/{slug} (NOT /c/{slug}). Page shows: cover thumbnail, 'En ligne' pill, title, Cagnotte Festive/Solidaire subtype, Gérer/Partager buttons, 2-col KPI grid (Montant récolté + Participations), navy-bordered Withdraw Action Box with pink decorative blob, recent participations list, 3-card sidebar (Lien / Visibilité / Zone de danger). Then visit /tableau-de-bord/cagnottes/{slug-of-seller-B} → returns 404 (NOT 403)."
    why_human: "Visual parity against Banani DashboardCagnotteDetail + multi-account owner-gate test requires live session + a second seller account."
  - test: "Phase 7 — both navbars show lowercase two-tone cagnotte.sn wordmark"
    expected: "Visit / (logged out) → PublicNavbar shows 'cagnotte' (navy, font-black tracking-tighter) + '.sn' (text-gray-400, lighter/smaller). Visit /tableau-de-bord (logged in) → DashboardNavbar renders the same two-span pattern. Both pure text (no image asset)."
    why_human: "Visual rendering verification on actual fonts (Poppins + Inter via next/font)."
  - test: "Phase 7 — /retraits full flow visual walkthrough"
    expected: "/retraits: dark-navy hero header, numbered pink-circle step markers (1 Montant, 2 Destination), Wave (#3374FF) + Orange (#FF6600) operator tiles with 'Instantané' green chip, RÉCAPITULATIF DU RETRAIT uppercase summary, lock-icon 'Transaction sécurisée' footer. /retraits/pin: rounded-[2.5rem] card, ShieldCheck hero in bg-blue-50 w-20 h-20 rounded-full, heading 'Vérification de sécurité', helper references 'votre code PIN à 4 chiffres' (NO SMS/phone mask/countdown/Renvoyer link), 4-cell PIN grid with animate-pulse caret on active cell. /retraits/succes: animate-ping green halo over bg-[#E6F3EE] Check icon circle."
    why_human: "Mobile-first visual parity across 3 pages requires dev-server walkthrough + touch-target feel on a real device."
  - test: "Phase 7 — /profil/coordonnees-bancaires two-card layout"
    expected: "Two cards stacked: Comptes Mobile Money (Wave/Orange colored-initial tile + formatted phone + 'Actif' badge + inline BankForm below a border-t separator), Comptes Bancaires (dashed-border empty state, disabled 'Ajouter un compte bancaire' button with TODO PHASE-8 tooltip/note), footer security notice 'Sécurité de vos coordonnées'. No Free Money anywhere."
    why_human: "Visual layout + inline BankForm interaction flow + the D-22 'no Free Money' policy all need manual confirmation against Banani UserPaymentMethods.jsx."
  - test: "Phase 7 — wizard new primitives (Calendar + Combobox) in festive + solidaire"
    expected: "Festive étape 1: Occasion field opens a Combobox popover (NOT native dropdown) with 7 emoji-iconed rows + horizontal divider above 'Autre occasion', hover-check preview, Escape closes. Solidaire étape 1: same Combobox for both Cause + Beneficiary. Festive + solidaire étape 2: Calendar popover opens with French month labels (Monday-first week), prev/next chevrons, today highlighted with 2px primary border, past dates disabled (grey), selected day shown as navy pill with white text, click-outside + Escape close. Étape 2 also accepts thankYouMessage Textarea up to 500 chars with live counter. Publish a cagnotte → POST succeeds (Zod accepts the new nullable field)."
    why_human: "New Ring 1 primitives with popover a11y semantics + end-to-end wizard smoke test require live browser interaction and backend POST verification."
  - test: "Phase 7 — thank-you message round-trip to /merci + /modifier"
    expected: "On wizard step 2 set a non-empty thankYouMessage → publish → pay a donation → /c/{slug}/merci PAID branch shows: animate-ping green halo over solid Check, 'Un mot de l'organisateur' pink-accent eyebrow + italic message card, font-mono order.reference confirmation code card. Visit /tableau-de-bord/cagnottes/{slug}/modifier → thankYouMessage Textarea shows current value, 500-char counter works, trimming to empty and saving sends explicit null (backend writes null; next /merci visit shows fallback text instead of the pink card)."
    why_human: "Full donor + creator round-trip requires completing a Bictorys donation, polling /api/orders/:ref/status on the merci page, and creator edit-save cycle."
---

# Phase 7: Banani Delta + Polish Pass — Verification Report

**Phase Goal:** Close gaps discovered during manual QA against the Banani source — creator cagnotte detail page + link bug + logo swap + withdraw flow visual parity + Calendar/Combobox primitives + thank-you message feature + micro-interactions polish.

**Verified:** 2026-04-13T23:30:00Z
**Status:** `human_needed` — code-complete, 8/8 roadmap SCs automatedly verified, 6 visual/flow soft gates pending human dev-server walkthrough.
**Re-verification:** No (initial verification).
**Phase position:** Final phase of the milestone. After this, 7/7 phases code-complete.

## Goal Achievement

### Observable Truths (8 Roadmap Success Criteria)

| # | Truth (roadmap SC) | Status | Evidence |
|---|--------------------|--------|----------|
| 1 | Dashboard → `/tableau-de-bord/cagnottes/[slug]` creator detail page exists with KPIs / Retirer CTA / recent participations / sidebar (share + visibility + danger zone), gated via owner check | ✓ VERIFIED | 456-line server component at `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx`. Imports `notFound` + `cookies`, reads `izy-token`, fetches `/api/cagnottes/:slug`, compares `block.sellerId !== payload.sub` → `notFound()`. `npm run build` generates the route `ƒ /tableau-de-bord/cagnottes/[slug]`. Dashboard island updated to pass `linkVariant="creator"` (grep: 1 hit in `_ClientCampaignCard.tsx`). |
| 2 | Both navbars render lowercase two-tone `cagnotte.sn` logo, `MISC.siteName` updated | ✓ VERIFIED | `PublicNavbar.tsx:38-41` + `DashboardNavbar.tsx:65-68` both render `{MISC.brandMark}` + `<span className="ml-1 text-lg font-medium text-gray-400">{MISC.brandSuffix}</span>`. `src/lib/constants.ts` defines `MISC.brandMark = "cagnotte"`, `brandSuffix = ".sn"`, `siteName = "cagnotte.sn"`. |
| 3 | `/retraits` (dark-navy hero + numbered steps + Wave/Orange tiles + RÉCAPITULATIF), `/retraits/pin` (shield hero + rounded-[2.5rem] + animate-pulse caret + persistent-PIN contract, NO SMS OTP / countdown / resend), `/retraits/succes` (animate-ping ring) | ✓ VERIFIED | `_AmountStep.tsx:183-205` renders `<OperatorTile>` Wave + Orange; `:260` renders `WITHDRAW_LABELS.summaryLabel = "RÉCAPITULATIF DU RETRAIT"`. `_PinStep.tsx:106` `rounded-[2.5rem]`, `:110-111` ShieldCheck in bg-blue-50 w-20 h-20 rounded-full, `:145` animate-pulse caret, `:167` pointer-events-none animate-pulse bar. `succes/page.tsx:50` `absolute inset-0 animate-ping rounded-full bg-[#00B67A]/20`. Grep for `Renvoyer|otpResend|setTimeout` on /retraits/pin/ → empty. |
| 4 | `/profil/coordonnees-bancaires` rewritten: Mobile Money card + Bank Accounts empty-state + security footer, no Free Money | ✓ VERIFIED | `coordonnees-bancaires/page.tsx` rewritten from UserPaymentMethods.jsx. Grep `free_money\|Free Money` → only two negating doc comments (`D-22 Wave + Orange Money only (NO Free Money)`). `BankForm` inline preserved. Layout pattern confirmed via plan/summary match. |
| 5 | `<Calendar>` Ring 1 popover primitive replaces native date input in both wizard étape 2 pages | ✓ VERIFIED | `src/components/ui/Calendar.tsx` 341 lines, Ring 1 pure (zero `@/lib/api`, `@/lib/useApi`, `@/lib/constants`, `@/contexts` imports). Festive étape-2 imports `Calendar` on line 8, renders at line 141. Solidaire étape-2 imports on line 8, renders on line 143. Grep `type="date"` in `src/app/(authed)/tableau-de-bord/nouvelle/` → empty. `scripts/verify-ring-purity.sh` → Ring 1 pure. |
| 6 | `<Combobox>` Ring 1 primitive replaces native `<select>` in festive étape 1 occasion (also solidaire cause + beneficiary) | ✓ VERIFIED | `src/components/ui/Combobox.tsx` 202 lines, Ring 1 pure. Festive étape-1 imports `Combobox` on line 6, renders on line 140. Solidaire étape-1 renders 2× (Cause + Beneficiary on lines 158, 166). Grep `<select` on festive étape-1 → empty. |
| 7 | `Block.config.thankYouMessage` Zod additive (max 500, nullable), captured in wizard, rendered on `/merci` with `order.reference`, edit-able in `/modifier` | ✓ VERIFIED | `backend/src/lib/blocks/schemas.ts:99` — `thankYouMessage: z.string().max(500).nullable().optional()` (there's also a `.optional()` variant on line 58). `prisma/schema.prisma:146-155` confirms `Block.config Json` → no Prisma migration needed. `/c/[slug]/merci/page.tsx:176-182` renders `order.thankYouMessage` behind a `MERCI_LABELS.thankYouMessageEyebrow` heading. `_EditForm.tsx` uses `EDIT_LABELS.thankYouMessage*` constants (grep confirmed). Wizard capture already wired in 07-02 at étape-2 (plan 07-03 deviation #1 kept the existing location). |
| 8 | `VisibilityCard` lifted to Ring 1 primitive, wizard étape-3 consumes it, micro-interactions polish (CampaignCard hover, animate-ping, transition-colors, no framer-motion) | ✓ VERIFIED | `src/components/ui/VisibilityCard.tsx` 79 lines, Ring 1 pure. Festive + solidaire étape-3 both import from `@/components/ui`. `CampaignCard.tsx` has `linkVariant` prop + hover-lift (confirmed via commit cc84119 `micro-interactions polish sweep`). Grep `framer-motion\|date-fns\|dayjs\|@headlessui\|@radix-ui` in `package.json` + `src/` → empty. Zero new `@keyframes` in `src/` (pre-existing files only: `_ConfettiBurst.tsx` + `globals.css`). |

**Score:** 8 / 8 roadmap Success Criteria verified via static analysis + build.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx` | Server component creator detail, owner-gated | ✓ VERIFIED | 456 lines, server component, `notFound()` owner gate, generated as `ƒ /tableau-de-bord/cagnottes/[slug]` in build output |
| `src/components/ui/VisibilityCard.tsx` | Ring 1 primitive | ✓ VERIFIED | 79 lines, no forbidden imports |
| `src/components/ui/Calendar.tsx` | Ring 1 popover primitive ≥80 lines | ✓ VERIFIED | 341 lines, Ring 1 pure, hand-rolled month grid |
| `src/components/ui/Combobox.tsx` | Ring 1 dropdown primitive ≥60 lines | ✓ VERIFIED | 202 lines, Ring 1 pure |
| `src/components/layout/PublicNavbar.tsx` | Two-span lowercase logo | ✓ VERIFIED | Lines 38-41: brandMark + brandSuffix span with text-gray-400 |
| `src/components/layout/DashboardNavbar.tsx` | Two-span lowercase logo | ✓ VERIFIED | Lines 65-68: same pattern |
| `src/components/cagnottes/CampaignCard.tsx` | `linkVariant?: "public" \| "creator"` default public | ✓ VERIFIED | Lines 24/30/58 — prop defined, default `"public"`, href branched |
| `src/app/(authed)/retraits/_AmountStep.tsx` | Banani withdraw chrome + OperatorTile | ✓ VERIFIED | OperatorTile local component (lines 307-331), Wave #3374FF + Orange #FF6600 tiles, RÉCAPITULATIF label |
| `src/app/(authed)/retraits/pin/_PinStep.tsx` | rounded-[2.5rem] + ShieldCheck hero + animate-pulse, NO countdown | ✓ VERIFIED | Grep hits confirm; grep for Renvoyer/otpResend/setTimeout → empty |
| `src/app/(authed)/retraits/succes/page.tsx` | animate-ping ring | ✓ VERIFIED | Line 50 confirmed |
| `src/app/(authed)/profil/coordonnees-bancaires/page.tsx` | Full rewrite ≥100 lines, no Free Money | ✓ VERIFIED | Rewritten; grep confirms only D-22 negating comments |
| `backend/src/lib/blocks/schemas.ts` | thankYouMessage nullable optional | ✓ VERIFIED | Line 99: `.max(500).nullable().optional()` |
| `src/app/(public)/c/[slug]/merci/page.tsx` | Renders thankYouMessage + confirmation code | ✓ VERIFIED | Lines 176-182 render under `MERCI_LABELS.thankYouMessageEyebrow` |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| Dashboard `_ClientCampaignCard.tsx` | `CampaignCard` | `linkVariant="creator"` prop | ✓ WIRED |
| `tableau-de-bord/cagnottes/[slug]/page.tsx` | `/api/cagnottes/:slug` | Server fetch with `izy-token` cookie forward | ✓ WIRED |
| Festive étape-1 | `Combobox` primitive | import + render (line 6, 140) | ✓ WIRED |
| Solidaire étape-1 | `Combobox` primitive | 2× render (Cause + Beneficiary) | ✓ WIRED |
| Festive étape-2 | `Calendar` primitive | import + render (line 8, 141) | ✓ WIRED |
| Solidaire étape-2 | `Calendar` primitive | import + render (line 8, 143) | ✓ WIRED |
| Festive + solidaire étape-3 | `VisibilityCard` primitive | import + render | ✓ WIRED |
| `/c/[slug]/merci/page.tsx` | `block.config.thankYouMessage` + `order.reference` | render from status-polling response | ✓ WIRED |
| `/modifier/_EditForm.tsx` | `thankYouMessage` edit + null-on-clear | EDIT_LABELS.thankYouMessage* + textarea | ✓ WIRED |

### Requirements Coverage (PLSH-01 … PLSH-08)

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| PLSH-01 | 07-01 | Creator cagnotte detail page | ✓ SATISFIED | Truth 1 |
| PLSH-02 | 07-01 | CampaignCard linkVariant prop | ✓ SATISFIED | CampaignCard:24/30/58 + dashboard island |
| PLSH-03 | 07-01 | Navbar logo swap | ✓ SATISFIED | Truth 2 |
| PLSH-04 | 07-02 | Withdraw flow visual parity (persistent PIN) | ✓ SATISFIED | Truth 3 |
| PLSH-05 | 07-02 | `/profil/coordonnees-bancaires` rewrite | ✓ SATISFIED | Truth 4 |
| PLSH-06 | 07-03 | `<Calendar>` primitive + wizard étape-2 wire | ✓ SATISFIED | Truth 5 |
| PLSH-07 | 07-03 | `<Combobox>` primitive + festive étape-1 wire | ✓ SATISFIED | Truth 6 (plus bonus solidaire wire) |
| PLSH-08 | 07-03 | thankYouMessage end-to-end | ✓ SATISFIED | Truth 7 |

All 8 phase requirements closed. Zero orphaned requirements.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Frontend builds with 0 TS errors | `npm run build` | All routes generated (32 routes incl. `ƒ /tableau-de-bord/cagnottes/[slug]`), 0 errors | ✓ PASS |
| Backend builds with 0 TS errors | `cd backend && npm run build` | `tsc` clean, no output | ✓ PASS |
| Ring 1 + Ring 2 purity | `bash scripts/verify-ring-purity.sh` | `✅ Ring 1 pure (src/components/ui/)` + `✅ Ring 2 pure` | ✓ PASS |
| Zero new dependencies | `git diff edce126^..HEAD -- package.json package-lock.json \| wc -l` | 0 | ✓ PASS |
| Zero forbidden libs | grep `framer-motion\|date-fns\|dayjs\|@headlessui\|@radix-ui` in package.json | empty | ✓ PASS |
| No € / +33 / PayDunya / Offerts drift | grep in `src/` | 1 hit: negating comment in `commission.ts:72` ("NEVER returns Offerts") | ✓ PASS |
| No native `type="date"` in wizard | grep in `src/app/(authed)/tableau-de-bord/nouvelle` | empty | ✓ PASS |
| No `<select` in festive étape-1 | grep | empty | ✓ PASS |
| No SMS countdown/resend on PIN page | grep `Renvoyer\|otpResend\|setTimeout` in `retraits/pin/` | empty | ✓ PASS |

### Anti-Patterns Found

None. Static analysis found zero TODO/FIXME blockers, zero stubs in Phase 7 scope, zero hardcoded French strings in JSX (all sourced from constants), zero placeholder `return null` in new components. Known deferred stubs (documented in summaries) are out-of-scope for Phase 7 and re-confirmed as Phase 8 follow-ups:

- Calendar arrow-key day-grid nav (Tab/Enter + click work; 44px cells meet touch-target a11y)
- Bank Accounts add-flow modal (`/profil/coordonnees-bancaires` v1 only ships Mobile Money)
- `/modifier` still uses native `<Input type="date">` for endDate (wizard ask only)
- Shared `SuccessHero` primitive extraction (2 consumers: `/retraits/succes` + `/c/[slug]/merci`)
- In-place "Clôturer la cagnotte" action (currently routes to `/modifier#cloturer`)
- "Partager" header button on creator detail currently routes to public page

### Commits Verified (22)

```
edce126 chore(07-01): constants for cagnotte.sn brand + creator detail labels
3fe1db9 feat(07-01): two-tone lowercase cagnotte.sn logo on both navbars
04c443c feat(07-01): CampaignCard linkVariant prop + dashboard creator routing
ba3d5e7 feat(07-01): creator cagnotte detail page from DashboardCagnotteDetail
d72b35b docs(07-01): SUMMARY for P0 gap fixes
6020402 refactor(07-02): lift VisibilityCard to ui/ + polish constants block
3937874 feat(07-02): restyle /retraits to Banani WithdrawFundsForm
f2db589 feat(07-02): restyle /retraits/pin to Banani WithdrawOTP chrome (persistent PIN, no countdown)
ab724b5 feat(07-02): animate-ping green ring on /retraits/succes
1651530 feat(07-02): rewrite /profil/coordonnees-bancaires from UserPaymentMethods.jsx
d56658a chore(07-02): wizard etape-3 copy + apostrophe sweep
929e90f feat(07-02): restyle DatePicker wrapper to Banani button shell
2fef073 docs(07-02): SUMMARY for P1 polish batch
ec4240f feat(07-03): add thankYouMessage to fundraiserBlockConfigSchema (additive)
8d1b1a8 feat(07-03): Calendar popover primitive (Ring 1)
eaca4ef feat(07-03): Combobox primitive (Ring 1)
04b36a4 feat(07-03): wire Calendar into wizard etape-2 (festive+solidaire)
f525d86 feat(07-03): wire Combobox into wizard étape 1 occasion/cause
f3d0e0c feat(07-03): thankYouMessage end-to-end (capture+edit+render)
cc84119 feat(07-03): micro-interactions polish sweep
e7f7f10 fix(07-03): drop aria-invalid on Calendar/Combobox trigger buttons
540dc3d docs(07-03): SUMMARY for new primitives + thank-you feature + polish
```

### Human Verification Required

See YAML frontmatter `human_verification:` list above for the 6 soft-gate items. Summary:

1. Creator detail page navigation + owner gate (requires 2 seller accounts on dev server)
2. Navbar logo rendering on `/` + `/tableau-de-bord`
3. Full `/retraits` → `/retraits/pin` → `/retraits/succes` visual walkthrough
4. `/profil/coordonnees-bancaires` two-card layout + BankForm interaction
5. Wizard Combobox + Calendar primitive UX (festive + solidaire)
6. `thankYouMessage` end-to-end round-trip (wizard → paid donation → merci → modifier edit → null-on-clear)

### Gaps Summary

**Zero code gaps.** All 8 phase Success Criteria closed by static analysis + dual build (frontend + backend) + Ring purity + drift + dependency audits. The 22 commits on phase 7 (edce126 → 540dc3d) exactly match the three plans (5 + 8 + 9 counted in summaries; 1 `_ClientCampaignCard` commit folded into 04c443c in 07-01). Ring 1 primitives (`Calendar`, `Combobox`, `VisibilityCard`) are verified pure by `scripts/verify-ring-purity.sh`. Zero new npm deps, zero Prisma migrations, zero forbidden libraries, zero native `type="date"` or `<select>` regressions.

Status is `human_needed` (not `passed`) purely because:
- The phase is fundamentally a **visual parity sweep** against Banani source screens. Static analysis can confirm markers (`rounded-[2.5rem]`, `animate-ping`, `animate-pulse`, class names) but cannot confirm the resulting pixel layout, fonts, hover/transition feel, or touch-target feel on a real device.
- The new primitives (`Calendar` + `Combobox`) are popovers with click-outside / Escape / focus semantics that need live interaction to verify.
- `thankYouMessage` end-to-end requires a real Bictorys donation to reach the PAID branch on `/c/[slug]/merci`.

---

## Milestone-Level Completion Signal

**Cagnottes.sn v1 milestone: 7/7 phases code-complete.**

| Phase | Status | Verification |
|---|---|---|
| 1. Backend Foundations | Complete | 2026-04-13 |
| 2. Backend Surfaces + Exit Gate | Complete | 2026-04-13 |
| 3. Frontend Foundations | Complete | 2026-04-13 |
| 4. Public Donor Revenue Path | Complete (soft gates pending) | 2026-04-13 |
| 5. Auth + Creator Flow | Complete (soft gates pending) | 2026-04-13 |
| 6. Authed + Money Screens | Complete (soft gates pending) | 2026-04-13 |
| 7. Banani Delta + Polish Pass | **Complete (soft gates pending)** | **2026-04-13** |

**Remaining human soft gates before v1 merge:**
- Phase 4: `audits/audit-010` cells 1-6 (TikTok / Instagram / Facebook in-app browser real-device testing — see CLAUDE.md "Known Quirks")
- Phase 5: visual walkthrough (auth + creator flow screens)
- Phase 6: visual walkthrough + E2E withdrawal flow against real Bictorys payout sandbox
- Phase 7: visual walkthrough (this phase — 6 items listed above)

**Milestone totals (reconstructed from summaries):**
- 103 v1 requirements (95 original + 8 PLSH) — 100% coverage claimed across 17 plans
- Zero new npm dependencies introduced in phases 3–7 (pure next/react/tailwind + lucide-react)
- Zero Prisma migrations in phases 3–7 (schema frozen per CLAUDE.md "don't try to clean the schema as a side task")
- New Ring 1 primitives in Phase 7: `VisibilityCard`, `Calendar`, `Combobox` (3)
- Phase 7 commit count: 22 atomic conventional commits

The fork is ready for the soft-gate validation sweep and v1 merge. The deferred Prisma schema prune (CLAUDE.md warning) is correctly parked for a future Phase 8 cleanup pass.

---

_Verified: 2026-04-13T23:30:00Z_
_Verifier: Claude (gsd-verifier) — Opus 4.6 1M_
