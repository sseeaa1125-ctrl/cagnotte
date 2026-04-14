import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales — cagnotte.sn",
  description: "Mentions légales de cagnotte.sn.",
};

export default function MentionsLegalesPage() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-6 font-headings text-4xl font-black text-primary md:text-5xl">
        Mentions légales
      </h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Dernière mise à jour&nbsp;: avril 2026
      </p>

      <div className="space-y-8 text-base leading-relaxed text-primary/90">
        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            Éditeur
          </h2>
          <p>
            cagnotte.sn — Plateforme de cagnottes en ligne.
            <br />
            Contact&nbsp;:
            <a
              href="mailto:contact@cagnottes.sn"
              className="ml-1 font-semibold text-primary underline"
            >
              contact@cagnottes.sn
            </a>
          </p>
          <p className="mt-2">Siège&nbsp;: Dakar, Sénégal</p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            Hébergement
          </h2>
          <p>
            Le site est hébergé chez des prestataires cloud conformes aux
            standards internationaux de sécurité et de disponibilité.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            Propriété intellectuelle
          </h2>
          <p>
            L&apos;ensemble des éléments de ce site (textes, images, logo) est
            protégé par le droit de la propriété intellectuelle. Toute
            reproduction sans autorisation préalable est interdite.
          </p>
        </section>

        <p className="pt-6 text-sm italic text-muted-foreground">
          Document provisoire — la version finale sera publiée avant la mise en
          production publique.
        </p>
      </div>
    </article>
  );
}
