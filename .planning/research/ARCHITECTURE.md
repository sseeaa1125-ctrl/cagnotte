# Architecture — cagnottes.sn Banani integration + backend gaps

**Domain:** Senegalese crowdfunding / cagnotte platform
**Milestone context:** Subsequent milestone on an existing fork. 12 backend gaps (BE-01 → BE-12) + 8 frontend phases (FE-A → FE-H) grafted onto a working two-tier skeleton (Next.js 16 + Express 5 + Prisma + Upstash Redis).
**Researched:** 2026-04-13
**Confidence:** HIGH — all claims cross-checked against actual source in `backend/src/index.ts`, existing routes, and the project's own `.planning/codebase/ARCHITECTURE.md` / `BACKEND-PLAN.md`.

---

## 1. Guiding principles for this milestone

1. **Do not reshape what ships.** The existing middleware chain, auth model, Prisma client path, rate-limit layout, and job pattern all work. New pieces slot into the existing slots — they never force a re-architecture.
2. **One module = one responsibility.** The notifications library is the only new shared lib; everything else is either a route file, a schema extension, or a frontend component. No cross-cutting "services" layer.
3. **Public vs authed is the primary boundary.** Public routes (GET-only, no CSRF, global rate limit) are strictly separated from authed routes (CSRF + write limiter + `requireAuth`). New `cagnottes.ts` is public; new `notifications.ts` is authed. Never mix the two in one router.
4. **Frontend is a tree of three ring layers.** Primitives → composed blocks → pages. Pages own data fetching; composed blocks own layout; primitives own styling+a11y. No page-specific imports leak into primitives.
5. **Webhook handler stays the dispatch nucleus.** All "payment succeeded" side effects (notifications, milestone detection, email) branch from the existing `PAID` transition in `webhooks.ts`. There is no second path to PAID.

---

## 2. Recommended architecture

### 2.1 Backend layer map (after milestone)

```
backend/src/
├── index.ts                       [MODIFY] — mount 2 new routers, add 1 setInterval
├── routes/
│   ├── auth.ts                    [VERIFY]  — gap-fill change-password if missing (BE-10)
│   ├── sellers.ts                 [VERIFY]  — ensure POST /withdrawal-pin exists (BE-09)
│   ├── blocks.ts                  [MODIFY] — wire slug gen on create (BE-03)
│   ├── orders.ts                  [MODIFY] — new schema fields + commission BP (BE-06)
│   ├── withdrawals.ts             [MODIFY] — fire notifications on status transitions (BE-07)
│   ├── webhooks.ts                [MODIFY] — fire notifications on PAID (BE-07)
│   ├── upload.ts                  [unchanged]
│   ├── files.ts                   [unchanged]
│   ├── cagnottes.ts               [NEW]    — public list + detail-by-slug + participants (BE-05)
│   └── notifications.ts           [NEW]    — authed feed + count + mark-read + prefs (BE-08)
├── lib/
│   ├── notifications/             [NEW DIR]
│   │   ├── index.ts               — createNotification() single entry point
│   │   ├── templates.ts           — French templates per NotificationType
│   │   ├── dispatch.ts            — decides: DB-only vs DB+email based on seller.notificationPrefs
│   │   └── milestones.ts          — crossedThreshold() pure helper (50%, 100%)
│   ├── cagnottes/                 [NEW DIR]
│   │   └── slug.ts                — slugify() + ensureUniqueSlug() + RESERVED_WORDS (BE-01)
│   ├── blocks/schemas.ts          [MODIFY] — extend fundraiserBlockConfigSchema + superRefine (BE-04)
│   ├── payments/bictorys.ts       [unchanged]
│   ├── queues/emailQueue.ts       [unchanged — notifications enqueue here]
│   ├── auth.ts                    [unchanged]
│   └── …                          [unchanged]
└── prisma/schema.prisma           [MODIFY] — Block.slug, Order.isAnonymous/messageIsPrivate, Notification model (BE-01/02/03)
```

**What is explicitly NOT added:**
- No "service layer" between routes and Prisma. Routes call Prisma directly (project convention).
- No DTO mappers. Route handlers shape responses inline.
- No `controllers/` split. Route files ARE the controllers.
- No dependency injection container. `prisma`, `emailQueue`, `createNotification` are singleton imports.

### 2.2 Middleware chain — existing, unchanged

From `backend/src/index.ts` (verified lines 35-112):

