---
phase: 06-authed-money-screens
plan: 01
subsystem: authed-money-screens
tags: [frontend, backend, profile, notifications, participations, ring-2]
requirements: [ATHD-01, ATHD-02, ATHD-03, ATHD-04]
status: green
autonomous: true
depends_on: [05-02]
provides:
  - "GET /api/sellers/me/participations (donor-side paid-donations view)"
  - "ProfileSidebar Ring 2 composed block (activeTab prop, 5 tabs + logout)"
  - "renderNotificationContent per-type JSX renderer (9 notification types)"
  - "/profil page (Banani screen 17)"
  - "/profil/preferences page with auto-save toggles (Banani screen 19)"
  - "/participations page with desktop table + mobile cards (Banani screen 16)"
  - "/notifications feed with 2 tabs + mark-read (Banani screen 20)"
  - "Retirer mes fonds entry in DashboardNavbar avatar dropdown"
  - "PATCH /api/notifications/prefs schema widened for 6 Banani keys"
affects:
  - backend/src/routes/sellers.ts
  - backend/src/routes/notifications.ts
  - src/lib/constants.ts
  - src/components/layout/DashboardNavbar.tsx
  - .planning/banani/FRONTEND-DEVIATIONS.md
tech-stack:
  added: []
  patterns:
    - "Ring 2 composed block with activeTab prop (ProfileSidebar)"
    - "Auto-save toggles (PATCH on flip, no save button, inline pulse feedback)"
    - "Rich client-side notification content rendering from Notification.data"
    - "Server component data fetching via raw fetch + cookie forward (D-11)"
    - "Client-side tab filter on readAt === null (backend lacks filter param)"
    - "Per-row optimistic mark-read with rollback on error"
    - "Displayname firstName/lastName split UX merged server-side (D-09 read path)"
key-files:
  created:
    - src/components/layout/ProfileSidebar.tsx
    - src/lib/notifications/renderContent.tsx
    - src/app/(authed)/profil/page.tsx
    - src/app/(authed)/profil/_ProfileForm.tsx
    - src/app/(authed)/profil/preferences/page.tsx
    - src/app/(authed)/profil/preferences/_PreferencesForm.tsx
    - src/app/(authed)/participations/page.tsx
    - src/app/(authed)/participations/_ParticipationsClient.tsx
    - src/app/(authed)/notifications/page.tsx
    - src/app/(authed)/notifications/_NotificationsClient.tsx
  modified:
    - backend/src/routes/sellers.ts
    - backend/src/routes/notifications.ts
    - src/lib/constants.ts
    - src/components/layout/DashboardNavbar.tsx
    - .planning/banani/FRONTEND-DEVIATIONS.md
decisions:
  - "Profile writes use PUT /api/sellers/profile not PATCH /api/sellers/me (plan was wrong; endpoint does not exist)"
  - "Notifications feed filter is client-side (backend GET /api/notifications has no filter param)"
  - "NotificationItem primitive is NOT reused (it takes string subtitle; we need JSX rich content)"
  - "Widened PATCH /api/notifications/prefs zod schema to accept legacy Phase-2 keys + 6 Banani keys (additive)"
  - "ProfileSidebar is a server component (no 'use client'); avatar edit lives in _ProfileForm client island to keep Ring 2 purity"
  - "Deferred: Filter / Export buttons on /participations, v1 creators contact support for delete"
metrics:
  duration_minutes: 10
  tasks: 6
  files_changed: 15
  commits: 6
---

# Phase 6 Plan 01: Authed Money Screens Summary

Four Banani-sourced authed screens (profil, notification preferences, participations, notifications feed) shipped end-to-end with a single ~60 LOC backend prelude, a shared Ring 2 ProfileSidebar layout block, a per-type JSX notification renderer, and no new npm dependencies.

## Outcome

Plan 06-01 closes ATHD-01 through ATHD-04. Every authed creator can now:

1. Edit their profile (name split, avatar upload, phone) at `/profil`
2. Tweak notification preferences via 6 auto-saving toggles at `/profil/preferences`
3. Browse their donor-side participation history at `/participations` (table on desktop, cards on mobile)
4. Read, mark-read, and mark-all-read their notification feed at `/notifications` with 2 tabs (Toutes / Non lues)

