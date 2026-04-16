import type { Metadata } from "next";
import Link from "next/link";
import { Check, Heart, PartyPopper } from "lucide-react";

export const metadata: Metadata = {
  title: "Tarifs — Gratuit pour les donateurs",
  description:
    "La création et la participation à une cagnotte sont 100 % gratuites. Les frais éventuels s'appliquent uniquement à l'organisateur lors de la création de sa cagnotte.",
};

const FESTIVE_FEATURES = [
  "Création illimitée de cagnottes",
  "Paiements Wave, Orange Money, Free Money",
  "Retraits Mobile Money sous 24h",
  "Vérification d'identité (KYC) incluse",
  "Support client 7j/7",
];

const SOLIDAIRE_FEATURES = [
  "Tout ce qui est inclus dans les cagnottes festives",
  "Badge « Solidaire » sur la page publique",
  "Visibilité sur la section Solidaires de l'accueil",
  "Accompagnement pour les projets associatifs",
];

export default function TarifsPage() {
  return (
    <article className="container mx-auto max-w-5xl px-4 py-16">
      <header className="mb-12 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
          Tarifs
        </p>
        <h1 className="mb-4 font-headings text-3xl font-black leading-tight text-primary md:text-5xl">
          Gratuit pour tes donateurs.
          <br />
          Rien à ajouter.
        </h1>
        <p className="mx-auto max-w-2xl text-base text-gray-600 md:text-lg">
          La création et la participation à une cagnotte sont{" "}
          <strong>gratuites</strong>. Tes contributeurs paient exactement le
          montant qu&apos;ils choisissent. Les frais éventuels s&apos;appliquent
          uniquement à l&apos;organisateur et sont présentés en clair au moment
          de la création.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Solidaire card */}
        <div className="relative flex flex-col rounded-3xl border-2 border-accent bg-white p-8 shadow-sm">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <Heart size={14} aria-hidden />
            Solidaire
          </div>
          <div className="mb-6">
            <p className="font-headings text-2xl font-black leading-tight text-primary md:text-3xl">
              Pour soutenir une cause
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Santé, éducation, urgence, projet solidaire.
            </p>
          </div>
          <ul className="mb-8 space-y-3">
            {SOLIDAIRE_FEATURES.map((feat) => (
              <li
                key={feat}
                className="flex items-start gap-3 text-sm text-primary/90"
              >
                <Check
                  size={18}
                  aria-hidden
                  className="mt-0.5 flex-shrink-0 text-green-600"
                />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/inscription"
            className="mt-auto inline-flex min-h-12 items-center justify-center rounded-lg border border-primary bg-white px-5 py-3.5 text-sm font-bold text-primary shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-pink/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
          >
            Créer une cagnotte solidaire
          </Link>
        </div>

        {/* Festive card */}
        <div className="relative flex flex-col rounded-3xl border-2 border-pink bg-white p-8 shadow-sm">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-pink px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <PartyPopper size={14} aria-hidden />
            Festive
          </div>
          <div className="mb-6">
            <p className="font-headings text-2xl font-black leading-tight text-primary md:text-3xl">
              Pour faire plaisir
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Anniversaire, mariage, baptême, cadeau commun, pot de départ.
            </p>
          </div>
          <ul className="mb-8 space-y-3">
            {FESTIVE_FEATURES.map((feat) => (
              <li
                key={feat}
                className="flex items-start gap-3 text-sm text-primary/90"
              >
                <Check
                  size={18}
                  aria-hidden
                  className="mt-0.5 flex-shrink-0 text-green-600"
                />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/inscription"
            className="mt-auto inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
          >
            Créer une cagnotte festive
          </Link>
        </div>
      </div>

      <section className="mt-16 rounded-3xl bg-muted/60 p-8 md:p-10">
        <h2 className="mb-4 font-headings text-2xl font-black text-primary md:text-3xl">
          Ce qui est inclus
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {[
            "Frais de paiement Wave / Orange Money / Free Money",
            "Hébergement sécurisé et haute disponibilité",
            "Vérification d'identité (KYC) et lutte anti-fraude",
            "Support client 7j/7 en français",
            "Virements Mobile Money sous 24h",
            "Tableau de bord temps réel + notifications",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 text-sm text-primary/90"
            >
              <Check
                size={18}
                aria-hidden
                className="mt-0.5 flex-shrink-0 text-green-600"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-gray-600">
          Les frais exacts applicables à l&apos;organisateur sont affichés au
          moment de la création de la cagnotte, selon son type.
        </p>
      </section>

      <section className="mt-10 text-center">
        <p className="text-sm text-gray-600">
          Besoin d&apos;une question ? Consulte notre{" "}
          <Link href="/aide" className="font-semibold text-primary underline">
            centre d&apos;aide
          </Link>{" "}
          ou contacte-nous à{" "}
          <a
            href="mailto:contact@cagnottes.sn"
            className="font-semibold text-primary underline"
          >
            contact@cagnottes.sn
          </a>
          .
        </p>
      </section>
    </article>
  );
}
