# solidaire-step-2-date-field — Banani wireframe extract

**Banani component:** `CreateSolidaireCagnotteStep2.jsx` (4 706 chars) — date field portion only
**Target route / primitive:** **Calendar popover primitive** (trigger visual reference; popover is NEW, our design)
**Phase 7 plan:** 07-03

## Layout description
The date field is a button-style shell (not a native `<input type="date">`). Gray-300 border, hover flips to navy. Left side shows placeholder text in gray-400, right side shows a calendar icon. The popover calendar itself does NOT exist in Banani — we design it ourselves in Banani style (same `rounded-xl`, navy focus, gray-100 hover).

## Key sections
- **Label row:** `Date de fin` + `Optionnel` gray chip
- **Trigger button:** gray-300 bordered div, flex-between, placeholder text + calendar icon
- **Helper text:** "Laissez vide si votre collecte est à durée indéterminée."

## Key copy (verbatim French)
> Date de fin
> Optionnel
> Sélectionnez une date...
> Laissez vide si votre collecte est à durée indéterminée.

## Visual details
- **Colors:** idle border `border-gray-300`, hover border `#172866`, placeholder `text-gray-400`, icon `text-gray-400`, label `text-[#172866]`, "Optionnel" chip `bg-gray-100 text-gray-400`
- **Typography:** label `text-sm font-bold`, helper `text-xs font-medium text-gray-500`
- **Spacing / radii:** trigger `rounded-xl px-4 py-3.5 shadow-sm`, label margin `mb-2`, helper margin `mt-2`
- **Animations:** `hover:border-[#172866] transition-colors`
- **Icons:** `calendar` (lucide)

## Key JSX snippets

### Trigger visual (critical — must be pixel-matched by Calendar primitive)
```jsx
<div>
  <div className="flex justify-between mb-2">
    <label className="block text-sm font-bold text-[#172866]">
      Date de fin
    </label>
    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Optionnel</span>
  </div>
  <div className="border border-gray-300 rounded-xl px-4 py-3.5 bg-white text-gray-400 flex justify-between items-center cursor-pointer hover:border-[#172866] transition-colors shadow-sm">
    <span>Sélectionnez une date...</span>
    <Icon i="calendar" size={20} className="text-gray-400" />
  </div>
  <p className="text-xs text-gray-500 mt-2 font-medium">Laissez vide si votre collecte est à durée indéterminée.</p>
</div>
```

## Composition plan (Phase 3 primitives to use)
- Existing: Field label + helper (already shipped primitives)
- New: **Calendar popover primitive** — trigger must match the above markup pixel-for-pixel (swap the `<div>` to a `<button type="button">` with the same classes). Popover opens below, anchored to trigger width. Calendar grid uses navy selected state, gray-100 hover, same `rounded-xl` shells.
- Recommended library base: either hand-rolled (6 rows × 7 cells + month header) or `react-day-picker` heavily re-styled to match Banani

## Banani → cagnottes.sn translations needed
- All copy already French — OK
- Date format: show as `DD / MM / YYYY` once selected (French convention)
- Locale: `fr-FR` with Monday as first day of week

## Notable details / risks
- Banani provides ONLY the closed trigger — no open popover reference. We design it ourselves using these rules:
  1. Same rounded radius as the trigger (`rounded-xl` for popover outer, or `rounded-2xl` matching dropdown menu in `festive-occasion-dropdown-open.md`)
  2. Selected date cell: `bg-[#172866] text-white font-black`
  3. Hover cell: `bg-gray-50`
  4. Today cell: `border border-[#172866]`
  5. Disabled (past dates if endDate): `text-gray-300 cursor-not-allowed`
  6. Month nav: left/right chevrons in `text-[#172866]`
- Must handle click-outside, Escape close, keyboard arrow navigation
- When set, display the chosen date and swap trigger text color from `text-gray-400` to `text-[#172866] font-bold`
- "Clear" affordance needed since field is optional — show a small `x` icon when a date is set
