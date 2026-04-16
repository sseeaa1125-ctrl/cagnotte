---
slot: 18
designed_ourselves: false
alias: "profile-variant (Coordonnées bancaires tab) — ALSO covers the bank-details gap screen"
---

# profile-variant (bank-details) — Banani source extract

**Banani screen title (verbatim):** Coordonnées Bancaires - Cagnotte.sn
**Target route:** `/profil/coordonnees-bancaires`
**Matched MCP component:** `UserPaymentMethods` (+ `DashboardNavbar`)

## Layout description
Identical shell to /profil (same `DashboardNavbar` + same profile left-column card + same vertical sidebar nav) — the active tab is now **"Coordonnées bancaires"**. Right column contains **TWO stacked white rounded-3xl cards**:
1. **Comptes Mobile Money** — list of Wave/Orange Money accounts with "Ajouter" action
2. **Comptes Bancaires** — empty state with "Ajouter un compte bancaire" CTA + info notice

**Delta from /profil:** right column content only. Left sidebar's active state moves from "Informations personnelles" to "Coordonnées bancaires". This screen doubles as the `bank-details` gap screen — **designed_ourselves: false**.

## Key sections
- **Header:** `DashboardNavbar`
- **Sidebar nav:** same 4 tabs as /profil, active = "Coordonnées bancaires"
- **Main content card 1 — Mobile Money:**
  - H3 + subtitle + "Ajouter" button (top-right, blue pill)
  - List of accounts (2 shown): each is a bordered rounded-2xl row with provider logo tile (48x48), provider name, phone number, "Actif" green pill, trash icon
- **Main content card 2 — Bancaires:**
  - H3 + subtitle
  - Empty state: dashed border rounded-2xl box, landmark icon, title "Aucun compte bancaire", description, CTA "Ajouter un compte bancaire"
  - Info notice below (blue-50 bg, info icon, "Sécurité de vos coordonnées" explanation)

## Accounts list — data shape
| Field | Example | Source |
|---|---|---|
| provider | "Wave Sénégal" / "Orange Money" | enum |
| logo tile | single letter "W" (bg `#3374FF`) / "O" (bg `#FF6600`) | static mapping |
| phoneNumber | "+221 77 123 45 67" | masked |
| status pill | "Actif" (bg-green-100 text-green-700) | — |
| delete | trash-2 icon, red hover | — |

## Mobile Money providers shown
- **Wave Sénégal** — logo "W" on `#3374FF` square
- **Orange Money** — logo "O" on `#FF6600` square
- (Free Money should be added per CLAUDE.md — not shown in Banani, design a 3rd tile ourselves)

## Bank empty state
- Title: **"Aucun compte bancaire"**
- Body: **"Ajoutez un RIB/IBAN pour virer l'argent de vos cagnottes directement sur votre compte bancaire."**
- CTA: **"Ajouter un compte bancaire"**
- Icon: `landmark`

## Info notice (bottom)
- Title: **"Sécurité de vos coordonnées"**
- Body: **"Vos coordonnées bancaires et numéros Mobile Money sont cryptés et stockés de manière sécurisée. Ils ne sont utilisés que pour procéder au virement des fonds récoltés sur vos cagnottes."**
- Icon: `info`, bg `bg-blue-50/50`

## Banani tokens used
- Colors: `#172866`, `#3374FF` (Wave), `#FF6600` (Orange), `bg-green-100 text-green-700` (active pill), `bg-blue-50/50` (info + add button)
- Radii: `rounded-3xl` cards, `rounded-2xl` rows, `rounded-xl` logo tiles

## Composition plan
- Shared `ProfileSidebar` (see profile.md)
- **New:** `PayoutAccountCard` (logo tile + name + phone + status pill + delete)
- **New:** `AddAccountModal` (2 variants: mobile money wizard, bank RIB/IBAN wizard)
- `EmptyState` block (Phase 3 may have one — reuse)
- `InfoNotice` primitive (info icon + heading + body on blue-50 bg)

## Banani → cagnottes.sn translations needed
- `RIB/IBAN` is French mainland — Senegal uses **IBAN (BCEAO format, `SN08 ...`)** or a local account number. Confirm with product which format to accept.
- `+33` never appears here (phones are already `+221`) — good
- **Bictorys payouts require a pre-registered payout method** — the backend (`lib/payout.ts`) uses `BICTORYS_PRIVATE_KEY`. Need to check which methods Bictorys supports for payout (Wave + Orange Money confirmed; bank virement = T+48/72h)

## Key copy (French, verbatim)
> **H1:** "Mon profil"
> **Card 1 title:** "Comptes Mobile Money"
> **Card 1 subtitle:** "Pour recevoir les fonds de vos cagnottes instantanément."
> **Card 2 title:** "Comptes Bancaires"
> **Card 2 subtitle:** "Pour les virements bancaires classiques (délai de 48h à 72h)."
> **Add button:** "Ajouter"
> **Empty state title:** "Aucun compte bancaire"
> **Empty state body:** "Ajoutez un RIB/IBAN pour virer l'argent de vos cagnottes directement sur votre compte bancaire."
> **Empty state CTA:** "Ajouter un compte bancaire"
> **Status pill:** "Actif"
> **Info notice title:** "Sécurité de vos coordonnées"

## Data source
- **Read:** `GET /api/sellers/me/payout-accounts` — **endpoint does not yet exist**. Phase 6 backend: create `PayoutAccount` Prisma model (id, sellerId, provider enum [WAVE, ORANGE, FREE, BANK], identifier (phone or IBAN), status, createdAt, deletedAt) + CRUD endpoints
- **Create:** `POST /api/sellers/me/payout-accounts { provider, phone | iban }`
- **Delete:** `DELETE /api/sellers/me/payout-accounts/:id` (soft-delete)
- **Verification:** mobile money may need OTP verification — check Bictorys API; if not, skip verification step

## Notable details / risks
- **Backend gap:** `PayoutAccount` model + endpoints don't exist — blocker for this screen
- Bictorys payout identifier format — confirm it accepts `+221 77 XXX XX XX` format vs. pure digits
- Info notice claims "encrypted storage" — we must actually encrypt at rest via `lib/crypto.ts` (AES-256-GCM) for bank IBANs. Mobile money numbers = not sensitive, plaintext OK
- Delete confirmation modal not shown — design inline or skip for v1 (trash icon → inline confirm)
- Free Money (per CLAUDE.md) must be added as a 3rd provider — not in Banani
