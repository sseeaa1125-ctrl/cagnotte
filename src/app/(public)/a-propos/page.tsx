import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ABOUT_LABELS } from "@/lib/constants";

export const metadata = {
  title: "À propos",
  description:
    "Cagnotte.sn est la plateforme sénégalaise dédiée à la collecte de fonds en ligne via Wave, Orange Money et Free Money.",
};

export default function AproposPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <header className="mx-auto mb-10 max-w-3xl">
        <h1 className="font-headings text-4xl font-black text-primary md:text-5xl">
          {ABOUT_LABELS.pageTitle}
        </h1>
      </header>

      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        {ABOUT_LABELS.paragraphs.map((p, i) => (
          <p
            key={i}
            className="text-base leading-relaxed text-gray-700 md:text-lg"
          >
            {p}
          </p>
        ))}
      </div>

      <section className="mx-auto mt-14 max-w-3xl rounded-3xl bg-pink p-8 text-center md:mt-16 md:p-10">
        <h2 className="mb-3 font-headings text-2xl font-black text-primary md:text-3xl">
          Prêt à lancer votre cagnotte ?
        </h2>
        <p className="mb-6 text-sm font-medium text-primary/70 md:text-base">
          Créez la vôtre en 2 minutes ou inspirez-vous des cagnottes en cours.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/inscription"
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
          >
            Créer ma cagnotte
            <ArrowRight
              size={18}
              aria-hidden
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
          <Link
            href="/cagnottes"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-primary/20 bg-white px-6 py-3 font-bold text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Parcourir les cagnottes
          </Link>
        </div>
      </section>
    </div>
  );
}
