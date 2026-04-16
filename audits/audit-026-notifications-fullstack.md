# Audit 026 — Notifications full-stack audit

**Date:** 2026-04-15
**Scope:** Every notification touch-point from donor-pays → webhook →
`createNotification` → DB row → frontend list → mark-read → unread badge.
Covers the 9 typed dispatchers, the 4 HTTP endpoints, the `/notifications`
client, the BottomNav unread dot, and the prefs toggle round-trip.
**Method:** Delegated the backend contract audit to an Explore sub-agent;
verified the contract-drift finding and the unread-badge gap by reading the
specific files/lines. All findings cite file:line.

---

## Summary

Core path works. A donor pays → webhook commits → `fireDonationReceived`
runs post-commit → `createNotification` inserts a row with dedupeKey → the
`/notifications` page renders it with correct unread styling → the user can
click it + mark read. Contract matches on every endpoint I verified.

Three **real bugs** + one **feature gap** explain the "don't seem to work
normally" report:

1. 🚨 **Unread badge is hardcoded to 0 on mobile.** The BottomNav never
   polls `/api/notifications/count` — the prop is stubbed to `0` in
   DashboardShell. Users see the Notifs tab with no red dot even when they
   have unread notifications.
2. 🚨 **Notification-pref toggles are ineffective.** The frontend writes
   Banani keys (`newParticipation`, `milestoneReached`, …). The backend
   dispatcher reads legacy keys (`donations`, `milestones`, …). A user
   flipping "Nouvelle participation" OFF still receives donation
   notifications because the dispatcher only consults the legacy key —
   which defaults to enabled.
3. ⚠️ **Orphaned dispatchers (feature gap).** 3 of 9 dispatchers exist in
   code but have no production call site: `fireCagnotteEnded` (never called
   anywhere), `fireKycApproved`, `fireKycRejected` (both only fired from a
   CLI script). `CAGNOTTE_ENDED` notifications silently never happen.
4. ℹ️ Empty-state `BellOff` icon is `size={28}` — mildly oversized per audit 025 pattern.

Fixing 1 and 2 is small and ships in this audit. 3 is feature work (needs a
cron or close-handler).

---

## Contract drift matrix

