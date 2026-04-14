import { Apple, CreditCard, Smartphone } from "lucide-react";
import { HOME_FEATURES_LABELS } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────
// Phase 9 fixpack — Banani home pink features section.
// Static server component. Decorative toggle pill (not functional in v1)
// + big heading + 3 feature cards.
// Source: .planning/banani/screens/phase-9/home-source.md (FeaturesPink.jsx)
// ─────────────────────────────────────────────────────────────────────────

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
  return (
    <section className="relative mx-4 my-8 overflow-hidden rounded-[2rem] bg-[#FBE6ED] px-4 py-14 text-center sm:my-10 sm:rounded-[2.5rem] sm:py-16 md:mx-12 md:my-12 md:rounded-[3rem] md:px-8 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-pink/50 to-transparent"
      />

      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-full bg-white/80 p-1 shadow-sm backdrop-blur">
          <button
            type="button"
            disabled
            className="rounded-full bg-white px-6 py-2 font-bold text-pink-900 shadow-sm"
          >
            {HOME_FEATURES_LABELS.togglePlaisir}
          </button>
          <button
            type="button"
            disabled
            className="rounded-full px-6 py-2 font-medium text-gray-500"
          >
            {HOME_FEATURES_LABELS.toggleSoutenir}
          </button>
        </div>
      </div>

      <h2 className="mx-auto mb-4 max-w-3xl font-headings text-3xl font-black leading-tight text-primary sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
        {HOME_FEATURES_LABELS.h2Part1}
        <br />
        {HOME_FEATURES_LABELS.h2Part2}
      </h2>
      <p className="mx-auto mb-10 max-w-2xl text-base font-medium text-gray-700 sm:mb-12 sm:text-lg md:mb-16 md:text-xl">
        {HOME_FEATURES_LABELS.subtitle}
      </p>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
        {HOME_FEATURES_LABELS.cards.map((card, idx) => (
          <div
            key={card.title}
            className="flex flex-col items-center rounded-3xl bg-white p-8 text-center shadow-xl shadow-pink-900/5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-pink-900/10"
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
    </section>
  );
}
