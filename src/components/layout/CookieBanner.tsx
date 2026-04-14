"use client";

import * as React from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// Cookie consent banner. Fixed bottom-right card with 3 CTAs:
// Accepter / Choisir / Refuser. Decision is persisted in localStorage
// under `cagnottes.cookie-consent.v1` so the banner only shows once per
// browser. No third-party cookie manager library — pure custom UI.
//
// v1 scope: we only set a YES/NO preference flag. "Choisir" routes to
// /confidentialite#cookies where the user can read the policy. When we
// add analytics (Plausible / GA / TikTok Pixel), gate them on this flag.
//
// Fade-in from the bottom with Tailwind keyframes so there's no CLS and
// no layout shift on page load.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "cagnottes.cookie-consent.v1";
type Consent = "accepted" | "rejected" | "pending";

function readConsent(): Consent {
  if (typeof window === "undefined") return "pending";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "accepted" || raw === "rejected") return raw;
  } catch {
    // localStorage blocked (Safari ITP private mode). Fall through.
  }
  return "pending";
}

function writeConsent(value: "accepted" | "rejected") {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

export function CookieBanner() {
  const [consent, setConsent] = React.useState<Consent>("pending");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setConsent(readConsent());
  }, []);

  if (!mounted || consent !== "pending") return null;

  function handleAccept() {
    writeConsent("accepted");
    setConsent("accepted");
  }

  function handleReject() {
    writeConsent("rejected");
    setConsent("rejected");
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Préférences de cookies"
      className="fixed bottom-4 left-4 right-4 z-50 animate-[slideUp_0.4s_ease-out] sm:left-auto sm:right-6 sm:max-w-sm"
    >
      <div className="rounded-2xl border border-border bg-white p-5 shadow-2xl shadow-black/10">
        <div className="mb-3 flex items-start gap-3">
          <div
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink text-primary"
          >
            <Cookie size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-relaxed text-primary">
              <span className="font-bold">
                Nous utilisons des cookies.
              </span>{" "}
              Pour assurer le bon fonctionnement du site, Une question&nbsp;?
              Nous vous invitons à vous référer à la{" "}
              <Link
                href="/confidentialite"
                className="font-semibold underline"
              >
                politique des cookies
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <button
            type="button"
            onClick={handleAccept}
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
          >
            Accepter
          </button>
          <Link
            href="/confidentialite#cookies"
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-muted hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Choisir
          </Link>
          <button
            type="button"
            onClick={handleReject}
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-muted hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Refuser
          </button>
        </div>
      </div>
    </div>
  );
}
