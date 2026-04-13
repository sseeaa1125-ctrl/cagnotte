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
  retirerMesFonds: "Retirer mes fonds",
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
// Phase 7 plan 07-01 — lowercase two-tone wordmark.
// `brandMark` + `brandSuffix` are the two halves used by the navbar JSX.
// `siteName` is the full lowercase form kept for OG/meta/aria contexts.
// Legal / marketing prose in FAQ, footer, etc. may still reference the
// title-case brand name "Cagnottes.sn" intentionally.
export const MISC = {
  devise: "FCFA",
  prefixTelephone: "+221",
  siteName: "cagnotte.sn",
  brandMark: "cagnotte",
  brandSuffix: ".sn",
} as const;

// ── Phase 7 plan 07-01 — Creator cagnotte detail page (verbatim Banani FR) ──
export const CREATOR_DETAIL_LABELS = {
  statusOnline: "En ligne",
  subtypeFestive: "Cagnotte Festive",
  subtypeSolidaire: "Cagnotte Solidaire",
  kpiCollected: "Montant récolté",
  kpiParticipants: "Participations",
  kpiAvailableFunds: "Fonds disponibles",
  withdrawCta: "Retirer les fonds",
  withdrawHelper:
    "Transférez ce montant sur votre compte Mobile Money en quelques clics.",
  recentParticipations: "Participations récentes",
  viewAllParticipations: "Voir toutes",
  shareLinkTitle: "Lien de la cagnotte",
  visibilityTitle: "Visibilité",
  dangerZoneTitle: "Zone de danger",
  closeCagnotte: "Clôturer la cagnotte",
  manageCta: "Gérer",
  shareCta: "Partager",
  backToDashboard: "Retour à mes cagnottes",
  emptyParticipations: "Aucune participation pour l'instant.",
  visibilityPublic: "Publique",
  visibilityPrivate: "Privée",
  visibilityEditCta: "Modifier",
  dangerZoneHelper:
    "Clôturer la cagnotte empêchera de nouvelles participations. Cette action est réversible.",
  copyLinkCta: "Copier",
  copyLinkSuccess: "Copié !",
  anonymousDonor: "Anonyme",
  kycNotApprovedNote:
    "Vérifiez votre identité pour activer les retraits.",
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
  featuresTitle: "Pourquoi cagnotte.sn",
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
      q: "Quelle commission prélève cagnotte.sn ?",
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
  // Phase 7 plan 07-03 — PLSH-08. Banani participation-success reference.
  thankYouMessageEyebrow: "Un mot de l'organisateur",
  confirmationCodeLabel: "Code de confirmation",
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
    "J'accepte les conditions générales d'utilisation de cagnotte.sn",
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

// ─────────────────────────────────────────────────────────────────────────
// Phase 5 plan 05-02 — creator flow labels (dashboard, picker, wizards, success)
// ─────────────────────────────────────────────────────────────────────────

// ── /tableau-de-bord (Banani screens 6 + 7) ──
export const DASHBOARD_LABELS = {
  title: "Tableau de bord",
  welcomeBack: "Bon retour, {name}",
  kpiTotalRaised: "Total collecté",
  kpiDonorCount: "Participations",
  kpiCampaignCount: "Cagnottes actives",
  recentCagnottes: "Mes cagnottes récentes",
  seeAllLink: "Voir tout",
  createCta: "Créer une cagnotte",
  emptyTitle: "Lance ta première cagnotte",
  emptyBody:
    "Crée une cagnotte en quelques clics et commence à récolter auprès de tes proches.",
  emptyCta: "Créer ma première cagnotte",
  sellerUrlLabel: "Ton espace public",
} as const;

// ── /tableau-de-bord/nouvelle (Banani screen 8) ──
export const CREATE_PICKER_LABELS = {
  title: "Créer la cagnotte de votre choix",
  subtitle: "Choisissez le type de cagnotte qui correspond à votre projet.",
  festiveTitle: "Festive",
  festiveDescription:
    "Cadeau commun, anniversaire, pot de départ, mariage, naissance, voyage…",
  solidaireTitle: "Solidaire",
  solidaireDescription:
    "Appel aux dons, aider un proche ou une association, soutenir un projet, obsèques…",
  cancelCta: "Retour au tableau de bord",
  trustBadgeSecure: "100% sécurisé",
  trustBadgeEasy: "Collecte facilitée",
} as const;

// ── Wizard shared labels (festive + solidaire, 3 steps) ──
export const WIZARD_LABELS = {
  festiveBadge: "🪩 Cagnotte Festive",
  solidaireBadge: "❤️ Cagnotte Solidaire",
  backCta: "Retour",
  continueCta: "Étape suivante",
  publishCta: "Publier ma cagnotte",
  publishing: "Publication en cours…",
  step1Of3: "Étape 1 sur 3",
  step2Of3: "Étape 2 sur 3",
  step3Of3: "Étape 3 sur 3",
  step1TitleFestive: "Commençons par les bases",
  step1SubtitleFestive:
    "Donnez un nom à votre cagnotte et précisez l'occasion.",
  step1TitleSolidaire: "Commençons par les bases",
  step1SubtitleSolidaire:
    "Donnez un nom à votre projet solidaire et précisez la cause.",
  step2TitleFestive: "Personnalisez votre cagnotte",
  step2SubtitleFestive:
    "Ajoutez une image et un petit mot pour donner envie de participer.",
  step2TitleSolidaire: "Personnalisez votre projet",
  step2SubtitleSolidaire:
    "Ajoutez une image et expliquez pourquoi vous collectez des fonds.",
  step3Title: "Paramètres et visibilité",
  step3SubtitleFestive:
    "Dernière étape ! Configurez les options de votre cagnotte.",
  step3SubtitleSolidaire:
    "Dernière étape ! Configurez les options de votre collecte.",
} as const;

// ── Wizard field labels (shared festive + solidaire) ──
export const WIZARD_FIELDS = {
  titleLabel: "Nom de la cagnotte",
  titlePlaceholderFestive: "Ex : Pour les 30 ans de Thomas",
  titlePlaceholderSolidaire: "Ex : Soutien pour le jardin partagé",
  titleHelp: "Un titre clair donne plus envie de participer.",
  occasionLabel: "Occasion",
  occasionPlaceholder: "Sélectionnez une occasion…",
  occasionOptions: {
    anniversaire: "Anniversaire",
    pot_de_depart: "Pot de départ",
    cadeau_commun: "Cadeau commun",
    mariage_pacs: "Mariage / PACS",
    naissance: "Naissance",
    voyage: "Voyage",
    autre: "Autre",
  } as Record<string, string>,
  causeLabel: "Cause soutenue",
  causePlaceholder: "Sélectionnez une cause…",
  causeOptions: {
    sante_medical: "Santé & Médical",
    education: "Éducation",
    projet_solidaire: "Projet solidaire",
    urgence: "Urgence",
    animaux: "Animaux",
    autre: "Autre",
  } as Record<string, string>,
  beneficiaryLabel: "Pour qui collectez-vous ?",
  beneficiaryOptions: {
    moi_meme: "Moi-même",
    un_proche: "Un proche",
    une_association: "Une association",
  } as Record<string, string>,
  goalAmountLabel: "Montant à atteindre",
  goalAmountPlaceholder: "100000",
  goalAmountHelp: "En FCFA. Minimum 1 000.",
  coverLabel: "Photo de couverture",
  coverHelp: "Une belle photo augmente considérablement les dons.",
  coverUploadError: "Impossible d'envoyer l'image. Réessaye.",
  descriptionLabelFestive: "Un petit mot pour les participants",
  descriptionPlaceholderFestive:
    "Expliquez en quelques mots pourquoi vous organisez cette cagnotte et à quoi servira l'argent récolté…",
  descriptionLabelSolidaire: "Description du projet",
  descriptionPlaceholderSolidaire:
    "Expliquez l'histoire de votre projet, à quoi serviront les fonds et pourquoi chaque don compte…",
  thankYouMessageLabel: "Message de remerciement (facultatif)",
  thankYouMessagePlaceholder:
    "Merci du fond du cœur pour ta contribution !",
  endDateLabel: "Date de fin",
  endDateOptional: "Optionnel",
  endDateHelpFestive:
    "Vous pouvez toujours modifier ou clôturer la cagnotte plus tôt.",
  endDateHelpSolidaire:
    "Laissez vide si votre collecte est à durée indéterminée.",
  visibilityLabel: "Visibilité de la cagnotte",
  visibilityPublic: "Publique",
  visibilityPublicHelper:
    "Votre cagnotte sera visible par tous et apparaîtra dans les résultats de recherche de cagnotte.sn.",
  visibilityPrivate: "Privée",
  visibilityPrivateHelper:
    "Votre cagnotte ne sera pas listée sur le site. Seules les personnes avec qui vous partagez le lien pourront y accéder.",
  hideAmountLabel: "Cacher le montant récolté",
  hideAmountHelp: "Les visiteurs ne verront pas la somme totale collectée.",
  hideDonorsLabel: "Cacher les noms des participants",
  hideDonorsHelp:
    "Seul vous, l'organisateur, pourrez voir qui a donné.",
  tosLabelFestive:
    "J'accepte les Conditions Générales d'Utilisation.",
  tosLabelSolidaire:
    "J'accepte les Conditions Générales d'Utilisation et je confirme que les fonds récoltés seront utilisés pour la cause décrite.",
  tosError: "Vous devez accepter les conditions pour continuer.",
  errorTitleRequired: "Un titre est requis.",
  errorOccasionRequired: "Une occasion est requise.",
  errorCauseRequired: "Une cause est requise.",
  errorBeneficiaryRequired: "Un bénéficiaire est requis.",
  errorGoalMin: "Le montant à atteindre doit être d'au moins 1 000 FCFA.",
  errorDescriptionMin:
    "La description doit contenir au moins 20 caractères.",
  errorGeneric: "Impossible de publier la cagnotte. Réessaye.",
  errorMissingStep1:
    "Les informations de la première étape sont manquantes. Retour à l'étape 1…",
} as const;

// ── /tableau-de-bord/nouvelle/succes (Banani screen 15) ──
export const SUCCESS_LABELS = {
  title: "Ta cagnotte est publiée !",
  subtitle:
    "Partage-la avec tes proches pour commencer à récolter des fonds.",
  previewLabel: "Aperçu",
  shareableUrlLabel: "Lien de la cagnotte",
  copyCta: "Copier",
  copiedToast: "Lien copié !",
  shareCta: "Partager",
  backToDashboardCta: "Retour au tableau de bord",
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-01 — authed money screens (profile, prefs, participations,
// notifications feed). All French. Banani screens 16 / 17 / 19 / 20.
// ─────────────────────────────────────────────────────────────────────────

export const PROFILE_SIDEBAR = {
  tabProfile: "Informations personnelles",
  tabSecurity: "Sécurité & Mot de passe",
  tabBank: "Coordonnées bancaires",
  tabPreferences: "Préférences de notification",
  tabKyc: "Vérification d'identité",
  logout: "Se déconnecter",
  kycApproved: "Identité vérifiée",
  kycPending: "Vérification en cours",
  kycRejected: "Vérification refusée",
  kycNone: "Non vérifié",
  kycCta: "Vérifier mon identité",
} as const;

export const PROFILE_LABELS = {
  h1: "Mon profil",
  subtitle:
    "Gérez vos informations personnelles et vos paramètres de sécurité.",
  sectionTitle: "Informations personnelles",
  firstName: "Prénom",
  lastName: "Nom",
  email: "Adresse e-mail",
  emailHelper:
    "Pour modifier votre e-mail, veuillez contacter le support.",
  phone: "Numéro de téléphone",
  phonePlaceholder: "77 123 45 67",
  avatarHint: "JPG ou PNG, 5 Mo max.",
  save: "Enregistrer les modifications",
  saving: "Enregistrement…",
  saved: "Modifications enregistrées",
  errorGeneric: "Impossible d'enregistrer. Réessaye.",
  errorAvatar: "Impossible d'envoyer la photo. Réessaye.",
} as const;

export const NOTIF_PREFS_LABELS = {
  h1: "Préférences de notification",
  subtitle: "Choisissez ce que vous voulez recevoir.",
  group1: "Mes cagnottes",
  group2: "Mes participations",
  group3: "Communications Cagnotte.sn",
  newParticipation: {
    label: "Nouvelle participation",
    helper:
      "Être notifié lorsqu'une personne participe à ma cagnotte",
  },
  milestoneReached: {
    label: "Paliers atteints",
    helper:
      "M'informer lorsque je franchis des paliers (50%, 100%)",
  },
  endingSoonReminder: {
    label: "Rappels de fin de cagnotte",
    helper: "Me prévenir quelques jours avant la clôture",
  },
  organizerUpdates: {
    label: "Mises à jour des organisateurs",
    helper:
      "Recevoir des nouvelles des cagnottes que j'ai soutenues",
  },
  paymentReceipts: {
    label: "Reçus de paiement",
    helper:
      "Recevoir mes confirmations de participation par e-mail",
  },
  newsletter: {
    label: "Newsletter et offres",
    helper:
      "Découvrir nos nouveautés et les belles histoires solidaires",
  },
  savedPulse: "Enregistré",
  errorGeneric: "Impossible d'enregistrer",
} as const;

export const PARTICIPATIONS_LABELS = {
  h1: "Mes participations",
  subtitle:
    "Retrouvez toutes les cagnottes auxquelles vous avez contribué.",
  colCagnotte: "Cagnotte",
  colDate: "Date",
  colAmount: "Montant",
  colStatus: "Statut",
  colActions: "Actions",
  statusActive: "En cours",
  statusEnded: "Terminée",
  viewCagnotte: "Voir la cagnotte",
  loadMore: "Charger plus",
  loading: "Chargement…",
  empty: "Vous n'avez encore participé à aucune cagnotte.",
  emptyCta: "Découvrir les cagnottes",
} as const;

export const NOTIF_FEED_LABELS = {
  h1: "Vos notifications",
  subtitle: "Restez informé de l'activité de vos cagnottes.",
  markAllRead: "Tout marquer comme lu",
  tabAll: "Toutes",
  tabUnread: "Non lues",
  loadMore: "Voir les notifications plus anciennes",
  loading: "Chargement…",
  empty: "Aucune notification pour l'instant.",
} as const;

// ── All-cagnottes page labels ──
export const ALL_CAGNOTTES_LABELS = {
  pageTitle: "Toutes les cagnottes",
  pageSubtitle: "Découvre et soutiens les cagnottes publiées sur cagnotte.sn.",
  filterAll: "Toutes",
  filterFestive: "Festives",
  filterSolidaire: "Solidaires",
  loadMoreCta: "Charger plus",
  loadingLabel: "Chargement…",
  emptyTitle: "Aucune cagnotte ne correspond",
  emptyBody: "Essaye un autre filtre ou reviens plus tard.",
  emptyResetCta: "Réinitialiser le filtre",
} as const;

// ── Phase 6 plan 06-02 — money screens labels ──
// Shared across /profil/coordonnees-bancaires, /profil/securite, /profil/kyc,
// /retraits/**, /tableau-de-bord/cagnottes/[slug]/stats,
// /tableau-de-bord/cagnottes/[slug]/modifier.

export const BANK_LABELS = {
  h1: "Coordonnées bancaires",
  subtitle: "Choisissez le moyen de recevoir vos fonds.",
  providerLabel: "Moyen de paiement",
  providerWave: "Wave Sénégal",
  providerWaveHelper: "Transfert instantané sur votre compte Wave.",
  providerOrange: "Orange Money",
  providerOrangeHelper: "Transfert instantané sur votre compte Orange Money.",
  phoneLabel: "Numéro Mobile Money",
  phoneHelper: "Exemple : 77 123 45 67",
  nameLabel: "Nom du titulaire",
  nameHelper: "Tel qu'inscrit chez votre opérateur.",
  save: "Enregistrer",
  saving: "Enregistrement…",
  saved: "Coordonnées enregistrées",
  errorGeneric: "Impossible d'enregistrer, réessayez.",
  noFreeMoneyNotice:
    "Free Money n'est pas disponible pour les retraits pour le moment.",
  securityNoticeTitle: "Sécurité de vos coordonnées",
  securityNoticeBody:
    "Vos numéros Mobile Money sont stockés de manière sécurisée et ne servent qu'à vous verser les fonds récoltés.",
} as const;

export const SECURITY_LABELS = {
  h1: "Sécurité & Mot de passe",
  subtitle: "Protégez votre compte et vos retraits.",
  passwordSection: "Changer mon mot de passe",
  passwordDescription:
    "Choisissez un mot de passe d'au moins 8 caractères, différent de l'ancien.",
  currentPassword: "Mot de passe actuel",
  newPassword: "Nouveau mot de passe",
  confirmPassword: "Confirmer le nouveau mot de passe",
  passwordSave: "Mettre à jour le mot de passe",
  passwordSaving: "Mise à jour…",
  passwordSuccess: "Mot de passe mis à jour",
  passwordError: "Mot de passe actuel incorrect",
  passwordTooShort: "Minimum 8 caractères",
  passwordMismatch: "Les mots de passe ne correspondent pas",
  pinSection: "Code de retrait (4 chiffres)",
  pinDescription:
    "Ce code est demandé à chaque retrait de fonds. Il est distinct de votre mot de passe.",
  pinCurrent: "Code actuel",
  pinNew: "Nouveau code",
  pinConfirm: "Confirmer le code",
  pinSet: "Définir mon code",
  pinChange: "Changer mon code",
  pinSaving: "Enregistrement…",
  pinSuccess: "Code de retrait enregistré",
  pinError: "Code de retrait incorrect",
  pinMismatch: "Les codes ne correspondent pas",
  pinInvalid: "Le code doit contenir exactement 4 chiffres",
  pinAlreadySet: "Un code est actuellement défini.",
  pinNotSetYet: "Aucun code n'est défini pour le moment.",
} as const;

export const KYC_LABELS = {
  h1: "Vérification d'identité",
  subtitle:
    "Téléversez votre pièce d'identité pour activer les retraits de fonds.",
  fullNameLabel: "Nom complet sur la pièce",
  fullNameHelper: "Tel qu'il apparaît sur votre pièce d'identité.",
  idLabel: "Pièce d'identité (recto)",
  idHelper: "JPG ou PNG, 5 Mo maximum.",
  selfieLabel: "Selfie avec votre pièce",
  selfieHelper:
    "Tenez votre pièce à côté de votre visage, bien visible, sans reflets.",
  submit: "Soumettre pour vérification",
  submitting: "Envoi en cours…",
  uploadFailed: "L'envoi du fichier a échoué, réessayez.",
  missingFiles: "Veuillez téléverser les deux documents.",
  statusNone: "Non vérifié",
  statusPending: "En cours de vérification",
  statusApproved: "Identité vérifiée",
  statusRejected: "Vérification refusée",
  noneBanner:
    "Votre identité n'a pas encore été vérifiée. Téléversez votre pièce d'identité pour activer les retraits.",
  pendingBanner:
    "Vos documents sont en cours de vérification. Vous recevrez une notification dès qu'ils seront validés.",
  approvedBanner:
    "Votre identité a été vérifiée. Vous pouvez maintenant retirer vos fonds.",
  rejectedBanner:
    "La vérification a été refusée. Vous pouvez soumettre à nouveau votre pièce et un selfie.",
  approvedFullName: "Nom vérifié",
} as const;

export const WITHDRAWAL_LABELS = {
  h1: "Retirer mes fonds",
  subtitle:
    "Transférez l'argent récolté vers votre compte Mobile Money en toute sécurité.",
  balanceLabel: "Solde disponible",
  balanceHelper: "Toutes cagnottes confondues.",
  amountLabel: "Montant à retirer",
  amountMin: "Minimum 1 000 FCFA.",
  maxChip: "Max",
  maxHelper: "Vous retirez la totalité du solde disponible.",
  destLabel: "Où envoyer l'argent ?",
  phoneLabel: "Numéro Mobile Money",
  nameLabel: "Nom du titulaire",
  continue: "Continuer",
  back: "Retour",
  pinTitle: "Entrez votre code à 4 chiffres",
  pinHelper: "Ce code protège vos retraits.",
  pinForgot: "Code oublié ?",
  pinContinue: "Continuer",
  confirmTitle: "Confirmer le retrait",
  confirmSubtitle: "Vérifiez les informations avant de valider.",
  confirmAmount: "Montant retiré",
  confirmFees: "Frais de virement",
  confirmFeesFree: "Gratuit",
  confirmDelay: "Délai estimé",
  confirmDelayInstant: "Immédiat",
  confirmNet: "Vous allez recevoir",
  confirmCta: "Confirmer le retrait",
  confirmSubmitting: "Traitement en cours…",
  secured: "Transaction sécurisée",
  successH1: "Retrait en cours !",
  successBodyPrefix: "Votre demande de retrait de ",
  successBodySuffix: " a bien été prise en compte.",
  successToLabel: "Vers le compte",
  successDelayLabel: "Délai estimé",
  successDelayInstant: "Immédiat",
  successStatusLabel: "Statut",
  successStatusPending: "En cours de traitement",
  successInfoTitle: "Un SMS de confirmation arrive",
  successInfo:
    "Vous allez recevoir un SMS de confirmation de notre partenaire de paiement d'ici quelques minutes.",
  successBackToDashboard: "Aller au tableau de bord",
  successBackToCagnottes: "Voir mes cagnottes",
  kycBlockedTitle: "Vérifiez votre identité",
  kycBlockedBody:
    "Avant d'effectuer un retrait, nous devons vérifier votre identité.",
  kycBlockedCta: "Vérifier mon identité",
  pinMissingTitle: "Créez votre code de retrait",
  pinMissingBody:
    "Définissez un code à 4 chiffres dans les paramètres de sécurité pour protéger vos retraits.",
  pinMissingCta: "Définir mon code",
  blockedTitle: "Retraits temporairement indisponibles",
  blockedBody:
    "Nos équipes ont suspendu les retraits sur votre compte. Contactez le support pour plus d'informations.",
  insufficientBalance: "Solde insuffisant",
  rateLimited: "Trop de demandes. Réessayez dans quelques minutes.",
  circuitOpen:
    "Le service de paiement est momentanément indisponible. Réessayez dans quelques instants.",
  pinIncorrect: "Code de retrait incorrect",
  pinLocked: "Trop de tentatives. Votre code est temporairement bloqué.",
  draftExpired: "Votre demande a expiré, veuillez recommencer.",
  submitError: "Le retrait n'a pas pu être effectué. Réessayez.",
} as const;

export const STATS_LABELS = {
  h1: "Statistiques",
  subtitle: "Un résumé de l'activité de votre cagnotte.",
  kpiRaised: "Total collecté",
  kpiDonors: "Contributeurs",
  kpiAverage: "Don moyen",
  topMessages: "Messages marquants",
  topMessagesEmpty: "Aucun message public pour l'instant.",
  timeline: "Dons au fil du temps",
  timelineEmpty: "Aucune donnée à afficher pour l'instant.",
  backToDashboard: "Retour au tableau de bord",
  viewCagnotte: "Voir la cagnotte",
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Phase 7 plan 07-02 — Banani delta polish labels.
// Verbatim French strings extracted from the Banani wireframes in
// .planning/banani/screens/phase-7/. Used by the /retraits flow polish,
// /profil/coordonnees-bancaires rewrite, the lifted VisibilityCard
// primitive, and the DatePicker wrapper restyle.
// ─────────────────────────────────────────────────────────────────────────

export const WITHDRAW_LABELS = {
  pageTitle: "Retirer mes fonds",
  pageHelper:
    "Transférez l'argent récolté vers le compte de votre choix en toute sécurité.",
  step1Title: "Montant à retirer",
  step2Title: "Où envoyer l'argent ?",
  maxChip: "Max",
  maxHelper: "Vous retirez la totalité du solde disponible.",
  addAccountCta: "Ajouter un compte bancaire ou Mobile Money",
  summaryLabel: "RÉCAPITULATIF DU RETRAIT",
  summaryAmount: "Montant retiré",
  summaryFees: "Frais de virement",
  summaryFeesFree: "Gratuit",
  summaryDelay: "Délai estimé",
  summaryDelayInstant: "Immédiat",
  summaryNet: "Vous allez recevoir",
  confirmCta: "Confirmer le retrait",
  securedFooter: "Transaction sécurisée",
  instantBadge: "Instantané",
} as const;

export const WITHDRAW_PIN_LABELS = {
  pageTitle: "Vérification de sécurité",
  // Persistent PIN — NOT SMS OTP. No phone-masked text, no countdown.
  pageHelperPrefix: "Pour valider votre retrait de ",
  pageHelperSuffix:
    ", veuillez saisir votre code PIN à 4 chiffres.",
  submitCta: "Valider le retrait",
  cancelCta: "Annuler",
  pinError: "Code PIN incorrect.",
  pinForgot: "PIN oublié ?",
} as const;

export const WITHDRAW_SUCCESS_LABELS = {
  title: "Retrait confirmé !",
  helper: "Votre retrait sera traité dans les prochaines minutes.",
  backCta: "Retour au tableau de bord",
} as const;

export const BANK_ACCOUNTS_LABELS = {
  pageTitle: "Coordonnées bancaires",
  mobileMoneyTitle: "Comptes Mobile Money",
  mobileMoneyHelper:
    "Pour recevoir les fonds de vos cagnottes instantanément.",
  bankAccountsTitle: "Comptes Bancaires",
  bankAccountsHelper:
    "Pour les virements bancaires classiques (délai de 48h à 72h).",
  addAccountCta: "Ajouter",
  addBankCta: "Ajouter un compte bancaire",
  activeBadge: "Actif",
  deleteAriaLabel: "Supprimer",
  bankEmptyTitle: "Aucun compte bancaire",
  bankEmptyBody:
    "Ajoutez un RIB/IBAN pour virer l'argent de vos cagnottes directement sur votre compte bancaire.",
  mobileEmptyTitle: "Aucun compte Mobile Money configuré.",
  mobileEmptyBody:
    "Ajoutez un compte Wave ou Orange Money pour recevoir vos fonds instantanément.",
  securityNoticeTitle: "Sécurité de vos coordonnées",
  securityNoticeBody:
    "Vos coordonnées bancaires et numéros Mobile Money sont cryptés et stockés de manière sécurisée. Ils ne sont utilisés que pour procéder au virement des fonds récoltés sur vos cagnottes.",
} as const;

export const VISIBILITY_LABELS = {
  sectionLabel: "Visibilité de la cagnotte",
  publicTitle: "Publique",
  publicDescription:
    "Votre cagnotte sera visible par tous et apparaîtra dans les résultats de recherche de Cagnotte.sn.",
  privateTitle: "Privée",
  privateDescription:
    "Seules les personnes disposant du lien pourront voir la cagnotte et y participer. Elle n'apparaîtra pas dans les recherches. Idéal pour les événements personnels.",
} as const;

export const DATE_PICKER_LABELS = {
  placeholder: "Sélectionnez une date...",
} as const;

export const WIZARD_EXTRA_LABELS = {
  displayOptionsLegend: "Options d'affichage",
} as const;

// ── Phase 8 fixpack — /comment (how it works) stub ──
export const HOW_IT_WORKS_LABELS = {
  pageTitle: "Comment ça marche",
  pageSubtitle:
    "Trois étapes simples pour lever des fonds auprès de votre communauté au Sénégal.",
  steps: [
    {
      number: "1",
      title: "Créez votre cagnotte",
      body:
        "Inscrivez-vous en 2 minutes, choisissez un titre, un objectif et une photo. Festive ou solidaire : votre page est prête.",
    },
    {
      number: "2",
      title: "Partagez le lien",
      body:
        "Envoyez l'URL personnalisée (cagnotte.sn/<votre-page>) sur WhatsApp, les réseaux sociaux ou par SMS à vos proches.",
    },
    {
      number: "3",
      title: "Recevez les dons",
      body:
        "Vos contributeurs paient en Wave, Orange Money, Free Money ou par carte. Retirez les fonds directement sur votre Mobile Money.",
    },
  ],
  ctaTitle: "Prêt à commencer ?",
  ctaSubtitle: "Créez votre première cagnotte gratuitement.",
  ctaLabel: "Créer ma cagnotte",
} as const;

// ── Phase 8 fixpack — /a-propos (about) stub ──
export const ABOUT_LABELS = {
  pageTitle: "À propos de cagnotte.sn",
  paragraphs: [
    "Cagnotte.sn est la plateforme sénégalaise dédiée à la collecte de fonds en ligne. Nous croyons que chacun devrait pouvoir lever des fonds pour ses projets, que ce soit pour fêter un mariage, financer une opération médicale ou soutenir une cause solidaire.",
    "Conçue pour le Sénégal, notre plateforme accepte Wave, Orange Money, Free Money et les cartes bancaires. Aucun téléchargement, aucune application : un simple lien partageable suffit.",
    "Nous proposons deux types de cagnottes : festives (anniversaires, mariages, cadeaux communs) et solidaires (santé, urgence, projets communautaires). La commission est transparente : 8 % pour les cagnottes festives, 6 % pour les cagnottes solidaires — prélevée automatiquement sur le montant collecté.",
    "Notre mission est simple : rendre la collecte de fonds accessible à tous, en français, en FCFA, et avec les moyens de paiement que vous utilisez tous les jours.",
  ],
} as const;

export const EDIT_LABELS = {
  h1: "Modifier ma cagnotte",
  subtitle: "Mettez à jour le contenu sans changer l'URL.",
  urlSection: "URL de votre cagnotte",
  slugLocked: "L'URL de votre cagnotte ne peut pas être modifiée.",
  titleLabel: "Titre",
  descriptionLabel: "Description",
  coverLabel: "Image de couverture",
  coverHelper: "JPG ou PNG, 5 Mo maximum.",
  goalLabel: "Objectif (FCFA)",
  endDateLabel: "Date de fin",
  endDateHelper: "Laissez vide pour une cagnotte sans échéance.",
  // Phase 7 plan 07-03 — PLSH-08. Editable thank-you message.
  thankYouMessageLabel: "Message de remerciement (facultatif)",
  thankYouMessagePlaceholder:
    "Merci du fond du cœur pour ta contribution !",
  thankYouMessageHelper:
    "Affiché aux contributeurs après leur participation (500 caractères max).",
  suggestedAmountsLabel: "Montants suggérés (FCFA)",
  suggestedAmountsHelper:
    "Séparez par une virgule. 3 à 4 montants, minimum 500 FCFA.",
  hideAmount: "Masquer le montant collecté",
  hideAmountDescription: "Les contributeurs ne voient pas le total récolté.",
  hideDonors: "Masquer la liste des donateurs",
  hideDonorsDescription: "La liste des participants reste privée.",
  save: "Enregistrer les modifications",
  saving: "Enregistrement…",
  saved: "Modifications enregistrées",
  errorGeneric: "Impossible d'enregistrer, réessayez.",
  backToDashboard: "Retour au tableau de bord",
} as const;