```
1. helmet                          (security headers, crossOriginResourcePolicy: cross-origin for R2 proxy)
2. cors                            (multi-origin via ALLOWED_ORIGINS, credentials: true)
3. compression                     (gzip)
4. raw body parser                 (SCOPED to /api/webhooks — Bictorys signature needs raw payload)
5. express.json()                  (all other routes)
6. cookieParser                    (reads izy-token + izy-csrf)
7. /api/files  → filesRouter       (R2 proxy, no auth, BEFORE global limiter on purpose — static asset path)
8. /api/upload response rewriter   (rewrites R2 URLs to proxy URLs)
9. /api  global limiter            (300/15min, SKIPS /withdrawals, /orders, /auth)
10. route mounts:
    /api/auth          → authRouter                       (no write limiter — has own internal limits)
    /api/sellers       → writeLimiter + verifyCsrf + r    (30/60s + CSRF)
    /api/blocks        → writeLimiter + verifyCsrf + r    (30/60s + CSRF)
    /api/orders        → ordersRouter                     (public donations — no CSRF)
    /api/webhooks      → webhooksRouter                   (raw body + signature verify — no cookies)
    /api/upload        → writeLimiter + verifyCsrf + r    (30/60s + CSRF)
    /api/withdrawals   → verifyCsrf + r                   (CSRF only — has internal rate limit)
```

### 2.3 Where the two new routers plug in — critical integration points

**`/api/cagnottes` (public read-only):**

```ts
// In index.ts, mount AFTER globalLimiter, BEFORE any CSRF-protected router.
app.use("/api/cagnottes", cagnottesRouter);
```

- Sits alongside `/api/orders` as a public surface.
- Gets the global 300-req/15min limit automatically (via `app.use("/api", globalLimiter)` which matched on prefix).
- **Does NOT** receive `writeLimiter` (all GETs) and **does NOT** receive `verifyCsrf` (GETs are exempt in the existing `verifyCsrf` helper — confirm in `lib/auth.ts` but the current mount pattern on `/api/orders` proves GETs already pass through).
- **Must be mounted BEFORE** any middleware that would choke on unauth requests. Mount order: put the line between the `/api/webhooks` mount and `/api/upload` mount for readability, OR group it right after `/api/orders`.

**`/api/notifications` (authed mutations + reads):**

```ts
// In index.ts, mount alongside other authed routers.
app.use("/api/notifications", writeLimiter, verifyCsrf, notificationsRouter);
// Inside notifications.ts, every route starts with requireAuth.
```

- Follows the **exact same pattern** as `/api/sellers` and `/api/blocks` — `writeLimiter` + `verifyCsrf` at mount, `requireAuth` inside each handler.
- Note: `verifyCsrf` skips GET/HEAD in practice (double-submit is only meaningful for mutations), so the `GET /api/notifications` and `GET /api/notifications/count` endpoints still work without a CSRF header. This matches how `/api/blocks` GET endpoints already work.

**Absolute no-touch rules:**
- **Never** insert middleware BEFORE the raw body parser for `/api/webhooks` — it must be the first body handler for that path or Bictorys signature verification breaks.
- **Never** apply `writeLimiter` to `/api/auth` — auth has its own rate limiting and stacking creates unreadable 429s.
- **Never** apply `writeLimiter` or CSRF to `/api/cagnottes` — it's a public read path and CSRF would require donors to have a session.

### 2.4 Notifications library — the one new shared dependency

The notifications lib is the **only** piece of code this milestone introduces that is imported from ≥3 sites (webhooks.ts, withdrawals.ts, a new cron inside index.ts). Treat it as a public internal API.

**File tree:**
```
backend/src/lib/notifications/
├── index.ts        — exports createNotification() + fireDonationNotifications() + fireWithdrawalNotification()
├── templates.ts    — NotificationType → { title, body, icon, emailSubject, emailBody } pure factory (seller + data in)
├── dispatch.ts     — given a Notification row + prefs, decides whether to also enqueue an email via emailQueue
└── milestones.ts   — crossedThreshold(previousTotal, newTotal, goal, thresholds = [50, 100])
```

**Public API shape:**

```ts
// lib/notifications/index.ts
export async function createNotification(input: {
  sellerId: string;
  type: NotificationType;
  blockId?: string;
  orderId?: string;
  withdrawalId?: string;
  data?: Record<string, unknown>;
}): Promise<Notification>;

// Higher-level helpers called from the webhook + withdrawal flows
export async function fireDonationNotifications(orderId: string): Promise<void>;
// Fires: always DONATION_RECEIVED
//        conditionally MILESTONE_REACHED (via milestones.crossedThreshold)
//        conditionally DONATION_MESSAGE (if order.donorMessage)

export async function fireWithdrawalNotification(
  withdrawalId: string,
  status: "COMPLETED" | "FAILED",
): Promise<void>;
```

