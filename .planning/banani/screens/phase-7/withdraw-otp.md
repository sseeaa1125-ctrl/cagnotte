# withdraw-otp — Banani wireframe extract

**Banani component:** `WithdrawOTP.jsx` (2 610 chars)
**Target route / primitive:** `/retraits/pin` (visual polish target — KEEP persistent PIN, DROP countdown resend)
**Phase 7 plan:** 07-02

## Layout description
Centered auth-style card on gray-50 background. Shield-check icon hero in blue-50 circle, big navy heading, subheading with phone mask, 4-cell OTP grid (each cell 14x16 md:16x18), resend link, primary navy CTA + outline cancel.

## Key sections
- **Shield hero:** 20x20 blue-50 circle centering `shield-check` icon, navy tint
- **Title + subtitle:** navy heading + French paragraph with inline bold amount and masked phone
- **OTP Grid:** 4 cells, selected cell shows typed digit + animated pulse caret
- **Resend link:** gray-500 underline-free button (we DROP the countdown)
- **Actions:** stacked navy primary + outline cancel

## Key copy (verbatim French)
> Vérification de sécurité
> Pour valider votre retrait de **450,00 €**, veuillez saisir le code à 4 chiffres envoyé au **+221 77 *** ** 67**.
> Je n'ai pas reçu le code (Renvoyer dans 0:45)  ← WE DROP THIS WRAPPER
> Valider le retrait
> Annuler

**For cagnottes.sn rewrite:** replace title → `Confirmez votre retrait`, replace subtitle → `Saisissez votre code PIN à 4 chiffres pour valider le retrait de <amount>.`, replace resend link → `PIN oublié ?` (linking to `/retraits/pin/reset`).

## Visual details
- **Colors:** navy `#172866`, hero circle `bg-blue-50`, cell border `border-gray-200` idle, focus `border-[#172866] + ring-4 ring-blue-50`, caret `bg-[#172866]`
- **Typography:** card `rounded-[2.5rem]` (critical), title `text-2xl md:text-3xl font-black`, OTP cell `text-3xl font-black`
- **Spacing / radii:** card `p-8 md:p-12 max-w-lg`, OTP gap `gap-3 md:gap-4`, cells `rounded-2xl`
- **Animations:** `animate-pulse` on caret line, `focus-within:border-[#172866] focus-within:ring-4 focus-within:ring-blue-50 transition-all`
- **Icons:** `shield-check`

## Key JSX snippets

### Shield hero
```jsx
<div className="relative inline-flex mb-6 mt-2 items-center justify-center">
  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center relative z-10">
    <Icon i="shield-check" size={40} className="text-[#172866]" />
  </div>
</div>
```

### OTP cell with animate-pulse caret (critical)
```jsx
<div className="w-14 h-16 md:w-16 md:h-18 border-2 border-gray-200 rounded-2xl flex items-center justify-center text-3xl font-black text-[#172866] bg-white focus-within:border-[#172866] focus-within:ring-4 focus-within:ring-blue-50 transition-all cursor-text">
  {digit}
  {isActive && <div className="w-0.5 h-8 bg-[#172866] animate-pulse ml-1"></div>}
</div>
```

## Composition plan (Phase 3 primitives to use)
- Existing: Button (primary + outline)
- New: OtpGrid primitive (4 cells, React `ref` focus chain), OtpCell primitive (with animate-pulse caret)
- Reuse: Card `rounded-[2.5rem]` pattern (same as WithdrawSuccess and ParticipationSuccess)

## Banani → cagnottes.sn translations needed
- `€` → `FCFA`
- `+221 …` already correct
- DROP countdown timer: our backend stores `withdrawalPinHash` persistently — no code is "sent" per transaction. User enters their existing PIN.
- REPLACE "Renvoyer dans 0:45" with "PIN oublié ?" link → `/retraits/pin/reset`
- Title should emphasize "PIN" not "code SMS"

## Notable details / risks
- Phase 2 backend already returns `code: "PIN_REQUIRED"` from withdrawals endpoint when PIN isn't verified; frontend must handle this 403 and redirect here
- If `withdrawalPinHash === null`, redirect to a first-time PIN setup page instead (different route)
- Auto-focus first cell on mount, advance on keystroke, backspace moves back one cell
- Error state: red border, shake animation (our addition, not in Banani)
