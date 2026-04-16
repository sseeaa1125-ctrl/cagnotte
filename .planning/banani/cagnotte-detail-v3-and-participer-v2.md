# Cagnotte detail (v3) + Participer (v2) — Banani fresh export

## Source

- Banani flow: Cagnotte SN (`RZ5SfmH_Utgp`)
- Screen A: `Cagnotte - details` — `main_next2_next1_next1.jsx` → `/components/PublicCagnotteDetail.jsx`
- Screen B: `Participer à la cagnotte` — `main_next2_next1_next2.jsx` → `/components/ParticipateForm.jsx`
- Fetched: 2026-04-14 (second exchange of this session)

Both screens share the **same 2-column layout pattern**: main content `lg:w-2/3` left + sticky sidebar `lg:w-1/3` right. This is a fresh, simpler interpretation than the "Le Pot Commun v2" detail page I shipped earlier in this session — we're **replacing** that v2 with this v3.

## Routes

- Detail → `src/app/(public)/c/[slug]/page.tsx` (overwrite the v2 I just shipped)
- Participer → `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx` (client component already exists, full rewrite)
- Both routes already wired; data fetching + metadata unchanged

## Data wiring (unchanged from current)

- Detail: `GET /api/cagnottes/:slug` + `GET /api/cagnottes/:slug/participants?limit=50`
- Participer: same `CagnotteDetail` shape via server component page.tsx which hands props to the client form

## Detail page — structure

1. **Mobile-first container:** `min-h-screen bg-[#F8F9FA] pb-24` (pb-24 for the mobile sticky bottom CTA bar)
2. **Private banner** (conditional) — amber, unchanged
3. **Last participation pill** (conditional) — top-right, green pulse dot
4. **Two-column flex grid** (`lg:flex-row gap-8`):
   - **Left main** (`lg:w-2/3`):
     - **Cover & header card** (`bg-white rounded-3xl`):
       - Cover image `h-64 md:h-96 relative` with `object-cover` and absolute top-left category pill "{emoji} {SUBTYPE_LABELS}"
       - Content padding `p-6 md:p-10`:
         - `h1` title `text-3xl md:text-5xl`
         - "Organisée par" row — `py-6 border-y border-gray-100` — avatar 14×14 + small label + bold name
         - Description `space-y-6 text-gray-700 font-medium leading-relaxed text-lg` — preserved from backend (paragraphs via `whitespace-pre-line`). Keep `<details>` line-clamp collapse so long stories don't blow up the card.
     - **Participants card** (`bg-white rounded-3xl p-8 md:p-10`):
       - Header row: `h2 "Participants ({donorCount})"` + "Voir tout →" link (anchor to `#participants` or modal stub)
       - Grid `grid-cols-1 md:grid-cols-2 gap-6`:
         - Each card: `p-4 rounded-2xl border border-gray-100` + pink circle avatar w/ initial + name + amount • time
       - Hide whole card if `hideDonors` or `donorCount === 0`
   - **Right sticky sidebar** (`lg:w-1/3`):
     - `lg:sticky lg:top-24` white card `rounded-3xl p-8`:
       - Amount collected (`font-black text-4xl`) + "sur {goal}" label
       - **Animated progress bar** — fills from 0% to target on mount, shimmer overlay inside
       - "70% de l'objectif" + "{count} participations" row
       - **"Je participe" CTA** — PINK bg (`#F4D3DE`), animated (see animations section)
       - **"Partager" outline** button
       - Divider
       - Trust items (2 rows with green shield + blue check)
5. **Mobile sticky bottom CTA bar** — `lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-gray-100 p-4`:
   - Compact row: amount collected (small) + "Je participe" button (flex-1)
   - Only visible below lg breakpoint (where the sidebar is inline)

**Removed from the v2 I just shipped** (user said pixel-perfect to the new Banani design):
- The horizontal hero card (content+image side-by-side)
- The "En quelques chiffres" stats bar
- The separate "Histoire de la cagnotte" card (description now lives inside the cover+header card)
- The "Mots de soutien" message wall (the new design only shows the flat participants grid — messages stay attached to the individual participant via tooltip/expandable in a future pass)
- The FAQ preview at the bottom
- The "Partager, c'est aussi soutenir" pink card → replaced by the simpler "Partager" button in sidebar

## Participer page — structure

