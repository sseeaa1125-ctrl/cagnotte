/**
 * Utilitaires de partage — Web Share API (mobile natif) + fallbacks desktop.
 */

const BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BASE_URL || "https://izy.store";

export function getStoreUrl(slug: string, utmSource?: string): string {
  const base = `${BASE_URL}/${slug}`;
  if (!utmSource) return base;
  return `${base}?utm_source=${utmSource}&utm_medium=share`;
}

/**
 * Partage natif (mobile) avec fallback clipboard (desktop).
 * Retourne true si le partage natif a été utilisé.
 */
export async function shareStoreLink(
  slug: string,
  displayName: string
): Promise<boolean> {
  const url = getStoreUrl(slug);
  const text = `Découvre ${displayName} sur izy.store — Ta boutique dans ta bio !`;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: displayName, text, url });
      return true;
    } catch {
      // User cancelled — silent
      return false;
    }
  }

  // Fallback : copier dans le presse-papier
  await copyToClipboard(url);
  return false;
}

export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}

export function getWhatsAppShareUrl(slug: string): string {
  const url = getStoreUrl(slug, "whatsapp");
  const text = encodeURIComponent(`Découvre ma boutique : ${url}`);
  return `https://wa.me/?text=${text}`;
}
