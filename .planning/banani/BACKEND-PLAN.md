# Backend completion plan — derived from 24 Banani screens

Created: 2026-04-13
Strategy: **BACKEND-FIRST.** Complete and smoke-test every endpoint the frontend will need. Zero frontend code until every task below is ✅ and the dev server responds correctly on every route.

Source of truth for UI requirements: the 24 Banani screens indexed in [STATUS.md](STATUS.md), with emphasis on screens 21–24 (public cagnotte detail, participate, payment).

---

## Current backend state (audit, 2026-04-13)

### ✅ Already present

- **Auth** ([backend/src/routes/auth.ts](../../backend/src/routes/auth.ts)): signup, login, logout, refresh, me, email verify, password reset (per CLAUDE.md). JWT in httpOnly cookie + CSRF.
- **Sellers** ([backend/src/routes/sellers.ts](../../backend/src/routes/sellers.ts)): profile CRUD, `POST /kyc` (full KYC submission), `GET /dashboard/stats` (KPIs for dashboard).
- **Blocks** ([backend/src/routes/blocks.ts](../../backend/src/routes/blocks.ts)): block CRUD, `GET /:id/progress` (public — total collected, donor count), `GET /:id/donations` (public — 10 most recent donations).
- **Orders** ([backend/src/routes/orders.ts](../../backend/src/routes/orders.ts)): `createOrderSchema` already accepts `donorMessage` (max 500). `GET /:ref/status` public polling endpoint. Sends `donorMessage` to Bictorys create flow.
- **Withdrawals** ([backend/src/routes/withdrawals.ts](../../backend/src/routes/withdrawals.ts)): `GET /`, `GET /balance`, `POST /` all behind `requireAuth`.
- **Webhooks** ([backend/src/routes/webhooks.ts](../../backend/src/routes/webhooks.ts)): Bictorys signature verification + DONATION/FUNDRAISER branch processes the payment.
- **Upload + Files** ([backend/src/routes/upload.ts](../../backend/src/routes/upload.ts), [files.ts](../../backend/src/routes/files.ts)): R2 upload + proxy — works for cover images and KYC docs.
- **Libs**: `payments/bictorys.ts` (customer charges, 3 retries on 403 WAF), `payout.ts` (seller payouts), `blocks/schemas.ts` (Zod validation per block type), `queues/emailQueue.ts` + `queues/JobQueue.ts` (Upstash Redis persistent queue), `rateLimitStore.ts` (Upstash Redis rate limiter), `redis.ts`, `email.ts` (Resend + RFC 2369 unsubscribe), `crypto.ts`, `storage.ts`, `logger.ts`.
- **Prisma models**: `Seller` with full KYC + payout + notificationPrefs + withdrawalPinHash fields. `Block`, `Order` (with `donorMessage`, `customerName`, `customerEmail`, `customerPhone`, `customFields` JSON). `Withdrawal` with Bictorys fields. `VerificationCode`, `WebhookLog`, `FileUpload`.

### ❌ Missing / needs extension

