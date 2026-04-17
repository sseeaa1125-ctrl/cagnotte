# UI Review -- cagnottes.sn Mobile Audit

**Date:** 2026-04-16
**Baseline:** Abstract 6-pillar standards + CLAUDE.md brand constraints
**Screenshots:** Dev server detected at localhost:3000 (CLI screenshots not captured -- code-only audit)
**Target device:** 375px budget Android (90% of users), 3G/4G

**Overall Score: 19/24**

---

## Scores

| Pillar | Score | Summary |
|--------|-------|---------|
| Copywriting | 3/4 | Strong French copy via constants, but some hardcoded English and duplicate error patterns |
| Visuals | 3/4 | Premium card layouts, good hierarchy, but solidaire grid breaks on mobile |
| Color | 3/4 | Brand-consistent navy/pink, but 69+ hardcoded hex across 31 files, some off-palette |
| Typography | 4/4 | Excellent Poppins/Inter pairing, clamp() on amounts, tabular-nums for FCFA, iOS zoom fix |
| Spacing | 3/4 | Mobile-first with px-3/px-4, touch targets mostly >=48px, a few tight spots |
| Experience Design | 3/4 | Complete state coverage (loading/error/empty/timeout), good polling, but some gaps |

---

## Top 3 Priority Fixes

1. **Solidaire grid 4-col on mobile** -- `_SolidaryCampaigns.tsx:62` uses `md:grid-cols-4` with no mobile breakpoint, rendering 1-col cards that are very narrow on desktop and skipping a 2-col mobile layout entirely. Users on 375px see single-column cards that are fine, but tablet (768px) hits 4-col and cards become cramped (168px each). Fix: change to `grid-cols-2 md:grid-cols-4` or `sm:grid-cols-2 lg:grid-cols-4`.

2. **Hardcoded colors bypass theming** -- 69 hardcoded hex values and 96 arbitrary Tailwind bracket values across 30+ files. Examples: `bg-[#F4D3DE]` (ParticiperForm:235, page.tsx:412), `text-[#00B67A]` (merci:170, paiement:778), `bg-[#E6F3EE]` (merci:167). These should be CSS custom properties in globals.css (e.g., `--color-success: #00B67A`, `--color-success-bg: #E6F3EE`, `--color-pink-dark: #F4D3DE`) so the palette is maintainable and dark mode is possible later.

3. **Missing bottom-bar CTA on participer mobile** -- `ParticiperForm.tsx` mentions a fixed bottom CTA bar in the comment (line 64-65: "a fixed bottom CTA bar surfaces Total + Proceder au paiement") but the code only has the submit button inside the sticky aside. On mobile, when the aside stacks below the form, the pay button scrolls out of view. Add a `fixed bottom-0` CTA bar on `lg:hidden` with safe-area padding.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Strengths:**
- All user-facing strings are in French and externalized to `src/lib/constants.ts` (NAV_LABELS, AUTH_LABELS, PAIEMENT_LABELS, MERCI_LABELS, etc.)
- CTAs are culturally appropriate: "Je participe" (not "Donner"), WhatsApp-first share order
- Error messages are specific and reassuring: rate limit, circuit breaker, timeout all have distinct French copy
- Merci page has 5 states (PENDING, PAID, FAILED, EXPIRED, TIMEOUT) each with contextual copy
- Empty states use EmptyState component with icon + title + CTA

**Issues:**

- F-01: `ParticiperForm.tsx:309` -- "Masquer mon identite au public" label could be clearer. "Rester anonyme" is more direct for Senegalese users.

- F-02: `paiement/page.tsx:587` -- TikTok help text references `IN_APP_LABELS.tiktokHelp` but the constant name is in English. Non-issue for users but breaks the French-only naming convention.

- F-03: `merci/page.tsx:155` -- "Tentative {N}/40" is technical jargon. Replace with "Verification en cours..." with a subtle progress indicator.

- F-04: `connexion/page.tsx:168` and `inscription/page.tsx:219` -- "Continuer avec Email" is in French but uses the English word "Email". Acceptable in Senegal (email is commonly used in French), but "Continuer par e-mail" would be more formal.