**Why this shape, not another:**

- **Single entry point** (`createNotification`) means `templates.ts` is the ONLY place French copy lives. Any call site that needs a new notification adds a template and an enum value — never hand-rolls a row.
- **`fireDonationNotifications(orderId)`** is idempotent enough to be called from the webhook AND from a manual admin replay. It re-reads the order + block progress to compute milestones, so it doesn't rely on caller-passed state.
- **`dispatch.ts`** isolates the in-app vs email decision. The `seller.notificationPrefs` JSON is the single source of truth for "should this user get an email too?" — call sites don't branch on prefs themselves.
- **`milestones.ts`** is a **pure function**. No DB, no side effects. Testable in isolation. This is the most bug-prone piece (off-by-one at 50%/100%) and pure functions pay off.

**Anti-pattern avoided:** An earlier sketch put notification creation inline in `webhooks.ts`. Rejected because (a) it duplicates template copy, (b) it makes the webhook handler even more monolithic than it already is, (c) it prevents reuse from `withdrawals.ts` and the ending-soon cron.

### 2.5 Frontend component boundaries

Banani exports 24 desktop screens. Mapping to the three-ring model:

```
src/
├── app/                            [PAGES — own data fetching, URL state, auth gates]
│   ├── layout.tsx                  [MODIFY] — Poppins + Inter fonts, existing ToastProvider
│   ├── page.tsx                    [REWRITE] — Home (screen 1)
│   ├── toutes-les-cagnottes/       [NEW] — AllCagnottes (screen 2)
│   ├── c/[slug]/
│   │   ├── page.tsx                [NEW] — cagnotte public detail (screens 21/22)
│   │   ├── participer/page.tsx     [NEW] — participate form (screen 23)
│   │   ├── paiement/page.tsx       [NEW] — payment picker (screen 24)
│   │   └── merci/page.tsx          [NEW] — thank-you (we design)
│   ├── connexion/page.tsx          [NEW] — login (screen 4)
│   ├── inscription/page.tsx        [NEW] — signup (screen 3)
│   ├── verifier-email/page.tsx     [NEW] — we design
│   ├── mot-de-passe-oublie/…       [NEW] — we design
│   ├── tableau-de-bord/
│   │   ├── page.tsx                [NEW] — dashboard (screen 6)
│   │   ├── nouvelle/page.tsx       [NEW] — type picker (screen 8)
│   │   ├── nouvelle/festive/       [NEW] — 3-step wizard (screens 9-11)
│   │   ├── nouvelle/solidaire/     [NEW] — 3-step wizard (screens 12-14)
│   │   ├── succes/page.tsx         [NEW] — create success (screen 15)
│   │   ├── participations/page.tsx [NEW] — (screen 16)
│   │   ├── profil/…                [NEW] — profile tabs (screens 17-19)
│   │   ├── notifications/page.tsx  [NEW] — feed (screen 20)
│   │   ├── virements/…             [NEW] — withdrawal flow (H, we design)
│   │   ├── kyc/page.tsx            [NEW] — KYC upload (H, we design)
│   │   └── securite/page.tsx       [NEW] — password change (H, we design)
│   └── api/pay-redirect/route.ts   [unchanged — critical TikTok workaround]
│
├── components/
│   ├── ui/                         [PRIMITIVES — zero domain logic, no fetch, no constants]
│   │   ├── Button.tsx              (primary/outline/ghost/social)
│   │   ├── Input.tsx               (+ helper text, char counter, password eye)
│   │   ├── Textarea.tsx
│   │   ├── Select.tsx
│   │   ├── DatePicker.tsx
│   │   ├── ImageUpload.tsx         (drag-drop, JPG/PNG, filename preview)
│   │   ├── RadioCard.tsx           (big-option visibility picker)
│   │   ├── Toggle.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Badge.tsx               (category/status)
│   │   ├── Tabs.tsx                (chip tabs)
│   │   ├── Pagination.tsx          (numeric)
│   │   ├── Avatar.tsx              (with edit overlay)
│   │   ├── ProgressBar.tsx         (collected/goal/donors)
│   │   ├── KpiCard.tsx
│   │   ├── EmptyState.tsx          (we design)
│   │   ├── Modal.tsx
│   │   └── Toast.tsx               (already exists in ToastContext — extract primitive)
│   │
│   ├── layout/                     [COMPOSED — cross-domain, used on many pages]
│   │   ├── PublicNavbar.tsx        (screens 1-5, 21-24)
│   │   ├── DashboardNavbar.tsx     (screens 6-20 + H) — search + bell (notifications count) + avatar menu
│   │   ├── SidebarNav.tsx          (profile tabs — screens 17-19)
│   │   ├── TopBanner.tsx           (promo strip, dismissible)
│   │   ├── Footer.tsx
│   │   └── PreFooter.tsx
│   │
│   ├── cagnottes/                  [COMPOSED — cagnotte domain]
│   │   ├── CampaignCard.tsx        (festive/solidaire variants, progress)
│   │   ├── MiniCagnotteCard.tsx    (payment summary column)
│   │   ├── FilterChipBar.tsx       (category filters on list)
│   │   ├── ProgressSummary.tsx     (detail page header — collected/goal/donors)
│   │   └── ParticipantsList.tsx    (respects isAnonymous/messageIsPrivate/hideAmount/hideDonors)
│   │
│   ├── checkout/                   [COMPOSED — donor flow]
│   │   ├── AmountPicker.tsx        (suggestedAmounts chips + custom input)
│   │   ├── DonorForm.tsx           (isAnonymous + messageIsPrivate checkboxes)
│   │   ├── OrderSummary.tsx        (sticky right column on participate/payment)
│   │   └── PaymentMethodPicker.tsx (Wave/Orange/Free/card — wires to api/pay-redirect)
│   │
│   ├── share/
│   │   └── ShareSheet.tsx          (WA/FB/Email/Copy — uses navigator.share when available)
│   │
│   ├── notifications/              [COMPOSED — notifications feed]
│   │   ├── NotificationItem.tsx    (icon + title + subtitle + time + unread dot)
│   │   ├── NotificationBell.tsx    (DashboardNavbar — count badge via useApi)
│   │   └── PreferencesForm.tsx     (toggle groups — screen 19)
│   │
│   └── trust/
│       └── TrustpilotBadge.tsx     (home hero)
│
├── lib/
│   ├── api.ts                      [unchanged — battle-tested, do not touch]
│   ├── useApi.ts                   [unchanged — 2min SWR cache]
│   ├── utils.ts                    [MODIFY] — keep existing helpers, add cn() if missing (already planned FE-A)
│   ├── constants.ts                [REWRITE] — Banani French labels, operators, reserved slugs mirror
│   ├── format.ts                   [NEW] — formatPrice, formatPhone (+221), formatRelativeTime
│   └── types/index.ts              [MODIFY] — add Cagnotte, Notification, Participant types
│
└── contexts/
    ├── AuthContext.tsx             [unchanged]
    └── ToastContext.tsx            [unchanged — Toast primitive re-imports from here]
```

