// ── Labels réutilisables pour le dashboard ──

export const ORDER_TYPE_LABELS: Record<string, string> = {
  SALE: "Vente",
  BOOKING: "Réservation",
  PAYMENT: "Paiement",
  DONATION: "Don",
  COMMUNITY: "Communauté",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: "Payé",
  PENDING: "En attente",
  FAILED: "Échoué",
  REFUNDED: "Remboursé",
  EXPIRED: "Expiré",
};

export const STATUS_VARIANTS: Record<string, "success" | "warning" | "error" | "default"> = {
  PAID: "success",
  PENDING: "warning",
  FAILED: "error",
  REFUNDED: "default",
  EXPIRED: "error",
};

export const PERIOD_OPTIONS = [
  { label: "7 jours", value: "7" },
  { label: "14 jours", value: "14" },
  { label: "Ce mois", value: "30" },
] as const;

export const OPERATOR_LABELS: Record<string, string> = {
  wave_money: "Wave",
  orange_money: "Orange Money",
  maxit: "Maxit",
  card: "Carte bancaire",
};

// ── Navigation labels ──
export const NAV_LABELS = {
  accueil: "Accueil",
  cagnottes: "Cagnottes",
  comment: "Comment ça marche",
  apropos: "À propos",
  connexion: "Connexion",
  inscription: "Inscription",
  creerCagnotte: "Créer ma cagnotte",
  tableauBord: "Tableau de bord",
  mesContributions: "Mes participations",
  notifications: "Notifications",
  profil: "Mon profil",
  seDeconnecter: "Se déconnecter",
} as const;

// ── Action labels ──
export const ACTIONS = {
  participer: "Je participe",
  partager: "Partager",
  copier: "Copier le lien",
  copie: "Lien copié !",
  modifier: "Modifier",
  supprimer: "Supprimer",
  annuler: "Annuler",
  confirmer: "Confirmer",
  enregistrer: "Enregistrer",
  continuer: "Continuer",
  retour: "Retour",
  voirPlus: "Voir plus",
  voirTout: "Voir tout",
  telecharger: "Télécharger",
  envoyer: "Envoyer",
} as const;

// ── Form labels ──
export const FORM_LABELS = {
  prenom: "Prénom",
  nom: "Nom",
  email: "Email",
  telephone: "Téléphone",
  motDePasse: "Mot de passe",
  confirmerMotDePasse: "Confirmer le mot de passe",
  titre: "Titre",
  description: "Description",
  montant: "Montant",
  montantObjectif: "Montant à collecter",
  dateFin: "Date de fin",
  occasion: "Occasion",
  cause: "Cause",
  beneficiaire: "Bénéficiaire",
  message: "Message",
  messagePrive: "Garder mon message privé",
  donAnonyme: "Faire un don anonyme",
  acceptTOS: "J'accepte les conditions générales",
} as const;

// ── Validation messages ──
export const VALIDATION = {
  requis: "Ce champ est obligatoire",
  emailInvalide: "Email invalide",
  telephoneInvalide: "Numéro de téléphone invalide",
  motDePasseCourt: "Minimum 8 caractères",
  montantInvalide: "Montant invalide",
  montantMinimum: "Minimum 500 FCFA",
  dateInvalide: "Date invalide",
} as const;

// ── Empty states ──
export const EMPTY_STATES = {
  aucuneCagnotte: "Aucune cagnotte pour le moment",
  aucuneParticipation: "Vous n'avez pas encore participé à une cagnotte",
  aucuneNotification: "Aucune notification",
  aucunResultat: "Aucun résultat",
} as const;

// ── Error states ──
export const ERRORS = {
  generique: "Une erreur est survenue. Réessayez.",
  reseau: "Erreur de connexion au serveur",
  nonAutorise: "Session expirée. Connectez-vous à nouveau.",
  tropDeRequetes: "Trop de requêtes. Patientez quelques minutes.",
} as const;

// ── Fundraiser subtype labels ──
export const SUBTYPE_LABELS = {
  festive: "Festive",
  solidaire: "Solidaire",
} as const;

// ── Occasions (for Select / RadioCard) ──
export const OCCASIONS = [
  "Anniversaire",
  "Mariage",
  "Pot de départ",
  "Cadeau commun",
  "Naissance",
  "Voyage",
] as const;

