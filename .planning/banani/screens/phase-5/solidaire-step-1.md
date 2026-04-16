# solidaire-step-1 — Banani source extract

**Banani screen title (verbatim):** `Créer une cagnotte Solidaire - Étape 1`
**Matched MCP index:** designs[12] (screen `main_next1_next2_next2_next1_next2.jsx` + component `CreateSolidaireCagnotteStep1.jsx`)
**Target route:** `/cagnottes/nouvelle/solidaire/etape-1`

## Layout description
Same wizard shell as festive-step-1 (`max-w-2xl`, back row + 3-pill indicator with pill 1 active). Cream subtype badge `❤️ Cagnotte Solidaire` on `bg-[#FEF4E3]` with subtle border. Header `Commençons par les bases` + `Donnez un nom à votre projet solidaire et précisez la cause.`. **Four fields** (one more than festive step 1): title, cause, beneficiary (3-option card group), target amount. Footer right-aligned `Étape suivante →`.

## Key sections
- **Back + step indicator** (pill 1 navy)
- **Subtype badge:** cream `bg-[#FEF4E3] border-[#f5ead5]` pill, `❤️ Cagnotte Solidaire`
- **Header:** H1 `Commençons par les bases`, subtitle `Donnez un nom à votre projet solidaire et précisez la cause.`
- **Form:**
  1. `Nom de la cagnotte *` — text input with `edit-2` icon, placeholder `Ex: Soutien pour le jardin partagé`, help `Un titre clair donne plus envie de participer.`
  2. `Cause soutenue *` — dropdown + chip shortcuts (5 chips, cream hover `hover:bg-[#FEF4E3]`): `Santé & Médical`, `Éducation`, `Projet solidaire`, `Urgence`, `Animaux`
  3. `Pour qui collectez-vous ? *` — **3-card grid** (`grid-cols-1 md:grid-cols-3 gap-3`) of clickable cards with icon + label:
     - `Moi-même` (user icon)
     - `Un proche` (users icon) **[selected in Banani — `border-2 border-[#172866] bg-[#f8f9fc]` with check badge top-right]**
     - `Une association` (heart icon)
  4. `Montant à atteindre` (+ `Optionnel` pill) — numeric input with `€` suffix
- **Footer:** `Étape suivante →`

## Form fields
| Field | Type | Label (FR) | Placeholder | Validation |
|---|---|---|---|---|
| title | text | Nom de la cagnotte * | Ex: Soutien pour le jardin partagé | required, 3–80 chars |
| cause | select | Cause soutenue * | Sélectionnez une cause... | required, enum |
| beneficiary | radio cards | Pour qui collectez-vous ? * | — | required, enum `self|loved_one|association` |
| targetAmount | number (FCFA) | Montant à atteindre | 0 | optional, integer ≥ 0 |

**Cause enum:** `sante_medical`, `education`, `projet_solidaire`, `urgence`, `animaux` (+ `autre` fallback)
**Beneficiary enum:** `self` (Moi-même), `loved_one` (Un proche), `association` (Une association)

## Banani tokens used
- Colors: `#172866` navy, `#FEF4E3` cream solidaire accent, `#f5ead5` cream border, `#f8f9fc` selected-card tint, gray-100/200/300
- Font: Poppins h1, Inter body
- Radii: inputs `rounded-xl`, chips `rounded-full`, beneficiary cards `rounded-xl`, progress pills `rounded-full`
- Notable: `grid grid-cols-1 md:grid-cols-3 gap-3` for beneficiary cards, selected card has `absolute top-2 right-2 w-4 h-4 bg-[#172866] rounded-full` check badge

## Composition plan (Phase 3 primitives/blocks)
- Reuse `WizardStepIndicator current={1}`, `SubtypeBadge variant="solidaire"`
- `Input leftIcon={<Edit2/>}` for title
- `Select` + `ChipButton` group for cause
- New `OptionCardGroup` block (or reuse `RadioCard` from step 3) rendering 3 horizontally-stacked icon cards
- `NumberInput suffix="FCFA"` for targetAmount
- `Button variant="primary" trailingIcon={<ArrowRight/>}`

## Banani → cagnottes.sn translations needed
- `€` → `FCFA` (same as festive)
- `Santé & Médical` — confirm Senegalese context (healthcare for family is a very common cause)
- **Association beneficiary**: backend needs a `beneficiaryType` field on FUNDRAISER config. If set to `association`, we may want a follow-up field "Nom de l'association" (not present in Banani — flag to Phase 5 plan as future delta). For v1, keep as free-text enum only.
- `Un proche` pre-selected in Banani — that's probably just the mock state; make `null` the actual default and require user selection
- Target amount optional — same as festive

## Key copy (French, verbatim from Banani)
> **Subtype badge:** `❤️ Cagnotte Solidaire`
> **H1:** `Commençons par les bases`
> **Subtitle:** `Donnez un nom à votre projet solidaire et précisez la cause.`
> **Label 1:** `Nom de la cagnotte *`
> **Placeholder 1:** `Ex: Soutien pour le jardin partagé`
> **Help 1:** `Un titre clair donne plus envie de participer.`
> **Label 2:** `Cause soutenue *`
> **Placeholder 2:** `Sélectionnez une cause...`
> **Chips:** `Santé & Médical`, `Éducation`, `Projet solidaire`, `Urgence`, `Animaux`
> **Label 3:** `Pour qui collectez-vous ? *`
> **Option cards:** `Moi-même`, `Un proche`, `Une association`
> **Label 4:** `Montant à atteindre` (`Optionnel`)
> **Help 4:** `Laissez vide si vous n'avez pas d'objectif précis.`
> **CTA:** `Étape suivante →`

## Notable details / risks
- Solidaire has **one extra field** (beneficiary) vs festive — the wizard state shape must differ between the two subtypes; plan for separate Zod schemas `festiveConfig` vs `solidaireConfig`
- Beneficiary cards are 3-up on desktop, 1-column on mobile — make sure the selected-state check badge (top-right corner) renders on mobile too
- The `Un proche` card is pre-marked selected in the Banani mock — executor should treat as unselected initially
- Cause chips use **cream hover** (not pink) to match subtype palette — keep consistent
- `beneficiary = association` might later require KYC of the association — flag for v2, not v1
- Solidaire commission is **6%** (vs 8% festive) — subtype is set at picker step and propagated through the wizard; ensure submission includes `subtype: "solidaire"`