The `Retirer mes fonds` entry now sits in the DashboardNavbar avatar dropdown, enabling 06-02 to ship `/retraits` behind a known link.

## Tasks Shipped

| Task | Name                                                                 | Commit    | Files (primary)                                                          |
| ---- | -------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------ |
| T0   | Backend: GET /api/sellers/me/participations + prefs schema widen     | d836676   | backend/src/routes/sellers.ts, backend/src/routes/notifications.ts       |
| T1   | ProfileSidebar + renderContent + constants + dropdown + deviations   | bc32148   | 5 files (new block, renderer, constants append, navbar, deviations)     |
| T2   | /profil page (Banani screen 17) + _ProfileForm client island         | 0b75194   | src/app/(authed)/profil/{page.tsx, _ProfileForm.tsx}                     |
| T3   | /profil/preferences auto-save toggles (Banani screen 19)             | 84770c5   | src/app/(authed)/profil/preferences/{page.tsx, _PreferencesForm.tsx}     |
| T4   | /participations desktop table + mobile cards (Banani screen 16)      | 9601300   | src/app/(authed)/participations/{page.tsx, _ParticipationsClient.tsx}    |
| T5   | /notifications feed with 2 tabs + mark-read (Banani screen 20)       | 1bf6e4c   | src/app/(authed)/notifications/{page.tsx, _NotificationsClient.tsx}      |

## Requirements → Evidence

| Req     | Covered by                                                                                         |
| ------- | -------------------------------------------------------------------------------------------------- |
| ATHD-01 | T2. `/profil` PUTs to `/api/sellers/profile` with merged displayName; avatar via multipart upload. |
| ATHD-02 | T3. 6 toggles auto-save via PATCH `/api/notifications/prefs` on each flip, no save button.        |
| ATHD-03 | T0 + T4. Donor-side `/participations` reads `GET /api/sellers/me/participations` (T0 ~60 LOC).     |
| ATHD-04 | T5. 2-tab notifications feed with mark-read + mark-all-read + rich client content renderer.        |

## Backend Contracts Consumed

| Endpoint                              | Verb  | From                                             |
| ------------------------------------- | ----- | ------------------------------------------------ |
| /api/auth/me                          | GET   | profil page, preferences page (raw fetch SSR)    |
| /api/sellers/profile                  | PUT   | _ProfileForm.tsx (name + phone, avatarUrl)       |
| /api/sellers/me/participations        | GET   | participations page (raw fetch SSR + api() page) |
| /api/upload                           | POST  | _ProfileForm avatar (multipart, direct backend)  |
| /api/notifications                    | GET   | notifications page (SSR + client load-more)      |
| /api/notifications/count              | GET   | notifications page (tab badges)                  |
| /api/notifications/mark-read          | POST  | _NotificationsClient (per-row + all:true)        |
| /api/notifications/prefs              | GET   | preferences page (SSR seed)                      |
| /api/notifications/prefs              | PATCH | _PreferencesForm (auto-save on flip)             |

## Backend Contract Surprises Addressed

1. **Plan said `PATCH /api/sellers/me` — this endpoint does not exist.** The real fork has `GET /api/auth/me` (reads) and `PUT /api/sellers/profile` (writes). Logged as deviation **D-28**. Applied Rule 1 auto-fix — no architectural change required.
2. **Plan said `GET /api/notifications?filter=unread`** — the backend `GET /api/notifications` accepts only `cursor` + `limit`. We kept the `?filter=` URL segment for SSR-fresh navigation and do the filter client-side in memory (`readAt === null`). A server-side filter is a future optimisation once the feed grows.
3. **Notif prefs zod schema was locked to 7 legacy Phase-2 keys.** Widened additively to also accept the 6 Banani screen-19 keys so the frontend can write `newParticipation`/`milestoneReached`/etc. without touching dispatch-side consumers.
4. **`POST /api/notifications/mark-read` schema requires `ids[]` OR `all:true`** — the client uses `{ ids: [id] }` per-row and `{ all: true }` for the bulk button. Both match the zod refine.

