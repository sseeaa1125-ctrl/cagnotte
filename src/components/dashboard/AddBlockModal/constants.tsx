import { Search, ShoppingBag, Link2, Video, Contact, LayoutGrid } from "lucide-react";
import { InstagramIcon, TikTokIcon, YouTubeIcon, SpotifyIcon, FacebookIcon, TelegramIcon, SnapchatIcon } from "./icons";

export const SUGGESTED_SOCIALS = [
  { id: "telegram", label: "Telegram", desc: "Lien vers ton canal ou groupe", icon: <TelegramIcon />, bgColor: "#F0F9FF" },
  { id: "instagram", label: "Instagram", desc: "Lien vers ton profil Instagram", icon: <InstagramIcon />, bgColor: "#FDF2F8" },
  { id: "tiktok", label: "TikTok", desc: "Lien vers ton profil TikTok", icon: <TikTokIcon />, bgColor: "#F3F4F6" },
  { id: "youtube", label: "YouTube", desc: "Lien vers ta chaîne YouTube", icon: <YouTubeIcon />, bgColor: "#FEF2F2" },
  { id: "facebook", label: "Facebook", desc: "Lien vers ta page ou ton profil", icon: <FacebookIcon />, bgColor: "#EFF6FF" },
  { id: "snapchat", label: "Snapchat", desc: "Lien vers ton profil Snapchat", icon: <SnapchatIcon />, bgColor: "#FEFCE8" },
  { id: "spotify", label: "Spotify", desc: "Lien vers ton profil Spotify", icon: <SpotifyIcon />, bgColor: "#F0FDF4" },
];

export const SIDEBAR_CATEGORIES = [
  { id: "suggested", label: "Suggérés", icon: <Search size={15} /> },
  { id: "ecommerce", label: "Ventes & Revenus", icon: <ShoppingBag size={15} /> },
  { id: "social", label: "Réseaux sociaux", icon: <Link2 size={15} /> },
  { id: "media", label: "Média", icon: <Video size={15} /> },
  { id: "contact", label: "Contact", icon: <Contact size={15} /> },
  { id: "all", label: "Tout voir", icon: <LayoutGrid size={15} /> },
];

export const TYPE_CATEGORIES: Record<string, string[]> = {
  ecommerce: ["SALE", "FORMATION", "BOOKING", "DONATION", "PAYMENT", "FUNDRAISER"],
  social: ["COMMUNITY", "LINK"],
  media: ["LINK", "LEAD_MAGNET"],
  contact: ["WAITING_LIST", "PARTNERSHIP", "LEAD_MAGNET"],
};
