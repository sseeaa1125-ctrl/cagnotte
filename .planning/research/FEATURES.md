# Feature Research

**Domain:** Senegalese / West-African online fundraising (cagnotte) platform with mobile money rails
**Researched:** 2026-04-13
**Confidence:** MEDIUM-HIGH (Banani screens + locked product decisions give high signal on scope; ecosystem claims about African mobile-money crowdfunding rely on training data + publicly known patterns of Leetchi, GoFundMe, HelloAsso, M-Changa, Cotizi, Wave UX — flagged LOW where only a single source)

---

## Ecosystem context (West Africa / Senegal)

The reference mental model for Senegalese donors is **Wave** first, then Orange Money, then Free Money, then card (rare). The reference mental model for Senegalese creators is **WhatsApp-first sharing** (not Facebook, not email). Every design decision below inherits from those two facts. Cagnottes.sn sits in the same product category as:

- **Leetchi** (French, Mangopay): the original "cagnotte en ligne" — shared link, contributors, organizer receives funds. Donor-friendly. This is the format Senegalese diaspora users already know.
- **HelloAsso** (French, non-profit): same mechanic with strict association-only scoping and "pourboire plateforme" (tip-based, 0% commission) model.
- **GoFundMe**: story-driven, card-centric, Western.
- **M-Changa** (Kenya, M-Pesa): closest African analog — M-Pesa-native, WhatsApp-shared, family-and-funerals use case. Strong precedent.
- **Cotizi** (Morocco): local mobile-money tontine/cagnotte.
- **Bengo / Afrikrea / Baobab+**: tangential (commerce, not donations) but share the "FCFA integer + mobile money + French UI" constraints.
- **Tontines** (offline): the cultural baseline. Cagnottes.sn is digital-formalised tontine-thinking for one-shot events (mariage, baptême, santé, décès, départ).

The dominant donation sizes in Senegal are **500 – 25 000 FCFA** per contribution, with a long tail above 50 000 FCFA for diaspora donors. This shapes suggested-amount chips, minimum amounts, and commission tolerance.

---

## Feature Landscape