## Banani Deviations Logged

- **D-25** — `birthDate` dropped from `/profil` (no column, CLAUDE.md schema rule)
- **D-26** — No delete CTA on cagnotte edit (v1 contact support — skeletal, enforced by 06-02)
- **D-27** — `Retirer mes fonds` added to avatar dropdown (Banani doesn't show it)
- **D-28** — Profile uses `/api/auth/me` + `/api/sellers/profile` (plan's `/api/sellers/me` does not exist)

Details in [.planning/banani/FRONTEND-DEVIATIONS.md](../../banani/FRONTEND-DEVIATIONS.md).

## Automated Verification Gates

| Gate                                           | Result                                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `cd backend && npm run build`                  | Green (0 TS errors, prefs schema widen + new /me/participations route compile)          |
| `npm run build` (frontend)                     | Green. 4 new routes present: `/profil`, `/profil/preferences`, `/participations`, `/notifications` |
| `npm run lint` (Phase 6 scope)                 | Green. Zero errors/warnings in `src/app/(authed)/{profil,preferences,participations,notifications}`, `src/components/layout/ProfileSidebar.tsx`, `src/lib/notifications/renderContent.tsx`. Pre-existing backend errors logged to `deferred-items.md` |
| `bash scripts/verify-ring-purity.sh`           | Ring 1 + Ring 2 green (ProfileSidebar imports no api/useApi/AuthContext)                |
| `git diff package.json package-lock.json`      | Empty — zero new npm dependencies                                                        |
| `grep birthDate ...profil/_ProfileForm.tsx`    | Only inside a guard comment "NO birthDate (D-25)"; no JSX field                          |
| `grep "use client" ProfileSidebar.tsx`         | Only inside a comment; no directive (server-safe)                                        |
| Drift grep €, +33, PayDunya, Offerts           | Empty in Phase 6 scope                                                                   |

## Known Stubs

None. Every page wires real data from a real backend endpoint. `/profil/securite`, `/profil/coordonnees-bancaires`, `/profil/kyc` links in ProfileSidebar currently 404 and will be implemented by plan 06-02 — this is expected and documented as the plan's depends_on contract for 06-02.

## Self-Check: PASSED

Created files:
- FOUND: src/components/layout/ProfileSidebar.tsx
- FOUND: src/lib/notifications/renderContent.tsx
- FOUND: src/app/(authed)/profil/page.tsx
- FOUND: src/app/(authed)/profil/_ProfileForm.tsx
- FOUND: src/app/(authed)/profil/preferences/page.tsx
- FOUND: src/app/(authed)/profil/preferences/_PreferencesForm.tsx
- FOUND: src/app/(authed)/participations/page.tsx
- FOUND: src/app/(authed)/participations/_ParticipationsClient.tsx
- FOUND: src/app/(authed)/notifications/page.tsx
- FOUND: src/app/(authed)/notifications/_NotificationsClient.tsx

Commits:
- FOUND: d836676 (T0 backend)
- FOUND: bc32148 (T1 safety rails)
- FOUND: 0b75194 (T2 profil)
- FOUND: 84770c5 (T3 preferences)
- FOUND: 9601300 (T4 participations)
- FOUND: 1bf6e4c (T5 notifications)

## Next-Phase Handoff to 06-02

ProfileSidebar now exposes these `activeTab` slots that 06-02 will implement:
- `security` → `/profil/securite` (PUT /api/auth/change-password — VERB IS PUT, not POST)
- `bank` → `/profil/coordonnees-bancaires` (payout fields on PUT /api/sellers/profile, withdrawal PIN via /api/sellers/withdrawal-pin/*)
- `kyc` → `/profil/kyc` (POST /api/sellers/kyc with idUrl + selfieUrl multipart uploads)

Plan 06-02 should also ship `/retraits` (DashboardNavbar dropdown already links here — D-27) and the cagnotte edit surface that uses PUT /api/blocks/:id (not PATCH).

The widened `PATCH /api/notifications/prefs` schema carries both legacy and Banani keys; 06-02 may add a tiny sync layer in `lib/notifications/dispatch.ts` if it wants dispatchers to read the new key names.
