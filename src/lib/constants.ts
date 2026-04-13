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

// ─────────────────────────────────────────────────────────────────────────
// Phase 5 plan 05-01 — public auth labels
// ─────────────────────────────────────────────────────────────────────────

// ── /inscription + /connexion (Banani screens 3, 4, 5) ──
export const AUTH_LABELS = {
  // Signup
  signupTitle: "Créer ma cagnotte",
  signupSubtitle:
    "Crée ton compte en quelques secondes pour lancer ta collecte.",
  firstNameLabel: "Prénom",
  firstNamePlaceholder: "Amadou",
  lastNameLabel: "Nom",
  lastNamePlaceholder: "Fall",
  emailLabel: "Adresse e-mail",
  emailPlaceholder: "exemple@email.com",
  passwordLabel: "Mot de passe",
  passwordPlaceholder: "••••••••",
  passwordHint: "8 caractères minimum, dont un chiffre et une majuscule.",
  slugPreviewLabel: "Ton espace sera",
  slugPreviewPlaceholder: "ton-prenom-nom",
  tosLabel:
    "J'accepte les conditions générales d'utilisation de Cagnottes.sn",
  tosError: "Tu dois accepter les conditions pour continuer.",
  signupCta: "Créer mon compte",
  signupLoading: "Création du compte…",
  alreadyAccount: "Vous avez déjà un compte ? Se connecter",
  // Login
  loginTitle: "Bon retour !",
  loginSubtitle:
    "Connecte-toi pour gérer tes cagnottes et suivre tes participations.",
  loginCta: "Se connecter",
  loginLoading: "Connexion…",
  forgotPasswordCta: "Oublié ?",
  noAccountYet: "Pas encore de compte ? S'inscrire",
  // Shared
  orContinueWith: "ou continuer avec",
  socialGoogleLabel: "Google",
  socialAppleLabel: "Apple",
  // Errors
  errorGeneric: "Une erreur est survenue. Réessaye.",
  errorEmailTaken: "Cet email est déjà utilisé.",
  errorSlugTaken: "Ce nom d'espace est déjà pris.",
  errorInvalidCredentials: "E-mail ou mot de passe incorrect.",
  errorEmailUnverified:
    "Email non vérifié — un nouveau code vient d'être envoyé.",
  errorRateLimit: "Trop de tentatives. Réessaye dans quelques minutes.",
  errorDisplayNameTooShort: "Prénom et nom requis (minimum 2 caractères).",
  errorSlugUnavailable:
    "Aucun nom d'espace disponible — essaie un autre prénom/nom.",
  // Toasts
  toastVerifiedPleaseLogin: "Email vérifié — connecte-toi pour continuer.",
  toastPasswordReset: "Mot de passe réinitialisé — connecte-toi.",
} as const;

// ── /verification-email (gap screen, we design) ──
export const VERIFY_EMAIL_LABELS = {
  title: "Vérifie ton email",
  subtitlePrefix: "Un code à 6 chiffres a été envoyé à ",
  subtitleSuffix: ". Entre-le ci-dessous pour activer ton compte.",
  codeLabel: "Code à 6 chiffres",
  verifyCta: "Vérifier",
  verifyLoading: "Vérification…",
  resendCta: "Renvoyer le code",
  resendCooldown: "Renvoyer dans {s}s",
  resendSuccessToast: "Nouveau code envoyé.",
  backToSignup: "Revenir à l'inscription",
  errorInvalid: "Code invalide. Vérifie et réessaye.",
  errorExpired: "Code expiré. Demande un nouveau code.",
  errorRateLimit: "Trop de tentatives — patiente 15 minutes.",
  missingEmailRedirect: "Email manquant — redirection…",
} as const;

// ── /mot-de-passe-oublie (gap screen, we design) ──
export const FORGOT_PASSWORD_LABELS = {
  title: "Mot de passe oublié ?",
  subtitle:
    "Entre ton email et nous t'enverrons un code à 6 chiffres pour réinitialiser ton mot de passe.",
  emailLabel: "Adresse e-mail",
  emailPlaceholder: "exemple@email.com",
  submitCta: "Envoyer le code",
  submitLoading: "Envoi en cours…",
  successTitle: "Vérifie ton email",
  successBody:
    "Si cet email est enregistré, tu recevras un code à 6 chiffres. Utilise-le pour définir un nouveau mot de passe.",
  enterCodeCta: "Entrer le code",
  backToLoginCta: "Retour à la connexion",
  errorGeneric: "Impossible d'envoyer le code. Réessaye.",
} as const;

// ── /mot-de-passe-reinitialiser (gap screen, we design) ──
export const RESET_PASSWORD_LABELS = {
  title: "Nouveau mot de passe",
  subtitlePrefix: "Entre le code reçu à ",
  subtitleSuffix: " et choisis un nouveau mot de passe.",
  codeLabel: "Code à 6 chiffres",
  newPasswordLabel: "Nouveau mot de passe",
  newPasswordPlaceholder: "••••••••",
  newPasswordHint: "8 caractères minimum, dont un chiffre et une majuscule.",
  confirmPasswordLabel: "Confirmer le mot de passe",
  confirmPasswordPlaceholder: "••••••••",
  submitCta: "Réinitialiser",
  submitLoading: "Mise à jour…",
  successToast: "Mot de passe mis à jour — connecte-toi.",
  errorMismatch: "Les mots de passe ne correspondent pas.",
  errorInvalid: "Code invalide ou expiré.",
  errorTooShort: "Minimum 8 caractères.",
  backToLoginCta: "Retour à la connexion",
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
