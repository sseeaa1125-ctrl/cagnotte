# Phase 6: Authed + Money Screens — Research

**Researched:** 2026-04-13
**Domain:** Next.js 16 App Router authed screens consuming Phase 2 backend; backend gap-closure where needed
**Confidence:** HIGH on backend shape (verified by file reads), MEDIUM on Banani → design adaptations, HIGH on frontend primitive reuse (Phase 3/5 shipped)
**Sources (file-level):** See bottom — every factual claim is anchored to a file:line or a tagged assumption.

---

## Summary

Phase 6 ships 13 routes in the `(authed)` group on top of the Phase 5 AuthGuard foundation — 4 Banani-sourced authed screens (profile, notif-prefs, participations, notifications feed), 2 Banani-sourced "bonus" screens (withdrawal + withdrawal-success), and 7 self-designed screens (bank details, KYC upload, cagnotte stats, cagnotte edit, security, retrait-confirmation gate, profile KYC variant).

Backend-side, **4 of 5 flagged gaps already have a shipped solution** or can be satisfied by existing endpoints without new routes. The one true gap is `GET /api/me/participations` — the donor-side view of one's own contributions. It is a ~30-LOC addition to `routes/sellers.ts` and must land in 06-01 before the frontend for participations.

**Primary recommendation:**
1. Open 06-01 with a tiny backend task: add `GET /api/sellers/me/participations` (donor view). Everything else in 06-01 consumes shipped endpoints.
2. Reuse the **flat `notificationPrefs` JSON** pattern already in Phase 2 (`routes/notifications.ts:155-163`) — just widen the zod schema by 3 keys to match Banani's 6 toggles. No migration needed (field is `Seller.notificationPrefs Json?`).
3. Payout account storage **reuses existing `Seller.payoutPhone/payoutProvider/payoutName/payoutCountry` columns** — no `PayoutAccount` model, no migration. This closes screen 18 as a simple PUT `/api/sellers/profile` form, not a CRUD-backed "multiple accounts" UI. Documented as **D-18** deviation from Banani.
4. Cagnotte stats uses pure CSS bar chart from existing `GET /api/cagnottes/:slug/participants` timeline data. No new dep.
5. PIN is **4 digits** (verified `routes/sellers.ts:932`), NOT 6. Re-use Phase 5 OTP input pattern but with `maxLength={4}`.

---

## User Constraints

### Locked Decisions (from CLAUDE.md + PROJECT.md + Phase 5 summaries — treat as CONTEXT.md equivalent since no 06-CONTEXT.md exists yet)

- **Route group:** Everything in `src/app/(authed)/**` — server-AuthGuard is already shipped at `src/app/(authed)/layout.tsx:50-78` via `cookies()` + raw fetch to `/api/auth/me`. Do NOT import `@/lib/api` from the layout (window-only). **D-11.**
- **Slug rename is v2.** Cagnotte edit MUST NOT expose a slug field even though `PUT /api/blocks/:id` (note: **PUT**, not PATCH — verified `routes/blocks.ts:450`) technically accepts `config`. Frontend sends only the editable fields.
- **KYC uploads go through `/api/files/:key` proxy**, not direct R2 URLs (CLAUDE.md Critical Rules).
- **Withdrawal PIN brute-force** is already mitigated server-side via Redis lockout (P10). Frontend just needs a "trop de tentatives" error state.
- **`change-password` is PUT** not POST (`routes/auth.ts:702`).
- **Commission is creator-hidden** on creation surfaces (D-17) but **donor-visible** on payment surfaces (D-04). Phase 6 cagnotte-edit does NOT display commission. Phase 6 cagnotte-stats MAY display net vs gross since the creator needs it for withdrawal planning.
- **Mobile-first 375px, touch targets ≥ 48px, French only** — CLAUDE.md Critical Rules.
- **Bictorys-only payments**, two keys (`BICTORYS_API_KEY` charges / `BICTORYS_PRIVATE_KEY` payouts). Not a frontend concern but any error copy should say "paiement" generically, not name the PSP.
- **No Framer Motion, no Recharts, no new npm deps** — CLAUDE.md "Never Use" + Phase 5 D-15 precedent.

### Claude's Discretion

- **How to surface KYC state on profile screen** (APPROVED pill, PENDING pill, REJECTED pill, NONE CTA "Vérifier mon identité"). Banani only shows APPROVED. I will design the 4 variants.
- **Cagnotte stats chart style** — CSS bar chart (this research recommends), or text-only KPI grid. Choose at planning time based on data shape.
- **Withdrawal flow step count** — 2 steps (amount + account → PIN on confirm click) vs 3 steps (amount → account → PIN). Banani shows 1 page with PIN missing. Recommend **single-page form with inline PIN section** at the bottom because (a) Banani's 1-page layout is cleaner, (b) backend accepts `{amount, phone, provider, recipientName, withdrawalPin}` in one POST (`routes/withdrawals.ts:38-45`).
- **Auto-save on notification preferences toggles** vs explicit "Enregistrer" button. Banani has NO save button. Recommend **auto-save with debounced PATCH** and "Préférences enregistrées" toast.
- **Participations PDF export + receipt download** — remove buttons in v1 (no backend endpoint exists), defer to Phase 7. Document in FRONTEND-DEVIATIONS as **D-19**.
- **Bank details CRUD vs single payout-method form** — recommend collapsing to single form editing `Seller.payoutPhone/provider/name/country` (reuses existing schema columns). NO new `PayoutAccount` model. Logged as **D-18**.

### Deferred Ideas (OUT OF SCOPE)