**Component boundary rules (what goes where):**

| Layer | Allowed to import | Forbidden |
|---|---|---|
| `components/ui/*` | React, Tailwind classes via `cn()`, `lucide-react` icons, primitive types | ❌ `api()`, `useApi()`, `AuthContext`, constants with copy, `next/navigation` |
| `components/<domain>/*` | Everything UI can import + `useApi`, `api`, `constants`, other composed from same domain | ❌ `next/navigation` push/router (state comes from props), page-specific logic |
| `app/**/page.tsx` | Everything | — (top of the chain) |

**Concrete test for "is this a primitive?"**: Can I render it in Storybook / isolation with only mock props, no network, no auth? If yes → `components/ui/`. If no → `components/<domain>/`.

### 2.6 Donor checkout data flow — end to end

This is the revenue path. Nine hops, spanning existing + new code:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Donor loads /c/les-30-ans-de-thomas (Next.js page, server component)    │
│    └─ server fetch → GET /api/cagnottes/les-30-ans-de-thomas               │
│       [NEW route in cagnottes.ts]                                           │
│       Returns { cagnotte, organizer, progress, stats }                      │
│       Private visibility? → returned anyway (URL-secrecy model)             │
│                                                                             │
│ 2. Page hydrates → client fetches participants list                         │
│    └─ GET /api/cagnottes/:slug/participants?cursor=&limit=20                │
│       [NEW route in cagnottes.ts]                                           │
│       Filters applied server-side per hideAmount/hideDonors/isAnonymous     │
│                                                                             │
│ 3. Donor clicks "Je participe" → /c/:slug/participer                        │
│    Client-only routing, page already has cagnotte data via AuthContext or   │
│    new CagnotteContext (scoped to /c/:slug subtree only — a thin client     │
│    component wrapper, NOT a global context)                                 │
│                                                                             │
│ 4. Donor fills AmountPicker + DonorForm → /c/:slug/paiement                 │
│    Form state survives route transition via URL query string                │
│    (no server state for in-progress donations)                              │
│                                                                             │
│ 5. Donor picks payment method → client submit                               │
│    └─ POST /api/orders { cagnotteSlug, amount, donorEmail, donorMessage,    │
│       isAnonymous, messageIsPrivate, paymentType }                          │
│       [MODIFIED route — BE-06]                                              │
│       Backend:                                                              │
│       a) Zod validate (cagnotteSlug OR blockId)                             │
│       b) Lookup Block by slug → read block.config.subtype                   │
│       c) Compute commission: 600bp solidaire / 800bp festive                │
│       d) INSERT Order (status: PENDING, commissionRate, sellerAmount)       │
│       e) Call bictorys.createCharge({ amount, phone, redirectUrl })         │
│       f) 3 retries on 403 WAF (existing logic, untouched)                   │
│       g) Return { orderRef, redirectUrl, qrCode? }                          │
│                                                                             │
│ 6. Client receives redirectUrl → decide redirect strategy                   │
│    a) isTikTokBrowser() → window.location.href = redirectUrl (same window)  │
│    b) isInAppBrowser() (Insta/FB) → window.location.href = "/api/pay-redi-  │
│       rect?u=" + base64(redirectUrl) — existing workaround, UNCHANGED       │
│    c) normal browser → window.location.href = redirectUrl                   │
│                                                                             │
│ 7. Donor pays on Wave/Orange/Free/Bictorys → Bictorys redirects to          │
│    backend /:slug/success → backend 302 → frontend /c/:slug/merci           │
│    [existing redirect routes in index.ts lines 115-129 handle this]         │
│                                                                             │
│ 8. Async: Bictorys webhook → POST /api/webhooks                             │
│    [backend webhooks.ts — MODIFIED]                                         │
│    a) Verify x-secret-key (timing-safe, existing)                           │
│    b) Log to WebhookLog (existing)                                          │
│    c) Find Order by ref                                                     │
│    d) UPDATE order.paymentStatus = PAID                                     │
│    e) [NEW] await fireDonationNotifications(order.id)                       │
│       └─ createNotification DONATION_RECEIVED                               │
│       └─ crossedThreshold(prevTotal, newTotal, goal) → MILESTONE_REACHED    │
│       └─ order.donorMessage present → DONATION_MESSAGE                      │
│       └─ dispatch.ts enqueues email if seller.notificationPrefs allows      │
│                                                                             │
│ 9. Thank-you page (/c/:slug/merci)                                          │
│    Polls GET /api/orders/:ref/status (existing) until PAID or timeout       │
│    Shows confirmation + share CTAs                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key properties of this flow:**
- Steps 1-2 are server-rendered on the first hit — good for SEO and 3G cold loads.
- Step 5 is the ONLY POST in the entire donor journey. Nothing mutates server state between "load page" and "submit order".
- Step 8 is idempotent: the webhook handler already de-dupes by order ref + WebhookLog, and `createNotification` inserts a new row per fire (no uniqueness constraint needed because each payment is genuinely distinct).
- Step 6's three-way redirect is the only client-side logic that cannot be simplified — see `audits/audit-008` and `audit-009`.

