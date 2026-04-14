import { ChevronDown } from "lucide-react";
import { HOME_FAQ_LABELS } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────
// Phase 9 fixpack — Banani home FAQ section.
// Static server component. Uses native <details>/<summary> so no client
// JS is needed for expand/collapse. 3 cagnottes.sn-specific questions.
// Source: .planning/banani/screens/phase-9/home-source.md (FAQ.jsx)
// ─────────────────────────────────────────────────────────────────────────

export function HomeFAQ() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-14 text-center sm:py-16 md:py-24">
      <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 sm:mb-6">
        {HOME_FAQ_LABELS.kicker}
      </div>
      <h2 className="mb-8 font-headings text-3xl font-black leading-tight text-primary sm:mb-10 sm:text-4xl md:mb-12 md:text-5xl">
        {HOME_FAQ_LABELS.h2Part1}
        <br />
        {HOME_FAQ_LABELS.h2Part2}
      </h2>

      <div className="space-y-4 text-left">
        {HOME_FAQ_LABELS.items.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl bg-[#F4F6F9] p-6 transition-colors open:bg-gray-100 hover:bg-gray-100"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-lg font-bold text-primary">{item.q}</span>
              <ChevronDown
                size={20}
                aria-hidden
                className="flex-shrink-0 text-primary transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
