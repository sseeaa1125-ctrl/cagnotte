"use client";

import * as React from "react";
import Link from "next/link";
import { Cookie, ChevronLeft } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// Cookie consent banner. Fixed bottom-right card with 3 CTAs:
// Accepter / Choisir / Refuser. Decision is persisted in localStorage
// under `cagnottes.cookie-consent.v1` as a JSON record with the categories
// the user accepted. So the banner only shows once per browser.
//
// "Choisir" now opens a LOCAL expanded view inside the banner (no redirect)
// listing the cookie categories with per-category toggles — necessary
// (always on), analytics (opt-in), marketing (opt-in).
//
// Slide-up from the bottom on mount (see globals.css keyframes `slideUp`).
// No layout shift, no third-party cookie manager library.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "cagnottes.cookie-consent.v1";

interface ConsentRecord {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
}

type Status = "pending" | "decided";

function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (
      parsed &&
      parsed.necessary === true &&
      typeof parsed.analytics === "boolean" &&
      typeof parsed.marketing === "boolean"
    ) {
      return parsed as ConsentRecord;
    }
  } catch {
    // Corrupt JSON / localStorage blocked. Treat as pending.
  }
  return null;
}

function writeConsent(record: ConsentRecord) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}

export function CookieBanner() {
  const [status, setStatus] = React.useState<Status>("pending");
  const [mounted, setMounted] = React.useState(false);
  const [view, setView] = React.useState<"intro" | "options">("intro");
  const [analyticsOn, setAnalyticsOn] = React.useState(false);
  const [marketingOn, setMarketingOn] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const existing = readConsent();
    if (existing) setStatus("decided");
  }, []);

  if (!mounted || status === "decided") return null;

  function commit(next: { analytics: boolean; marketing: boolean }) {
    const record: ConsentRecord = {
      necessary: true,
      analytics: next.analytics,
      marketing: next.marketing,
      decidedAt: new Date().toISOString(),
    };
    writeConsent(record);
    setStatus("decided");
  }

  function handleAcceptAll() {
    commit({ analytics: true, marketing: true });
  }

  function handleRejectAll() {
    commit({ analytics: false, marketing: false });
  }

  function handleSavePreferences() {
    commit({ analytics: analyticsOn, marketing: marketingOn });
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Préférences de cookies"
      className="fixed bottom-4 left-4 right-4 z-50 animate-[slideUp_0.4s_ease-out] sm:left-auto sm:right-6 sm:max-w-sm"
    >
      <div className="rounded-2xl border border-border bg-white p-5 shadow-2xl shadow-black/10">
        {view === "intro" ? (
          <>
            <div className="mb-3 flex items-start gap-3">
              <div
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink text-primary"
              >
                <Cookie size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm font-bold text-primary">
                  On utilise des cookies 🍪
                </p>
                <p className="text-sm leading-relaxed text-gray-600">
                  Les cookies nécessaires assurent le bon fonctionnement du
                  site. Les autres nous aident à l&apos;améliorer. Tu choisis.{" "}
                  <Link
                    href="/cookies"
                    className="font-semibold text-primary underline"
                  >
                    En savoir +
                  </Link>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
              >
                Accepter
              </button>
              <button
                type="button"
                onClick={() => setView("options")}
                className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-muted hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Choisir
              </button>
              <button
                type="button"
                onClick={handleRejectAll}
                className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-muted hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Refuser
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setView("intro")}
              className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-primary"
              aria-label="Retour"
            >
              <ChevronLeft size={14} aria-hidden />
              Retour
            </button>

            <p className="mb-3 text-sm font-bold text-primary">
              Paramètres des cookies
            </p>
            <ul className="mb-4 flex flex-col gap-3">
              <li className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">
                      Nécessaires
                    </p>
                    <p className="mt-0.5 text-xs text-gray-600">
                      Session, sécurité et panier. Obligatoires pour utiliser
                      le site.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                    Toujours actif
                  </span>
                </div>
              </li>
              <li className="rounded-xl border border-border p-3">
                <label className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">
                      Analytics
                    </p>
                    <p className="mt-0.5 text-xs text-gray-600">
                      Nous aide à comprendre ce qui marche et ce qui casse sur
                      le site.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={analyticsOn}
                    onChange={(e) => setAnalyticsOn(e.target.checked)}
                    className="mt-1 h-5 w-5 accent-[var(--color-primary)]"
                    aria-label="Activer les cookies analytiques"
                  />
                </label>
              </li>
              <li className="rounded-xl border border-border p-3">
                <label className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">
                      Marketing
                    </p>
                    <p className="mt-0.5 text-xs text-gray-600">
                      Mesure l&apos;efficacité de nos campagnes publicitaires.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={marketingOn}
                    onChange={(e) => setMarketingOn(e.target.checked)}
                    className="mt-1 h-5 w-5 accent-[var(--color-primary)]"
                    aria-label="Activer les cookies marketing"
                  />
                </label>
              </li>
            </ul>

            <button
              type="button"
              onClick={handleSavePreferences}
              className="flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
            >
              Enregistrer mes préférences
            </button>
          </>
        )}
      </div>
    </div>
  );
}
