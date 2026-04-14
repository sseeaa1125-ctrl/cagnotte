import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RGPD — cagnotte.sn",
  description:
    "Conformité RGPD de cagnotte.sn : vos droits sur vos données personnelles.",
};

export default function RgpdPage() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-6 font-headings text-4xl font-black text-primary md:text-5xl">
        RGPD
      </h1>
      <p className="mb-10 text-sm text-gray-600">
        Règlement général sur la protection des données — Dernière mise à
        jour&nbsp;: avril 2026
      </p>

      <div className="space-y-8 text-base leading-relaxed text-primary/90">
        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            Vos droits
          </h2>
          <p>
            Conformément au RGPD (UE 2016/679) et aux dispositions nationales
            applicables au Sénégal, vous disposez des droits suivants sur vos
            données personnelles&nbsp;:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            <li>
              <strong>Droit d&apos;accès</strong> — consulter les données que
              nous détenons sur vous.
            </li>
            <li>
              <strong>Droit de rectification</strong> — corriger une information
              inexacte.
            </li>
            <li>
              <strong>Droit à l&apos;effacement</strong> — demander la
              suppression de votre compte et de vos données.
            </li>
            <li>
              <strong>Droit à la portabilité</strong> — récupérer vos données
              dans un format structuré.
            </li>
            <li>
              <strong>Droit d&apos;opposition</strong> — refuser certains
              traitements (marketing, analytics).
            </li>
            <li>
              <strong>Droit à la limitation</strong> — geler temporairement le
              traitement de vos données.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            Exercer vos droits
          </h2>
          <p>
            Pour exercer l&apos;un de ces droits, envoie un email à
            <a
              href="mailto:contact@cagnottes.sn"
              className="ml-1 font-semibold text-primary underline"
            >
              contact@cagnottes.sn
            </a>{" "}
            avec ton nom, ton email de connexion et le droit que tu souhaites
            exercer. Nous te répondrons dans un délai maximal de 30 jours.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            Base légale des traitements
          </h2>
          <p>
            Nous traitons tes données sur la base&nbsp;:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            <li>
              <strong>Exécution du contrat</strong> — création de compte,
              gestion de cagnotte, retraits.
            </li>
            <li>
              <strong>Obligation légale</strong> — vérification d&apos;identité
              (KYC), lutte contre le blanchiment.
            </li>
            <li>
              <strong>Intérêt légitime</strong> — sécurité, détection de
              fraude, amélioration du service.
            </li>
            <li>
              <strong>Consentement</strong> — cookies analytiques,
              communications marketing.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            Durées de conservation
          </h2>
          <p>
            Tes données de compte sont conservées tant que ton compte est
            actif, puis supprimées 30 jours après une demande de suppression.
            Les données de transaction (pour conformité comptable et lutte
            anti-blanchiment) sont conservées 5 à 10 ans selon la nature.
          </p>
        </section>

        <p className="pt-6 text-sm italic text-gray-600">
          Document provisoire — la version finale sera publiée avant la mise
          en production publique.
        </p>
      </div>
    </article>
  );
}
