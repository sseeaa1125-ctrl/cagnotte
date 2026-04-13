# Banani implementation status

Last updated: 2026-04-13
Source flow: **Cagnotte SN** (Banani flow `RZ5SfmH_Utgp`)
Fetch timestamp: 2026-04-13

## Summary

Banani has exported **24 desktop screens + 30+ components + 1 global stylesheet** (20 in the first pass on 2026-04-13, **4 more added the same day**: public cagnotte detail ×2 variants, participate form, payment form). All copy is in **French**, amounts in **€** (swap to FCFA), phone prefix **+33** (swap to +221). Brand tokens = navy `#172866` + pink `#FBE6ED` — **decision locked: we adopt Banani tokens**, CLAUDE.md will be updated.

**Strategy lock (2026-04-13): BACKEND-FIRST.** We complete the backend extensions, notifications lib, KYC, withdrawals end-to-end before touching a single frontend page. See [BACKEND-PLAN.md](BACKEND-PLAN.md) for the concrete task list.

No screens are yet implemented.

## Done

_(empty — greenfield)_

## In progress

_(none — waiting for user answers on blockers)_

## Pending — screens exported by Banani

| # | Slug | Banani leaf | Auth | Notes |
|---|---|---|---|---|
| 1 | `home` | `main.jsx` | public | Hero, featured campaigns, features, FAQ, footer |
| 2 | `all-cagnottes` | `main_next2.jsx` | public | Search + chip filters + paginated grid |
| 3 | `signup` | `main_next3.jsx` | public | Form + Google/Apple social — **OAuth excluded from v1, hide CTAs** |
| 4 | `login` | `main_next1.jsx` | public | Email + password |
| 5 | `login-variant` | `main_next1_next1.jsx` | public | Likely filled/error state — needs clarification |
| 6 | `dashboard` | `main_next1_next2.jsx` | authed | KPIs + recent cagnottes list |
| 7 | `dashboard-variant` | `main_next1_next2_next1.jsx` | authed | Alt state — needs clarification |
| 8 | `create-picker` | `main_next1_next2_next2_next1.jsx` | authed | Festive vs Solidaire type picker |
| 9 | `festive-step-1` | `…next1_next1.jsx` | authed | Title + occasion + goal |
| 10 | `festive-step-2` | `…next1_next1_next1.jsx` | authed | Cover upload + message + end date |
| 11 | `festive-step-3` | `…next1_next1_next1_next1.jsx` | authed | Visibility + options + TOS |
| 12 | `solidaire-step-1` | `…next1_next2.jsx` | authed | Title + cause + beneficiary + goal |
| 13 | `solidaire-step-2` | `…next1_next2_next1.jsx` | authed | Cover upload + description + end date |
| 14 | `solidaire-step-3` | `…next1_next2_next1_next1.jsx` | authed | Visibility + options + TOS |
| 15 | `create-success` | `…next1_next1_next1_next1_next1.jsx` | authed | Share link + social share + preview card |
| 16 | `participations` | `main_next1_next2_next2.jsx` | authed | Donor-side contributions table |
| 17 | `profile` | `main_next1_next2_next3.jsx` | authed | Personal info form (sidebar nav) |
| 18 | `profile-variant` | `…next3_next1.jsx` | authed | Alt profile tab — needs clarification |
| 19 | `notif-preferences` | `…next3_next3.jsx` | authed | Toggle list, 3 groups |
| 20 | `notifications` | `main_next1_next2_next4.jsx` | authed | Activity feed + tabs |
| 21 | `cagnotte-public` | `main_next2_next1.jsx` | public | Public cagnotte detail `/c/<slug>` — cover, description, participants list, sticky "Je participe" sidebar |
| 22 | `cagnotte-public-v2` | `main_next2_next1_next1.jsx` | public | Variant of 21 — need to clarify delta |
| 23 | `participate` | `main_next2_next1_next2.jsx` | public | 3-step donation form: amount / info / message + sticky summary |
| 24 | `payment` | `main_next2_next1_next2_next1.jsx` | public | Payment method picker: Mobile Money (Wave/Orange/Free) + Carte — ⚠ footer says "PayDunya", we use **Bictorys** |