1. **No per-cagnotte public slug**: `Block` has no `slug` field. Public URL `cagnotte.sn/c/<slug>` needs one. Today the only slug is `Seller.slug` (one per creator). **This is the #1 gap.**
2. **No public `GET /api/cagnottes/:slug`** endpoint that returns a full cagnotte detail payload (cagnotte + progress + organizer + paginated participants) in one call — current blocks routes require internal IDs and don't join.
3. **No public `GET /api/cagnottes`** list endpoint for the `/toutes-les-cagnottes` page (search + filter + paginate across all public cagnottes of all sellers).
4. **No `isAnonymous` / `messageIsPrivate` on Order** — donor wants to mask their name publicly (organizer still sees real name) and/or keep their message private. The `participate` screen has two checkboxes for this.
5. **FUNDRAISER config incomplete**: missing `subtype: 'festive' | 'solidaire'`, `occasion` (festive), `cause` + `beneficiary` (solidaire), `visibility: 'public' | 'private'`, `hideAmount`, `hideDonors`. Currently only `showDonorCount` exists.
6. **No `Notification` model**: user confirmed we rebuild the notifications lib the fork deleted. Needs a model + routes + dispatch hooks.
7. **No `notifications` route**: dashboard + notifications feed + preferences screens all depend on this.
8. **No password-change authed endpoint visible** (separate from password reset): profile sidebar has a "Sécurité & Mot de passe" entry. Must verify `routes/auth.ts` exposes `POST /api/auth/change-password` or add it.
9. **Commission model**: screens 23/24 show "Frais de plateforme: Offerts". Today `Order.commissionRate` is set per order. Decision: FUNDRAISER commission = 0 in v1, or make it `PlatformConfig`-driven. Easy either way.
10. **No cagnotte-edit flow beyond generic block PATCH** — verify `PATCH /api/blocks/:id` accepts partial FUNDRAISER config, and that the frontend "Gérer" screen can close cover images and edit metadata.
11. **Payment partner label**: Banani says "PayDunya" — we keep Bictorys. No backend change, just a note for the frontend translator.
12. **No seeded dev data**: hard to smoke-test without realistic fixtures.

---

## Task list — Phase 0 (backend completion)

Each task is atomic. One commit per task. Run `npm run build` in `/backend` after each.

### 0.1 — Schema migrations (Prisma)

Modify [backend/prisma/schema.prisma](../../backend/prisma/schema.prisma):