---

## 3. Patterns to follow

### Pattern 1: Route file as vertical slice

**What:** Each `routes/*.ts` file owns its Zod schemas, its handlers, and its Prisma calls inline. No separate `controllers/`, `services/`, `dtos/`.
**When:** Every new route file in this milestone.
**Why:** Matches existing `orders.ts` (59KB), `blocks.ts` (32KB), `auth.ts` (25KB) — consistency with the codebase over theoretical separation. New contributors read one file per feature.
**Example:**
```ts
// backend/src/routes/cagnottes.ts
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const listQuerySchema = z.object({ q: z.string().optional(), /*…*/ });

export const cagnottesRouter = Router();

cagnottesRouter.get("/", async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const items = await prisma.block.findMany({ /* … */ });
  res.json({ items, nextCursor: null });
});
```

### Pattern 2: Single-entry notifications

**What:** Every notification insert goes through `createNotification()`. No direct `prisma.notification.create()` calls elsewhere.
**When:** Always, including the seed script.
**Why:** Template copy and email dispatch live in one place. Adding a new notification type = add enum value + template factory + one call site.

### Pattern 3: Frontend pages as data owners

**What:** Data fetching (`useApi`, server `fetch`) lives in `app/**/page.tsx` or `app/**/layout.tsx`. Composed blocks receive data via props. Primitives receive rendered content.
**When:** Every new page.
**Why:** Composed blocks stay reusable across pages without carrying their own fetch state. Prevents the `CampaignCard fetches its own cagnotte` anti-pattern that breaks SSR.

