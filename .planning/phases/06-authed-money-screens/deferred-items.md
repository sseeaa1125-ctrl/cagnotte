# Deferred Items — Phase 6 plan 06-01

Pre-existing lint errors NOT caused by 06-01, left untouched per scope boundary:

- `backend/scripts/introspect-phase1.ts` — 6× `no-explicit-any` (lines 9, 12, 15, 18, 21, 24)
- `backend/src/lib/slug.ts` — 1× `prefer-const` on `baseSlug` (line 126)
- Plus 13 unused-var warnings across backend libs/routes (crypto, verifyToken, formatPrice, getFromR2, blocksCount, _id).

These predate Phase 6 work and were not touched. They should be cleaned up in a dedicated backend hygiene pass.
