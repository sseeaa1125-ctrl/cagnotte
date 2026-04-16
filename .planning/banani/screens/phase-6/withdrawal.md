---
gap_screen: true
designed_ourselves: false
---

# withdrawal — Banani source extract (GAP SCREEN PRESENT)

**Banani screen title (verbatim):** Retirer les fonds - Tableau de Bord
**Target route:** `/cagnottes/:slug/retrait`
**Matched MCP component:** `WithdrawFundsForm` (+ `DashboardNavbar`)

## Layout description
`DashboardNavbar` at top, then centered `max-w-3xl` column on `bg-gray-50`. Back link at top ("Retour à la cagnotte"). Main white rounded-3xl card with a **navy header banner** ("Retirer mes fonds" + subtitle) then a body with 4 sequential blocks: source info, step 1 (amount), step 2 (destination), summary + confirm CTA.

## Key sections
- **Header:** `DashboardNavbar`
- **Back link:** `← Retour à la cagnotte`
- **Navy header banner (inside card):** H1 "Retirer mes fonds" + subtitle, `bg-[#172866] text-white`
- **Source info strip:** cagnotte thumbnail + name on left, "Solde disponible" + amount on right (gray-50 rounded-2xl)
- **Step 1 — Montant à retirer:** large amount input (navy border, font-black 2xl), "Max" chip + helper text
- **Step 2 — Où envoyer l'argent ?:** radio-like cards for each payout account (Wave selected, Orange Money unselected) + "Ajouter un compte..." dashed card
- **Summary:** "Récapitulatif du retrait" (uppercase label) + 3 lines (Montant retiré, Frais, Délai estimé) + "Vous allez recevoir" highlighted row (bg-gray-50 + green amount)
- **CTAs:** "Confirmer le retrait" (full-width navy, shadow-lg) + "Transaction sécurisée" lock text below

## Step 1 — Amount input
- Input style: `w-full border-2 border-[#172866] rounded-2xl py-4 px-6 font-black text-2xl bg-blue-50/30`
- Currency suffix: `€` (→ must become `FCFA`)
- Chip: "Max" pill (`bg-blue-100 text-[#172866]`) + helper "Vous retirez la totalité du solde disponible."

## Step 2 — Destination radio cards
- Selected: `border-2 border-[#172866] bg-blue-50/30` + filled radio dot + provider logo tile + name + phone + "Instantané" green pill (on `sm+`)
- Unselected: `border-2 border-gray-100 bg-white` + empty radio + same layout
- Add option: dashed border rounded-2xl button "Ajouter un compte bancaire ou Mobile Money"

## Summary block
| Label | Value | Style |
|---|---|---|
| Montant retiré | "450,00 €" | bold navy |
| Frais de virement (Wave) | "Gratuit" | green text |
| Délai estimé | "Immédiat" | gray |
| **Vous allez recevoir** | "450,00 €" | large green `text-3xl` in gray-50 pill |

## Banani tokens used
- Colors: `#172866` (navy header + borders), `bg-blue-50/30` (selected state), `text-green-600` (free + highlight), `#3374FF` / `#FF6600` (provider tiles)
- Radii: `rounded-3xl` (card), `rounded-2xl` (subsections, input), `rounded-full` (radio, pills)

## Composition plan
- `DashboardNavbar`
- **New:** `WithdrawalForm` block (amount + destination + summary + confirm)
- **New:** `AmountInput` primitive (large FCFA input with Max chip)
- **New:** `PayoutAccountRadioCard` (radio dot + logo tile + name + phone + instant pill)
- Reuses `PayoutAccountCard` logo-tile sub-primitive from profile-variant-bank-details
- **Missing in Banani:** PIN entry — CLAUDE.md says withdrawals require `withdrawalPinHash` check (`code: "PIN_REQUIRED"`). **Design a PIN modal ourselves** before the "Confirmer le retrait" click executes, OR embed a PIN field as "Step 3" in the form.
- **Missing in Banani:** KYC gate — backend returns 403 if `kycStatus !== "APPROVED"`. Design an empty-state variant with "Vérifier votre identité" CTA linking to `/profil/verification-identite` (also absent, design ourselves).

## Banani → cagnottes.sn translations needed
- `€` → `FCFA` — all 3 amount displays + currency suffix
- `450,00 €` → `450 000 FCFA` (no decimals) via `formatPrice()`
- `2 100 €` (in summary example) → recompute in FCFA
- Confirm Bictorys payout actually has "Instantané" / "Gratuit" for Wave — check `lib/payout.ts` fee policy
- "Retour à la cagnotte" back link target: `/tableau-de-bord/cagnottes/:slug` (creator dashboard detail page)

## Key copy (French, verbatim)
> **Back link:** "Retour à la cagnotte"
> **H1:** "Retirer mes fonds"
> **Subtitle:** "Transférez l'argent récolté vers le compte de votre choix en toute sécurité."
> **Source labels:** "Depuis la cagnotte", "Solde disponible"
> **Step 1:** "Montant à retirer"
> **Step 1 chip:** "Max" + "Vous retirez la totalité du solde disponible."
> **Step 2:** "Où envoyer l'argent ?"
> **Instant pill:** "Instantané"
> **Add button:** "Ajouter un compte bancaire ou Mobile Money"
> **Summary heading:** "Récapitulatif du retrait"
> **Summary rows:** "Montant retiré", "Frais de virement (Wave)", "Gratuit", "Délai estimé", "Immédiat"
> **Total row:** "Vous allez recevoir"
> **Primary CTA:** "Confirmer le retrait"
> **Security footnote:** "Transaction sécurisée"

## Data source
- **Read cagnotte balance:** `GET /api/blocks/:id/progress` (exists) + creator-side endpoint for withdrawable balance (may need new endpoint `GET /api/blocks/:id/payable` that subtracts commissions + already-paid withdrawals)
- **Read payout accounts:** `GET /api/sellers/me/payout-accounts` (must be created — see profile-variant-bank-details.md)
- **Submit:** `POST /api/withdrawals { blockId, amount, payoutAccountId, pin }` (exists, backed by `routes/withdrawals.ts`). Response 403 if KYC not approved, 400 if PIN_REQUIRED.

## Notable details / risks
- **PIN gate missing from Banani** — must be added (modal or inline Step 3)
- **KYC gate missing from Banani** — must be added as blocked state
- Partial withdrawal not shown — Banani always pre-fills with the full balance ("Max"). User editing the amount is implicit — confirm editable.
- Fee row hardcoded to "Gratuit" for Wave — our `lib/payout.ts` must expose real fees per provider
- 403/503 error states (circuit breaker open) — design toast + inline error
- After submit success → redirect to `/cagnottes/:slug/retrait/confirmation` (see withdrawal-success.md)
