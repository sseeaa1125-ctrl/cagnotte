import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description:
    "Conditions générales d'utilisation de cagnotte.sn — la plateforme de cagnottes en ligne du Sénégal.",
  alternates: { canonical: "https://cagnotte.sn/cgu" },
  robots: { index: true, follow: true },
};

export default function CGUPage() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-6 font-headings text-4xl font-black text-primary md:text-5xl">
        Conditions générales d&apos;utilisation
      </h1>
      <p className="mb-10 text-sm text-gray-600">
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
            contributions via Wave, Orange Money ou Free Money.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            2. Commissions
          </h2>
          <p>
            La participation à une cagnotte est <strong>gratuite</strong>{" "}
            pour les donateurs : le montant affiché est le montant payé, sans
            frais ajoutés. cagnotte.sn prélève une commission sur les
            contributions reçues côté organisateur. Les frais applicables
            sont présentés en clair au créateur au moment de la création de
            sa cagnotte, en fonction du type choisi.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            3. Retraits — versement sous 72&nbsp;h
          </h2>
          <p>
            Les retraits sont soumis à la vérification d&apos;identité (KYC). Une
            fois votre compte validé, vous pouvez demander un retrait vers Wave,
            Orange Money, Free Money ou un compte bancaire.{" "}
            <strong>
              Les fonds sont versés sous 72&nbsp;h jours ouvrés
            </strong>{" "}
            après validation de la demande de retrait. Aucun délai supplémentaire
            n&apos;est appliqué une fois la pièce d&apos;identité approuvée.
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

      </div>
    </article>
  );
}