- Multiple payout accounts per seller (Banani hints at this in screen 18 with an "Ajouter" button + list). v1 keeps one payout account per seller via the existing `Seller.payout*` columns. → **v2 MNYS-V2-01.**
- Bank RIB/IBAN support for seller payouts (Banani's "Comptes Bancaires" card). Bictorys payouts today only support `wave_money` + `orange_money` (verified `routes/withdrawals.ts:42`). → **v2.**
- PDF receipt download on participations row. → **v2 EXPT-V2-01.**
- Notification filter tabs beyond 2 (Toutes / Non lues). Banani has 2; expanding to 4 is scope creep. → **v2.**
- Real-time unread badge via SSE / WebSocket. v1 polls on page mount only. → **v2.**
- Cagnotte slug rename via PATCH. → **v2 INTG-V2-02.**
- Birth date on profile (Banani shows it, no column on `Seller`). → **v2 or drop entirely.**
- "Exporter PDF" on participations. → **v2.**
- `/api/sellers/me/payout-accounts` CRUD (multiple accounts). → **v2.**
- Email change from profile (Banani shows readonly + helper "contact support"). → **v2.**

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ATHD-01 | Profile page (screen 17) — sidebar + form | `PUT /api/sellers/profile` exists (`routes/sellers.ts:86`); `Seller.displayName` single column forces D-09 split client-side; KYC pill from `Seller.kycStatus`; Phase 3 `SidebarNav` primitive (`src/components/layout/SidebarNav.tsx:16`) ready |
| ATHD-02 | Notif preferences (screen 19) | `GET/PATCH /api/notifications/prefs` exist (`routes/notifications.ts:141, 165`); current zod schema has 7 keys (see 6-gap item 4 below), needs widening to match Banani's 6 labels |
| ATHD-03 | Participations table (screen 16) | **GAP:** no donor-side endpoint — needs new `GET /api/sellers/me/participations` (~30 LOC) |
| ATHD-04 | Notifications feed (screen 20) | `GET /api/notifications` + `/count` + `POST /mark-read` all shipped (`routes/notifications.ts:34, 84, 108`); cursor pagination present; `Notification.data Json?` available for segments |
| MNYS-01 | Bank details form | Reuses existing `Seller.payout*` columns (schema.prisma:46-49) via `PUT /api/sellers/profile`. No new model. D-18. |
| MNYS-02 | Withdrawal flow | `GET /api/withdrawals/balance` (`routes/withdrawals.ts:95`) + `POST /api/withdrawals` (`routes/withdrawals.ts:159`) both shipped. PIN is **4 digits**. KYC gate already enforced server-side (HTTP 403). |
| MNYS-03 | KYC upload | `POST /api/sellers/kyc` (`routes/sellers.ts:270`) + `POST /api/upload` + `GET /api/files/:key` all shipped. Zod schema at `routes/sellers.ts:264` expects `{fullName, idUrl, selfieUrl}`. |
| MNYS-04 | Cagnotte stats | `GET /api/blocks/:id/progress` + `GET /api/cagnottes/:slug/participants` both shipped. Pure CSS bar chart recommended. |
| MNYS-05 | Cagnotte edit (no slug) | `PUT /api/blocks/:id` (`routes/blocks.ts:450`) accepts `{title, config, isActive}`. Frontend must NOT send `slug`. |
| MNYS-06 | Security / password change | `PUT /api/auth/change-password` (`routes/auth.ts:702`) shipped. **PUT verb, not POST.** |

---

## Backend Gap Audit (5 items) — Resolution Plan

### Gap 1 — `GET /api/me/participations` (donor-side order list) — **GAP CONFIRMED, FIX INLINE**

**Status:** MISSING. Verified by reading `routes/orders.ts:877-1043` — `GET /api/orders` is creator-scoped (`where: { sellerId }`, line 914) and lists orders ON the creator's own blocks, never donations the seller made to other cagnottes. There is no `donorEmail`/`customerEmail === req.seller!.email` filter anywhere.

**Fix (lands in 06-01 T1 as a backend prelude, ~30 LOC):**

Add to `backend/src/routes/sellers.ts` (placement: after line 316 `POST /kyc`, before line 318 `GET /dashboard/stats` — must stay above the `:slug` catch-all at line 547):

```ts
// GET /api/sellers/me/participations — donor-side view of cagnottes the authed seller contributed to
sellersRouter.get("/me/participations", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { email: true },
    });
    if (!seller) { res.status(404).json({ error: "Compte introuvable" }); return; }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const orders = await prisma.order.findMany({
      where: {
        customerEmail: seller.email,
        paymentStatus: "PAID",
        orderType: "DONATION",  // exclude SALE/BOOKING noise from fork leftovers
        blockId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: {
        id: true,
        reference: true,
        amount: true,
        customerName: true,
        isAnonymous: true,
        createdAt: true,
        paidAt: true,
        block: {
          select: {
            id: true,
            slug: true,
            title: true,
            isActive: true,
            config: true,  // for cover/subtype
            seller: { select: { displayName: true, slug: true } },
          },
        },
      },
    });
    const hasMore = orders.length > limit;
    const items = hasMore ? orders.slice(0, limit) : orders;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    res.json({ items, nextCursor, hasMore });
  } catch (err) {
    logger.error("Erreur /me/participations", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
```

**Why inline and not defer:** ATHD-03 is a Phase 6 locked requirement. The endpoint is tiny (matches existing patterns in the same file — see `/withdrawal-pin/status` at line 917 for a comparable cursor-less shape). Tagging it `[VERIFIED: routes/sellers.ts:1-1100]`.

**Smoke-test addition:** Add 1 assertion to `backend/scripts/smoke-test.ts` — seed Seller A as a donor on a Seller B cagnotte, GET `/me/participations` as Seller A, assert `items.length === 1` and `items[0].block.seller.slug === "test-seller-b"`.

### Gap 2 — `PayoutAccount` Prisma model + CRUD — **NOT A GAP, REUSE EXISTING COLUMNS**

**Status:** The `Seller` model already has `payoutPhone`, `payoutProvider`, `payoutName`, `payoutCountry` columns (`schema.prisma:46-49`). They are:
- writable via `PUT /api/sellers/profile` (verified at `routes/sellers.ts:67-70` in the zod schema, and `routes/sellers.ts:153-156` in the update call)
- read via `GET /api/withdrawals/balance` (`routes/withdrawals.ts:133-146`) which returns them pre-filled for the withdrawal form

**Decision:** **Do NOT create a `PayoutAccount` model in v1.** Banani's "multiple accounts list" UI is hint-ware for v2. For v1, screen 18 "Coordonnées bancaires" becomes a simple form editing these 4 columns. Log as **D-18** in FRONTEND-DEVIATIONS.md:

> **D-18 — Single payout account per seller (v1), not multi-account CRUD**
> **Banani:** Screen 18 shows a list of Mobile Money accounts with "Ajouter" button + delete per row, plus a separate "Comptes bancaires" empty state.
> **cagnottes.sn:** Single form editing `Seller.payoutPhone / payoutProvider / payoutName / payoutCountry`. Bank accounts deferred to v2 (Bictorys payouts only accept `wave_money` + `orange_money` per `routes/withdrawals.ts:42`).
> **Rationale:** No `PayoutAccount` model exists; creating one + CRUD + encryption wire-up is a 4-hour rabbit hole for zero v1 user value (sellers overwhelmingly use one Mobile Money number).
> **Enforcement:** Plan 06-02 T1 uses `PUT /api/sellers/profile` with only the 4 payout fields.
> **Introduced by:** Plan 06-02

### Gap 3 — `GET /api/blocks/:id/payable` (withdrawable amount) — **NOT A GAP, USE BALANCE**

**Status:** Withdrawable amount is **per-seller, not per-block.** `GET /api/withdrawals/balance` (`routes/withdrawals.ts:95-156`) already computes:
- `totalEarned` — sum of `Order.sellerAmount` WHERE `paymentStatus = PAID` (commission already subtracted by `computeCommission()` at order creation time)
- `totalWithdrawn` — sum of COMPLETED + PROCESSING withdrawals
- `pendingWithdrawals` — sum of PENDING withdrawals
- `balance = totalEarned - totalWithdrawn - pendingWithdrawals`

And returns `kycStatus`, `hasWithdrawalPin`, `withdrawalBlocked`, `payoutPhone/Provider/Name/Country` for pre-filling. **This is everything the withdrawal screen needs.**

**The mismatch:** Banani's withdrawal screen shows "Depuis la cagnotte: Les 30 ans de Thomas" + "Solde disponible: 450 €" — per-cagnotte withdrawal. Our backend is per-seller. **Two options:**

| Option | Description | Trade-off |
|--------|-------------|-----------|
| A (recommended) | Frontend shows seller-level balance. Remove the "Depuis la cagnotte" strip from Banani's layout. Route becomes `/retrait` instead of `/cagnottes/:slug/retrait`. | Deviates from Banani; no backend work |
| B | Add a server-side group-by-block aggregate to `/balance` (backend gap, ~15 LOC) | Matches Banani exactly; needs new code + smoke-test |

**Recommendation:** Option A + log as **D-20**:

> **D-20 — Withdrawal is seller-level, not per-cagnotte**
> **Banani:** Screen "Retirer mes fonds" shows a source strip "Depuis la cagnotte: Les 30 ans de Thomas" implying per-cagnotte withdrawal.
> **cagnottes.sn:** Withdrawal is per-seller. Route is `/retrait` (not `/cagnottes/:slug/retrait`). The source strip is replaced with "Solde disponible (toutes cagnottes confondues)".
> **Rationale:** `GET /api/withdrawals/balance` already aggregates all PAID orders across all the seller's blocks (`routes/withdrawals.ts:100-111`). Building per-block withdrawal would require a second `groupBy` query + a new route + fee attribution logic — zero user value since sellers reason about "my money", not "my money on cagnotte X".
> **Introduced by:** Plan 06-02

### Gap 4 — Notification preferences 6 keys — **SHIPPED WITH SMALL SCHEMA WIDENING NEEDED**

**Status:** `routes/notifications.ts:155-163` already defines a zod schema with 7 keys:

```
donations, milestones, payouts, kyc, endingSoon, cagnotteEnded, donationMessages
```

Banani (screen 19) defines 6 toggles grouped by audience:
| Section | Toggle key (Banani label → proposed key) | Default | Maps to |
|---------|------------------------------------------|---------|---------|
| Mes cagnottes | newParticipation ("Nouvelle participation") | ON | `donations` ✅ matches |
| Mes cagnottes | milestoneReached ("Paliers atteints") | ON | `milestones` ✅ matches |
| Mes cagnottes | endingSoonReminder ("Rappels de fin de cagnotte") | ON | `endingSoon` ✅ matches |
| Mes participations | organizerUpdates ("Mises à jour des organisateurs") | ON | ❌ **NEW** — not in current schema |
| Mes participations | paymentReceipts ("Reçus de paiement") | OFF | ❌ **NEW** — not in current schema |
| Communications | newsletter ("Newsletter et offres") | OFF | ❌ **NEW** — not in current schema |

**Fix:** widen the zod schema in `routes/notifications.ts:155-163` by 3 keys:

```ts
const prefsSchema = z.object({
  donations: z.boolean().optional(),
  milestones: z.boolean().optional(),
  payouts: z.boolean().optional(),
  kyc: z.boolean().optional(),
  endingSoon: z.boolean().optional(),
  cagnotteEnded: z.boolean().optional(),
  donationMessages: z.boolean().optional(),
  organizerUpdates: z.boolean().optional(),   // NEW — reserved, no dispatcher yet (v2 donor-side feature)
  paymentReceipts: z.boolean().optional(),    // NEW — reserved, consumed by emailQueue in v2
  newsletter: z.boolean().optional(),         // NEW — reserved, marketing emails v2
});
```

The 3 NEW keys are **reservation-only** in v1 — no dispatcher reads them (the corresponding features don't exist), but we persist them so screen 19 can round-trip. This is a 3-line zod edit, no migration (field is `Seller.notificationPrefs Json?`).

**Backend task in 06-01 T1:** widen the zod schema (3 lines) + add default-safe reads in the GET handler (return `organizerUpdates: true, paymentReceipts: false, newsletter: false` if missing).

**Frontend task:** PATCH with camelCase keys exactly as listed.

**Discrepancy note:** The existing schema has `payouts`, `kyc`, `cagnotteEnded`, `donationMessages` which Banani does NOT surface. Keep them in the backend schema (no breakage) but hide them in the UI (v1 ships only the 6 Banani toggles; v2 can expand the grid).

### Gap 5 — Notification rich-content rendering — **PARTIALLY PRESENT, CLIENT-SIDE SEGMENTS NEEDED**

**Status:** `Notification` model has `title: String`, `body: String?`, `data: Json?`, `icon: String?` (`schema.prisma:533-546`). Templates in `backend/src/lib/notifications/templates.ts:52-245` emit `{title, body, icon, emailSubject, emailHtml}` as **plain text** (with the French verbiage already escaped via `escapeHtml()`). The `data` JSON is **written by dispatchers** and contains structured metadata (`donorDisplayName`, `wasAnonymous`, `amount`, etc.) per CLAUDE.md.

Banani's notification row renders rich spans: bold navy name, bold green amount, inline italic message. Currently templates.ts emits:

```
"Marc Dubois vient de participer 50 000 FCFA à ta cagnotte « Anniversaire de Fatou »"
```

**Gap:** Frontend has two options to render rich content:

| Option | Approach | Trade-off |
|--------|----------|-----------|
| A (recommended) | Client-side **regex-based segment parser** that walks the body, matches `\d[\d\s]*FCFA`, names (from `data.donorDisplayName`), and quoted `« ... »` titles, and wraps them in `<strong class="text-primary">` / `<strong class="text-green-600">` / `<span class="italic">`. Zero backend change. | Parser is ~40 LOC client-side; fragile if templates drift |
| B | Extend `Notification.data` to include pre-computed `segments: Array<{text, emphasis?: "name"|"amount"|"title"|"message"}>` and have each template emit both `body` (plain) and `data.segments` (rich). Backend change, mostly safe. | Requires migrations across 9 templates (~3h), then client just maps |

**Recommendation for v1:** **Option A** — client-side parser in `src/lib/notifications/parseBody.ts`. Keeps backend untouched, matches the "no new migrations if avoidable" fork ethos. If segments drift, tests are easy.

**Simpler alternative:** since we already have `Notification.data` with structured fields, just render title + body plain and **render a second line** below using structured data. Example for DONATION_RECEIVED:

```
Line 1 (title): "Marc Dubois a participé"
Line 2 (body, parsed):
  ┌ name: "Marc Dubois" (bold navy)
  ├ verb: " vient de participer "
  ├ amount: "50 000 FCFA" (bold green)
  ├ verb: " à "
  └ title: "« Anniversaire de Fatou »" (bold navy)
```

**Verdict:** Ship Option A in 06-01 T3 as a ~30-LOC pure function with per-type handlers (not a universal regex). Document in FRONTEND-DEVIATIONS as **D-21**.

---

## Standard Stack (nothing new)

| Library | Version | Purpose | Why standard |
|---------|---------|---------|--------------|
| next | ^16.x | Already installed. App Router server components for auth guard. | Locked by project |
| react | ^19.x | Already installed | Locked |
| lucide-react | installed | Icons for notif bubbles + sidebar + KYC pills | Already used by Phase 3 primitives |
| clsx + tailwind-merge | via `cn()` | Class composition | Phase 3 FNDN-03 shipped |

**Installation:** `git diff package.json` MUST be empty on Phase 6 exit (same rule as Phase 5 D-15). No new deps for charts, OTP, or form state — everything is hand-rolled on top of Phase 3 primitives.

---

## Architecture Patterns

### Route layout

```
src/app/(authed)/
├── layout.tsx                  ← Phase 5 shipped (server AuthGuard)
├── DashboardShell.tsx          ← Phase 5 shipped (client island w/ logout)
├── tableau-de-bord/            ← Phase 5 shipped
│   └── cagnottes/
│       └── [slug]/             ← Phase 6 NEW
│           ├── stats/page.tsx
│           └── modifier/page.tsx
│
├── profil/                     ← Phase 6 NEW — 5 routes sharing ProfileSidebar
│   ├── layout.tsx              ← wraps children with ProfileSidebar (server component)
│   ├── page.tsx                ← "Informations personnelles" (ATHD-01)
│   ├── securite/page.tsx       ← password change (MNYS-06)
│   ├── coordonnees-bancaires/page.tsx  ← bank details (MNYS-01)
│   ├── preferences/page.tsx    ← notif prefs (ATHD-02)
│   └── kyc/page.tsx            ← KYC upload (MNYS-03)
│
├── participations/page.tsx     ← ATHD-03
├── notifications/page.tsx      ← ATHD-04
│
└── retrait/                    ← Phase 6 NEW
    ├── page.tsx                ← withdrawal form (MNYS-02)
    └── succes/page.tsx         ← withdrawal success
```

**13 new route files** — matches the phase brief (10 requirements + profil layout + two self-added success/stats routes).

### Pattern 1: Profile layout with shared sidebar (Phase 6 addition)

**What:** A nested layout at `src/app/(authed)/profil/layout.tsx` that renders the Banani-style 2-column shell (left sidebar = ProfileSidebar, right = `{children}`). Every page under `/profil/**` inherits it.

**Why a layout, not per-page composition:** Avoids 5× duplication; Next.js App Router's nested layouts are exactly this use case; active-tab highlighting is computed server-side from `usePathname()` (client island) or `headers().get("x-invoke-path")` (server-side).

**Shape:**

```tsx
// src/app/(authed)/profil/layout.tsx — server component
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileSidebar } from "@/components/layout/ProfileSidebar";
// fetchSellerFromCookie reused from (authed)/layout.tsx — extract to src/lib/auth-server.ts in T0
export default async function ProfilLayout({ children }) {
  const seller = await fetchSellerFromCookie();
  if (!seller) redirect("/connexion?next=/profil");
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[280px_1fr]">
      <aside><ProfileSidebar seller={seller} /></aside>
      <main>{children}</main>
    </div>
  );
}
```

**ProfileSidebar** (new client component at `src/components/layout/ProfileSidebar.tsx`):
- Profile card (avatar, name, email, KYC pill)
- 4 nav items + divider + logout (matches screen 17 sidebar inventory)
- Active state via `usePathname()` — must be a client component ("use client")
- Uses the Phase 3 `Avatar` primitive and Phase 3 `SidebarNav` primitive as its base (see `src/components/layout/SidebarNav.tsx:16-49` — it already accepts `{label, href, icon, active}[]` and has the active-pill styling)

**Pitfall:** The Phase 3 `SidebarNav` primitive uses `bg-pink` for active state (`SidebarNav.tsx:31`) which matches Banani's `bg-blue-50/50`. Good — no primitive change needed.

### Pattern 2: Single-page withdrawal form with inline PIN

**Why single page (not multi-step):** Banani's wireframe is a single 1-page layout. Backend POST accepts everything in one payload. Multi-step creates draft-persistence complexity we don't need.

**Shape:**

```
┌─ /retrait (client component) ─────────────┐
│ 1. Load GET /api/withdrawals/balance       │  on mount
│ 2. If kycStatus !== APPROVED → blocked UI  │  CTA to /profil/kyc
│ 3. If !hasWithdrawalPin → blocked UI       │  CTA to /profil/securite
│ 4. If balance === 0 → empty state          │
│ 5. Else render form:                       │
│    - Amount input (prefilled max)          │
│    - Account radio cards (Wave/Orange)     │
│    - PIN 4-input group (inline)            │
│    - Summary block                         │
│    - Submit CTA                            │
│ 6. On submit:                              │
│    - POST /api/withdrawals { amount, phone,│
│      provider, recipientName, withdrawalPin}│
│    - 403 KYC → redirect /profil/kyc        │
│    - 400 PIN_REQUIRED → inline error       │
│    - 403 wrong PIN → shake PIN input       │
│    - 429 too many → toast + CTA dashboard  │
│    - 201 → router.replace("/retrait/succes?│
│      ref=...&amount=...")                  │
└────────────────────────────────────────────┘
```

**PIN input:** `<input maxLength={1} inputMode="numeric" pattern="[0-9]" />` × 4 (NOT 6), auto-advance + backspace + paste. Reuse the Phase 5 OTP pattern from `/verification-email` (must exist per 05-01 summary — D-10 pattern).

### Pattern 3: Cagnotte edit as single-page form

**Why not reuse the wizard:** Wizards are optimized for first-time creation (multi-step, draft persistence, beating back overwhelm). Edit is a "change 1-2 fields" task where a flat form is faster + familiar. The cover/description/dates fields are already rendered in `/tableau-de-bord/nouvelle/{subtype}/etape-{1,2,3}` — we **copy the field components** (not reuse the step shell).

**Shape:**
```
/tableau-de-bord/cagnottes/[slug]/modifier
  - Server: GET /api/cagnottes/:slug (public endpoint, returns full block)
  - Server: verify owner (slug match to seller.slug OR block.sellerId)
  - Client: form with title, description, cover, goal, endDate, suggestedAmounts, hideAmount, hideDonors
  - NO slug field
  - NO visibility toggle (v2 — changing visibility mid-flight is a privacy footgun)
  - NO subtype toggle (locked by Phase 1 superRefine after first PAID order)
  - Submit: PUT /api/blocks/:id { title, config }
  - Success: toast + router.refresh() to re-fetch
```

### Pattern 4: Cagnotte stats as pure CSS bar chart

**Why CSS and not a lib:** `no new deps` rule. A 30-day timeline bar chart is ~60 LOC of plain Tailwind. Data source:

```
GET /api/cagnottes/:slug/participants?limit=50
  → reduce to { [dateStr]: count, ... }
  → render 30 bars with `height: ${(count/max)*100}%`
```

The bars are `<div class="flex-1 bg-primary" style={{ height: ... }}>`. No SVG, no canvas.

KPI row: uses Phase 3 `KpiCard` primitive (already shipped per FE-B). Metrics:
- Total collecté (from `/progress`)
- Nombre de dons (from `/progress`)
- Don moyen (computed client-side: `collected / donorCount`)
- Taux d'atteinte (computed: `collected / goal * 100`)

### Anti-Patterns to Avoid

- **Don't rebuild `notification.data` parsing on every row** — compute once at list-transform time, cache in local state.
- **Don't call `/api/auth/me` from every page** — `(authed)/layout.tsx` already provides the seller via server component; pass down via props OR re-fetch only when mutating.
- **Don't invalidate `useApi()` cache with a raw key** — use `invalidateCache(path)` helper. Multiple Phase 6 mutations (profile save, prefs toggle, withdrawal) will need this.
- **Don't POST `email` in profile form** — backend `updateProfileSchema` does NOT include `email` (verified `routes/sellers.ts:26-72`) so it would silently drop, but the grep check should catch it anyway.
- **Don't forget `x-csrf-token` on the KYC upload** — `POST /api/upload` requires CSRF (`routes/upload.ts:82`), frontend must pull from `localStorage` per the Phase 5 upload helper pattern (see `_uploadCover.ts` referenced in 05-02 summary).

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Client form state | A `useForm` hook | Plain `useState` per field | Phase 3/5 precedent; wizards work fine without react-hook-form |
| Debounced PATCH on toggle | A `useDebounce` hook library | 1 `setTimeout` in a `useRef` (~8 LOC) | 1 use site |
| Phone country select | A `react-phone-input` lib | Static `+221` badge (locked country) | D-02 |
| OTP input | A `react-otp-input` lib | 4 `<input maxLength={1}>` with auto-advance (Phase 5 precedent D-10) | D-10 |
| Chart | Recharts / Chart.js | CSS bar chart (~60 LOC) | No new deps |
| Relative time | `date-fns` | Existing `formatRelativeTime()` at `src/lib/format.ts:49` | Already shipped |
| CSRF | New abstraction | Existing `api()` wrapper at `src/lib/api.ts` auto-injects `x-csrf-token` | FNDN rule — do not modify api.ts |
| Avatar upload | New multipart helper | Copy the Phase 5 `_uploadCover.ts` pattern | Ring 2 island precedent |
| PIN-set screen | "Security" full flow in Phase 6 | Existing `POST /api/sellers/withdrawal-pin` (`routes/sellers.ts:936`) reached from `/profil/securite` — the page shows both "Changer le mot de passe" + "Code de retrait" sections | 1 page, 2 forms |

**Key insight:** Phase 6 is **pure glue code**. Every money-path backend call already exists. The only new backend code is 33 lines (the participations endpoint + the 3-line prefs schema widening + a smoke-test assertion). Everything else is 13 Next.js page files + 2 new layout/shell components + 1 new segment parser.

---

## Common Pitfalls

### Pitfall 1 — Shipping profile form without KYC state variants
**What goes wrong:** Banani only shows "Identité vérifiée" pill. Our users exist in 4 states: NONE, PENDING, APPROVED, REJECTED. Shipping only APPROVED means NONE users see a green "verified" pill — lie + onboarding gap.
**Prevention:** Design all 4 states up front in `ProfileSidebar`:
- NONE → orange "Non vérifiée" pill + "Vérifier mon identité" CTA link to `/profil/kyc`
- PENDING → blue "Vérification en cours" pill, no CTA
- APPROVED → green "Identité vérifiée" pill, no CTA (matches Banani)
- REJECTED → red "Vérification refusée" pill + "Soumettre de nouveaux documents" CTA link to `/profil/kyc`
**Warning sign:** KYC pill hardcodes `bg-green-50` regardless of seller state.

### Pitfall 2 — Withdrawal screen flashes form before gating
**What goes wrong:** Page renders the form client-side, THEN fires `GET /balance`, gets `kycStatus: NONE`, then replaces with the blocked state. User sees a 500ms flash of the form.
**Prevention:** Fetch balance **server-side** in the page server component via `cookies()` + raw fetch (Phase 5 pattern at `(authed)/layout.tsx:32-48`), and only render the form if `kycStatus === "APPROVED" && hasWithdrawalPin && balance > 0`. Branch on server-side results.
**Warning sign:** `/retrait/page.tsx` starts with `"use client"`.

### Pitfall 3 — `PUT /api/blocks/:id` is PUT, not PATCH
**What goes wrong:** Developer writes `api("/api/blocks/" + id, { method: "PATCH" })`, gets 404 or silent fail.
**Prevention:** Verified via grep at `routes/blocks.ts:450`. Use `method: "PUT"`. Same for `PUT /api/sellers/profile` (`routes/sellers.ts:86`) and `PUT /api/auth/change-password` (`routes/auth.ts:702`).
**Warning sign:** Any `method: "PATCH"` in 06-02 code.

### Pitfall 4 — `POST /api/upload` is multipart, not JSON
**What goes wrong:** Developer uses `api("/api/upload", { method: "POST", body: JSON.stringify({ file }) })` and fights CORS/parsing for an hour.
**Prevention:** Copy the Phase 5 `_uploadCover.ts` helper verbatim — it constructs `FormData`, calls raw `fetch`, injects CSRF header from `localStorage.getItem("izy-csrf")`. The KYC upload + avatar upload both use this pattern.
**Warning sign:** `api("/api/upload")` anywhere in Phase 6 code.

### Pitfall 5 — Notification template currency drift
**What goes wrong:** `templates.ts:28-30` formats FCFA with a regular space via `formatFcfa()`. If a dispatcher bypasses the template and writes `body` directly with `Intl.NumberFormat("fr-FR")` (U+202F narrow no-break space), the segment parser won't match `\d[\d\s]*FCFA` because \s doesn't match U+202F by default in JS regex without the `u` flag.
**Prevention:** The segment parser MUST use the `u` flag: `/(\d[\d\u202f\u00a0 ]*FCFA)/gu`. Smoke-test with both templates.ts (regular space) and Intl output (U+202F) as fixtures.
**Warning sign:** Segments fail to bold amounts on some notifications but not others.

### Pitfall 6 — KYC document preview direct-to-R2 leak
**What goes wrong:** Developer renders preview with `<img src={kycIdUrl} />` where `kycIdUrl` is the raw R2 URL from `POST /api/upload` response. Direct R2 URLs bypass auth — anyone with the URL can download.
**Prevention:** CLAUDE.md rule — always use `/api/files/:key` proxy. `POST /api/upload` (verified line 82) likely rewrites responses to proxy URLs, but double-check in 06-02 T3 implementation with a curl on the response. The KYC form previews the file via the key, never the URL.
**Warning sign:** A raw `r2.dev` or `cloudflarestorage.com` URL anywhere in Phase 6 components.

### Pitfall 7 — PIN is 4 digits, wizard pattern assumes 6
**What goes wrong:** Developer copies the Phase 5 verify-email OTP component (6 inputs, Phase 5 D-10) and doesn't change `maxLength`/count. User types 4 digits, form won't submit, PIN reset flow breaks.
**Prevention:** Verified at `routes/sellers.ts:932` — `pin: z.string().length(4)`. PIN component in Phase 6 = 4 boxes, NOT 6. Extract a shared `<OtpInput length={4|6} />` primitive if tempted — or just duplicate.
**Warning sign:** `Array.from({ length: 6 })` in the withdrawal PIN section.

### Pitfall 8 — `/profil/securite` mixing password and PIN flows
**What goes wrong:** User changes password AND sets PIN in one form, one submit. Backend doesn't support that atomic transaction, half-success leaves a confusing state.
**Prevention:** Two independent `<form>` elements on the same page. Each has its own submit button, its own loading state, its own error toast. Verified by the fact that there are 2 separate endpoints: `PUT /api/auth/change-password` and `POST /api/sellers/withdrawal-pin`.
**Warning sign:** Single `handleSubmit` handling both.

### Pitfall 9 — Notifications feed auto-mark-read racing the count badge
**What goes wrong:** User opens `/notifications`, client fires `POST /mark-read { all: true }`, badge in DashboardNavbar still reads `unreadCount > 0` because it was fetched on the previous layout render.
**Prevention:** After successful `mark-read`, call `router.refresh()` to re-render the server layout, OR emit a custom event that DashboardShell listens to and re-fetches `/api/notifications/count`. Simpler: set the badge to `0` optimistically in the client component.
**Warning sign:** User sees "3" badge after marking all read, until next page navigation.

### Pitfall 10 — Bank details form shows Free Money but backend rejects it
**What goes wrong:** Banani shows Wave + Orange only; CLAUDE.md says we support Wave + Orange + Free. But `routes/withdrawals.ts:42` locks `provider: z.enum(["wave_money", "orange_money"])`. Shipping a Free Money option in the UI causes a 400 on submit.
**Prevention:** Frontend provider list MUST match backend enum verbatim. Free Money is not supported in v1 for payouts (only for inbound charges). Document as **D-22** if the picker is reduced to 2 options.
**Warning sign:** `{ value: "free_money", label: "Free Money" }` in a dropdown.

---

## Phase 3 Primitive Gap Audit

Checked `src/components/ui/index.ts` — Phase 3 shipped all 18 primitives we need:

| Primitive | Shipped? | File | Used by Phase 6 |
|-----------|----------|------|----------------|
| `Input` | ✅ | Input.tsx | profile form, cagnotte edit, security, bank details |
| `Textarea` | ✅ | Textarea.tsx | cagnotte edit (description) |
| `Select` | ✅ | Select.tsx | bank details (provider picker) |
| `DatePicker` | ✅ | DatePicker.tsx | cagnotte edit (endDate), profile (birthDate if kept) |
| `ImageUpload` | ✅ | ImageUpload.tsx | KYC upload (ID + selfie), cagnotte edit (cover), profile (avatar) |
| `RadioCard` | ✅ | RadioCard.tsx | withdrawal (account picker) |
| `Toggle` | ✅ | Toggle.tsx | notif prefs (6 toggles), cagnotte edit (hideAmount, hideDonors) |
| `Checkbox` | ✅ | Checkbox.tsx | (none in Phase 6) |
| `Button` | ✅ | Button.tsx | everywhere |
| `Badge` | ✅ | Badge.tsx | participations (status pill), profile (KYC pill) |
| `Avatar` | ✅ | Avatar.tsx | ProfileSidebar, DashboardNavbar, participations (organizer thumbnails) |
| `ProgressBar` | ✅ | ProgressBar.tsx | cagnotte stats, cagnotte edit preview |
| `KpiCard` | ✅ | KpiCard.tsx | cagnotte stats |
| `Pagination` | ✅ | Pagination.tsx | participations (if >50 rows — probably not v1), notifications feed (via Charger-plus alternative) |
| `Tabs` | ✅ | Tabs.tsx | notifications feed (Toutes / Non lues) |
| `Modal` | ✅ | Modal.tsx | KYC rejection reason display, withdrawal confirmation |
| `EmptyState` | ✅ | EmptyState.tsx | participations empty, notifications empty, bank details empty |
| `Toast` | ✅ | Toast.tsx (`useToast`) | every mutation success/error |

**No Phase 3 gaps.** Everything needed is in `src/components/ui/index.ts`.

### Phase 3 composed blocks

| Block | Shipped? | File | Used by Phase 6 |
|-------|----------|------|----------------|
| `DashboardNavbar` | ✅ | `src/components/layout/DashboardNavbar.tsx:22` | every authed page (via Phase 5 `DashboardShell`) |
| `SidebarNav` | ✅ | `src/components/layout/SidebarNav.tsx:16` | ProfileSidebar composition base |
| `NotificationItem` | ✅ | `src/components/notifications/NotificationItem.tsx:59` | notifications feed |
| `CampaignCard` | ✅ | Phase 3 shipped | cagnotte stats, cagnotte edit preview |

**Note on NotificationItem:** Current component signature expects `{title, subtitle, type, createdAt, isRead}`. Banani's design implies **body with rich spans**, not a title/subtitle split. Two options:
1. Extend `NotificationItem` to accept a `bodyNode: ReactNode` prop in Phase 6 (Ring 2 addition — needs the primitive purity check)
2. Fork into a new `NotificationRow` specific to the feed page, keep the existing `NotificationItem` for the dashboard bell dropdown (which doesn't show rich body)

**Recommendation:** Option 2 — create `NotificationRow` in `src/components/notifications/NotificationRow.tsx` for the feed, keep `NotificationItem` untouched for any dropdown use. Lower risk, no breaking change.

---

## Route Compositions (13 routes)

### Route 1 — `/profil` (ATHD-01)
**File:** `src/app/(authed)/profil/page.tsx`
**Type:** Server component + client form island
**Composition:** Inherits `profil/layout.tsx` (ProfileSidebar). Renders white card with grid form (Prénom, Nom, Email readonly, Phone locked to +221, optional Date de naissance — drop if no column).
**Data source:** Server-fetch `GET /api/auth/me` (reuse Phase 5 helper)
**Mutations:** `PUT /api/sellers/profile` (verified `routes/sellers.ts:86`) — send `{displayName, phone, phoneCountry, avatarUrl}` only. **D-09** means `displayName` is `firstName + " " + lastName` client-merged.
**State shape:** `{firstName, lastName, phone, avatarUrl}` local state; email is static prop from server.
**Error states:** field-level inline errors from zod response; toast for unexpected 500.

### Route 2 — `/profil/securite` (MNYS-06)
**File:** `src/app/(authed)/profil/securite/page.tsx`
**Type:** Client component (2 forms)
**Composition:**
- Form 1 "Mot de passe" — 3 inputs (current, new, confirm) → `PUT /api/auth/change-password`
- Form 2 "Code de retrait" — 4-digit PIN input + "Définir/Modifier" CTA → `POST /api/sellers/withdrawal-pin` (includes `currentPin` field if one already set)
- Below: "Code de retrait oublié ?" link → triggers `POST /api/sellers/withdrawal-pin/forgot` → shows 4-digit code entry field → `POST /api/sellers/withdrawal-pin/reset`
**Data source:** `GET /api/sellers/withdrawal-pin/status` to know if "Définir" or "Modifier" label
**Error states:** "Mot de passe incorrect" (toast), "L'ancien code est incorrect" (inline), "Trop de tentatives" (toast for Redis lockout).

### Route 3 — `/profil/coordonnees-bancaires` (MNYS-01)
**File:** `src/app/(authed)/profil/coordonnees-bancaires/page.tsx`
**Type:** Server component + client form island
**Composition (simplified per D-18):** Single white card with 4 fields:
- `payoutProvider` — Select with options `wave_money` / `orange_money` only (NO Free Money — backend enum)
- `payoutPhone` — Input with `+221` prefix badge
- `payoutName` — Input "Nom du titulaire du compte"
- `payoutCountry` — hidden constant `"SN"` (or a country Select if v2)
**Data source:** Server-fetch `GET /api/withdrawals/balance` — returns these 4 fields pre-filled
**Mutations:** `PUT /api/sellers/profile { payoutPhone, payoutProvider, payoutName, payoutCountry }`
**Info notice:** Keep Banani's "Sécurité de vos coordonnées" copy (phone numbers stored plaintext per `cleanPhoneForStorage` at `sellers.ts:147` — CLAUDE.md has no encryption mandate for payout phones).

### Route 4 — `/profil/preferences` (ATHD-02)
**File:** `src/app/(authed)/profil/preferences/page.tsx`
**Type:** Client component
**Composition:** 3 groups × Banani toggle layout (6 total: newParticipation ON, milestoneReached ON, endingSoonReminder ON, organizerUpdates ON, paymentReceipts OFF, newsletter OFF)
**Data source:** `GET /api/notifications/prefs` on mount
**Mutations:** `PATCH /api/notifications/prefs` debounced 500ms per toggle change
**State shape:** `{donations: boolean, milestones: boolean, endingSoon: boolean, organizerUpdates: boolean, paymentReceipts: boolean, newsletter: boolean}` — maps Banani label to backend key
**Gotcha:** Backend schema has `payouts`, `kyc`, `cagnotteEnded`, `donationMessages` too — we don't expose them, but existing seller data may have them set. Pass-through unchanged via the merge at `routes/notifications.ts:175`.
**UX:** Toast "Préférences enregistrées" after each successful PATCH. Re-check the v1 Banani design — if the designer wants a save button, flip to explicit mode.

### Route 5 — `/profil/kyc` (MNYS-03)
**File:** `src/app/(authed)/profil/kyc/page.tsx`
**Type:** Server component + client form island
**Composition:**
- Status pill at top based on `Seller.kycStatus` (NONE / PENDING / APPROVED / REJECTED)
- NONE / REJECTED → show 3 fields (`fullName`, `idUrl` via ImageUpload, `selfieUrl` via ImageUpload) + submit CTA
- PENDING → blocked state "Ta vérification est en cours" + dated from `kycSubmittedAt`
- APPROVED → blocked state "Identité vérifiée" + CTA back to profile
**Data source:** Server-fetch `/api/auth/me` (returns `kycStatus, kycSubmittedAt` via `Seller` shape)
**Mutations:**
  - `POST /api/upload` (raw `FormData` fetch, CSRF from localStorage) for each image → returns proxy URL `/api/files/:key`
  - `POST /api/sellers/kyc { fullName, idUrl, selfieUrl }` to submit (verified `routes/sellers.ts:270`, zod at line 264)
**Preview:** Show the uploaded image preview via the returned proxy URL (NOT raw R2 URL — see Pitfall 6).
**Error states:** Banani's 10MB limit (from `POST /api/upload` policy — verify in upload.ts); file type errors.

### Route 6 — `/participations` (ATHD-03)
**File:** `src/app/(authed)/participations/page.tsx`
**Type:** Server component + client interactions for mobile-card toggle
**Composition:**
- `DashboardNavbar` (via `DashboardShell`, already shipped)
- H1 "Mes participations" + subtitle
- Table (desktop ≥ lg) with 5 columns: Cagnotte (thumbnail + title + organizer), Date, Montant, Statut, Actions
- Mobile card list (< lg)
- Empty state "Vous n'avez encore participé à aucune cagnotte" + CTA "Découvrir les cagnottes" → `/` (since all-cagnottes page is deferred per D-06)
**Data source:** `GET /api/sellers/me/participations` (NEW — see Gap 1)
**Response shape:**
```json
{
  "items": [{ id, reference, amount, customerName, isAnonymous, createdAt, paidAt,
              block: { id, slug, title, isActive, config, seller: { displayName, slug } } }],
  "nextCursor": null,
  "hasMore": false
}
```
**Row rendering:**
- Cagnotte thumbnail from `block.config.cover` (R2 proxy URL)
- Title = `block.title`, organizer = `block.seller.displayName`
- Date = `formatRelativeTime(paidAt ?? createdAt)`
- Amount = `formatPrice(amount)` → `"15 000 FCFA"`
- Status pill: `block.isActive ? "En cours" : "Terminée"` (bg-green-500 vs bg-gray-500)
- Actions: eye icon → `/c/${block.slug}` (new tab). No receipt button (D-19).
**Pagination:** Cursor pagination reuses the Phase 4 D-06 "Charger plus" pattern.

### Route 7 — `/notifications` (ATHD-04)
**File:** `src/app/(authed)/notifications/page.tsx`
**Type:** Server component fetching first page + client island for tab filter + mark-read actions
**Composition:**
- H1 "Vos notifications" + subtitle
- Right-aligned CTA "Tout marquer comme lu"
- White card containing:
  - Tab strip: "Toutes (N)" / "Non lues (N)" — uses Phase 3 `Tabs` primitive
  - Notification list (divider-separated rows) via new `NotificationRow` compound
  - Footer "Charger plus" button if `nextCursor`
- Empty state "Aucune notification pour l'instant"
**Data source:**
- Server: `GET /api/notifications?limit=20` → `{items, nextCursor, hasUnread}`
- Server: `GET /api/notifications/count` → `{total, unread}` for tab counts
**Mutations:**
- `POST /api/notifications/mark-read { ids: [...] }` on row click (individual)
- `POST /api/notifications/mark-read { all: true }` on top-right button
**Rich content rendering:** New `parseBody(notification)` helper in `src/lib/notifications/parseBody.ts`:
  ```ts
  // Per-type handler, not universal regex. Uses notification.data for structured fields.
  function parseBody(n: Notification): ReactNode[] {
    switch (n.type) {
      case "DONATION_RECEIVED": return renderDonation(n); // bold name + bold amount + italic title
      case "MILESTONE_REACHED": return renderMilestone(n);
      // ... etc for 9 types
    }
  }
  ```
**Tab state:** URL search param `?filter=unread` (server-rendered; client updates via `router.push`).
**Note:** Banani has 2 tabs, not 4. Ship 2 — the task brief confirmed this.

### Route 8 — `/retrait` (MNYS-02)
**File:** `src/app/(authed)/retrait/page.tsx`
**Type:** Server component (gates) + client form island
**Server-side gates (computed before rendering):**
1. If `balance.kycStatus !== "APPROVED"` → render `<KycBlocked>` with CTA to `/profil/kyc`
2. Elif `balance.withdrawalBlocked` → render `<WithdrawalBlocked reason={withdrawalBlockReason}/>`
3. Elif `!balance.hasWithdrawalPin` → render `<PinSetupRequired>` with CTA to `/profil/securite`
4. Elif `balance.balance <= 0` → render `<EmptyState>` "Tu n'as pas encore de fonds à retirer"
5. Else render the form
**Composition (form branch):**
- Back link "Retour au tableau de bord" (no per-cagnotte back per D-20)
- Navy header banner "Retirer mes fonds" + subtitle
- Source strip: "Solde disponible" + `formatPrice(balance.balance)` + "Max" chip
- Amount input prefilled with max, editable
- Account picker: RadioCards for each pre-filled account from `balance.payoutPhone/payoutProvider` — currently just **1 option** (the stored one). Banani shows 2 — but our backend has 1 payout account. Renders 1 RadioCard marked selected + a dashed "Ajouter un compte" button linking to `/profil/coordonnees-bancaires`.
- PIN 4-input group (4 digits per `sellers.ts:932` — NOT 6)
- Summary block: montant, frais (0 — see D-23 below), net
- CTA "Confirmer le retrait" (disabled until PIN === 4 digits)
**Data source (server-side):** `GET /api/withdrawals/balance` via raw fetch with cookie
**Mutations:** `POST /api/withdrawals { amount, phone, provider, recipientName, withdrawalPin }`
**Error handling:**
| Status | Body | Action |
|--------|------|--------|
| 201 | `{withdrawal, success: true}` | `router.replace("/retrait/succes?ref=...&amount=...")` |
| 400 | `{code: "PIN_REQUIRED"}` | inline error "Le code de retrait est requis" |
| 403 | PIN incorrect | shake PIN inputs + clear + error toast |
| 403 | KYC | redirect `/profil/kyc` |
| 409 | retrait en cours | error toast, link to withdrawal history |
| 422 | Bictorys failure (`parseBictorysPayoutError`) | inline error, allow retry |
| 429 | rate limit / daily cap | blocked state "Tu as atteint la limite de 10 retraits par jour" |
| 503 | circuit breaker | error toast "Service temporairement indisponible" |

**D-23 (new):** Fee row is hardcoded to "Gratuit" in Banani. Bictorys doesn't expose fees in the payout response (verified `routes/withdrawals.ts:339` — `merchantFee` comes back from Bictorys, default 0). Frontend shows "Frais de virement: Gratuit" when `merchantFee === 0`. Same-day fees not an issue for v1 Wave/Orange.

### Route 9 — `/retrait/succes`
**File:** `src/app/(authed)/retrait/succes/page.tsx`
**Type:** Client component (reads URL params) OR server component with searchParams
**Composition:** Banani's withdrawal-success screen — pulsing icon + H1 "Retrait en cours !" + description with amount + transaction summary + info notice + 2 CTAs (Retour tableau / Aller au tableau)
**Data source:** URL search params `?ref=payout_XX&amount=450000&provider=wave_money` from the previous POST response
**Animation:** Use `animate-ping` CSS utility (Tailwind built-in, no new dep) — matches Banani literal.

### Route 10 — `/tableau-de-bord/cagnottes/[slug]/stats` (MNYS-04)
**File:** `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/stats/page.tsx`
**Type:** Server component
**Composition:**
- Back link "Retour au tableau de bord"
- H1 "Statistiques — {cagnotte.title}"
- KPI row (4 `KpiCard`s): Total collecté, Donateurs, Don moyen, Taux d'atteinte
- Timeline section: CSS bar chart (30 days), each bar = donations that day
- Participants list: top 10 recent donors via `GET /api/cagnottes/:slug/participants?limit=10` — reuse Phase 4 patterns
- Top message: grab the first non-private message from participants, render in italic blockquote
**Data source (server-side):**
- `GET /api/cagnottes/:slug` — returns block + progress
- `GET /api/blocks/:id/progress` — numerical totals
- `GET /api/cagnottes/:slug/participants?limit=50` — for timeline + messages
**Owner check:** The server component must verify `block.seller.slug === authed seller.slug` — reject with 404 if not the owner. (Public stats for other people's cagnottes is a privacy concern; defer to v2.)

### Route 11 — `/tableau-de-bord/cagnottes/[slug]/modifier` (MNYS-05)
**File:** `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/page.tsx`
**Type:** Server component (fetch + owner gate) + client form island
**Composition:** Single-page flat form editing:
- `title` (Input)
- `config.description` (Textarea)
- `config.cover` (ImageUpload with current cover preview)
- `config.goalAmount` (Input type=number with FCFA suffix)
- `config.endDate` (DatePicker)
- `config.suggestedAmounts` (4 Input[number] in a grid)
- `config.hideAmount` (Toggle)
- `config.hideDonors` (Toggle)
- CTA "Enregistrer les modifications"
- Secondary CTA "Supprimer la cagnotte" (opens Modal → `DELETE /api/blocks/:id`)
**NOT editable:**
- `slug` (v2)
- `subtype` (Phase 1 superRefine locks it after first PAID)
- `visibility` (v2 — privacy footgun mid-flight)
- `occasion` / `cause` / `beneficiary` (semantically bound to subtype)
**Mutations:** `PUT /api/blocks/:id { title, config: {...merged...} }` — verified `routes/blocks.ts:450`. Grep guard: `grep -E '"slug"' src/app/(authed)/tableau-de-bord/cagnottes/\\[slug\\]/modifier/` MUST be empty.
**Error states:** Zod validation errors from the `fundraiserBlockConfigSchema` surfaced inline.

### Route 12 — `/profil/layout.tsx`
**New file** wrapping the 5 profile sub-routes. Server component. See Pattern 1 above.

### Route 13 — `src/components/layout/ProfileSidebar.tsx`
**New client component.** Composes Phase 3 `SidebarNav` primitive with the profile card header. See Pattern 1.

---

## Backend Endpoints Consumed — Full Contract Map

| Route | File:line | Auth | CSRF | Used by Phase 6 page |
|-------|-----------|------|------|----------------------|
| `GET /api/auth/me` | `routes/auth.ts:443` | ✅ | — | every page via layout |
| `PUT /api/auth/change-password` | `routes/auth.ts:702` | ✅ | ✅ | `/profil/securite` |
| `PUT /api/sellers/profile` | `routes/sellers.ts:86` | ✅ | ✅ | `/profil`, `/profil/coordonnees-bancaires` |
| `POST /api/sellers/kyc` | `routes/sellers.ts:270` | ✅ | ✅ | `/profil/kyc` |
| `GET /api/sellers/withdrawal-pin/status` | `routes/sellers.ts:917` | ✅ | — | `/profil/securite` |
| `POST /api/sellers/withdrawal-pin` | `routes/sellers.ts:936` | ✅ | ✅ | `/profil/securite` |
| `POST /api/sellers/withdrawal-pin/forgot` | `routes/sellers.ts:991` | ✅ | ✅ | `/profil/securite` |
| `POST /api/sellers/withdrawal-pin/reset` | `routes/sellers.ts:1063` | ✅ | ✅ | `/profil/securite` |
| **NEW** `GET /api/sellers/me/participations` | (to be added ~320) | ✅ | — | `/participations` |
| `GET /api/blocks/:id` | `routes/blocks.ts:154` | ✅ | — | `/tableau-de-bord/cagnottes/[slug]/modifier` |
| `PUT /api/blocks/:id` | `routes/blocks.ts:450` | ✅ | ✅ | cagnotte edit |
| `DELETE /api/blocks/:id` | `routes/blocks.ts:550` | ✅ | ✅ | cagnotte edit (delete CTA) |
| `GET /api/blocks/:id/progress` | `routes/blocks.ts:173` | public | — | cagnotte stats |
| `GET /api/cagnottes/:slug` | `routes/cagnottes.ts:207` | public | — | cagnotte stats, cagnotte edit (prefill) |
| `GET /api/cagnottes/:slug/participants` | `routes/cagnottes.ts:312` | public | — | cagnotte stats |
| `GET /api/notifications` | `routes/notifications.ts:34` | ✅ | — | `/notifications` |
| `GET /api/notifications/count` | `routes/notifications.ts:84` | ✅ | — | `/notifications`, DashboardShell (bell badge) |
| `POST /api/notifications/mark-read` | `routes/notifications.ts:108` | ✅ | ✅ | `/notifications` |
| `GET /api/notifications/prefs` | `routes/notifications.ts:141` | ✅ | — | `/profil/preferences` |
| `PATCH /api/notifications/prefs` | `routes/notifications.ts:165` | ✅ | ✅ | `/profil/preferences` (SCHEMA WIDENED +3 keys in 06-01 T1) |
| `GET /api/withdrawals` | `routes/withdrawals.ts:48` | ✅ | — | (not used — v1 defers withdrawal history page) |
| `GET /api/withdrawals/balance` | `routes/withdrawals.ts:95` | ✅ | — | `/retrait` (server-side fetch for gates + prefill) |
| `POST /api/withdrawals` | `routes/withdrawals.ts:159` | ✅ | ✅ | `/retrait` (submit) |
| `POST /api/upload` | `routes/upload.ts:82` | ✅ | ✅ (manual multipart) | `/profil/kyc`, `/profil` (avatar), cagnotte edit (cover) |
| `GET /api/files/:key` | `routes/files.ts:12` | public | — | render uploaded images everywhere |

---

## Runtime State Inventory

This is a **greenfield additive** phase (adding routes, not renaming/migrating). The only new backend state is:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None — no data renames or migrations | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets / env vars | None — reuses existing `BICTORYS_*`, `UPSTASH_*`, `R2_*` | None |
| Build artifacts | None new | None |

**Schema changes:** ZERO migrations. The only backend touch is a route addition (`GET /api/sellers/me/participations`) and a zod schema widening by 3 optional keys — neither requires `prisma migrate dev`.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Neon Postgres | all backend | ✓ | Existing | — |
| Upstash Redis | rate limits | ✓ | Existing | — |
| Cloudflare R2 | KYC upload, avatar upload, cagnotte cover edit | ✓ | Existing | — |
| Bictorys payouts | `/retrait` submit | ✓ | Existing `BICTORYS_PRIVATE_KEY` | — (dev may 4xx, that's OK, KYC/PIN gates fire before) |
| Resend | password-change email confirmation (if any) | ✓ | Existing | — |

**Missing with no fallback:** None.
**Missing with fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **smoke-test.ts** harness (no Vitest/Jest configured) |
| Config file | `backend/scripts/smoke-test.ts` — 15 assertions today |
| Quick run command | `cd backend && npx tsx scripts/smoke-test.ts` |
| Full suite command | same (there is only one) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| ATHD-01 | Profile form saves and re-renders | manual | n/a | — |
| ATHD-02 | Prefs toggle persists | manual | n/a | — |
| ATHD-03 | Participations endpoint returns donor's own orders | unit | `tsx scripts/smoke-test.ts` (new assertion) | ❌ Wave 0 |
| ATHD-04 | Notifications feed paginates + marks read | integration | `tsx scripts/smoke-test.ts` assertions 15 (already there) | ✅ |
| MNYS-01 | Bank details PUT round-trips | manual | n/a | — |
| MNYS-02 | Withdrawal submit with valid PIN + KYC | integration | smoke-test #14 (already there) | ✅ |
| MNYS-03 | KYC upload → PENDING status | integration | add to smoke-test | ❌ Wave 0 |
| MNYS-04 | Cagnotte stats aggregates | manual | n/a | — |
| MNYS-05 | Cagnotte edit PUT rejects slug | unit | `grep -E '"slug"' src/app/(authed)/tableau-de-bord/cagnottes/\\[slug\\]/modifier/` must be empty | ✅ (grep guard) |
| MNYS-06 | Password change uses PUT verb | unit | `grep "PUT" src/app/(authed)/profil/securite/` must match | ✅ (grep guard) |

### Sampling Rate
- **Per task commit:** `cd backend && npm run build` (0 TS errors) + `npm run build` (frontend, 0 errors)
- **Per wave merge:** `tsx backend/scripts/smoke-test.ts` → 15+ assertions GREEN
- **Phase gate:** full smoke-test GREEN + manual 13-route click-through on dev server

### Wave 0 Gaps
- [ ] Add smoke-test assertion for `GET /api/sellers/me/participations` (seed donor order → fetch → assert shape)
- [ ] Add smoke-test assertion for `POST /api/sellers/kyc` happy path (submit → kycStatus === "PENDING")
- [ ] Add grep guard that `src/app/(authed)/tableau-de-bord/cagnottes/` never references the backend `slug` field in a write context
- [ ] Add grep guard that `src/app/(authed)/profil/securite/` uses `method: "PUT"` for change-password

---

## Security Domain (ASVS)

### Applicable ASVS Categories

| Category | Applies | Standard control |
|----------|---------|------------------|
| V2 Authentication | yes | Existing bcrypt 12 + JWT httpOnly cookies (CLAUDE.md) |
| V3 Session Management | yes | Existing `izy-token` 15min access + 7d refresh, re-query seller on every request (middleware/auth.ts) |
| V4 Access Control | yes | `requireAuth` on every new endpoint; cagnotte edit + stats enforce owner check via `block.sellerId === req.seller!.sub` |
| V5 Input Validation | yes | Zod schemas in routes (existing pattern); frontend validates client-side but server is source of truth |
| V6 Cryptography | partial | No new crypto. Existing `hashPassword` (bcrypt) for PIN. AES-256-GCM (`lib/crypto.ts`) exists but not used in Phase 6. |

### Known Threat Patterns for Phase 6

| Pattern | STRIDE | Standard mitigation |
|---------|--------|---------------------|
| XSS via notification message content | Tampering | Already escaped in `templates.ts:22` via `escapeHtml`; frontend parser MUST treat `notification.data` as text (no `dangerouslySetInnerHTML`) |
| CSRF on all mutations | Tampering | `x-csrf-token` header auto-injected by `src/lib/api.ts` |
| Cross-seller mark-read | Info disclosure | Already handled at `routes/notifications.ts:123` — `where: { sellerId, id: { in } }` |
| KYC direct-R2 URL leak | Info disclosure | `/api/files/:key` proxy mandated (CLAUDE.md); Pitfall 6 |
| Cagnotte owner bypass on edit | Elevation of privilege | `routes/blocks.ts:459` already checks `existing.sellerId !== sellerId → 404` |
| Withdrawal PIN brute force | Spoofing | Redis lockout mitigated server-side (P10) |
| Password change without session refresh | Session hijack | Backend rotates JWT on password change (verified `routes/auth.ts:702`+) |
| Email change in profile form | Spoofing | Backend `updateProfileSchema` omits email; frontend grep guard ensures we never attempt it |

---

## Project Constraints (from CLAUDE.md)

- **Never use:** Framer Motion, Redux/Zustand, axios, NextAuth, localStorage-stored tokens. **→ Phase 6 strictly complies. Only CSS animations (animate-ping), React Context for Toast (already in place), native fetch via `api()`.**
- **Styling:** Tailwind v4 + navy `#172866` + pink `#FBE6ED`, Poppins headings + Inter body. **→ Reuse existing tokens + Phase 3 primitives.**
- **Mobile-first 375px, touch targets ≥ 48px.** → Tables fall back to cards below `lg`; PIN inputs are `min-h-14 min-w-14`.
- **All monetary amounts integers in FCFA, `formatPrice()` only.** → D-01 enforcement, grep guard for `€`.
- **French only, labels in `src/lib/constants.ts`.** → Add `PROFILE_LABELS`, `NOTIF_PREFS_LABELS`, `WITHDRAWAL_LABELS`, `KYC_LABELS`, `CAGNOTTE_EDIT_LABELS`, `STATS_LABELS`, `SECURITY_LABELS` namespaces.
- **Payments: Bictorys only, circuit breaker + rate limits already enforced server-side.** → Frontend just handles 422/429/503 error states.
- **`change-password` is PUT not POST.** → Verified. Grep guard.
- **Commission is creator-hidden on creation, donor-visible on payment.** → Stats page MAY show "Commission prélevée" as a static label for transparency. Edit page MUST NOT.
- **Slug rename v2.** → Grep guard on cagnotte edit.
- **KYC uploads via `/api/files/:key` proxy.** → Pitfall 6.

---

## State of the Art

Nothing new — Phase 6 is pure page assembly. No framework updates, no new patterns beyond what Phase 3/5 already established.

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side auth gates | Server AuthGuard via `cookies()` | Phase 5 (D-11) | Phase 6 inherits; no FOUC |
| `localStorage` draft | `sessionStorage` versioned | Phase 5 (D-12) | Phase 6 withdrawal form doesn't need drafts (single-page) |
| Framer Motion | CSS keyframes | CLAUDE.md + D-15 | Phase 6 success screen uses `animate-ping` |

---

## FRONTEND-DEVIATIONS.md Update List (to be added in plan execution)

| ID | Title | Plan |
|----|-------|------|
| D-18 | Single payout account per seller (v1), not multi-account CRUD | 06-02 |
| D-19 | Participations: no PDF export / receipt download (v1) | 06-01 |
| D-20 | Withdrawal is seller-level, not per-cagnotte | 06-02 |
| D-21 | Notification rich-content via client-side per-type body parser | 06-01 |
| D-22 | Payout provider picker: Wave + Orange only (no Free Money for v1 payouts) | 06-02 |
| D-23 | Withdrawal fees hardcoded "Gratuit" for Wave/Orange (backend merchantFee always 0 in v1) | 06-02 |
| D-24 | Profile KYC pill has 4 variants (NONE/PENDING/APPROVED/REJECTED), not just APPROVED | 06-01 |

---

## 2-Plan Task Breakdown Preview

### 06-01 — Authed screens (4 pages + 1 layout + 1 component + 1 backend endpoint + schema widening)

| # | Task | LOC estimate | Commit |
|---|------|--------------|--------|
| T1 | Backend prelude: `GET /api/sellers/me/participations` + widen `notificationPrefs` zod + smoke-test assertions | ~50 | feat(06-01): donor-side participations endpoint + prefs schema widening |
| T2 | `src/components/layout/ProfileSidebar.tsx` client component + `src/app/(authed)/profil/layout.tsx` server layout | ~120 | feat(06-01): profile sidebar + shared layout shell |
| T3 | `src/app/(authed)/profil/page.tsx` — ATHD-01 | ~180 | feat(06-01): /profil — personal info form |
| T4 | `src/app/(authed)/profil/preferences/page.tsx` — ATHD-02 with 6 toggles | ~150 | feat(06-01): /profil/preferences — 6-toggle notif prefs |
| T5 | `src/app/(authed)/participations/page.tsx` — ATHD-03 with table/card fallback | ~220 | feat(06-01): /participations — donor order table |
| T6 | `src/components/notifications/NotificationRow.tsx` + `src/lib/notifications/parseBody.ts` + `src/app/(authed)/notifications/page.tsx` — ATHD-04 | ~280 | feat(06-01): /notifications — feed with rich body parser |
| T7 | FRONTEND-DEVIATIONS.md D-19, D-21, D-24 entries + constants.ts namespaces | ~40 | docs(06-01): FRONTEND-DEVIATIONS + constants |
| T8 | Plan verification: build, grep guards, smoke-test | — | — |

### 06-02 — Money screens (6 pages + 1 gated flow)

| # | Task | LOC estimate | Commit |
|---|------|--------------|--------|
| T1 | `src/app/(authed)/profil/coordonnees-bancaires/page.tsx` — MNYS-01 (single-account form) | ~180 | feat(06-02): /profil/coordonnees-bancaires — payout method |
| T2 | `src/app/(authed)/profil/kyc/page.tsx` — MNYS-03 + 4-state pill | ~260 | feat(06-02): /profil/kyc — ID + selfie upload + status |
| T3 | `src/app/(authed)/profil/securite/page.tsx` — MNYS-06 (password + PIN forms) | ~280 | feat(06-02): /profil/securite — password change + PIN management |
| T4 | `src/app/(authed)/retrait/page.tsx` — MNYS-02 with 4 gates + single-page form + 4-digit PIN inline | ~380 | feat(06-02): /retrait — withdrawal form with gates |
| T5 | `src/app/(authed)/retrait/succes/page.tsx` — success screen with `animate-ping` | ~130 | feat(06-02): /retrait/succes — withdrawal confirmation |
| T6 | `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/stats/page.tsx` — MNYS-04 with CSS bar chart | ~280 | feat(06-02): cagnotte stats page with CSS timeline chart |
| T7 | `src/app/(authed)/tableau-de-bord/cagnottes/[slug]/modifier/page.tsx` — MNYS-05 (no slug field) | ~320 | feat(06-02): cagnotte edit form |
| T8 | FRONTEND-DEVIATIONS.md D-18, D-20, D-22, D-23 entries | ~50 | docs(06-02): FRONTEND-DEVIATIONS entries |
| T9 | Plan verification: build, grep guards (slug, PUT, /api/files proxy), smoke-test | — | — |

**Total LOC estimate:** ~2900 (frontend pages + 50 backend + 300 shared components). Fits Phase 6 scope (≈13 routes + 2-3 support files).

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | Phase 3 `Tabs` primitive supports 2-tab layout with counts in labels | Notifications feed | Low — inspect `ui/Tabs.tsx` at plan time; worst case inline custom |
| A2 | `POST /api/upload` response rewrites R2 URL to `/api/files/:key` proxy | KYC upload, avatar | MEDIUM — must verify at plan time by reading `routes/upload.ts:82-160`; if not, frontend must rewrite |
| A3 | Phase 5 `_uploadCover.ts` helper is reusable verbatim | KYC upload | Low — precedent exists |
| A4 | Backend `withdrawalPinHash` uses bcrypt compatible with `verifyPassword` | PIN flows | Verified (`routes/sellers.ts:964` hashPassword + `routes/withdrawals.ts:191` verifyPassword) |
| A5 | `Seller.email` is queryable by `/me/participations` — only owner can trigger | Gap 1 fix | Verified — `requireAuth` + email lookup is standard |
| A6 | `Intl.NumberFormat("fr-FR")` space normalization matches Phase 3 `formatPrice` | Rich body parser | Verified at `format.ts:13-15` |
| A7 | Banani's 6-toggle labels are complete (no hidden 7th) | Prefs | MEDIUM — re-read `.planning/banani/screens/phase-6/notif-preferences.md` before wire-up |
| A8 | Withdrawal response includes `withdrawal.reference` for the success page URL | /retrait/succes | Verified (`routes/withdrawals.ts:362`) |
| A9 | Frontend can compute `kycStatus` pill variant from `GET /api/auth/me` response | profile pill | MEDIUM — confirm `/api/auth/me` returns `kycStatus` at plan time |
| A10 | Withdrawal fees are 0 for Wave/Orange in v1 | /retrait summary | Verified default `merchantFee: 0` at `routes/withdrawals.ts:339` |

---

## Open Questions (max 5)

1. **Profile page: keep `birthDate` or drop?** Banani shows it; `Seller` has no `birthDate` column. Adding it = Phase 6 schema migration (rabbit hole). Dropping it = Banani parity loss. **Recommendation:** drop for v1, add to D-25 deviation.
2. **Profile/avatar upload: pick a primitive?** Does Phase 3 `Avatar` primitive support an edit overlay, or do we compose `Avatar` + a floating camera button? Quick inspection at plan time in T2.
3. **Notification preferences: auto-save or explicit save?** Banani shows no save button → auto-save with toast. Confirm with product before shipping OR add explicit save button to be safe.
4. **Cagnotte delete in edit page: in scope or defer?** Banani doesn't show a delete button. Backend `DELETE /api/blocks/:id` exists. **Recommendation:** ship it (low cost, high value) with a Modal confirmation.
5. **`/retrait` entry point from DashboardShell:** the bell menu drops "Profil" + "Se déconnecter" today (`DashboardNavbar.tsx:124-142`). Add "Retirer mes fonds" as a 3rd menu item, or only link from the dashboard KPI card? **Recommendation:** both — menu item for discovery, KPI card for contextual flow.

---

## Sources

### Primary (HIGH confidence — file + line)
- `backend/prisma/schema.prisma:13-122` — Seller model + payout columns
- `backend/prisma/schema.prisma:349-427` — Order model + isAnonymous/messageIsPrivate
- `backend/prisma/schema.prisma:526-567` — Notification model + enum
- `backend/prisma/schema.prisma:588-617` — Withdrawal model
- `backend/src/routes/auth.ts:443` — GET /me (returns seller shape)
- `backend/src/routes/auth.ts:702` — PUT /change-password (note: PUT verb)
- `backend/src/routes/sellers.ts:86` — PUT /profile + zod schema
- `backend/src/routes/sellers.ts:270` — POST /kyc
- `backend/src/routes/sellers.ts:917-1100` — withdrawal-pin trio
- `backend/src/routes/blocks.ts:173` — GET /:id/progress
- `backend/src/routes/blocks.ts:450` — PUT /:id (update)
- `backend/src/routes/blocks.ts:550` — DELETE /:id
- `backend/src/routes/orders.ts:877-1043` — GET /api/orders (seller-scoped, NOT donor-scoped — confirms Gap 1)
- `backend/src/routes/notifications.ts:34-191` — entire feed/count/mark-read/prefs surface
- `backend/src/routes/withdrawals.ts:38-45` — createWithdrawalSchema (PIN is 4 digits)
- `backend/src/routes/withdrawals.ts:95-156` — GET /balance response shape
- `backend/src/routes/withdrawals.ts:159-427` — POST /withdrawals error codes
- `backend/src/routes/cagnottes.ts:207` — GET /:slug (public)
- `backend/src/routes/cagnottes.ts:312` — GET /:slug/participants
- `backend/src/routes/upload.ts:82` — POST /api/upload
- `backend/src/routes/files.ts:12` — GET /api/files/:key proxy
- `backend/src/lib/notifications/templates.ts:22-245` — 9 templates + `escapeHtml`
- `src/components/ui/index.ts:1-45` — full Phase 3 primitive export
- `src/components/layout/SidebarNav.tsx:1-50` — existing SidebarNav primitive
- `src/components/layout/DashboardNavbar.tsx:1-150` — existing navbar
- `src/components/notifications/NotificationItem.tsx:1-114` — existing row component (to fork for feed)
- `src/app/(authed)/layout.tsx:1-78` — Phase 5 server AuthGuard pattern
- `src/lib/commission.ts:1-88` — computeCommission + formatCommissionLabel
- `src/lib/format.ts:1-65` — formatPrice, formatPhone, formatRelativeTime
- `.planning/banani/screens/phase-6/*.md` — 7 Banani screen extracts (profile, profile-variant-bank-details, notif-preferences, notifications-feed, participations, withdrawal, withdrawal-success)
- `.planning/banani/FRONTEND-DEVIATIONS.md:1-145` — D-01..D-17 existing deviations
- `.planning/phases/02-backend-surfaces-exit-gate/02-03-SUMMARY.md:72-90` — verified endpoint inventory
- `.planning/phases/05-auth-creator-flow/05-02-SUMMARY.md:108-126` — server AuthGuard patterns
- `CLAUDE.md` (project instructions) — locked decisions on brand, payments, commission, slug, KYC

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md:137-151` — ATHD + MNYS requirement texts
- `.planning/ROADMAP.md:143-163` — Phase 6 goal + watch-outs
- `.planning/banani/STATUS.md:52-66` — gap screen inventory

### Tertiary (LOW confidence, need verification at plan time)
- Whether `POST /api/upload` response contains the R2 proxy URL or raw R2 URL (A2) — need to re-read `routes/upload.ts` at plan start
- Whether Phase 3 `Avatar` primitive has an edit-overlay slot

---

## Metadata

**Confidence breakdown:**
- Backend endpoint contracts: **HIGH** — every endpoint verified by direct file read
- Schema model shape: **HIGH** — prisma schema read end-to-end
- Gap closure plan: **HIGH** — 4 of 5 gaps resolved to "already shipped", 1 has a concrete 30-LOC patch
- Route composition: **MEDIUM** — based on Banani extractions + Phase 3 primitive inventory, final prop shapes confirmed at plan time
- Banani → design adaptations: **MEDIUM** — 4 state variants for KYC pill + D-18/D-20/D-22/D-23 deviations need visual sign-off
- Notification rich-content parser: **MEDIUM** — per-type parser is sound in theory; drift risk if templates change
- Common pitfalls: **HIGH** — drawn from verified file:line evidence

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days — backend is stable; if templates.ts or withdrawals.ts change, re-verify A2 and the pitfalls section)
