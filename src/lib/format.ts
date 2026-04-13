// src/lib/format.ts

/**
 * Formate un montant en FCFA avec séparateur d'espace régulier.
 * formatPrice(15000) → "15 000 FCFA"
 * formatPrice(0) → "0 FCFA"
 * Intl utilise U+202F (espace insécable étroite) en fr-FR ;
 * on normalise en espace régulier pour cohérence WhatsApp/share.
 */
export function formatPrice(amount: number): string {
  if (!Number.isFinite(amount)) return "0 FCFA";
  const rounded = Math.floor(amount); // FCFA has no cents, defensive
  const formatted = new Intl.NumberFormat("fr-FR")
    .format(rounded)
    .replace(/\u202F|\u00A0/g, " ");
  return `${formatted} FCFA`;
}

/**
 * Formate un numéro de téléphone sénégalais au format international affichable.
 * formatPhone("221771234567") → "+221 77 123 45 67"
 * formatPhone("771234567")    → "+221 77 123 45 67"
 * formatPhone("+221771234567") → "+221 77 123 45 67"
 * Accepte 9 chiffres locaux ou 12 chiffres internationaux. Autre : renvoie brut.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  let local: string;
  if (digits.length === 9) {
    local = digits;
  } else if (digits.length === 12 && digits.startsWith("221")) {
    local = digits.slice(3);
  } else {
    return raw;
  }
  const a = local.slice(0, 2);
  const b = local.slice(2, 5);
  const c = local.slice(5, 7);
  const d = local.slice(7, 9);
  return `+221 ${a} ${b} ${c} ${d}`;
}

/**
 * Formate une date en "il y a N minutes/heures/jours" en français.
 * Futur → "dans N ..."
 * Sous la minute → "à l'instant" (codé en dur)
 */
export function formatRelativeTime(input: Date | string): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < 60) return "à l'instant";

  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

  if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (absSec < 86_400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (absSec < 2_592_000) return rtf.format(Math.round(diffSec / 86_400), "day");
  if (absSec < 31_536_000) return rtf.format(Math.round(diffSec / 2_592_000), "month");
  return rtf.format(Math.round(diffSec / 31_536_000), "year");
}