### Pattern 4: Tailwind + `cn()` for all styling

**What:** No inline `style={{}}` except for vendor theme CSS variables. No CSS modules. Use `cn(clsx, twMerge)` for conditional class composition.
**When:** Every component.
**Why:** CLAUDE.md mandate; Banani exports already align with this.

### Pattern 5: French-only in `constants.ts`, never in JSX

**What:** User-visible strings live in `src/lib/constants.ts`. JSX references them by key.
**When:** Every user-visible string.
**Why:** Easier to audit tone, fix typos, and do the `€` → FCFA / `+33` → `+221` sweep from Banani copy without grepping JSX.

---

## 4. Anti-patterns to avoid

### Anti-pattern 1: Forking the webhook handler for notifications
**What:** Writing a new route that "also" handles PAID transitions in parallel with `webhooks.ts`.
**Why bad:** Two code paths to PAID means two places to keep order totals consistent; guaranteed drift bugs.
**Instead:** Fire all side effects (notifications, emails, milestone detection) from the existing `webhooks.ts` PAID branch, via `fireDonationNotifications()`.

### Anti-pattern 2: Global `CagnotteContext` provider at app root
**What:** Wrapping the whole app in a context that holds "the current cagnotte".
**Why bad:** Most pages don't have a current cagnotte; the context leaks unused state everywhere and forces `"use client"` on pages that should be server components.
**Instead:** Pass cagnotte data as props from `app/c/[slug]/layout.tsx` to child pages. If client state is needed across participate/paiement, use a **tiny client wrapper** scoped to that subtree, NOT the root layout.

### Anti-pattern 3: Adding notifications inline without templates
**What:** Calling `prisma.notification.create({ data: { title: "Julien a participé…" } })` directly in a route handler.
**Why bad:** Copy duplicated across 5+ files; French typos fix requires touching all of them; email parity is impossible.
**Instead:** Add enum value + template factory in `lib/notifications/templates.ts`, call `createNotification({ type })` only.

### Anti-pattern 4: Bypassing `cn()` + Tailwind with inline styles
**What:** `<div style={{ backgroundColor: "#172866" }}>` instead of `className="bg-primary"`.
**Why bad:** Breaks theming, breaks dark mode if ever added, bypasses Tailwind tree-shaking.
**Instead:** Define tokens in `globals.css` `@theme` block (navy `#172866` → `--color-primary`) and use utility classes.

### Anti-pattern 5: Regenerating slugs on title edit
**What:** `PATCH /api/blocks/:id` auto-regenerates `slug` when `title` changes.
**Why bad:** Silently breaks every shared link the creator already sent out — guaranteed support tickets.
**Instead:** Slug is immutable on edit. If rename is really needed, add an explicit `POST /api/blocks/:id/rename-slug` that requires confirmation and records the old slug in `SlugHistory` for 301 redirects.

### Anti-pattern 6: Exposing the generic `GET /api/blocks/:id` for the donor page
**What:** Serving the public donor page by calling `/api/blocks/:id` with the internal cuid.
**Why bad:** (a) Forces donors to navigate by cuid, not slug. (b) Leaks the generic block response shape (including fields for other block types). (c) No server-side filtering on private/hideDonors/hideAmount.
**Instead:** `GET /api/cagnottes/:slug` returns a purpose-shaped payload with privacy flags already applied.

---

## 5. Build order (dependencies)

This is the suggested implementation order. Each step blocks only on its own prerequisites (not on the entire preceding phase).

