# visibility-card — Banani wireframe extract

**Banani component:** `CreateFestiveCagnotteStep3.jsx` (6 319 chars) — VisibilityCard is embedded here, ALSO present in `CreateSolidaireCagnotteStep3.jsx` (6 429 chars) — IDENTICAL markup
**Target route / primitive:** `<VisibilityCard />` primitive (lift-to-primitive for reuse in create wizards + edit)
**Phase 7 plan:** 07-03

## Layout description
A pair of radio-card labels stacked vertically. Each card: `border-2` shell, flex row with a radio circle on the left and content on the right. Content = icon + label line, then a helper paragraph underneath. Selected state = navy border + `bg-[#f8f9fc]` (very light blue) + filled radio dot. Unselected = gray-200 border + white bg + empty circle + hover flip to navy border.

**Note:** In the Banani screenshot, the SELECTED card is "Privée" and the UNSELECTED card is "Publique" — but the PRIMITIVE must support either as the default.

## Key sections
- **Section label:** "Visibilité de la cagnotte" (`text-base font-bold text-[#172866]`)
- **Radio card 1 — Privée (selected state shown):**
  - Lock icon + "Privée"
  - Helper: long French paragraph
- **Radio card 2 — Publique (unselected state shown):**
  - Globe icon + "Publique"
  - Helper: long French paragraph

## Key copy (verbatim French — EXACT wording for both options)

> Visibilité de la cagnotte

### Privée card
> Privée
> Seules les personnes disposant du lien pourront voir la cagnotte et y participer. Elle n'apparaîtra pas dans les recherches. Idéal pour les événements personnels.

### Publique card
> Publique
> Votre cagnotte sera visible par tous et apparaîtra dans les résultats de recherche de Cagnotte.sn.

## Visual details
- **Colors:** navy `#172866`, selected bg `#f8f9fc` (near-white blue), idle border `border-gray-200`, idle bg `bg-white`, hover border flip to `#172866`, helper `text-gray-500`
- **Typography:** label line `font-bold text-[#172866] text-lg`, helper `text-sm font-medium text-gray-500`, section label `text-base font-bold`
- **Spacing / radii:** outer `rounded-xl p-5`, gap `gap-4`, section `space-y-4`
- **Radio:**
  - Outer circle `w-5 h-5 rounded-full border-2`
  - Inner dot (selected) `w-2.5 h-2.5 bg-[#172866] rounded-full`
  - Selected border: `border-[#172866]`, idle border: `border-gray-300`
- **Animations:** `transition-colors` on hover
- **Icons:** `lock` (Privée), `globe` (Publique), both size={18}

## Key JSX snippets

### Selected (Privée) card
```jsx
<label className="border-2 border-[#172866] bg-[#f8f9fc] rounded-xl p-5 flex gap-4 cursor-pointer relative transition-colors">
  <div className="mt-1">
    <div className="w-5 h-5 rounded-full border-2 border-[#172866] flex items-center justify-center">
      <div className="w-2.5 h-2.5 bg-[#172866] rounded-full"></div>
    </div>
  </div>
  <div>
    <div className="font-bold text-[#172866] text-lg flex items-center gap-2 mb-1">
      <Icon i="lock" size={18} />
      Privée
    </div>
    <p className="text-sm text-gray-500 font-medium">
      Seules les personnes disposant du lien pourront voir la cagnotte et y participer. Elle n'apparaîtra pas dans les recherches. Idéal pour les événements personnels.
    </p>
  </div>
</label>
```

### Unselected (Publique) card
```jsx
<label className="border-2 border-gray-200 bg-white rounded-xl p-5 flex gap-4 cursor-pointer hover:border-[#172866] transition-colors">
  <div className="mt-1">
    <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center"></div>
  </div>
  <div>
    <div className="font-bold text-[#172866] text-lg flex items-center gap-2 mb-1">
      <Icon i="globe" size={18} />
      Publique
    </div>
    <p className="text-sm text-gray-500 font-medium">
      Votre cagnotte sera visible par tous et apparaîtra dans les résultats de recherche de Cagnotte.sn.
    </p>
  </div>
</label>
```

### Section wrapper
```jsx
<div>
  <label className="block text-base font-bold text-[#172866] mb-4">
    Visibilité de la cagnotte
  </label>
  <div className="space-y-4">
    {/* VisibilityCard "private" */}
    {/* VisibilityCard "public" */}
  </div>
</div>
```

## Composition plan (Phase 3 primitives to use)
- New: **`<RadioCard />`** generic primitive — takes `icon`, `label`, `helper`, `checked`, `onChange`. Reusable for any radio-card UI (not just visibility).
- New: **`<VisibilityPicker />`** convenience wrapper that wires the two specific `RadioCard` instances with the verbatim French copy from this file.
- Usage sites: `CreateFestiveCagnotteStep3`, `CreateSolidaireCagnotteStep3`, creator detail page sidebar (for toggling after publish)

## Banani → cagnottes.sn translations needed
- Copy already French — NO changes
- Icons: use lucide `Lock` and `Globe` components (already available in the project)
- The hidden `<input type="radio">` must be paired with the `<label>` wrapper (Banani's markup uses `<label>` as the tappable region, which is the right pattern — add the actual `<input type="radio" className="sr-only">` inside for accessibility)

## Notable details / risks
- Banani uses `label` as the root of each card — this is intentional (entire card is the click target). Keep this pattern and hide the real input with `sr-only`.
- The `mt-1` on the radio outer div is because the radio should align with the FIRST LINE of text, not vertical-center the whole card. Preserve.
- Selected background `bg-[#f8f9fc]` is subtle — can be rewritten as `bg-blue-50/30` or a custom Tailwind token, but the exact hex `#f8f9fc` is what Banani shipped.
- `RadioCard` primitive should also support a "disabled" state (grayed out) for edit mode when visibility can't be changed post-publish — confirm the business rule with backend.
- Keyboard: arrow keys should move between radio cards within the same group (group role via `role="radiogroup"` on the wrapper).