- F-05: `_SolidaryCampaigns.tsx:96` -- `{HOME_SOLIDAIRE_LABELS.collectedSuffix}` appended after price with a space -- check this doesn't produce "15 000 FCFA collectes" (missing accent on e).

- F-06: `paiement/page.tsx:725-731` -- CGU disclaimer uses "Bictorys" which is a backend payment processor name. Users don't know what Bictorys is. Replace with "Paiement 100 % securise via Mobile Money."

### Pillar 2: Visuals (3/4)

**Strengths:**
- Card-based layouts with consistent `rounded-2xl`/`rounded-3xl` + `shadow-sm` + `ring-1 ring-black/5`
- Cover images use `object-cover` with proper aspect ratios
- Media viewer has Skool-style circular thumbs with active ring state
- Premium shine-sweep animation on primary CTAs (CSS-only, respects prefers-reduced-motion)
- Confetti burst, check-mark halo, and slide-up animations for post-payment delight
- Mobile drawer with drag handle affordance and slide-in animation

**Issues:**

- V-01: `_SolidaryCampaigns.tsx:62` -- `md:grid-cols-4` with no intermediate breakpoint. At 768-1023px, 4 cards at ~168px each are very cramped. Cover images are `h-32` (128px) in a card only ~168px wide -- aspect ratio is nearly square, which distorts landscape covers.

- V-02: `CagnotteMediaViewer.tsx:155` -- Main viewer height `h-56` (224px) on mobile is quite short for 375px width (60% aspect ratio). Consider `h-52 sm:h-64` or `aspect-video` for more balanced proportions on the hero cover.

- V-03: `page.tsx:290` (cagnotte detail) -- `bg-gray-50` page background but cards are `bg-white`. The gray-50/white contrast is very subtle (1.02:1). On budget Android screens with lower color accuracy, the card elevation may not register visually. The shadow-sm helps, but `ring-1 ring-black/5` alone is insufficient distinction.

- V-04: `merci/page.tsx:142` -- PENDING state uses `animate-pulse` on the Clock icon but no skeleton or progress bar. The 2-minute wait with just a pulsing clock icon feels bare on mobile. Consider adding an indeterminate progress bar below the icon.

- V-05: No favicon or app icon defined in the audited files. On mobile home screen bookmarks, this results in a generic browser icon.

### Pillar 3: Color (3/4)

**Strengths:**
- Brand palette defined as CSS custom properties in globals.css: `--color-primary: #172866`, `--color-pink: #FBE6ED`, `--color-footer: #0E1A40`
- Audit 032 fixed muted-foreground from 4.28:1 to 5.52:1 (slate-600), now passes WCAG AA
- Consistent success green `#00B67A` with `#E6F3EE` bg across merci, paiement, retraits
- Error states use semantic red-50/red-500/red-600/red-700 scale
- Warning states use amber-50/amber-200/amber-600/amber-900 scale

**Issues:**

- C-01: 69 hardcoded hex values across 31 .tsx files. Prominent examples:
  - `bg-[#F4D3DE]` appears 8+ times (a darker pink not in the theme)
  - `text-[#00B67A]` / `bg-[#E6F3EE]` (success tokens) appear 6+ times but not tokenized
  - `bg-[#1877F2]` (Facebook blue) in Button.tsx -- acceptable for social brand
  - `bg-[#25D366]` (WhatsApp green) in Button.tsx -- acceptable for social brand
  - `bg-[#DFECFB]` in _FeaturesPink.tsx -- a blue tint not in the theme system

- C-02: `_FeaturesPink.tsx:45` -- Soutenir mode uses `bg-[#DFECFB]` (light blue) which is not in the theme. This is an entirely separate palette introduced without a CSS variable. Add `--color-soutenir-bg: #DFECFB` to globals.css.

- C-03: `page.tsx:412` (cagnotte detail) -- "Je participe" CTA uses `bg-[#F4D3DE]` (a darker pink variant) with `hover:bg-[#efc7d5]`. These two hex values appear in 4+ files but aren't tokenized. Add `--color-pink-cta: #F4D3DE` and `--color-pink-cta-hover: #efc7d5`.

- C-04: `paiement/page.tsx:144` -- `bg-black/60` backdrop uses 60% black. The `ConfirmDialog.tsx:144` also uses `bg-black/60`. Consistent, but could be a CSS variable for global adjustment.