```
1.  [BE-01] Prisma schema: Block.slug + Order.isAnonymous/messageIsPrivate + Notification model
    └─ Unblocks everything else. Do this first, run db:push, verify in db:studio.

2.  [BE-04] Extend fundraiserBlockConfigSchema (subtype, occasion, cause, beneficiary, visibility, hideAmount, hideDonors)
    └─ Pure Zod change, no DB dependency. Can run in parallel with step 1 but merge after.

3.  [BE-01b] lib/cagnottes/slug.ts — slugify + ensureUniqueSlug + RESERVED_WORDS
    └─ Pure function, no dependencies beyond Prisma client. Unit-testable.

4.  [BE-03] Wire slug generation into blocks.ts POST handler
    └─ Depends on step 1 (schema) + step 3 (helper).

5.  [BE-07a] lib/notifications/ (index, templates, dispatch, milestones)
    └─ Depends on step 1 (Notification model). templates.ts seeds French copy from Banani screen 20.
       milestones.ts is a pure function — write and unit-test first if you add a test harness.

6.  [BE-05] routes/cagnottes.ts (list, detail, participants)
    └─ Depends on step 1 (Block.slug exists) + step 2 (config fields for filtering).
       Mount in index.ts alongside /api/orders.

7.  [BE-06] Extend POST /api/orders (isAnonymous, messageIsPrivate, cagnotteSlug lookup, subtype commission)
    └─ Depends on step 1 (Order fields) + step 2 (block.config.subtype).

8.  [BE-07b] Hook fireDonationNotifications into webhooks.ts PAID branch
    └─ Depends on step 5 (notifications lib). Test with a webhook replay.

9.  [BE-07c] Hook fireWithdrawalNotification into withdrawals.ts status transitions
    └─ Depends on step 5 only.

10. [BE-07d] Cron: add setInterval for "ending soon" detection in index.ts
    └─ Depends on step 5. Uses data.notifiedEndingSoon to dedupe (or a new Block.endingSoonNotifiedAt field).

11. [BE-08] routes/notifications.ts (feed + count + mark-read + prefs)
    └─ Depends on step 1. Mount with writeLimiter + verifyCsrf.

12. [BE-09] Withdrawal + PIN + KYC verification (mostly gap-fill, small endpoint additions)
    └─ Independent of other steps.

13. [BE-10] Auth gap-fill (change-password, forgot/reset, verify-email smoke)
    └─ Independent.

14. [BE-11] seed-dev.ts + smoke-test.ts
    └─ Depends on ALL routes existing. Last gate before frontend.

15. [BE-12] Update CLAUDE.md
    └─ Depends on everything above being real.

=== Phase 0 exit gate: smoke-test.ts 100% green ===

16. [FE-A] Foundation — Poppins + @theme tokens + format.ts + constants.ts
    └─ Depends on nothing in the frontend, but needs the backend running for dev loop.

17. [FE-B] UI primitives (Button, Input, …, Modal, Toast)
    └─ Depends on step 16 (tokens + cn()).

18. [FE-C] Composed blocks (PublicNavbar, DashboardNavbar, CampaignCard, …)
    └─ Depends on step 17 (primitives).

19. [FE-D] Public donor flow (screens 1, 2, 21, 23, 24, merci)
    └─ Depends on steps 6, 7, 17, 18 (cagnottes routes + orders + primitives + composed).
       This is the revenue path — ship it first for zero→one moment.

20. [FE-E] Public auth (screens 3, 4, + we-design verify + reset)
    └─ Depends on 13 (auth gap-fill green) + 17, 18.

21. [FE-F] Creator flow (screens 6, 8, 9-15)
    └─ Depends on 4 (slug gen) + 18 + 20 (auth must work to get into dashboard).

22. [FE-G] Authed screens (7, 16, 17-20)
    └─ Depends on 11 (notifications routes) + 18.

23. [FE-H] Money screens (bank details, withdrawal, KYC, stats, edit, security — we design)
    └─ Depends on 12 (withdrawal gap-fill) + 18.
```

**Critical dependencies to remember:**
- Steps 1 + 5 (schema + notifications lib) are the **two bottlenecks**. Everything downstream stalls without them.
- Step 19 (donor flow) has the most cross-layer dependencies — that's by design, it's the flow that exercises the whole stack.

---

## 6. Scalability considerations

| Concern | At 100 donations/day | At 10K donations/day | At 1M donations/day |
|---|---|---|---|
| Cagnotte list (`GET /api/cagnottes`) | Raw Prisma findMany | Add cursor pagination (already planned) + DB index on `(visibility, isActive, createdAt)` | Dedicated read replica, Redis cache on hot list with 60s TTL |
| Participants list (`GET /:slug/participants`) | Raw Prisma findMany PAID orders | Cursor + index on `(blockId, paymentStatus, createdAt)` | Precomputed `ParticipantSnapshot` refreshed on webhook |
| Progress calc | On-demand SUM on PAID orders | On-demand SUM with DB index | Denormalize `totalCollected` on Block, updated in webhook transaction |
| Notifications feed | Raw findMany | Cursor + `@@index([sellerId, createdAt])` already planned | Partition by `sellerId`, archive > 90 days |
| Webhook dispatch | Synchronous inline in handler | Move notification creation to emailQueue jobs (batch processing) | Dedicated notifications worker reading from queue |
| Background jobs (setInterval) | Fine | Fine (single instance) | **Must** move to BullMQ / Upstash QStash — current setInterval is lost on restart and not multi-instance safe |