// ── Causes (for Select / RadioCard) ──
export const CAUSES = [
  "Santé",
  "Éducation",
  "Projet solidaire",
  "Urgence",
  "Animaux",
] as const;

// ── Beneficiaires ──
export const BENEFICIAIRES = [
  { value: "self", label: "Moi-même" },
  { value: "relative", label: "Un proche" },
  { value: "association", label: "Une association" },
] as const;

// ── Notification type labels — matches the 9 backend NotificationType enum values ──
export const NOTIF_LABELS: Record<string, string> = {
  DONATION_RECEIVED: "Nouveau don reçu",
  DONATION_MESSAGE: "Nouveau message",
  MILESTONE_REACHED: "Objectif en vue",
  CAGNOTTE_ENDING_SOON: "Votre cagnotte se termine bientôt",
  CAGNOTTE_ENDED: "Cagnotte terminée",
  PAYOUT_COMPLETED: "Retrait effectué",
  PAYOUT_FAILED: "Retrait échoué",
  KYC_APPROVED: "Identité vérifiée",
  KYC_REJECTED: "Vérification refusée",
  SYSTEM: "Système",
};

// ── Commission transparency labels ──
export const COMMISSION_LABELS = {
  festiveLabel: "8% de commission pour les cagnottes festives",
  solidaireLabel: "6% de commission pour les cagnottes solidaires",
  transparencyNote: "Commission prélevée sur le total collecté",
} as const;