1. **Mobile-first container:** `bg-gray-50 min-h-screen pb-24 px-4 py-8`
2. **Two-column flex grid** (`lg:flex-row gap-6`):
   - **Left form** (`lg:w-2/3 space-y-6`):
     - **Back link** — "← Retour à la cagnotte" (links to `/c/${slug}`)
     - **Step 1 card** — "1 Montant de votre participation"
       - 3 preset pills in `grid-cols-3`. Middle preset (50 FCFA equivalent) auto-selected by default.
       - Custom amount input — single row with "Montant libre" left pseudo-label + right-aligned number + FCFA suffix
     - **Step 2 card** — "2 Vos informations"
       - Prénom + Email in `grid-cols-1 md:grid-cols-2`
       - "Masquer mon identité au public" checkbox row
       - **Added fields** (we still need them for Bictorys): Nom + Téléphone (not in Banani but required — I'll add them in the Prénom/Email grid as a second row)
     - **Step 3 card** — "3 Un petit mot ? (Optionnel)"
       - Textarea with placeholder "Laissez un message de soutien..."
       - "Garder ce message privé" checkbox
   - **Right sticky summary** (`lg:w-1/3`, sticky on lg+):
     - "RÉCAPITULATIF" uppercase label
     - Mini cagnotte card (64×64 cover + title + subtype badge)
     - Divider
     - "Ma participation" row + base amount
     - **Blue bordered voluntary contribution card** — checkbox + "Soutenir cagnottes.sn" + 3% amount + help text
     - "Total à payer" big row (`text-3xl font-black`)
     - **"Procéder au paiement" primary CTA** with lock icon
     - CGU disclaimer
3. **Mobile sticky bottom CTA bar** — on `<lg` only, matches detail page pattern:
   - Total (big) + "Procéder au paiement" button

## Component reuse

| Type | Name | Use |
|---|---|---|
| REUSE | `ProgressPoll` (existing) | wraps the animated progress bar inside the sidebar for live 20s polling |
| REUSE | `ShareSheet` | shown inside a modal/popover when "Partager" is clicked — for v1 just link to a `#partager` anchor or open native share (simpler) |
| REUSE | `Button` primitive | for outline + ghost variants |
| REUSE | `Input`, `Checkbox`, `Textarea` primitives | for the Participer form |
| NEW | `AnimatedProgressBar` | src/components/ui/AnimatedProgressBar.tsx — client component, takes `percent`, animates width 0 → percent on mount, shimmer overlay |
| NEW | `ParticiperJeParticipe` animated CTA | inline in detail page — not a primitive, just a `<Button>` with extra animation classes |
| KEEP | `formatPrice`, `formatRelative`, `initial` | helpers stay |

## Animations (minimaliste premium)

All animations respect `prefers-reduced-motion` — disabled via `@media` rule.

### 1. `Je participe` button

- **Resting state:** navy primary button (solid `bg-primary`) with soft shadow `shadow-lg shadow-primary/20` — on the *detail page sidebar* variant, the button is PINK per Banani (`bg-[#F4D3DE] text-primary`) with `shadow-md shadow-black/5`. I'll build both variants.
- **Continuous:** a very subtle shine sweep every 4 seconds — a diagonal white gradient overlay `bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-12deg]` that translates from `-translate-x-full` to `translate-x-full` in 1.2s, then idles for 2.8s. Clipped by `overflow-hidden` on the button.
- **Hover:** `-translate-y-0.5 shadow-xl shadow-primary/30` (or pink variant shadow).
- **Press:** `scale-[0.98] translate-y-0`.
- **Focus:** `ring-2 ring-primary/40 ring-offset-2`.

CSS keyframe name: `button-shine-sweep`. Applied via `.animate-button-shine` utility class.

### 2. Progress bar

- **Mount fill:** width animates from 0% to `${percent}%` in 1.4s with `cubic-bezier(0.22, 1, 0.36, 1)`. Driven by a React `useEffect` that flips the inline width after hydration — clean, no JS for layout math.
- **Continuous shimmer:** inside the filled portion, a diagonal gradient `from-white/0 via-white/25 to-white/0 skew-x-[-20deg]` translates every 3.5s (`progress-shimmer` keyframe). Subtle — opacity stays low.
- **Leading edge glow:** right edge of the fill has `box-shadow: 0 0 12px rgba(23,40,102,0.35)` for a soft "live" feel. Static.

### 3. `AnimatedProgressBar` component API

```tsx
<AnimatedProgressBar
  percent={70}                  // target 0-100
  label="70% de l'objectif"     // optional caption
  trackClassName="h-3"          // customize track height
  fillClassName="bg-primary"    // customize fill color
/>
```

Implementation: client component. On mount → `setMounted(true)`. Track: grey rounded overflow-hidden. Fill: `transition-all duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)]` with `width: mounted ? '${percent}%' : '0%'`. Inside fill: an absolute shimmer span animated via CSS keyframe.

## Token mapping

| Banani | Project |
|---|---|
| `--color-primary: #172866` | already configured |
| `--color-pink-section: #FBE6ED` | `bg-pink` |
| `#F4D3DE` (pink CTA bg) | inline `bg-[#F4D3DE]` — one-shot |
| `#F4D3DE` participant avatar bg | same, inline |
| `bg-blue-50/50 border-blue-100` (voluntary card) | Tailwind default palette |
| `bg-gray-50 min-h-screen` page bg | `bg-[#F8F9FA]` or `bg-gray-50` — use `bg-gray-50` |
| € symbols | replaced with `FCFA` via `formatPrice()` — no decimal, space thousands |

## Mobile-first responsive plan

Banani shipped desktop only. Mobile blueprint:

**Detail page:**
- Base 375px: single column. Cover image `h-56`. Card `p-5`, title `text-2xl`. Description `text-base`. Participants grid `grid-cols-1`. Sidebar card INLINE below content (not sticky). **Fixed bottom bar** with amount preview + "Je participe" button — 72px tall, safe-area-inset-bottom.
- sm 640px: cover `h-64`, title `text-3xl`
- md 768px: cover `h-80`, participants `grid-cols-2`, card padding `p-8`
- lg 1024px: 2-col layout kicks in, sidebar sticky `top-24`, **fixed bottom bar hidden**
- xl 1280px: `max-w-6xl mx-auto`

**Participer page:**
- Base 375px: single column. Form cards `p-5`. Preset pills stay `grid-cols-3` but `min-h-12`. Custom amount input stacks label above field. Summary card moves to the **bottom of the scroll** (not sticky). **Fixed bottom bar** with total + "Procéder au paiement" button.
- sm 640px: form fields `grid-cols-2` for firstName/lastName
- md 768px: card padding `p-8`
- lg 1024px: 2-col layout, sidebar sticky, fixed bottom bar hidden
- xl 1280px: `max-w-5xl mx-auto`

**Touch targets ≥ 48px everywhere.** Preset pills: `min-h-14`. Buttons: `min-h-14`. Checkbox hit area: `py-2` around the row.

## Copy / i18n

All strings in `constants.ts` under `CAGNOTTE_DETAIL_V3_LABELS` and `PARTICIPER_V2_LABELS` (rename the existing `PARTICIPER_LABELS`). No English.

**Voluntary contribution copy** (from user feedback):
- Title: "Soutenir cagnottes.sn"
- Help: "En ajoutant 3 %, vous nous aidez à maintenir une plateforme de cagnottes 100 % sénégalaise."
- Opt-out is the same checkbox — unchecked state means 0 voluntary

## Open questions (handled with defaults)

1. **"Voir tout" participants link** — v1 stub scrolls to `#participants` anchor (same card). Future: dedicated modal.
2. **"Partager" button on detail sidebar** — v1 uses `navigator.share()` when available, else `ShareSheet` in a modal. Simpler for now: link to `#partager` anchor which doesn't exist on this simplified design. Alternative: keep a small pink `ShareSheet` card at the bottom of the left column below participants. I'll put a compact ShareSheet below participants so the sidebar button can scroll to it.
3. **Seller avatar** — Banani shows a stylized `UserAvatar`. We use `cagnotte.seller.avatarUrl` if present, otherwise initial fallback circle.
4. **Category pill emoji** — Banani shows "🪩 Anniversaire" for a festive party. We use `🎉 Cagnotte festive` or `❤️ Cagnotte solidaire` based on subtype. No "occasion" field in Phase 2 schema.
5. **Trust items** — "Paiement 100% sécurisé" + "Garantie Cagnotte.sn" kept verbatim per Banani.
6. **Form fields we MUST add beyond Banani** — Nom + Téléphone (Bictorys requires them, non-negotiable). I'll add them in the same grid as Prénom/Email. User can see and accept.

## Files to touch

| File | Change |
|---|---|
| `src/components/ui/AnimatedProgressBar.tsx` | NEW client component |
| `src/components/ui/index.ts` | add export |
| `src/app/globals.css` | add `button-shine-sweep`, `progress-shimmer` keyframes + `.animate-button-shine` utility |
| `src/app/(public)/c/[slug]/page.tsx` | FULL REWRITE to v3 |
| `src/app/(public)/c/[slug]/participer/page.tsx` | may need updates if server component props shape changes |
| `src/app/(public)/c/[slug]/participer/ParticiperForm.tsx` | FULL REWRITE to v2 (sticky summary pattern) |
| `src/lib/constants.ts` | new namespaces + updated copy |
| `.planning/banani/STATUS.md` | mark detail v3 + participer v2 as Done |

## Success checklist

- [ ] AnimatedProgressBar animates 0→target on hydration
- [ ] "Je participe" button has continuous shine sweep + hover lift + press scale
- [ ] Both animations respect `prefers-reduced-motion`
- [ ] FCFA formatting everywhere (no € symbols)
- [ ] Detail page: cover card → participants grid → share anchor → sticky sidebar → mobile bottom bar
- [ ] Participer page: 3 numbered step cards + sticky summary + mobile bottom bar
- [ ] 375px verified: no horizontal scroll, bottom bar visible, touch targets ≥ 48px
- [ ] 1280px verified: sticky sidebar works, max-w containers applied
- [ ] Lint clean on touched files
- [ ] STATUS.md updated
