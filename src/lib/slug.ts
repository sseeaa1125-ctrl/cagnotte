/**
 * Client-side seller slug preview helper (Phase 5 plan 05-01).
 *
 * Mirrors `backend/src/lib/cagnottes/slug.ts::slugify` logic for UX preview ONLY.
 * The backend (POST /api/auth/signup) is the authoritative source of truth —
 * it validates the slug against its own reserved-words list and unique index.
 *
 * This module exists so the signup form can show
 * "Ton espace sera cagnottes.sn/<slug>" as the user types, and so we can
 * pre-flight a /api/auth/check-slug probe before submitting the signup.
 */
import { api } from "./api";

/**
 * Pre-flight client guard — DO NOT treat as exhaustive.
 * The backend has the authoritative list (backend/src/lib/constants.ts RESERVED_SLUGS).
 * We duplicate a conservative subset here to avoid a network round-trip for obvious
 * collisions with our own app routes.
 */
export const RESERVED_SELLER_SLUGS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "auth",
  "www",
  "app",
  "dashboard",
  "tableau-de-bord",
  "c",
  "cagnottes",
  "inscription",
  "connexion",
  "mot-de-passe-oublie",
  "mot-de-passe-reinitialiser",
  "verification-email",
]);

/**
 * Convert a display name into a seller slug ([a-z0-9-]{3,30}).
 *
 *   "Amadou Fall"          → "amadou-fall"
 *   "Aïssata Traoré"       → "aissata-traore"
 *   "   !!!   "            → "" (caller must handle empty)
 *
 * Rules (order matters):
 *   1. NFD normalize + strip combining marks (é→e, ï→i, ç→c, …)
 *   2. lowercase
 *   3. replace non-[a-z0-9] runs with a single "-"
 *   4. trim leading/trailing "-"
 *   5. truncate to 30 chars, re-trim trailing "-"
 *   6. if < 3 chars after truncation, return "" — caller decides fallback
 */
export function slugifySellerName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");

  return slug.length >= 3 ? slug : "";
}

/**
 * Call `/api/auth/check-slug` to find the first available candidate.
 * Appends "-2", "-3", … up to "-9" on collisions. Throws after 10 attempts.
 *
 * Not called on keystroke (backend limits check-slug to 30/min) — only once
 * at submit time to pick a fresh candidate.
 */
export async function ensureAvailableSellerSlug(base: string): Promise<string> {
  if (!base || base.length < 3) {
    throw new Error("Slug base trop court");
  }

  const candidates: string[] = [base];
  for (let n = 2; n <= 9; n++) {
    candidates.push(`${base}-${n}`);
  }

  for (const candidate of candidates) {
    if (candidate.length > 30) continue;
    if (RESERVED_SELLER_SLUGS.has(candidate)) continue;
    try {
      const res = await api<{ available: boolean }>(
        `/api/auth/check-slug?slug=${encodeURIComponent(candidate)}`,
      );
      if (res.available) return candidate;
    } catch {
      // Ignore probe errors — fall through to next candidate.
    }
  }

  throw new Error("Aucun nom d'espace disponible — essaie un autre prénom/nom");
}
