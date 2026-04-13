# Domain Pitfalls — cagnottes.sn (Banani milestone)

**Domain:** Senegalese mobile-money crowdfunding (Wave / Orange Money / Free Money / card via Bictorys) on Android/3G, UI in French, FCFA integer currency, existing multi-block fork.
**Researched:** 2026-04-13
**Scope:** 12 backend tasks (BE-01..BE-12) + Banani frontend phases A..H. Confidence: MEDIUM-HIGH (grounded in existing CLAUDE.md, CONCERNS.md, audits 008/009, and BACKEND-PLAN.md).

---

## Critical Pitfalls

Mistakes that cause rewrites, money loss, donor mistrust, or a broken launch.

### P01: Webhook double-processing a PAID donation → double-credited cagnotte + duplicate notifications
**What goes wrong:** Bictorys resends the same `x-secret-key` webhook (network retry, operator timeout, our 5xx blip). The current `WebhookLog`-based idempotency (CONCERNS.md §Fragile Areas) checks `externalId + eventType + status` but does NOT have a unique DB constraint, and the new BE-07 notification hook will fire `DONATION_RECEIVED` / `MILESTONE_REACHED` inside the same handler. Without a hard de-dup you get: double `totalCollected` (once `Block.totalCollected` is materialized in a later pass), 2 notifications to the seller, 2 emails in the Resend queue, and a `MILESTONE_REACHED` that may fire twice at the 50% boundary.
**Why it happens:** Bictorys retries on 5xx AND on network timeout. Our webhook handler is monolithic legacy code with multiple early returns; a crash between "mark Order PAID" and "log processed" leaves an inconsistent state. Notifications are fired **inside** the same request, so a partial commit silently double-notifies.
**Consequences:** Seller sees wrong totals; donors see duplicated entries in the `/participants` feed; email storms erode trust; milestone notifications become unreliable and unusable.
**Prevention:**
- Add `@@unique([externalId, eventType])` on `WebhookLog` in Prisma schema (BE-01 pass). Upsert instead of insert. If the insert fails with P2002, return 200 immediately without reprocessing.
- Wrap the PAID-transition in a single Prisma `$transaction` with `SELECT ... FOR UPDATE` on the `Order` row (`prisma.$queryRaw` pessimistic lock). Check `paymentStatus === "PENDING"` inside the transaction — any other value means already processed, return 200.
- **Do not fire notifications inside the webhook handler.** Enqueue a `notification:dispatch` job via `JobQueue` with `jobKey = order.id + ":donation_received"` so the queue's own idempotency (dedupe key) drops duplicates. Same for milestones: `jobKey = block.id + ":milestone:50"`.
- Milestone detection must read `Block.totalCollected` **after** the transaction commits and compare the pre-transaction value with post-transaction value to decide which thresholds were crossed in this single event.
**Warning signs:**
- `WebhookLog` count > distinct `externalId` count (run weekly as a smoke query).
- Duplicate `Notification` rows with same `orderId` and `type = DONATION_RECEIVED`.
- Resend dashboard shows >1 delivery for the same donor-confirmation email.
- Grafana/log alert: `webhook.processed.duplicate` counter > 0.
**Phase:** BE-01 (unique constraint in schema migration) + BE-07 (notification dispatch must be queue-based, not inline).

---

### P02: In-app browser (TikTok/Instagram/Facebook) kills the donation flow for viral social shares
**What goes wrong:** Cagnottes go viral on TikTok/Instagram stories. Donor taps the link, WebView opens `cagnottes.sn/c/<slug>`, taps "Participer", fills the form, taps "Payer"… and the Bictorys/Wave redirect is blocked by the WebView. See [audit-008](../../audits/audit-008-inapp-browser-payment.md) and [audit-009](../../audits/audit-009-tiktok-payment-flow.md). If the Banani payment page (FE-D screen 23/24) uses `window.location.href = url` or a plain `<a href>` without in-app detection, TikTok users get a dead button and bounce.
**Why it happens:** TikTok's ByteDance WebView blocks `<a target="_blank">`, `window.location.href`, server 302 redirects, AND base64-proxied redirects. Only `navigator.share()` escapes. Instagram/Facebook Meta WebView behaves differently (`target="_blank"` works there). There are THREE distinct code paths required, and the existing `src/app/api/pay-redirect/route.ts` is kept but audit-009 notes it was found non-functional for TikTok — "Route créée mais non utilisée".
**Consequences:** Estimated 40-60% of donations originate from social in Senegal (cultural pattern). A broken in-app flow is a business-killing bug, not a polish issue.
**Prevention:**
- FE-D payment page MUST branch on `isInAppBrowser()` + `isTikTokBrowser()` (both live in `src/lib/utils.ts` already — do not rewrite, trust them).
- For TikTok specifically: primary CTA is `navigator.share({ url })`, fallback is `navigator.clipboard.writeText(url)`. Never `window.location.href`.
- For Instagram/Facebook: primary CTA is `<a href={url} target="_blank" rel="noopener">`, secondary is `navigator.share()`, tertiary is copy-link.
- For Safari/Chrome: direct `window.location.href = url`.
- The Banani payment screen design will show ONE button. Add hidden branching logic; do not expose "Share vs Direct" to the user.
- **Write a visual test matrix** (`audits/audit-010-banani-inapp-matrix.md`) before declaring FE-D done: TikTok iOS, TikTok Android, Instagram iOS, Instagram Android, Facebook iOS, Facebook Android, Safari, Chrome. 8 cells.
- Re-read audit-008 and audit-009 before touching FE-D. They document approaches already tried and rejected (base64 proxy, direct 302, etc.). Do not reinvent.
**Warning signs:**
- Drop-off funnel: `/c/<slug>/paiement` → `/c/<slug>/success` conversion < 50% on mobile user agents containing `TikTok` or `musical_ly`.
- "Payer" button click events without subsequent `pay-redirect` or `pay.wave.com` referrer in the next 60s.
- Support emails: "J'ai cliqué payer et rien ne s'est passé".
**Phase:** FE-D (public donor flow). Ship with an audit doc.

