import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique cookies",
  description:
    "Politique de gestion des cookies et traceurs sur cagnotte.sn — cookies strictement nécessaires, aucun traçage publicitaire.",
  alternates: { canonical: "https://cagnotte.sn/cookies" },
};

export default function CookiesPage() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-6 font-headings text-4xl font-black text-primary md:text-5xl">
        Politique de cookies
      </h1>
      <p className="mb-10 text-sm text-gray-600">
        Dernière mise à jour&nbsp;: avril 2026
      </p>

      <div className="space-y-8 text-base leading-relaxed text-primary/90">
        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            1. Qu&apos;est-ce qu&apos;un cookie&nbsp;?
          </h2>
          <p>
            Un cookie est un petit fichier texte déposé par ton navigateur
            lorsque tu visites un site. Il permet de mémoriser ta session, tes
            préférences ou de mesurer l&apos;audience du site. Les cookies ne
            contiennent aucune donnée sensible en clair (mot de passe, code
            PIN, numéro de carte).
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            2. Notre approche
          </h2>
          <p className="mb-3">
            Chez cagnotte.sn, nous utilisons <strong>uniquement</strong> des
            cookies strictement nécessaires au fonctionnement du service. Nous
            n&apos;utilisons&nbsp;:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Aucun cookie publicitaire ni de remarketing</li>
            <li>Aucun traceur tiers (Facebook, Google Ads, TikTok Pixel, etc.)</li>
            <li>Aucune revente ou partage de données à des fins marketing</li>
          </ul>
          <p className="mt-3">
            Tu n&apos;as donc pas besoin de consentement explicite pour les
            cookies listés ci-dessous&nbsp;: ils sont indispensables au
            fonctionnement de la plateforme.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            3. Cookies utilisés
          </h2>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-border">
                  <th className="py-3 pl-4 pr-4 font-semibold text-primary">
                    Nom
                  </th>
                  <th className="py-3 pr-4 font-semibold text-primary">
                    Usage
                  </th>
                  <th className="py-3 pr-4 font-semibold text-primary">
                    Durée
                  </th>
                  <th className="py-3 pr-4 font-semibold text-primary">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-gray-700">
                <tr>
                  <td className="py-3 pl-4 pr-4 font-mono text-xs">izy-token</td>
                  <td className="py-3 pr-4">Session authentifiée (accès JWT)</td>
                  <td className="py-3 pr-4 whitespace-nowrap">15&nbsp;min</td>
                  <td className="py-3 pr-4 text-xs text-gray-500">Essentiel</td>
                </tr>
                <tr>
                  <td className="py-3 pl-4 pr-4 font-mono text-xs">izy-refresh</td>
                  <td className="py-3 pr-4">Renouvellement de session</td>
                  <td className="py-3 pr-4 whitespace-nowrap">7&nbsp;jours</td>
                  <td className="py-3 pr-4 text-xs text-gray-500">Essentiel</td>
                </tr>
                <tr>
                  <td className="py-3 pl-4 pr-4 font-mono text-xs">izy-csrf</td>
                  <td className="py-3 pr-4">Protection CSRF (anti-fraude)</td>
                  <td className="py-3 pr-4 whitespace-nowrap">7&nbsp;jours</td>
                  <td className="py-3 pr-4 text-xs text-gray-500">Essentiel</td>
                </tr>
                <tr>
                  <td className="py-3 pl-4 pr-4 font-mono text-xs">
                    izy-admin-*
                  </td>
                  <td className="py-3 pr-4">
                    Session administrateur (équipe cagnotte.sn uniquement)
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">15&nbsp;min / 7&nbsp;j</td>
                  <td className="py-3 pr-4 text-xs text-gray-500">Essentiel</td>
                </tr>
                <tr>
                  <td className="py-3 pl-4 pr-4 font-mono text-xs">
                    cagnottes.cookie-consent.v1
                  </td>
                  <td className="py-3 pr-4">
                    Mémoire de ton choix sur cette bannière
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">12&nbsp;mois</td>
                  <td className="py-3 pr-4 text-xs text-gray-500">Préférence</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            4. Cookies de paiement
          </h2>
          <p>
            Lorsque tu effectues un paiement, tu es brièvement redirigé vers la
            plateforme de notre prestataire de paiement. Cette plateforme peut
            déposer ses propres cookies nécessaires à la sécurisation de la
            transaction. Nous n&apos;avons ni accès ni contrôle sur ces
            cookies&nbsp;; ils sont régis par la politique de confidentialité
            de ce prestataire.
          </p>
        </section>

        <section id="cookies">
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            5. Gérer tes cookies
          </h2>
          <p className="mb-3">
            Tu peux à tout moment effacer les cookies depuis les paramètres de
            ton navigateur. Note que cela peut te déconnecter et t&apos;obliger
            à te reconnecter à ta prochaine visite.
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Chrome</strong>&nbsp;: Paramètres → Confidentialité et
              sécurité → Cookies
            </li>
            <li>
              <strong>Safari</strong>&nbsp;: Préférences → Confidentialité →
              Gérer les données des sites
            </li>
            <li>
              <strong>Firefox</strong>&nbsp;: Paramètres → Vie privée et
              sécurité → Cookies et données de sites
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            6. Contact
          </h2>
          <p>
            Pour toute question sur notre utilisation des cookies, contacte-nous
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