### Table Stakes (users expect these — missing = product feels broken)

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| **Shareable cagnotte URL** (`/c/<slug>`) | The product literally is "a link you share on WhatsApp" — zero link, zero value | LOW | Slug design already locked (simple, numeric suffix on conflict). Slug is the whole brand. |
| **Real-time progress bar + collected total** | Leetchi / M-Changa / GoFundMe all show `X FCFA sur Y FCFA` with % bar. Donors decide their amount based on how close the goal is | LOW | Already built: `GET /api/blocks/:id/progress`. Re-surface in new `GET /api/cagnottes/:slug`. |
| **Donor count + recent donors list** | Social proof — "247 participants" reassures an anonymous visitor that the cagnotte is real | LOW | Already built in `GET /api/blocks/:id/donations`. Needs extension for anonymous masking + message privacy. |
| **Wave / Orange Money / Free Money as top-level payment options** | If Wave is not a literal button on the payment screen, Senegalese users bounce. Card is an afterthought | LOW (already integrated via Bictorys) | Screen 24 already has this layout. Keep Wave first, OM second, Free third, Carte last — match user share-of-wallet order. |
| **FCFA integer amounts, no decimals, `15 000 FCFA` formatting** | Euros / decimals signal "this is not for me" | LOW | `formatPrice()` already in plan. |
| **French UI, Senegal-flavored copy** | The Banani export is already French but reads European (euros, +33). Needs localization pass. | LOW | Pure copy work — loaded into `constants.ts`. |
| **Suggested amount chips on checkout** | Every crowdfunding platform has `1 000 / 2 000 / 5 000 / 10 000 / Custom`. Removes decision friction. | LOW | Already in `fundraiserBlockConfigSchema.suggestedAmounts`. |
| **Cover image on cagnotte detail** | Photo of the beneficiary / event = trust. No photo = suspicious. | LOW | Upload via R2 already wired. |
| **Donor message / dedication** | "Bon anniversaire Mariame !" — the reason to donate publicly rather than by direct Wave transfer. This is the single biggest reason to use a platform vs. a direct Wave payment. | LOW | `Order.donorMessage` already exists. Just surface it. |
| **Anonymous donation option** | Leetchi standard. Donor wants to contribute to their cousin's baptism without his nosy wife seeing the amount. | LOW | `Order.isAnonymous` is BE-02. Critical for adoption. |
| **Private message option** | Donor wants the organizer to see the message but not the public. Standard on Leetchi / HelloAsso. | LOW | `Order.messageIsPrivate` is BE-02. |
| **WhatsApp share button on every share surface** | On Senegalese phones, WhatsApp is the OS. A "Copy link" button that isn't a WhatsApp button loses 60% of shares. | LOW | Add to `ShareSheet`. Pre-fill message template in French. |
| **Thank-you / payment confirmation page** | Donors need a receipt moment. Without it they don't know if the payment worked (mobile money is async). | LOW | Missing from Banani export — we design it. |
| **Email receipt to donor** | Tax-style reassurance, even if no fiscal value. Non-negotiable for diaspora donors. | LOW | Email queue + Resend already wired. Template needed. |
| **Payment-status polling for donor** | Mobile money confirmations are asynchronous (webhook may lag 5-60s). The donor's browser must poll or long-wait. Bounce rate on "thank you" without this is high. | LOW | `GET /api/orders/:ref/status` already exists. |
| **Creator dashboard with total collected / cagnottes active / recent donations** | Creators check the dashboard 20x / day during an active campaign. | LOW | Already in `GET /api/sellers/dashboard/stats`. |
| **Edit cagnotte after launch** (title, description, cover, end date) | Typos happen. Deadlines slip. Not allowing edits is unusable. | LOW | `PATCH /api/blocks/:id` already exists, needs verification for FUNDRAISER partial updates. |
| **Close / extend cagnotte end date** | Senegalese events get postponed (funerals, weddings) — deadlines are not sacred | LOW | Part of edit flow. |
| **KYC before withdrawal** (ID + selfie) | Bictorys + regulatory reality. Cannot pay out a cagnotte to someone who hasn't proven identity. | MEDIUM | Data model already exists. Upload flow + admin review workflow needed. Admin panel is out of scope so review must be manual / off-platform. |
| **Withdrawal / payout to Wave or Orange Money** | The whole point of collecting is getting paid out. Needs to land in the creator's mobile money wallet, not a bank account. | MEDIUM | Already wired via Bictorys payout + separate private key. |
| **Withdrawal PIN** | Everyone in Senegal understands a 4-6 digit PIN for money (Wave UX). Password-alone feels unsafe. | LOW | `Seller.withdrawalPinHash` exists. |
| **Email verification + password reset** | Table stakes for any auth system. | LOW | Backend routes exist, need frontend landing pages. |
| **Public cagnotte discovery page** (`/toutes-les-cagnottes`) | Not critical for v1 share-a-link flow but creates "platform" perception and inbound SEO | MEDIUM | BE-05 planned. Keep simple: search + category chips + pagination. |
| **Responsive on 375px Android, works on 3G** | Senegalese median device. Non-negotiable. | MEDIUM | Tailwind mobile-first already mandated. |
| **In-app browser payment workaround** (TikTok / IG / FB) | Cagnottes are shared on TikTok. The payment redirect breaks in TikTok WebView. Already fixed — protect this. | N/A | `audit-008` and `audit-009` already document it. Do NOT regress. |

