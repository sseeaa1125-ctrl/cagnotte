/**
 * Cagnotte slug helpers — Phase 1 plan 01-02.
 *
 * `slugify()` is pure, synchronous, and deterministic.
 * `ensureUniqueSlug()` takes a closure so the helper stays testable without a real Prisma client.
 *
 * Pitfalls guarded:
 *   P04 — slug reservation race → the unique index from plan 01-01 is the backstop;
 *         this retries on P2002. We rely on createFn throwing — no read-then-write.
 *   P12 — diacritic edge cases → NFD normalize + combining-marks regex covers all
 *         French accents (é, è, ê, à, â, ï, ô, ù, û, ç, …).
 *
 * Per PROJECT.md decision: slugs are human-readable with numeric suffixes.
 * NO random hex, no `crypto.randomBytes`, no `Math.random` — anywhere.
 */

import { Prisma } from "../../generated/prisma/client.js";

/**
 * Reserved slugs for cagnotte blocks (DISTINCT from `Seller.slug` RESERVED_SLUGS in
 * `backend/src/lib/constants.ts`). A cagnotte cannot be created at `cagnottes.sn/c/admin`
 * because that path collides with the app's own routes.
 *
 * LOCKED at 15 entries — do not add or remove without updating
 * `.planning/phases/01-backend-foundations/01-RESEARCH.md` constraint 5.
 */
export const BLOCK_RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "api",
  "admin",
  "login",
  "signup",
  "dashboard",
  "tableau-de-bord",
  "profil",
  "notifications",
  "participations",
  "aide",
  "tarifs",
  "contact",
  "nouvelle",
  "create",
  "toutes-les-cagnottes",
]);

/**
 * Convert a French title into a URL-safe slug.
 *
 *   "Les 30 ans de Thomas Diémé" → "les-30-ans-de-thomas-dieme"
 *   "Cadeau pour Aïssata"        → "cadeau-pour-aissata"
 *   "🎉 Célébration !!!"         → "celebration"
 *   ""                           → "cagnotte" (empty fallback)
 *   "   !!!   "                  → "cagnotte"
 *
 * Rules (in order):
 *   1. NFD normalize + strip combining marks (diacritic removal: é→e, ï→i, ç→c, …)
 *   2. lowercase
 *   3. collapse any run of non-[a-z0-9] to a single dash
 *   4. trim leading/trailing dashes
 *   5. truncate to 60 chars, then re-trim trailing dash
 *   6. if empty after all of the above, return "cagnotte"
 */
export function slugify(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks (é→e, ï→i, …)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // collapse to single dashes
    .replace(/^-+|-+$/g, "") // trim leading/trailing dashes
    .slice(0, 60)
    .replace(/-+$/, ""); // re-trim after truncate

  return slug || "cagnotte";
}

/**
 * Type guard for Prisma P2002 (unique-constraint violation).
 *
 * Works for BOTH real Prisma errors and test-harness fakes:
 *  - Real production errors satisfy `instanceof Prisma.PrismaClientKnownRequestError`.
 *  - Test fakes (and the rare async-boundary case where Prisma loses the prototype
 *    chain) satisfy the duck-typed `.code === "P2002"` check.
 *
 * Both branches MUST stay — removing either silently breaks one consumer.
 */
function isUniqueConstraintError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return true;
  }
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

/**
 * Attempt to reserve `base` as a slug by calling `createFn`. On P2002, retry with
 * `base-2` … `base-10`, then fall back to `base-<4-char base36 timestamp>`.
 *
 *   attempt 1:  base                 (or `<base>-1` if base is in BLOCK_RESERVED_SLUGS)
 *   attempt 2:  base-2
 *   …
 *   attempt 10: base-10
 *   fallback:   base-<Date.now().toString(36).slice(-4)>   ← deterministic-ish, NOT random
 *
 * `base` is assumed to already be the output of `slugify()` — callers are responsible
 * for normalization. Passing a non-slug string is undefined behavior.
 *
 * Any error other than P2002 bubbles up unchanged (caller deals with DB outages,
 * permission errors, etc.).
 */
export async function ensureUniqueSlug(
  base: string,
  createFn: (candidate: string) => Promise<void>,
): Promise<string> {
  const start = BLOCK_RESERVED_SLUGS.has(base) ? `${base}-1` : base;

  // Attempt 1 — start candidate (base or `<reserved>-1`)
  try {
    await createFn(start);
    return start;
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;
  }

  // Attempts 2..10 — numeric suffix on the ORIGINAL base.
  // (For reserved words this means we go from `admin-1` → `admin-2` → … which
  //  reads naturally; the test fixture "reserved with -1 already taken" pins this.)
  for (let n = 2; n <= 10; n++) {
    const candidate = `${base}-${n}`;
    try {
      await createFn(candidate);
      return candidate;
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
    }
  }

  // Fallback — 4-char base36 timestamp suffix.
  // PROJECT.md explicitly rejects random hex; this is deterministic-ish (and only
  // ~20 bits of entropy, so a P2002 here is astronomically unlikely but still bubbles up).
  const fallback = `${base}-${Date.now().toString(36).slice(-4)}`;
  await createFn(fallback);
  return fallback;
}