**Explicit v1 non-goals:** The `setInterval` background jobs are known-fragile (flagged in `.planning/codebase/CONCERNS.md`). We are NOT fixing this in the current milestone — the exit criteria accept "it works on single instance and we restart after deploys". Document the concern in PITFALLS.md, move on.

---

## 7. Integration check — nothing breaks

| Existing behavior | How the milestone preserves it |
|---|---|
| `/api/webhooks` raw body parser | Untouched. New notification calls happen INSIDE `webhooks.ts` after JSON parsing, not before. |
| Global rate limiter skips auth/orders/withdrawals | Untouched. New `/api/cagnottes` is NOT in the skip list → gets limited → correct (public read, protect from scraping). New `/api/notifications` is NOT in the skip list either, fine because it's also authed. |
| CSRF double-submit | `/api/cagnottes` mounted without `verifyCsrf` because it's GET-only. `/api/notifications` mounted WITH `verifyCsrf` — mutations work, GETs pass through (verifyCsrf skips read methods). |
| `requireAuth` re-queries seller from DB | Still the truth for all authed endpoints including new `notifications.ts`. |
| Upload URL rewriter | Untouched. Cover image upload for new wizard still uses `/api/upload`. |
| TikTok pay-redirect workaround | Untouched. `/api/pay-redirect` is a Next.js route, not touched by backend changes. |
| `setInterval` background jobs | One new `setInterval` for "ending soon" detection added alongside the existing three, same pattern. No breakage, same fragility. |
| Email queue (Upstash Redis) | Notifications call `emailQueue.enqueue()` via `dispatch.ts` — same entry point as existing auth flows. |
| Prisma client custom output path | Unchanged. New `Notification` model imports type from `backend/src/generated/prisma`, NOT from `@prisma/client`. |
| `izy-token` / `izy-csrf` cookie names | Unchanged. Frontend `api.ts` continues to work. |
| Commission stored as basis points on `Order.commissionRate` | New subtype-based calculation still writes BP integers. Existing withdrawal balance calc (sum of `sellerAmount` on PAID orders minus withdrawn) is unaffected. |

---

## 8. Open questions flagged for the roadmap

- **Cagnotte detail caching strategy.** SSR on first hit is the plan, but should we add a short-lived edge cache (Vercel cache or Cloudflare)? Defer — measure first.
- **Notifications feed real-time update.** Current plan is polling via `useApi` count endpoint every 30s. Server-sent events would be cleaner but add complexity. Defer to v2.
- **Slug rename UX.** `POST /api/blocks/:id/rename-slug` is in the plan but no Banani screen exists for it. Need a confirmation modal design.
- **Milestone detection race.** If two concurrent webhooks both push a total across 50% (unlikely but possible on fast consecutive donations), `fireDonationNotifications` would fire MILESTONE_REACHED twice. Mitigation: compute `crossedThreshold(prevTotal, newTotal)` atomically inside a transaction, OR add `Block.milestonesNotified Int[]` to track fired thresholds and check set-membership before inserting. Recommend the latter — simpler and idempotent.
- **Ending-soon cron dedup storage.** Proposed fields: `Block.endingSoonNotifiedAt DateTime?`. Cleaner than stuffing it into `Notification.data`. Decide in BE-07d implementation.

---

## Sources

- `/Users/amadoufall/Desktop/cagnottes-sn/backend/src/index.ts` (middleware chain lines 35-112, background jobs 154-210, redirect routes 115-129) — HIGH (direct read)
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/codebase/ARCHITECTURE.md` — HIGH (project-generated)
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/codebase/STRUCTURE.md` — HIGH
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/banani/BACKEND-PLAN.md` — HIGH (authoritative task list)
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/banani/STATUS.md` — HIGH (screen inventory + locked decisions)
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/PROJECT.md` — HIGH
- `/Users/amadoufall/Desktop/cagnottes-sn/CLAUDE.md` — HIGH (project rules)
