# create-success — Banani source extract

**Banani screen title (verbatim):** `Succès - Cagnotte Créée`
**Matched MCP index:** designs[17] (screen `main_next1_next2_next2_next1_next1_next1_next1_next1.jsx` + component `CagnotteSuccessDashboard.jsx`)
**Target route:** `/cagnottes/nouvelle/succes?slug=<slug>` (or `/tableau-de-bord/cagnottes/<slug>?created=1`)

## Layout description
Celebration screen on `bg-gray-50`. Centered top: 80px green circle with large check icon (`Check`, 40px, color `#00B67A` on `#CCF0E4` bg), bold H1 `Félicitations !`, subtitle. Below: **two-column layout** (`md:flex-row`). Left 2/3 = white share card with copy-link row + 4-button social grid. Right 1/3 = aperçu thumbnail labelled `Aperçu` — a mini `CampaignCard` clone showing the just-created cagnotte with `0 €` / `sur 500 €` / `0 participant` / `Voir ma cagnotte` CTA.

## Key sections
- **Success header (centered):**
  - 80px green check circle (`bg-[#CCF0E4]`, icon color `#00B67A`)
  - H1: `Félicitations !` (`text-4xl md:text-5xl font-black`)
  - Subtitle: `Votre cagnotte est maintenant en ligne. Partagez-la avec vos proches pour commencer à récolter des fonds.`
- **Left card — `Partager ma cagnotte`:**
  - H2: `Partager ma cagnotte`
  - **Share link row:**
    - Label: `Lien de la cagnotte`
    - Pill container `bg-gray-50 border rounded-xl`: URL text `https://cagnotte.sn/c/30-ans-de-thomas-1a2b3c` (truncate) + navy `Copier` button with `copy` icon
  - **Social grid (2×2):**
    - `WhatsApp` — `bg-[#25D366]/10 text-[#25D366]`, `message-circle` icon
    - `Facebook` — `bg-[#1877F2]/10 text-[#1877F2]`, `facebook` icon
    - `Email` — `bg-gray-100 text-gray-700`, `mail` icon
    - `Autre` — `bg-gray-100 text-gray-700`, `more-horizontal` icon (native share sheet)
- **Right column — Aperçu:**
  - Small uppercase label `Aperçu`
  - Mini card: cover image (`Célébration` chip), title `Pour les 30 ans de Thomas`, organizer row `👤 Organisée par Vous`, progress section `0 €` / `sur 500 €` / empty progress bar / `0 participant`, CTA `Voir ma cagnotte` (pink `bg-[#FBE6ED]` text navy)

## Form fields
N/A — this is a success + share screen.

## Banani tokens used
- Colors: `#172866` navy, `#00B67A` success green, `#CCF0E4` success-light bg, `#FBE6ED` pink CTA, `#25D366` WhatsApp green, `#1877F2` Facebook blue
- Font: Poppins (`text-4xl md:text-5xl font-black` H1), Inter body
- Radii: main cards `rounded-3xl`, share link pill `rounded-xl`, social buttons `rounded-xl`
- Shadows: `shadow-sm` on card and preview
- Notable: `flex-1` left + `w-full md:w-1/3` right, `truncate` on URL text

## Composition plan (Phase 3 primitives/blocks)
- `DashboardLayout` wrapper
- **Success header** — new `SuccessHero` block or inline JSX with `Check` icon in tinted circle
- **Share card** — reuse Phase 3 `ShareSheet` block (already shipped in Phase 3.3) — it already contains copy-link + social buttons. Verify whether the copy-link row UX matches (navy button with `copy` icon).
  - If Phase 3 `ShareSheet` is a modal/drawer, adapt to render inline on this page
  - Otherwise extract the share grid into a `ShareButtonGrid` sub-block
- **Preview card** — reuse Phase 3 `CampaignCard` (shipped in Phase 3.3 — cagnotte block) in a `compact` or default variant; pass the created block as props
- **Organizer row** — small `<Avatar />` + "Organisée par Vous" text

## Banani → cagnottes.sn translations needed
- `350 €` / `500 €` / `0 €` → FCFA equivalents via `formatPrice()`
- URL: Banani shows `https://cagnotte.sn/c/<slug>-<hash>` — our live URL scheme is `https://cagnotte.sn/<slug>` (or `/cagnottes/<slug>`? — confirm with Phase 2 `routes/cagnottes.ts` and middleware `slug lowercase normalization`). Update display accordingly.
- **Social share payloads** must be pre-filled in FRENCH:
  - WhatsApp: `whatsapp://send?text=J'ai créé une cagnotte : <title> <url>`
  - Facebook: `https://www.facebook.com/sharer/sharer.php?u=<url>`
  - Email: `mailto:?subject=<title>&body=J'ai créé une cagnotte : <url>`
  - Autre: `navigator.share({ title, url })` fallback to `window.prompt`
- `Organisée par Vous` — on the live screen, replace with the seller's actual name
- `Célébration` chip — dynamic based on subtype: `Célébration` for festive, `Solidarité` for solidaire

## Key copy (French, verbatim from Banani)
> **H1:** `Félicitations !`
> **Subtitle:** `Votre cagnotte est maintenant en ligne. Partagez-la avec vos proches pour commencer à récolter des fonds.`
> **Share card title:** `Partager ma cagnotte`
> **Link label:** `Lien de la cagnotte`
> **Copy button:** `Copier`
> **Social grid label:** `Partager sur les réseaux`
> **Social labels:** `WhatsApp`, `Facebook`, `Email`, `Autre`
> **Preview label:** `Aperçu` (uppercase tracking-wider)
> **Preview organizer:** `Organisée par Vous`
> **Preview CTA:** `Voir ma cagnotte`

## Notable details / risks
- **No confetti / celebration animation** shown in Banani — just the static green check circle. If the executor wants to add a confetti burst (framer-motion is banned by CLAUDE.md, but a CSS-only burst is OK), it must stay within the CSS-only constraint from `/CLAUDE.md` (`Framer Motion → CSS transitions only`).
- Share button colors use **alpha-tinted bg** (`/10`) with full-saturation text — a nice subtle palette, preserve it
- `Autre` button should wire to `navigator.share()` when available (iOS/Android native share sheet). On desktop fall back to copying link + toast.
- The right-column preview is a **live preview**, not a static mockup — it must reflect the actual config the user just submitted (title, image, goal, subtype chip)
- No "Ajouter un objectif" / "Voir mes cagnottes" secondary CTA in Banani — executor can add a small link `Retour au tableau de bord` in the footer (not in Banani)
- Copy-link button should give visual feedback on click (swap `Copier` → `Copié ✓` for 2s) — not shown in Banani
- URL truncates via `truncate` class — ensure long slugs don't break layout
- Progress bar is **empty** (`w-0`) because no one has donated yet — preserved exactly in the preview
- Per guardrails, check Phase 3 `ShareSheet` block signature first — if it already includes copy-link + WhatsApp + Facebook + Email + Autre, the whole left column becomes `<ShareSheet cagnotte={...} inline />`
