---
slot: 20
designed_ourselves: false
---

# notifications-feed — Banani source extract

**Banani screen title (verbatim):** Notifications - Cagnotte.sn
**Target route:** `/notifications`
**Matched MCP component:** `NotificationsList` (+ `DashboardNavbar`)

## Layout description
`DashboardNavbar` at top, then `bg-gray-50` section, `max-w-4xl` (narrower than /participations). Page header (H1 "Vos notifications" + subtitle on left, "Tout marquer comme lu" action button on right). Single white rounded-3xl card with a **2-tab filter strip** at the top ("Toutes (5)" / "Non lues (2)"), then a vertically divided list of notification rows, then a "Voir les notifications plus anciennes" footer link.

**Important: Banani's tab list has only 2 tabs (`Toutes` / `Non lues`) — NOT 4 tabs (Tout / Dons / Paiements / KYC) as the original task spec assumed.** Flag this delta — we can either ship as-is (2 tabs) or extend to 4 tabs ourselves.

## Key sections
- **Header:** `DashboardNavbar`
- **Page header:** H1 + subtitle + "Tout marquer comme lu" (white pill, shadow-sm)
- **Tab strip (inside card, top):** 2 tabs — "Toutes (5)" ACTIVE, "Non lues (2)" inactive
- **Feed list:** divider-separated rows, each row = icon bubble + content + meta + overflow menu
- **Footer link:** "Voir les notifications plus anciennes" (centered, bold navy)

## Notification row anatomy
```
[48x48 icon bubble with colored bg, red dot if unread]  [content]  [...]
                                                         [time + clock icon]
```
- **Icon bubble:** 48x48 `rounded-full`, type-specific bg/color mapping (see below)
- **Unread indicator:** 12px red dot `bg-red-500` absolute top-right of icon bubble + row has `bg-blue-50/20`
- **Content:** paragraph with **bold navy spans** for names/amounts, colored spans for highlights (green for money, orange for warnings, blue for milestones)
- **Meta:** time string + clock icon, `text-sm text-gray-400`
- **Action:** `more-horizontal` overflow button (32x32, gray)

## Notification types → icon + color mapping (from Banani seed data)
| Type | Icon | Bubble bg | Icon color | Example content |
|---|---|---|---|---|
| `contribution` (DONATION_RECEIVED) | `gift` | `bg-[#CCF0E4]` | `text-[#00B67A]` (green) | "Marc Dubois a participé à votre cagnotte "Pour les 30 ans de Thomas" pour un montant de 50 €." |
| `alert` (ENDING_SOON) | `clock` | `bg-orange-100` | `text-orange-600` | "Votre cagnotte ... se termine dans 3 jours. N'oubliez pas de la relancer !" |
| `milestone` | `trending-up` | `bg-blue-100` | `text-blue-600` | "Félicitations ! Vous avez atteint 50% de votre objectif..." |
| `system` (PAYOUT_COMPLETED) | `check-circle` | `bg-gray-100` | `text-gray-600` | "Le virement de 2 100 € vers votre compte bancaire a été effectué avec succès." |
| `message` (DONATION_MESSAGE) | `message-circle` | `bg-pink-100` | `text-pink-600` | "Sophie a laissé un message sur la cagnotte ..." |

Per CLAUDE.md there are **9 notification types** (`DONATION_RECEIVED`, `MILESTONE`, `ENDING_SOON`, `CAGNOTTE_ENDED`, `DONATION_MESSAGE`, `PAYOUT_COMPLETED`, `PAYOUT_FAILED`, `KYC_APPROVED`, `KYC_REJECTED`). Banani only shows 5 — design icon/color mappings for the 4 missing types:
- `CAGNOTTE_ENDED` — `flag` icon, `bg-gray-100` / `text-gray-600`
- `PAYOUT_FAILED` — `alert-triangle`, `bg-red-100` / `text-red-600`
- `KYC_APPROVED` — `shield-check`, `bg-green-100` / `text-green-700`
- `KYC_REJECTED` — `shield-off`, `bg-red-100` / `text-red-700`

