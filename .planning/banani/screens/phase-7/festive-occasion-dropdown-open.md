# festive-occasion-dropdown-open — Banani wireframe extract

**Banani component:** `CreateFestiveCagnotteStep1OccasionOpen.jsx` (6 801 chars)
**Target route / primitive:** **Combobox primitive** (state reference, not a route)
**Phase 7 plan:** 07-03

## Layout description
Step 1 of the festive wizard with the Occasion dropdown in its OPEN state. The trigger is a `border-2 border-[#172866] ring-4 ring-blue-50 rounded-xl` field; an `absolute top-full` dropdown menu drops below it with 6 options, each a full-width button with an emoji on the left and a hover-revealed check icon on the right. The rest of the form is at `opacity-50` to focus attention.

## Key sections
- **Trigger (focused, open state):**
  - Navy border + blue-50 glow ring
  - Placeholder "Sélectionnez une occasion..." (gray-400)
  - Chevron rotated to `chevron-up`
- **Dropdown menu:**
  - Positioned `absolute top-full left-0 w-full mt-2 z-50`
  - `bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden py-2`
  - Each option: full-width button, `px-5 py-3.5 hover:bg-gray-50`, `font-bold text-[#172866]`, emoji inline at start, check icon right-aligned with `opacity-0 group-hover:opacity-100`
  - A horizontal divider `h-px bg-gray-100 my-1 mx-4` before the "Autre occasion" fallback row
- **Quick chips (disabled/hidden):** `opacity-30 pointer-events-none` row of pill buttons

## Key copy (verbatim French)
> Sélectionnez une occasion...
> 🎂 Anniversaire
> 👋 Pot de départ
> 🎁 Cadeau commun
> 💍 Mariage / PACS
> 👶 Naissance / Baptême
> Autre occasion

(Also from this step but not dropdown-specific: "Commençons par les bases", "Donnez un nom à votre cagnotte et précisez l'occasion.", "Nom de la cagnotte", "Ex: Pour les 30 ans de Thomas", "Occasion", "Montant à atteindre", "Optionnel", "Étape suivante")

## Visual details
- **Colors:** navy `#172866`, focus ring `ring-blue-50`, hover bg `bg-gray-50`, divider `bg-gray-100`, last option label `text-gray-500`
- **Typography:** `font-bold text-[#172866]`, option rows `text-left`
- **Spacing / radii:** trigger `rounded-xl px-4 py-3.5`, dropdown `rounded-2xl py-2`, option `px-5 py-3.5`, gap between trigger and dropdown `mt-2`
- **Animations:** `group-hover:opacity-100` reveal on check icon, `transition-colors` on row hover
- **Shadow:** dropdown `shadow-xl`
- **Icons:** `chevron-up` (open state), `chevron-down` (closed), `check` (hover indicator)

## Key JSX snippets

### Trigger (open state)
```jsx
<div className="border-2 border-[#172866] ring-4 ring-blue-50 rounded-xl px-4 py-3.5 bg-white flex items-center justify-between shadow-sm cursor-pointer transition-all relative z-10">
  <span className="text-gray-400">Sélectionnez une occasion...</span>
  <Icon i="chevron-up" size={20} className="text-[#172866]" />
</div>
```

### Dropdown option row (critical — group-hover check pattern)
```jsx
<button className="w-full text-left px-5 py-3.5 hover:bg-gray-50 text-[#172866] font-bold flex items-center justify-between group transition-colors">
  <span>🎂 Anniversaire</span>
  <span className="opacity-0 group-hover:opacity-100 text-[#172866]"><Icon i="check" size={18} /></span>
</button>
```

### Dropdown container
```jsx
<div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden py-2">
  {/* options */}
  <div className="h-px bg-gray-100 my-1 mx-4"></div>
  {/* "Autre occasion" fallback */}
</div>
```

## Composition plan (Phase 3 primitives to use)
- Existing: Field label pattern (already shipped), Select (basic HTML) — BUT this Banani combobox is custom, not a native select
- New: **Combobox primitive** (requires keyboard nav + arrow keys + Escape + focus trap)
- Must support: emoji/icon prefix per option, check indicator on hover + selected state, dividers for "other" fallback

## Banani → cagnottes.sn translations needed
- All copy is already in French — OK
- Occasions enum must match backend `Block.config.subtype` or occasion field — verify in Phase 2 plan
- Emojis are content, not icons — keep them as string prefix in the option label

## Notable details / risks
- The group-hover check pattern means the selected check should ALSO show (not just hover) — our primitive must add a `selected` variant that forces `opacity-100`
- Banani shows the trigger with placeholder text even when dropdown is open; after selection we should display the selected label (with emoji) not placeholder
- Must handle click-outside to close, Escape to close, arrow keys to navigate
- Z-index 50 collides with `DashboardNavbar` sticky — verify stacking order
- The disabled chip row at `opacity-30 pointer-events-none` is a DEMO artifact — don't ship it