---

### P03: Commission basis-points rounding drift — seller gets paid 1 FCFA less than they see
**What goes wrong:** BE-06 hard-codes commissions as `Math.round((amount * rate) / 10000)`. For a 10 000 FCFA festive donation at 800 bp: `Math.round((10000 * 800) / 10000) = 800`, seller gets 9 200. Fine. But for 12 345 FCFA: `Math.round((12345 * 800) / 10000) = Math.round(987.6) = 988`, seller gets 11 357. Donor sees "j'ai donné 12 345 FCFA", seller sees "reçu 11 357", total collected on the public page sums donor-side amounts (12 345) but the payout balance shows seller-side (11 357 + ...). Mismatched rounding across three views = ticket storm.
**Why it happens:** Three quantities in play (gross, commission, net), all integers, any two may be rounded independently if code is not centralized.
**Consequences:** Donor/seller/public page show three different totals. Worse: if the seller has 100 donations and each drifts by 1 FCFA, the withdrawal balance is off by 100 FCFA and Bictorys payout fails validation.
**Prevention:**
- Single pure helper `computeCommission(gross: number, subtype: "festive"|"solidaire"): { rate: number; commission: number; net: number }` in `backend/src/lib/commission.ts`. Rate is stored in bp, commission is `Math.floor((gross * rate) / 10000)` (floor, NOT round — always in favor of the seller), net is `gross - commission`. Invariant: `commission + net === gross` always.
- Unit test the helper with 100 fixture amounts including edge cases: 1, 99, 100, 101, 999, 12345, 999999, 1000000.
- Public `/api/cagnottes/:slug` progress endpoint MUST sum `Order.amount` (gross), not `Order.sellerAmount`. Document this explicitly in BE-04 code comments.
- `GET /api/withdrawals/balance` MUST sum `Order.sellerAmount` and check `SUM(sellerAmount) = SUM(amount) - SUM(commissionAmount)` with an assert in dev.
- If `Block.subtype` is ever edited after donations exist, do NOT recompute commission on old orders. Lock the subtype once paid orders > 0 (superRefine in BE-04).
**Warning signs:**
- Unit test diff > 0 on invariant `commission + net === gross`.
- Withdrawal balance query returns a non-integer (shouldn't happen with Int columns, but catch bad casts in JS).
- Support ticket: "Mon total sur la page publique ne correspond pas à mon solde".
**Phase:** BE-06 (commission logic). Unit tests are Phase 0 scope even without Vitest — write a standalone `backend/scripts/test-commission.ts` script.

---

### P04: Slug reservation race — two sellers create `les-30-ans-de-thomas` within milliseconds → 500 error or duplicate
**What goes wrong:** BE-03 describes `ensureUniqueSlug(base, prisma)` as a sequential "try `base`, then `base-2`, then `base-3`". Under concurrent creation (two creators, same title), both transactions read "slug free", both insert, one crashes on the unique index. Worse: if the index is added AFTER the collision check, you can commit a duplicate.
**Why it happens:** Read-then-write without locking. Neon serverless has no `SELECT FOR UPDATE` on index probes.
**Consequences:** First seller sees "Cagnotte créée", second sees 500 and loses their wizard state. At worst (if index is missing) two cagnottes share a slug and `/c/<slug>` is nondeterministic.
**Prevention:**
- Add `slug String? @unique` to `Block` in BE-01 and push the migration BEFORE coding BE-03. The index is the ultimate guard.
- Implementation pattern: loop up to 10 attempts, each attempt `prisma.block.create({ data: { ..., slug: candidate } })` in a try/catch. On `P2002` (Prisma unique violation) increment the numeric suffix and retry. On success, return.
- Cap retry count at 10 → if still colliding, append timestamp-based 4-char suffix (`les-30-ans-de-thomas-2048`). Acceptable fallback that preserves readability.
- **Reserved words check is a list comparison, not a DB query** — do it in memory before the insert attempt: `["api","admin","login","signup","dashboard","nouvelle","create","toutes-les-cagnottes","tableau-de-bord","profil","notifications","participations","aide","tarifs","contact","c","_next","public"]`.
- Include the "NFD strip diacritics" step in unit tests with Senegalese names: `Coumba Ndiaye`, `Fatoumata Dramé`, `Mame Diarra Bousso`.
**Warning signs:**
- Server log: Prisma `P2002` on `Block.slug` more than 0.5% of `POST /api/blocks` calls (normal is ~0 because duplicate titles are rare in practice).
- Wizard step-3 abandons > 5% (user hits "Créer" and gets a toast error).
**Phase:** BE-01 (unique index) + BE-03 (retry logic). Unit test with `slug.test.ts`-style script.

---

### P05: Private-cagnotte slug leaks through SEO / list endpoints / robots
**What goes wrong:** PROJECT.md locks "Private cagnotte URL obscurity only — if you have the slug you can load it". BE-04 correctly excludes private cagnottes from `GET /api/cagnottes` list. But a private slug can still leak via: (a) a `sitemap.xml` that enumerates all slugs, (b) the public list endpoint being paginated by id and a naive `limit=999999` query returning private items before the filter, (c) the `/api/cagnottes/:slug/participants` endpoint returning 200 with participant data even when visibility is private (it should, per design) but also exposing `displayName` of donors who meant to donate privately, (d) the Next.js `generateStaticParams` accidentally statically-generating private slugs for ISR, (e) the `Cache-Control: s-maxage=300` on the detail endpoint causing a CDN to serve a cached private page to the wrong visitor.
**Why it happens:** Privacy-by-URL requires ZERO leakage across ALL enumeration paths. Any single leak breaks the contract.
**Consequences:** Family wedding pot gets indexed on Google. User trust destroyed.
**Prevention:**
- `GET /api/cagnottes` must `WHERE config->>'visibility' = 'public'` **in the SQL query**, not as a post-filter. Verify with an EXPLAIN and a test fixture that creates private + public and asserts only public shows.
- Robots.txt MUST disallow `/c/` by default; slug-owner can opt-in individual cagnottes to indexing via a `seoAllow: boolean` flag. Until BE-04 adds this, disallow all of `/c/`.
- `next-sitemap` or any sitemap-generation script MUST query only `visibility === 'public'`. Add test fixture.
- `Cache-Control` on `GET /api/cagnottes/:slug` for private variant: `private, no-store` (force per-user). For public: `public, max-age=60, s-maxage=300`. Branch in the response handler.
- Next.js App Router `generateStaticParams` for `/c/[slug]` MUST filter `visibility === 'public'`. If you use `dynamicParams = true` (default), private cagnottes get SSR'd on first hit — OK, but then the page's route segment config must set `export const revalidate = 0` for private pages (branch based on visibility inside the page itself, not via params).
- The participants endpoint respects `isAnonymous` but the `displayName` for non-anonymous donors is still their real name. For PRIVATE cagnottes, consider masking last name by default (`Julien R.`) even when donor is not anonymous. Product decision — raise in BE-04 review.
- Add a smoke-test step in `backend/scripts/smoke-test.ts` that creates a private cagnotte and asserts: (a) not in `/api/cagnottes` list, (b) accessible by exact slug, (c) not in sitemap, (d) `Cache-Control` header is `private, no-store`.
**Warning signs:**
- Google Search Console shows `/c/` URLs indexed.
- `Referer: google.com` on `/api/cagnottes/:slug` for any private cagnotte.
- `/api/cagnottes?limit=10000` returns private items.
**Phase:** BE-04 (public endpoints) + FE-D (page caching headers). Audit during the 0.11 smoke test.

---

### P06: Notifications subsystem fires twice because webhook + cron both detect a milestone
**What goes wrong:** BE-07 hooks notifications in two places: (a) the webhook PAID transition fires `MILESTONE_REACHED` when the new total crosses 50% or 100%, (b) a later cron / recompute job might detect the same condition if `Block.totalCollected` is materialized or if a seller manually edits the goal amount downward (making the current total suddenly cross a new threshold retroactively). The `CAGNOTTE_ENDING_SOON` hook has the same shape: the 5-min order-expiration cron scans all cagnottes within 3 days of end, potentially firing every 5 minutes.
**Why it happens:** No per-event dedupe key; the cron has no idempotency memory; "did we already notify for this milestone" is not persisted.
**Consequences:** Seller gets 1 milestone notification every 5 minutes for 3 days before the end. App uninstalled. Email provider rate-limits or blocks the domain.
**Prevention:**
- Every notification dispatch MUST go through `createNotification()` which enforces a **dedupe key**: `sellerId + type + (blockId|orderId|withdrawalId) + milestone`. Store as a `@@unique([sellerId, type, blockId, data->>'milestone'])` partial index OR as a dedupe check at insert (SELECT then INSERT inside a transaction).
- Better: add an explicit `dedupeKey String @unique` column on `Notification` and compute it per type (`"milestone:blockId:50"`, `"ending_soon:blockId"`, `"donation_received:orderId"`, `"payout:withdrawalId:completed"`). Unique index = hard guarantee.
- Ending-soon cron: **skip if `Notification` already exists with `dedupeKey = "ending_soon:blockId"`**. O(1) check.
- Milestone detection: compute pre- and post-transaction percent, fire for each threshold that was STRICTLY crossed (`pre < threshold <= post`). This prevents goal-reduction retroactive fires but you must also gate "only fire if not in the `Notification` dedupe index".
- Email side-effect: `createNotification()` enqueues `emailQueue` job with `jobKey = dedupeKey`. The `JobQueue` already deduplicates by key (verify in `lib/queues/JobQueue.ts` — if it doesn't, add it).
- `PAYOUT_FAILED` should be re-fire-able (if admin retries a payout and it fails again, seller needs to know) — use `dedupeKey = "payout:withdrawalId:failed:attempt:N"` with attempt counter.
**Warning signs:**
- `SELECT type, dedupeKey, COUNT(*) FROM Notification GROUP BY 1,2 HAVING COUNT(*) > 1` returns rows.
- Resend dashboard shows >1 delivery per `dedupeKey` logged in email subject tag.
- Seller support: "Je reçois 10 emails pour la même chose".
**Phase:** BE-01 (add `dedupeKey` column + unique index) + BE-07 (enforce in `createNotification`).

---

### P07: `/api/orders` DDoS floods DB with PENDING orders during a viral moment
**What goes wrong:** CONCERNS.md §Missing Critical Features — `/api/orders` is explicitly skipped from rate limiting. During a viral TikTok share, legit donors hammer the endpoint; attackers can trivially script 10 000 PENDING orders / hour, filling DB. The 5-min order-expiration cron only reaps after 30min, so the DB is growing faster than it drains. Bictorys charge creation also costs API calls and may rate-limit us.
**Why it happens:** The current skip rule `url.startsWith("/api/orders")` is from the fari.store commerce flow where PENDING orders were cheap cart entries. For a cagnotte, each PENDING order triggers a Bictorys API call (expensive + quota-bound).
**Consequences:** Bictorys quota exhaustion during a viral moment → legit donors see "Paiement indisponible" → cagnotte loses momentum at peak.
**Prevention:**
- Replace the skip rule with a dedicated limiter: `/api/orders` → 20 req/min per IP, 100 req/hour per IP, 5 req/min per `customerEmail` if provided. Keep the global limiter as a safety net.
- Add a circuit breaker on the Bictorys charge call: if 5 consecutive failures in 30s, return cached "Paiement temporairement indisponible, réessayez dans 1 minute" for 2 minutes. Protects quota and gives UX feedback.
- **Do not use IP alone** — Senegalese donors often share CGNAT, many legit users behind one IP during viral moments. Key on `IP + customerPhone` (if provided) with a higher threshold (100 req/hour per IP, 10 req/min per phone).
- Cron-expire PENDING orders every 2 minutes instead of 5, and reduce TTL to 10 minutes for FUNDRAISER orders (donors rarely leave a payment tab open).
- **Important:** rate limiting must NOT apply to the webhook callback from Bictorys (already handled by the skip list — keep that skip).
**Warning signs:**
- `Order` table row count growing > 100/min sustained (check dashboards).
- Bictorys dashboard shows quota warnings or 429s.
- `Order` table size grows disproportionately to actual PAID count (PAID/PENDING ratio < 10% is a warning).
**Phase:** BE-06 (order extensions). Add per-email limiter at the same time.

---

## Moderate Pitfalls

### P08: Neon serverless Prisma migration times out on the `Block.slug` unique index
**What goes wrong:** BE-01 adds `slug String? @unique` to `Block`. If the existing dev/prod DB has 10K+ block rows from fari.store (unlikely in this fork but possible), creating a unique index on Neon serverless can time out the connection (default 60s) and leave the schema in an inconsistent state. Prisma `db push` will retry and may re-apply.
**Why it happens:** Neon serverless auto-suspends and has tight query timeouts; `CREATE UNIQUE INDEX CONCURRENTLY` isn't supported in all Neon branches; `db push` uses plain `CREATE INDEX`.
**Prevention:**
- Before `db push`, run `SELECT COUNT(*) FROM "Block"` to size the table. If > 1000 rows, add the column as nullable WITHOUT the unique constraint first (`@unique` removed), then backfill in a separate script (`UPDATE Block SET slug = ... WHERE type='FUNDRAISER'`), then add the unique index in a third migration.
- Use Prisma's `migrate` flow (`prisma migrate dev`) instead of `db push` for this schema change so you get a named migration file and can reproduce on prod.
- Test on a Neon branch (create a dev branch from prod) before pushing to main.
- Back up the DB before migration (Neon point-in-time recovery is enabled by default on paid plans — verify).
**Warning signs:** `db push` hangs > 30s; seller login works but block creation 500s post-migration.
**Phase:** BE-01.

---

### P09: The 12 orphan Prisma models cause accidental bloat on `includes` that use `*`
**What goes wrong:** `backend/src/routes/sellers.ts` and others still reference dead-model fields (instagramUrl, tiktokUrl, youtubeUrl, themeColors, etc.). Any `prisma.seller.findUnique({ ... })` default selects ALL columns. For a viral cagnotte's public detail page that hydrates the organizer, each request drags ~30 unused columns (some are large JSON blobs: `themeColors`, `notificationPrefs`). On 3G, adds 2-5 KB per request.
**Why it happens:** Prisma defaults to full select; no-one has added `select` clauses because the schema cleanup is deferred.
**Prevention:**
- In BE-04, the `/api/cagnottes/:slug` handler MUST use explicit `select: { id, displayName, avatarUrl, slug, kycStatus }` for the organizer nested fetch. Never use bare `findUnique`.
- Add a lint rule or grep-check in `smoke-test.ts`: `grep -r "prisma.seller.findUnique" backend/src/routes/cagnottes.ts` should have a `select` clause on every match.
- Document this in CLAUDE.md at the same time as BE-12 update.
**Warning signs:** Network tab shows `/api/cagnottes/:slug` response > 5 KB for a simple cagnotte; includes fields the frontend doesn't render.
**Phase:** BE-04 + BE-12.

---

### P10: SSR of user-generated content on `/c/[slug]` allows stored XSS via `config.description`
**What goes wrong:** FUNDRAISER `config.description` (rich text, 2000 chars) and `donorMessage` (500 chars) are user-generated. Next.js 16 App Router renders these server-side by default. If the page uses `dangerouslySetInnerHTML` or a markdown renderer that doesn't sanitize, a creator can inject `<script>` and steal visitor session cookies.
**Why it happens:** Banani designs typically render rich text; "display description" is ambiguous about HTML vs plain text.
**Prevention:**
- Store `description` as **plain text only**. Strip all HTML in the Zod schema at BE-04 write time: `.transform((s) => s.replace(/<[^>]*>/g, ''))`. Document: "rich text is out of scope for v1".
- In the React component, render via `{description}` as a React text node. NEVER `dangerouslySetInnerHTML` anywhere on the public page.
- If Banani design shows line breaks, use `white-space: pre-wrap` on the container, not HTML `<br>` injection.
- Same for `donorMessage` on the participants feed.
- Content-Security-Policy header: `default-src 'self'; script-src 'self' 'nonce-...' https://cdn.bictorys.com`. Set in `next.config.ts` headers.
- Cookie `izy-token` is httpOnly so JS can't read it directly; the `izy-csrf` cookie IS JS-readable — limit XSS blast radius by ensuring a stolen CSRF cookie is not enough (CSRF double-submit requires the httpOnly cookie too, which is safe). But XSS still lets attacker make authed requests via fetch with credentials. Prevention = never allow HTML in UGC.
**Warning signs:**
- `description` stored in DB contains `<` or `>` characters.
- CSP reports (`/api/csp-report`) showing script violations.
**Phase:** BE-04 (Zod transform) + FE-D (render as text node).

---

### P11: Next.js App Router ISR caches a cagnotte progress bar at 50% and never updates
**What goes wrong:** FE-D uses `export const revalidate = 60` on `/c/[slug]` for performance. Donation comes in → webhook fires → page serves stale cached progress for up to 60s. Donor who just paid refreshes the page and sees their donation hasn't appeared → thinks it failed → pays twice.
**Why it happens:** ISR is great for mostly-static content; cagnotte progress is real-time by nature.
**Prevention:**
- Split the page: static shell (title, description, organizer, cover) is ISR-cached at `revalidate = 300`; the progress bar + recent participants is fetched client-side from `/api/cagnottes/:slug/participants` and `/api/blocks/:id/progress` with `cache: 'no-store'` and a 15s polling interval on the page.
- After donation success (redirect from Bictorys success URL), invalidate the client-side cache of the progress endpoint immediately and poll for 30s waiting for the new order to appear.
- On the backend, when a webhook fires PAID, call `revalidateTag('cagnotte:' + slug)` via a Next.js webhook endpoint (`/api/revalidate?tag=...`) protected by a shared secret. This flushes the shell cache too. Alternative if cross-service revalidation is too complex: set `revalidate = 30` on the shell and accept 30s lag on non-progress fields.
- Use `Cache-Control: no-store` on `/api/cagnottes/:slug/participants` response.
**Warning signs:**
- Donor says "j'ai donné mais ma donation n'apparaît pas sur la page".
- Progress bar stuck at a value while DB shows a higher total.
**Phase:** FE-D + BE-04 (set correct cache headers).

---

### P12: The French `é`, `à`, `ç` in donor names break slug generation on seller full-names
**What goes wrong:** BE-03 slug generation applies `NFD` normalize + strip diacritics for block titles. If applied elsewhere (e.g. seller `slug` on signup, which is out of scope but may be touched during BE-09) without the same normalization, `Thomas Diémé` becomes `thomas-dm` (incomplete strip) or `thomas-diémé` (not URL-safe) depending on regex.
**Prevention:**
- `slugify()` helper must use: `str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)`.
- Unit test fixtures: `Thomas Diémé`, `Coumba Ndiaye`, `Les 30 ans de Thomas`, `Mariage de Fatou & Amadou`, `C'est l'anniversaire !`, `🎉 Pot commun 🎉`, `Наташа` (unlikely but tests the `[^a-z0-9]+` fallback — should return `""` which then triggers fallback to `"cagnotte"`).
- Empty-slug fallback: if slugify returns empty string, use `"cagnotte-" + shortId` (last-resort uniqueness).
**Warning signs:** Slug contains non-ASCII characters; 404s on `/c/<slug>` for cagnottes that look fine in DB.
**Phase:** BE-03. Test fixtures committed alongside the helper.

---

### P13: Email provider (Resend) rate-limits during viral moments → donation confirmation emails dropped
**What goes wrong:** 500 donations in 10 minutes = 500 `DONATION_RECEIVED` emails to sellers + 500 confirmation emails to donors = 1000 emails. Resend free tier is 100/day, paid tier 10 000/day but with burst limits. Queue fills, retries fail.
**Prevention:**
- Use the existing `emailQueue` (Upstash Redis-backed) with built-in retries and exponential backoff — DO NOT send inline.
- Throttle: max 10 emails/sec to Resend (configure in `JobQueue` worker or add a token bucket).
- For sellers, batch `DONATION_RECEIVED` emails: if 10 donations arrive in 5 minutes, send ONE digest email instead. Notification in the app stays per-donation, but email is grouped.
- For donors, the confirmation email is critical (proof of donation for tax purposes in some cultures) — do not batch, but queue and accept 1-5 min delay on burst.
- Monitor Resend dashboard; alert on queue backlog > 500.
- Have Resend API key and an alternative (Mailgun/Postmark) ready to swap if quotas hit in production.
**Warning signs:** Upstash queue depth > 500 for > 10 minutes; Resend dashboard shows 429.
**Phase:** BE-07 (email templates + batching logic). Not urgent for v1 launch but document.

---

### P14: `setInterval` background jobs lost on server restart leave PENDING orders forever
**What goes wrong:** CONCERNS.md §Background Jobs — the 5-min order-expiration cron is `setInterval`. If the backend crashes or redeploys, the interval is lost. `setInterval` starts fresh on next boot, but any orders that should have been expired during downtime are not caught up. PENDING orders linger indefinitely, polluting metrics and potentially allowing a delayed webhook to PAY an "expired" order the donor thought had failed.
**Prevention:**
- v1 acceptable: on server boot, run a one-shot `expireStaleOrders()` that sweeps all PENDING orders older than 30 min. This provides catch-up. Add to `index.ts` before `setInterval` registration.
- Same catch-up for `endingSoon` cron: on boot, find all FUNDRAISER blocks ending in ≤ 3 days and fire `CAGNOTTE_ENDING_SOON` via the dedupe-keyed `createNotification` (safe to call — dedupe prevents re-fire).
- v2: migrate to `JobQueue`-based scheduled jobs. Out of Phase 0 scope per PROJECT.md locked decision.
**Warning signs:**
- `SELECT COUNT(*) FROM Order WHERE paymentStatus='PENDING' AND createdAt < NOW() - INTERVAL '1 hour'` > 0.
- After a deploy, donors report "J'ai payé il y a une heure, ma donation apparaît" (late webhook processed an old PENDING).
**Phase:** BE-07 (notifications cron hook) — add catch-up at the same time.

---

### P15: KYC + withdrawal PIN flow has no lockout → brute force the 6-digit PIN
**What goes wrong:** BE-09 enforces PIN on withdrawal. A 6-digit PIN has 1M combinations. Without rate limiting or lockout, an attacker with seller-account access (via stolen password or XSS) can brute-force the PIN in minutes.
**Prevention:**
- Rate limit `POST /api/withdrawals` attempts: 5 failed PIN attempts / 15 min per seller → lock withdrawal for 1 hour. Logged + notification to seller.
- After 10 failed attempts / 24h → hard lock until password reset.
- Store PIN attempts in Redis with TTL (`withdrawal:pin:fails:sellerId`).
- Notify seller on first failed attempt via email + in-app notif (`PAYOUT_FAILED` type extended, or new `SECURITY_ALERT` type).
- Do not return distinguishable errors ("PIN incorrect" vs "PIN expired"); use a generic "Code incorrect".
**Warning signs:** Redis key `withdrawal:pin:fails:*` with values > 3; seller-support "mon compte est bloqué".
**Phase:** BE-09.

---

### P16: Bictorys webhook 5-min timestamp tolerance = replay window
**What goes wrong:** CONCERNS.md §Security — existing handler accepts webhooks within 5 min of `timestamp` header. An attacker who captures one legitimate webhook (MITM, log leak, Bictorys response logged in error tracker) can replay it for up to 5 min. With the unique-constraint fix in P01, replay is deduplicated by `externalId`, but only AFTER the DB write — the signature check happens before DB, so a valid signature + valid timestamp re-executes the full handler path, potentially firing notifications before the dedupe index hits.
**Prevention:**
- Reduce tolerance to 60 seconds.
- Add a per-transactionId replay cache in Redis: `webhook:processed:{transactionId}` with 24h TTL. Check BEFORE signature verification for a fast-path 200.
- Log all rejected webhooks with reason (`timestamp_expired`, `signature_invalid`, `replay_detected`).
**Warning signs:** Sudden spike in `webhook.rejected.replay` logs; discrepancy between Bictorys dashboard count and `WebhookLog` count.
**Phase:** BE-01 or BE-07 (small change, bundle with notification dispatch refactor). Alternatively defer to v2 if tight on scope — document in CLAUDE.md concerns.

---

## Minor Pitfalls

### P17: FCFA formatting with `Intl.NumberFormat` uses a non-breaking space that some Android fonts render as a question mark
**Prevention:** Use custom formatter `formatPrice(n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'` with ASCII space. Test on a Samsung Galaxy A with default font. **Phase:** FE-A.

### P18: Phone number validation rejects legitimate Senegalese numbers with `+221` prefix variations
**Prevention:** Accept `+221 77 xxx xx xx`, `221 77 xxx xx xx`, `77 xxx xx xx`, `+22177xxxxxxx`, `77xxxxxxx`. Normalize to `+221XXXXXXXXX` (E.164) before storing. Regex: `/^(\+?221)?0?([0-9]{9})$/` then prepend `+221`. Test fixtures: `+221 77 123 45 67`, `771234567`, `+221771234567`. Reject land lines (starts with `33`) or accept them per product call. **Phase:** BE-06 + FE-D form.

### P19: Pagination cursor based on `createdAt` breaks when two orders have identical timestamps (clock resolution)
**Prevention:** Cursor = `createdAt + id` composite. Prisma: `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]` with `cursor: { createdAt_id: { createdAt, id } }`. **Phase:** BE-04 (participants endpoint).

### P20: Banani design uses `max-w-[1280px]` containers; Senegalese users often browse at 360px not 375px
**Prevention:** Test on Samsung Galaxy S8 viewport (360×740). Tailwind's default mobile-first classes work, but component-specific min-widths must be audited. **Phase:** FE-B + FE-C.

### P21: `navigator.share()` not supported in some Android Chrome versions < 89 (still present in Senegalese market)
**Prevention:** Always check `if (navigator.share && navigator.canShare)` before using. Fallback to `navigator.clipboard.writeText` + toast "Lien copié". Already handled in existing `PaymentModal` — ensure Banani replacement keeps the fallback. **Phase:** FE-D.

### P22: Image upload via R2 proxy doesn't validate file type server-side → SVG with embedded script stored as avatar
**Prevention:** In `routes/upload.ts`, validate MIME + magic bytes (`image/png`, `image/jpeg`, `image/webp` only, no SVG). Re-encode to JPEG server-side if possible (sharp). Max size 2 MB for avatars, 5 MB for covers. **Phase:** BE-09 or bundled with BE-11 smoke test. Likely already in place — verify.

### P23: Banani screens say "PayDunya" — will leak into French labels file if copy-pasted blindly
**Prevention:** Do a `grep -r "PayDunya" src/` after FE-A; replace with "Bictorys" or no-brand label ("Paiement sécurisé"). Add a pre-commit grep. **Phase:** FE-A.

### P24: `deletedAt` soft-delete on Seller not filtered in `/api/cagnottes` list
**Prevention:** `WHERE organizer.deletedAt IS NULL` on the list and detail endpoints. **Phase:** BE-04.

### P25: 3G network means long-running requests time out; the frontend `api()` wrapper has 30s timeout
**Prevention:** For the Bictorys charge creation (can take 5-15s on slow Bictorys response), either increase timeout for `/api/orders` to 45s OR return immediately with a pending state and poll `/api/orders/:ref/status`. The latter is better for UX and already partially implemented. **Phase:** BE-06 + FE-D.

---

## Phase-Specific Warnings

| Phase | Likely Pitfall(s) | Mitigation |
|-------|-------------------|------------|
| **BE-01 (schema)** | P01 (unique index on WebhookLog), P06 (`Notification.dedupeKey` unique), P08 (Neon timeout on backfill) | Add unique constraints explicitly; test migration on Neon branch first |
| **BE-03 (slug)** | P04 (race), P12 (unicode) | Retry on P2002; NFD normalize + test fixtures with Senegalese names |
| **BE-04 (public endpoints)** | P05 (privacy leak), P09 (Prisma select bloat), P10 (XSS), P11 (cache), P24 (soft-delete filter) | Explicit `where`, explicit `select`, Zod strip HTML, `Cache-Control: private, no-store` for private |
| **BE-06 (orders)** | P03 (commission rounding), P07 (rate limit), P25 (timeout) | Single `computeCommission` helper + tests; per-email rate limit; status-polling UX |
| **BE-07 (notifications)** | P01, P06 (dedupe), P13 (email flood), P14 (cron catch-up), P16 (webhook replay) | Queue-based dispatch with dedupe key; email throttle; boot catch-up sweep |
| **BE-09 (withdrawal PIN)** | P15 (brute force), P22 (KYC upload MIME) | Redis-based PIN lockout; magic-byte MIME check |
| **BE-11 (smoke test)** | P05 (verify privacy), P03 (verify rounding), P01 (verify replay) | Add explicit test cases for each |
| **FE-A (foundation)** | P17 (FCFA format), P23 (PayDunya leak) | Custom `formatPrice`; grep-check for brand strings |
| **FE-D (donor flow)** | P02 (in-app browser), P10 (XSS), P11 (cache), P21 (share API), P25 (timeout) | Branch on UA; no `dangerouslySetInnerHTML`; client-side polling; check `navigator.share` exists |
| **FE-H (money screens)** | P15 (PIN UX), P22 (KYC upload) | Generic error messages; client-side MIME check for faster UX |

---

## Sources & Confidence

- **HIGH confidence** (based on existing project docs, verified):
  - P01, P06, P14 — grounded in `CONCERNS.md` explicit findings
  - P02 — grounded in `audit-008` and `audit-009` real production experience
  - P05, P07, P16 — grounded in `CONCERNS.md`
  - P10, P11 — standard Next.js 16 App Router security + caching patterns (React 19 docs)

- **MEDIUM confidence** (domain-specific inference from codebase + general mobile-money best practice):
  - P03, P04, P08, P12, P13, P15 — follow directly from architecture but not yet tested
  - P17, P18, P19, P20, P21 — standard mobile-web gotchas for African/Senegalese market

- **LOW confidence** (worth flagging but untested here):
  - P22, P23, P24, P25 — plausible gaps but need verification against current code during implementation

**Key references:**
- `/Users/amadoufall/Desktop/cagnottes-sn/CLAUDE.md` — project-wide rules + known quirks
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/codebase/CONCERNS.md` — codebase audit
- `/Users/amadoufall/Desktop/cagnottes-sn/audits/audit-008-inapp-browser-payment.md`
- `/Users/amadoufall/Desktop/cagnottes-sn/audits/audit-009-tiktok-payment-flow.md`
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/banani/BACKEND-PLAN.md`
- `/Users/amadoufall/Desktop/cagnottes-sn/.planning/PROJECT.md`