## Banani tokens used
- Colors: `#172866`, `bg-red-500` (unread dot), `bg-blue-50/20` (unread row tint), `bg-gray-50` (active tab pill bg)
- Radii: `rounded-3xl` card, `rounded-xl` tab pills, `rounded-full` icon bubbles

## Composition plan (cagnottes.sn Phase 3 primitives/blocks)
- `DashboardNavbar` — existing
- **New:** `NotificationFeed` block (header + tabs + list + footer)
- **New:** `NotificationRow` compound (icon bubble + content renderer + meta + overflow menu)
- **New:** `NotificationIconBubble` — map `Notification.type` → icon/color pair via a single helper
- **New:** `NotificationContent` — render the template with bold spans; the backend already stores `title` + `body` via `lib/notifications/templates.ts`, but the Banani design uses **rich JSX spans**. We need to either (a) store content as segments in `Notification.data` or (b) parse markdown bold from `body`. Recommend (a): add `data.segments: [{text, bold?, color?}]` to be rendered client-side.
- **New:** `Tabs` primitive (or reuse Phase 3 if present)
- `Button` for "Tout marquer comme lu"

## Banani → cagnottes.sn translations needed
- `€` → `FCFA` in all content templates
- Update [backend/src/lib/notifications/templates.ts](backend/src/lib/notifications/templates.ts) FR copy to match Banani verbiage (currently PROVISIONAL per CLAUDE.md — this is the confirmation pass)
- Relative times ("Il y a 10 minutes", "Hier, 14:30", "Il y a 2 jours") — use a FR relative-time helper; backend exposes `createdAt`, frontend formats

## Key copy (French, verbatim)
> **H1:** "Vos notifications"
> **Subtitle:** "Restez informé de l'activité de vos cagnottes."
> **Mark-all CTA:** "Tout marquer comme lu"
> **Tabs:** "Toutes (N)", "Non lues (N)"
> **Footer link:** "Voir les notifications plus anciennes"
> **Row overflow tooltip (title attr):** "Plus d'options"
> **Time formats:** "Il y a 10 minutes", "Il y a 2 heures", "Hier, 14:30", "Il y a 2 jours", "Il y a 3 jours"

## Data source
- **Read:** `GET /api/notifications` (exists per CLAUDE.md) — returns `{ id, type, title, body, data, readAt, createdAt }[]` scoped to `req.seller.sub`
- **Unread count:** `GET /api/notifications/count` (exists)
- **Mark read:** `POST /api/notifications/mark-read { ids?: string[] }` (exists) — if no ids, marks all
- CSRF + `requireAuth` already wired
- **Unread state:** `readAt === null`

## Notable details / risks
- **Tab mismatch:** Banani has 2 tabs, task spec expected 4 (Tout / Dons / Paiements / KYC). Recommend extending to 4 tabs ourselves for better filtering — or ship 2 and add filter chips for type groups in Phase 7.
- **Rich content rendering:** Banani hardcodes JSX spans. Backend stores plain text. Either enhance templates.ts to emit segments, or build a markdown-bold parser client-side. Segments are cleaner.
- **Pagination:** "Voir les notifications plus anciennes" suggests load-more. Backend `GET /api/notifications` must support `?cursor=` or `?offset=` — confirm.
- **Mark-as-read on row click** is a UX pattern not shown explicitly — Banani only has "Tout marquer comme lu" + overflow menu. Design decision: auto-mark-as-read on row hover/click OR only via explicit action. Recommend: auto-mark-read on tab open via `POST /mark-read` (bulk).
- **Real-time updates:** unread count in `DashboardNavbar` bell — needs polling or SSE. Defer to Phase 7 unless required.
- **Empty state:** not shown in Banani — design "Aucune notification pour l'instant" with a bell-off icon