- C-05: `globals.css:501` -- `background-color: #0d9488` (teal-600) for driver.js popover buttons. This is the old fari.store teal, not the cagnottes.sn navy. Dead code if driver.js isn't used, but if it is, it's off-brand.

### Pillar 4: Typography (4/4)

**Strengths:**
- Poppins (headings via `font-headings`) and Inter (body via `font-sans`) correctly configured in globals.css
- Heading hierarchy is clean: `text-4xl sm:text-5xl md:text-6xl lg:text-7xl` (Hero h1), `text-xl sm:text-2xl` (section h2s), `text-base sm:text-lg` (card h3s)
- FCFA amounts use `tabular-nums` class for consistent digit widths during polling updates (ProgressPoll.tsx:88)
- `clamp(1.5rem, 5vw, 2.25rem)` on the raised amount (ProgressPoll.tsx:88) -- elegant responsive sizing
- iOS Safari zoom prevention via `font-size: max(16px, 1em)` on inputs (globals.css:461)
- `font-black` (900 weight) used consistently for headings, `font-bold` (700) for labels, `font-semibold` (600) for buttons, `font-medium` (500) for body

**Minor notes:**
- T-01: `ParticiperForm.tsx:247` -- Custom amount input uses `text-3xl font-black` (30px). On 375px with a 6-digit number, this is fine. But `field-sizing-content` may cause layout shifts as digits are added. Test with 10,000,000 (max amount).
- T-02: `paiement/page.tsx:383-385` -- Loading placeholder uses `text-sm text-muted-foreground` which is readable but could benefit from a skeleton loader for visual polish.

### Pillar 5: Spacing (3/4)

**Strengths:**
- Mobile-first containers: `px-3 sm:px-4 md:px-6 lg:px-8` (consistent across cagnotte detail, participer, paiement)
- Touch targets generally meet 48px minimum: Button `min-h-12` (48px), nav links `min-h-14` (56px), hamburger `h-12 w-12`, close button `h-12 w-12`
- Safe-area handling: `pb-[calc(env(safe-area-inset-bottom)+1.25rem)]` on ConfirmDialog, `pb-[calc(env(safe-area-inset-bottom)+12px)]` on Modal, `pb-[calc(env(safe-area-inset-bottom)+1rem)]` on mobile drawer
- Gap between interactive elements: `gap-2` (8px) on button grids, `gap-4` (16px) on form fields

**Issues:**

- S-01: `_SolidaryCampaigns.tsx:49` -- Section uses `mx-4 my-8` on mobile but `md:mx-12` on tablet. The jump from 16px to 48px margin is abrupt. Add `sm:mx-6` or `sm:mx-8` intermediate.

- S-02: `ParticiperForm.tsx` comment lines 64-65 promise a "fixed bottom CTA bar" on mobile, but no such bar exists in the code. The submit button is inside the sticky aside which stacks below the form on mobile. After filling Step 3 (message), the user must scroll past the entire recap to find the button. This is a spacing/flow issue: either add the promised fixed bar, or make the aside `sticky bottom-0` on mobile.

- S-03: `page.tsx:295` (cagnotte detail) -- Container padding `px-3 py-5` on mobile gives only 12px horizontal padding. At 375px, content width = 351px. Cards inside have `p-5` (20px) padding. Content width inside cards = 311px. This is acceptable but tight for the two-column participant grid (`md:grid-cols-2`).

- S-04: `paiement/page.tsx:536` -- Operator picker buttons use `py-2.5` (10px vertical padding) on mobile. Combined with the text and logo, the touch target is approximately 40px. Below the 48px CLAUDE.md minimum. Fix: change to `min-h-12` (48px) or `py-3.5`.

- S-05: `ShareSheet.tsx:119` -- 2-col button grid uses `gap-2` (8px). Each button is `min-h-12` (48px). Spacing between interactive elements meets the 8px minimum, but barely. The WhatsApp and Facebook buttons at 375px in a 2-col grid are ~166px wide each, which is comfortable.

### Pillar 6: Experience Design (3/4)

