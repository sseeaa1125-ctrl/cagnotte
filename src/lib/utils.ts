import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes avec gestion des conflits
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BILLING_PERIOD_LABELS: Record<string, string> = {
  WEEKLY: "/sem.",
  BIWEEKLY: "/15j",
  MONTHLY: "/mois",
  QUARTERLY: "/trim.",
  YEARLY: "/an",
};

export function billingPeriodLabel(period: string): string {
  return BILLING_PERIOD_LABELS[period] || BILLING_PERIOD_LABELS.MONTHLY;
}

/**
 * Détecte si le navigateur est un WebView in-app (Facebook, Instagram, TikTok).
 * Ces navigateurs bloquent les redirections vers les apps de paiement (Wave, Orange Money).
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|TikTok|musical_ly|BytedanceWebview/i.test(ua);
}

/**
 * Détecte spécifiquement le WebView TikTok.
 * target="_blank" ne fonctionne PAS dans TikTok (bloqué).
 * On utilise window.location.href sur clic direct (same-window navigation).
 */
export function isTikTokBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /TikTok|musical_ly|BytedanceWebview/i.test(ua);
}

