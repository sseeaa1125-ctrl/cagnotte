# Cagnotte detail — Banani v2 ("Le Pot Commun" style)

## Source

- Banani flow: Cagnotte SN (`RZ5SfmH_Utgp`)
- Screen: `Détail Cagnotte - Public (Le Pot Commun Style)` → `main_next2_next1_next1.jsx`
- Component file: `/components/PublicCagnotteDetailV2.jsx`
- Fetched: 2026-04-14

## Route

`/c/[slug]` — `src/app/(public)/c/[slug]/page.tsx`

- Public, no auth gate
- Already nested inside the `(public)` layout which wraps `TopBanner + PublicNavbar + main + PreFooter + Footer` — we rebuild **content only**, not chrome
- Route already exists; this is a pixel-perfect redesign of the existing implementation

## Data flow (already wired in the current page — kept verbatim)

- `GET /api/cagnottes/:slug` → `CagnotteDetail` (description, cover, subtype, goal, hide flags, seller, gallery, etc.)
- `GET /api/cagnottes/:slug/participants?limit=50` → `{ participants: Array<{id, amount, name, message, createdAt}>, nextCursor }`
- Real shapes checked — `maskDonation()` in `backend/src/routes/cagnottes.ts` is authoritative
- `ProgressPoll` (client component) continues to drive live `totalRaised` / `donorCount` via 20s-interval polling, embedded inside the new hero stats sub-card

## Structure map (top → bottom)

1. **Last-participation pill** — top-right of the container (not centered like the current build). White pill with pulsing green dot + "Dernière participation : Caroline a fait un don il y a 1 semaine". Hidden when `hideDonors` or no participants.
2. **Hero card** — white `rounded-[2rem]` card, `flex` column on mobile / row on desktop.
   - Left pane (`p-8 md:p-12`):
     - Solidaire/festive badge — gold palette (`bg-[#FEF4E3] text-[#D8A57D] border-[#f5ead5]`) for solidaire, existing pink for festive
     - `h1` title — `text-3xl md:text-5xl`
     - Creator chip — gray-50 rounded-2xl with avatar (fallback to initial) + "Créé par" + name
     - Stats sub-card — `bg-blue-50/50 border border-blue-100 rounded-2xl p-6` containing amount collected, progress bar, contributions + goal row. **This is where `ProgressPoll` lives** so the amount stays live.
     - CTAs — "Participer" (primary, full on mobile) + "Partager" (outline). Partager scrolls to the pink share card at bottom via `#partager`.
   - Right pane: cover image at `md:w-2/5`, `object-cover`, with a dark gradient overlay (`bg-gradient-to-t from-black/40`). On mobile it's on top.
3. **Stats bar** — white `rounded-3xl` card with "En quelques chiffres" + `BarChart2` icon on the left (md+), 3 stats on the right (Dons / Mots / Moyenne) with gray vertical dividers.
4. **Histoire de la cagnotte** — white card with `FileText` icon + `h2` + description body. Collapsed to 6 lines via `line-clamp-6` + `details`/`summary` for "Lire toute l'histoire". "Signaler la cagnotte" mailto at the bottom separated by a `border-t`.
5. **Gallery** (kept from current build, NOT in Banani source) — only rendered if `cagnotte.gallery.length > 0`. Same 2/3-col grid.
6. **Two-column grid** (`lg:grid-cols-3`):
   - Left (`lg:col-span-2`): "Mots de soutien" — icon badge + h2 + message cards (white, quote icon top-right, avatar initial + name + date + quoted text). Below them: a navy CTA card "Vous voulez laisser un mot ? Se connecter →"
   - Right (`space-y-8`): "Ils participent" white card with count badge, list of 4 donors with initial circles, "Voir les X participants" button + pink-section "Partager, c'est aussi soutenir" card with white share icon + copy + `ShareSheet`
7. **FAQ preview** — centered kicker + h2 "Questions fréquentes" + single expandable row linking to `/aide`
8. **Share card anchor** — the pink card inside the right sidebar already serves this, but we keep a dedicated full-width `#partager` section below the FAQ with the full `ShareSheet` (grid of WhatsApp/Facebook/Email/Copy) so the hero's "Partager" button has somewhere to scroll to.

## Component reuse

| Type | Name | Path | Why |
|---|---|---|---|
| REUSE | `ProgressPoll` | `src/app/(public)/c/[slug]/ProgressPoll.tsx` | Live totals every 20s, already wired |
| REUSE | `ShareSheet` | `src/components/share/ShareSheet.tsx` | Full share grid w/ WhatsApp priority |
| REUSE | `Button` | `src/components/ui/Button.tsx` | Participer / Partager CTAs |
| REUSE | `formatPrice` | `src/lib/format.ts` | FCFA integer formatting |
| KEEP INLINE | `formatRelative`, `initial` | local helpers in `page.tsx` | Simple, single-use |
| NO NEW PRIMITIVE | Hero card, Stats bar, Message card, Participants card, Pink share card | — | Single-use surfaces, Banani layout is page-specific — extract only if a second page needs them |

## Token mapping (Banani → project)

| Banani | Project |
|---|---|
| `--color-primary: #172866` | `text-primary` / `bg-primary` (already configured) |
| `--color-pink-section: #FBE6ED` | `bg-pink` (already configured) |
| `--color-gold-start: #D8A57D` | One-shot `text-[#D8A57D]` on solidaire badge |
| `bg-[#FEF4E3]` + `border-[#f5ead5]` | Inline on solidaire badge |
| `bg-blue-50/50` + `border-blue-100` | Stats sub-card (Tailwind default palette) |
| `bg-[#f8f9fa]` page bg | `bg-muted/40` or inline `bg-[#f8f9fa]` — choose inline for exact parity |