// ── Misc ──
export const MISC = {
  devise: "FCFA",
  prefixTelephone: "+221",
  siteName: "Cagnottes.sn",
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Phase 4 plan 04-01 — public donor revenue path labels
// All French strings. No hardcoded copy in JSX — import from here.
// ─────────────────────────────────────────────────────────────────────────

// ── Home (screen 1) ──
export const HOME_COPY = {
  heroTitle: "Crée ta cagnotte, partage, collecte.",
  heroSubtitle:
    "La plateforme sénégalaise pour lever des fonds entre amis, en famille ou pour une cause. Wave, Orange Money, Free Money, carte bancaire.",
  heroCtaCreate: "Créer ma cagnotte",
  heroCtaDiscover: "Découvrir les cagnottes",
  featuredTitle: "Les cagnottes du moment",
  featuredSubtitle: "Soutiens une initiative près de chez toi.",
  featuredEmpty: "Aucune cagnotte publiée pour le moment.",
  featuredEmptyCta: "Sois le premier à créer une cagnotte",
  featuredViewAllCta: "Voir toutes les cagnottes",
  featuresTitle: "Pourquoi Cagnottes.sn",
  featuresList: [
    {
      title: "Commission transparente",
      body: "6% pour les causes solidaires, 8% pour les cagnottes festives. Tout est affiché avant le paiement.",
    },
    {
      title: "Mobile money d'abord",
      body: "Wave, Orange Money, Free Money. Tes contributeurs paient en deux taps.",
    },
    {
      title: "Paiements sécurisés",
      body: "Paiements traités par notre partenaire Bictorys. Tes fonds sont protégés.",
    },
  ],
  trustTitle: "Ils nous font confiance",
  faqTitle: "Questions fréquentes",
  faqItems: [
    {
      q: "Comment récupérer les fonds collectés ?",
      a: "Une fois ton identité vérifiée, tu peux demander un retrait vers ton Wave, Orange Money, Free Money ou ton compte bancaire. Le transfert arrive sous 24 à 72 heures selon l'opérateur.",
    },
    {
      q: "Quelle commission prélève Cagnottes.sn ?",
      a: "6% pour les cagnottes solidaires (santé, éducation, urgence) et 8% pour les cagnottes festives (mariage, anniversaire, cadeau commun). La commission est affichée au donateur avant le paiement.",
    },
    {
      q: "Mes donateurs peuvent-ils rester anonymes ?",
      a: "Oui. Chaque donateur peut cocher une case pour masquer son nom. Son message reste visible sauf s'il choisit aussi de le rendre privé.",
    },
    {
      q: "Combien de temps dure une cagnotte ?",
      a: "Tu choisis la date de fin à la création. Après cette date, la cagnotte n'accepte plus de contributions mais reste visible pour tes donateurs.",
    },
  ],
} as const;

// ── /c/[slug]/participer (screen 23) ──
export const PARTICIPER_LABELS = {
  pageTitle: "Je participe",
  stepAmount: "Ton montant",
  stepInfo: "Tes informations",
  stepMessage: "Ton message",
  suggestedAmounts: [1000, 2500, 5000, 10000, 25000] as readonly number[],
  customAmountLabel: "Autre montant (FCFA)",
  customAmountPlaceholder: "Ex : 7 500",
  firstNameLabel: "Prénom",
  lastNameLabel: "Nom",
  emailLabel: "Email (facultatif)",
  phoneLabel: "Téléphone",
  phonePlaceholder: "+221 77 XXX XX XX",
  messageLabel: "Message au créateur (facultatif)",
  messagePlaceholder: "Ajoute un mot d'encouragement…",
  anonymousLabel: "Faire un don anonyme",
  anonymousHelp: "Ton nom ne sera pas affiché sur la page publique.",
  privateMessageLabel: "Message privé",
  privateMessageHelp: "Seul le créateur pourra lire ton message.",
  tosLabel: "J'accepte les conditions générales d'utilisation",
  submitCta: "Continuer vers le paiement",
  errorAmountMin: "Le montant minimum est 500 FCFA",
  errorAmountMax: "Le montant maximum est 10 000 000 FCFA",
  errorFirstNameRequired: "Prénom requis",
  errorLastNameRequired: "Nom requis",
  errorPhoneRequired: "Téléphone requis",
  errorMessageTooLong: "Message trop long (max 500 caractères)",
  errorTosRequired: "Vous devez accepter les conditions",
} as const;

// ── /c/[slug]/paiement (screen 24) ──
export const PAIEMENT_LABELS = {
  pageTitle: "Mode de paiement",
  pageSubtitle: "Choisis ton moyen de paiement pour continuer.",
  methodWave: "Wave",
  methodOrange: "Orange Money",
  methodFree: "Free Money",
  methodCard: "Carte bancaire",
  payWithPrefix: "Payer avec",
  processingLabel: "Traitement…",
  errorRateLimit: "Trop de tentatives, réessaye dans 1 minute.",
  errorCircuitBreaker: "Paiement temporairement indisponible. Réessaye dans 1 minute.",
  errorGeneric: "Erreur lors de la création de l'ordre. Réessaye.",
  errorMissingSession:
    "Informations de contribution introuvables. Reprends depuis le début.",
} as const;

// ── /c/[slug]/merci ──
export const MERCI_LABELS = {
  headingPending: "Paiement en cours…",
  headingPaid: "Merci pour ta contribution !",
  headingFailed: "Paiement non abouti",
  headingTimeout: "Vérification en cours",
  amountPrefix: "Ton don de",
  thankYouFallback: "Merci de faire avancer cette cagnotte.",
  shareCtaTitle: "Partage cette cagnotte",
  shareCtaText:
    "Aide à faire avancer cette cagnotte en la partageant autour de toi.",
  viewCagnotteCta: "Voir la cagnotte",
  retryPaymentCta: "Réessayer le paiement",
  manualRetryCta: "Vérifier à nouveau",
  backCta: "Retour à la cagnotte",
} as const;

// ── In-app browser helpers (TikTok / IG / FB WebViews) ──
export const IN_APP_LABELS = {
  tiktokHelp:
    "Ce navigateur ne peut pas ouvrir Wave directement. Utilise le bouton ci-dessous pour continuer dans Safari ou Chrome.",
  tiktokButton: "Ouvrir dans Safari / Chrome",
  metaHelp:
    "Le paiement s'ouvre dans un nouvel onglet pour compléter ta contribution.",
  metaButton: "Ouvrir Wave",
  copyFallback: "Copier le lien de paiement",
  copiedToast: "Lien copié dans le presse-papiers",
} as const;

// ── All-cagnottes page labels ──
export const ALL_CAGNOTTES_LABELS = {
  pageTitle: "Toutes les cagnottes",
  pageSubtitle: "Découvre et soutiens les cagnottes publiées sur Cagnottes.sn.",
  filterAll: "Toutes",
  filterFestive: "Festives",
  filterSolidaire: "Solidaires",
  loadMoreCta: "Charger plus",
  loadingLabel: "Chargement…",
  emptyTitle: "Aucune cagnotte ne correspond",
  emptyBody: "Essaye un autre filtre ou reviens plus tard.",
  emptyResetCta: "Réinitialiser le filtre",
} as const;
