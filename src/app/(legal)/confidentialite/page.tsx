export default function PrivacyPolicyPage() {
  return (
    <>
      <div className="mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">Politique de Confidentialité</h1>
        <p className="text-gray-500 font-medium">Dernière mise à jour : 1er Mars 2024</p>
      </div>

      <p>
        Chez <strong>Izy.store</strong>, nous accordons une importance primordiale à la protection de vos données personnelles. Cette Politique de Confidentialité vous explique quelles données nous collectons, pourquoi nous les collectons, et comment nous les protégeons conformément aux réglementations en vigueur.
      </p>

      <h2>1. Données collectées</h2>
      <p>Nous collectons les données suivantes :</p>
      <ul>
        <li><strong>Informations d&apos;identification du Vendeur :</strong> Nom, prénom, adresse e-mail, mot de passe (hashé), informations de compte de paiement (pour les retraits).</li>
        <li><strong>Informations des Clients (Acheteurs) :</strong> Adresse e-mail, numéro de téléphone (pour les paiements Mobile Money), nom, prénom.</li>
        <li><strong>Données de transaction :</strong> Historique des achats, montants, dates, références de transaction (nous ne stockons <em>jamais</em> vos numéros de carte bancaire, qui sont traités de manière sécurisée par notre partenaire de paiement).</li>
        <li><strong>Données techniques :</strong> Adresses IP, logs de connexion, type de navigateur, pour assurer la sécurité et le bon fonctionnement de la plateforme.</li>
      </ul>

      <h2>2. Utilisation des données</h2>
      <p>Vos données sont utilisées exclusivement pour les finalités suivantes :</p>
      <ul>
        <li>Fournir nos services : création de votre page boutique, hébergement de vos fichiers, gestion de vos rendez-vous.</li>
        <li>Traiter les paiements et assurer la livraison automatique des produits numériques.</li>
        <li>Prévenir la fraude et assurer la sécurité des transactions.</li>
        <li>Vous envoyer des notifications transactionnelles (confirmation d&apos;achat, demande de réinitialisation de mot de passe, alertes de paiement).</li>
      </ul>
      <p><strong>Nous ne revendons jamais vos données personnelles à des tiers.</strong></p>

      <h2>3. Conservation des données</h2>
      <p>
        Les données personnelles sont conservées pendant la durée nécessaire à la fourniture de nos services. Si vous supprimez votre compte Izy.store, vos données personnelles seront supprimées de nos bases de données actives, à l&apos;exception des données transactionnelles que nous sommes tenus de conserver pour des obligations légales, fiscales et comptables.
      </p>

      <h2>4. Cookies et Traceurs</h2>
      <p>
        Notre plateforme utilise des cookies pour :
      </p>
      <ul>
        <li><strong>Le fonctionnement essentiel (Cookies techniques) :</strong> Maintenir votre session active (authentification JWT) de manière sécurisée.</li>
        <li><strong>L&apos;analyse (Analytics) :</strong> Comprendre anonymement comment notre plateforme est utilisée pour améliorer l&apos;expérience utilisateur, sans pister individuellement vos actions sur d&apos;autres sites.</li>
      </ul>

      <h2>5. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles robustes pour protéger vos données contre tout accès non autorisé, altération, divulgation ou destruction. Toutes les communications entre votre navigateur et nos serveurs sont chiffrées (HTTPS/TLS). Les mots de passe sont hachés et sécurisés à l&apos;aide des meilleurs standards de l&apos;industrie (bcrypt).
      </p>

      <h2>6. Vos Droits</h2>
      <p>
        Conformément à la réglementation sur la protection des données (y compris le RGPD si applicable), vous disposez des droits suivants concernant vos données personnelles :
      </p>
      <ul>
        <li><strong>Droit d&apos;accès :</strong> Vous pouvez demander une copie de vos données personnelles.</li>
        <li><strong>Droit de rectification :</strong> Vous pouvez corriger des données inexactes depuis votre tableau de bord.</li>
        <li><strong>Droit à l&apos;effacement :</strong> Vous pouvez demander la suppression de votre compte et de vos données.</li>
      </ul>
      <p>
        Pour exercer ces droits, vous pouvez nous contacter à tout moment via l&apos;adresse e-mail de support disponible dans votre tableau de bord.
      </p>
    </>
  );
}
