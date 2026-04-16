import crypto from "crypto";

/**
 * Formate un prix en FCFA avec séparateur de milliers
 * formatPrice(15000) → "15 000 FCFA"
 */
export function formatPrice(amount: number): string {
  const formatted = new Intl.NumberFormat("fr-FR").format(amount);
  return `${formatted} FCFA`;
}

/**
 * Génère une référence de commande courte et lisible (crypto-secure)
 * generateReference() → "FA-A1B2C3D4"
 * 10 caractères = 36^10 ≈ 3.6 quadrillions de combinaisons
 */
function makeReference(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(10);
  let result = "FA-";
  for (let i = 0; i < 10; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Génère un code de vérification 6 chiffres (crypto-secure)
 */
export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Génère une référence unique avec retry en cas de collision Prisma
 */
export async function generateUniqueReference(
  prisma: { order: { findUnique: (args: { where: { reference: string } }) => Promise<unknown> } }
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const ref = makeReference();
    const existing = await prisma.order.findUnique({ where: { reference: ref } });
    if (!existing) return ref;
  }
  // Fallback with crypto randomness + timestamp
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `FA-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

// Backward compat export
export function generateReference(): string {
  return makeReference();
}

/**
 * Convertit un BillingPeriod en millisecondes
 */
const BILLING_PERIOD_MS: Record<string, number> = {
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
  BIWEEKLY: 15 * 24 * 60 * 60 * 1000,
  MONTHLY: 30 * 24 * 60 * 60 * 1000,
  QUARTERLY: 90 * 24 * 60 * 60 * 1000,
  YEARLY: 365 * 24 * 60 * 60 * 1000,
};

export function billingPeriodToMs(period: string): number {
  return BILLING_PERIOD_MS[period] || BILLING_PERIOD_MS.MONTHLY;
}

/**
 * Convertit un BillingPeriod en label français pour l'affichage
 */
const BILLING_PERIOD_LABELS: Record<string, string> = {
  WEEKLY: "/semaine",
  BIWEEKLY: "/2 semaines",
  MONTHLY: "/mois",
  QUARTERLY: "/trimestre",
  YEARLY: "/an",
};

export function billingPeriodLabel(period: string): string {
  return BILLING_PERIOD_LABELS[period] || BILLING_PERIOD_LABELS.MONTHLY;
}

/**
 * Escape HTML characters to prevent XSS in email templates
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Timezone → Country mapping (pour détection pays acheteur sans header géo) ──
const TZ_TO_COUNTRY: Record<string, string> = {
  "Africa/Dakar": "SN", "Africa/Abidjan": "CI", "Africa/Bamako": "ML",
  "Africa/Ouagadougou": "BF", "Africa/Conakry": "GN", "Africa/Niamey": "NE",
  "Africa/Lome": "TG", "Africa/Porto-Novo": "BJ", "Africa/Nouakchott": "MR",
  "Africa/Bissau": "GW", "Africa/Douala": "CM", "Africa/Libreville": "GA",
  "Africa/Brazzaville": "CG", "Africa/Kinshasa": "CD", "Africa/Ndjamena": "TD",
  "Africa/Casablanca": "MA", "Africa/Tunis": "TN", "Africa/Algiers": "DZ",
  "Europe/Paris": "FR", "Europe/Brussels": "BE", "Europe/Zurich": "CH",
  "Europe/London": "GB", "Europe/Berlin": "DE", "Europe/Madrid": "ES",
  "Europe/Rome": "IT", "America/New_York": "US", "America/Chicago": "US",
  "America/Denver": "US", "America/Los_Angeles": "US", "America/Toronto": "CA",
  "America/Montreal": "CA", "America/Vancouver": "CA",
};

/**
 * Détecte le pays depuis les headers de requête + timezone navigateur.
 * Chaîne de fallback : header géo Vercel → header Cloudflare → timezone → null
 */
export function getCountryFromRequest(req: import("express").Request, timezone?: string): string | null {
  const v = req.headers["x-vercel-ip-country"] as string | undefined;
  if (v && v.length === 2) return v.toUpperCase();
  const cf = req.headers["cf-ipcountry"] as string | undefined;
  if (cf && cf.length === 2 && cf !== "XX") return cf.toUpperCase();
  if (timezone && TZ_TO_COUNTRY[timezone]) return TZ_TO_COUNTRY[timezone];
  return null;
}

// ── Bictorys : pays supportés par type de paiement (mars 2026) ──
// Source: GET /onboarding/v1/payment-methods/me
const BICTORYS_COUNTRIES: Record<string, string[]> = {
  wave_money: ["SN", "CI", "BF"],
  orange_money: ["SN", "CI", "BK", "ML"],  // BK = Burkina chez Bictorys (pas BF)
  mtn_money: ["CI", "BJ"],
  moov: ["TG", "CI", "BF", "BJ"],
  togocell: ["TG"],
  mobicash: ["BF", "ML"],
  maxit: ["SN"],  // Maxit = Orange Money rebrandé au Sénégal
};

/**
 * Normalise le code pays pour l'API Bictorys.
 * - Orange Money BF → "BK" (convention Bictorys pour Burkina)
 * Note: les cartes bancaires sont retirées de la v1 — le branchement
 * `card → "SN"` n'existe plus.
 */
export function normalizeBictorysCountry(paymentType: string, country: string): string {
  if (paymentType === "orange_money" && country === "BF") return "BK";
  return country;
}

/**
 * Retourne un pays compatible avec le paymentType Bictorys.
 * Mobile money uniquement en v1 : priorité à l'indicatif téléphonique du
 * client (un Sénégalais à Paris avec un +221 doit passer sur Wave SN,
 * pas Wave CI).
 */
export function getBictorysCountry(
  detectedCountry: string | null,
  paymentType: string,
  sellerCountry?: string | null,
  customerPhone?: string | null,
): string {
  const supported = BICTORYS_COUNTRIES[paymentType];
  if (!supported) {
    return detectedCountry || sellerCountry || "SN";
  }

  // Mobile money → priorité : indicatif téléphone > géolocalisation > pays vendeur
  if (customerPhone) {
    const phoneCountry = countryFromDialCode(customerPhone);
    if (phoneCountry) {
      // Normaliser BF → BK pour orange_money
      const normalized = normalizeBictorysCountry(paymentType, phoneCountry);
      if (supported.includes(normalized)) return normalized;
    }
  }
  if (detectedCountry) {
    const normalized = normalizeBictorysCountry(paymentType, detectedCountry);
    if (supported.includes(normalized)) return normalized;
  }
  if (sellerCountry) {
    const normalized = normalizeBictorysCountry(paymentType, sellerCountry);
    if (supported.includes(normalized)) return normalized;
  }
  return supported[0];
}

// Extraire le pays depuis l'indicatif téléphonique (sans dépendance sur phone.ts pour éviter import circulaire)
const DIAL_TO_COUNTRY: [string, string][] = [
  ["225", "CI"], ["224", "GN"], ["223", "ML"], ["226", "BF"],
  ["227", "NE"], ["228", "TG"], ["229", "BJ"], ["222", "MR"],
  ["245", "GW"], ["237", "CM"], ["241", "GA"], ["242", "CG"],
  ["243", "CD"], ["212", "MA"], ["221", "SN"],
];
function countryFromDialCode(phone: string): string | null {
  const digits = phone.replace(/[^0-9]/g, "");
  for (const [dial, code] of DIAL_TO_COUNTRY) {
    if (digits.startsWith(dial)) return code;
  }
  return null;
}