## Missing from Banani — still gaps after the 2nd export

The 2nd export covered public detail + participate + payment (screens 21-24). Remaining gaps:

- **`donation-thank-you`** — post-payment confirmation page Bictorys redirects to
- **`email-verify`** — email verification landing
- **`password-reset`** — forgot + reset password (backend supports it)
- **`bank-details`** — "Coordonnées bancaires" form (sidebar entry exists, form missing)
- **`withdrawal`** — full payout flow (amount, account, confirmation, PIN entry)
- **`kyc-upload`** — ID document + selfie upload (`Seller.kycStatus` flow)
- **`cagnotte-stats`** — "Voir les statistiques" view from dashboard
- **`cagnotte-edit`** — "Gérer" from dashboard (edit existing cagnotte)
- **`security`** — password change form (sidebar entry exists, form missing)

Decision: we **design these screens ourselves** in the Banani visual language once backend is ready, unless Banani provides them first.

## Shared components to extract (rule-of-2 already met in Banani export)

Put all in `src/components/ui/` (primitives) or `src/components/<domain>/` (composed).

### Primitives (zero domain logic)

| Component | Screens using | Variants |
|---|---|---|
| `Button` | all | `primary` (navy), `outline`, `ghost`, `social` (Google/Apple/FB/WA/Email) |
| `Input` | 3, 4, 9-14, 17 | default, with helper text, with char counter, password (eye toggle) |
| `Textarea` | 10, 13 | with `N / max` counter |
| `Select` | 9, 12 | custom styled |
| `DatePicker` | 10, 13 | optional clear |
| `ImageUpload` (drag-drop) | 10, 13 | JPG/PNG, shows filename on pick |
| `RadioCard` (big option) | 11, 14 | used for visibility picker |
| `Toggle` | 11, 14, 19 | switch |
| `Checkbox` | 11, 14 | TOS |
| `Badge` | 1, 2, 6, 15 | category (festive/solidaire), status (en cours / terminée) |
| `Tabs` | 2, 20 | chip tabs |
| `Pagination` | 2 | numeric |
| `Avatar` | 6, 17, 20 | with edit overlay |
| `ProgressBar` | 6, 15 | with amount / goal / donor count |
| `KpiCard` | 6 | icon + label + value + trend |
| `EmptyState` | (none in Banani) | **must design ourselves** |

### Composed blocks

| Component | Screens | Notes |
|---|---|---|
| `PublicNavbar` | 1, 2, 3, 4, 5 | Logo + nav + Connexion + Créer CTA |
| `DashboardNavbar` | 6-20 | Logo + search + bell + avatar menu |
| `TopBanner` | 1, 2, 3, 4, 5 | Promo strip with close |
| `Footer` + `PreFooter` | 1, 2, 3, 18 | **Legal copy must be rewritten for Senegal** |
| `CampaignCard` | 1, 2, 6, 15 | Festive + solidaire variants, with progress, CTA |
| `ShareSheet` | 15 | WA / FB / Email / Copy link |
| `NotificationItem` | 20 | Icon + title + subtitle + time + unread dot |
| `SidebarNav` | 17, 19 | Profile tabs |
| `FilterChipBar` | 2 | Category filters |
| `TrustpilotBadge` | 1 | Star rating + label |

## Design tokens (from Banani `/style.css`)

```
--font-body:       'Inter', system-ui, sans-serif     ✓ already loaded
--font-headings:   'Poppins', system-ui, sans-serif   ⚠ NEW — must add via next/font/google

--color-background:          #FFFFFF
--color-foreground / primary:#172866  ⚠ CONFLICTS with CLAUDE.md teal-600
--color-primary-hover:       #121F4E
--color-primary-foreground:  #FFFFFF
--color-muted:               #F4F6F9
--color-muted-foreground:    #5C6784
--color-accent:              #E6F3EE
--color-pink-section:        #FBE6ED  ⚠ CONFLICTS with CLAUDE.md amber-500
--color-border:              #E2E8F0
--color-trustpilot:          #00B67A
--color-footer:              #0E1A40
--color-gold-start/end:      #D8A57D → #C47A57

radii: 0.25 / 0.5 / 1 / 1.5 / 2.5 rem   (sm/md/lg/xl/2xl)
max container width: 1400px
shadows: sm, md, lg, blue-900/10, blue-900/20, [0_8px_30px_rgb(0,0,0,0.04)]
breakpoints used: md, lg, xl  (no sm, no 2xl)
```

