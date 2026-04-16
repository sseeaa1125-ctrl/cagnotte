import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique cookies",
  description:
    "Politique de gestion des cookies et traceurs sur cagnotte.sn.",
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
            Qu&apos;est-ce qu&apos;un cookie&nbsp;?
          </h2>
          <p>
            Un cookie est un petit fichier texte déposé par ton navigateur
            lorsque tu visites un site. Il permet de mémoriser ta session, tes
            préférences ou de mesurer l&apos;audience du site.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            Les cookies que nous utilisons
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 font-semibold text-primary">
                    Nom
                  </th>
                  <th className="py-2 pr-4 font-semibold text-primary">
                    Usage
                  </th>
                  <th className="py-2 font-semibold text-primary">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-gray-700">
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">izy-token</td>
                  <td className="py-2 pr-4">
                    Session authentifiée (obligatoire)
                  </td>
                  <td className="py-2">15&nbsp;min</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">izy-refresh</td>
                  <td className="py-2 pr-4">
                    Renouvellement de session (obligatoire)
                  </td>
                  <td className="py-2">7&nbsp;jours</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">izy-csrf</td>
                  <td className="py-2 pr-4">
                    Protection CSRF (obligatoire)
                  </td>
                  <td className="py-2">7&nbsp;jours</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">
                    cagnottes.cookie-consent.v1
                  </td>
                  <td className="py-2 pr-4">Mémoire de ton choix sur cette bannière</td>
                  <td className="py-2">12&nbsp;mois</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="cookies">
          <h2 className="mb-3 font-headings text-2xl font-bold text-primary">
            Gérer ton consentement
          </h2>
          <p>
            Tu peux à tout moment effacer les cookies depuis les paramètres de
            ton navigateur. Note que cela peut te déconnecter et te demander
            de valider à nouveau ton consentement à ta prochaine visite.
          </p>
        </section>

      </div>
    </article>
  );
}
