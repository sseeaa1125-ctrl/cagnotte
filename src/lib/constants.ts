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
  moov: "Free Money",
  maxit: "Maxit",
};

// ── Navigation labels ──
export const NAV_LABELS = {
  accueil: "Accueil",
  cagnottes: "Cagnottes",
  comment: "Comment ça marche",
  aide: "Aide",
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
  aucuneCagnotte: "Lance ta première cagnotte",
  aucuneParticipation: "Tu n'as encore participé à aucune cagnotte",
  aucuneNotification: "Pas de notifications pour le moment",
  aucunResultat: "Aucun résultat",
} as const;

// ── Error states ──
export const ERRORS = {
  generique:
    "Une erreur s'est produite. Réessaye ou contacte support@cagnotte.sn si ça persiste.",
  reseau: "Connexion au serveur impossible. Vérifie ton réseau.",
  nonAutorise: "Session expirée. Reconnecte-toi pour continuer.",
  tropDeRequetes: "Trop de requêtes. Attends 10 minutes, puis réessaye.",
} as const;

// ── Fundraiser subtype labels ──
export const SUBTYPE_LABELS = {
  festive: "Festive",
  solidaire: "Solidaire",
} as const;

// ── Occasions (for Select / RadioCard) ──
export const OCCASIONS = [
  "Baptême",
  "Mariage",
  "Anniversaire",
  "Tabaski",
  "Cadeau commun",
  "Pot de départ",
  "Voyage",
] as const;

// ── Causes (for Select / RadioCard) ──
export const CAUSES = [
  "Santé",
  "Éducation",
  "Rentrée scolaire",
  "Projet solidaire",
  "Urgence",
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
  CAGNOTTE_ENDING_SOON: "Ta cagnotte se termine bientôt",
  CAGNOTTE_ENDED: "Ta cagnotte est terminée",
  PAYOUT_COMPLETED: "Retrait effectué",
  PAYOUT_FAILED: "Retrait échoué",
  KYC_APPROVED: "Identité vérifiée",
  KYC_REJECTED: "Vérification refusée",
  SYSTEM: "Système",
};

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
  statusClosed: "Clôturée",
  subtypeFestive: "Cagnotte Festive",
  subtypeSolidaire: "Cagnotte Solidaire",
  kpiCollected: "Montant brut récolté",
  kpiParticipants: "Participations",
  kpiAvailableFunds: "Fonds net disponibles",
  withdrawCta: "Retirer les fonds",
  withdrawHelper:
    "Transfère ce montant sur ton compte Mobile Money en quelques clics.",
  recentParticipations: "Participations récentes",
  viewAllParticipations: "Voir toutes",
  shareLinkTitle: "Lien de la cagnotte",
  visibilityTitle: "Visibilité",
  dangerZoneTitle: "Gestion de la cagnotte",
  closeCagnotte: "Clôturer la cagnotte",
  closingCagnotte: "Clôture en cours…",
  reopenCagnotte: "Rouvrir la cagnotte",
  reopeningCagnotte: "Réouverture…",
  closeConfirm:
    "Clôturer cette cagnotte ? Les donateurs ne pourront plus participer. Tu pourras la rouvrir plus tard.",
  reopenConfirm: "Rouvrir cette cagnotte ?",
  closeError: "Impossible de modifier la cagnotte. Réessaie.",
  manageCta: "Gérer",
  shareCta: "Partager",
  backToDashboard: "Retour à mes cagnottes",
  emptyParticipations: "Aucune participation pour l'instant.",
  visibilityPublic: "Publique",
  visibilityPrivate: "Privée",
  visibilityEditCta: "Modifier",
  dangerZoneHelper:
    "Clôturer la cagnotte empêchera de nouvelles participations. Cette action est réversible.",
  dangerZoneHelperClosed:
    "Cette cagnotte est clôturée. Les donateurs voient un badge « Cagnotte clôturée » et ne peuvent plus participer.",
  copyLinkCta: "Copier",
  copyLinkSuccess: "Copié !",
  anonymousDonor: "Anonyme",
  kycNotApprovedNote:
    "Vérifie ton identité pour activer les retraits.",
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Phase 4 plan 04-01 — public donor revenue path labels
// All French strings. No hardcoded copy in JSX — import from here.
// ─────────────────────────────────────────────────────────────────────────