Lucide icons used (install already present): `apple, arrow-left, arrow-right, bar-chart-2, bell, calendar, camera, check, check-square, chevron-down, chevron-left, chevron-right, chrome, clock, copy, credit-card, download, edit-2, eye, eye-off, facebook, file-text, filter, gift, globe, heart, lock, log-out, mail, menu, message-circle, more-horizontal, pie-chart, plus, search, share-2, shield-check, star, trending-up, upload-cloud, user, users, x`.

## Decisions locked — 2026-04-13 (late additions)

11. **FUNDRAISER commission**: **6% for solidaire** (santé, aide, urgence, éducation, projet solidaire, animaux) and **8% for festive** (anniversaire, mariage, pot de départ, cadeau commun, naissance, voyage). Hard-coded in `POST /api/orders`, basis points stored on `Order.commissionRate`. TODO v2: admin-configurable via `PlatformConfig`.
12. **Private cagnottes**: URL-secrecy model. Private cagnottes **do not appear** in `GET /api/cagnottes` but **are returned** by `GET /api/cagnottes/:slug` — anyone with the slug can load them. No token-based privacy in v1.
13. **Slug style**: **simple and human-readable**. `les-30-ans-de-thomas`. On conflict: `les-30-ans-de-thomas-2`, `-3`, etc. **No random hex suffixes.** Reserved words list blocks collisions with app routes.
14. **GSD handoff**: the entire Phase 0 backend completion is being delegated to the GSD workflow starting now. See [/Users/amadoufall/.claude/plans/polymorphic-kindling-globe.md](../../../../.claude/plans/polymorphic-kindling-globe.md) for the approved execution plan.

## Decisions locked — 2026-04-13

1. **Brand tokens**: ✅ **Adopt Banani navy `#172866` + pink `#FBE6ED`.** CLAUDE.md will be updated in Phase A.
2. **Missing donor flow**: ✅ Banani provided cagnotte-public + participate + payment on 2026-04-13. Remaining gaps (thank-you, email-verify, password-reset, bank-details, withdrawal, kyc, stats, edit, security) → **we design them ourselves** in the Banani visual language.
3. **Mobile strategy**: ✅ **Mobile-adapt in code.** Base classes target 375px, `md:`/`lg:` add desktop. No mobile Banani export expected.
4. **Social login**: ✅ **Hide Google/Apple CTAs on signup/login.** No OAuth in v1 backend. Signup = email + password only.
5. **Festive vs Solidaire**: ✅ **Single `FUNDRAISER` block type with a `subtype: 'festive' | 'solidaire'` field** inside `config`. Occasion (festive) and cause+beneficiary (solidaire) are added as optional fields on the same schema.
6. **Notifications**: ✅ **Rebuild the notifications lib.** New `Notification` Prisma model, `backend/src/lib/notifications/`, `backend/src/routes/notifications.ts`, webhook dispatch. Full stack, not a placeholder.
7. **KYC / bank details / withdrawal**: ✅ **In scope for v1.** Seller model already has KYC fields + payout fields + `withdrawalPinHash`; `routes/withdrawals.ts` already has GET/POST. We complete the UI and polish gaps.
8. **Legal**: ✅ **Deferred to end of project.** Placeholder legal links until user provides Senegalese copy.
9. **Fonts**: ✅ **Poppins is in scope** (user reminded). Load via `next/font/google` in Phase A (alongside Inter).
10. **Payment provider label in UI**: Banani footer says "PayDunya" but **we keep Bictorys** (per CLAUDE.md + existing libs + `BICTORYS_*` env vars). Banani footer copy is wrong — fix in translation.

## Open design questions

