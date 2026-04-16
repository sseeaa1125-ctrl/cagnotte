# Phase 7 Delta — Banani Gap Analysis

**Source:** MCP fetch 2026-04-13 (230 842 chars, `mcp-banani-banani_get_selected_designs-1776114048713.txt`)
**Baseline:** phase-5 (13 files) + phase-6 (7 files) wireframe extracts
**Change count:** 31 designs / 38 sharedFiles

Flow name: **Cagnotte SN** — `https://app.banani.co/flow/RZ5SfmH_Utgp`

---

## New screens (not in phase-5 / phase-6 baseline)

### 1. creator-cagnotte-detail  (***THE big one***)
- **Component:** `DashboardCagnotteDetail` (11 288 chars — the largest new sharedFile)
- **Banani title:** `"Détail Cagnotte - Tableau de Bord"` (screen id `main_next1_next2_next1`)
- **Target route:** `/tableau-de-bord/cagnottes/[slug]` — **currently missing** (only `/stats/` and `/modifier/` children exist, no parent `page.tsx`)
- **Composition (Phase 3 primitives):** `DashboardNavbar`, `Badge` ("En ligne" status pill), `Button` (Gérer / Partager), `KpiCard` (Montant récolté + Participations), `ProgressBar`, `Avatar` (donor initials), `Toggle` (visibility switches), new primitive needed for the bordered **Withdraw Action Box**.
- **Key copy:**
  - H1: **"Les 30 ans de Thomas"** (slug-driven)
  - Subtitle: **"Cagnotte Festive • Créée le 12 Oct 2023"**
  - KPI labels: **"Montant récolté"**, **"Participations"**, helper **"Dernière le 14 Oct (il y a 2h)"**
  - Withdraw box label: **"Fonds disponibles"** / **"Transférez ce montant vers votre compte bancaire ou Mobile Money. Cette action ne clôture pas votre cagnotte."**
  - CTA: **"Retirer les fonds"** (icon `arrow-down-circle`)
  - Section: **"Participations récentes"** / **"Voir toutes (15)"**
  - Sidebar cards: **"Lien de la cagnotte"** (copy + WhatsApp + Code QR), **"Visibilité"** (Cagnotte Publique toggle + Montant caché toggle), **"Zone de danger"** → **"Clôturer la cagnotte"**
- **Mockup details:** 2-column layout (`lg:col-span-2` + sidebar). Header is a horizontal row: 80×80 cover thumbnail, status `Badge` (`bg-green-100 text-green-700 "En ligne"`), H1 + subtitle, right-aligned Gérer/Partager buttons. Main column: 2-col KPI grid → full-width Withdraw Action Box (`border-2 border-[#172866]` with `#FBE6ED` decorative `rounded-bl-full` top-right blob) → recent participations list (each row is 12×12 pink initial avatar + name + amount + italic quoted message in a nested card). Sidebar: 3 stacked cards. Icons used: `arrow-left`, `settings`, `share-2`, `wallet`, `users`, `arrow-down-circle`, `link`, `copy`, `message-circle`, `qr-code`, `eye`, `alert-triangle`.

### 2. withdraw-security-otp
- **Component:** `WithdrawOTP` (2 618 chars)
- **Banani title:** `"Vérification Retrait - Tableau de Bord"` (`main_next1_next2_next1_next1_next2`)
- **Target route:** `/tableau-de-bord/cagnottes/[slug]/retirer/code` **OR** `/retraits/code` — depends on whether the withdraw flow stays global or moves under the creator detail page (see "Recommended Phase 7 scope").
- **Composition:** Card layout (`rounded-[2.5rem]` hero card with `shield-check` icon in `bg-blue-50`), OTP input grid, resend link with countdown, 2-button CTA row. Uses `Button` primitive.
- **Key copy (verbatim):**
  - H1: **"Vérification de sécurité"**
  - Body: **"Pour valider votre retrait de 450,00 €, veuillez saisir le code à 4 chiffres envoyé au +221 77 *** ** 67."**
  - Resend: **"Je n'ai pas reçu le code (Renvoyer dans 0:45)"**
  - CTAs: **"Valider le retrait"** / **"Annuler"**
- **Mockup details:** 4-cell OTP grid (`w-14 h-16` each, `rounded-2xl`, `border-2`, `focus-within:ring-4 focus-within:ring-blue-50`). The 2nd cell shows a caret (`w-0.5 h-8 bg-[#172866] animate-pulse`) — this is the only `animate-pulse` usage in the new export. **The code is 4-digit, same shape as the existing withdrawal PIN** — see "Security code + countdown" section below.

