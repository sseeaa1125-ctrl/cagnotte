import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { FAQ_SECTIONS } from "@/lib/faq-content";
import { AideSearch } from "./AideSearch";

export const metadata: Metadata = {
  title: "Centre d'aide",
  description:
    "Toutes les réponses pour créer, partager et recevoir les contributions de votre cagnotte en ligne au Sénégal.",
};

export default function AidePage() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
      <header className="mb-10 text-center md:mb-14">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
          Centre d&apos;aide
        </p>
        <h1 className="mb-4 font-headings text-3xl font-black leading-tight text-primary md:text-5xl">
          Bonjour, comment
          <br />
          pouvons-nous vous aider&nbsp;?
        </h1>
      </header>

      <AideSearch sections={FAQ_SECTIONS} />

      <div className="mt-10 space-y-4">
        {FAQ_SECTIONS.map((section, idx) => (
          <details
            key={section.id}
            id={section.id}
            open={idx === 0}
            className="group overflow-hidden rounded-2xl border border-border bg-[#F4F6F9] transition-colors open:bg-gray-100"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 hover:bg-gray-100 md:px-6">
              <span className="font-headings text-base font-bold text-primary md:text-lg">
                {section.label}
              </span>
              <ChevronDown
                size={20}
                aria-hidden
                className="flex-shrink-0 text-primary transition-transform group-open:rotate-180"
              />
            </summary>

            <ul className="divide-y divide-border border-t border-border bg-background">
              {section.items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  <details className="group/item">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/60 md:px-6">
                      <span className="text-sm font-semibold text-primary md:text-base">
                        {item.q}
                      </span>
                      <ChevronDown
                        size={18}
                        aria-hidden
                        className="flex-shrink-0 text-muted-foreground transition-transform group-open/item:rotate-180"
                      />
                    </summary>
                    <p className="px-5 pb-4 pt-0 text-sm leading-relaxed text-gray-600 md:px-6 md:text-base">
                      {item.a}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <section className="mt-16 rounded-3xl bg-pink px-6 py-10 text-center">
        <h2 className="mb-3 font-headings text-2xl font-black text-primary md:text-3xl">
          Je ne trouve pas réponse adaptée à ma demande&nbsp;!
        </h2>
        <p className="mb-2 text-sm text-primary/80 md:text-base">
          Pas de panique&nbsp;!{" "}
          <a
            href="mailto:contact@cagnottes.sn"
            className="font-bold text-primary underline"
          >
            Envoyez-nous un message
          </a>{" "}
          à notre service client.
        </p>
        <p className="text-xs text-primary/70 md:text-sm">
          Nous répondons sous 48h ouvrées.
        </p>
      </section>
    </article>
  );
}