## Responsive plan (MANDATORY — Banani shipped desktop only)

- **Base 375px:**
  - Container: `px-4 py-6`
  - Last participation pill floats right but may wrap below on very narrow screens (use `flex-wrap`)
  - Hero card stacks: image on top (400×aspect), content below. Padding `p-6`. Title `text-3xl`. CTAs stack full-width.
  - Stats sub-card: amount `text-4xl`, goal row always visible
  - Stats bar: label row hidden on mobile, numbers use `grid-cols-3 gap-4`
  - Histoire card: `p-6`, h2 `text-2xl`, body `text-base`
  - Two-column grid: `grid-cols-1` — messages first, sidebar below
  - Message cards: `p-5`, quote icon smaller (`size={24}`)
  - Share card: centered, icon 48px, h3 `text-xl`
  - FAQ: centered, row `text-base`
- **sm 640px:** CTAs become inline, stats sub-card dividers show
- **md 768px:** Hero card goes side-by-side, image at `w-2/5` right. Stats bar label reappears on the left. Histoire card `p-8`.
- **lg 1024px:** Two-column grid becomes `grid-cols-3` (2 cols messages / 1 col sidebar)
- **xl 1280px:** `max-w-6xl mx-auto` container, breathing room

Touch targets ≥ 48px on every button. The hero CTAs use `py-4` (56px). The close/share icons use `h-12 w-12`.

## Interactions / state

- `ProgressPoll` drives live amount + donor count
- "Participer" → `/c/${slug}/participer`
- "Partager" → scroll to `#partager` anchor (existing behavior)
- "Lire toute l'histoire" → native `<details>` toggle, no JS
- "Se connecter pour laisser un mot" → `/connexion?next=/c/${slug}` (currently there is NO post-donation message-wall authoring surface for logged-in users; v1 donors leave messages only at the time of donation, but the CTA must route somewhere sensible — login with return-to is the least surprising choice)
- "Voir les X participants" — button stub in v1, wire to a modal in a follow-up (out of scope for this redesign)
- "Copier le lien" inside the pink card → uses `navigator.clipboard` via a small local handler OR we keep the full `ShareSheet` grid for v1 (keep the grid)
- `hideAmount` → amount row shows "Montant masqué", stats sub-card still shows progress %, stats bar shows "—" for moyenne
- `hideDonors` → latest-participation pill hidden, participants card hidden, messages card hidden (participants feed is empty when hideDonors is set at backend level)
- `isClosed` → Participer CTA replaced by "Cagnotte clôturée" disabled pill
- `isPrivate` → amber info banner above the hero (unchanged from current)

## Copy / i18n

All French strings go into [src/lib/constants.ts](../../src/lib/constants.ts) under a new namespace `CAGNOTTE_DETAIL_V2_LABELS`. No English in JSX. The existing `SUBTYPE_LABELS` + `ACTIONS` are reused for the subtype badge and button labels.

## Implementation checklist

- [ ] Add `CAGNOTTE_DETAIL_V2_LABELS` namespace to constants
- [ ] Rewrite `src/app/(public)/c/[slug]/page.tsx` top-to-bottom — server component, keeps data fetching + metadata identical
- [ ] Mobile-first classes — base unprefixed, add `md:` / `lg:` upward
- [ ] `ProgressPoll` wrapped inside the blue-tinted hero stats sub-card
- [ ] `ShareSheet` used in the pink "Partager c'est aussi soutenir" card at the bottom
- [ ] Gallery section preserved (not in Banani but backend supports it)
- [ ] `isPrivate` amber banner preserved
- [ ] 375px check at dev server — no horizontal scroll, title wraps cleanly, hero stacks image-above-content, progress bar fills width
- [ ] 768px check — hero side-by-side, stats bar horizontal
- [ ] 1280px check — matches Banani mockup as closely as possible given FCFA labels and our existing primitives
- [ ] Touch targets ≥ 48px
- [ ] Empty / closed / private / hideAmount / hideDonors states all render
- [ ] `npm run lint` clean for the touched file
- [ ] `STATUS.md` updated with the commit SHA

## Open questions for user (handled with defaults unless vetoed)

1. **TopBanner copy from Banani** — the design shows "En avril, les cagnottes créées sont entièrement gratuites". Our platform charges commission, so this framing was already rejected in the previous session. **Default: keep our existing TopBanner copy "Lance ta cagnotte en 2 minutes."** Not touching the banner.
2. **Footer from Banani** — references ORIAS (French crowdfunding regulator) and "Le Pot Commun". **Default: keep our existing Cagnottes.sn Footer.** Not touching the footer.
3. **"Se connecter" CTA inside messages card** — v1 has no authed message-wall authoring surface. **Default: route to `/connexion?next=/c/${slug}` so the user comes back to the cagnotte after login.**
4. **"Voir les 372 participants"** — Banani shows this button but there's no participants modal/route yet. **Default: render the button and wire it to a future modal; for v1 it's a visual stub that links to an in-page anchor or does nothing. Proposal: scroll to `#participants` on this same page.** Or we can skip it entirely.
5. **FAQ preview at the bottom** — Banani shows one question. We have a global `/aide` page. **Default: render the kicker + h2 + one expandable row that links to `/aide` with `?q=calcul-objectif`.** Alternative: drop the FAQ block entirely from this page.
6. **"Signaler cette cagnotte" button placement** — Banani shows it at the bottom of the histoire card. **Default: keep our existing mailto link there.**
