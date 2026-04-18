import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité et gestion des données personnelles de cagnotte.sn.",
  alternates: { canonical: "https://cagnotte.sn/confidentialite" },
  robots: { index: true, follow: true },
};

export default function ConfidentialitePage() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-6 font-headings text-4xl font-black text-primary md:text-5xl">
        Politique de confidentialité
      </h1>
      <p className="mb-10 text-sm text-gray-600">
        Dernière mise à jour&nbsp;: avril 2026
      </p>

      <div className="space-y-8 text-base leading-relaxed text-primary/90">
        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            1. Responsable du traitement
          </h2>
          <p>
            Le site <strong>cagnotte.sn</strong> est édité et exploité au
            Sénégal. Le responsable du traitement des données personnelles
            est joignable à l&apos;adresse&nbsp;:{" "}
            <a
              href="mailto:contact@cagnotte.sn"
              className="font-semibold text-primary underline"
            >
              contact@cagnotte.sn
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            2. Données collectées
          </h2>
          <p className="mb-3">
            Nous collectons uniquement les données nécessaires au
            fonctionnement du service&nbsp;:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Créateurs de cagnottes</strong>&nbsp;: nom, prénom,
              adresse e-mail, numéro de téléphone, et — pour les retraits —
              les pièces d&apos;identité nécessaires à la vérification
              d&apos;identité (KYC).
            </li>
            <li>
              <strong>Donateurs</strong>&nbsp;: nom (ou pseudonyme), adresse
              e-mail, numéro de téléphone mobile money, et éventuellement un
              message accompagnant le don.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            3. Finalités du traitement
          </h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Création et gestion de votre compte utilisateur</li>
            <li>Traitement des contributions et des retraits</li>
            <li>Vérification d&apos;identité (KYC) pour les retraits</li>
            <li>Envoi de notifications liées à vos cagnottes (reçus, alertes de seuil, statut de retrait)</li>
            <li>Prévention de la fraude et respect des obligations légales</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            4. Paiements
          </h2>
          <p>
            Les données de paiement mobile money (Wave, Orange Money, Free
            Money) ne transitent jamais par nos serveurs. Elles sont traitées
            directement et exclusivement par notre prestataire de paiement
            partenaire. Nous ne stockons aucun code secret, PIN ou identifiant
            de compte mobile money.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            5. Durée de conservation
          </h2>
          <p>
            Vos données personnelles sont conservées pendant toute la durée
            de votre inscription sur la plateforme, puis supprimées dans un
            délai de 12&nbsp;mois après la clôture de votre compte, sauf
            obligation légale de conservation plus longue (notamment les
            données financières liées aux transactions).
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            6. Partage des données
          </h2>
          <p>
            Nous ne vendons ni ne louons vos données personnelles. Elles
            peuvent être partagées uniquement avec&nbsp;:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Notre prestataire de paiement, pour le traitement des transactions</li>
            <li>Notre hébergeur, pour le stockage sécurisé des données</li>
            <li>Les autorités compétentes, en cas d&apos;obligation légale</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            7. Sécurité
          </h2>
          <p>
            Nous mettons en œuvre des mesures techniques et
            organisationnelles pour protéger vos données&nbsp;: chiffrement
            des communications (HTTPS), hachage des mots de passe, contrôle
            d&apos;accès strict aux bases de données, et journalisation des
            accès sensibles.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            8. Cookies
          </h2>
          <p>
            cagnotte.sn utilise uniquement des cookies strictement nécessaires
            au fonctionnement du service (authentification, sécurité CSRF).
            Nous n&apos;utilisons aucun cookie publicitaire ni de traçage
            tiers.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            9. Vos droits
          </h2>
          <p className="mb-3">
            Conformément à la loi sénégalaise sur la protection des données
            personnelles, vous disposez des droits suivants&nbsp;:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Droit d&apos;accès à vos données personnelles</li>
            <li>Droit de rectification des données inexactes</li>
            <li>Droit de suppression de votre compte et de vos données</li>
            <li>Droit d&apos;opposition au traitement de vos données</li>
          </ul>
          <p className="mt-3">
            Pour exercer ces droits, contactez-nous à{" "}
            <a
              href="mailto:contact@cagnotte.sn"
              className="font-semibold text-primary underline"
            >
              contact@cagnotte.sn
            </a>
            . Nous nous engageons à répondre dans un délai de 30&nbsp;jours.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            10. Modifications
          </h2>
          <p>
            Nous nous réservons le droit de modifier cette politique à tout
            moment. En cas de changement significatif, vous serez informé(e)
            par e-mail ou par notification sur la plateforme. La date de
            dernière mise à jour est indiquée en haut de cette page.
          </p>
        </section>
      </div>
    </article>
  );
}
