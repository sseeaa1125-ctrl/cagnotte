// Registre extensible des types de produits
// Pour ajouter un nouveau type : ajouter une entrée ici + schéma Zod backend + composant store

import type { BlockType } from "@/types";

export type ProductTab = "thumbnail" | "checkout" | "options" | "availability" | "landing";

export interface ProductTypeDefinition {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  tabs: ProductTab[];
  hasProduct: boolean;
  hasBooking: boolean;
  hasPrice: boolean;
  hasFile: boolean;
  hasReviews: boolean;
  hasOrderBumps: boolean;
  hasConfirmationEmail: boolean;
  defaultButtonText: string;
}

export const PRODUCT_TYPES: ProductTypeDefinition[] = [
  // ── Produits payants ──
  {
    type: "SALE",
    label: "Produit numérique",
    description: "PDF, guides, templates, contenus exclusifs",
    icon: "📦",
    color: "#0D9488",
    bgColor: "#F0FDFA",
    tabs: ["thumbnail", "checkout", "landing", "options"],
    hasProduct: true,
    hasBooking: false,
    hasPrice: true,
    hasFile: true,
    hasReviews: true,
    hasOrderBumps: true,
    hasConfirmationEmail: true,
    defaultButtonText: "Acheter",
  },
  {
    type: "BOOKING",
    label: "Coaching / Calendrier",
    description: "Réservations, appels découverte, coaching payant",
    icon: "📅",
    color: "#2563EB",
    bgColor: "#EFF6FF",
    tabs: ["thumbnail", "availability", "checkout", "landing"],
    hasProduct: false,
    hasBooking: true,
    hasPrice: true,
    hasFile: false,
    hasReviews: false,
    hasOrderBumps: false,
    hasConfirmationEmail: true,
    defaultButtonText: "Réserver",
  },
  {
    type: "COMMUNITY",
    label: "Communauté Telegram",
    description: "Groupe ou canal Telegram payant avec gestion automatique",
    icon: "/telegram.jpeg",
    color: "#0891B2",
    bgColor: "#ECFEFF",
    tabs: [],
    hasProduct: false,
    hasBooking: false,
    hasPrice: false,
    hasFile: false,
    hasReviews: false,
    hasOrderBumps: false,
    hasConfirmationEmail: false,
    defaultButtonText: "Rejoindre",
  },
  // ── Paiements flexibles ──
  {
    type: "DONATION",
    label: "Dons et soutien",
    description: "Reçois des dons et du soutien de ta communauté",
    icon: "❤️",
    color: "#E11D48",
    bgColor: "#FFF1F2",
    tabs: ["thumbnail", "checkout", "landing", "options"],
    hasProduct: false,
    hasBooking: false,
    hasPrice: false,
    hasFile: false,
    hasReviews: false,
    hasOrderBumps: false,
    hasConfirmationEmail: true,
    defaultButtonText: "Faire un don",
  },
  {
    type: "FUNDRAISER",
    label: "Levée de fonds",
    description: "Cagnotte avec objectif et barre de progression",
    icon: "🎯",
    color: "#DC2626",
    bgColor: "#FEF2F2",
    tabs: ["thumbnail", "checkout", "landing", "options"],
    hasProduct: false,
    hasBooking: false,
    hasPrice: false,
    hasFile: false,
    hasReviews: false,
    hasOrderBumps: false,
    hasConfirmationEmail: true,
    defaultButtonText: "Participer",
  },
  {
    type: "FORMATION",
    label: "Formation",
    description: "Vends une formation hébergée sur Systeme.io",
    icon: "🎓",
    color: "#7C3AED",
    bgColor: "#F5F3FF",
    tabs: ["thumbnail", "checkout", "landing", "options"],
    hasProduct: true,
    hasBooking: false,
    hasPrice: true,
    hasFile: false,
    hasReviews: true,
    hasOrderBumps: true,
    hasConfirmationEmail: true,
    defaultButtonText: "Accéder",
  },
  {
    type: "PAYMENT",
    label: "Paiement libre",
    description: "Factures, paiements à prix libre, services pro",
    icon: "💳",
    color: "#7C3AED",
    bgColor: "#FAF5FF",
    tabs: ["thumbnail", "checkout", "landing", "options"],
    hasProduct: false,
    hasBooking: false,
    hasPrice: false,
    hasFile: false,
    hasReviews: false,
    hasOrderBumps: false,
    hasConfirmationEmail: true,
    defaultButtonText: "Payer",
  },
  // ── Acquisition & engagement ──
  {
    type: "LEAD_MAGNET",
    label: "Lead Magnet",
    description: "Contenu gratuit en échange d'un email",
    icon: "🧲",
    color: "#EC4899",
    bgColor: "#FDF2F8",
    tabs: ["thumbnail", "checkout", "landing", "options"],
    hasProduct: true,
    hasBooking: false,
    hasPrice: false,
    hasFile: true,
    hasReviews: true,
    hasOrderBumps: false,
    hasConfirmationEmail: true,
    defaultButtonText: "Recevoir",
  },
  {
    type: "WAITING_LIST",
    label: "Liste d'attente",
    description: "Inscriptions à une liste d'attente, gratuite ou payante",
    icon: "📋",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    tabs: ["thumbnail", "checkout", "landing", "options"],
    hasProduct: true,
    hasBooking: false,
    hasPrice: true,
    hasFile: false,
    hasReviews: false,
    hasOrderBumps: false,
    hasConfirmationEmail: true,
    defaultButtonText: "S'inscrire",
  },
  // ── Liens & partenariats ──
  {
    type: "LINK",
    label: "Lien externe",
    description: "Lien vers un site, vidéo ou réseau social",
    icon: "🔗",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    tabs: ["thumbnail"],
    hasProduct: false,
    hasBooking: false,
    hasPrice: false,
    hasFile: false,
    hasReviews: false,
    hasOrderBumps: false,
    hasConfirmationEmail: false,
    defaultButtonText: "Visiter",
  },
  {
    type: "PARTNERSHIP",
    label: "Partenariat",
    description: "Recevoir des demandes de partenariat et collaboration",
    icon: "🤝",
    color: "#059669",
    bgColor: "#ECFDF5",
    tabs: ["thumbnail", "landing"],
    hasProduct: false,
    hasBooking: false,
    hasPrice: false,
    hasFile: false,
    hasReviews: false,
    hasOrderBumps: false,
    hasConfirmationEmail: false,
    defaultButtonText: "Proposer un partenariat",
  },
];

// Unique product types for picker (first match per type)
export const PICKER_TYPES = PRODUCT_TYPES;

// Get product type definition by BlockType
export function getProductType(type: string): ProductTypeDefinition | undefined {
  return PRODUCT_TYPES.find((pt) => pt.type === type);
}
