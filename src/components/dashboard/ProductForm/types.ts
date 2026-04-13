import type { Review, OrderBump, LeadField, ProductFile } from "@/types";
import type { ProductTypeDefinition } from "@/lib/productTypes";

// ── Form data types ──

export interface SlotRow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CheckoutSection {
  id?: string;
  type: "text" | "faq" | "features" | "video";
  title?: string;
  content?: string;
  items?: { question?: string; answer?: string; text?: string }[];
}

export interface ProductFormData {
  title: string;
  subtitle: string;
  description: string;
  price: string;
  discountPrice: string;
  coverUrl: string;
  fileUrl: string;
  fileName: string;
  files: ProductFile[];
  redirectUrl: string;
  buttonText: string;
  ctaStyle: string;
  url: string;
  duration: string;
  location: string;
  suggestedAmounts: string;
  minAmount: string;
  confirmationEmailSubject: string;
  confirmationEmailBody: string;
  reviews: Review[];
  orderBumps: OrderBump[];
  slots: SlotRow[];
  leadFields: LeadField[];
  maxSubscribers: string;
  showSubscriberCount: boolean;
  videoUrl: string;
  checkoutSections: CheckoutSection[];
  thankYouMessage: string;
  checkoutFields: LeadField[];
  goalAmount: string;
  endDate: string;
  showDonorCount: boolean;
  systemeioCourseId: string;
}

export const EMPTY_FORM: ProductFormData = {
  title: "",
  subtitle: "",
  description: "",
  price: "",
  discountPrice: "",
  coverUrl: "",
  fileUrl: "",
  fileName: "",
  files: [],
  redirectUrl: "",
  buttonText: "",
  ctaStyle: "button",
  url: "",
  duration: "60",
  location: "",
  suggestedAmounts: "5000,10000,25000",
  minAmount: "500",
  confirmationEmailSubject: "",
  confirmationEmailBody: "",
  reviews: [],
  orderBumps: [],
  slots: [],
  leadFields: [],
  maxSubscribers: "",
  showSubscriberCount: true,
  videoUrl: "",
  checkoutSections: [],
  thankYouMessage: "",
  checkoutFields: [],
  goalAmount: "",
  endDate: "",
  showDonorCount: true,
  systemeioCourseId: "",
};

// ── Shared prop types ──

export type Tab = "thumbnail" | "checkout" | "options" | "availability" | "landing";

export interface TabProps {
  productType: ProductTypeDefinition;
  form: ProductFormData;
  set: <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => void;
}

export interface TabPropsWithMultiple extends TabProps {
  setMultiple: (updates: Partial<ProductFormData>) => void;
  addFile: (newFile: ProductFile) => void;
}

// ── Tab labels ──

const TAB_LABELS_BY_TYPE: Record<string, Partial<Record<Tab, string>>> = {
  SALE: { thumbnail: "Miniature", checkout: "Produit", landing: "Page de vente", options: "Options" },
  BOOKING: { thumbnail: "Miniature", availability: "Disponibilité", checkout: "Tarif", landing: "Page de vente" },
  PAYMENT: { thumbnail: "Miniature", checkout: "Montants", landing: "Page de vente", options: "Options" },
  DONATION: { thumbnail: "Miniature", checkout: "Montants", landing: "Page de vente", options: "Options" },
  FUNDRAISER: { thumbnail: "Miniature", checkout: "Cagnotte", landing: "Page de vente", options: "Options" },
  FORMATION: { thumbnail: "Miniature", checkout: "Formation", landing: "Page de vente", options: "Options" },
  LINK: { thumbnail: "Miniature" },
  LEAD_MAGNET: { thumbnail: "Miniature", checkout: "Contenu", landing: "Présentation", options: "Options" },
  WAITING_LIST: { thumbnail: "Miniature", checkout: "Inscription", landing: "Présentation", options: "Options" },
  PARTNERSHIP: { thumbnail: "Miniature", landing: "Présentation" },
};

const DEFAULT_TAB_LABELS: Record<Tab, string> = {
  thumbnail: "Miniature",
  availability: "Disponibilité",
  checkout: "Produit",
  landing: "Page de vente",
  options: "Options",
};

export function getTabLabel(tab: Tab, productType: string): string {
  return TAB_LABELS_BY_TYPE[productType]?.[tab] || DEFAULT_TAB_LABELS[tab];
}

// ── Video embed helper ──

export type VideoFormat = "landscape" | "vertical";

export function getVideoFormat(url: string): VideoFormat {
  if (!url) return "landscape";
  if (url.includes("/shorts/") || url.includes("tiktok.com") || url.includes("/reel")) return "vertical";
  return "landscape";
}

export function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    // YouTube: regular, shorts, youtu.be
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      let videoId: string | null = null;
      if (url.includes("/shorts/")) {
        videoId = url.split("/shorts/")[1]?.split(/[?&#]/)[0] || null;
      } else if (url.includes("youtu.be")) {
        videoId = url.split("youtu.be/")[1]?.split(/[?&#]/)[0] || null;
      } else {
        videoId = new URL(url).searchParams.get("v");
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    // TikTok
    if (url.includes("tiktok.com")) {
      const match = url.match(/\/video\/(\d+)/);
      if (match) return `https://www.tiktok.com/embed/v2/${match[1]}`;
      // If URL is a short link like vm.tiktok.com, return the oEmbed player
      return `https://www.tiktok.com/embed/${url.split("/").pop()?.split("?")[0]}`;
    }
    // Instagram Reels
    if (url.includes("instagram.com") && url.includes("/reel")) {
      const reelId = url.split("/reel/")[1]?.split(/[?/]/)[0];
      return reelId ? `https://www.instagram.com/reel/${reelId}/embed` : null;
    }
    // Vimeo
    if (url.includes("vimeo.com")) {
      const vimeoId = url.split("/").pop()?.split("?")[0];
      return vimeoId ? `https://player.vimeo.com/video/${vimeoId}` : null;
    }
    // Loom
    if (url.includes("loom.com")) {
      return url.replace("share", "embed");
    }
  } catch {
    return null;
  }
  return null;
}
