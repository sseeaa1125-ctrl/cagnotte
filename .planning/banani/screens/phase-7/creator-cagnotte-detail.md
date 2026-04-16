# creator-cagnotte-detail — Banani wireframe extract

**Banani component:** `DashboardCagnotteDetail.jsx` (11 253 chars)
**Target route / primitive:** `/tableau-de-bord/cagnottes/[slug]`
**Phase 7 plan:** 07-01

## Layout description
Single-screen creator dashboard for one cagnotte. Gray-50 page background, centered `max-w-5xl`. Header row with thumbnail + title + status chip + two action buttons (Gérer / Partager). Main grid is 2/3 main column + 1/3 sidebar on `lg:`. Main column: 2-up KPI cards, then a bordered Withdraw Action Box, then a Recent Participations card. Sidebar stacks Quick Share link, Visibility toggles, and a Zone de danger card.

## Key sections
- **Header:** back link, thumbnail (20x20 rounded-2xl), status pill ("En ligne"), `h1` title, subtitle "Cagnotte Festive • Créée le …", Gérer button (outline), Partager button (navy solid)
- **KPI Grid (sm:2 cols):**
  - Card 1: "Montant récolté" + wallet icon + big number + progress bar + "Objectif : X (Y%)"
  - Card 2: "Participations" + users icon + count + blue chip "Dernière le … (il y a 2h)"
- **Withdraw Action Box:** navy-bordered card with pink corner decoration. Fonds disponibles label, big amount, paragraph, navy CTA "Retirer les fonds" (arrow-down-circle icon)
- **Recent Participations:** header row with "Voir toutes (N)" link, list of participation cards (pink avatar with initial, name, amount, date, optional message bubble)
- **Sidebar — Lien de la cagnotte:** link display + copy button + WhatsApp/Code QR buttons
- **Sidebar — Visibilité:** two toggle rows (Publique, Montant caché)
- **Sidebar — Zone de danger:** red-50 card with warning icon, description, outline-red button

## Key copy (verbatim French)
> Retour à mes cagnottes
> En ligne
> Les 30 ans de Thomas
> Cagnotte Festive • Créée le 12 Oct 2023
> Gérer
> Partager
> Montant récolté
> Objectif : 500 € (90%)
> Participations
> Dernière le 14 Oct (il y a 2h)
> Fonds disponibles
> Transférez ce montant vers votre compte bancaire ou Mobile Money. Cette action ne clôture pas votre cagnotte.
> Retirer les fonds
> Participations récentes
> Voir toutes (15)
> Lien de la cagnotte
> Visibilité
> Cagnotte Publique
> Visible dans les résultats de recherche
> Montant caché
> Les participants ne voient pas le total
> Zone de danger
> Clôturer la cagnotte empêchera de nouvelles participations. Cette action est réversible.
> Clôturer la cagnotte

(Message quotes shown for donor rows: "Joyeux anniversaire frérot !! Profite bien de ta journée.", "Pour le cadeau surprise, hâte d'y être ! Bisous.", "Bon anniv !!" — for layout only, do not ship.)

## Visual details
- **Colors:** navy `#172866`, navy hover `#0f1a45`, pink `#FBE6ED` + pink avatar `#F4D3DE`, green chip `text-green-700 bg-green-100`, green dot `bg-green-500`, red zone `text-red-800 text-red-600/80 border-red-100 bg-red-50/50`, blue chip `bg-blue-50 text-[#172866]`
- **Typography:** `font-black` for titles/amounts, `text-3xl`/`text-4xl`, `font-bold` for labels, `text-xs` for sub-labels
- **Spacing / radii:** `rounded-2xl` (chips/thumbnails), `rounded-3xl` (cards), `p-6`/`p-8`, `gap-8`, `shadow-sm`
- **Animations:** `transition-colors` on hover states, hover border flip gray-200 → `#172866`
- **Icons (lucide):** `arrow-left`, `settings`, `share-2`, `wallet`, `users`, `arrow-down-circle`, `link`, `copy`, `message-circle`, `qr-code`, `eye`, `alert-triangle`

## Key JSX snippets

### Withdraw Action Box (critical)
```jsx
<div className="bg-white rounded-3xl p-8 shadow-sm border-2 border-[#172866] relative overflow-hidden">
  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FBE6ED] rounded-bl-full opacity-30 pointer-events-none"></div>
  <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
    <div>
      <div className="text-sm font-bold text-gray-500 mb-1 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500"></span> Fonds disponibles
      </div>
      <h3 className="text-3xl md:text-4xl font-black text-[#172866] mb-3">450,00 €</h3>
      <p className="text-gray-600 text-sm font-medium leading-relaxed max-w-md">
        Transférez ce montant vers votre compte bancaire ou Mobile Money. Cette action ne clôture pas votre cagnotte.
      </p>
    </div>
    <button className="w-full sm:w-auto bg-[#172866] text-white font-black px-8 py-4 rounded-xl shadow-lg hover:bg-[#0f1a45] transition-colors shrink-0 flex items-center justify-center gap-2">
      <Icon i="arrow-down-circle" size={20} /> Retirer les fonds
    </button>
  </div>
</div>
```

### Participation row
```jsx
<div className="flex gap-4 p-4 border border-gray-100 rounded-2xl bg-gray-50/50">
  <div className="w-12 h-12 rounded-full bg-[#F4D3DE] text-[#172866] font-black text-lg flex items-center justify-center shrink-0">{initial}</div>
  <div className="flex-1">
    <div className="flex justify-between items-start mb-1">
      <div className="font-bold text-[#172866]">{name}</div>
      <div className="font-black text-[#172866]">{amount}</div>
    </div>
    <div className="text-xs text-gray-400 font-medium mb-2">{date}</div>
    {msg && <div className="text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100 italic">"{msg}"</div>}
  </div>
</div>
```

## Composition plan (Phase 3 primitives to use)
- Existing: Button (primary, outline, danger-outline), Card, Progress bar (from fundraiser block)
- New: StatCard primitive, ToggleRow primitive, DangerZoneCard primitive (all lift-to-primitive targets for 07-01)

## Banani → cagnottes.sn translations needed
- `450 €` / `450,00 €` → `450 000 FCFA` (FCFA integers, space thousands separator via `formatPrice`)
- `Objectif : 500 €` → `Objectif : 500 000 FCFA`
- No `+33` phone strings here
- Donor initials: the "Anonyme" row in Banani uses "?" — keep this mapping (anonymous → "?" avatar)

## Notable details / risks
- Anonymous donor masking (handled server-side by `maskDonation()`) — frontend just renders what API returns
- "Voir toutes (15)" link target will be a separate route or tab — confirm in 07-01 plan
- The visibility toggles in sidebar duplicate settings from create wizard Step 3 — a "mutation" endpoint is needed server-side; verify route exists
- Banani does NOT show the "thank you message" field — that feature is NEW for cagnottes.sn (see `participation-success.md`)
