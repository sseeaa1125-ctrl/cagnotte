import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de confidentialité | Izy.store",
  description: "Politique de confidentialité de la plateforme Izy.store",
  robots: { index: true, follow: true },
};

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const SECTIONS = [
  {
    title: "1. Données collectées",
    content: `Nous collectons les données suivantes lorsque tu utilises Izy.store :
• **Informations de compte** : nom, adresse email, mot de passe (hashé), photo de profil.
• **Informations de paiement** : numéro de téléphone mobile money pour les retraits. Nous ne stockons pas les données de carte bancaire.
• **Données d'utilisation** : pages visitées, clics sur les blocs, appareil utilisé (pour les statistiques vendeurs).
• **Données de transaction** : montants, produits achetés, statut de paiement.`,
  },
  {
    title: "2. Utilisation des données",
    content: `Tes données sont utilisées pour :
• Créer et gérer ton compte vendeur ou acheteur.
• Traiter les paiements et les retraits via nos partenaires (Bictorys, Wave, Orange Money).
• Fournir des statistiques de vente aux vendeurs.
• Envoyer des notifications relatives à tes commandes et ton compte.
• Améliorer la plateforme et prévenir les fraudes.`,
  },
  {
    title: "3. Partage des données",
    content: `Nous ne vendons jamais tes données personnelles. Nous les partageons uniquement avec :
• **Nos prestataires de paiement** (Bictorys) pour traiter les transactions.
• **Nos hébergeurs** (Vercel, Railway, Neon) pour faire fonctionner la plateforme.
• **Les autorités compétentes** si la loi l'exige.`,
  },
  {
    title: "4. Sécurité",
    content: `Nous protégeons tes données avec :
• Chiffrement HTTPS sur toutes les communications.
• Mots de passe hashés avec bcrypt (jamais stockés en clair).
• Tokens d'authentification en cookies sécurisés (httpOnly, secure, sameSite).
• Accès limité aux données en interne.`,
  },
  {
    title: "5. Conservation",
    content: `Tes données sont conservées tant que ton compte est actif. Si tu supprimes ton compte, tes données personnelles sont supprimées dans un délai de 30 jours. Les données de transaction peuvent être conservées plus longtemps pour des raisons légales et comptables.`,
  },
  {
    title: "6. Tes droits",
    content: `Tu peux à tout moment :
• **Accéder** à tes données depuis les paramètres de ton compte.
• **Modifier** tes informations personnelles.
• **Supprimer** ton compte et demander l'effacement de tes données.
• **Nous contacter** pour toute question à support@izy.store.`,
  },
  {
    title: "7. Cookies",
    content: `Nous utilisons des cookies strictement nécessaires au fonctionnement de la plateforme :
• **Cookies d'authentification** : pour maintenir ta session.
• **Cookies CSRF** : pour protéger contre les attaques cross-site.
Nous n'utilisons pas de cookies publicitaires ou de tracking tiers.`,
  },
  {
    title: "8. Modération et contenus interdits",
    content: `Pour garantir un environnement sûr, nous modérons les contenus publiés sur la plateforme. Les contenus suivants sont strictement interdits :
• **Drogues et substances illicites** : vente ou promotion de stupéfiants.
• **Jeux d'argent et paris** : casinos, paris sportifs, loteries.
• **Contenus à caractère sexuel** : pornographie, services pour adultes.
• **Armes et produits dangereux** : armes à feu, explosifs.

En cas de violation, nous nous réservons le droit de **suspendre ou bannir** le compte, de **geler ou confisquer les fonds**, et de **signaler aux autorités** si nécessaire.`,
  },
  {
    title: "9. Modifications",
    content: `Cette politique peut être mise à jour. En cas de changement significatif, nous t'en informerons par email. La date de dernière mise à jour est indiquée en bas de cette page.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
          Politique de confidentialité
        </h1>
        <p className="mt-3 text-sm text-gray-500">
          Dernière mise à jour : mars 2026
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
              <div className="mt-2 text-sm leading-relaxed text-gray-600 whitespace-pre-line">
                {renderContent(section.content)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-gray-100 pt-8 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Izy.store — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}
