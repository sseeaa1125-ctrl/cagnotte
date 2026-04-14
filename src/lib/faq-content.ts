// Help center content for /aide. Flat TypeScript so the page can render
// statically without any data-fetching. All strings are in French and
// speak to cagnottes.sn specifically — no Le Pot Commun / GoFundMe
// terminology. Tone: direct, friendly, tutoiement.

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqSection {
  id: string;
  label: string;
  items: FaqItem[];
}

export const FAQ_SECTIONS: readonly FaqSection[] = [
  {
    id: "compte-securite",
    label: "Mon compte & Sécurité",
    items: [
      {
        q: "Comment me connecter ou me déconnecter ?",
        a: "Clique sur « Se connecter » en haut à droite et entre ton email + mot de passe. Pour te déconnecter, clique sur ton avatar en haut à droite puis « Se déconnecter ».",
      },
      {
        q: "Comment modifier mon adresse e-mail, mon mot de passe ou mon nom ?",
        a: "Rends-toi sur Profil (menu avatar → Profil). Tu peux y modifier ton nom affiché, ton email et ton mot de passe. Un email de confirmation sera envoyé si tu changes ton adresse.",
      },
      {
        q: "J'ai oublié mon mot de passe. Comment le réinitialiser ?",
        a: "Sur la page de connexion, clique sur « Mot de passe oublié ? » et entre ton email. Tu recevras un lien de réinitialisation valable 1 heure.",
      },
      {
        q: "Comment fonctionnent les documents d'identité (KYC) ?",
        a: "Pour retirer tes fonds, tu dois vérifier ton identité. Rends-toi sur Profil → Vérification d'identité et téléverse une pièce d'identité recto + verso (CNI, passeport, permis). La validation prend généralement moins de 24h.",
      },
      {
        q: "Mon compte est bloqué ou gelé. Que faire ?",
        a: "Si ton compte est temporairement gelé pour des raisons de sécurité, contacte notre support à contact@cagnottes.sn avec ton email de connexion. Nous répondons sous 48h ouvrées.",
      },
      {
        q: "Comment supprimer mon compte ?",
        a: "Envoie une demande écrite à contact@cagnottes.sn depuis l'email de ton compte. Nous supprimerons tes données dans un délai de 30 jours, conformément à notre politique de confidentialité.",
      },
    ],
  },
  {
    id: "creer-gerer-cagnotte",
    label: "Créer et gérer une cagnotte",
    items: [
      {
        q: "Comment créer une cagnotte ?",
        a: "Depuis la page d'accueil ou ton tableau de bord, clique sur « Créer une cagnotte », choisis le type (Festive pour un événement, Solidaire pour soutenir une cause) puis suis les 3 étapes du formulaire.",
      },
      {
        q: "Quelle est la différence entre cagnotte festive et cagnotte solidaire ?",
        a: "Les cagnottes festives servent à faire plaisir (anniversaire, pot de départ, cadeau commun). Les cagnottes solidaires soutiennent une cause (santé, éducation, urgence). Les frais diffèrent : 8% festive, 6% solidaire.",
      },
      {
        q: "Puis-je modifier ma cagnotte après sa création ?",
        a: "Oui. Depuis le détail de ta cagnotte dans le tableau de bord, clique sur « Gérer ». Tu peux modifier le titre, la description, l'image, l'objectif, la date de fin et la visibilité. L'URL (slug) ne peut pas être changée pour préserver les liens partagés.",
      },
      {
        q: "Puis-je ajouter plusieurs photos ou une vidéo YouTube ?",
        a: "Oui, depuis l'étape 2 de la création ou depuis la page « Modifier », tu peux ajouter jusqu'à 10 éléments dans la galerie : photos JPG/PNG/WebP et liens YouTube. Les vidéos s'afficheront en lecteur intégré sur la page publique.",
      },
      {
        q: "Comment clôturer ma cagnotte ?",
        a: "Depuis le détail de ta cagnotte, va dans la zone rouge « Zone de danger » en bas puis clique sur « Clôturer la cagnotte ». Les donateurs verront un badge « Cagnotte clôturée » et ne pourront plus participer. Tu peux la rouvrir à tout moment.",
      },
      {
        q: "Puis-je créer une cagnotte privée ?",
        a: "Oui. À l'étape 3 de la création, choisis « Privée ». Ta cagnotte ne sera pas listée sur le site, elle n'est accessible que via son lien direct. Partage-le uniquement avec les personnes de ton choix.",
      },
      {
        q: "Comment masquer le montant ou la liste des donateurs ?",
        a: "À l'étape 3 de la création (ou depuis « Modifier »), active les options « Masquer le montant collecté » ou « Masquer la liste des donateurs ». En tant que créateur, tu continueras toujours de voir ces informations dans ton tableau de bord.",
      },
      {
        q: "Je ne trouve plus ma cagnotte. Où est-elle ?",
        a: "Vérifie que tu es connecté·e avec le bon compte. Depuis le tableau de bord, toutes tes cagnottes apparaissent dans la liste. Si elle reste introuvable, contacte contact@cagnottes.sn.",
      },
      {
        q: "Comment recevoir des notifications sur ma cagnotte ?",
        a: "Tu reçois automatiquement une notification à chaque nouvelle participation et quand ta cagnotte atteint des paliers (25%, 50%, 75%, 100% de l'objectif). Consulte-les dans la cloche en haut à droite ou sur la page Notifications.",
      },
    ],
  },
  {
    id: "participer",
    label: "Participer à une cagnotte",
    items: [
      {
        q: "Comment participer à une cagnotte ?",
        a: "Ouvre le lien de la cagnotte, clique sur « Participer », choisis un montant, remplis tes informations et valide le paiement via Wave, Orange Money, Free Money ou carte bancaire.",
      },
      {
        q: "Puis-je rester anonyme ?",
        a: "Oui. Sur le formulaire de participation, coche la case « Participer anonymement » et ton nom sera remplacé par « Anonyme » sur la page publique. Le créateur ne verra pas ton nom non plus.",
      },
      {
        q: "Puis-je laisser un message privé au créateur ?",
        a: "Oui. Tu peux laisser un message visible par tous, ou cocher « Garder mon message privé » pour qu'il ne s'affiche pas publiquement — le créateur le verra tout de même.",
      },
      {
        q: "Je n'ai pas reçu de confirmation de paiement. Que faire ?",
        a: "Vérifie tes spams. Si tu ne retrouves rien sous 15 minutes, vérifie ton historique Wave/Orange/Free Money. Si le paiement a été débité, contacte contact@cagnottes.sn avec la référence de la transaction.",
      },
      {
        q: "Puis-je modifier ou annuler ma participation ?",
        a: "Une fois la participation validée, elle ne peut pas être annulée automatiquement. Pour une demande exceptionnelle, contacte notre support dans les 48h suivant le paiement.",
      },
      {
        q: "Comment retrouver les cagnottes auxquelles j'ai participé ?",
        a: "Si tu as utilisé la même adresse email à chaque participation, connecte-toi et rends-toi sur la page « Mes participations » — toutes tes contributions y apparaissent.",
      },
      {
        q: "Puis-je recevoir un justificatif de ma participation ?",
        a: "Oui. Un email de confirmation est envoyé automatiquement après chaque paiement. Conserve-le comme justificatif — tu peux le transférer si nécessaire.",
      },
    ],
  },
  {
    id: "utiliser-argent",
    label: "Utiliser l'argent de la cagnotte",
    items: [
      {
        q: "Comment retirer l'argent de ma cagnotte ?",
        a: "Depuis le tableau de bord, clique sur « Retirer les fonds ». Choisis ton opérateur (Wave, Orange Money, Free Money ou virement bancaire), confirme le montant et valide avec ton code PIN. Les fonds arrivent généralement sous 24h.",
      },
      {
        q: "Ai-je besoin de vérifier mon identité avant de retirer ?",
        a: "Oui. La vérification d'identité (KYC) est obligatoire avant tout retrait. Rends-toi sur Profil → Vérification d'identité et téléverse une pièce d'identité recto/verso. La validation prend moins de 24h en général.",
      },
      {
        q: "Qu'est-ce que le code PIN de retrait ?",
        a: "Le code PIN est un code à 4 chiffres que tu choisis lors de ton premier retrait. Il te sera demandé à chaque retrait pour sécuriser tes fonds. Tu peux le réinitialiser depuis Profil si tu l'oublies.",
      },
      {
        q: "Puis-je retirer avant la fin de la cagnotte ?",
        a: "Oui, tu peux retirer les fonds disponibles à tout moment, même avant la date de fin. Les nouvelles contributions s'ajouteront au solde retirable.",
      },
      {
        q: "Quel est le montant minimum de retrait ?",
        a: "Le montant minimum dépend de l'opérateur choisi. Pour Wave, Orange Money et Free Money, le minimum est généralement de 1 000 FCFA. Pour un virement bancaire, le minimum est de 5 000 FCFA.",
      },
      {
        q: "Comment offrir la cagnotte à un bénéficiaire tiers ?",
        a: "Lors d'une cagnotte solidaire créée au profit d'un proche ou d'une association, tu peux transférer les fonds en renseignant leurs coordonnées Mobile Money ou bancaires au moment du retrait.",
      },
      {
        q: "Quelle commission cagnotte.sn prélève-t-elle ?",
        a: "6% pour les cagnottes solidaires, 8% pour les cagnottes festives. La commission est toujours affichée au donateur avant le paiement et déduite automatiquement du montant collecté. Zéro frais caché.",
      },
    ],
  },
  {
    id: "tarifs",
    label: "Tarifs",
    items: [
      {
        q: "Combien coûte la création d'une cagnotte ?",
        a: "La création d'une cagnotte sur cagnotte.sn est gratuite. Aucun frais à l'inscription, aucun frais mensuel, aucun frais de mise en ligne.",
      },
      {
        q: "Quels sont les frais appliqués sur les contributions ?",
        a: "6% pour les cagnottes solidaires, 8% pour les cagnottes festives. Ces frais couvrent les coûts de paiement (Wave, Orange Money, Free Money, carte bancaire), l'hébergement et le support client.",
      },
      {
        q: "Y a-t-il des frais sur les retraits ?",
        a: "Les retraits vers Wave, Orange Money ou Free Money n'ont pas de frais supplémentaires de notre côté. Seuls les frais habituels de ton opérateur peuvent s'appliquer. Les virements bancaires peuvent engendrer des frais bancaires selon ton établissement.",
      },
      {
        q: "Les donateurs paient-ils des frais ?",
        a: "Non, aucun frais n'est ajouté au donateur. Le montant affiché est le montant payé — les frais sont prélevés sur la somme collectée côté créateur.",
      },
    ],
  },
  {
    id: "technique",
    label: "Problèmes techniques",
    items: [
      {
        q: "Mon paiement a échoué. Que faire ?",
        a: "Vérifie ton solde Mobile Money ou ton plafond de carte bancaire. Si le problème persiste, essaie un autre moyen de paiement ou réessaye dans quelques minutes. Si un débit apparaît malgré l'échec, contacte contact@cagnottes.sn avec la référence de la transaction.",
      },
      {
        q: "L'image de ma cagnotte ne s'affiche pas.",
        a: "Vérifie que l'image fait moins de 5 Mo et qu'elle est au format JPG, PNG ou WebP. Si le problème persiste, essaie de la recharger depuis la page « Modifier » de ta cagnotte.",
      },
      {
        q: "Je reçois une erreur en créant ma cagnotte.",
        a: "Vérifie que tous les champs obligatoires sont remplis, que l'objectif est supérieur à 1 000 FCFA, et que ton image respecte les contraintes. Rafraîchis la page si nécessaire. Sinon, contacte notre support.",
      },
      {
        q: "Le site est lent ou ne charge pas.",
        a: "Essaie de rafraîchir la page ou de passer en mode navigation privée. Si le problème persiste sur plusieurs navigateurs ou appareils, signale-le à contact@cagnottes.sn en précisant ton appareil et navigateur.",
      },
      {
        q: "Je n'arrive pas à me connecter depuis TikTok, Instagram ou Facebook.",
        a: "Les navigateurs intégrés de ces applications posent parfois problème avec les paiements Mobile Money. Ouvre le lien dans Safari (iPhone) ou Chrome (Android) pour éviter ces limitations.",
      },
    ],
  },
] as const;
