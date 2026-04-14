import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité — cagnotte.sn",
  description:
    "Politique de confidentialité et gestion des données personnelles de cagnotte.sn.",
};

export default function ConfidentialitePage() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-6 font-headings text-4xl font-black text-primary md:text-5xl">
        Politique de confidentialité
      </h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Dernière mise à jour&nbsp;: avril 2026
      </p>

      <div className="space-y-8 text-base leading-relaxed text-primary/90">
        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            1. Données collectées
          </h2>
          <p>
            Pour utiliser cagnotte.sn, nous collectons votre nom, prénom,
            adresse e-mail, numéro de téléphone, et — pour les retraits — les
            pièces d&apos;identité nécessaires à la vérification KYC.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            2. Paiements
          </h2>
          <p>
            Les données de paiement (Wave, Orange Money, Free Money, carte
            bancaire) ne transitent jamais par nos serveurs. Elles sont traitées
            directement par nos prestataires bancaires partenaires.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            3. Vos droits
          </h2>
          <p>
            Vous pouvez à tout moment demander l&apos;accès, la modification ou
            la suppression de vos données personnelles en nous contactant à
            <a
              href="mailto:contact@cagnottes.sn"
              className="ml-1 font-semibold text-primary underline"
            >
              contact@cagnottes.sn
            </a>
            .
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
