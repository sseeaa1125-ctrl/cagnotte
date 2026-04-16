# solidaire-step-3 — Banani source extract

**Banani screen title (verbatim):** `Créer une cagnotte Solidaire - Étape 3`
**Matched MCP index:** designs[14] (screen `main_next1_next2_next2_next1_next2_next1_next1.jsx` + component `CreateSolidaireCagnotteStep3.jsx`)
**Target route:** `/cagnottes/nouvelle/solidaire/etape-3`

## Layout description
Same wizard shell as festive-step-3 with all 3 pills navy, cream solidaire badge, H1 `Paramètres et visibilité`, subtitle `Dernière étape ! Configurez les options de votre collecte.`. Same structure: 2 visibility radio cards + 2 display toggles + TOS checkbox + wide `Publier ma cagnotte` CTA. **Key difference from festive: `Publique` is selected by default** (solidaire = public-first), and the TOS copy is more explicit.

## Key sections
- **Back row + step indicator** (all 3 pills navy)
- **Subtype badge + header**
- **Visibility (radio cards):**
  - **Publique** (DEFAULT SELECTED on solidaire) — `border-2 border-[#172866] bg-[#f8f9fc]`, `globe` icon, body: `Votre cagnotte sera visible par tous et apparaîtra dans les résultats de recherche de Cagnotte.sn. Idéal pour maximiser les dons.`
  - **Privée** — unselected, `lock` icon, body: `Seules les personnes disposant du lien pourront voir la cagnotte et y participer. Elle n'apparaîtra pas dans les recherches.`
- **Options d'affichage** — same 2 toggles as festive:
  - `Cacher le montant récolté`
  - `Cacher les noms des participants`
- **TOS checkbox:** `J'accepte les Conditions Générales d'Utilisation et je confirme que les fonds récoltés seront utilisés pour la cause décrite. *` (longer than festive — includes fund-usage attestation)
- **Footer CTA:** wide navy `Publier ma cagnotte ✓` (`px-10 py-4 text-lg`)

## Form fields
| Field | Type | Label (FR) | Default | Validation |
|---|---|---|---|---|
| visibility | radio | Visibilité de la cagnotte | `"public"` | required, enum `private|public` |
| hideAmount | toggle | Cacher le montant récolté | false | — |
| hideDonorNames | toggle | Cacher les noms des participants | false | — |
| acceptedTos | checkbox | J'accepte les CGU + fund-usage attestation | false | **required** |

## Banani tokens used
Same as festive-step-3 — no palette differences on this step beyond the cream subtype badge at the top.

## Composition plan (Phase 3 primitives/blocks)
- Reuse everything from festive-step-3: `WizardStepIndicator current={3}`, `SubtypeBadge variant="solidaire"`, `RadioCard`, `Toggle`, `Checkbox`, `Button variant="primary" size="lg"`
- The only logic delta: `visibility` initial state = `"public"` (solidaire) vs `"private"` (festive)
- Consider extracting a shared `WizardStepReview` component taking `subtype` prop and reading both defaults + TOS copy from a subtype config object

## Banani → cagnottes.sn translations needed
- **Solidaire defaults to Public** (opposite of festive) — reinforce in backend config
- TOS copy is longer than festive: includes `"...et je confirme que les fonds récoltés seront utilisés pour la cause décrite."` — this is a legal attestation unique to solidaire (regulatory nuance). Store as separate flag `attestsFundUsage: boolean` if backend wants to track it, OR collapse into the single `acceptedTos` check.
- CGU link same as festive
- Submission: `POST /api/blocks` with `subtype: "solidaire"`, `commission: 6%`

## Key copy (French, verbatim from Banani)
> **H1:** `Paramètres et visibilité`
> **Subtitle:** `Dernière étape ! Configurez les options de votre collecte.`
> **Visibility label:** `Visibilité de la cagnotte`
> **Option title 1 (selected):** `Publique`
> **Option body 1:** `Votre cagnotte sera visible par tous et apparaîtra dans les résultats de recherche de Cagnotte.sn. Idéal pour maximiser les dons.`
> **Option title 2:** `Privée`
> **Option body 2:** `Seules les personnes disposant du lien pourront voir la cagnotte et y participer. Elle n'apparaîtra pas dans les recherches.`
> **Options label:** `Options d'affichage`
> **Toggle 1:** `Cacher le montant récolté` — `Les visiteurs ne verront pas la somme totale collectée`
> **Toggle 2:** `Cacher les noms des participants` — `Seul vous, l'organisateur, pourrez voir qui a donné`
> **TOS:** `J'accepte les Conditions Générales d'Utilisation et je confirme que les fonds récoltés seront utilisés pour la cause décrite. *`
> **CTA:** `Publier ma cagnotte ✓`

## Notable details / risks
- **Visibility default flip** (solidaire = public, festive = private) is load-bearing UX — maximizes donor reach for causes, while respecting privacy for festive events
- TOS attestation is stronger for solidaire (fund-usage claim) — this matches Senegalese fundraising regulations where solidaire collects imply charitable intent
- Toggle defaults same as festive (both OFF)
- Same risks as festive-step-3: `hideAmount` + `hideDonorNames` must be supported in `fundraiserBlockConfigSchema`
- On submit success → `create-success` screen (see `create-success.md`)
