# festive-step-1 — Banani source extract

**Banani screen title (verbatim):** `Créer une cagnotte Festive - Étape 1`
**Matched MCP index:** designs[11] (screen `main_next1_next2_next2_next1_next1.jsx` + component `CreateFestiveCagnotteStep1.jsx`)
**Target route:** `/cagnottes/nouvelle/festive/etape-1`

## Layout description
Single-column centered form, `max-w-2xl`, on white bg. Top row: `Retour` link (left) + 3-pill step indicator (right). Header block shows a pink pill badge `🪩 Cagnotte Festive`, bold H1 `Commençons par les bases`, and a muted subtitle. Form body uses `space-y-8` with three fields: title input, occasion dropdown + chip shortcuts, optional target amount. Footer row has a border-top and a right-aligned primary CTA `Étape suivante →`.

## Key sections
- **Back row:** `<ArrowLeft/>` + `Retour` (navy bold) on the left; 3 `w-8 h-2 rounded-full` pills on the right — pill 1 navy (active), pills 2–3 gray
- **Subtype badge:** pink pill `bg-[#F4D3DE] text-[#172866] rounded-full` with `🪩` emoji prefix
- **Header:** H1 `Commençons par les bases` + subtitle `Donnez un nom à votre cagnotte et précisez l'occasion.`
- **Form:**
  1. `Nom de la cagnotte *` — text input with `edit-2` left icon + placeholder `Ex: Pour les 30 ans de Thomas` + help text `Un titre clair donne plus envie de participer.`
  2. `Occasion *` — dropdown (`chevron-down`) with placeholder `Sélectionnez une occasion...` + **4 chip shortcuts below**: `Anniversaire`, `Pot de départ`, `Cadeau commun`, `Mariage / PACS` (clicking a chip pre-fills the dropdown)
  3. `Montant à atteindre` + `Optionnel` pill — numeric input with `€` suffix (right-aligned bold), help text `Laissez vide si vous n'avez pas d'objectif précis.`
- **Footer:** border-top + right-aligned primary `Étape suivante →` button (`px-8 py-4 shadow-lg`)

## Form fields
| Field | Type | Label (FR) | Placeholder | Validation hint |
|---|---|---|---|---|
| title | text | Nom de la cagnotte * | Ex: Pour les 30 ans de Thomas | required, 3–80 chars |
| occasion | select | Occasion * | Sélectionnez une occasion... | required, enum |
| targetAmount | number (FCFA) | Montant à atteindre | 0 | optional, integer ≥ 0 |

**Occasion enum (from chip shortcuts):** `anniversaire`, `pot_depart`, `cadeau_commun`, `mariage_pacs` (executor should also add: `naissance`, `voyage`, `autre` based on picker caption)

## Banani tokens used
- Colors: `#172866` navy, `#F4D3DE` festive pink badge, `gray-100/300/400/500` neutrals, `text-red-500` required asterisk
- Font: Poppins (`text-3xl md:text-4xl font-black` h1, `font-bold` labels), Inter body
- Radii: inputs `rounded-xl`, chips `rounded-full`, progress pills `rounded-full`, main CTA `rounded-xl`
- Notable classes: `space-y-8`, `shadow-sm` on inputs, `shadow-lg` on primary CTA

## Composition plan (Phase 3 primitives/blocks)
- `DashboardLayout` (authed)
- New `WizardStepIndicator` block (3 pills, prop `current: 1 | 2 | 3`) — reused across all 6 step screens
- New `SubtypeBadge` block (prop `variant: "festive" | "solidaire"`) — festive uses pink `#F4D3DE`, solidaire uses cream `#FEF4E3`
- `Input leftIcon={<Edit2/>}` (Phase 3 `Input`)
- `Select` or `Combobox` primitive (Phase 3 — verify) for occasion
- `ChipButton` group (Phase 3 `FilterChipBar` is close — reuse or extract)
- `NumberInput suffix="FCFA"` for targetAmount
- `Button variant="primary" trailingIcon={<ArrowRight/>}` for submit

## Banani → cagnottes.sn translations needed
- `€` → `FCFA` (suffix on targetAmount input — use `formatPrice` for display, raw integer for storage)
- Currency separator: Banani placeholder shows `0` — use `0` with space thousand separator when formatting (`1 000 FCFA`)
- No phone/email fields (N/A)
- Emoji `🪩` in subtype badge — keep as-is (universal), renders cross-platform
- `Mariage / PACS` — PACS is French civil union; keep or rename to `Mariage` only if Senegalese audience doesn't recognize PACS (NOTE: flag to PM — keep for now)

## Key copy (French, verbatim from Banani)
> **Back:** `Retour`
> **Subtype badge:** `🪩 Cagnotte Festive`
> **H1:** `Commençons par les bases`
> **Subtitle:** `Donnez un nom à votre cagnotte et précisez l'occasion.`
> **Label 1:** `Nom de la cagnotte *`
> **Placeholder 1:** `Ex: Pour les 30 ans de Thomas`
> **Help 1:** `Un titre clair donne plus envie de participer.`
> **Label 2:** `Occasion *`
> **Placeholder 2:** `Sélectionnez une occasion...`
> **Chips:** `Anniversaire`, `Pot de départ`, `Cadeau commun`, `Mariage / PACS`
> **Label 3:** `Montant à atteindre` (with `Optionnel` pill)
> **Help 3:** `Laissez vide si vous n'avez pas d'objectif précis.`
> **CTA:** `Étape suivante →`

## Notable details / risks
- Step indicator is **3 pills** (not numbered dots, not a bar) — keep design distinct across festive + solidaire
- Chip shortcuts under the dropdown are a nice UX touch — clicking sets the dropdown value AND visually activates the chip
- Target amount is **optional** in Banani (per help text) — confirm with backend `fundraiserBlockConfigSchema` that `goalAmount` is optional/nullable
- Required asterisks are visible red — match with Phase 3 `Input required` prop
- No "draft save" affordance — executor should still autosave to localStorage per Phase 5 plan conventions
- The Zod schema must accept empty goalAmount (backend currently requires it? verify `backend/src/lib/blocks/schemas.ts`)
