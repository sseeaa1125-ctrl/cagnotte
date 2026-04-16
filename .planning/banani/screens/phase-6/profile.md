---
slot: 17
designed_ourselves: false
---

# profile — Banani source extract

**Banani screen title (verbatim):** Mon Profil - Cagnotte.sn
**Target route:** `/profil`
**Matched MCP component:** `UserProfile` (+ `DashboardNavbar`)

## Layout description
`DashboardNavbar` at top, then `bg-gray-50` full-screen section with `max-w-6xl` centered column. Page header (H1 "Mon profil" + subtitle). Below, a **2-column flex layout** (`md:flex-row`): left 1/3 = profile card (avatar + camera button + name + email + "Identité vérifiée" pill) and vertical sidebar nav of sections. Right 2/3 = white rounded-3xl card titled "Informations personnelles" with form fields laid in a grid. Stacks vertically below `md`.

## Key sections
- **Header:** `DashboardNavbar` (same top tabs as /participations)
- **Sidebar nav (LEFT COLUMN, vertical):** 4 tabs + logout
  1. **Informations personnelles** (icon: user) — ACTIVE on this screen
  2. **Sécurité & Mot de passe** (icon: lock)
  3. **Coordonnées bancaires** (icon: credit-card)
  4. **Préférences de notification** (icon: bell)
  5. [divider]
  6. **Se déconnecter** (icon: log-out, red)
- **Main content (RIGHT COLUMN):** white card with H3 "Informations personnelles" + form fields
- **CTAs:** navy primary "Enregistrer les modifications"

## Form fields
| Field | Type | Label (FR) | Value shown | Validation | Notes |
|---|---|---|---|---|---|
| firstName | text | Prénom | "Marie" | required, 1-50 chars | grid col 1 |
| lastName | text | Nom | "Dupont" | required, 1-50 chars | grid col 2 |
| email | text (readonly) | Adresse e-mail | "marie.d@exemple.com" | — | lock icon at right, helper: "Pour modifier votre e-mail, veuillez contacter le support." |
| phoneCountryCode | select | (no label, inline) | "+33" | — | 28px-wide pill with chevron — **must become `+221` for Senegal** |
| phoneNumber | text | Numéro de téléphone | "6 12 34 56 78" | E.164, 9 digits | Senegalese format: `77 123 45 67` |
| birthDate | date | Date de naissance | "14 / 05 / 1992" | optional, must be ≥18y | calendar icon |

## Profile card (left column, above sidebar)
- `UserAvatar` 96x96 `rounded-full border-4 border-white shadow-sm` + overlay navy camera button (bottom-right, 32x32)
- Name (H2, `font-black text-xl`)
- Email (gray, `text-sm`)
- Pill: `bg-green-50 text-green-700` + shield-check icon + **"Identité vérifiée"**

## Banani tokens used
- Colors: `#172866` (navy), `bg-gray-50` (page), `bg-white` (cards), `bg-blue-50/50` (active nav pill), `text-red-600` (logout), `bg-green-50 text-green-700` (KYC verified pill)
- Radii: `rounded-3xl` (cards), `rounded-xl` (form fields, nav items), `rounded-full` (avatar, camera btn, pill)
- Notable: `md:flex-row gap-8`, `flex-1` right column, `w-full md:w-1/3` left column

## Composition plan (cagnottes.sn Phase 3 primitives/blocks)
- `DashboardNavbar` — existing
- **New:** `ProfileSidebar` layout component (profile card + vertical nav) — shared by profile / bank / security / notif-prefs screens
- `Input` primitive for text fields (Phase 3 has this)
- **New:** `PhoneInput` compound (country code select + national number input, `+221` locked)
- `Button` primitive for "Enregistrer les modifications"
- Disabled/readonly input style for email — use Phase 3 Input with `disabled` prop + trailing lock icon

## Banani → cagnottes.sn translations needed
- `+33` → `+221` (locked, single country) — probably just a flag + "+221" label, no select
- Email can't be edited in v1 — backend `PATCH /api/sellers/me` must reject `email` field
- **No `birthDate` field in `Seller` model** — check Prisma schema; either add it or drop this field
- **"Identité vérifiée" pill** drives off `Seller.kycStatus === "APPROVED"` — when NOT approved, show pending/rejected variant (Phase 6 must design the unverified state)
- Avatar upload uses `POST /api/upload` (existing R2 endpoint) → `PATCH /api/sellers/me { avatarUrl }`

## Key copy (French, verbatim)
> **H1:** "Mon profil"
> **Subtitle:** "Gérez vos informations personnelles et vos paramètres de sécurité."
> **Section title:** "Informations personnelles"
> **Labels:** "Prénom", "Nom", "Adresse e-mail", "Numéro de téléphone", "Date de naissance"
> **Email helper:** "Pour modifier votre e-mail, veuillez contacter le support."
> **KYC pill:** "Identité vérifiée"
> **CTA:** "Enregistrer les modifications"
> **Sidebar tabs:** "Informations personnelles", "Sécurité & Mot de passe", "Coordonnées bancaires", "Préférences de notification", "Se déconnecter"

## Data source
- **Read:** `GET /api/auth/me` or `GET /api/sellers/me` — returns `firstName`, `lastName`, `email`, `phone`, `avatarUrl`, `kycStatus`
- **Write:** `PATCH /api/sellers/me { firstName, lastName, phone, avatarUrl }` (existing in `routes/sellers.ts`)
- **Avatar upload:** `POST /api/upload` (R2), then `PATCH /api/sellers/me { avatarUrl }`

## Notable details / risks
- **Schema gap:** `Seller` model may not have `firstName`/`lastName` split — current schema likely has `displayName`. Either split the column or parse into firstName/lastName at API layer. Confirm with `backend/prisma/schema.prisma` before planning.
- **Missing `birthDate` column** — if we want it, add it; otherwise drop from the form
- KYC unverified state (pill variant) needs to be designed — Banani only shows the verified state
- Avatar upload flow needs progress indicator (not shown in Banani) — use existing Phase 3 upload pattern
- Phone country code is locked to `+221` — render as static badge, not a select
