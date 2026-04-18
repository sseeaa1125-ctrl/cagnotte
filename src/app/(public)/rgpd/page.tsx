import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RGPD — Protection des données",
  description:
    "Conformité RGPD de cagnotte.sn — vos droits sur vos données personnelles au Sénégal.",
  alternates: { canonical: "https://cagnotte.sn/rgpd" },
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
            1. Responsable du traitement
          </h2>
          <p>
            <strong>cagnotte.sn</strong> agit en qualité de responsable du
            traitement pour l&apos;ensemble des données personnelles collectées
            sur la plateforme. Les présentes dispositions s&apos;appliquent à
            tous les utilisateurs, qu&apos;ils soient organisateurs de
            cagnottes ou donateurs.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            2. Vos droits
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
              inexacte ou incomplète.
            </li>
            <li>
              <strong>Droit à l&apos;effacement</strong> — demander la
              suppression de votre compte et de vos données (« droit à
              l&apos;oubli »).
            </li>
            <li>
              <strong>Droit à la portabilité</strong> — récupérer vos données
              dans un format structuré et lisible par machine.
            </li>
            <li>
              <strong>Droit d&apos;opposition</strong> — refuser certains
              traitements (notifications non-essentielles).
            </li>
            <li>
              <strong>Droit à la limitation</strong> — geler temporairement le
              traitement de vos données pendant une vérification.
            </li>
            <li>
              <strong>Droit de retirer votre consentement</strong> à tout
              moment, sans affecter la licéité des traitements antérieurs.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            3. Exercer vos droits
          </h2>
          <p className="mb-3">
            Pour exercer l&apos;un de ces droits, envoie un email à{" "}
            <a
              href="mailto:contact@cagnotte.sn"
              className="font-semibold text-primary underline"
            >
              contact@cagnotte.sn
            </a>{" "}
            avec&nbsp;:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>ton nom et prénom</li>
            <li>ton email de connexion à cagnotte.sn</li>
            <li>le droit que tu souhaites exercer</li>
            <li>une copie d&apos;une pièce d&apos;identité (pour authentifier la demande)</li>
          </ul>
          <p className="mt-3">
            Nous te répondrons dans un délai maximal de <strong>30&nbsp;jours</strong>.
            Dans le cas où ta demande est complexe ou en cas de demandes
            multiples, ce délai peut être prolongé de 2 mois — tu seras alors
            informé(e) du report et de ses motifs.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            4. Base légale des traitements
          </h2>
          <p>Nous traitons tes données sur les bases suivantes&nbsp;:</p>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            <li>
              <strong>Exécution du contrat</strong> — création de compte,
              gestion de cagnotte, paiements, retraits.
            </li>
            <li>
              <strong>Obligation légale</strong> — vérification d&apos;identité
              (KYC), lutte contre le blanchiment, conservation comptable.
            </li>
            <li>
              <strong>Intérêt légitime</strong> — sécurité, détection de
              fraude, amélioration du service.
            </li>
            <li>
              <strong>Consentement</strong> — notifications
              non-essentielles, enquêtes utilisateur.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            5. Durées de conservation
          </h2>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong>Données de compte</strong>&nbsp;: conservées tant que le
              compte est actif, puis supprimées 12 mois après la clôture (ou 30
              jours après une demande explicite de suppression).
            </li>
            <li>
              <strong>Données de transaction</strong>&nbsp;: conservées{" "}
              <strong>5 à 10 ans</strong> pour conformité comptable et lutte
              anti-blanchiment (obligation légale).
            </li>
            <li>
              <strong>Pièces d&apos;identité KYC</strong>&nbsp;: conservées 5
              ans après la dernière transaction, puis supprimées de façon
              sécurisée.
            </li>
            <li>
              <strong>Logs techniques</strong> (sécurité, audit)&nbsp;:
              conservés 12 mois maximum.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            6. Transferts hors Sénégal
          </h2>
          <p>
            Certains de nos prestataires techniques (hébergement, emailing)
            sont situés dans l&apos;Union européenne ou aux États-Unis. Nous
            nous assurons que ces transferts respectent les garanties
            appropriées&nbsp;: clauses contractuelles types, certifications de
            protection des données, et chiffrement en transit et au repos.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            7. Sécurité des données
          </h2>
          <p className="mb-3">
            Nous mettons en œuvre des mesures techniques et organisationnelles
            strictes pour protéger tes données&nbsp;:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Chiffrement HTTPS/TLS pour toutes les communications</li>
            <li>Hachage des mots de passe (bcrypt)</li>
            <li>Chiffrement au repos des données sensibles (KYC)</li>
            <li>Journalisation des accès administrateurs</li>
            <li>Principe du moindre privilège</li>
            <li>Tests de sécurité réguliers</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            8. Violations de données
          </h2>
          <p>
            En cas de violation de données susceptible d&apos;engendrer un
            risque pour tes droits et libertés, nous te notifierons dans les
            meilleurs délais (et au maximum 72 heures après en avoir pris
            connaissance), par email ou notification sur la plateforme.
            L&apos;autorité compétente sera également informée.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            9. Réclamation
          </h2>
          <p>
            Si tu estimes que tes droits ne sont pas respectés, tu peux
            introduire une réclamation auprès de la Commission de Protection
            des Données Personnelles (CDP) du Sénégal ou de toute autorité
            compétente de ton pays de résidence.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            10. Contact
          </h2>
          <p>
            Pour toute question sur le traitement de tes données
            personnelles&nbsp;:{" "}
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
