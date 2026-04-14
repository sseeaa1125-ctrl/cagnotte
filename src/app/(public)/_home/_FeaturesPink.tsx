"use client";

import * as React from "react";
import { Apple, CreditCard, Smartphone } from "lucide-react";
import { HOME_FEATURES_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Banani home features section — now a client component so the Plaisir /
// Soutenir toggle actually swaps the content. Clicking "Soutenir" fades
// the card set out and slides a new set in with the same layout but a
// cooler blue palette (accent-blue background instead of pink). The h2
// and subtitle also swap.
// ─────────────────────────────────────────────────────────────────────────

type Mode = "plaisir" | "soutenir";

const CARD_ICONS = [null, "payments", null] as const;

function PaymentIcons() {
  return (
    <div className="mt-auto flex items-center gap-4 text-gray-700">
      <Apple size={24} aria-hidden />
      <CreditCard size={24} aria-hidden />
      <Smartphone size={24} aria-hidden />
    </div>
  );
}

export function HomeFeaturesPink() {
  const [mode, setMode] = React.useState<Mode>("plaisir");
  const content =
    mode === "plaisir"
      ? HOME_FEATURES_LABELS.plaisir
      : HOME_FEATURES_LABELS.soutenir;

  const isSoutenir = mode === "soutenir";

  return (
    <section
      className={cn(
        "relative mx-4 my-8 overflow-hidden rounded-[2rem] px-4 py-14 text-center transition-colors duration-500 ease-out sm:my-10 sm:rounded-[2.5rem] sm:py-16 md:mx-12 md:my-12 md:rounded-[3rem] md:px-8 md:py-24",
        isSoutenir ? "bg-[#DFECFB]" : "bg-[#FBE6ED]",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t to-transparent transition-colors duration-500",
          isSoutenir ? "from-[#DFECFB]/70" : "from-pink/50",
        )}
      />

      {/* Toggle pill — now interactive */}
      <div className="mb-8 flex justify-center">
        <div
          role="tablist"
          aria-label="Basculer entre faire plaisir et soutenir"
          className="inline-flex rounded-full bg-white/80 p-1 shadow-sm backdrop-blur"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "plaisir"}
            onClick={() => setMode("plaisir")}
            className={cn(
              "min-h-11 rounded-full px-6 py-2 text-sm font-bold transition-all duration-300 ease-out sm:text-base",
              mode === "plaisir"
                ? "bg-white text-pink-900 shadow-sm"
                : "bg-transparent text-gray-500 hover:text-primary",
            )}
          >
            {HOME_FEATURES_LABELS.togglePlaisir}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "soutenir"}
            onClick={() => setMode("soutenir")}
            className={cn(
              "min-h-11 rounded-full px-6 py-2 text-sm font-bold transition-all duration-300 ease-out sm:text-base",
              mode === "soutenir"
                ? "bg-white text-[#1E4AA8] shadow-sm"
                : "bg-transparent text-gray-500 hover:text-primary",
            )}
          >
            {HOME_FEATURES_LABELS.toggleSoutenir}
          </button>
        </div>
      </div>

      {/* Content block — keyed on mode so React remounts and re-runs the
          fade-in-up animation on every toggle. */}
      <div
        key={mode}
        className="relative z-10 animate-[fade-in-up_0.45s_ease-out_both]"
      >
        <h2 className="mx-auto mb-4 max-w-3xl font-headings text-3xl font-black leading-tight text-primary sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
          {content.h2Part1}
          <br />
          {content.h2Part2}
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-base font-medium text-gray-700 sm:mb-12 sm:text-lg md:mb-16 md:text-xl">
          {content.subtitle}
        </p>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {content.cards.map((card, idx) => (
            <div
              key={card.title}
              className="flex flex-col items-center rounded-3xl bg-white p-8 text-center shadow-xl shadow-black/5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/10"
            >
              <span className="mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {card.kicker}
              </span>
              <h3 className="mb-4 flex min-h-[64px] items-center font-headings text-xl font-black text-primary md:text-2xl">
                {card.title}
              </h3>
              <p className="mb-8 flex-grow text-sm font-medium leading-relaxed text-gray-600 md:text-base">
                {card.body}
              </p>
              {CARD_ICONS[idx] === "payments" ? <PaymentIcons /> : null}
              {card.cta ? (
                <span className="mt-auto rounded-full border border-gray-200 px-6 py-2 text-xs font-bold text-primary">
                  {card.cta}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