### 3. creator-cagnotte-detail → WithdrawFundsForm (updated chrome)
- **Component:** `WithdrawFundsForm` (8 041 chars) — already tracked in phase-6 `withdrawal.md` but **restructured**
- **Banani title:** `"Retirer les fonds - Tableau de Bord"` (`main_next1_next2_next1_next1`) + next-variant (`..._next1`)
- **Target route:** `/retraits/page.tsx` (shipped) — needs restructure
- **What changed vs baseline:** Now has a dark-navy hero header (`bg-[#172866] text-white` with H1 "Retirer mes fonds"). Numbered steps as **"1 Montant à retirer"** → **"2 Où envoyer l'argent ?"** with pink-circle step markers (`bg-[#F4D3DE]`). The destination step now shows Wave/Orange Money cards with the operator's initial in a colored square (`bg-[#3374FF]` for Wave, `bg-[#FF6600]` for Orange), plus an **"Ajouter un compte bancaire ou Mobile Money"** dashed-border button. Summary section uses uppercase tracking-wider label **"Récapitulatif du retrait"** + final confirm CTA **"Confirmer le retrait"** and a **"Transaction sécurisée"** + `lock` icon footer. Currency shown as **€** in mockup (ignore — spec says FCFA).

### 4. festive-step-1-occasion-open (state)
- **Component:** `CreateFestiveCagnotteStep1OccasionOpen` (6 830 chars)
- **Banani title:** `"Créer cagnotte Festive - Occasion (Dropdown)"` (`..._next1_next2`)
- **Target route:** `/tableau-de-bord/nouvelle/festive/etape-1` — **not a new route**, it's the open-state of the occasion select. Use as reference for the dropdown rendering.
- **Composition:** Custom absolutely-positioned dropdown menu (`absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden py-2`) with options as `<button>` rows: `px-5 py-3.5 hover:bg-gray-50 text-[#172866] font-bold flex items-center justify-between`. Each row shows emoji + label + hidden-till-hover check icon (`opacity-0 group-hover:opacity-100`).
- **Key copy (occasion list):** 🎂 **Anniversaire**, (then separator `h-px bg-gray-100 my-1 mx-4`), **Autre occasion**. The full list in the mockup shows 🎂 Anniversaire as the highlighted first item.
- **Action:** Use as the **visual contract** for the shipped `Select` primitive OR introduce a new `Combobox` primitive. The current shipped `Select` wraps a native `<select>` — it cannot render custom option chrome (emoji, check icons, hover rows). **A new custom `Combobox` / `SelectMenu` primitive is needed** (Ring 1).

### 5. user-payment-methods (new profile sub-page)
- **Component:** `UserPaymentMethods` (9 083 chars) — larger than `UserProfile` itself
- **Target route:** `/profil/coordonnees-bancaires` (shipped route exists, needs rewrite to match new shape)
- **Composition:** Same sidebar shell as `UserProfile` with the `Coordonnées bancaires` tab highlighted. Right column has **two stacked cards**:
  1. **"Comptes Mobile Money"** — "Pour recevoir les fonds de vos cagnottes instantanément." — each row: `w-12 h-12` colored square (W/O initial), name + masked phone, `Actif` green badge, trash-2 icon. "Ajouter" button top-right.
  2. **"Comptes Bancaires"** — "Pour les virements bancaires classiques (délai de 48h à 72h)." — empty state with dashed-border card and a `landmark` icon, CTA **"Ajouter un compte bancaire"**.
  Footer informational notice: **"Sécurité de vos coordonnées"** — **"Vos coordonnées bancaires et numéros Mobile Money sont cryptés et stockés de manière sécurisée. Ils ne sont utilisés que pour procéder au virement des fonds récoltés sur vos cagnottes."**
- **Action:** Rewrite `/profil/coordonnees-bancaires/page.tsx`. No new primitives — reuses `Button`, `Badge`, `EmptyState`, shared `ProfileSidebar`.

### 6. Paiement intermediate variant
- **Component:** `Cagnotte - Les 30 ans de Thomas (Next)` screen (`main_next2_next1_next1`) — 660 chars, **very small**, likely a minor state variant of the existing `PublicCagnotteDetail`. **Not a new route**; ignore unless follow-up confirms a design change.

