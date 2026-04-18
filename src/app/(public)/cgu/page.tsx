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
            Les présentes conditions générales encadrent l&apos;utilisation de
            la plateforme <strong>cagnotte.sn</strong>, qui permet à toute
            personne majeure résidant au Sénégal de créer une cagnotte en
            ligne et de recevoir des contributions via Wave, Orange Money ou
            Free Money.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            2. Inscription et compte
          </h2>
          <p className="mb-3">
            Pour créer une cagnotte, vous devez disposer d&apos;un compte sur
            cagnotte.sn. Vous vous engagez à&nbsp;:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Fournir des informations exactes et à jour</li>
            <li>Ne pas créer de compte sous une fausse identité</li>
            <li>Préserver la confidentialité de vos identifiants de connexion</li>
            <li>Nous signaler toute utilisation non autorisée de votre compte</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            3. Création de cagnottes
          </h2>
          <p className="mb-3">
            Deux types de cagnottes sont disponibles&nbsp;:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Cagnotte solidaire</strong>&nbsp;: destinée à des causes
              sociales, médicales, éducatives ou humanitaires
            </li>
            <li>
              <strong>Cagnotte festive</strong>&nbsp;: destinée à des
              événements (anniversaires, mariages, fêtes, projets personnels)
            </li>
          </ul>
          <p className="mt-3">
            L&apos;organisateur s&apos;engage à utiliser les fonds collectés
            conformément à l&apos;objet déclaré de la cagnotte. Toute
            utilisation frauduleuse entraînera la suspension du compte et le
            blocage des fonds.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            4. Contributions
          </h2>
          <p>
            La participation à une cagnotte est{" "}
            <strong>gratuite pour les donateurs</strong>&nbsp;: le montant
            affiché est le montant payé, sans frais ajoutés. Les contributions
            sont effectuées via Wave, Orange Money ou Free Money. Toute
            contribution est définitive et ne peut faire l&apos;objet
            d&apos;un remboursement, sauf en cas de fraude avérée.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            5. Commissions
          </h2>
          <p>
            cagnotte.sn prélève une commission sur les contributions reçues,
            côté organisateur&nbsp;:
          </p>
          <ul className="ml-5 mt-3 list-disc space-y-1">
            <li>
              <strong>6&nbsp;%</strong> pour les cagnottes solidaires
            </li>
            <li>
              <strong>8&nbsp;%</strong> pour les cagnottes festives
            </li>
          </ul>
          <p className="mt-3">
            Les taux de commission sont présentés en clair au créateur lors de
            la création de sa cagnotte. Ils peuvent être modifiés avec un
            préavis de 30&nbsp;jours.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            6. Retraits
          </h2>
          <p className="mb-3">
            Les retraits sont soumis à la vérification d&apos;identité (KYC).
            Une fois votre identité validée, vous pouvez demander un retrait
            vers Wave, Orange Money ou Free Money.
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Délai de versement</strong>&nbsp;: les fonds sont versés
              sous <strong>72&nbsp;h ouvrées</strong> après validation de la
              demande
            </li>
            <li>
              <strong>Montant minimum</strong>&nbsp;: 1&nbsp;000&nbsp;FCFA par
              retrait
            </li>
            <li>
              <strong>Limites journalières</strong>&nbsp;: 2&nbsp;000&nbsp;000&nbsp;FCFA
              par opérateur, 4&nbsp;000&nbsp;000&nbsp;FCFA au total
            </li>
          </ul>
          <p className="mt-3">
            cagnotte.sn se réserve le droit de bloquer un retrait en cas de
            suspicion de fraude ou d&apos;activité contraire aux présentes
            conditions.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            7. Obligations de l&apos;utilisateur
          </h2>
          <p className="mb-3">
            En utilisant cagnotte.sn, vous vous engagez à ne pas&nbsp;:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Créer de cagnottes à des fins illicites ou frauduleuses</li>
            <li>Publier du contenu diffamatoire, discriminatoire ou contraire à l&apos;ordre public</li>
            <li>Tenter de contourner les mécanismes de sécurité de la plateforme</li>
            <li>Utiliser la plateforme pour du blanchiment d&apos;argent ou du financement illicite</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            8. Suspension et résiliation
          </h2>
          <p>
            cagnotte.sn se réserve le droit de suspendre ou supprimer tout
            compte en cas de violation des présentes conditions, de fraude,
            ou d&apos;activité suspecte. En cas de suspension, les fonds en
            attente seront gelés le temps de l&apos;enquête. L&apos;utilisateur
            sera informé par e-mail des motifs de la suspension.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            9. Responsabilité
          </h2>
          <p>
            cagnotte.sn agit en qualité d&apos;intermédiaire technique entre
            les organisateurs et les donateurs. Nous ne garantissons pas
            l&apos;utilisation effective des fonds par l&apos;organisateur.
            cagnotte.sn ne saurait être tenu responsable en cas de litige
            entre un organisateur et ses donateurs concernant l&apos;usage des
            fonds collectés.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            10. Propriété intellectuelle
          </h2>
          <p>
            L&apos;ensemble des éléments du site (logo, textes, design,
            code) sont la propriété exclusive de cagnotte.sn. Toute
            reproduction ou utilisation sans autorisation est interdite.
            Les contenus publiés par les utilisateurs (descriptions, images)
            restent leur propriété, mais ils accordent à cagnotte.sn une
            licence d&apos;utilisation pour l&apos;affichage sur la
            plateforme.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            11. Droit applicable
          </h2>
          <p>
            Les présentes conditions sont régies par le droit sénégalais.
            Tout litige relatif à l&apos;utilisation de cagnotte.sn sera
            soumis aux juridictions compétentes de Dakar, Sénégal.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            12. Contact
          </h2>
          <p>
            Pour toute question relative à ces conditions, contactez-nous
            à{" "}
            <a
              href="mailto:contact@cagnotte.sn"
              className="font-semibold text-primary underline"
            >
              contact@cagnotte.sn
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