**Strengths:**
- Complete post-payment state machine: PENDING (polling with counter) -> PAID (confetti + check halo) / FAILED / EXPIRED / TIMEOUT -- each with distinct UI and recovery CTA
- Live polling on cagnotte detail (ProgressPoll: 20s interval, visibility-aware pause)
- Payment page polling (3s x 40 = 2min, with visibility-aware pause, timeout fallback to merci page)
- In-app browser detection (TikTok, Meta) with tailored UX: QR code for desktop, open/share/copy for WebView
- Circuit breaker surfaced to user as "Nos serveurs sont temporairement charges" (503)
- Rate limit surfaced as specific message (429)
- Session stash pattern (participer -> paiement) with fallback redirect if missing
- Voluntary contribution (3%) with clear opt-in/opt-out checkbox
- prefers-reduced-motion respected across all animations
- Body scroll lock on modals/drawers/dialogs

**Issues:**

- E-01: `ParticiperForm.tsx` -- No inline validation feedback as the user types. The `validate()` function only runs on submit. For a donation flow, instant feedback on the amount (minimum 500 FCFA, maximum 10M) would reduce friction. Add `onBlur` validation or live character count.

- E-02: `paiement/page.tsx:264-273` -- Phone validation is submit-triggered only. The error scrolls the phone card into view (`scrollIntoView`), which is good, but there's no `inputMode="tel"` pattern validation. Users could enter letters. The `type="tel"` is set, which helps on mobile keyboards, but add a `pattern="[0-9 ]*"` for additional browser-level validation.

- E-03: `merci/page.tsx:117-138` -- No-reference state shows a generic error. If the user navigates directly to /c/{slug}/merci (e.g., bookmark), they see "Paiement echoue" which is misleading. The intent is "no reference found." The MERCI_LABELS.missingReferenceDescription should clarify this is not a payment failure.

- E-04: `connexion/page.tsx` and `inscription/page.tsx` -- Google-first pattern hides the email form behind a click. This is good for conversion, but the "Continuer avec Email" button doesn't indicate that email/password fields will appear. Add a subtle expand animation or change label to "Utiliser mon adresse email" for clarity.

- E-05: `_PublicCampaignsList.tsx:92-95` -- Empty state when no cagnottes exist shows `HOME_FEATURED_LABELS.empty` in a plain card. For a fundraiser platform, this is a critical empty state. It should include a CTA ("Sois le premier a creer une cagnotte") and possibly illustration.

- E-06: No offline/network-error handling visible in the donor flow. If the user loses connection between participer and paiement, the session stash is preserved (good), but there's no toast or banner indicating offline status.

---

## Registry Safety

No `components.json` detected -- shadcn not initialized. Registry audit skipped.

---

## Files Audited

**Core UI components:**
- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/ConfirmDialog.tsx`
- `src/components/ui/Avatar.tsx`
- `src/components/ui/AnimatedProgressBar.tsx`

**Public donor flow:**
- `src/app/(public)/c/[slug]/page.tsx`
- `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx`
- `src/app/(public)/c/[slug]/paiement/page.tsx`
- `src/app/(public)/c/[slug]/merci/page.tsx`
- `src/components/cagnottes/CagnotteMediaViewer.tsx`
- `src/app/(public)/c/[slug]/ProgressPoll.tsx`

**Homepage:**
- `src/app/(public)/_home/_Hero.tsx`
- `src/app/(public)/_home/_PublicCampaignsList.tsx`
- `src/app/(public)/_home/_SolidaryCampaigns.tsx`
- `src/app/(public)/_home/_FeaturesPink.tsx`
- `src/app/(public)/_home/_FAQ.tsx`

**Listing:**
- `src/app/(public)/cagnottes/page.tsx`

**Navigation:**
- `src/components/layout/PublicNavbar.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/layout/PreFooter.tsx`

**Auth:**
- `src/app/(auth)/connexion/page.tsx`
- `src/app/(auth)/inscription/page.tsx`

**Creator dashboard:**
- `src/app/(authed)/DashboardShell.tsx`
- `src/app/(authed)/tableau-de-bord/page.tsx`
- `src/app/(authed)/retraits/page.tsx`
- `src/app/(authed)/notifications/page.tsx`

**Shared:**
- `src/components/share/ShareSheet.tsx`
- `src/app/globals.css`
- `src/lib/constants.ts`
