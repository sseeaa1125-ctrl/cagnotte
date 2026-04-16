# dashboard — Banani source extract

**Banani screen title (verbatim):** `Tableau de Bord - Cagnotte.sn`
**Matched MCP index:** designs[3] (screen `main_next1_next2.jsx`) — composes `DashboardNavbar` + `DashboardOverview` + `DashboardList`
**Target route:** `/tableau-de-bord`

## Layout description
Three stacked sections on `bg-gray-50` main. (1) `DashboardNavbar` — white navbar with logo, underline tabs (Tableau de bord / Mes cagnottes / Participations), CTA `Créer une cagnotte`, bell with red dot badge, user pill with avatar + "Marie D." + chevron. (2) `DashboardOverview` — greeting `Bonjour, Marie 👋` + subtitle + `Télécharger l'historique` button, then a 3-column KPI grid. (3) `DashboardList` — "Mes cagnottes récentes" header with "Voir tout" link, 3-column card grid (2 real cards + 1 empty-state CTA card).

## Key sections
- **DashboardNavbar** (private, authed):
  - Logo `cagnotte` + `.sn` (gray)
  - Tab nav: `Tableau de bord` | `Mes cagnottes` | `Participations` (active tab = navy underline)
  - Right: `Créer une cagnotte` pill button (navy, `rounded-full`), bell button with red dot (`w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white`), avatar pill with name + chevron
  - Mobile: hamburger (`lg:hidden`)
- **Overview greeting row:** H1 `Bonjour, Marie 👋` (4xl font-black) + subtitle, right-aligned `Télécharger l'historique` secondary button
- **KPI grid (3 cols):**
  1. `Total collecté` — white card, blue-50 circular icon (`pie-chart`), green `+15%` trend pill with `trending-up` icon, value `2 450 €`
  2. `Cagnottes actives` — **navy card** (`bg-[#172866] text-white`), white/10 icon bubble with `gift`, blur glow accent, value `2`
  3. `Participations` — white card, pink-50 circular icon with `heart`, no trend pill, value `5`
- **Recent campaigns list** (3-col grid on desktop):
  - Card A — "Pour les 30 ans de Thomas", `Célébration` chip (top-left), `En cours` green status badge (top-right), image header, progress bar green `#00B67A` 70% (350 € / 500 €), "12 participants", "Reste 15 jours", CTAs `Gérer` (outlined) + `Partager` (navy with share-2 icon)
  - Card B — "Soutien pour le jardin partagé", `Solidarité` chip, `Terminée` gray status badge, full navy progress bar, "45 participants", "Clôturée le 12 Mars", single CTA `Voir les statistiques`
  - Card C — **Empty-state card**: dashed border, blue-50 plus icon circle, `Nouvelle aventure ?` title, body copy, outlined CTA `Créer une cagnotte`

## Form fields (if applicable)
N/A — dashboard is read-only.

## Banani tokens used
- Colors: `#172866` navy, `#00B67A` trustpilot-green (progress bar), `#FBE6ED`/`pink-50` accent, `blue-50` KPI icon bg, `gray-50/100/200` neutrals, `bg-red-500` notification dot, `bg-green-500` "En cours" status
- Font: Poppins headings (h1 `text-4xl font-black`, card titles `text-xl font-black`), Inter body
- Radii: KPI cards `rounded-3xl`, campaign cards `rounded-3xl`, navbar pill button `rounded-full`, action buttons `rounded-xl`
- Shadows: `shadow-sm` on KPI cards, `shadow-lg shadow-blue-900/10` on featured navy KPI card, `shadow-md shadow-blue-900/20` on primary CTAs
- Notable classes: `grid grid-cols-1 md:grid-cols-3 gap-6`, `absolute top-4 left-4` for chips, `backdrop-blur` on card chips

## Composition plan (Phase 3 primitives/blocks)
- **Layout:** `DashboardLayout` (new, wraps private pages) — internally uses the existing Phase 3 `PublicNavbar` API extended with `variant="authed"` OR a new `PrivateNavbar` block
- **KPI card** — new block `KPICard` (or reuse `Card` + `Stat` atom), supports `variant="default" | "featured"` (featured = navy inverted)
- **Greeting row** — plain JSX in page
- **Campaign grid** — reuse Phase 3 `CampaignCard` block (already shipped in `/dev-foundations`)
- **Empty-state card** — new `EmptyStateCard` block or inline JSX
- **Status badges** — `Badge variant="success" | "muted"`
- **Progress bar** — existing Phase 3 `ProgressBar` primitive

## Banani → cagnottes.sn translations needed
- `€` → `FCFA` everywhere: `2 450 €` → `2 450 000 FCFA` (or realistic FCFA value), `350 €` / `500 €` → `350 000` / `500 000 FCFA` (use `formatPrice()` from `src/lib/utils.ts`)
- `+15%` trend indicator — keep as-is (percentage is unitless)
- `Télécharger l'historique` — supported in v1? Flag to executor: Phase 2 backend does not yet expose a "history CSV" endpoint. Either wire to `GET /api/notifications?type=receipt` export OR gate behind `FEATURE_HISTORY_EXPORT = false`
- Avatar: `UserAvatar gender="female" ageGroup="25-35" heritage="African" index={1}` — Banani placeholder helper; map to our `<Avatar />` component with user-uploaded image from `Seller.avatarUrl`
- Bell notification dot: wire to `GET /api/notifications/count` (backend already has this endpoint)
- `Marie D.` — replace with `seller.name`

## Key copy (French, verbatim from Banani)
> **Greeting:** `Bonjour, Marie 👋`
> **Subtitle:** `Voici un aperçu de vos collectes et participations.`
> **Secondary CTA:** `Télécharger l'historique`
> **KPI labels:** `Total collecté`, `Cagnottes actives`, `Participations`
> **Trend pill:** `+15%`
> **Section title:** `Mes cagnottes récentes`
> **Section link:** `Voir tout`
> **Chip labels:** `Célébration`, `Solidarité`
> **Status badges:** `En cours`, `Terminée`
> **Card CTAs:** `Gérer`, `Partager`, `Voir les statistiques`
> **Empty-state title:** `Nouvelle aventure ?`
> **Empty-state body:** `Créez une nouvelle cagnotte en quelques clics pour votre prochain événement ou projet solidaire.`
> **Empty-state CTA:** `Créer une cagnotte`
> **Nav tabs:** `Tableau de bord`, `Mes cagnottes`, `Participations`
> **Navbar CTA:** `Créer une cagnotte`

## Notable details / risks
- The featured KPI card uses an inverted navy background with a `blur-2xl` circle glow accent (`absolute top-0 right-0 w-32 h-32 bg-white/5`) — worth replicating via a pseudo-element for visual impact
- Bell dot is purely decorative in Banani — wire to real unread count and hide dot when count === 0
- Campaign cards reuse exactly the same layout as the Phase 3 `CampaignCard` block — no new component needed, just pass props
- Banani card B (Terminée) omits the time countdown — our `CampaignCard` block should accept `endedAt?: Date` prop and switch label from "Reste X jours" to "Clôturée le X"
- Mobile layout: Banani hides the tab nav on <lg and shows hamburger; we need a mobile drawer (Phase 3 `NavDrawer` block?)
- No pagination on "récentes" list — hardcoded to 2–3 items (dashboard view), full list lives on `/mes-cagnottes`
- KPI card 2 (Cagnottes actives) has NO trend pill — asymmetric on purpose