---

## Modified screens (present in baseline but changed)

### dashboard (creator list)
- **What changed:** `DashboardList` in the new export keeps the same card shape but each card is now the gateway to the new creator-detail page. Link target must flip.
- **Impact on shipped code:** `src/components/cagnottes/CampaignCard.tsx:48` — `href={\`/c/${slug}\`}` is wrong when called from `ClientCampaignCard` on the dashboard. The public CagnotteCard for `/cagnottes` should still link to `/c/[slug]`, but the dashboard card must link to `/tableau-de-bord/cagnottes/[slug]`.
- **Action required:** Add a `linkVariant: "public" | "creator"` prop (or a `hrefOverride`) to `CampaignCard`, then pass it from `ClientCampaignCard` via the dashboard island.

### festive-step-3, solidaire-step-3 (wizard visibility)
- **What changed:** The visibility section (`phase-5/festive-step-3.md`, `phase-5/solidaire-step-3.md`) is now a **radio-card group** with `Icon i="globe"` + `Icon i="lock"`, visual checker dots (outer ring `w-5 h-5 border-2` + inner `w-2.5 h-2.5` fill when selected), and richer helper copy. This is **very close** to the existing `VisibilityCard` custom component already defined inline in `src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-3/page.tsx` (lines 30–50).
- **Impact on shipped code:** `festive/etape-3/page.tsx` and `solidaire/etape-3/page.tsx` define their own `VisibilityCard`. Banani's version matches closely enough — this is a **polish diff**, not a rewrite.
- **Action required:** Replace inline `VisibilityCard` with a shared primitive (or keep inline but lift to `src/components/ui/VisibilityCard.tsx`). Update copy to match Banani verbatim:
  - Public title: **"Publique"** + **"Votre cagnotte sera visible par tous et apparaîtra dans les résultats de recherche de Cagnotte.sn. Idéal pour maximiser les dons."**
  - Private title: **"Privée"** + **"Seules les personnes ayant le lien direct pourront voir et participer à votre cagnotte. Parfait pour les événements privés."** *(inferred from pattern — verify against Banani private card copy)*

### festive-step-2, solidaire-step-2 (date picker)
- **What changed:** The "Date de fin" field is rendered as a **fake dropdown**: `border border-gray-300 rounded-xl px-4 py-3.5 bg-white text-gray-400 flex justify-between items-center cursor-pointer hover:border-[#172866]` with placeholder **"Sélectionnez une date..."** and trailing `calendar` icon. **There is NO new Calendar/Calendar-plus custom component in `sharedFiles`** — the user's complaint about "Calendar" and "calendar-plus" components is NOT backed by the export. The date field is still a native-style input with a chevron-less icon.
- **Impact on shipped code:** `src/components/ui/DatePicker.tsx` uses `<input type="date">` which is fine functionally but **visually** mismatches Banani (Banani shows a placeholder-text button, not a native date input).
- **Action required:** Restyle `DatePicker.tsx` wrapper to match Banani's button-style outer shell (keep the native `<input type="date">` positioned absolutely underneath for functionality, or use a popover calendar component). **No Calendar-plus variant exists** — treat the user complaint as a misremembering; if they do want a popover calendar, that's a NEW primitive build, not a baseline-matching task.
- **Subtitle "Merci à mes Tipeurs et souscripteurs":** NOT present anywhere in the export. Searched all 38 sharedFiles — no such string. The user may be confusing this with the participation thank-you title **"Merci ! 🎉"** in `ParticipationSuccess.jsx`.

### withdraw-success (phase-6)
- **What changed:** `WithdrawSuccess` in new export has an `animate-ping` ring behind the check-icon (`absolute inset-0 rounded-full bg-[#00B67A]/20 animate-ping`), matches the shape of `ParticipationSuccess`. Existing phase-6 wireframe is **structurally identical**; only polish.
- **Impact:** `src/app/(authed)/retraits/succes/page.tsx` — add the `animate-ping` ring for visual parity.

### participation-success (phase-4)
- **What changed:** Same `animate-ping` green ring decoration. Already shipped? Worth verifying against `src/app/c/[slug]/paiement/succes/` or equivalent.

---

## New shared components

