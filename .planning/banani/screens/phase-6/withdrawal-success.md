---
gap_screen: true
designed_ourselves: false
---

# withdrawal-success — Banani source extract (GAP SCREEN PRESENT)

**Banani screen title (verbatim):** Retrait Confirmé - Tableau de Bord
**Target route:** `/cagnottes/:slug/retrait/confirmation`
**Matched MCP component:** `WithdrawSuccess` (+ `DashboardNavbar`)

## Layout description
`DashboardNavbar` at top, then a centered `bg-gray-50` section with a single `max-w-2xl` white card (`rounded-[2.5rem]`). Card has a soft green gradient bg at the top, large animated pulsing success icon, H1, description, transaction summary (gray-50 panel), info notice, and two action buttons.

## Key sections
- **Header:** `DashboardNavbar`
- **Success icon:** 96x96 `bg-[#E6F3EE] rounded-full` with 48px green check, wrapped in an animate-ping halo (`bg-[#00B67A]/20`)
- **H1:** "Retrait en cours !"
- **Description:** with bold amount span
- **Transaction summary:** bordered gray-50 rounded-3xl panel with 3 rows (Depuis / Vers / Délai)
- **Info notice:** blue-50 info box — "Un SMS de confirmation arrive"
- **CTAs:** two buttons side-by-side on `sm+`, stacked on mobile
  - Secondary (white, bordered): "Retour à la cagnotte"
  - Primary (navy): "Aller au tableau de bord"

## Transaction summary rows
| Label | Value | Style |
|---|---|---|
| Depuis la cagnotte | "Les 30 ans de Thomas" | font-black navy |
| Vers le compte | Wave logo tile + "Wave Sénégal" | — |
| Délai estimé | "Immédiat" | green pill `bg-green-100 text-green-600` |

## Info notice
- Title: **"Un SMS de confirmation arrive"**
- Body: **"Vous allez recevoir un SMS de confirmation de notre partenaire de paiement d'ici quelques minutes."**
- Icon: `info`, bg `bg-blue-50/50`

## Banani tokens used
- Colors: `#00B67A` (success green), `#E6F3EE` (icon bg), `#172866` (navy text), `bg-green-50` gradient, `bg-blue-50/50` (info notice)
- Radii: `rounded-[2.5rem]` (main card), `rounded-3xl` (summary panel), `rounded-full` (icon)
- Animation: `animate-ping` on halo (CSS only — no Framer Motion per CLAUDE.md)

## Composition plan
- `DashboardNavbar`
- **New:** `SuccessCard` block (pulsing icon + H1 + body + summary + CTAs) — can be shared with `/cagnottes/:slug/merci` (donation success) already designed in Phase 5
- **New:** `TransactionSummary` compound (list of label/value rows, optional dividers)
- `InfoNotice` primitive (also used in profile-variant-bank-details.md)
- `Button` variants: primary + outline
- Reuse logo-tile sub-primitive for Wave/Orange/Free Money

## Banani → cagnottes.sn translations needed
- `450,00 €` → `450 000 FCFA` (description paragraph)
- "notre partenaire de paiement" is intentionally generic — keep as-is (don't name Bictorys to end-user)
- "Immédiat" pill — should be dynamic: "Sous 2 minutes" for mobile money, "48-72h" for bank; Banani only shows the instant case

## Key copy (French, verbatim)
> **H1:** "Retrait en cours !"
> **Body:** "Votre demande de retrait de <amount> a bien été prise en compte."
> **Summary labels:** "Depuis la cagnotte", "Vers le compte", "Délai estimé"
> **Delay pill:** "Immédiat"
> **Info title:** "Un SMS de confirmation arrive"
> **Info body:** "Vous allez recevoir un SMS de confirmation de notre partenaire de paiement d'ici quelques minutes."
> **Secondary CTA:** "Retour à la cagnotte"
> **Primary CTA:** "Aller au tableau de bord"

## Data source
- **Read:** query param or route state from previous screen — `withdrawalId`, `amount`, `blockTitle`, `payoutAccount`, `estimatedDelay`
- Alternative: `GET /api/withdrawals/:id` (check if endpoint exists — `routes/withdrawals.ts` may only expose POST)
- **No mutations on this page**

## Notable details / risks
- The `animate-ping` halo is pure CSS — Tailwind provides it out of the box. No JS animation library needed.
- State handoff from `WithdrawFundsForm` → this page: prefer URL params (`?amount=450000&account=wave`) or router state over global store (no Redux/Zustand per CLAUDE.md)
- Delay pill color variant needed for `48-72h` case (orange pill instead of green)
- Failed withdrawal state is NOT in Banani — design an error variant ("Retrait échoué" with red icon + retry CTA) for 5xx / payout API failures
- The success icon uses `animate-ping` which runs indefinitely — consider pausing after 3s for perf
- Secondary CTA "Retour à la cagnotte" → `/tableau-de-bord/cagnottes/:slug`
- Primary CTA "Aller au tableau de bord" → `/tableau-de-bord`
