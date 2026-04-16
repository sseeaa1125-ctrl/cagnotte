# Audit 023 — /profil full-stack contract audit (PIN + every tab)

**Date:** 2026-04-15
**Scope:** Every feature reachable from `/profil/*`, audited front-to-back:
PIN withdrawal flow (create + change), password change, personal info
(`/profil`), payout (`/profil/coordonnees-bancaires` — "Retrait" tab),
notification prefs, KYC, logout. Verifies HTTP verb, body shape, Zod schema,
middleware chain, rate limit, storage format, and error paths for each.

**Method:** Delegated backend contract audit to an Explore sub-agent with
exact line-cite requirements; verified findings by reading the specific files
and lines called out. All findings cite file:line.

---

## TL;DR — verdict table

| Tab / Feature | Frontend | Backend | Contract | Verdict |
|---|---|---|---|---|
| A. PIN set | `_PinForm.tsx:148-153` | `POST /api/sellers/withdrawal-pin` `sellers.ts:1047` | ✅ | ✅ Works |
| A. PIN change | `_PinForm.tsx:148-153` | Same | ✅ | ✅ Works + 🚨 **brute-force concern (MED-1)** |
| A. PIN status | `securite/page.tsx:20` | `GET /api/sellers/withdrawal-pin/status` `sellers.ts:1027` | ✅ | ✅ Works |
| A. PIN forgot | *(no UI)* | `sellers.ts:1088` | n/a | ✅ Backend exists; no frontend entry point |
| A. PIN reset | *(no UI)* | `sellers.ts:1124` | n/a | ✅ Backend exists; no frontend entry point |
| B. Password | `_PasswordForm.tsx:44-47` | `PUT /api/auth/change-password` `auth.ts:702` | ✅ | ✅ Works (verb PUT confirmed) |
| C. Personal info | `_ProfileForm.tsx:112-118` | `PUT /api/sellers/profile` `sellers.ts:71` | 🚨 | 🚨 **HIGH-1: phone stored without +221 prefix** |
| C. Avatar upload | `_ProfileForm.tsx:74-86` | `POST /api/upload` → `PUT /api/sellers/profile` | ✅ | ✅ Works (proxy-URL rewrite verified) |
| D. Payout | `_BankForm.tsx:55-64` | `PUT /api/sellers/profile` `sellers.ts:71` | ✅ | ✅ Works (phone prefix correct) |
| E. Notif prefs | `_PreferencesForm.tsx:110-114` | `PATCH /api/notifications/prefs` `notifications.ts:138` | ✅ | ✅ Works (6 Banani keys accepted) |
| F. KYC submit | `_KycForm.tsx:202-209` | `POST /api/sellers/kyc` `sellers.ts:289` | ✅ | ✅ Works |
| F. KYC upload | `_KycForm.tsx:47-53` | `POST /api/upload?purpose=kyc` `upload.ts:122` | ✅ | ✅ Works |
| G. Logout | `AuthContext.tsx:94` | `POST /api/auth/logout` `auth.ts:28` | ✅ | ✅ Works (3 cookies cleared) |

**1 HIGH, 1 MED (security), 3 MED (cleanup), 3 LOW findings.**

---

## Findings

### 🚨 HIGH-1 — Personal phone stored without +221 country prefix

