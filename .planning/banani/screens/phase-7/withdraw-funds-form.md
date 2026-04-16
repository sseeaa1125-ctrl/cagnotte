# withdraw-funds-form — Banani wireframe extract

**Banani component:** `WithdrawFundsForm.jsx` (8 014 chars)
**Target route / primitive:** `/retraits` (polish target — already shipped, restructure to match)
**Phase 7 plan:** 07-02

## Layout description
Single-form page, `max-w-3xl`, gray-50 background. One large white card with a **dark-navy hero header** (`bg-[#172866]`), then the form body split into numbered steps. Step 1 = amount input. Step 2 = destination (radio cards for Wave, Orange Money, + dashed "add new" CTA). Then a récapitulatif block and the confirm CTA.

## Key sections
- **Back link:** "Retour à la cagnotte"
- **Hero (navy):** title "Retirer mes fonds" + tagline (white-on-navy)
- **Source Info row:** thumbnail + source cagnotte name + solde disponible (right-aligned amount)
- **Step 1 — Montant à retirer:** numbered pink-circle (`bg-[#F4D3DE]` w-8 h-8), navy-bordered amount input with big font, "Max" chip helper
- **Step 2 — Destination:** numbered circle, stacked radio cards (selected = navy border + blue-50/30 background + filled dot; unselected = gray-100 border + empty circle). Dashed "Ajouter un compte bancaire ou Mobile Money" button
- **Récapitulatif:** "RÉCAPITULATIF DU RETRAIT" uppercase header, 3 rows (Montant retiré, Frais, Délai), then a big "Vous allez recevoir" summary box
- **Confirm:** full-width navy CTA + "Transaction sécurisée" helper

## Key copy (verbatim French)
> Retour à la cagnotte
> Retirer mes fonds
> Transférez l'argent récolté vers le compte de votre choix en toute sécurité.
> Depuis la cagnotte
> Solde disponible
> Montant à retirer
> Max
> Vous retirez la totalité du solde disponible.
> Où envoyer l'argent ?
> Wave Sénégal
> Instantané
> Orange Money
> Ajouter un compte bancaire ou Mobile Money
> Récapitulatif du retrait
> Montant retiré
> Frais de virement (Wave)
> Gratuit
> Délai estimé
> Immédiat
> Vous allez recevoir
> Confirmer le retrait
> Transaction sécurisée

## Visual details
- **Colors:** navy `#172866`, navy hover `#0f1a45`, hero text `text-blue-100`, step circle `bg-[#F4D3DE]`, Wave brand `#3374FF`, Orange brand `#FF6600`, "Instantané" chip `bg-green-100 text-green-600`, blue-50/30 selected bg
- **Typography:** `font-black`, `text-3xl` hero, `text-xl` step headings, `text-2xl` amount input, `font-bold`, `uppercase tracking-wider text-xs` for récapitulatif header
- **Spacing / radii:** outer card `rounded-3xl`, hero `p-8 md:p-10`, body `p-8 md:p-10 space-y-8`, inputs `rounded-2xl`, confirm button `rounded-2xl py-5`
- **Animations:** none beyond default hover transitions
- **Icons:** `arrow-left`, `plus`, `check-circle`, `lock`

## Key JSX snippets

### Navy hero header
```jsx
<div className="p-8 md:p-10 border-b border-gray-100 bg-[#172866] text-white">
  <h1 className="text-3xl font-black mb-2">Retirer mes fonds</h1>
  <p className="text-blue-100 font-medium">
    Transférez l'argent récolté vers le compte de votre choix en toute sécurité.
  </p>
</div>
```

### Numbered step heading (pink circle)
```jsx
<h2 className="text-xl font-black text-[#172866] mb-4 flex items-center gap-3">
  <span className="w-8 h-8 rounded-full bg-[#F4D3DE] text-[#172866] flex items-center justify-center text-sm">1</span>
  Montant à retirer
</h2>
```

### Operator radio card (selected Wave)
```jsx
<div className="border-2 border-[#172866] bg-blue-50/30 rounded-2xl p-5 flex items-center justify-between">
  <div className="flex items-center gap-4">
    <div className="w-5 h-5 rounded-full border-2 border-[#172866] flex items-center justify-center shrink-0">
      <div className="w-2.5 h-2.5 bg-[#172866] rounded-full"></div>
    </div>
    <div className="w-12 h-12 bg-[#3374FF] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm shrink-0">W</div>
    <div>
      <div className="font-bold text-[#172866] text-lg">Wave Sénégal</div>
      <div className="text-sm text-gray-500 font-medium">+221 77 123 45 67</div>
    </div>
  </div>
  <div className="hidden sm:block text-sm font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full">Instantané</div>
</div>
```

## Composition plan (Phase 3 primitives to use)
- Existing: Button (primary, outline), Card, Input
- New: NumberedStepHeading primitive, OperatorRadioCard primitive (can reuse in UserPaymentMethods), DashedAddButton primitive

## Banani → cagnottes.sn translations needed
- `450,00 €` → `450 000 FCFA` (integer FCFA, space thousands)
- Phone format is already `+221 …` (good, Banani matched)
- `Frais de virement (Wave)` `Gratuit` — verify with backend; Bictorys payout fees may not be zero in v1
- Drop the "Delai estimé: Immédiat" if payout isn't actually instant

## Notable details / risks
- The shipped `/retraits` page uses different structure — this is the polish target; preserve the existing form logic and swap the markup
- "Max" chip should set the input value to available balance on click
- PIN flow lives on a separate `/retraits/pin` route (see `withdraw-otp.md`) — this form submits, backend returns `PIN_REQUIRED`, frontend redirects
- We KEEP persistent PIN (backend already stores `withdrawalPinHash`), drop the Banani countdown-based OTP fiction