// ── Home (screen 1) ──
export const HOME_COPY = {
  heroTitle: "Crée ta cagnotte, partage, collecte.",
  heroSubtitle:
    "La plateforme sénégalaise pour lever des fonds entre amis, en famille ou pour une cause. Wave, Orange Money, Free Money.",
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
      title: "Gratuit pour tes donateurs",
      body: "Tes contributeurs paient exactement ce qu'ils choisissent, sans frais ajoutés. Les frais d'organisateur sont présentés à la création.",
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
      a: "Une fois ton identité vérifiée, tu peux demander un retrait vers ton Wave, Orange Money, Free Money ou ton compte bancaire. Le transfert arrive sous 24 à 48 heures selon l'opérateur.",
    },
    {
      q: "La participation est-elle gratuite pour mes donateurs ?",
      a: "Oui. Tes contributeurs paient exactement le montant qu'ils choisissent, sans frais ajoutés. Les éventuels frais d'organisateur te sont présentés en clair au moment de la création de la cagnotte.",
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

// ── Phase 9 fixpack — Banani home page namespaces ──
// These replace HOME_COPY on src/app/(public)/page.tsx sections. HOME_COPY
// stays exported for any leftover references.

export const HOME_HERO_LABELS = {
  trustPre: "La plateforme de cagnottes du Sénégal",
  h1Part1: "La cagnotte qui",
  subtitle:
    "Des cagnottes en ligne pour faire plaisir, et soutenir celles et ceux qui en ont besoin.",
  ctaCreate: "Créer une cagnotte",
} as const;

// Second line of the hero headline, cycled by _RotatingHeadline.tsx.
// Order matters — first entry is the SSR / first-paint phrase so the
// hydration swap-in looks like a natural continuation.
export const HOME_HERO_PHRASES = [
  "fait du bien.",
  "rassemble.",
  "fait sourire.",
  "change des vies.",
  "nous unit.",
] as const;

export const HOME_FEATURED_LABELS = {
  h2: "Les cagnottes du moment",
  subtitle:
    "Les cagnottes qui font le plus parler d'elles cette semaine au Sénégal.",
  viewAll: "Voir toutes les cagnottes",
  empty: "Aucune cagnotte pour l'instant.",
  participate: "Participer",
  onLabel: "sur",
} as const;

export const HOME_FEATURES_LABELS = {
  togglePlaisir: "Faire plaisir",
  toggleSoutenir: "Soutenir",
  plaisir: {
    h2Part1: "Faites plaisir",
    h2Part2: "à vos proches.",
    subtitle:
      "La cagnotte en ligne pour un anniversaire, un pot de départ, un heureux événement…",
    cards: [
      {
        kicker: "VIREMENT RAPIDE",
        title: "Tes fonds en 48 h",
        body:
          "Une fois la cagnotte clôturée et ton identité vérifiée, tes fonds sont versés sous 48 h jours ouvrés sur Wave, Orange Money, Free Money ou ton compte bancaire.",
        cta: null,
      },
      {
        kicker: "PAIEMENTS SÉCURISÉS",
        title: "Des paiements super safe",
        body:
          "Wave, Orange Money et Free Money. Chaque transaction est protégée par nos prestataires partenaires.",
        cta: null,
      },
      {
        kicker: "GRATUIT POUR LES DONATEURS",
        title: "Les donateurs ne paient aucun frais",
        body:
          "Tes contributeurs paient exactement le montant qu'ils choisissent. Aucun frais ajouté, aucune mauvaise surprise.",
        cta: "Voir nos conditions",
      },
    ] as const,
  },
  soutenir: {
    h2Part1: "Soutenez celles",
    h2Part2: "et ceux qui en ont besoin.",
    subtitle:
      "La cagnotte solidaire pour financer un projet, une urgence médicale, une cause qui vous tient à cœur.",
    cards: [
      {
        kicker: "VIREMENT RAPIDE",
        title: "Fonds versés en 48 h",
        body:
          "Dès la clôture de la cagnotte et la validation de ton identité, les fonds collectés sont versés sous 48 h jours ouvrés. Tes bénéficiaires n'attendent pas.",
        cta: null,
      },
      {
        kicker: "UN GESTE, UN IMPACT",
        title: "Même petit, ton don change tout",
        body:
          "De 500 FCFA à plusieurs millions, chaque contribution compte. Partage la cagnotte autour de toi pour amplifier l'impact.",
        cta: null,
      },
      {
        kicker: "UNE PLATEFORME SÉRIEUSE",
        title: "Infrastructure, support, KYC",
        body:
          "Derrière chaque cagnotte, nos équipes maintiennent l'infrastructure, la vérification d'identité et un support humain 7 j/7. Les détails des frais d'organisateur sont présentés à la création.",
        cta: "Voir nos conditions",
      },
    ] as const,
  },
} as const;

export const HOME_SOLIDAIRE_LABELS = {
  h2: "Les cagnottes solidaires",
  subtitle: "Des collectes de fonds où chaque geste compte. Même petit.",
  collectedSuffix: "récoltés",
  empty: "Aucune cagnotte solidaire pour l'instant.",
} as const;

export const HOME_FAQ_LABELS = {
  kicker: "FAQ",
  h2Part1: "On répond à toutes",
  h2Part2: "vos questions.",
  items: [
    {
      q: "Comment utiliser l'argent de ma cagnotte en ligne ?",
      a: "Une fois ton identité vérifiée (KYC), tu peux demander un retrait vers ton compte Wave, Orange Money, Free Money ou bancaire. Tu gardes la main sur le rythme des retraits.",
    },
    {
      q: "Combien de temps pour recevoir mes fonds ?",
      a: "Dès que ta cagnotte reçoit des contributions, tu peux demander un retrait. Les virements Mobile Money sont généralement traités sous 48 h après validation de ton identité.",
    },
    {
      q: "Quels moyens de paiement sont acceptés ?",
      a: "Wave, Orange Money et Free Money. Les donateurs choisissent leur Mobile Money préféré au moment de la participation.",
    },
    {
      q: "Mes donateurs paient-ils des frais ?",
      a: "Non. Les donateurs paient exactement le montant qu'ils choisissent, sans frais ajouté. Une contribution volontaire de 3 % est proposée au moment du paiement pour soutenir la plateforme — elle reste 100 % optionnelle et peut être décochée en un clic.",
    },
    {
      q: "Ma cagnotte peut-elle être privée ?",
      a: "Oui. À la création, choisis « Cagnotte privée » : elle n'apparaît ni sur la page d'accueil ni dans la liste publique. Seules les personnes à qui tu envoies le lien direct peuvent y participer.",
    },
    {
      q: "Comment ma cagnotte est-elle sécurisée ?",
      a: "Les paiements sont traités par notre partenaire Bictorys, agréé par les opérateurs Wave, Orange Money et Free Money. Chaque transaction est chiffrée de bout en bout et ton identité est vérifiée avant tout retrait (KYC). Nos équipes surveillent les transactions 7 j/7.",
    },
  ] as const,
} as const;

export const HOME_PREFOOTER_LABELS = {
  h2Part1: "Bref, il ne vous reste",
  h2Part2: "qu'une chose à faire",
  cta: "Créer une cagnotte",
} as const;

// ── /c/[slug]/participer (screen 23) ──
export const PARTICIPER_LABELS = {
  pageTitle: "Je participe",
  backCta: "Cagnotte",
  breadcrumbCurrent: "Participation",
  stepAmount: "Ta participation",
  stepInfo: "Tes infos de paiement",
  stepMessage: "Ton message",
  customAmountLabel: "Autre montant (FCFA)",
  customAmountPlaceholder: "Ex : 7 500",
  firstNameLabel: "Prénom",
  lastNameLabel: "Nom",
  emailLabel: "Email",
  phoneLabel: "Téléphone",
  phonePlaceholder: "+221 77 XXX XX XX",
  messageLabel: "Message au créateur (facultatif)",
  messagePlaceholder: "Ajoute un mot d'encouragement…",
  // Phase 10 — voluntary contribution (3% of base amount).
  voluntaryTitle: "Contribution volontaire",
  voluntaryLabel: "Soutenir la plateforme",
  voluntaryHelp:
    "Soutiens la plateforme de cagnottes sénégalaise. Ta contribution volontaire de 3 % aide à maintenir un service de qualité pour tous les porteurs de projets.",
  voluntaryOptOut:
    "Je ne souhaite pas donner de contribution volontaire",
  hideIdentityLabel: "Masquer mon identité",
  hideIdentityHelp:
    "Ton nom ne sera pas affiché sur la page publique. Le créateur verra quand même ton vrai nom.",
  hideAmountLabel: "Masquer le montant de ma participation",
  hideAmountHelp:
    "Le montant de ton don ne sera pas visible sur la page publique.",
  privateMessageLabel: "Garder mon message privé",
  privateMessageHelp: "Seul·e le·la créateur·trice pourra lire ton message.",
  // Legacy keys kept for backwards compatibility with other consumers.
  anonymousLabel: "Masquer mon identité",
  anonymousHelp:
    "Ton nom ne sera pas affiché sur la page publique.",
  tosLabel: "J'accepte les conditions générales d'utilisation",
  submitCta: "Passer au paiement",
  errorAmountMin: "Le montant minimum est 500 FCFA",
  errorAmountMax: "Le montant maximum est 10 000 000 FCFA",
  errorFirstNameRequired: "Prénom requis",
  errorLastNameRequired: "Nom requis",
  errorPhoneRequired: "Numéro requis. Format : +221 77 123 45 67",
  errorMessageTooLong: "Message trop long (max 500 caractères)",
  errorTosRequired: "Tu dois accepter les conditions",
} as const;

// ── /c/[slug]/paiement (screen 24) ──
export const PAIEMENT_LABELS = {
  pageTitle: "Mode de paiement",
  pageSubtitle: "Choisis ton moyen de paiement pour continuer.",
  methodWave: "Wave",
  methodOrange: "Orange Money",
  methodMaxit: "Maxit",
  payWithPrefix: "Payer avec",
  processingLabel: "Traitement…",
  errorRateLimit: "Trop de tentatives, réessaye dans 1 minute.",
  errorCircuitBreaker: "Paiement temporairement indisponible. Réessaye dans 1 minute.",
  errorGeneric: "Erreur lors de la création de l'ordre. Réessaye.",
  errorMissingSession:
    "Informations de contribution introuvables. Reprends depuis le début.",
  // Waiting state (QR desktop + in-app browsers) — Phase 11 parity with fari.store PaymentModal.
  waitingPollingTitle: "En attente du paiement…",
  waitingPollingSubtitle:
    "Termine ton paiement sur l'application puis reviens ici. La page se met à jour automatiquement.",
  waitingPaidTitle: "Paiement confirmé !",
  waitingPaidSubtitle: "Redirection en cours…",
  waitingQrHeadingPrefix: "Scanne ce QR code avec",
  waitingQrDefaultApp: "ton app",
  waitingOpenAppPrefix: "Ouvrir dans l'app",
  waitingOpenAppFallback: "de paiement",
  waitingCopyLink: "Copier le lien",
  waitingCopied: "Lien copié !",
  waitingShareLink: "Partager le lien",
  waitingInAppHelp:
    "Ce navigateur bloque la redirection. Utilise un des boutons ci-dessous pour continuer.",
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
  missingReferenceDescription:
    "Nous n'avons pas trouvé de commande associée à cette page. Retourne à la cagnotte pour recommencer.",
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
  alreadyAccount: "Tu as déjà un compte ? Se connecter",
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
  errorGeneric:
    "Une erreur s'est produite. Réessaye ou contacte support@cagnotte.sn si le problème persiste.",
  errorEmailTaken:
    "Cet email a déjà un compte. Connecte-toi ou réinitialise ton mot de passe.",
  errorSlugTaken: "Ce nom d'espace est déjà pris.",
  errorInvalidCredentials: "E-mail ou mot de passe incorrect.",
  errorEmailUnverified:
    "Email non vérifié — un nouveau code vient d'être envoyé. Vérifie ta boîte mail (et le dossier spam).",
  errorRateLimit:
    "Trop de tentatives. Attends 10 minutes, puis réessaye.",
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
  kpiTotalRaised: "Total brut collecté",
  kpiDonorCount: "Participations",
  kpiCampaignCount: "Mes cagnottes",
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
  title: "Quel type de cagnotte veux-tu créer ?",
  subtitle: "Choisis celui qui correspond à ton projet.",
  festiveTitle: "Festive",
  festiveDescription:
    "Baptême, mariage, anniversaire, cadeau commun, pot de départ, voyage…",
  festiveFeeAmount: "8 %",
  festiveFeeLabel: "de commission par contribution",
  festiveCta: "Choisir festive",
  solidaireTitle: "Solidaire",
  solidaireDescription:
    "Appel aux dons, aider un proche ou une association, soutenir un projet, urgence santé, obsèques…",
  solidaireFeeAmount: "6 %",
  solidaireFeeLabel: "de commission par contribution",
  solidaireCta: "Choisir solidaire",
  feeHelper:
    "Aucun frais caché, la commission est déduite à chaque contribution.",
  cancelCta: "Retour au tableau de bord",
  trustBadgeSecure: "100 % sécurisé",
  trustBadgeEasy: "Collecte facilitée",
  trustBadgePayout: "Fonds versés en 48 h",
} as const;

// ── Wizard shared labels (festive + solidaire, 3 steps) ──
export const WIZARD_LABELS = {
  festiveBadge: "🪩 Cagnotte Festive",
  solidaireBadge: "❤️ Cagnotte Solidaire",
  backCta: "Retour",
  continueCta: "Continuer",
  // Context-aware CTAs (used per step in the wizard pages)
  continueCtaStep1: "Personnaliser ma cagnotte",
  continueCtaStep2: "Configurer les options",
  publishCta: "Publier ma cagnotte",
  publishing: "Publication en cours…",
  step1Of3: "Étape 1 sur 3",
  step2Of3: "Étape 2 sur 3",
  step3Of3: "Étape 3 sur 3",
  step1TitleFestive: "Commençons par les bases",
  step1SubtitleFestive:
    "Donne un nom à ta cagnotte et précise l'occasion.",
  step1TitleSolidaire: "Commençons par les bases",
  step1SubtitleSolidaire:
    "Donne un nom à ton projet solidaire et précise la cause.",
  step2TitleFestive: "Personnalise ta cagnotte",
  step2SubtitleFestive:
    "Ajoute une image et un petit mot pour donner envie de participer.",
  step2TitleSolidaire: "Personnalise ton projet",
  step2SubtitleSolidaire:
    "Ajoute une image et explique pourquoi tu collectes des fonds.",
  step3Title: "Paramètres et visibilité",
  step3SubtitleFestive:
    "Dernière étape ! Configure les options de ta cagnotte.",
  step3SubtitleSolidaire:
    "Dernière étape ! Configure les options de ta collecte.",
} as const;

// ── Wizard field labels (shared festive + solidaire) ──
export const WIZARD_FIELDS = {
  titleLabel: "Nom de la cagnotte",
  titlePlaceholderFestive: "Ex : Pour les 30 ans de Thomas",
  titlePlaceholderSolidaire: "Ex : Soutien pour le jardin partagé",
  titleHelp: "Un titre clair donne plus envie de participer.",
  occasionLabel: "Occasion",
  occasionPlaceholder: "Sélectionne une occasion…",
  occasionOptions: {
    bapteme: "Baptême",
    mariage_pacs: "Mariage",
    anniversaire: "Anniversaire",
    tabaski: "Tabaski",
    cadeau_commun: "Cadeau commun",
    pot_de_depart: "Pot de départ",
    naissance: "Naissance",
    voyage: "Voyage",
    autre: "Autre",
  } as Record<string, string>,
  causeLabel: "Cause soutenue",
  causePlaceholder: "Sélectionne une cause…",
  causeOptions: {
    sante_medical: "Santé & médical",
    education: "Éducation",
    rentree_scolaire: "Rentrée scolaire",
    projet_solidaire: "Projet solidaire",
    urgence: "Urgence",
    obseques: "Obsèques",
    autre: "Autre",
  } as Record<string, string>,
  beneficiaryLabel: "Pour qui collectes-tu ?",
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
  galleryLabel: "Galerie (facultatif)",
  descriptionLabelFestive: "Un petit mot pour les participants",
  descriptionPlaceholderFestive:
    "Explique en quelques mots pourquoi tu organises cette cagnotte et à quoi servira l'argent récolté…",
  descriptionLabelSolidaire: "Description du projet",
  descriptionPlaceholderSolidaire:
    "Explique l'histoire de ton projet, à quoi serviront les fonds et pourquoi chaque don compte…",
  thankYouMessageLabel: "Message de remerciement (facultatif)",
  thankYouMessagePlaceholder:
    "Merci du fond du cœur pour ta contribution !",
  endDateLabel: "Date de fin",
  endDateOptional: "Optionnel",
  endDateHelpFestive:
    "Tu peux toujours modifier ou clôturer la cagnotte plus tôt.",
  endDateHelpSolidaire:
    "Laisse vide si ta collecte est à durée indéterminée.",
  visibilityLabel: "Visibilité de la cagnotte",
  visibilityPublic: "Publique",
  visibilityPublicHelper:
    "Ta cagnotte sera visible par tous et apparaîtra dans les résultats de recherche de cagnotte.sn.",
  visibilityPrivate: "Privée",
  visibilityPrivateHelper:
    "Ta cagnotte ne sera pas listée sur le site. Seules les personnes avec qui tu partages le lien pourront y accéder.",
  hideAmountLabel: "Cacher le montant récolté",
  hideAmountHelp: "Les visiteurs ne verront pas la somme totale collectée.",
  hideDonorsLabel: "Cacher les noms des participants",
  hideDonorsHelp:
    "Toi seul, l'organisateur, pourras voir qui a donné.",
  tosLabelFestive:
    "J'accepte les Conditions Générales d'Utilisation.",
  tosLabelSolidaire:
    "J'accepte les Conditions Générales d'Utilisation et je confirme que les fonds récoltés seront utilisés pour la cause décrite.",
  tosError: "Tu dois accepter les conditions pour continuer.",
  errorTitleRequired:
    "Donne un titre à ta cagnotte. Ex : « Baptême de Khadija » ou « Soutien santé pour Mamadou ».",
  errorOccasionRequired: "Choisis une occasion (baptême, mariage, anniversaire…).",
  errorCauseRequired: "Choisis une cause (santé, éducation, urgence…).",
  errorBeneficiaryRequired: "Indique pour qui tu collectes (toi-même, un proche, une association).",
  errorGoalMin: "Le montant à atteindre doit être d'au moins 1 000 FCFA.",
  errorDescriptionMin:
    "Ajoute une description d'au moins 20 caractères pour donner envie de participer.",
  errorGeneric:
    "Impossible de publier la cagnotte. Réessaye ou contacte support@cagnotte.sn.",
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
    "Gère tes informations personnelles et tes paramètres de sécurité.",
  sectionTitle: "Informations personnelles",
  firstName: "Prénom",
  lastName: "Nom",
  email: "Adresse e-mail",
  emailHelper:
    "Pour modifier ton e-mail, contacte le support.",
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
  subtitle: "Choisis ce que tu veux recevoir.",
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
    "Retrouve toutes les cagnottes auxquelles tu as contribué.",
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
  empty: "Tu n'as encore participé à aucune cagnotte.",
  emptyCta: "Découvrir les cagnottes",
  emailMatchNotice: (email: string) =>
    `Seules les participations effectuées avec ton email (${email}) sont affichées ici.`,
};

export const NOTIF_FEED_LABELS = {
  h1: "Tes notifications",
  subtitle: "Suis l'activité de tes cagnottes en temps réel.",
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
  searchPlaceholder: "Rechercher une cagnotte (titre, mot-clé…)",
  searchAriaLabel: "Rechercher une cagnotte par titre",
  filterAll: "Toutes",
  filterFestive: "Festives",
  filterSolidaire: "Solidaires",
  loadMoreCta: "Charger plus",
  loadingLabel: "Chargement…",
  emptyTitle: "Aucune cagnotte ne correspond",
  emptyBody: "Essaye un autre filtre ou reviens plus tard.",
  emptyResetCta: "Réinitialiser les filtres",
} as const;

// ── Phase 6 plan 06-02 — money screens labels ──
// Shared across /profil/coordonnees-bancaires, /profil/securite, /profil/kyc,
// /retraits/**, /tableau-de-bord/cagnottes/[slug]/stats,
// /tableau-de-bord/cagnottes/[slug]/modifier.

export const BANK_LABELS = {
  h1: "Coordonnées bancaires",
  subtitle: "Choisis comment tu veux recevoir tes fonds.",
  providerLabel: "Moyen de paiement",
  providerWave: "Wave Sénégal",
  providerWaveHelper: "Transfert instantané sur ton compte Wave.",
  providerOrange: "Orange Money",
  providerOrangeHelper: "Transfert instantané sur ton compte Orange Money.",
  phoneLabel: "Numéro Mobile Money",
  phoneHelper: "Exemple : 77 123 45 67",
  nameLabel: "Nom du titulaire",
  nameHelper: "Tel qu'inscrit chez ton opérateur.",
  save: "Enregistrer",
  saving: "Enregistrement…",
  saved: "Coordonnées enregistrées",
  errorGeneric: "Impossible d'enregistrer. Réessaye.",
  noFreeMoneyNotice:
    "Free Money n'est pas disponible pour les retraits pour le moment.",
  securityNoticeTitle: "Tes coordonnées sont protégées",
  securityNoticeBody:
    "Tes numéros Mobile Money sont stockés de manière sécurisée et ne servent qu'à te verser les fonds récoltés.",
} as const;

export const SECURITY_LABELS = {
  h1: "Sécurité & Mot de passe",
  subtitle: "Protège ton compte et tes retraits.",
  passwordSection: "Changer mon mot de passe",
  passwordDescription:
    "Choisis un mot de passe d'au moins 8 caractères, différent de l'ancien.",
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
    "Ce code est demandé à chaque retrait de fonds. Il est distinct de ton mot de passe.",
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
    "Téléverse ta pièce d'identité pour activer les retraits de fonds.",
  fullNameLabel: "Nom complet sur la pièce",
  fullNameHelper: "Tel qu'il apparaît sur ta pièce d'identité.",
  idLabel: "Pièce d'identité (recto)",
  idHelper: "JPG ou PNG, 5 Mo maximum.",
  selfieLabel: "Selfie avec ta pièce",
  selfieHelper:
    "Tiens ta pièce à côté de ton visage, bien visible, sans reflets.",
  submit: "Soumettre pour vérification",
  submitting: "Envoi en cours…",
  uploadFailed: "L'envoi du fichier a échoué. Réessaye.",
  nameTooShort: "Le nom complet doit contenir au moins 2 caractères.",
  missingFiles: "Téléverse les deux documents pour continuer.",
  statusNone: "Non vérifié",
  statusPending: "En cours de vérification",
  statusApproved: "Identité vérifiée",
  statusRejected: "Vérification refusée",
  noneBanner:
    "Ton identité n'est pas encore vérifiée. Téléverse ta pièce pour activer les retraits.",
  pendingBanner:
    "Tes documents sont en cours de vérification. Tu recevras une notification dès qu'ils seront validés.",
  approvedBanner:
    "Ton identité est vérifiée. Tu peux maintenant retirer tes fonds.",
  rejectedBanner:
    "La vérification a été refusée. Tu peux soumettre à nouveau ta pièce et un selfie.",
  approvedFullName: "Nom vérifié",
} as const;

export const WITHDRAWAL_LABELS = {
  h1: "Retirer mes fonds",
  subtitle:
    "Transfère l'argent récolté vers ton compte Mobile Money en toute sécurité.",
  balanceLabel: "Solde disponible",
  balanceHelper: "Toutes cagnottes confondues.",
  amountLabel: "Montant à retirer",
  amountMin: "Minimum 1 000 FCFA.",
  maxChip: "Max",
  maxHelper: "Tu retires la totalité du solde disponible.",
  destLabel: "Où envoyer l'argent ?",
  phoneLabel: "Numéro Mobile Money",
  nameLabel: "Nom du titulaire",
  continue: "Continuer",
  back: "Retour",
  pinTitle: "Entre ton code à 4 chiffres",
  pinHelper: "Ce code protège tes retraits.",
  pinForgot: "Code oublié ?",
  pinContinue: "Continuer",
  confirmTitle: "Confirmer le retrait",
  confirmSubtitle: "Vérifie les informations avant de valider.",
  confirmAmount: "Montant retiré",
  confirmFees: "Frais de virement",
  confirmFeesFree: "Gratuit",
  confirmDelay: "Délai estimé",
  confirmDelayInstant: "Immédiat",
  confirmNet: "Tu vas recevoir",
  confirmCta: "Confirmer le retrait",
  confirmSubmitting: "Traitement en cours…",
  secured: "Transaction sécurisée",
  successH1: "Retrait en cours !",
  successBodyPrefix: "Ta demande de retrait de ",
  successBodySuffix: " a bien été prise en compte.",
  successToLabel: "Vers le compte",
  successDelayLabel: "Délai estimé",
  successDelayInstant: "Sous 48h",
  successStatusLabel: "Statut",
  successStatusPending: "En attente de traitement",
  successInfoTitle: "Retrait sous 48h",
  successInfo:
    "Ta demande est enregistree. Elle sera traitee sous 48h ouvrees. Tu recevras un SMS de confirmation de notre partenaire de paiement.",
  successBackToDashboard: "Aller au tableau de bord",
  successBackToCagnottes: "Voir mes cagnottes",
  kycBlockedTitle: "Vérifie ton identité",
  kycBlockedBody:
    "Avant d'effectuer un retrait, nous devons vérifier ton identité.",
  kycBlockedCta: "Vérifier mon identité",
  pinMissingTitle: "Crée ton code de retrait",
  pinMissingBody:
    "Définis un code à 4 chiffres dans les paramètres de sécurité pour protéger tes retraits.",
  pinMissingCta: "Définir mon code",
  blockedTitle: "Retraits temporairement indisponibles",
  blockedBody:
    "Nos équipes ont suspendu les retraits sur ton compte. Contacte le support pour plus d'informations.",
  insufficientBalance: "Solde insuffisant",
  rateLimited:
    "Trop de demandes. Attends 10 minutes, puis réessaye.",
  circuitOpen:
    "Le service de paiement est momentanément indisponible. Réessaye dans quelques instants.",
  pinIncorrect: "Code de retrait incorrect",
  pinLocked: "Trop de tentatives. Ton code est temporairement bloqué.",
  draftExpired: "Ta demande a expiré. Recommence depuis le début.",
  submitError: "Le retrait n'a pas pu être effectué. Réessaye.",
} as const;

export const STATS_LABELS = {
  h1: "Statistiques",
  subtitle: "Un résumé de l'activité de ta cagnotte.",
  kpiRaised: "Total brut collecté",
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
    "Transfère l'argent récolté vers le compte de ton choix en toute sécurité.",
  step1Title: "Montant à retirer",
  step2Title: "Où envoyer l'argent ?",
  maxChip: "Max",
  maxHelper: "Tu retires la totalité du solde disponible.",
  addAccountCta: "Ajouter un compte bancaire ou Mobile Money",
  summaryLabel: "RÉCAPITULATIF DU RETRAIT",
  summaryAmount: "Montant retiré",
  summaryFees: "Frais de virement",
  summaryFeesFree: "Gratuit",
  summaryDelay: "Délai estimé",
  summaryDelayInstant: "Immédiat",
  summaryNet: "Tu vas recevoir",
  confirmCta: "Confirmer le retrait",
  securedFooter: "Transaction sécurisée",
  instantBadge: "Instantané",
} as const;

export const WITHDRAW_PIN_LABELS = {
  pageTitle: "Vérification de sécurité",
  // Persistent PIN — NOT SMS OTP. No phone-masked text, no countdown.
  pageHelperPrefix: "Pour valider ton retrait de ",
  pageHelperSuffix:
    ", saisis ton code PIN à 4 chiffres.",
  submitCta: "Valider le retrait",
  cancelCta: "Annuler",
  pinError: "Code PIN incorrect.",
  pinForgot: "PIN oublié ?",
} as const;

export const WITHDRAW_SUCCESS_LABELS = {
  title: "Demande enregistree !",
  helper: "Ta demande de retrait a bien ete prise en compte. Elle sera traitee sous 48h.",
  backCta: "Retour au tableau de bord",
  historyCta: "Voir mes retraits",
} as const;

export const BANK_ACCOUNTS_LABELS = {
  pageTitle: "Coordonnées bancaires",
  mobileMoneyTitle: "Comptes Mobile Money",
  mobileMoneyHelper:
    "Pour recevoir les fonds de tes cagnottes instantanément.",
  bankAccountsTitle: "Comptes Bancaires",
  bankAccountsHelper:
    "Pour les virements bancaires classiques (délai de 48 h).",
  addAccountCta: "Ajouter",
  addBankCta: "Ajouter un compte bancaire",
  activeBadge: "Actif",
  deleteAriaLabel: "Supprimer",
  bankEmptyTitle: "Aucun compte bancaire",
  bankEmptyBody:
    "Ajoute un RIB/IBAN pour virer l'argent de tes cagnottes directement sur ton compte bancaire.",
  mobileEmptyTitle: "Aucun compte Mobile Money configuré.",
  mobileEmptyBody:
    "Ajoute un compte Wave ou Orange Money pour recevoir tes fonds instantanément.",
  securityNoticeTitle: "Tes coordonnées sont protégées",
  securityNoticeBody:
    "Tes coordonnées bancaires et numéros Mobile Money sont chiffrés et stockés de manière sécurisée. Ils ne sont utilisés que pour virer les fonds récoltés sur tes cagnottes.",
} as const;

export const VISIBILITY_LABELS = {
  sectionLabel: "Visibilité de la cagnotte",
  publicTitle: "Publique",
  publicDescription:
    "Ta cagnotte sera visible par tous et apparaîtra dans les résultats de recherche de cagnotte.sn.",
  privateTitle: "Privée",
  privateDescription:
    "Seules les personnes disposant du lien pourront voir la cagnotte et y participer. Elle n'apparaîtra pas dans les recherches. Idéal pour les événements personnels.",
} as const;

export const DATE_PICKER_LABELS = {
  placeholder: "Sélectionne une date…",
} as const;

export const WIZARD_EXTRA_LABELS = {
  displayOptionsLegend: "Options d'affichage",
} as const;

// ── Phase 8 fixpack — /comment (how it works) stub ──
export const HOW_IT_WORKS_LABELS = {
  pageTitle: "Comment ça marche",
  pageSubtitle:
    "Trois étapes simples pour lever des fonds auprès de ta communauté au Sénégal.",
  steps: [
    {
      number: "1",
      title: "Crée ta cagnotte",
      body:
        "Inscris-toi en 2 minutes, choisis un titre, un objectif et une photo. Festive ou solidaire : ta page est prête.",
    },
    {
      number: "2",
      title: "Partage le lien",
      body:
        "Envoie l'URL personnalisée (cagnotte.sn/<ta-page>) sur WhatsApp, les réseaux sociaux ou par SMS à tes proches.",
    },
    {
      number: "3",
      title: "Reçois les dons",
      body:
        "Tes contributeurs paient en Wave, Orange Money ou Free Money. Tu retires les fonds directement sur ton Mobile Money.",
    },
  ],
  ctaTitle: "Prêt à commencer ?",
  ctaSubtitle: "Crée ta première cagnotte gratuitement.",
  ctaLabel: "Créer ma cagnotte",
} as const;

// ── Phase 8 fixpack — /a-propos (about) stub ──
export const ABOUT_LABELS = {
  pageTitle: "À propos de cagnotte.sn",
  paragraphs: [
    "Cagnotte.sn est la plateforme sénégalaise dédiée à la collecte de fonds en ligne. Nous croyons que chacun devrait pouvoir lever des fonds pour ses projets — fêter un baptême, célébrer un mariage, financer une opération médicale ou soutenir une cause solidaire.",
    "Conçue pour le Sénégal, notre plateforme accepte Wave, Orange Money et Free Money. Aucun téléchargement, aucune application : un simple lien partageable suffit.",
    "Nous proposons deux types de cagnottes : festives (baptêmes, mariages, anniversaires, cadeaux communs) et solidaires (santé, urgence, rentrée scolaire, projets communautaires). La participation est gratuite pour tes contributeurs ; les frais applicables à l'organisateur sont présentés en clair au moment de la création de la cagnotte, en fonction du type choisi.",
    "Notre mission est simple : rendre la collecte de fonds accessible à tous, en français, en FCFA, et avec les moyens de paiement que tu utilises tous les jours.",
  ],
} as const;

export const EDIT_LABELS = {
  h1: "Modifier ma cagnotte",
  subtitle: "Mets à jour le contenu sans changer l'URL.",
  urlSection: "URL de ta cagnotte",
  slugLocked: "L'URL de ta cagnotte ne peut pas être modifiée.",
  titleLabel: "Titre",
  descriptionLabel: "Description",
  coverLabel: "Image de couverture",
  coverHelper: "JPG ou PNG, 5 Mo maximum.",
  goalLabel: "Objectif (FCFA)",
  endDateLabel: "Date de fin",
  endDateHelper: "Laisse vide pour une cagnotte sans échéance.",
  // Phase 7 plan 07-03 — PLSH-08. Editable thank-you message.
  thankYouMessageLabel: "Message de remerciement (facultatif)",
  thankYouMessagePlaceholder:
    "Merci du fond du cœur pour ta contribution !",
  thankYouMessageHelper:
    "Affiché aux contributeurs après leur participation (500 caractères max).",
  suggestedAmountsLabel: "Montants suggérés (FCFA)",
  suggestedAmountsHelper:
    "Sépare-les par une virgule. Jusqu'à 3 montants, minimum 500 FCFA.",
  hideAmount: "Masquer le montant collecté",
  hideAmountDescription: "Les contributeurs ne voient pas le total récolté.",
  hideDonors: "Masquer la liste des donateurs",
  hideDonorsDescription: "La liste des participants reste privée.",
  save: "Enregistrer les modifications",
  saving: "Enregistrement…",
  saved: "Modifications enregistrées",
  errorGeneric: "Impossible d'enregistrer. Réessaye.",
  backToDashboard: "Retour au tableau de bord",
} as const;
