import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — cagnotte.sn",
  description:
    "Conditions générales d'utilisation de cagnotte.sn, la plateforme de cagnottes en ligne du Sénégal.",
};

export default function CGUPage() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-6 font-headings text-4xl font-black text-primary md:text-5xl">
        Conditions générales d&apos;utilisation
      </h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Dernière mise à jour&nbsp;: avril 2026
      </p>

      <div className="space-y-8 text-base leading-relaxed text-primary/90">
        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            1. Objet
          </h2>
          <p>
            Les présentes conditions générales encadrent l&apos;utilisation de la
            plateforme cagnotte.sn, qui permet à toute personne majeure résidant
            au Sénégal de créer une cagnotte en ligne et de recevoir des
            contributions via Wave, Orange Money, Free Money ou carte bancaire.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            2. Commissions
          </h2>
          <p>
            cagnotte.sn prélève une commission sur chaque contribution&nbsp;:
            <strong> 6&nbsp;% pour les cagnottes solidaires</strong> et
            <strong> 8&nbsp;% pour les cagnottes festives</strong>. La
            commission est affichée au donateur avant le paiement. Aucun frais
            caché n&apos;est appliqué.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            3. Retraits
          </h2>
          <p>
            Les retraits sont soumis à la vérification d&apos;identité (KYC). Une
            fois votre compte validé, vous pouvez demander un retrait vers Wave,
            Orange Money, Free Money ou un compte bancaire. Les virements sont
            généralement traités sous 24&nbsp;h.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            4. Contact
          </h2>
          <p>
            Pour toute question relative à ces conditions, contactez-nous à
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
