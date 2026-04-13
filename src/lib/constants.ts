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
