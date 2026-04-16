---
slot: 16
designed_ourselves: false
---

# participations — Banani source extract

**Banani screen title (verbatim):** Mes Participations - Cagnotte.sn
**Target route:** `/participations`
**Matched MCP component:** `ParticipationsList` (+ `DashboardNavbar`)

## Layout description
Full-width dashboard screen. `DashboardNavbar` (top horizontal nav with tabs: Tableau de bord / Mes cagnottes / Participations) at the top, then a gray-50 main section. Page header row (H1 + subtitle on the left, Filter + Export buttons on the right) followed by a single white rounded card containing an overflow-x-auto `<table>`. This screen uses the **top tab nav** (DashboardNavbar), NOT the profile left-sidebar. No separate mobile card view in the design — the table relies on `overflow-x-auto` plus a hidden "Voir la cagnotte" link that becomes visible on `lg:hidden`.

## Key sections
- **Header:** `DashboardNavbar` with `active="participations"`, bell icon (unread dot), "Créer une cagnotte" CTA, avatar pill
- **Sidebar nav:** none (this screen uses top tab nav, not the profile sidebar)
- **Main content:** page title "Mes participations" + subtitle + actions row (Filtrer / Exporter PDF), then table card
- **Footer / CTAs:** per-row hover actions (eye icon, receipt icon); no page-level footer

## Table columns
| Column | Data | Notes |
|---|---|---|
| Cagnotte | 64x64 rounded square image + cagnotte name (bold navy) + organizer name with user icon | Primary visual |
| Date | e.g. "Aujourd'hui, 14:30" or "12 Mars 2023" | `text-sm text-gray-700` |
| Montant | e.g. "50 €" (→ must become FCFA) | Bold navy |
| Statut | Pill badge: "En cours" (bg-green-500) / "Terminée" (bg-gray-500) | White text on colored bg, `rounded-full` |
| Actions | Two 40x40 round icon buttons (eye = view, file-text = receipt) revealed on `group-hover`; mobile fallback shows text link "Voir la cagnotte" via `lg:hidden` | |

## Banani tokens used
- Colors: `#172866` (navy primary), `bg-gray-50` (page bg), `bg-gray-50/50` (table header), `bg-green-500` / `bg-gray-500` (status pills), `text-blue-600` (mobile action link)
- Radii: `rounded-3xl` (table card), `rounded-xl` (image), `rounded-full` (status pills, action buttons)
- Notable classes: `max-w-7xl mx-auto`, `overflow-x-auto`, `divide-y divide-gray-100`, `group-hover:opacity-100`

## Composition plan (cagnottes.sn Phase 3 primitives/blocks)
- `DashboardNavbar` (layout) — from Phase 3 (exists)
- Native `<table>` with Tailwind utilities — Phase 3 has no `Table` primitive; use semantic HTML
- `Button` (primitive) for Filter + Export CTAs
- `Badge` primitive for status pill — Phase 3 has no Badge; compose inline span with `rounded-full px-2.5 py-1 text-xs font-bold text-white`
- `Image` primitive for cagnotte thumbnail (R2 proxy URL)
- Empty-state block — NOT in Banani; design ourselves ("Aucune participation encore" + link to `/`)

## Banani → cagnottes.sn translations needed
- `€` → `FCFA` via `formatPrice()` (integer amounts, no decimals)
- Statuses "En cours" / "Terminée" map to `Order.paymentStatus === PAID` + block active flag
- Remove "Exporter (PDF)" from v1 (no backend endpoint) OR defer to Phase 7 — flag this to the product owner
- "Filtrer" button has no modal in Banani — defer filter chip set to Phase 7
- `+33` does not appear on this screen

## Key copy (French, verbatim)
> **H1:** "Mes participations"
> **Subtitle:** "Retrouvez toutes les cagnottes auxquelles vous avez contribué."
> **Buttons:** "Filtrer", "Exporter (PDF)"
> **Column headers:** "Cagnotte", "Date", "Montant", "Statut", "Actions"
> **Status labels:** "En cours", "Terminée"
> **Mobile action:** "Voir la cagnotte"
> **Hover tooltips (title attr):** "Voir la cagnotte", "Télécharger le reçu"
> **Navbar tab label:** "Participations"

## Data source
- **Read:** `GET /api/orders?donorEmail=<auth-seller-email>&status=PAID` — NOTE: this endpoint does not yet exist for the "donor-side view of your own contributions". Current `GET /api/orders` is seller-scoped (creator sees orders on their own blocks). **Phase 6 backend work:** add a donor-side filter or a new endpoint like `GET /api/me/participations` that joins `Order` on the authed seller's email. Flag this as a Phase 6 backend prerequisite.
- **Per row → Cagnotte card:** join to `Block` (cover image from `config.cover`, `title`, `slug`, organizer from `Seller.displayName`)
- **Mutations:** none on this page (v1)

## Notable details / risks
- **Backend gap:** endpoint for "my participations as a donor" does not exist — needs planning before frontend build
- Donor view ≠ creator view — orders here are **other people's cagnottes this user donated to**
- Receipt download (file-text icon) needs a PDF generation endpoint — defer to Phase 7 or hide the button
- No explicit mobile-card layout in Banani — the `overflow-x-auto` wrapper handles mobile. Recommend designing proper mobile cards ourselves at 375px breakpoint (48px touch targets required by CLAUDE.md)
- Empty state not shown in Banani — design copy: "Vous n'avez encore participé à aucune cagnotte" + primary CTA "Découvrir les cagnottes" linking to `/cagnottes`
- Seed data amounts are EUR ("50 €", "20 €") — translate every amount via `formatPrice()`
