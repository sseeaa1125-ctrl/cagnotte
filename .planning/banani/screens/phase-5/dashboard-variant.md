# dashboard-variant — Banani source extract

**Banani screen title (verbatim):** NOT PRESENT IN BANANI EXPORT
**Matched MCP index:** — (no second dashboard design in `designs[]`)
**Target route:** same as `dashboard` — `/tableau-de-bord`

## Status
**NOT PRESENT IN BANANI EXPORT.** Banani exports only one `Tableau de Bord - Cagnotte.sn` screen (designs[3]). The "empty state" that the Phase 5 planner was anticipating is **already baked into `DashboardList`** as **card slot #3** (dashed border, `Nouvelle aventure ?`).

## Recommended default (for executor)
Render `dashboard-variant` as the **same `/tableau-de-bord` route**, switching the list section between three internal states in the same component:

1. **Empty (no campaigns yet)** — the `DashboardList` grid shows ONE full-width empty-state card (span the whole grid) with a stronger hero CTA:
   - H2: `Lancez votre première cagnotte`
   - Body: `Créez une cagnotte en quelques clics et commencez à récolter.`
   - CTA: `Créer ma première cagnotte` (navy primary)
   - KPI cards above show `0 FCFA` / `0` / `0` with no trend pill

2. **Has campaigns (default)** — 2–3 card grid per Banani designs[3]. The existing dashed "Nouvelle aventure ?" card stays as the last grid slot even when the user has campaigns (matches Banani exactly).

3. **Loading skeleton** — grid of 3 `Skeleton` cards (Phase 3 block — verify or add).

## Composition plan
- Reuse `/tableau-de-bord` page
- In `DashboardList`, check `campaigns.length`:
  - `0` → render `<EmptyStateHero />` (span-3)
  - `>0` → render `campaigns.map(CampaignCard)` + trailing empty-state card
- KPI values driven by `useApi('/api/sellers/me/kpis')` (new endpoint or aggregate from existing blocks progress)

## Notable details / risks
- Phase 5 plan must list "empty state" as a distinct acceptance criterion
- Banani did NOT design a "first-campaign empty hero" — executor has discretion on layout. Suggest reusing the `Nouvelle aventure ?` copy scaled up to span the full width.
- The trend pill (+15%) should be hidden when `previousPeriod` data is missing (new seller)
- No separate route file, no new navigation item