| Field | Frontend expects | Backend returns | Match |
|---|---|---|---|
| `GET /api/notifications?limit=20` | `{ items: NotificationRow[], nextCursor: string \| null, hasUnread?: boolean }` | same shape ([notifications.ts:72-76](backend/src/routes/notifications.ts#L72)) | ✅ |
| `GET /api/notifications/count` | `{ total: number, unread: number }` | same ([notifications.ts:91](backend/src/routes/notifications.ts#L91)) | ✅ |
| `POST /api/notifications/mark-read` | `{ ids?: string[] }` or `{ all: true }` | same ([notifications.ts:99-106](backend/src/routes/notifications.ts#L99)) | ✅ |
| `readAt` in list row | nullable ISO timestamp, `null` = unread | `DateTime?` serialized as ISO | ✅ |
| Cross-seller leak guard | N/A | every query filters `sellerId: req.seller!.sub` ([notifications.ts:42,88,117,123,144,184](backend/src/routes/notifications.ts#L42)) | ✅ (T-02-14 mitigated) |
| CSRF | `api()` wrapper auto-attaches `x-csrf-token` | `verifyCsrf` mounted at [index.ts:148](backend/src/index.ts#L148) | ✅ |
| Rate limiter | N/A | global `writeLimiter` 30/60s on all `/api/notifications/*` mutations | ✅ |

---

## Dispatcher coverage

| Dispatcher | Production call site | Verdict |
|---|---|---|
| `fireDonationReceived` | `backend/src/routes/webhooks.ts:493` (PAID branch, post-commit) | ✅ Working |
| `fireMilestone` | `webhooks.ts:500-503` (post-commit, via `detectCrossed`) | ✅ Working |
| `fireEndingSoon` | `backend/src/lib/notifications/endingSoonCron.ts:84` (hourly cron + 30s boot catch-up) | ✅ Working |
| `fireCagnotteEnded` | **None** (template exists, dedupeKey formula exists, but no caller) | 🚨 Feature gap |
| `fireDonationMessage` | `webhooks.ts:511-515` (post-commit, PAID branch, if donorMessage present) | ✅ Working |
| `firePayoutCompleted` | `withdrawals.ts` + `backend/src/lib/reconcileWithdrawals.ts:336` | ✅ Working |
| `firePayoutFailed` | `reconcileWithdrawals.ts:317,353` | ✅ Working |
| `fireKycApproved` | `backend/scripts/approve-kyc.ts:68` (CLI only — no admin panel) | ⚠️ By-design v1 gap |
| `fireKycRejected` | `backend/scripts/approve-kyc.ts:73` (CLI only) | ⚠️ By-design v1 gap |

KYC dispatchers are intentionally behind a CLI script per CLAUDE.md
("KYC approval is manual in v1" — T-02-19 accepted risk). The cagnotte-ended
gap is **not** documented anywhere.

---

## Findings

### 🚨 HIGH-1 — Unread badge hardcoded to 0, never polls

**Files:**
- [src/app/(authed)/DashboardShell.tsx:38](src/app/(authed)/DashboardShell.tsx#L38) — `<BottomNav unreadCount={0} />`
- [src/components/layout/BottomNav.tsx:21](src/components/layout/BottomNav.tsx#L21) — accepts `unreadCount?: number`, defaults to 0, never self-polls

**Symptom:** The mobile Notifs tab shows the bell icon with no red dot ever,
regardless of whether unread notifications exist. The `/api/notifications/count`
endpoint is implemented and working — nothing calls it from the BottomNav
side. A Phase 6 TODO comment in DashboardShell acknowledges the gap but
never delivered the polling hook.

**Fix (applied this audit):** Move the badge ownership into `BottomNav`
itself via a small self-polling effect — `api<{ total: number; unread: number }>("/api/notifications/count")` on
mount + 60s interval + on `visibilitychange` so the badge refreshes when the
user tabs back from another app. Drop the `unreadCount` prop entirely. 401s
are swallowed silently so unauthed views (transient refresh windows) don't
throw.

---

### 🚨 HIGH-2 — Notification-pref toggles don't actually disable anything

**Files:**
- [backend/src/routes/notifications.ts:160-176](backend/src/routes/notifications.ts#L160) — prefs schema accepts **both** the 7 legacy keys (`donations`, `milestones`, …) and the 6 Banani Phase 6 keys (`newParticipation`, `milestoneReached`, `endingSoonReminder`, `organizerUpdates`, `paymentReceipts`, `newsletter`)
- [backend/src/lib/notifications/index.ts:66-91](backend/src/lib/notifications/index.ts#L66) — `notifTypeToPrefKey()` returns **only** the legacy key for each `NotificationType`
- [backend/src/lib/notifications/index.ts:108-112](backend/src/lib/notifications/index.ts#L108) — dispatcher checks `prefs[prefKey] === false` (single key)
- [src/app/(authed)/profil/preferences/_PreferencesForm.tsx](src/app/(authed)/profil/preferences/_PreferencesForm.tsx) — frontend writes Banani keys only

**Repro:**
1. Go to `/profil/preferences`, flip "Nouvelle participation" OFF → frontend sends `PATCH /api/notifications/prefs { newParticipation: false }`
2. Backend stores `Seller.notificationPrefs = { newParticipation: false }`
3. A donor pays
4. Webhook runs `fireDonationReceived` → `createNotification({ type: "DONATION_RECEIVED" })`
5. `notifTypeToPrefKey("DONATION_RECEIVED")` returns `"donations"`
6. Check: `prefs["donations"] === false` → `undefined === false` → `false`
7. Notification fires anyway ❌

The problem is "default-safe" behavior (missing key = enabled) combined
with the dispatcher looking up the wrong key.

**Fix (applied this audit):** Rename `notifTypeToPrefKey(type) → string` to
`notifTypeToPrefKeys(type) → readonly string[]` returning both the legacy
key AND the best-match Banani key for each `NotificationType`. Change the
dispatcher's pref check to `prefKeys.some((k) => prefs[k] === false)` so
**either** key set to `false` disables the notification. Legacy callers
keep working; Banani toggles finally take effect.

Mapping applied:
| NotificationType | Legacy key | Banani key |
|---|---|---|
| `DONATION_RECEIVED` | `donations` | `newParticipation` |
| `MILESTONE_REACHED` | `milestones` | `milestoneReached` |
| `CAGNOTTE_ENDING_SOON` | `endingSoon` | `endingSoonReminder` |
| `CAGNOTTE_ENDED` | `cagnotteEnded` | (none — no Banani equivalent) |
| `DONATION_MESSAGE` | `donationMessages` | (none — creator-side; `organizerUpdates` is donor-side) |
| `PAYOUT_COMPLETED`/`PAYOUT_FAILED` | `payouts` | `paymentReceipts` |
| `KYC_APPROVED`/`KYC_REJECTED` | `kyc` | `paymentReceipts` |

`organizerUpdates` and `newsletter` are donor-side / marketing keys and
don't map to any current dispatcher — left alone, still storable.

---

### ⚠️ MED-1 — `fireCagnotteEnded` has no trigger

**Files:**
- [backend/src/lib/notifications/templates.ts](backend/src/lib/notifications/templates.ts) — template exists (per agent report, lines ~150-162)
- [backend/src/lib/notifications/dispatch.ts](backend/src/lib/notifications/dispatch.ts) — dispatcher exists with correct dedupeKey (per agent report, lines 157-176)
- `grep -r "fireCagnotteEnded" backend/src/` — only finds the export in `dispatch.ts`. No caller.

**Symptom:** Creators never receive "Votre cagnotte est terminée"
notifications when `Block.endDate` passes. The template, type, and dispatcher
are all wired up to a function that nothing calls.

**Expected call sites (either would work):**
- A cron adjacent to `endingSoonCron.ts` that scans `Block` where
  `endDate <= now() AND endedNotifiedAt IS NULL`, sends the notification,
  sets `endedNotifiedAt = now()` (same pattern as
  `endingSoonNotifiedAt` for the J-3 sweep).
- A block-close HTTP handler (if one exists) that fires on manual close.

**Fix (not applied — flagged only):** Needs a new DB field
`Block.endedNotifiedAt`, a cron entry, or both. Adjacent to the existing
`endingSoonCron.ts` but a non-trivial addition — out of scope for this
audit. Track as a Phase 7 TODO.

---

### ⚠️ MED-2 — KYC dispatchers behind CLI only (documented v1 risk)

**File:** `backend/scripts/approve-kyc.ts:68,73`

Per CLAUDE.md: "KYC approval is manual in v1 (no admin panel yet).
T-02-19 accepted risk." The KYC dispatchers fire from a manual shell
script, not any HTTP route. This is **intentional**, not a bug — but it
means sellers only receive KYC notifications when the operator remembers
to run the script. Worth flagging for operator awareness. Fix = build the
admin panel (out of scope).

---

### ℹ️ LOW-1 — Empty-state BellOff icon at size={28}

**File:** [src/app/(authed)/notifications/page.tsx:108](src/app/(authed)/notifications/page.tsx#L108)

```tsx
icon={<BellOff size={28} aria-hidden />}
```

Matches the pattern from audit 025 where large inline icons were stepped
down to `size={24}`. Trivial polish — applied this audit.

---

### ℹ️ LOW-2 — List endpoint has no `?filter=unread` server support

**Files:**
- [src/app/(authed)/notifications/page.tsx:15-19](src/app/(authed)/notifications/page.tsx#L15) — comment explicitly notes this
- [backend/src/routes/notifications.ts:34-81](backend/src/routes/notifications.ts#L34) — GET handler has no filter param

The tab filter is client-side in `_NotificationsClient.tsx` (filters items
in memory via `readAt === null`). That works for the current page size of
20 items but stops being useful after the first load — clicking "Unread"
won't fetch additional unread items across pagination.

Not blocking. Non-audit noted for awareness — add `?filter=unread` to the
backend query when pagination depth becomes a real problem.

---

### ℹ️ LOW-3 — Double-CSRF on `/api/notifications/*`

The router is mounted with `verifyCsrf` at [index.ts:148](backend/src/index.ts#L148) and individual
mutation handlers also sit behind the `notificationsRouter.use(requireAuth)`
chain. Same double-middleware pattern as the withdrawal-pin route noted in
audit 023 (LOW-2). Harmless; not a priority.

---

## End-to-end trace (happy path)

1. **Donor pays via Bictorys** → webhook POST to `/api/webhooks`
2. **Inside `$transaction` (Serializable isolation):** `Order` created, `Block.totalRaised` updated, `WebhookLog.upsert` on `(externalId, eventType)` for idempotency
3. **Post-commit (outside tx):** `fireDonationReceived(order, block)` at [webhooks.ts:493](backend/src/routes/webhooks.ts#L493)
4. `dispatch.ts::fireDonationReceived` composes `dedupeKey = "donation_received:{orderId}"`, calls `createNotification()`
5. `createNotification()`:
   - Reads `Seller.notificationPrefs` + `email` + `emailUnsubscribed` (1 query)
   - **After HIGH-2 fix:** reads prefs under BOTH `donations` and `newParticipation` — `some === false` skips
   - Inserts `Notification` row with `readAt: null`
   - P2002 unique violation on `dedupeKey` = dedupe no-op
   - Enqueues transactional email via `queueTransactionalEmail` if the seller isn't `emailUnsubscribed`
6. **Creator opens `/notifications`:**
   - Server component fetches `GET /api/notifications?limit=20` + `GET /api/notifications/count`
   - Renders the `NotificationsClient` list with unread rows visually distinct (`isUnread && bg-blue-50/30` per agent report)
7. **Creator clicks notification:**
   - `POST /api/notifications/mark-read { ids: [id] }` sets `readAt: now()`
   - Optimistic UI update decrements visible unread count
8. **Mobile Notifs tab badge:**
   - **Before HIGH-1 fix:** stuck at 0 forever
   - **After HIGH-1 fix:** BottomNav self-polls `/api/notifications/count` every 60s + on `visibilitychange`, badge shows the live unread count

---

## Fixes applied this audit

1. **BottomNav self-polls unread count** ([BottomNav.tsx](src/components/layout/BottomNav.tsx))
2. **`notifTypeToPrefKeys` returns an array, dispatcher checks all keys** ([backend/src/lib/notifications/index.ts](backend/src/lib/notifications/index.ts))
3. **Removed dead `unreadCount` prop from DashboardShell** ([DashboardShell.tsx](src/app/(authed)/DashboardShell.tsx))
4. **BellOff icon size 28 → 24** ([notifications/page.tsx:108](src/app/(authed)/notifications/page.tsx#L108))

## Not applied (flagged for follow-up)

- **MED-1** — `fireCagnotteEnded` cron trigger. Requires a new `Block.endedNotifiedAt` field + cron wiring. Phase 7 work.
- **LOW-2** — Server-side `?filter=unread` on GET /notifications. Not urgent.
- **LOW-3** — Clean up double-CSRF middleware. Cosmetic.

---

## Typecheck

`node_modules/.bin/tsc --noEmit` → **exit 0, 0 errors** (run after all fixes applied).