### `DashboardCagnotteDetail` (new)
- **Purpose:** Creator-side detail page for a single cagnotte (see screen #1 above).
- **Banani usage:** Consumed by design `main_next1_next2_next1`.
- **Maps to Phase 3 primitive?:** No — this is a page-level composition, not a primitive. Build as `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx`.

### `WithdrawOTP` (new)
- **Purpose:** 4-digit code entry screen with shield hero, phone-masked helper, countdown resend.
- **Banani usage:** Consumed by design `main_next1_next2_next1_next1_next2`.
- **Maps to Phase 3 primitive?:** Partially. Needs a new `OtpInput` primitive (4 cells, focus-on-type, tab between). The countdown is a small `useCountdown` hook.

### `UserPaymentMethods` (new)
- **Purpose:** Separate profile section for mobile money + bank accounts.
- **Maps to Phase 3 primitive?:** No — page-level composition using existing `Button`, `Badge`, `EmptyState`.

### `CreateFestiveCagnotteStep1OccasionOpen` (state reference)
- **Purpose:** Shows the open dropdown for occasion select.
- **Maps to Phase 3 primitive?:** No existing match. The current `Select` primitive is a styled `<select>` — cannot render custom option rows. **Need a new `Combobox` (or `SelectMenu`) primitive** for rich option lists (Ring 1). Can be a headless disclosure + list pattern.

### `DashboardList`, `DashboardOverview`, `Navbar`, `DashboardNavbar`
- Already shipped. New versions are structurally identical — see "Logo audit" below.

### `UserProfile`, `UserNotificationPreferences`
- Already shipped in phase-6. No structural changes. The profile sidebar menu has 5 tabs + divider + "Se déconnecter" in red — matches shipped `ProfileSidebar.tsx`.

### No new components found for:
- Calendar / Calendar-plus custom widgets (user complaint #5) — **not in export**
- Security code dedicated component beyond the 4-cell OTP (user complaint #6) — **the OTP is the "security code"**
- Merci à tous creator-side variant (user complaint #8) — **not in export**

---

## Logo audit

- **Current in `src/components/layout/PublicNavbar.tsx` (line 33–38) and `DashboardNavbar.tsx` (line 60–65):** Text-only link, `font-headings text-xl font-bold text-primary`, rendering `{MISC.siteName}` → `"Cagnottes.sn"` from `src/lib/constants.ts:182`.

- **Banani navbar component (`/components/Navbar.jsx` and `/components/DashboardNavbar.jsx`):** Text-only, no SVG, no `<img>`. Exact markup:

  ```jsx
  <a className="text-2xl font-black tracking-tighter text-[#172866] flex items-center">
    cagnotte<span className="text-gray-400 font-medium ml-1 text-lg">.sn</span>
  </a>
  ```

- **Gap:**
  1. **Casing** — Banani uses **lowercase `cagnotte.sn`**, shipped uses **`Cagnottes.sn`** (capital C, trailing `s`).
  2. **Two-tone split** — Banani renders `cagnotte` in navy + `.sn` in **gray** (`text-gray-400`) at a slightly smaller size (`text-lg` vs `text-2xl`).
  3. **Weight** — Banani uses `font-black tracking-tighter` (not `font-bold`).
  4. **Font** — Banani uses the default body font (Inter) via the root style.css, not Poppins. Shipped uses `font-headings` (Poppins).

- **Action:**
  - Update `MISC.siteName` brand display from `"Cagnottes.sn"` to **"cagnotte.sn"** (drop `s`, lowercase).
  - Replace both navbar logo elements with a small inline 2-span render matching Banani markup. No SVG asset needed.

---

## Visibility settings delta

- **Current wizard step-3 field shapes:** Inline `VisibilityCard` component in both festive and solidaire step-3 pages. Radio cards with `border-2`, selected state `border-primary bg-[#f8f9fc]`, left icon + title + description layout, `aria-pressed` button semantics.

- **Banani new field shapes:** Identical structure. Selected state uses `border-2 border-[#172866] bg-[#f8f9fc]` with an inline radio-dot indicator (`w-5 h-5 rounded-full border-2` with inner `w-2.5 h-2.5 bg-[#172866] rounded-full`). Unselected state uses `border-2 border-gray-200 bg-white` with empty dot (`border-2 border-gray-300`).

- **New components needed:** None. Lift the inline `VisibilityCard` → `src/components/ui/VisibilityCard.tsx` as a shared primitive (or extend the existing `RadioCard` primitive at `src/components/ui/RadioCard.tsx` — note that `RadioCard` has a different icon layout: `h-10 w-10 rounded-full` circle vs Banani's inline `h-5 w-5` dot. These are two visually distinct radio shapes — keep both.)

- **Creator detail sidebar visibility (different pattern):** In `DashboardCagnotteDetail`, the visibility is edited via `Toggle` switches (not radio cards) — "Cagnotte Publique" and "Montant caché". Two separate toggle rows. These map directly to the existing `Toggle` primitive at `src/components/ui/Toggle.tsx`.

---

## Calendar components delta

- **Current:** `src/components/ui/DatePicker.tsx` — native `<input type="date">` wrapped with clearable button, label, error, helper. Styled box with `min-h-12 rounded-lg border bg-background px-4 py-3`.

- **Banani Calendar component:** **DOES NOT EXIST** in `sharedFiles`. The user's "Calendar / Calendar-plus" components are not part of this export. Searched all 38 files — no `Calendar.jsx`, no `Datepicker.jsx`, no `Scheduler.jsx`. The only date UI is a fake-input shell rendered inline in `CreateFestiveCagnotteStep2` / `CreateSolidaireCagnotteStep2`.

- **Banani date-field markup (inline, not a component):**
  ```jsx
  <div className="border border-gray-300 rounded-xl px-4 py-3.5 bg-white text-gray-400
                  flex justify-between items-center cursor-pointer
                  hover:border-[#172866] transition-colors shadow-sm">
    <span>Sélectionnez une date...</span>
    <Icon i="calendar" size={20} className="text-gray-400" />
  </div>
  ```
  Helper below: **"Laissez vide si votre collecte est à durée indéterminée."** (festive) or **"Vous pouvez toujours modifier ou clôturer la cagnotte plus tôt."** (solidaire).

- **Subtitle support pattern ("Merci à mes Tipeurs et souscripteurs"):** **NOT FOUND** anywhere in the 230k export. The user may be confusing this with a different Banani flow. If they do want a "subtitle" per-cagnotte, it's new scope.

- **Action:**
  1. Restyle the wrapper in `DatePicker.tsx` to match the Banani button-style shell (use `rounded-xl` + `py-3.5` + hover `border-[#172866]`).
  2. Keep the native `<input type="date">` as the underlying control (Android 375px target — native date pickers on Android are fine).
  3. **Do NOT** build a Calendar / Calendar-plus popover primitive in Phase 7. Defer until the user provides a Banani source for it. If popover is needed later, add as a new Ring 1 `Calendar.tsx` primitive.

---

## Security code + countdown

- **Flow (as implied by `WithdrawOTP` screen):**
  1. User initiates withdraw from `DashboardCagnotteDetail` → "Retirer les fonds" button.
  2. `WithdrawFundsForm` (amount + destination + summary + confirm).
  3. `WithdrawOTP` — **4-digit code** sent via SMS to masked phone (`+221 77 *** ** 67`). Countdown **"Renvoyer dans 0:45"** before the resend link becomes active. "Valider le retrait" / "Annuler" CTAs.
  4. `WithdrawSuccess` — animated check + transaction summary.

- **Backend support:** The existing `/api/sellers/withdrawal-pin/*` endpoints (`status`, `set`, `forgot`, `reset`) manage a **4-digit PIN** stored as `withdrawalPinHash` on `Seller`. This is **not** the same as a one-time SMS-delivered security code — the shipped PIN is a **persistent secret** the user sets once and reuses. Banani's `WithdrawOTP` is a **per-transaction OTP** (time-limited, resend-able).

- **Key question for the user:** Is the Banani flow an **OTP SMS** (new, requires Bictorys or Twilio SMS endpoint + `WithdrawalOtp` table) OR is it the **existing persistent PIN** rendered with a countdown on a cooldown/lockout after N wrong tries?

- **Conservative interpretation:** The countdown is a **resend cooldown** on a new per-transaction SMS OTP. This is a **new backend surface** — would need:
  - `POST /api/withdrawals/:id/request-otp` — generates a 4-digit code, stores hashed + `expiresAt`, sends via SMS provider.
  - `POST /api/withdrawals/:id/verify-otp` — validates + creates the actual Bictorys payout.
  - Add `WithdrawalOtp` table (`@unique hashedCode`, `expiresAt`, `attempts`, `withdrawalId`).
  - Reuse RedisRateLimitStore for per-seller resend cooldown.

- **Alternative (minimal):** Reuse the existing persistent PIN (`src/app/(authed)/retraits/pin/page.tsx` is already shipped). Swap the 4-digit entry chrome to match `WithdrawOTP.jsx` styling (shield hero, `rounded-[2.5rem]` card, `focus-within:ring-blue-50`) and **drop the resend countdown entirely** (no SMS involved). This is the cheapest delta.

- **Where the code is "created/managed in profile settings":** The sidebar of `UserProfile.jsx` has a **"Sécurité & Mot de passe"** tab (icon `lock`). Shipped route `/profil/securite` exists. Banani does not expose a dedicated "security code" setup flow in this export — the `UserProfile` content area only shows "Informations personnelles". **No profile-side code-setup screen is present in the export.** The user's assumption is not backed by the export. The shipped `/profil/securite` page likely handles password change + PIN set (via `withdrawal-pin/set`).

- **Action (recommended):**
  - Go with **minimal**: reuse persistent PIN, restyle entry screen to match `WithdrawOTP`, drop countdown & resend. Flag the OTP question for a user decision before committing.
  - If OTP is confirmed, file a separate backend delta plan.

---

## Micro-interactions inventory

### `style.css` keyframes
**Banani `style.css` has ZERO `@keyframes` blocks.** Full content is a `@theme` block (color tokens + fonts + radii) + body/heading resets + one `.text-gradient` utility. No custom animations, no `@media (prefers-reduced-motion)`, nothing else. **Every animation in the Banani export is a Tailwind utility class**, not a custom keyframe.

### Tailwind utility animations used in components
Grepped all 38 sharedFiles for animation/transition classes:

- **`animate-ping`** — 3 usages:
  - `ParticipationSuccess.jsx`: green check ring (`bg-[#00B67A]/20 animate-ping`)
  - `WithdrawSuccess.jsx`: same pattern for withdraw confirmation
  - (both: `absolute inset-0 rounded-full`)
- **`animate-pulse`** — 1 usage:
  - `WithdrawOTP.jsx`: caret indicator in empty OTP cell (`w-0.5 h-8 bg-[#172866] animate-pulse ml-1`)
- **`transition-colors`** — pervasive, used on every hoverable button/card (dashboard cards, nav items, dropdown options, visibility toggles)
- **`transition-all`** — 1 notable usage on the OTP input cells (`focus-within:border-[#172866] focus-within:ring-4 focus-within:ring-blue-50 transition-all`) and on the Step-1 occasion dropdown trigger (`border-2 border-[#172866] ring-4 ring-blue-50 ... transition-all`)
- **`hover:border-[#172866]`** — standard hover pattern on form fields and cards
- **`hover:bg-[#0f1a45]`** — primary button hover darkens to `#0f1a45` (shipped uses `primary-hover` = `#121F4E` — **close but not identical**)
- **`group-hover:opacity-100`** — used on dropdown option check icons (see `CreateFestiveCagnotteStep1OccasionOpen`)
- **`focus-within:ring-4 focus-within:ring-blue-50`** — used on OTP cells and dropdown trigger — this is the "selected input" ring pattern
- **No `backdrop-blur`, no `scale-*`, no `translate-*` for press/lift animations, no `animate-bounce`, no `animate-spin` anywhere.**

### Recommended polish passes for shipped code
1. **`CampaignCard`** — add `hover:border-primary transition-colors` + `hover:shadow-md` (Banani dashboard cards all have `hover:border-[#172866] transition-colors`).
2. **`Button` primary variant** — verify the `hover:bg-primary-hover` transition is `transition-colors` (not `transition-all`) to match Banani's flat hover.
3. **`Toast`** — already uses slide-in; no change needed.
4. **`Modal`** — Banani has no modals in this export, so the current shipped backdrop-fade is fine.
5. **`ParticipationSuccess`** + **withdraw success** — add `animate-ping` green ring behind the check icon for v1 polish parity.
6. **`WithdrawOTP` (new)** — use `animate-pulse` caret on the focused cell and `focus-within:ring-4 focus-within:ring-blue-50 transition-all` on cells.
7. **Wizard dropdown trigger (occasion select)** — add `border-2 border-[#172866] ring-4 ring-blue-50 transition-all` for the open state.
8. **No keyframe polish is needed** — everything is Tailwind utilities. **Framer Motion is NOT required** and Banani doesn't use it. CLAUDE.md rule upheld.

---

## Shipped-code audit

| Route | File | Required change |
|---|---|---|
| `/tableau-de-bord` | `src/app/(authed)/tableau-de-bord/page.tsx` + `src/components/cagnottes/CampaignCard.tsx:48` | **P0 bug** — `CampaignCard` href is hardcoded `/c/${slug}` (public). Add `linkVariant` prop or `hrefOverride` so the dashboard island links to `/tableau-de-bord/cagnottes/${slug}`. |
| `/tableau-de-bord/cagnottes/[slug]` | **MISSING** — only `stats/page.tsx` and `modifier/page.tsx` exist | **P0** — build new page from `DashboardCagnotteDetail.jsx` (11 288 chars). Wire `GET /api/blocks/:id/progress` for metrics, `GET /api/cagnottes/:slug/participants` for recent list, `GET /api/blocks/:id` for block data. |
| `/tableau-de-bord/cagnottes/[slug]/modifier` | `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/page.tsx` | Keep as-is; accessed via the "Gérer" button on the new detail page. |
| `/tableau-de-bord/cagnottes/[slug]/stats` | `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/stats/page.tsx` | Keep as-is; accessed via "Voir toutes" on the recent participations section. |
| `/retraits` (full flow) | `src/app/(authed)/retraits/page.tsx` + `_AmountStep.tsx` | **P1** — restructure to match `WithdrawFundsForm.jsx`: dark-navy header, numbered step markers with pink circles, Wave/Orange option cards with `w-12 h-12` colored initial tiles, numbered summary section. |
| `/retraits/pin` | `src/app/(authed)/retraits/pin/page.tsx` | **P1** — restyle to match `WithdrawOTP.jsx`: shield hero icon in `bg-blue-50`, `rounded-[2.5rem]` card, 4-cell OTP grid with `animate-pulse` caret, `focus-within:ring-blue-50`. Drop or confirm the countdown/resend (depends on OTP vs PIN decision). |
| `/retraits/succes` | `src/app/(authed)/retraits/succes/page.tsx` | **P1** polish — add `animate-ping` green ring behind the check icon, match `WithdrawSuccess.jsx` exactly. |
| `/tableau-de-bord/nouvelle/festive/etape-1` | `src/app/(authed)/tableau-de-bord/nouvelle/festive/etape-1/page.tsx` | **P1** — replace the shipped `Select` for "Occasion" with a custom `Combobox` primitive rendering emoji options + hover check. Matches `CreateFestiveCagnotteStep1OccasionOpen.jsx`. |
| `/tableau-de-bord/nouvelle/festive/etape-2` + solidaire/etape-2 | `src/app/(authed)/tableau-de-bord/nouvelle/{festive,solidaire}/etape-2/page.tsx` + `src/components/ui/DatePicker.tsx` | **P1** — restyle `DatePicker` wrapper to the button-style shell shown in Banani. No popover calendar primitive. |
| `/tableau-de-bord/nouvelle/festive/etape-3` + solidaire/etape-3 | `src/app/(authed)/tableau-de-bord/nouvelle/{festive,solidaire}/etape-3/page.tsx` | **P1** — lift the inline `VisibilityCard` to `src/components/ui/VisibilityCard.tsx`. Update copy to match Banani verbatim (**"Idéal pour maximiser les dons."**). |
| `/profil` | `src/app/(authed)/profil/page.tsx` + `ProfileSidebar.tsx` | **P2** polish — verify 5-tab sidebar matches Banani (Informations, Sécurité, Coordonnées, Préférences, Déconnexion). Minor icon and copy tweaks only. |
| `/profil/coordonnees-bancaires` | `src/app/(authed)/profil/coordonnees-bancaires/page.tsx` | **P1** — full rewrite to match `UserPaymentMethods.jsx`: Mobile Money card with colored-initial tiles + trash buttons, Bank Accounts empty-state card with dashed border + landmark icon, informational notice footer. |
| `/` (home) | `src/components/layout/PublicNavbar.tsx` | **P1 logo swap** — lowercase `cagnotte.sn`, two-tone spans, `font-black tracking-tighter`. |
| all `(authed)` pages | `src/components/layout/DashboardNavbar.tsx` | **P1 logo swap** — same as above. |

---

## Priority matrix

| Priority | Items |
|---|---|
| **P0 (must fix before v1)** | 1. `CampaignCard` dashboard link bug (`/c/[slug]` → `/tableau-de-bord/cagnottes/[slug]`) — currently users see the public donor view from their own dashboard. 2. New creator detail page `/tableau-de-bord/cagnottes/[slug]/page.tsx` — must exist so the link from #1 resolves. 3. Wire the "Retirer les fonds" CTA on the new detail page to `/retraits?blockId=...` or `/tableau-de-bord/cagnottes/[slug]/retirer`. |
| **P1 (polish before v1)** | 4. Logo swap (navbars + `MISC.siteName`). 5. `/retraits` flow restructure to match Banani chrome. 6. `/retraits/pin` OTP visual polish + decision on OTP-vs-persistent-PIN. 7. `/profil/coordonnees-bancaires` rewrite. 8. Wizard step-3 visibility copy + extract `VisibilityCard` primitive. 9. Wizard step-1 custom Occasion `Combobox`. 10. `DatePicker` button-shell restyle. 11. `animate-ping` polish on success pages. |
| **P2 (v2 or later)** | 12. Popover Calendar primitive (if user provides Banani source). 13. SMS-based withdrawal OTP backend (if user confirms OTP over PIN). 14. Merci-page creator variant (user complaint #8 — not in export). 15. "Subtitle per cagnotte" field (user complaint #5 — not in export). |

---

## Recommended Phase 7 scope

Three atomic plans for Phase 7. Each plan ships independently and leaves the tree green.

### Plan 07-01 — Creator detail page + dashboard link fix + logo swap (**P0 + quick P1**)
- Build `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/page.tsx` from `DashboardCagnotteDetail.jsx`. Wire to `GET /api/blocks/:id/progress` + `GET /api/cagnottes/:slug/participants` + the existing block detail query. Render KPIs, Withdraw Action Box (CTA routes to `/retraits?blockId=...`), recent participations feed, sidebar (share link, visibility toggles — **read-only display** in v1, no inline mutation), Zone de danger close button (ties into existing block mutation).
- Fix `CampaignCard` with `linkVariant` prop; update `ClientCampaignCard` + public cagnotte list call sites.
- Swap both navbars to the 2-span lowercase `cagnotte.sn` logo. Update `MISC.siteName` or introduce `MISC.brandMark` alongside it.
- **Verify:** dashboard card click lands on new detail page; detail page renders with seeded data; `Retirer les fonds` CTA navigates correctly; logo reads lowercase everywhere.

### Plan 07-02 — Withdraw flow visual parity + wizard polish (**P1 batch**)
- Restructure `/retraits/page.tsx` chrome (dark-navy hero + numbered steps + operator-initial tiles).
- Restyle `/retraits/pin/page.tsx` to match `WithdrawOTP` hero shape. **Decision gate:** confirm with user whether to build OTP backend or keep persistent PIN + drop countdown.
- Add `animate-ping` ring to `/retraits/succes/page.tsx`.
- Lift `VisibilityCard` to `src/components/ui/`; update copy in both wizard step-3 pages.
- Restyle `DatePicker` outer shell; update helpers in step-2 pages.
- Rewrite `/profil/coordonnees-bancaires/page.tsx` from `UserPaymentMethods.jsx`.
- **Verify:** full withdraw flow visual QA; wizard step-2/step-3 visual QA on 375px; coord bancaires page renders all empty states.

### Plan 07-03 — Custom Combobox primitive + occasion select + polish sweep (**P1 tail**)
- Add `src/components/ui/Combobox.tsx` — headless pattern using `useState` + click-outside + keyboard nav. Matches Banani's dropdown chrome exactly (absolute positioning, hover check icon, divider separators).
- Replace the shipped `<Select>` usage in festive step-1 with `<Combobox>` for "Occasion". Keep `<Select>` for other simple cases.
- Run a visual-polish pass across `CampaignCard`, `Button`, and the home page (`hover:border` + `transition-colors` parity with Banani).
- **Verify:** Combobox works on touch devices (no hover-only reveals); keyboard `arrow-up/down/enter/escape` work; no Framer Motion introduced.

### Out of scope for Phase 7 (deferred)
- **Calendar / Calendar-plus popover primitive** — not in the export; wait for a Banani source before building.
- **SMS OTP backend** — gated on user decision; default to reusing persistent PIN.
- **Merci variant / subtitle field** — not in the export; needs re-clarification with user.
- **Admin panel / KYC review UI** — orthogonal, stays CLI-only per CLAUDE.md.
