# festive-step-3 — Banani source extract

**Banani screen title (verbatim):** `Créer une cagnotte Festive - Étape 3`
**Matched MCP index:** designs[16] (screen `main_next1_next2_next2_next1_next1_next1_next1.jsx` + component `CreateFestiveCagnotteStep3.jsx`)
**Target route:** `/cagnottes/nouvelle/festive/etape-3`

## Layout description
Same `max-w-2xl` shell with back row + all three step pills navy (step 3 final). Pink `🪩 Cagnotte Festive` badge, H1 `Paramètres et visibilité`, subtitle `Dernière étape ! Configurez les options de votre cagnotte.`. Body groups three blocks separated by `border-t`: (1) visibility radio cards, (2) two display-option toggles, (3) TOS checkbox. Footer has a single wide primary CTA `Publier ma cagnotte` (not "Étape suivante") with check icon.

## Key sections
- **Back row + step indicator:** all 3 pills navy
- **Subtype badge + header**
- **Visibility (radio cards, 2 options):**
  - **Privée** (DEFAULT SELECTED on festive step 3) — `border-2 border-[#172866] bg-[#f8f9fc]`, `lock` icon, title `Privée`, body: `Seules les personnes disposant du lien pourront voir la cagnotte et y participer. Elle n'apparaîtra pas dans les recherches. Idéal pour les événements personnels.`
  - **Publique** — `border-2 border-gray-200 bg-white` (unselected), `globe` icon, title `Publique`, body: `Votre cagnotte sera visible par tous et apparaîtra dans les résultats de recherche de Cagnotte.sn.`
- **Options d'affichage** (section with top border), **two toggles**:
  - `Cacher le montant récolté` — `Les visiteurs ne verront pas la somme totale collectée` (toggle OFF by default)
  - `Cacher les noms des participants` — `Seul vous, l'organisateur, pourrez voir qui a donné` (toggle OFF by default)
- **TOS checkbox:** `J'accepte les Conditions Générales d'Utilisation.` + red asterisk
- **Footer CTA:** wide navy `Publier ma cagnotte` with `check` icon (`px-10 py-4 text-lg`)

## Form fields
| Field | Type | Label (FR) | Default | Validation |
|---|---|---|---|---|
| visibility | radio | Visibilité de la cagnotte | `"private"` | required, enum `private|public` |
| hideAmount | toggle | Cacher le montant récolté | false | — |
| hideDonorNames | toggle | Cacher les noms des participants | false | — |
| acceptedTos | checkbox | J'accepte les CGU | false | **required** (must be true) |

## Banani tokens used
- Colors: `#172866` navy, `#f8f9fc` selected-radio bg tint, gray-50/100/200/300 toggles and dividers, `text-red-500` TOS required marker
- Font: Poppins (`text-3xl md:text-4xl font-black` h1, `text-lg font-bold` option titles), Inter body
- Radii: radio cards `rounded-xl`, toggles `rounded-full`, CTA `rounded-xl`
- Notable classes: `border-2 border-[#172866]` for selected radio, `w-12 h-6 bg-gray-200 rounded-full relative` for toggle track, `space-y-8`, `pt-6 border-t border-gray-100` section separators

## Composition plan (Phase 3 primitives/blocks)
- Reuse `WizardStepIndicator current={3}`, `SubtypeBadge variant="festive"`
- `RadioCard` block (new or reuse) — large clickable card with icon + title + body
- `Toggle` / `Switch` primitive (Phase 3 — verify; if absent, new)
- `Checkbox` primitive (Phase 3)
- `Button variant="primary" size="lg" trailingIcon={<Check/>}` for submit

## Banani → cagnottes.sn translations needed
- No currency shown
- CGU link URL: `/cgu` or `/conditions-generales` (route TBD — `{TODO:tos-route}`)
- Festive **defaults to Private** — backend `fundraiserBlockConfigSchema` visibility field must accept `"private" | "public"`, default `"private"` for festive. (Solidaire defaults to Public — see solidaire-step-3.md)
- Submit → `POST /api/blocks` with `type: "FUNDRAISER"` and `config: { title, occasion, goalAmount, coverImage, message, endDate, visibility, hideAmount, hideDonorNames, subtype: "festive" }`

## Key copy (French, verbatim from Banani)
> **H1:** `Paramètres et visibilité`
> **Subtitle:** `Dernière étape ! Configurez les options de votre cagnotte.`
> **Visibility label:** `Visibilité de la cagnotte`
> **Option title 1:** `Privée`
> **Option body 1:** `Seules les personnes disposant du lien pourront voir la cagnotte et y participer. Elle n'apparaîtra pas dans les recherches. Idéal pour les événements personnels.`
> **Option title 2:** `Publique`
> **Option body 2:** `Votre cagnotte sera visible par tous et apparaîtra dans les résultats de recherche de Cagnotte.sn.`
> **Options label:** `Options d'affichage`
> **Toggle 1 title:** `Cacher le montant récolté`
> **Toggle 1 body:** `Les visiteurs ne verront pas la somme totale collectée`
> **Toggle 2 title:** `Cacher les noms des participants`
> **Toggle 2 body:** `Seul vous, l'organisateur, pourrez voir qui a donné`
> **TOS:** `J'accepte les Conditions Générales d'Utilisation. *`
> **CTA:** `Publier ma cagnotte ✓`

## Notable details / risks
- **Festive default visibility = Privée** (opposite of solidaire). Enforce in initial form state.
- Toggles in Banani are off/empty-state only — implement ON state (knob slides to right, track turns `bg-[#172866]`)
- Radio cards support only 2 options (not a dropdown) — strict binary private/public
- Submit button text changes from "Étape suivante" (steps 1–2) to "Publier ma cagnotte" (step 3) — important signal of commit action
- No "Aperçu avant publication" preview — after submit, user lands on `create-success` directly
- No draft auto-save indicator, but the wizard should retain state if user navigates back (keep in component state or localStorage)
- Backend: `Block.config.visibility` already enforced at SQL level (`routes/cagnottes.ts` visibility filter) — respect the `private` setting (no list, detail `Cache-Control: no-store`)
- `hideAmount` and `hideDonorNames` must translate to backend config flags — verify `fundraiserBlockConfigSchema` supports them or extend
