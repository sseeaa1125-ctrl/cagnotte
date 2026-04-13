/**
 * Feature flags — Phase 5 plan 05-01.
 *
 * Source of truth for v1 ON/OFF switches. Flip to `true` in v2.
 *
 * FEATURE_SOCIAL_AUTH — Google/Apple OAuth CTAs on /inscription + /connexion.
 * v1 backend has no OAuth plumbing, so the JSX is gated behind this constant.
 * The button markup MUST remain in the tree so v2 can ship OAuth with a
 * single 1-line flip.
 */

export const FEATURE_SOCIAL_AUTH = false;
