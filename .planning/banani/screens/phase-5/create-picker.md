# create-picker — Banani source extract

**Banani screen title (verbatim):** `Créer une cagnotte - Cagnotte.sn`
**Matched MCP index:** designs[10] (screen `main_next1_next2_next2_next1.jsx` + component `CreateCagnotteForm.jsx`)
**Target route:** `/cagnottes/nouvelle`

## Layout description
Centered vertical section on white. Small navy 48px circular logo mark at top (decorative), then a centered 2-line H1, then a **two-card horizontal picker** (stacks on mobile), then a trust-badge pill row at the bottom. The two cards are **pill-shaped** (`rounded-[2.5rem]`, ~320×140px), one pink (`#F4D3DE`) for Festive, one cream (`#FEF4E3`) for Solidaire. Each card contains a 64px circular 3D illustration + bold label. Caption text sits below each card, not inside.

## Key sections
- **Top icon mark:** 48px `bg-[#172866] rounded-full` with small decorative white U-shape (likely a placeholder logo-glyph, safe to replace with the real favicon/logomark)
- **H1 (2 lines, centered):** `Créer la cagnotte de<br />votre choix :` (note trailing colon, `text-[40px] md:text-[46px]`)
- **Picker cards** (flex-col → flex-row):
  - **Festive** — `bg-[#F4D3DE]` pill card, 64px 3D disco-ball/globe illustration (circular clip + `mix-blend-multiply`), label `Festive` (`text-[26px] font-black`), caption below: `Cadeau commun, anniversaire, pot de départ, mariage, naissance, voyage...`
  - **Solidaire** — `bg-[#FEF4E3]` pill card, 64px 3D red-heart illustration, label `Solidaire`, caption: `Appel aux dons, aider une personne ou une association, soutenir un projet, obsèques...`
- **Trust badges pill:** white bordered pill with two check items:
  - `✓ 100% sécurisé`
  - `✓ Collecte facilitée`

## Form fields
N/A — this is a router/picker, not a form. Each card click navigates to `/cagnottes/nouvelle/festive/etape-1` or `/cagnottes/nouvelle/solidaire/etape-1`.

## Banani tokens used
- Colors: `#172866` navy, `#F4D3DE` festive-pink (deeper than `#FBE6ED`), `#efc7d5` festive-pink-hover, `#FEF4E3` solidaire-cream, `#faeed6` solidaire-hover, `#4a5568` caption text
- Font: Poppins (`font-black` H1 and labels), Inter (captions)
- Radii: card `rounded-[2.5rem]` (matches `--radius-2xl: 2.5rem`), trust pill `rounded-2xl`
- Notable classes: `mix-blend-multiply` on 3D illustrations, `tracking-tight` on H1

## Composition plan (Phase 3 primitives/blocks)
- `DashboardLayout` wrapper (authed, same navbar as dashboard)
- New block `CagnotteTypePicker` — two big buttons wired via Next `<Link>`:
  - `<Link href="/cagnottes/nouvelle/festive/etape-1">`
  - `<Link href="/cagnottes/nouvelle/solidaire/etape-1">`
- Illustrations: new assets needed (3D disco ball, 3D red heart). Ask designer or use placeholder from Banani `Image prompt=...` — executor must source or stub with emoji fallback (🪩 / ❤️ already used as badge emojis in step 1 screens)
- Trust badges: reuse Phase 3 `TrustBadge` or `IconList` block

## Banani → cagnottes.sn translations needed
- No currency shown
- Trust badge copy keeps as-is: `100% sécurisé`, `Collecte facilitée`
- **Subtype mapping for backend:** `Festive` → `festive` (8% commission), `Solidaire` → `solidaire` (6% commission). Confirm in `backend/src/lib/commission.ts`.
- The top icon mark appears to be a placeholder — replace with the real cagnottes.sn logomark OR drop it entirely (the `Navbar` already has the wordmark)

## Key copy (French, verbatim from Banani)
> **H1:** `Créer la cagnotte de votre choix :`
> **Festive label:** `Festive`
> **Festive caption:** `Cadeau commun, anniversaire, pot de départ, mariage, naissance, voyage...`
> **Solidaire label:** `Solidaire`
> **Solidaire caption:** `Appel aux dons, aider une personne ou une association, soutenir un projet, obsèques...`
> **Trust badge 1:** `100% sécurisé`
> **Trust badge 2:** `Collecte facilitée`

## Notable details / risks
- Cards are NOT icon-only — they're **illustration + label pills**, quite distinctive. Don't simplify to plain `<Card>`.
- The pink/cream tints on the cards are lighter variants of the chip colors used in the step-1 screens (`bg-[#F4D3DE]` for festive, `bg-[#FEF4E3]` for solidaire) — keep the palette consistent across the flow.
- Mobile stacks: `flex-col md:flex-row gap-6 md:gap-10` — cards retain fixed `w-[300px]` (not fluid). Consider relaxing to `w-full max-w-[320px]` on mobile.
- No CTA button at the bottom — the cards themselves are the CTAs (big click targets, ≥48px).
- Trust-badge pill is decorative but reinforces trust mid-funnel. Phase 3 has a `TrustpilotBadge` block — this is NOT Trustpilot, it's a generic "features" pill. Use `<Badge>`+icon composition.
