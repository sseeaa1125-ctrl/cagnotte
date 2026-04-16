# withdraw-success — Banani wireframe extract

**Banani component:** `WithdrawSuccess.jsx` (3 706 chars)
**Target route / primitive:** `/retraits/succes`
**Phase 7 plan:** 07-02

## Layout description
Centered success card on gray-50 background, `rounded-[2.5rem]` shell with top green gradient decoration. **Green check circle with `animate-ping` ring** (key polish detail), big navy title, amount paragraph, transaction summary rows, informational notice ("SMS de confirmation envoyé"), then stacked back + dashboard actions.

## Key sections
- **Background decoration:** absolute top-0 green-50 gradient band (`h-32 bg-gradient-to-b from-green-50 to-transparent`)
- **Success icon:** 24x24 circle `bg-[#E6F3EE]` with green check, wrapped by `absolute inset-0 rounded-full bg-[#00B67A]/20 animate-ping`
- **Title + message:** "Retrait validé !" (`text-5xl font-black`), paragraph with inline bold amount
- **Transaction Summary box:** gray-50 `rounded-3xl`, 3 rows with bottom borders (Depuis la cagnotte, Vers le compte, Délai estimé)
- **Info notice:** blue-50/50 card with info icon + "Un SMS de confirmation a été envoyé" heading + body
- **Actions:** outline "Retour à la cagnotte" + navy "Aller au tableau de bord"

## Key copy (verbatim French)
> Retrait validé !
> Votre demande de retrait de **450,00 €** a bien été confirmée et traitée.
> Depuis la cagnotte
> Vers le compte
> Wave Sénégal
> Délai estimé
> Immédiat
> Un SMS de confirmation a été envoyé
> Vous allez recevoir ou avez déjà reçu un SMS de confirmation de notre partenaire de paiement.
> Retour à la cagnotte
> Aller au tableau de bord

## Visual details
- **Colors:** navy `#172866`, green success `#00B67A`, green bg `#E6F3EE`, gradient `from-green-50`, info card `bg-blue-50/50 border-blue-100`
- **Typography:** title `text-3xl md:text-5xl font-black`, paragraph `text-xl font-medium`, summary labels `text-sm font-bold text-gray-500`
- **Spacing / radii:** card `rounded-[2.5rem] p-8 md:p-12 max-w-2xl`, summary `rounded-3xl p-6`, info `rounded-2xl p-5`
- **Animations (critical):** `absolute inset-0 rounded-full bg-[#00B67A]/20 animate-ping` — the polish target. This is the shared success pattern used in `ParticipationSuccess` too.
- **Icons:** `check`, `info`

## Key JSX snippets

### animate-ping success ring (critical polish target)
```jsx
<div className="relative inline-flex mb-8 mt-4 items-center justify-center">
  <div className="absolute inset-0 rounded-full bg-[#00B67A]/20 animate-ping"></div>
  <div className="w-24 h-24 bg-[#E6F3EE] rounded-full flex items-center justify-center relative z-10">
    <Icon i="check" size={48} className="text-[#00B67A]" />
  </div>
</div>
```

### Summary row pattern
```jsx
<div className="flex items-center justify-between border-b border-gray-200 pb-4">
  <span className="text-sm font-bold text-gray-500">Vers le compte</span>
  <div className="flex items-center gap-2">
    <div className="w-6 h-6 bg-[#3374FF] rounded text-white font-black text-xs flex items-center justify-center">W</div>
    <span className="font-black text-[#172866]">Wave Sénégal</span>
  </div>
</div>
```

## Composition plan (Phase 3 primitives to use)
- Existing: Button
- New: SuccessHero primitive with `animate-ping` ring (REUSE in ParticipationSuccess too — this is the shared success pattern)
- New: InfoCard primitive (blue-50/50 background with info icon)

## Banani → cagnottes.sn translations needed
- `450,00 €` → `450 000 FCFA`
- `Délai estimé / Immédiat` — verify with backend; Bictorys payouts may actually be minutes to hours. Consider "Jusqu'à 24h" fallback.
- SMS confirmation claim is Bictorys-dependent — keep generic or make conditional

## Notable details / risks
- Hero `animate-ping` ring is the SAME pattern in `ParticipationSuccess.jsx` — extract once as `SuccessHero` primitive, use in both
- After this page, user most likely navigates back; no auto-redirect
- Amount should come from query param or referring page state (don't re-query)
