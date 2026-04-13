# Banani → cagnottes.sn Frontend Deviations

Running log of intentional deviations between the Banani design export and the shipped UI. Every deviation must be justified.

**Rule:** If the Banani export says X but we ship Y, it goes here with rationale. If you can't justify the deviation, fix the code to match Banani instead.

**Updated:** 2026-04-13 (seeded during Phase 3 plan 03-01)

***

## Active Deviations (v1)

### D-01 — Currency: € → FCFA
- **Banani:** `15 000 €`, `€` symbol in order summary
- **cagnottes.sn:** `15 000 FCFA`, space as thousands separator (via `formatPrice`)
- **Rationale:** Senegalese market. FCFA has no sub-unit, so all monetary values are integers.
- **Enforcement:** `src/lib/format.ts` `formatPrice()` is the only money formatter. No hardcoded `€` in any primitive or block.
- **Introduced by:** Plan 03-01

### D-02 — Phone prefix: +33 → +221
- **Banani:** `+33 6 XX XX XX XX` in signup/participate forms
- **cagnottes.sn:** `+221 77 XXX XX XX` via `formatPhone`
- **Rationale:** Senegal country code. Bictorys requires Senegalese mobile money numbers.
- **Enforcement:** `src/lib/format.ts` `formatPhone()` always prepends `+221`. `MISC.prefixTelephone === "+221"`.
- **Introduced by:** Plan 03-01

### D-03 — Payment provider label: PayDunya → Bictorys
- **Banani:** The payment page footer mentions "Paiement sécurisé par PayDunya"
- **cagnottes.sn:** No provider name shown in v1. If shown later, must say "Bictorys".
- **Rationale:** cagnottes.sn integrates Bictorys (not PayDunya) per CLAUDE.md mandate. PayDunya is a competing Senegalese PSP and would be misleading.
- **Enforcement:** Plan 03-03 `OrderSummary` block MUST NOT render a provider name. If a composed block or Phase 4 page references PayDunya, reject in review.
- **Introduced by:** Plan 03-01 (pre-emptive)

### D-04 — Commission copy: "Offerts" → "6% solidaire · 8% festive"
- **Banani:** The payment page shows "Frais de plateforme: Offerts" (Free)
- **cagnottes.sn:** Shows the real commission. Phase 3 labels (`COMMISSION_LABELS` in constants.ts):
  - Festive: "8% de commission pour les cagnottes festives"
  - Solidaire: "6% de commission pour les cagnottes solidaires"
  - Phase 4 checkout: `"8% · 1 200 FCFA"` (formatted runtime computation)
- **Rationale:** "Offerts" is a lie — the commission is real (6%/8% basis points enforced server-side in `lib/commission.ts`). Transparency is our differentiator vs tip-based competitors.
- **Enforcement:** Plan 03-03 `OrderSummary` displays pre-computed `commissionAmount` passed as a prop. Phase 4 computes the amount client-side matching the server helper.
- **Introduced by:** Plan 03-01

### D-05 — Social login CTAs hidden (but Button variant kept)
- **Banani:** Signup/login screens show Google + Apple + Facebook buttons
- **cagnottes.sn:** These CTAs are **hidden** in v1 (no OAuth in backend) BUT the `Button` primitive still exposes a `variant: 'social'` + `socialProvider` prop so Phase 5 can unhide them via a feature flag with zero code change.
- **Rationale:** Building OAuth plumbing is out of scope for v1; keeping the variant avoids a rewrite in v2.
- **Enforcement:** Plan 03-02 `Button` primitive implements the full social variant. Plan 05-01 (signup/login pages) MUST NOT render the social button JSX (hidden via feature flag `NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN === "true"` which is never set in v1).
- **Introduced by:** Plan 03-01

### D-06 — All-cagnottes pagination: numeric → "Charger plus" (cursor)
- **Banani:** Numeric pagination (page 1, 2, 3, ... at the bottom of the grid)
- **cagnottes.sn:** "Charger plus" button using cursor-based pagination
- **Rationale:** Backend `/api/cagnottes` is cursor-paginated (no count query — see [backend/src/routes/cagnottes.ts](../../backend/src/routes/cagnottes.ts) list handler which uses `take: limit+1` to detect `hasMore` without a count). Numeric pagination over cursors would require an extra count query that's expensive on growing tables. "Load more" is also more mobile-friendly and matches the social-feed mental model donors already have.
- **Enforcement:** Phase 4 plan 04-01 task T2 ships the cursor pattern. The `Pagination` Phase 3 primitive remains available for authed paginated tables in Phase 6.
- **Introduced by:** Plan 04-01

### D-07 — Cagnotte detail: ship variant A only
- **Banani:** Two variants of the cagnotte detail page (screens 21 + 22) — variant A (full description, standard layout) vs variant B (collapsed description, expanded participants wall).
- **cagnottes.sn:** Single variant (variant A only). Variant B is deferred.
- **Rationale:** The variant delta was not crisply specified during Banani export. Shipping ONE clean implementation faster, layering variant B post-launch if user feedback demands it.
- **Enforcement:** Phase 4 plan 04-01 task T3 ships ONE component at `src/app/(public)/c/[slug]/page.tsx`. No variant flag, no toggle.
- **Introduced by:** Plan 04-01

***

## Deviation Template (for future entries)

### D-NN — Short title
- **Banani:** what the export says
- **cagnottes.sn:** what we ship
- **Rationale:** why
- **Enforcement:** how we prevent regression
- **Introduced by:** Plan NN-NN