### Differentiators (competitive advantage for this market)

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| **Festive vs Solidaire taxonomy with 6%/8% commission split** | Signals empathy — "funerals cost less than weddings" — and justifies the 8% festive fee by anchoring against the 6% health/aid rate. Directly addresses "pourquoi je paierais 8% ?" price objection. | LOW | Locked decision. Hard-coded basis points. Marketing angle, not just pricing. |
| **Occasion-based wizard** (anniversaire / mariage / naissance / décès / santé / urgence) | Pre-fills suggested amounts, cover image placeholders, default end dates, recommended goal ranges. Competitors treat all cagnottes the same. | MEDIUM | Extended FUNDRAISER Zod schema already plans it (BE-04). Leverage by populating smart defaults per occasion. |
| **Wave-first payment UX** (Wave button is the biggest, first, pre-selected) | Wave has ~60%+ share of Senegalese mobile money. Making it the primary path removes a decision. GoFundMe-style "Enter card details" is wrong here. | LOW | CSS only. |
| **French-Sénégalais copy register** ("participer" not "contribuer", FCFA formatting, Senegal-relatable examples on home) | Signals "this is for us, not a French app" — trust multiplier for diaspora + local | LOW | Pure copy. |
| **Milestone notifications** (50%, 100% of goal reached) | Emotional loop — creator gets a "Votre cagnotte a atteint 50%" push and shares the screenshot on WhatsApp, triggering a second wave of donations | LOW | BE-07 plans it. Proven pattern in M-Changa and GoFundMe. |
| **Donor message wall with pagination** (public view) | The wall becomes the emotional asset — people scroll it on their phones, screenshot, re-share. This is what differentiates a cagnotte from a direct Wave transfer. | LOW | Participants route already planned. Design the wall as the star of `/c/<slug>`. |
| **Hide amount / hide donor names toggles** (per cagnotte) | Cultural fit — some donations (sadaqa, zakat, family aid) are *religiously required to be discreet*. Western platforms don't surface this; it matters a lot here. | LOW | BE-04 schema. |
| **Suggested amounts pre-seeded by Wave's common bills** (500 / 1 000 / 2 000 / 5 000 / 10 000 / 25 000) | Match the bills people actually send on Wave — no mental currency conversion | LOW | Config-driven. |
| **One-link, one-tap WhatsApp share with pre-formatted message + image preview** | The share action IS the growth loop. Every platform that makes this 2+ taps loses. | LOW | OG meta tags + `navigator.share()` wrapper. |
| **"Je participe" sticky CTA that survives scroll on mobile** | Banani already designed this. Conversion-critical: the donate button must always be visible. | LOW | CSS. |
| **Pay-redirect base64 proxy for in-app browsers** | Already built. This is quietly a huge differentiator vs. naive competitors whose Wave redirects fail silently on TikTok/IG. | DONE | Protect this in regression tests. |
| **Commission transparency on checkout** ("Frais de plateforme: 6% · 300 FCFA") | Banani's current "Offerts" label is a LIE — fix it. Transparency is a trust signal, not a liability, *if the number is reasonable*. 6% is reasonable. | LOW | Copy fix in Phase D. |
| **KYC-gated withdrawal but zero-KYC donation** | Donors never see a KYC wall. Only creators who want to cash out hit it. This is the right friction split. | DONE | Already the design. |
| **Senegalese creator trust signals on home** (screenshots, participant count, "X cagnottes financées") | The home page is a trust-building surface, not a marketing surface. | MEDIUM | Requires a stats endpoint + cron. Fakeable for launch. |
| **End-date countdown + "bientôt terminée" urgency** | Standard crowdfunding psychology. Drives second-wave donations at J-3 / J-1. | LOW | Pairs with `CAGNOTTE_ENDING_SOON` notification (BE-07). |

### Anti-Features (commonly requested, actively harmful)

| Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| **Cryptocurrency / stablecoin payout** | "Diaspora wants USDT" | Regulatory nightmare, zero product-market fit in Senegal, creates the wrong kind of user base (speculators, not donors), Bictorys doesn't support it. Burns political capital with BCEAO. | Keep mobile money only. Diaspora already uses Wave + international transfer to local Wave account. |
| **Recurring donations / subscriptions** | "Like Patreon for charities" | Mobile money in West Africa does not support reliable recurring authorizations. Wave/OM charge on-demand via push, not stored-credential. Building it = fake UX that fails silently. Also wrong for cagnotte model (event-bound by definition). | Make it very easy to donate again on the same cagnotte. One-tap re-donate from participations tab. |
| **Cagnotte comments / threads** | "Users want to engage" | Moderation load, spam, community management cost. Senegalese comment sections on donation links become family drama. | Keep the donor-message wall (one-shot, tied to a paid donation). No free-form comments. |
| **Upvotes / likes on cagnottes** | "Gamification, social proof" | Wrong metric — creates a popularity contest that penalizes funerals / medical cagnottes vs. weddings. Harmful signal. | Show donor count and % of goal. Those ARE the social proof. |
| **Cagnotte categories ranked by "trending"** | "Discovery feature, like Product Hunt" | Incentivizes clickbait titles + makes health emergencies feel icky if they're "losing" the ranking. Wrong psychological loop for the domain. | Simple chronological + category filters on `/toutes-les-cagnottes`. No ranking algorithm. |
| **Matching donation / "platform doubles your gift"** | GoFundMe-style marketing gimmick | Real cost, zero differentiation, confusing pricing model, hostile to commission model. | Transparent commission instead. |
| **Real-time websocket updates on cagnotte page** | "Feel alive, see donations in real time" | Infrastructure cost for a 3G-optimized platform, zero measurable conversion lift on donation platforms (M-Changa doesn't bother). Competes with battery life on cheap Androids. | Cache-busting on every donation redirect + `useApi` stale-while-revalidate. Good enough. |
| **In-app chat between donor and creator** | "Donor wants to ask how the beneficiary is doing" | Moderation disaster, privacy-law exposure (donor PII), competes with WhatsApp which already works. | Donor-message on payment + creator shares WhatsApp in description. Off-platform = the right answer here. |
| **Reviews / ratings on creators** | "Trust signal" | Minority abuse of creators at the exact moment they are most vulnerable (funerals, sick family). Harmful. KYC is the trust signal. | KYC badge + verified creator name. No ratings. |
| **NGO / association verification tier** | "HelloAsso-style" | Requires legal infrastructure (association registration, tax deductibility) that does not meaningfully exist in Senegalese cagnotte context. Premature. | Defer to v2 after PMF. |
| **"Refund donor" button for the creator** | "What if someone donates by mistake" | Bictorys refund workflow is manual, expensive, and takes days. Creates support burden. Payout is near-instant — money is gone. | Clear pre-payment confirmation + donor contacts support out-of-band. |
| **Automatic goal increases** ("stretch goals") | Kickstarter-style | Kickstarter logic does not apply to fundraisers — the goal is the need, not a product roadmap. Confuses donors. | Let creators edit the goal manually. Optionally add a small "depuis l'objectif atteint" badge. |
| **Public "campaigns you've donated to" profile for donors** | "Like GoFundMe donor profiles" | Donors in Senegal want privacy, not a profile. The anonymity toggle is the whole point. | Keep donor-side "Mes participations" strictly private. |
| **Fee-free tipping model** (HelloAsso-style, 0% commission + optional donor tip) | "Ethical, no fees" | Donors in Senegal do not tip voluntarily. The tip conversion on HelloAsso works in France only because of cultural context. Burning the entire revenue model for an experiment = insolvency. | 6%/8% commission, transparent. |
| **PDF export of donor list / tax receipt generation** | "Professional feature" | No equivalent tax deduction regime for individual cagnottes in Senegal. PDF is just "fancy". Premature. | Defer to v2, triggered by actual user ask. |
| **Multi-currency (EUR, USD for diaspora)** | "Diaspora donors want to pay in euros" | Bictorys charges in XOF. Multi-currency display is a lie (FX happens elsewhere). Adds error surface. | Keep FCFA only. Show "≈ X €" as pure display helper if we want, *computed client-side*, no backend currency. |
| **Admin panel with commission override, moderation queue, user bans** | "We'll need it eventually" | Already explicitly out of scope. Manually moderate via DB access for v1. | Direct SQL + Prisma Studio for v1. |
| **Login with Google / Apple / Facebook** | "Lower signup friction" | No OAuth in backend, explicit out-of-scope decision, Banani CTAs already hidden. Senegalese users sign up with email + phone — OAuth is a Western habit. | Email + password only. Maybe phone login in v2. |
| **SMS notifications for donors and creators** | "Senegal is a phone-first market, use SMS not email" | SMS in Senegal is expensive (15-50 FCFA per message), unreliable per-operator, and requires a short code or Twilio-like gateway. The net value over email + WhatsApp sharing is low for v1. | Email for creator, nothing for donor beyond thank-you page. Revisit if engagement data justifies. |
| **Social login with phone number only** | "Everyone has a phone" | OTP delivery reliability in Senegal is a known pain — costs + delivery gaps break the funnel. Bictorys handles phone for payment, auth is a different problem. | Email + password in v1. Add phone-OTP login as v2 feature if signup drop-off justifies. |
| **Donor accounts / "donation history across cagnottes"** | "GoFundMe-style donor profile" | Donors largely come through shareable link, pay, leave. Forcing account creation kills conversion. | Keep donation 100% anonymous-capable. Offer optional "Save my email for receipts" checkbox only. |

---

## Feature Dependencies

```
Auth (login / signup / email-verify / reset)
    ├── Seller profile + KYC upload
    │       └── Withdrawal flow (requires KYC APPROVED)
    │               └── Withdrawal PIN (requires profile with PIN set)
    │                       └── Payout via Bictorys (requires PIN + KYC + bank/mobile)
    └── Creator dashboard
            └── Cagnotte creation wizard (festive or solidaire)
                    ├── Slug generation (requires Block.slug migration BE-01)
                    ├── Extended FUNDRAISER schema (BE-04)
                    └── Cover image upload (requires R2 upload — done)

Public cagnotte detail /c/<slug>
    ├── Slug (BE-01)
    ├── Extended schema (BE-04)
    ├── GET /api/cagnottes/:slug (BE-05)
    └── Participants pagination (BE-05, respects isAnonymous + hide flags BE-02)

Donation flow (public)
    ├── Amount picker (uses suggestedAmounts from config)
    ├── Donor info form
    ├── Message + anonymity toggles (BE-02)
    ├── POST /api/orders extended (BE-06, commission branch by subtype)
    ├── Bictorys charge (done, don't touch)
    ├── Pay-redirect proxy (done, protect)
    ├── Status polling on thank-you (done)
    └── Webhook → notification dispatch (BE-07)
            ├── DONATION_RECEIVED (always)
            ├── MILESTONE_REACHED (at 50% / 100%)
            └── DONATION_MESSAGE (if message present)

Notifications feed + preferences (BE-07 + BE-08)
    └── Feeds the bell icon in DashboardNavbar

Discovery page /toutes-les-cagnottes
    ├── GET /api/cagnottes list (BE-05, excludes private)
    ├── Search + category chips
    └── Pagination cursor

Share loop
    ├── Create-success screen ShareSheet
    ├── OG meta tags on /c/<slug> (WhatsApp preview)
    └── WhatsApp deep-link with pre-filled text
```

### Dependency Notes

- **Donation flow requires Block.slug (BE-01)**: the entire `/c/<slug>/participer` URL structure collapses without it. Must ship first.
- **Notifications require Order → PAID webhook**: already working, just add the dispatch call in the PAID branch (BE-07).
- **Milestone notifications require progress computation**: can reuse existing `GET /:id/progress` logic inline in webhook handler.
- **KYC gates withdrawal, not donation**: donors never see KYC. Asymmetric friction = correct design.
- **Public discovery (`/toutes-les-cagnottes`) depends on public list endpoint + cover images existing**: low-quality covers = ugly page. Prefer launching it only once seed data has real photos, or it's a "ghost town" on v1 day one.
- **ShareSheet depends on OG meta tags being correct**: WhatsApp Link Preview uses `og:image` + `og:title` + `og:description` fetched at share-time. Test with WhatsApp debug tools before launch.
- **Anonymity toggle + hideAmount/hideDonors conflict surface**: if a cagnotte has `hideDonors = true`, the donor's own toggle is irrelevant for public view. Backend must handle the precedence (creator settings win).

---

## MVP Definition

### Launch With (v1)

**The donation happy path end-to-end, nothing else:**

- [ ] Auth: signup, login, email verify, password reset, change password (essential — creators cannot use the product otherwise)
- [ ] Seller profile (basic personal info form)
- [ ] KYC upload (required for withdrawal, not donation)
- [ ] Withdrawal PIN set/change
- [ ] Cagnotte wizard: type picker → festive (3 steps) or solidaire (3 steps) → create-success with share
- [ ] Slug + cover image + goal + end date + suggested amounts + visibility + hideAmount + hideDonors
- [ ] Public `/c/<slug>` cagnotte detail with progress bar, cover, description, participants list, sticky donate CTA
- [ ] Donation flow: amount picker → donor info → message + anonymity → payment method picker → Bictorys → thank-you (polling)
- [ ] Email receipt to donor + creator on PAID
- [ ] Webhook → DONATION_RECEIVED notification + MILESTONE_REACHED at 50/100%
- [ ] Creator dashboard: KPIs + recent cagnottes + notifications bell
- [ ] Notification feed + prefs
- [ ] Edit cagnotte (title, description, cover, end date, goal — NOT slug)
- [ ] Withdrawal flow: balance → amount → account → PIN → confirmation
- [ ] Profile sidebar: Info / Security / Bank details / Notifications / KYC / Participations
- [ ] Home page (hero + trust signals + featured cagnottes + FAQ + footer)
- [ ] In-app browser pay-redirect proxy (do not regress, already built)
- [ ] WhatsApp share button everywhere it makes sense
- [ ] Legal placeholders (copy deferred per lock)

### Add After Validation (v1.x — first 90 days post-launch)

- [ ] Public discovery `/toutes-les-cagnottes` page **(gated on having enough real cagnottes to not be a ghost town)**
- [ ] Phone-number lookup / OTP login (if signup drop-off data justifies)
- [ ] Cagnotte stats view ("Voir les statistiques" — per-cagnotte analytics)
- [ ] Participations PDF export (only if requested by >5% of creators)
- [ ] Rename slug flow with 301 history (SlugHistory table)
- [ ] CAGNOTTE_ENDING_SOON cron notification at J-3
- [ ] "Bientôt terminée" badge on discovery page
- [ ] Trustpilot-style trust badge on home (if we have real reviews)

### Future Consideration (v2+ — after product-market fit)

- [ ] Admin panel (moderation queue, commission override, KYC review UI)
- [ ] Configurable commission via `PlatformConfig` table
- [ ] Token-based private cagnottes (real privacy, not URL obscurity)
- [ ] Creator public pages (`/u/<seller-slug>`) showing all their past cagnottes
- [ ] NGO verification tier with reduced commission
- [ ] Multi-currency display helper (FCFA → EUR/USD client-side only)
- [ ] Tax-receipt PDF (only if regulatory context changes)
- [ ] SMS notifications (only if email engagement proves insufficient)
- [ ] Donor account opt-in with history (low priority — adds signup friction)
- [ ] Referral bonus for creators
- [ ] Mobile app (PWA first, native only if web-only data demands it)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| Slug + public cagnotte detail + donation flow | HIGH | MEDIUM (backend mostly done) | **P1** |
| WhatsApp share with OG preview | HIGH | LOW | **P1** |
| Bictorys Wave/OM/Free + pay-redirect proxy | HIGH | DONE | **P1** |
| Anonymous donation + private message toggles | HIGH | LOW | **P1** |
| Suggested amounts + hideAmount/hideDonors | HIGH | LOW | **P1** |
| Thank-you polling page + email receipts | HIGH | LOW | **P1** |
| Festive vs Solidaire wizard with per-subtype commission | HIGH | MEDIUM | **P1** |
| Creator dashboard + notifications bell | HIGH | MEDIUM (requires BE-07/08) | **P1** |
| KYC upload + withdrawal flow + PIN | HIGH | MEDIUM | **P1** |
| Edit cagnotte (not slug) | MEDIUM | LOW | **P1** |
| Milestone notifications at 50/100% | MEDIUM | LOW | **P1** |
| Commission transparency on checkout (fix "Offerts") | HIGH | LOW (copy) | **P1** |
| Home page with trust signals | MEDIUM | LOW | **P1** |
| Profile sidebar + security + bank details | MEDIUM | LOW | **P1** |
| Public discovery `/toutes-les-cagnottes` | MEDIUM | MEDIUM | **P2** |
| CAGNOTTE_ENDING_SOON cron at J-3 | MEDIUM | LOW | **P2** |
| Rename-slug with SlugHistory 301 | LOW | MEDIUM | **P2** |
| Cagnotte stats view | MEDIUM | MEDIUM | **P2** |
| PDF export (participations) | LOW | MEDIUM | **P3** |
| Admin panel | HIGH (internal) | HIGH | **P3** (v2) |
| Token-based private cagnottes | LOW (URL obscurity sufficient) | MEDIUM | **P3** |
| Multi-currency display | LOW | LOW | **P3** |
| SMS notifications | LOW | HIGH | **P3** |
| Social login (Google/Apple/Facebook) | LOW | MEDIUM | **Out of scope** |
| Recurring donations | LOW (wrong for domain) | HIGH | **Out of scope** |
| Cryptocurrency payout | NEGATIVE | HIGH | **Never** |
| Reviews / ratings on creators | NEGATIVE | MEDIUM | **Never** |

Priority key: P1 = launch; P2 = first 90 days post-launch; P3 = v2+.

---

## Competitor Feature Analysis

| Feature | Leetchi (FR) | M-Changa (KE) | GoFundMe (US) | HelloAsso (FR) | Cagnottes.sn (our approach) |
|---|---|---|---|---|---|
| Primary share channel | Email + link | WhatsApp + SMS | Facebook + email | Email + link | **WhatsApp-first** |
| Primary payment | Card (Mangopay) | M-Pesa | Card (Stripe) | Card (Mangopay) | **Wave → OM → Free → Card** via Bictorys |
| Commission | 4% + fees | ~6-8% depending | 2.9% + 0.30$ per txn (US) | 0% + donor tip | **6% solidaire / 8% festive**, transparent |
| Anonymous donation | Yes | Yes | Yes | Yes | **Yes** (BE-02) |
| Private message | Yes | Partial | Limited | Yes | **Yes** (BE-02) |
| Hide amount / hide donors | Partial | No | No | Yes | **Yes** (BE-04) |
| Donor creates account | Optional | Optional | Required for some flows | Optional | **Not required** |
| Festive vs Solidaire pricing | No | No | No | Assoc-only model | **Yes — differentiator** |
| Occasion-based wizard | Partial | No | Partial (category) | No | **Yes — differentiator** |
| Mobile money native | No (card) | Yes (M-Pesa) | No | No | **Yes — Bictorys** |
| In-app browser redirect handling | Unknown | Unknown | Unknown | Unknown | **Yes — proxied base64** |
| Recurring donations | No | No | Yes | Yes | **No — anti-feature for domain** |
| Admin moderation panel | Yes | Yes | Yes | Yes | **No — v2** |
| KYC for creator | Yes | Yes | Yes | Yes | **Yes — only before withdrawal** |
| PDF tax receipt | No (no tax reg for cagnottes) | No | Yes (US 501c3) | Yes (FR assoc) | **No — no Sénégalais regime for v1** |
| Creator reviews | No | No | No | No | **No — anti-feature** |

Key insight: **no competitor has the festive-vs-solidaire split**. This is defensible differentiation specifically because it aligns the pricing model with the emotional/cultural weight of the cagnotte — and Senegalese users will intuitively feel that "wedding ≠ funeral" is a fair split, whereas a flat rate feels arbitrary.

---

## Banani screens → category mapping

| # | Banani screen | Category | Priority | Dependency |
|---|---|---|---|---|
| 1 | home | Table stakes | P1 | None |
| 2 | all-cagnottes | Differentiator | P2 | BE-05 list endpoint + seed data |
| 3 | signup | Table stakes | P1 | Auth (done) |
| 4 | login | Table stakes | P1 | Auth (done) |
| 5 | login-variant | Clarify | P1 | Same as login |
| 6 | dashboard | Table stakes | P1 | `/sellers/dashboard/stats` (done) |
| 7 | dashboard-variant | Clarify | P1 | Same |
| 8 | create-picker | Differentiator (festive/solidaire) | P1 | BE-04 |
| 9–11 | festive wizard ×3 | Differentiator | P1 | BE-04, slug (BE-01) |
| 12–14 | solidaire wizard ×3 | Differentiator | P1 | BE-04, slug (BE-01) |
| 15 | create-success | Table stakes (share loop) | P1 | OG meta + WhatsApp share |
| 16 | participations | Table stakes | P1 | Existing orders route |
| 17–19 | profile + variants + notif prefs | Table stakes | P1 | BE-08 prefs |
| 20 | notifications feed | Table stakes | P1 | BE-07, BE-08 |
| 21–22 | cagnotte-public (×2 variants) | Table stakes (core donor surface) | P1 | BE-05 detail endpoint |
| 23 | participate | Table stakes | P1 | BE-02, BE-05, BE-06 |
| 24 | payment | Table stakes | P1 | Bictorys (done), copy fix (PayDunya → Bictorys, "Offerts" → "6%") |

**Screens we design ourselves (Banani gaps)**, all P1 except stats/edit which are P2:

- donation-thank-you (**P1** — critical for funnel completion)
- email-verify landing (**P1**)
- password-reset flow (**P1**)
- bank-details form (**P1**)
- withdrawal flow (**P1**)
- kyc-upload (**P1**)
- cagnotte-stats (**P2**)
- cagnotte-edit (**P1** — users must be able to fix typos)
- security / password change (**P1**)

---

## Sources

- `.planning/PROJECT.md` (2026-04-13 locked decisions) — HIGH confidence for locked scope
- `.planning/banani/STATUS.md` (24-screen inventory) — HIGH confidence for frontend surface area
- `.planning/banani/BACKEND-PLAN.md` (12-task Phase 0 breakdown) — HIGH confidence for gap analysis
- `CLAUDE.md` + `.planning/codebase/ARCHITECTURE.md` — HIGH confidence for existing surface
- `backend/src/lib/blocks/schemas.ts`, `backend/src/routes/orders.ts`, `backend/src/routes/webhooks.ts` (repo-local, existing fari.store surface) — HIGH confidence
- `audits/audit-008-inapp-browser-payment.md`, `audits/audit-009-tiktok-payment-flow.md` — HIGH confidence, battle-tested
- General ecosystem knowledge of Leetchi, HelloAsso, GoFundMe, M-Changa, Cotizi, Wave UX and Senegalese mobile money market share — **MEDIUM-LOW confidence** (training-data + publicly-reported market shares; should be spot-verified if any numeric claim drives a decision). Specifically:
  - "Wave ~60% mobile money share in Senegal" — LOW, based on 2023-2024 reports
  - "Typical donation 500–25 000 FCFA" — LOW, folk knowledge, not validated
  - "Leetchi / HelloAsso commission and tipping models" — MEDIUM, widely reported
  - "M-Changa / funerals / WhatsApp loop" — MEDIUM, reported in African fintech coverage
  - "Senegalese SMS cost 15-50 FCFA" — LOW, operator-dependent, not freshly validated
- Bictorys official docs (inferred from existing repo integration, not freshly fetched) — MEDIUM

**Flag for future validation:** any feature decision that hinges on a specific Senegalese market statistic should be spot-verified against a recent (2025+) source before it's cited to a stakeholder or baked into marketing. The *product* decisions in the P1 table do not depend on those stats — they depend on the locked product decisions, which are HIGH confidence.

---

*Feature research for: cagnottes.sn — Senegalese fundraising platform (fork of fari.store)*
*Researched: 2026-04-13*
