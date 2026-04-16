# user-payment-methods — Banani wireframe extract

**Banani component:** `UserPaymentMethods.jsx` (9 051 chars)
**Target route / primitive:** `/profil/coordonnees-bancaires` (rewrite target)
**Phase 7 plan:** 07-02

## Layout description
Full profile layout with a left sidebar (avatar card + nav menu) and a right content area showing two sections stacked: Mobile Money accounts (with existing entries) and Bank Accounts (empty state). Security notice at the bottom of the bank section.

## Key sections
- **Page header:** `h1` "Mon profil" + subtitle
- **Left sidebar:**
  - Profile card: avatar + camera edit button + name + email + "Identité vérifiée" green chip
  - Nav menu card: Informations personnelles, Sécurité & Mot de passe, **Coordonnées bancaires (active blue-50/50 bg)**, Préférences de notification, separator, Se déconnecter (red)
- **Right content:**
  - **Mobile Money card:** header with title + description + "Ajouter" button, list of operator rows (Wave, Orange Money), each with brand-colored square avatar (W/O), phone number, "Actif" chip, trash icon
  - **Bank Accounts card:** header with title + description, dashed empty-state box with landmark icon, CTA button, info notice below

## Key copy (verbatim French)
> Mon profil
> Gérez vos informations personnelles et vos paramètres de sécurité.
> Identité vérifiée
> Informations personnelles
> Sécurité & Mot de passe
> Coordonnées bancaires
> Préférences de notification
> Se déconnecter
> Comptes Mobile Money
> Pour recevoir les fonds de vos cagnottes instantanément.
> Ajouter
> Wave Sénégal
> Orange Money
> Actif
> Comptes Bancaires
> Pour les virements bancaires classiques (délai de 48h à 72h).
> Aucun compte bancaire
> Ajoutez un RIB/IBAN pour virer l'argent de vos cagnottes directement sur votre compte bancaire.
> Ajouter un compte bancaire
> Sécurité de vos coordonnées
> Vos coordonnées bancaires et numéros Mobile Money sont cryptés et stockés de manière sécurisée. Ils ne sont utilisés que pour procéder au virement des fonds récoltés sur vos cagnottes.

## Visual details
- **Colors:** navy `#172866`, Wave `#3374FF`, Orange `#FF6600`, green chip `bg-green-100 text-green-700`, active nav `bg-blue-50/50 text-[#172866]`, info `bg-blue-50/50 border-blue-100`
- **Typography:** h1 `text-4xl font-black`, section title `text-2xl font-black`, operator name `text-lg font-bold`
- **Spacing / radii:** cards `rounded-3xl p-8 md:p-10`, operator rows `rounded-2xl p-5 border-2`, empty state `rounded-2xl p-10 border-2 border-dashed`
- **Animations:** hover `border-gray-100` → `hover:border-[#172866] transition-colors`, trash icon `hover:text-red-500`
- **Icons:** `user`, `lock`, `credit-card`, `bell`, `log-out`, `plus`, `trash-2`, `landmark`, `info`, `camera`, `shield-check`

## Key JSX snippets

### Operator row (Mobile Money item)
```jsx
<div className="border-2 border-gray-100 rounded-2xl p-5 flex items-center justify-between hover:border-[#172866] transition-colors group">
  <div className="flex items-center gap-4">
    <div className="w-12 h-12 bg-[#3374FF] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm">W</div>
    <div>
      <div className="font-bold text-[#172866] text-lg">Wave Sénégal</div>
      <div className="text-sm text-gray-500 font-medium">+221 77 123 45 67</div>
    </div>
  </div>
  <div className="flex items-center gap-3">
    <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">Actif</span>
    <button className="text-gray-400 hover:text-red-500 transition-colors p-2">
      <Icon i="trash-2" size={18} />
    </button>
  </div>
</div>
```

### Empty state (bank accounts)
```jsx
<div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-gray-400 group-hover:text-[#172866] shadow-sm mb-4 transition-colors">
    <Icon i="landmark" size={24} />
  </div>
  <div className="font-bold text-[#172866] text-lg mb-1">Aucun compte bancaire</div>
  <p className="text-sm text-gray-500 font-medium max-w-sm mb-6">Ajoutez un RIB/IBAN pour virer l'argent...</p>
  <button className="bg-white border border-gray-300 text-[#172866] font-bold px-6 py-3 rounded-xl shadow-sm hover:border-[#172866] transition-colors flex items-center gap-2">
    <Icon i="plus" size={18} /> Ajouter un compte bancaire
  </button>
</div>
```

### Security info notice
```jsx
<div className="mt-8 bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
  <div className="text-[#172866] mt-0.5"><Icon i="info" size={20} /></div>
  <div>
    <h4 className="font-bold text-[#172866] text-sm mb-1">Sécurité de vos coordonnées</h4>
    <p className="text-xs text-gray-600 font-medium leading-relaxed">...</p>
  </div>
</div>
```

## Composition plan (Phase 3 primitives to use)
- Existing: Button, Card, Profile sidebar (if shipped in Phase 6)
- New: OperatorRow primitive (shared with `WithdrawFundsForm` radio cards — lift to primitive), EmptyStateCard primitive, InfoNoticeCard primitive

## Banani → cagnottes.sn translations needed
- No € amounts on this page (good)
- Phone already `+221`
- "délai de 48h à 72h" for bank transfers — verify with Bictorys payout SLA; may be misleading
- Bank accounts section is presented as an empty state — v1 cagnottes.sn may only support Mobile Money; either hide the bank section or leave as "coming soon" 

## Notable details / risks
- The shipped version of this page likely has different layout — this is a REWRITE target
- The profile sidebar is shared infrastructure — extract as its own component
- Trash button needs confirmation dialog (not shown in Banani)
- "Actif" chip is status; API must return whether the number is verified/usable