**Files:** [src/app/(authed)/profil/_ProfileForm.tsx:116](src/app/(authed)/profil/_ProfileForm.tsx#L116) + [backend/src/lib/phone.ts:83-91](backend/src/lib/phone.ts#L83)

**Symptom:** Every time a user saves their personal info with a fresh phone
number, the backend stores a malformed value like `+771234567` instead of
`+221771234567`. The `Seller.phone` column gets corrupted.

**Root cause:** `_ProfileForm.tsx` and `_BankForm.tsx` handle the phone
differently:

```ts
// _BankForm.tsx:60 — correct
payoutPhone: `+221${phone}`,   // prepends +221 to the 9 bare digits

// _ProfileForm.tsx:116 — wrong
phone: phone.trim() ? phone.trim() : null,   // sends bare 9 digits
```

The ProfileForm phone input strips non-digits on every keystroke
(`_ProfileForm.tsx:219`) and caps at 9 chars (`maxLength={9}`). The "+221"
badge on line 209-211 is a **display-only pseudo-prefix** — it is never
concatenated onto the submitted value. So the body shipped to `PUT
/api/sellers/profile` is `{ phone: "771234567" }`.

On the backend, [backend/src/lib/phone.ts:83-91](backend/src/lib/phone.ts#L83)
does:

```ts
export function cleanPhoneForStorage(phone: string): string {
  let clean = phone.replace(/[\s\-\.\(\)]/g, "");
  const hasPlus = clean.startsWith("+");
  if (hasPlus) clean = clean.slice(1);
  if (clean.startsWith("00")) clean = clean.slice(2);
  return "+" + clean;    // ← just prepends + , does NOT ensure country code
}
```

Input `"771234567"` → no `+` → no `00` → returns `"+771234567"`. **Country
code lost.**

**Verified** by reading both files line-by-line; the BankForm path hits this
helper with `"+221771234567"` as input (the `+` is stripped and re-added,
result: `"+221771234567"` — correct). Only the ProfileForm path is broken.

**Second related bug in the same file**: the initial value is not normalized.
If `initial.phone = "+221771234567"` (pristine from the DB when it was set
via the payout flow), the React state on line 55 becomes that full 13-char
string. The input `maxLength={9}` doesn't clip initial values — only typing —
so the input renders "+221771234567" right next to a "+221" badge. Visually
the user sees "+221" + "+221771234567". `_BankForm.tsx` uses a
`normalizePhone()` helper (`_BankForm.tsx:28-33`) that strips the leading
`221` on load — ProfileForm is missing that entirely.

**Repro:**
1. Sign in fresh account with no phone
2. Go to `/profil`
3. Type "771234567" in the phone input
4. Click Save
5. Reload the page
6. The phone input now shows "+771234567" and DB has `Seller.phone = "+771234567"`

**Impact:** Data integrity broken for every personal-phone edit. The field
may be used downstream (SMS notifications, support contact, account
recovery). If the ProfileForm pathway is the only way non-payout phones are
ever written, **every non-zero `Seller.phone` in the DB is at risk** of being
missing the country code.

**Fix:** copy the BankForm pattern 1:1.

```ts
// at top of _ProfileForm.tsx
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^221/, "").slice(0, 9);
}

// state init
const [phone, setPhone] = React.useState(normalizePhone(initial.phone ?? ""));

// submit
body: {
  displayName: merged,
  phone: phone.trim() ? `+221${phone.trim()}` : null,
},
```

**Follow-up (not blocking this audit):** a remediation script should scan
`Seller.phone` for rows matching `^\+[^2]` or `^\+2[^2]` and either re-prefix
or null them out after operator confirmation. Alternatively,
`cleanPhoneForStorage` itself could be hardened to reject any number that
doesn't look like a valid E.164 — but that's a riskier backend change that
would break other callers relying on the loose behavior.

---

### ⚠️ MED-1 — PIN change endpoint has no per-endpoint brute-force limiter

**Files:** [backend/src/routes/sellers.ts:1047](backend/src/routes/sellers.ts#L1047) + [backend/src/index.ts:136-141](backend/src/index.ts#L136)

**Symptom:** `POST /api/sellers/withdrawal-pin` (set/change) is protected
only by the global `writeLimiter` (30 req/60s per IP) that covers every
mutating `/api/sellers/*` route. There is no per-user counter, no lockout
after N failed `currentPin` checks, no exponential backoff.

The **forgot** and **reset** endpoints each have their own dedicated
5-req/15-min limiter (per agent report) — those are protected. The
**change** endpoint isn't.

**Attack scenario:** An attacker with a compromised session (stolen
`izy-token` cookie, phishing, XSS that survived audit-011) can attempt to
change the PIN. To change, they need the correct `currentPin` (4 digits,
10,000 possibilities). At 30 attempts/min, worst-case brute force is ~333
minutes ≈ 5.5 hours — fully tractable. bcrypt comparison adds ~100 ms each,
so the actual CPU cost per attempt is real but not limiting at 30/min.

**Why this is MED not HIGH:**
1. Requires an already-compromised session — if the attacker has that,
   they've already lost most of the account's security properties.
2. The PIN is specifically meant to protect the *withdrawal* flow, not the
   profile. An attacker who changes the PIN still needs to reach
   `/retraits/*` and trigger a payout — the withdrawal endpoint has its own
   (separate) verification.
3. Even 30/min across ALL `/api/sellers/*` routes means the attacker can't
   reliably hit pure brute force without starving their other operations.

**Why it's still worth fixing:**
1. 4-digit entropy is already the weakest link in the system; removing any
   rate ceiling on brute-force negates the entire point of rotating the PIN
   after a suspected breach.
2. The fix is cheap — add a 5-attempt-per-hour counter on
   `Seller.withdrawalPinFailedAttempts` (or a Redis key keyed by seller ID)
   that trips a 429 with a user-facing "réessaye plus tard" after 5 failed
   `currentPin` checks inside a 1-hour window, and forces the forgot-PIN
   email recovery flow for the next attempt.

**Recommendation:** Add per-seller failed-attempt tracking on the change
branch only (the set branch has no `currentPin` to brute). Reset the counter
on success or after `forgot-pin` recovery.

---

### ⚠️ MED-2 — `payoutProvider` has no enum validation on the backend

**File:** [backend/src/routes/sellers.ts:24-60](backend/src/routes/sellers.ts#L24)

The `updateProfileSchema` accepts `payoutProvider` as
`z.string().max(30).optional()` — a free-form string. The app enforces
"wave_money" | "orange_money" only on the frontend (`_BankForm.tsx:84-107`
hard-codes those two RadioCards).

Bictorys rejects anything else at withdrawal time
([backend/src/routes/withdrawals.ts:42](backend/src/routes/withdrawals.ts#L42)
per CLAUDE.md), so a bad value is caught eventually — but it ends up stored
in `Seller.payoutProvider` until someone tries to pay out. Contract drift is
possible if a new tab (e.g. iframe checkout on a third-party site) sends a
typo like `"orange_money_sn"`.

**Recommendation:** Tighten the Zod to
`z.enum(["wave_money", "orange_money"]).nullable().optional()` at the
`/api/sellers/profile` boundary. Zero runtime cost, matches Bictorys'
actual allow-list. Not blocking.

---

### ⚠️ MED-3 — Dead component `ProfileSidebar.tsx`

Already flagged in [audits/audit-022-profile-redesign-retrait.md](audits/audit-022-profile-redesign-retrait.md) section 5 as MED-1.
Still present. Remove `src/components/layout/ProfileSidebar.tsx`.

### ⚠️ MED-4 — Dead constants `BANK_ACCOUNTS_LABELS` + 3 orphaned subtitle keys

Already flagged in audit-022 section 5 as MED-2 and LOW-2. Still present.
Drop `BANK_ACCOUNTS_LABELS`, `BANK_LABELS.securityNoticeTitle`,
`SECURITY_LABELS.subtitle`, `NOTIF_PREFS_LABELS.subtitle`, `KYC_LABELS.subtitle`.

---

### ℹ️ LOW-1 — `requireAuth` DB hit on every authed request

Per the sub-agent's trace: [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts)
re-queries `Seller.findFirst()` on every authed request (cannot be dropped —
CLAUDE.md explicitly says this re-query is what prevents stale JWT plan
bypass). No action required; documenting for context in case of future
performance work.

### ℹ️ LOW-2 — Double CSRF on `/api/sellers/withdrawal-pin`

Router mounts `verifyCsrf` globally at `backend/src/index.ts:147` and the
individual routes also list `verifyCsrf` in their middleware array
(`sellers.ts:1047`, `:1088`, `:1124`). Net effect: CSRF is verified twice
for the same request. Harmless but redundant — clean up opportunistically.

### ℹ️ LOW-3 — KYC upload response shape drift-tolerant on the client

`POST /api/upload?purpose=kyc` returns
`{ url, fileName, size, mimeType }` but `_KycForm.tsx:63-66` only reads
`data.url`. Safe (extra fields are ignored, missing `url` throws). No
action needed; noting that if the backend ever renames `url` → `fileUrl`
or similar, the frontend silently stops working. Worth a comment in the
backend upload route.

---

## Per-tab execution trace

### A. PIN flow — `/profil/securite`

**Create (no existing PIN):**
1. `securite/page.tsx:17-33` → `fetchPinStatus(token)` →
   `GET /api/sellers/withdrawal-pin/status` → `{ hasPin: false }`
2. `<PinForm hasPin={false}>` mounts in edit mode directly (no current PIN boxes)
3. User types 4-digit new PIN + 4-digit confirm
4. `handleSubmit` → `api("/api/sellers/withdrawal-pin", { method: "POST", body: { pin: newPin } })`
5. Backend validates Zod `pinSchema: { pin: /^\d{4}$/, currentPin?: /^\d{4}$/ }`
6. Since no existing hash, `currentPin` branch skipped
7. `hashPassword(pin)` (bcrypt 12) → `Seller.withdrawalPinHash`
8. 200 OK → toast `pinSuccess` → `mode="display"` → `router.refresh()` → page re-fetches status → now shows "Un code est actuellement défini" in the green-accent banner

**✅ Works. Contract aligned. `PIN_LENGTH=4` matches backend.**

**Change (PIN exists):**
1. Same status fetch returns `hasPin: true` → form mounts in `mode="display"`
2. User clicks "Changer mon code" → `mode="edit"` → three 4-digit input rows (current + new + confirm)
3. `handleSubmit` → POST body `{ pin: newPin, currentPin: currentPin }`
4. Backend verifies `currentPin` against `Seller.withdrawalPinHash` via `verifyPassword()` (bcrypt)
5. On mismatch: 403 `SECURITY_LABELS.pinError`
6. On match: hash new `pin`, store, return 200

**✅ Works. 🚨 MED-1 applies: no lockout after repeated wrong `currentPin`.**

### B. Password — `/profil/securite`

1. `_PasswordForm.tsx:44-47` → `PUT /api/auth/change-password` with
   `{ currentPassword: current, newPassword: next }`
2. `auth.ts:702` validates `changePasswordSchema: { currentPassword: string().min(1), newPassword: string().min(8).max(128) }`
3. Backend verifies current password, hashes new, **increments `tokenVersion`**, re-issues cookies so user stays logged in (audit-012 S-03 fix)
4. 403 on wrong current pw / 400 on Zod fail / 200 on success

**✅ Works. Verb is PUT (CLAUDE.md-compliant). Rate-limited by global 300/15min (skipped for /api/auth).**

### C. Personal info — `/profil`

1. `profil/page.tsx:12-24` → `getProfileSeller()` (cached) → `<ProfileForm>` with `displayName/email/avatarUrl/phone`
2. Edit → submit → `PUT /api/sellers/profile` with `{ displayName, phone }`
3. Avatar upload is independent: `POST /api/upload` multipart (CSRF via `x-csrf-token` header) → get proxy URL → `PUT /api/sellers/profile` with `{ avatarUrl: data.url }`
4. Backend rewrites raw R2 URLs → proxy `/api/files/:key` in `index.ts:101-114` middleware → frontend persists the proxy URL

**✅ Avatar upload works. 🚨 HIGH-1: phone path broken — see finding.**

**Email is read-only (`_ProfileForm.tsx:193` has `disabled readOnly`) and the
backend `updateProfileSchema` does NOT list `email` — so even a crafted body
that includes `{ email: "x" }` gets stripped by Zod's `.strict()`-equivalent
behavior. Email change requires a different flow (out of scope).**

### D. Payout — `/profil/coordonnees-bancaires` ("Retrait")

1. `coordonnees-bancaires/page.tsx` (post audit-022 rewrite) → `<BankForm>`
2. `_BankForm.tsx:55-64` → `PUT /api/sellers/profile` with
   `{ payoutProvider: "wave_money" | "orange_money", payoutPhone: "+221" + 9 digits, payoutName: trimmed, payoutCountry: "SN" }`
3. Backend `sellers.ts:153` runs `cleanPhoneForStorage(data.payoutPhone)` — verified correct for `"+22177..."` input
4. 200 → toast → `router.refresh()`

**✅ Works. Phone prefix correct. ⚠️ MED-2: `payoutProvider` is a loose string on backend.**

### E. Notification prefs — `/profil/preferences`

1. `preferences/page.tsx:29-34` → `fetchPrefs(token)` →
   `GET /api/notifications/prefs` → returns `Seller.notificationPrefs || {}`
2. `<PreferencesForm>` hydrates 6 Banani keys with `DEFAULTS` fallback
3. On toggle flip: `PATCH /api/notifications/prefs` with `{ [key]: next }` (single key)
4. Backend `notifications.ts:155-168` accepts all 6 Banani keys as `z.boolean().optional()`
5. Backend merge is additive: `{ ...existing, ...patch }` (notifications.ts:175)
6. Frontend shows 1.5s green "Enregistré" pulse on success, reverts local state + red toast on error

**✅ Works. All 6 keys (`newParticipation`, `milestoneReached`, `endingSoonReminder`, `organizerUpdates`, `paymentReceipts`, `newsletter`) match the backend schema. Single-key flips work. `requireAuth + verifyCsrf + writeLimiter` chain.**

### F. KYC — `/profil/kyc`

1. `kyc/page.tsx:69` → `getProfileSeller()` (cached) → status resolved → variant chosen
2. `approved`/`pending` variants render read-only previews (no POST)
3. `none`/`rejected` variants: user uploads ID + selfie via `ImageUpload` primitive
4. On submit: two parallel `POST /api/upload?purpose=kyc` multipart requests (CSRF via `x-csrf-token` header) → returns proxy URLs
5. Then `POST /api/sellers/kyc` with `{ fullName, idUrl, selfieUrl }`
6. Backend validates status is NONE or REJECTED (sellers.ts:308-315), writes URLs + timestamp, flips `kycStatus = PENDING`
7. Rate limit: `kycSubmitLimiter` 5/24h per IP (sellers.ts:273-281)
8. `router.refresh()` re-fetches seller → StatusBanner flips to "En cours"

**✅ Works. Upload returns proxy URL (middleware rewrite). CSRF on multipart handled via header. Approval is still manual (no /admin route — per CLAUDE.md v1 workaround with `scripts/approve-kyc.ts`).**

### G. Logout

1. `ProfileShell.tsx:308-315` button → `setLogoutOpen(true)` → `ConfirmDialog`
2. User confirms → `useAuth().logout()` in `AuthContext.tsx:94`
3. `POST /api/auth/logout` (no body, no auth required)
4. Backend `auth.ts:28` clears `izy-token` + `izy-refresh` + `izy-csrf` cookies
5. Frontend `clearCsrfToken()` (localStorage), `setSeller(null)`, redirect to `/`

**✅ Works. 3 cookies cleared. Real session invalidation (not the old `<Link href="/connexion">` bug).**

---

## Contract-drift matrix

| Field | Frontend sends | Backend expects | Match? |
|---|---|---|---|
| **PIN set/change** | `{ pin: string(4 digits), currentPin?: string(4 digits) }` | `pinSchema: { pin: /^\d{4}$/, currentPin?: /^\d{4}$/ }` | ✅ |
| **Password change** | `{ currentPassword, newPassword }` | `{ currentPassword: min(1), newPassword: min(8).max(128) }` | ✅ |
| **Personal phone** | `"771234567"` (bare 9 digits) | `cleanPhoneForStorage()` prepends only `+`, returns `"+771234567"` | 🚨 **WRONG** |
| **Payout phone** | `"+22177123456"` (13 chars) | Same helper, returns `"+22177123456"` | ✅ |
| **Payout provider** | `"wave_money" \| "orange_money"` | `z.string().max(30)` — no enum | ⚠️ loose |
| **Notif prefs (6 keys)** | `{ [key]: boolean }` one at a time | `prefsSchema` accepts all 6 as `boolean().optional()` | ✅ |
| **KYC submit** | `{ fullName, idUrl, selfieUrl }` | Same shape | ✅ |
| **KYC upload response** | Reads `data.url` | Returns `{ url, fileName, size, mimeType }` | ✅ tolerant |
| **Logout** | No body | No body required | ✅ |

---

## Typecheck

`cd cagnottes-sn && node_modules/.bin/tsc --noEmit`

```
exit=0
0 issues
```

✅ Clean. No type drift between frontend and the types inferred from the Zod schemas.

---

## Acceptance

Every /profil tab is functional at the protocol level **except for the
personal phone field**, which is silently corrupting data on every save. That
one is a HIGH-severity data-integrity bug worth fixing before the next user
edits their profile. Everything else (PIN set/change, password, payout,
notif prefs, KYC, logout) works end-to-end with its contract aligned.

**Recommended next action:** Fix HIGH-1 (phone prefix in `_ProfileForm.tsx`)
using the exact pattern already shipped in `_BankForm.tsx`. ~15 lines of
change. All other findings are non-blocking cleanup.

---

## Appendix — files audited this session

Frontend:
- `src/app/(authed)/profil/layout.tsx`
- `src/app/(authed)/profil/page.tsx`
- `src/app/(authed)/profil/_ProfileForm.tsx`
- `src/app/(authed)/profil/securite/page.tsx`
- `src/app/(authed)/profil/securite/_PasswordForm.tsx`
- `src/app/(authed)/profil/securite/_PinForm.tsx`
- `src/app/(authed)/profil/coordonnees-bancaires/page.tsx`
- `src/app/(authed)/profil/coordonnees-bancaires/_BankForm.tsx`
- `src/app/(authed)/profil/preferences/page.tsx`
- `src/app/(authed)/profil/preferences/_PreferencesForm.tsx`
- `src/app/(authed)/profil/kyc/page.tsx`
- `src/app/(authed)/profil/kyc/_KycForm.tsx`
- `src/components/layout/ProfileShell.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/RadioCard.tsx`
- `src/contexts/AuthContext.tsx`
- `src/lib/serverProfile.ts`

Backend:
- `backend/src/index.ts` (middleware chain)
- `backend/src/routes/sellers.ts` (profile + PIN + KYC)
- `backend/src/routes/auth.ts` (password change + logout)
- `backend/src/routes/notifications.ts` (prefs)
- `backend/src/routes/upload.ts` (multipart)
- `backend/src/lib/phone.ts` (cleanPhoneForStorage)
- `backend/src/middleware/auth.ts` (requireAuth)