- [ ] `Block`: add `slug String? @unique` (nullable for backward-compat with existing non-cagnotte blocks), `@@index([slug])`. For FUNDRAISER blocks, slug is required at creation time (enforced in the route, not the schema — other block types don't need it).
- [ ] `Order`: add `isAnonymous Boolean @default(false)`, `messageIsPrivate Boolean @default(false)`.
- [ ] **New model `Notification`**:
  ```prisma
  model Notification {
    id          String   @id @default(cuid())
    sellerId    String
    seller      Seller   @relation(fields: [sellerId], references: [id], onDelete: Cascade)

    type        NotificationType
    title       String
    body        String?
    icon        String?   // lucide name: "heart" | "clock" | "check-square" | "credit-card" | "message-circle"

    // Soft links to domain objects (nullable, for deep-linking from the feed)
    blockId     String?
    orderId     String?
    withdrawalId String?

    // Metadata for rendering variants (e.g. { amount: 5000, milestone: 50, donorName: "Anonyme" })
    data        Json?

    readAt      DateTime?

    createdAt   DateTime  @default(now())

    @@index([sellerId, createdAt])
    @@index([sellerId, readAt])
  }

  enum NotificationType {
    DONATION_RECEIVED      // "Julien R. a participé 50 €"
    MILESTONE_REACHED      // "Votre cagnotte a atteint 50% de l'objectif"
    CAGNOTTE_ENDING_SOON   // "Votre cagnotte se termine dans 3 jours"
    CAGNOTTE_ENDED         // "Votre cagnotte est terminée"
    DONATION_MESSAGE       // "a laissé un message sur la cagnotte"
    PAYOUT_COMPLETED       // "Virement de X FCFA effectué"
    PAYOUT_FAILED          // "Virement échoué — action requise"
    KYC_APPROVED           // "Identité vérifiée"
    KYC_REJECTED           // "Documents refusés — action requise"
  }
  ```
  Add `notifications Notification[]` to `Seller`.
- [ ] Run `npm run db:push` against the Neon dev DB. Verify with `npm run db:studio`.

### 0.2 — Extend FUNDRAISER config Zod schema

Modify [backend/src/lib/blocks/schemas.ts](../../backend/src/lib/blocks/schemas.ts):

- [ ] Add to `fundraiserBlockConfigSchema`:
  - `subtype: z.enum(["festive", "solidaire"])`
  - `occasion: z.enum(["anniversaire", "pot_de_depart", "cadeau_commun", "mariage_pacs", "naissance", "voyage", "autre"]).nullable().optional()` (festive only)
  - `cause: z.enum(["sante_medical", "education", "projet_solidaire", "urgence", "animaux", "autre"]).nullable().optional()` (solidaire only)
  - `beneficiary: z.enum(["moi_meme", "un_proche", "une_association"]).nullable().optional()` (solidaire only)
  - `visibility: z.enum(["public", "private"]).default("public")`
  - `hideAmount: z.boolean().default(false)`
  - `hideDonors: z.boolean().default(false)`
- [ ] Cross-field validation via `.superRefine()`:
  - If `subtype === "festive"`: `occasion` required, `cause` and `beneficiary` must be null.
  - If `subtype === "solidaire"`: `cause` and `beneficiary` required, `occasion` must be null.

### 0.3 — `Block.slug` generation + conflict handling

**Decision (2026-04-13)**: slugs must stay **simple and human-readable**. No random hex suffixes. Numeric suffix on conflict.

New helper `backend/src/lib/cagnottes/slug.ts`:

- [ ] `slugify(title: string)` — strip diacritics (NFD normalize), lowercase, allowed charset `a-z0-9-`, collapse whitespace to `-`, collapse multiple dashes, truncate to 60 chars, strip leading/trailing dashes.
- [ ] `ensureUniqueSlug(base: string, prisma)` — reserved-words check first (`api`, `admin`, `login`, `signup`, `dashboard`, `nouvelle`, `create`, `toutes-les-cagnottes`, `tableau-de-bord`, `profil`, `notifications`, `participations`, `aide`, `tarifs`, `contact`). If `base` is free → return as-is. Else try `base-2`, `base-3`, … until free. **No random hex.**
- Expected results:
  - `Les 30 ans de Thomas` → `les-30-ans-de-thomas`
  - Collision on the same → `les-30-ans-de-thomas-2`
  - Reserved `admin` → `admin-1`

Wire into block creation in [backend/src/routes/blocks.ts](../../backend/src/routes/blocks.ts):

- [ ] On `POST /api/blocks` when `type === "FUNDRAISER"`: generate slug from `config.title`, ensure uniqueness, persist to `Block.slug`.
- [ ] On `PATCH /api/blocks/:id` when the title changes on a FUNDRAISER: **do NOT regenerate the slug automatically** (breaks sharing). Surface a separate endpoint `POST /api/blocks/:id/rename-slug` that requires explicit confirmation.
- [ ] Add `SlugHistory` entry if the slug changes, so old `/c/<old>` URLs 301 to the new one. Either reuse `SlugHistory` with a `subject: "seller" | "block"` discriminator, or add a sibling `BlockSlugHistory` — decide during implementation.

### 0.4 — Public cagnotte endpoints

New file [backend/src/routes/cagnottes.ts](../../backend/src/routes/cagnottes.ts), mounted at `/api/cagnottes`:

- [ ] `GET /api/cagnottes` — public list. Query: `?q=&category=&subtype=&sort=recent|popular&cursor=&limit=24`. Returns `{ items, nextCursor }`. Only `visibility === "public"` + `isActive: true` + not-deleted-seller.
- [ ] `GET /api/cagnottes/:slug` — public detail. Returns `{ cagnotte, organizer, progress, stats }`:
  - `cagnotte`: id, slug, title, description, coverUrl, goalAmount, endDate, subtype, occasion|cause|beneficiary, suggestedAmounts, hideAmount, hideDonors, visibility, createdAt
  - `organizer`: displayName, avatarUrl, slug (for future creator page)
  - `progress`: `{ totalCollected, percent, donorCount }` — respect `hideAmount` and `hideDonors`
  - `stats`: `{ endsInDays, isActive }`
  - **Decision (2026-04-13)**: private cagnottes ARE returned here — privacy = URL secrecy. Anyone with the slug can load it. Only the list endpoint excludes them.
- [ ] `GET /api/cagnottes/:slug/participants` — public, paginated (`?cursor=&limit=20`). Returns `{ items: [{ displayName, amount, createdAt, message | null }], nextCursor }`:
  - If `Order.isAnonymous`: `displayName = "Anonyme"`, no initial derivation from real name
  - If `hideDonors`: empty list + total count only
  - If `hideAmount`: omit the `amount` field per item (or send `null`)
  - If `Order.messageIsPrivate`: omit `message` field
  - Only `paymentStatus === "PAID"` orders
- [ ] Rate limit these public endpoints via the existing global limiter (already 300 req/15min).
- [ ] Mount the router in [backend/src/index.ts](../../backend/src/index.ts) **before** CSRF middleware (these are GETs, so CSRF is skipped, but confirm).

### 0.5 — Extend `POST /api/orders` for fundraiser donations

Modify [backend/src/routes/orders.ts](../../backend/src/routes/orders.ts) `createOrderSchema`:

- [ ] Add `isAnonymous: z.boolean().optional().default(false)`.
- [ ] Add `messageIsPrivate: z.boolean().optional().default(false)`.
- [ ] Require `blockId` OR `cagnotteSlug` (lookup block by slug if slug provided — more natural for the public checkout flow).
- [ ] On insert, persist the two new flags to `Order.isAnonymous` and `Order.messageIsPrivate`.
- [ ] **Commission per FUNDRAISER subtype** (decision 2026-04-13):
  ```ts
  const FUNDRAISER_COMMISSION_BP = {
    solidaire: 600, // 6% — levée de fonds santé / aide / urgence
    festive:   800, // 8% — mariage / anniversaire / cadeau commun
  } as const;

  if (block.type === "FUNDRAISER") {
    const subtype = (block.config as any).subtype as "solidaire" | "festive";
    order.commissionRate = FUNDRAISER_COMMISSION_BP[subtype];
    order.commissionAmount = Math.round((amount * order.commissionRate) / 10000);
    order.sellerAmount = amount - order.commissionAmount;
  }
  ```
  - Store basis points on `Order.commissionRate` (existing `Int` field, same convention as `CommunityPayment.commissionRate`).
  - Hard-coded for v1. TODO v2: move to `PlatformConfig` for runtime admin override.
  - The Banani payment screen label "Frais de plateforme: Offerts" is WRONG and must be rewritten in Phase D. Log in `.planning/banani/FRONTEND-DEVIATIONS.md` when the frontend phases start.

### 0.6 — Rebuild notifications lib

New directory `backend/src/lib/notifications/`:

- [ ] `index.ts` — `createNotification({ sellerId, type, title, body, icon, blockId?, orderId?, data? })`. Inserts into `Notification` model. Also pushes an email via `emailQueue` **if** `seller.notificationPrefs` has that category enabled.
- [ ] `templates.ts` — one factory per `NotificationType` that returns `{ title, body, icon, emailSubject, emailBody }` in French. Seeded from Banani screen 20 copy ("Julien R. a participé 50 € à votre cagnotte…", etc.).
- [ ] Hook `createNotification` into [backend/src/routes/webhooks.ts](../../backend/src/routes/webhooks.ts) at the points where an order moves to `PAID`:
  - Always fire `DONATION_RECEIVED`.
  - If the new total crosses 50% or 100% of the goal: fire `MILESTONE_REACHED`.
  - If the donor left a message: fire `DONATION_MESSAGE`.
- [ ] Hook into the withdrawal flow: on `Withdrawal.status === "COMPLETED"` or `"REJECTED"`, fire `PAYOUT_COMPLETED` / `PAYOUT_FAILED`.
- [ ] Hook into the existing order-expiration cron (every 5 min in `index.ts`): when a fundraiser is within 3 days of `endDate`, fire `CAGNOTTE_ENDING_SOON` once (track via `data.notifiedEndingSoon`).

### 0.7 — `routes/notifications.ts`

New file [backend/src/routes/notifications.ts](../../backend/src/routes/notifications.ts), mounted at `/api/notifications`, behind `requireAuth`:

- [ ] `GET /api/notifications?cursor=&limit=20&unreadOnly=0` — cursor-paginated feed for the current seller.
- [ ] `GET /api/notifications/count` — `{ total, unread }` for the navbar bell badge.
- [ ] `POST /api/notifications/mark-read` — body `{ ids?: string[], all?: boolean }`, sets `readAt`.
- [ ] `GET /api/notifications/prefs` — returns `seller.notificationPrefs` (shape: `{ donationReceived, milestones, endingSoon, donorMessages, payouts, newsletter }`).
- [ ] `PATCH /api/notifications/prefs` — update `seller.notificationPrefs`. CSRF-protected.

### 0.8 — Withdrawal + PIN + KYC smoke-test

No new code expected, just verification + small gap-fill:

- [ ] Confirm `POST /api/withdrawals` requires KYC `APPROVED`. If not, enforce it and return `{ error: "KYC required" }` with 403.
- [ ] Confirm the PIN (`withdrawalPinHash`) is enforced on withdrawal creation.
- [ ] Add `POST /api/sellers/withdrawal-pin` if missing (set/change the 6-digit PIN, bcrypt, requires current password).
- [ ] Confirm `POST /api/sellers/kyc` returns clean error when documents are missing.
- [ ] Confirm withdrawal `GET /balance` returns `{ availableAmount, pendingAmount }` in FCFA integer.

### 0.9 — Auth gap-fill

- [ ] Confirm `POST /api/auth/change-password` exists (different from reset). If not, add it: requires current password, new password, returns new JWT.
- [ ] Confirm `POST /api/auth/forgot-password` + `POST /api/auth/reset-password` both work against the email queue.
- [ ] Confirm `POST /api/auth/verify-email` works end-to-end.

### 0.10 — Remove Google/Apple references from auth

- [ ] Confirm no OAuth route exists. Nothing to do if absent. If `googleId` on `Seller` is still referenced, leave the column (backward-compat) but don't expose any OAuth endpoint.

### 0.11 — Seed + smoke-test script

- [ ] Create `backend/scripts/seed-dev.ts`:
  - 2 sellers (Marie, Thomas) with verified KYC
  - 4 FUNDRAISER blocks (2 festive, 2 solidaire) with slugs
  - 10 PAID orders spread across them (mix of anonymous / public, with and without messages)
  - 5 notifications per seller
- [ ] Create `backend/scripts/smoke-test.ts`:
  - Hits every route with fixture data, asserts shapes
  - Output: ✅/❌ per route, exit 1 on any failure
  - Run as last gate before declaring Phase 0 done

### 0.12 — Update CLAUDE.md

- [ ] Strike-through `teal-600`/`amber-500`, replace with `#172866` navy / `#FBE6ED` pink.
- [ ] Add Poppins mention (headings) alongside Inter (body).
- [ ] Add the new `/api/cagnottes/*` and `/api/notifications/*` routes to the architecture section.
- [ ] Add `Block.slug` and `Order.isAnonymous` / `messageIsPrivate` to the "Data & Validation" rules.

---

## Exit criteria for Phase 0

All of the following green:

- [ ] `cd backend && npm run build` — 0 errors
- [ ] `cd backend && tsx scripts/seed-dev.ts` — fixtures created
- [ ] `cd backend && tsx scripts/smoke-test.ts` — 100% green
- [ ] Manual curl/httpie pass on: `GET /api/cagnottes`, `GET /api/cagnottes/:slug`, `GET /api/cagnottes/:slug/participants`, `POST /api/orders` (donation), webhook replay → notification appears, `GET /api/notifications`, `POST /api/auth/change-password`, `POST /api/withdrawals` (happy path), `POST /api/sellers/kyc`.
- [ ] CLAUDE.md updated

Only then do we touch the frontend.
