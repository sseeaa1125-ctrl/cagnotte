# festive-step-2 — Banani source extract

**Banani screen title (verbatim):** `Créer une cagnotte Festive - Étape 2`
**Matched MCP index:** designs[15] (screen `main_next1_next2_next2_next1_next1_next1.jsx` + component `CreateFestiveCagnotteStep2.jsx`)
**Target route:** `/cagnottes/nouvelle/festive/etape-2`

## Layout description
Same shell as step 1 (`max-w-2xl` centered, Retour row + 3-pill indicator with pills 1+2 active). Header shows the same pink `🪩 Cagnotte Festive` badge plus H1 `Personnalisez votre cagnotte` and subtitle. Body has three fields: cover image dropzone, message textarea with char counter, end date picker. Footer right-aligned `Étape suivante →`.

## Key sections
- **Back row:** `Retour` + step indicator (pills 1+2 navy, pill 3 gray)
- **Subtype badge:** same pink `🪩 Cagnotte Festive` pill
- **Header:** H1 `Personnalisez votre cagnotte` + subtitle `Ajoutez une image et un petit mot pour donner envie de participer.`
- **Form:**
  1. **Photo de couverture *** — dropzone card (`border-2 border-dashed rounded-2xl p-8`), 64px circular icon `upload-cloud` inside pink-tinted circle (`bg-[#F4D3DE]/30`), body `Cliquez pour ajouter une photo` + `ou glissez-déposez la ici (JPG, PNG)`, help text `Une belle photo augmente considérablement les dons.` Hover state swaps the icon circle to navy-on-white.
  2. **Un petit mot pour les participants *** — textarea (`min-h-[160px] rounded-xl`) with placeholder `Expliquez en quelques mots pourquoi vous organisez cette cagnotte et à quoi servira l'argent récolté...`, right-aligned counter `0 / 2000 caractères`
  3. **Date de fin** (+ `Optionnel` pill) — date picker row with `calendar` icon, placeholder `Sélectionnez une date...`, help text `Vous pouvez toujours modifier ou clôturer la cagnotte plus tôt.`
- **Footer:** right-aligned `Étape suivante →` (navy, shadow-lg)

## Form fields
| Field | Type | Label (FR) | Placeholder | Validation hint |
|---|---|---|---|---|
| coverImage | file upload (JPG/PNG) | Photo de couverture * | — | required, max 5MB, aspect 4:3 recommended |
| message | textarea | Un petit mot pour les participants * | Expliquez en quelques mots... | required, 20–2000 chars |
| endDate | date | Date de fin | Sélectionnez une date... | optional, > today, < today+365 |

## Banani tokens used
- Colors: `#172866` navy, `#F4D3DE/30` faint pink dropzone icon bg, gray-300 dashed border, gray-400 muted text
- Font: Poppins h1, Inter body
- Radii: dropzone `rounded-2xl`, textarea/date `rounded-xl`
- Notable: `border-dashed`, `min-h-[160px]`, `focus-within:border-[#172866]`

## Composition plan (Phase 3 primitives/blocks)
- Reuse `WizardStepIndicator`, `SubtypeBadge`
- New `ImageDropzone` block — wire to existing `POST /api/upload` (R2)
- `Textarea` primitive with `maxLength={2000}` + `CharCounter`
- `DatePicker` primitive (Phase 3 — verify; if absent, use `Input type="date"` with `Calendar` icon + day-picker library)
- `Button variant="primary" trailingIcon={<ArrowRight/>}`

## Banani → cagnottes.sn translations needed
- `JPG, PNG` — add `WEBP` (backend R2 accepts all three per `routes/upload.ts`)
- Max size: Banani doesn't state; Phase 3 upload enforces 5MB — reflect in UI hint
- `2000 caractères` — confirm backend `fundraiserBlockConfigSchema` message max length (likely 2000 per Phase 2 audit)
- Date format: Banani shows a placeholder only; on render use `fr-FR` locale (`13 avril 2026`)
- No currency on this step

## Key copy (French, verbatim from Banani)
> **H1:** `Personnalisez votre cagnotte`
> **Subtitle:** `Ajoutez une image et un petit mot pour donner envie de participer.`
> **Label 1:** `Photo de couverture *`
> **Dropzone primary:** `Cliquez pour ajouter une photo`
> **Dropzone secondary:** `ou glissez-déposez la ici (JPG, PNG)`
> **Help 1:** `Une belle photo augmente considérablement les dons.`
> **Label 2:** `Un petit mot pour les participants *`
> **Placeholder 2:** `Expliquez en quelques mots pourquoi vous organisez cette cagnotte et à quoi servira l'argent récolté...`
> **Counter:** `0 / 2000 caractères`
> **Label 3:** `Date de fin` (`Optionnel`)
> **Placeholder 3:** `Sélectionnez une date...`
> **Help 3:** `Vous pouvez toujours modifier ou clôturer la cagnotte plus tôt.`
> **CTA:** `Étape suivante →`

## Notable details / risks
- Dropzone hover interaction: circle bg transitions from pink-tint to navy (`group-hover:bg-[#172866]`) — implement via `group` + `group-hover` Tailwind
- Char counter is right-aligned below the textarea
- End date picker doesn't show a real calendar in Banani (closed state only) — executor picks picker library. Consider `react-day-picker` (already lucide-compatible) — small dep
- No image preview state shown in Banani (no "uploaded" filled variant) — executor must design the post-upload state: thumbnail + `Remplacer` button + `Supprimer` action
- No aspect-ratio crop tool in Banani — accept original, render via `next/image` with `aspect-[4/3] object-cover`
