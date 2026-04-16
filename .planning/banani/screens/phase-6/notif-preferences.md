---
slot: 19
designed_ourselves: false
---

# notif-preferences — Banani source extract

**Banani screen title (verbatim):** Préférences de notification - Cagnotte.sn
**Target route:** `/profil/preferences`
**Matched MCP component:** `UserNotificationPreferences` (+ `DashboardNavbar`)

## Layout description
Identical shell to /profil: `DashboardNavbar` + profile left-column card + vertical sidebar nav, active tab = **"Préférences de notification"**. Right column is a single white rounded-3xl card with H3 title + 3 sub-sections, each containing toggle rows. Each toggle row: bordered gray-50 rounded-xl, label + helper text on left, pill switch on right (56px × 24px).

## Key sections
- **Header:** `DashboardNavbar`
- **Sidebar nav:** same 4 tabs, active = "Préférences de notification"
- **Main content:** one white card, title "Préférences de notification", 3 grouped sections
- **CTAs:** none shown — saves on toggle change (auto-save) OR implicit "Enregistrer" at bottom (not in Banani — design decision needed)

## Toggle sections

### Section 1 — "Mes cagnottes" (icon: gift, green `#00B67A`)
| Label | Helper | Default |
|---|---|---|
| **Nouvelle participation** | "Être notifié lorsqu'une personne participe à ma cagnotte" | **ON** |
| **Paliers atteints** | "M'informer lorsque je franchis des paliers (50%, 100%)" | **ON** |
| **Rappels de fin de cagnotte** | "Me prévenir quelques jours avant la clôture" | **ON** |

### Section 2 — "Mes participations" (icon: heart, pink-500)
| Label | Helper | Default |
|---|---|---|
| **Mises à jour des organisateurs** | "Recevoir des nouvelles des cagnottes que j'ai soutenues" | **ON** |
| **Reçus de paiement** | "Recevoir mes confirmations de participation par e-mail" | **OFF** |

### Section 3 — "Communications Cagnotte.sn" (icon: mail, blue-500)
| Label | Helper | Default |
|---|---|---|
| **Newsletter et offres** | "Découvrir nos nouveautés et les belles histoires solidaires" | **OFF** |

## Toggle visual spec
- ON state: `w-12 h-6 bg-[#00B67A] rounded-full` with knob `w-4 h-4 bg-white absolute right-1`
- OFF state: `w-12 h-6 bg-gray-200 rounded-full` with knob `w-4 h-4 bg-white absolute left-1 shadow-sm`
- Row: `flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100`

## Banani tokens used
- Colors: `#172866` (navy section titles), `#00B67A` (active toggle green), `text-pink-500`, `text-blue-500`, `bg-gray-50` (row bg), `bg-gray-200` (off toggle)
- Radii: `rounded-3xl` (card), `rounded-xl` (rows), `rounded-full` (toggles)

## Composition plan (cagnottes.sn Phase 3 primitives/blocks)
- Shared `ProfileSidebar`
- **New:** `Toggle` primitive — Phase 3 may not have one; build on `<button role="switch" aria-checked>`. Animate knob via CSS transform.
- **New:** `ToggleRow` compound (label + helper + Toggle)
- **New:** `ToggleGroup` (section header icon + title + N rows)
- `Button` for save CTA (if we add one)

## Banani → cagnottes.sn translations needed
- **None** — this screen is already FR and has no currency/phone fields
- Backend `NotificationPreference` enums must match these 6 toggles exactly — see [backend/src/routes/notifications.ts](backend/src/routes/notifications.ts) `GET/PATCH /api/notifications/prefs`
- **Backend gap:** the existing `notifications.ts` route has `GET/PATCH /prefs` but its schema may not match these 6 toggle keys. Confirm model columns:
  - `newParticipation` (default true)
  - `milestoneReached` (default true)
  - `endingSoonReminder` (default true)
  - `organizerUpdates` (default true)
  - `paymentReceipts` (default false)
  - `newsletter` (default false)

## Key copy (French, verbatim)
> **H1:** "Mon profil"
> **Subtitle:** "Gérez vos informations personnelles et vos paramètres de sécurité."
> **Section title:** "Préférences de notification"
> **Section 1 heading:** "Mes cagnottes"
> **Section 2 heading:** "Mes participations"
> **Section 3 heading:** "Communications Cagnotte.sn"
> (See toggle tables above for each row's label + helper.)

## Data source
- **Read:** `GET /api/notifications/prefs` (existing per CLAUDE.md routes list)
- **Write:** `PATCH /api/notifications/prefs { key: boolean }` — debounce ~500ms on toggle change, or batch with explicit save button
- CSRF + `requireAuth` (already wired)

## Notable details / risks
- **Dispatch integration:** the backend `lib/notifications/dispatch.ts` has 9 typed wrappers. Every `fireXxx()` call must read the preference and short-circuit if disabled. Confirm this is already wired or add it in Phase 6.
- Auto-save vs. explicit save — recommend auto-save with toast confirmation ("Préférences enregistrées") to match the no-CTA design
- `Reçus de paiement` toggle affects the **participant-side** email queue, not in-app notifications — cross-reference with `lib/queues/emailQueue.ts`
- SMS toggles NOT present in Banani — task mentioned "email / in-app / SMS" 3-group layout but Banani groups by **audience context** (creator / participant / marketing), not by channel. Respect Banani's grouping.
- Three toggles default ON, three default OFF — persist these as DB defaults on `NotificationPreference` row creation
- Accessibility: `role="switch" aria-checked aria-label` on every toggle (Phase 3 primitive should enforce)