- Screens 5, 7, 18: labeled as "(Next)" variants — are these filled / error / alt-data states, or actually different screens? Product owner must label.
- Dashboard KPIs: `/api/sellers/me` vs new `/api/sellers/stats` endpoint?
- "Cacher le montant / les noms" options on wizard step 3: what does `/c/<slug>` look like with these on?
- "Exporter (PDF)" on participations — in v1 scope?
- "Télécharger l'historique" on dashboard — what format?
- Privée vs Publique cagnotte: how is privacy enforced backend-side? Blocks schema has no `visibility` field today.
- Date de fin `Optionnel` in UI but `fundraiserBlockConfigSchema.endDate` is `.nullable().optional()` — aligned. Good.

## Implementation phases — BACKEND-FIRST

New strategy (locked 2026-04-13): complete and test the backend end-to-end, THEN build the frontend page by page. The backend work is scoped from the UI requirements visible in the 24 Banani screens.

### Phase 0 — Backend completion (CURRENT PHASE)

See [BACKEND-PLAN.md](BACKEND-PLAN.md) for the detailed task list. Summary:

- **Schema**: add `Block.slug` (unique per cagnotte), `Order.isAnonymous`, `Order.messageIsPrivate`, `Notification` model, subtype/occasion/cause/beneficiary/visibility/hideAmount/hideDonors on FUNDRAISER config
- **Routes**: add `GET /api/cagnottes/:slug` (public), `GET /api/cagnottes/:slug/participants` (public paginated), `GET /api/cagnottes` (public list), `notifications.ts` (feed + mark-read + prefs), `POST /api/orders` extended fields
- **Libs**: rebuild `lib/notifications/` with email + in-app dispatch, hook into webhook handler on PAID event
- **Commission**: lower FUNDRAISER commission to 0 (design says "Offerts") or make config-driven
- **KYC / withdrawal**: verify complete end-to-end (endpoints + email flow + PIN entry)
- **Auth**: verify email-verify + password-reset + refresh still work
- **Seed + tests**: seed dev data, smoke-test every endpoint from a script

### Phase A — Frontend foundation (after Phase 0 is green)

- Poppins via `next/font/google` (alongside Inter) — **don't forget the fonts** per user
- `@theme` tokens in `src/app/globals.css` copied from Banani's `/style.css`
- Update CLAUDE.md (primary teal→navy, accent amber→pink)
- `src/lib/utils.ts` with `cn()` helper (`clsx` + `twMerge`)
- `src/lib/constants.ts` — French label pass (legal copy = placeholder)
- `src/lib/format.ts` — `formatPrice(n)` → `"1 000 FCFA"`, `formatRelativeTime()`, `formatPhone()` (+221)

### Phase B — UI primitives

Button, Input, Textarea, Select, DatePicker, ImageUpload, RadioCard, Toggle, Checkbox, Badge, Tabs, Pagination, Avatar, ProgressBar, KpiCard, EmptyState, Modal, Toast.

### Phase C — Composed blocks

PublicNavbar, DashboardNavbar, TopBanner, Footer, PreFooter, CampaignCard, ShareSheet, NotificationItem, SidebarNav, FilterChipBar, TrustpilotBadge, MiniCagnotteCard (for the payment summary), OrderSummary (sticky right column on participate/payment).

### Phase D — Public donor flow (screens 1, 2, 21/22, 23, 24, thank-you)

Home → AllCagnottes → Cagnotte detail → Participate → Payment → Thank-you. This is the donation happy path — ship it first because zero revenue without it.

### Phase E — Public auth (screens 3, 4, email-verify, password-reset)

Signup, Login, Email verify landing, Forgot password flow.

### Phase F — Creator flow (screens 6, 8, 9-14, 15)

Dashboard, type picker, Festive wizard (3 steps), Solidaire wizard (3 steps), Success/share.

### Phase G — Authed screens (screens 7, 16, 17-20)

Profile + sidebar tabs, Notif preferences, Participations, Notifications feed, profile variants.

### Phase H — Money screens (we design these)

Bank details form, Withdrawal flow (amount + account + PIN + confirmation), KYC upload (ID + selfie), Cagnotte stats, Cagnotte edit, Security (password change).

Each phase = one GSD phase with its own `PLAN.md`, atomic commits per screen, 375/768/1280 responsive checks, pixel-parity check against Banani at the desktop breakpoint.
