# solidaire-step-2 — Banani source extract

**Banani screen title (verbatim):** `Créer une cagnotte Solidaire - Étape 2`
**Matched MCP index:** designs[13] (screen `main_next1_next2_next2_next1_next2_next1.jsx` + component `CreateSolidaireCagnotteStep2.jsx`)
**Target route:** `/cagnottes/nouvelle/solidaire/etape-2`

## Layout description
Identical wizard shell to festive-step-2 with cream solidaire badge. Step indicator: pills 1+2 navy, pill 3 gray. Header `Personnalisez votre projet` + `Ajoutez une image et expliquez pourquoi vous collectez des fonds.`. Same three fields (cover image dropzone, description textarea, optional end date) with slight copy variations. Dropzone icon circle uses `bg-blue-50` (not pink like festive).

## Key sections
- **Back + step indicator** (pills 1+2 navy)
- **Subtype badge:** cream `❤️ Cagnotte Solidaire`
- **Header:** H1 `Personnalisez votre projet`, subtitle `Ajoutez une image et expliquez pourquoi vous collectez des fonds.`
- **Form:**
  1. **Photo de couverture *** — same dropzone pattern, but icon circle bg is `bg-blue-50` (navy-on-blue). Copy: `Cliquez pour ajouter une photo` + `ou glissez-déposez la ici (JPG, PNG)`. Help: `Une belle photo augmente considérablement les dons.`
  2. **Description du projet *** — textarea `min-h-[160px]`, placeholder `Expliquez l'histoire de votre projet, à quoi serviront les fonds et pourquoi chaque don compte...`, counter `0 / 2000 caractères`
  3. **Date de fin** (+ `Optionnel`) — date picker with `calendar` icon, placeholder `Sélectionnez une date...`, help `Laissez vide si votre collecte est à durée indéterminée.`
- **Footer CTA:** `Étape suivante →`

## Form fields
| Field | Type | Label (FR) | Placeholder | Validation |
|---|---|---|---|---|
| coverImage | file upload (JPG/PNG) | Photo de couverture * | — | required, max 5MB |
| description | textarea | Description du projet * | Expliquez l'histoire de votre projet... | required, 20–2000 chars |
| endDate | date | Date de fin | Sélectionnez une date... | optional |

## Banani tokens used
- Colors: `#172866` navy, `#FEF4E3` cream (badge only), `bg-blue-50` dropzone icon tint, gray-300 dashed border
- Font: same (Poppins h1, Inter body)
- Radii: `rounded-2xl` dropzone, `rounded-xl` textarea/date
- Notable: `group-hover:bg-[#172866] group-hover:text-white` dropzone icon swap

## Composition plan (Phase 3 primitives/blocks)
- Reuse `WizardStepIndicator current={2}`, `SubtypeBadge variant="solidaire"`
- Reuse `ImageDropzone` from festive-step-2 — pass `tint="blue"` prop OR default to blue (since solidaire uses blue tint, festive uses pink)
- Reuse `Textarea` + `CharCounter`
- Reuse `DatePicker`
- Reuse `Button variant="primary" trailingIcon={<ArrowRight/>}`

## Banani → cagnottes.sn translations needed
- No currency on this step
- Same upload constraints as festive (JPG/PNG + add WEBP, max 5MB)
- Copy differences from festive: label says `Description du projet` (vs festive's `Un petit mot pour les participants`), placeholder emphasises "histoire", "pourquoi chaque don compte"
- End-date help differs: `Laissez vide si votre collecte est à durée indéterminée.` (solidaire allows no-end-date more naturally than festive)
- Dropzone icon tint differs (`bg-blue-50` solidaire vs `bg-[#F4D3DE]/30` festive) — minor, worth preserving for brand differentiation

## Key copy (French, verbatim from Banani)
> **H1:** `Personnalisez votre projet`
> **Subtitle:** `Ajoutez une image et expliquez pourquoi vous collectez des fonds.`
> **Label 1:** `Photo de couverture *`
> **Dropzone primary:** `Cliquez pour ajouter une photo`
> **Dropzone secondary:** `ou glissez-déposez la ici (JPG, PNG)`
> **Help 1:** `Une belle photo augmente considérablement les dons.`
> **Label 2:** `Description du projet *`
> **Placeholder 2:** `Expliquez l'histoire de votre projet, à quoi serviront les fonds et pourquoi chaque don compte...`
> **Counter:** `0 / 2000 caractères`
> **Label 3:** `Date de fin` (`Optionnel`)
> **Placeholder 3:** `Sélectionnez une date...`
> **Help 3:** `Laissez vide si votre collecte est à durée indéterminée.`
> **CTA:** `Étape suivante →`

## Notable details / risks
- Component is functionally identical to festive-step-2 — DRY opportunity: build a `WizardStepMedia` shared component that accepts `subtype` prop and renders the correct copy variants
- The description field name differs between the two subtypes (`message` for festive, `description` for solidaire) — reflect in backend config schema OR normalise to `description` in DB with optional friendly label in UI
- No reward tiers / "what donors get" section in Banani — v1 is donation-only, not perks-based
