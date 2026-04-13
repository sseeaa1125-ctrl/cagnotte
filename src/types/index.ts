// ── Types frontend (pas de dépendance Prisma) ──

export type Plan = "FREE" | "PRO";
export type BlockType = "LINK" | "SALE" | "BOOKING" | "PAYMENT" | "DONATION" | "FUNDRAISER" | "FORMATION" | "LEAD_MAGNET" | "WAITING_LIST" | "PARTNERSHIP" | "COMMUNITY";
export type OrderType = "SALE" | "BOOKING" | "PAYMENT" | "DONATION";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "EXPIRED";

export interface Seller {
  id: string;
  email: string;
  emailVerified: boolean;
  slug: string;
  displayName: string;
  subtitle: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  showAvatar: boolean;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  facebookUrl: string | null;
  whatsappNumber: string | null;
  twitterUrl: string | null;
  telegramUrl: string | null;
  snapchatUrl: string | null;
  websiteUrl: string | null;
  themeId: string;
  themeFont: string;
  themeColors: { primary?: string; background?: string; button?: string } | null;
  bgImageUrl: string | null;
  headerLayout: string;
  imageStyle: string | null;
  timezone: string;
  metaPixelId: string | null;
  googleAdsId: string | null;
  googleAnalyticsId: string | null;
  tiktokPixelId: string | null;
  payoutPhone: string | null;
  payoutProvider: string | null;
  plan: Plan;
  kycStatus?: string;
  isFlagged?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Block {
  id: string;
  sellerId: string;
  type: BlockType;
  title: string;
  position: number;
  isActive: boolean;
  config: Record<string, unknown>;
  product: Product | null;
  bookingService: (BookingService & { slots: BookingSlot[] }) | null;
  community: Community | null;
  createdAt: string;
  updatedAt: string;
}

export type LeadFieldType = "name" | "email" | "phone" | "whatsapp" | "custom";

export interface LeadField {
  id: string;
  type: LeadFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
}

export interface ProductFile {
  url: string;
  fileName: string;
  fileSize?: number;
}

export interface Product {
  id: string;
  blockId: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  currency: string;
  coverUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  files: ProductFile[] | null;
  redirectUrl: string | null;
  buttonText: string;
  ctaStyle: string;
  discountPrice: number | null;
  confirmationEmailSubject: string | null;
  confirmationEmailBody: string | null;
  leadFields: LeadField[] | null;
  maxSubscribers: number | null;
  showSubscriberCount: boolean;
  totalSales: number;
  totalRevenue: number;
  reviews: Review[];
  orderBumps: OrderBump[];
}

export interface Review {
  id: string;
  productId: string;
  name: string;
  text: string;
  rating: number;
  avatarUrl: string | null;
  position: number;
  createdAt: string;
}

export interface OrderBump {
  id: string;
  productId: string;
  title: string;
  description: string | null;
  price: number;
  fileUrl: string | null;
  fileName: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface BookingService {
  id: string;
  blockId: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  duration: number;
  location: string | null;
  coverUrl: string | null;
  buttonText: string | null;
  ctaStyle: string;
  minAdvanceHours: number;
  confirmationEmailSubject: string | null;
  confirmationEmailBody: string | null;
  slots?: BookingSlot[];
}

export interface BookingSlot {
  id: string;
  bookingServiceId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface Order {
  id: string;
  reference: string;
  sellerId: string;
  orderType: OrderType;
  amount: number;
  currency: string;
  commissionRate: number;
  commissionAmount: number;
  sellerAmount: number;
  paymentStatus: PaymentStatus;
  paymentProvider: string;
  paymentExternalId: string | null;
  paymentOperator: string | null;
  paidAt: string | null;
  customerEmail: string;
  customerName: string | null;
  customerPhone: string | null;
  productId: string | null;
  bookingServiceId: string | null;
  downloadUrl: string | null;
  downloadCount: number;
  downloadExpiresAt: string | null;
  bookingDate: string | null;
  bookingDuration: number | null;
  bookingLocation: string | null;
  bookingCancelled: boolean;
  paymentNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  sellerId: string;
  email: string;
  name: string | null;
  phone: string | null;
  totalSpent: number;
  orderCount: number;
  createdAt: string;
}

// ── Community Telegram ──
export type BillingPeriod = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface Community {
  id: string;
  sellerId: string;
  blockId: string;
  telegramChatId: string;
  telegramChatTitle: string | null;
  title: string;
  description: string | null;
  coverUrl: string | null;
  priceAmount: number;
  currency: string;
  billingPeriod: BillingPeriod;
  subscribeFields: LeadField[] | null;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export type CommunitySubscriptionStatus = "ACTIVE" | "GRACE_PERIOD" | "CANCELED" | "EXPIRED" | "PENDING";

export interface CommunitySubscription {
  id: string;
  communityId: string;
  memberEmail: string;
  memberName: string | null;
  telegramUsername: string | null;
  telegramUserId: string | null;
  status: CommunitySubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  lastPaymentAt: string | null;
  gracePeriodEnd: string | null;
  canceledAt: string | null;
  inviteLink: string | null;
  inviteLinkExpiresAt: string | null;
  lockedPrice: number;
  createdAt: string;
}

// ── Types composites ──
export type SellerWithBlocks = Seller & { blocks: Block[] };

// ── Thèmes / Templates de page vendeur ──

export type CardStyle = "bordered" | "elevated" | "flat" | "glass";
export type BackgroundType = "solid" | "gradient";
export type HeaderStyle = "centered" | "left" | "pro" | "compact" | "hero" | "editorial" | "banner" | "sadio";
export type AvatarStyle = "circle" | "rounded" | "square";
export type BlockLayout = "default" | "compact-row" | "card-image-top" | "minimal-stack";
export type SocialPosition = "header" | "footer";
export type ThemeCategory = "popular" | "creator" | "dark" | "elegant" | "colorful" | "coach";

export interface Theme {
  id: string;
  name: string;
  category: ThemeCategory;
  // Couleurs
  primary: string;
  background: string;
  backgroundGradient?: string;
  backgroundType: BackgroundType;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  // Boutons
  buttonStyle: "filled" | "outline" | "soft";
  buttonRadius: string;
  buttonTextColor: string;
  // Cartes
  cardRadius: string;
  cardStyle: CardStyle;
  cardShadow: string;
  // Layout
  blockSpacing: string;
  blockLayout: BlockLayout;
  headerStyle: HeaderStyle;
  avatarStyle: AvatarStyle;
  socialPosition: SocialPosition;
  supportsCover: boolean;
  supportsBackgroundImage: boolean;
  // Modal
  modalBg: string;
  modalBorder: string;
  modalTextPrimary: string;
  modalTextSecondary: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
}

export const THEMES: Theme[] = [
  // ── Izy (défaut) — Cards bordurées classiques ──
  {
    id: "default",
    name: "Izy",
    category: "popular",
    primary: "#0D9488",
    background: "#FFFFFF",
    backgroundType: "solid",
    cardBg: "#FFFFFF",
    cardBorder: "#E5E7EB",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    buttonStyle: "filled",
    buttonRadius: "12px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "16px",
    cardStyle: "bordered",
    cardShadow: "none",
    blockSpacing: "12px",
    blockLayout: "default",
    headerStyle: "centered",
    avatarStyle: "circle",
    socialPosition: "footer",
    supportsCover: false,
    supportsBackgroundImage: false,
    modalBg: "#FFFFFF",
    modalBorder: "#F3F4F6",
    modalTextPrimary: "#111827",
    modalTextSecondary: "#6B7280",
    inputBg: "#FFFFFF",
    inputBorder: "#D1D5DB",
    inputText: "#111827",
  },
  // ── Sahel — Left-aligned, minimal elevated cards ──
  {
    id: "sahel",
    name: "Sahel",
    category: "elegant",
    primary: "#111827",
    background: "#FAFAFA",
    backgroundType: "solid",
    cardBg: "#FFFFFF",
    cardBorder: "transparent",
    textPrimary: "#111827",
    textSecondary: "#9CA3AF",
    buttonStyle: "filled",
    buttonRadius: "6px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "8px",
    cardStyle: "elevated",
    cardShadow: "0 1px 3px rgba(0,0,0,0.08)",
    blockSpacing: "10px",
    blockLayout: "minimal-stack",
    headerStyle: "left",
    avatarStyle: "rounded",
    socialPosition: "footer",
    supportsCover: false,
    supportsBackgroundImage: false,
    modalBg: "#FFFFFF",
    modalBorder: "#F3F4F6",
    modalTextPrimary: "#111827",
    modalTextSecondary: "#6B7280",
    inputBg: "#FAFAFA",
    inputBorder: "#E5E7EB",
    inputText: "#111827",
  },
  // ── Nuit — Dark mode, image-top cards ──
  {
    id: "nuit",
    name: "Nuit",
    category: "dark",
    primary: "#FFFFFF",
    background: "#0F0F0F",
    backgroundType: "solid",
    cardBg: "#1A1A1A",
    cardBorder: "#2A2A2A",
    textPrimary: "#F5F5F5",
    textSecondary: "#737373",
    buttonStyle: "outline",
    buttonRadius: "8px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "16px",
    cardStyle: "bordered",
    cardShadow: "none",
    blockSpacing: "14px",
    blockLayout: "card-image-top",
    headerStyle: "centered",
    avatarStyle: "square",
    socialPosition: "header",
    supportsCover: true,
    supportsBackgroundImage: false,
    modalBg: "#1A1A1A",
    modalBorder: "#2A2A2A",
    modalTextPrimary: "#F5F5F5",
    modalTextSecondary: "#737373",
    inputBg: "#0F0F0F",
    inputBorder: "#2A2A2A",
    inputText: "#F5F5F5",
  },
  // ── Indigo — Gradient glass, centered ──
  {
    id: "indigo",
    name: "Indigo",
    category: "dark",
    primary: "#A855F7",
    background: "#1E1B4B",
    backgroundType: "gradient",
    backgroundGradient: "linear-gradient(135deg, #1E1B4B 0%, #4C1D95 50%, #7C3AED 100%)",
    cardBg: "rgba(255,255,255,0.1)",
    cardBorder: "rgba(255,255,255,0.15)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.65)",
    buttonStyle: "filled",
    buttonRadius: "12px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "20px",
    cardStyle: "glass",
    cardShadow: "0 8px 32px rgba(0,0,0,0.2)",
    blockSpacing: "16px",
    blockLayout: "default",
    headerStyle: "centered",
    avatarStyle: "circle",
    socialPosition: "footer",
    supportsCover: false,
    supportsBackgroundImage: false,
    modalBg: "#1E1B4B",
    modalBorder: "rgba(255,255,255,0.15)",
    modalTextPrimary: "#FFFFFF",
    modalTextSecondary: "rgba(255,255,255,0.65)",
    inputBg: "rgba(255,255,255,0.1)",
    inputBorder: "rgba(255,255,255,0.2)",
    inputText: "#FFFFFF",
  },
  // ── Nia — Pink, image-top cards with soft buttons ──
  {
    id: "nia",
    name: "Nia",
    category: "creator",
    primary: "#EC4899",
    background: "#FDF2F8",
    backgroundType: "solid",
    cardBg: "#FFFFFF",
    cardBorder: "#FBCFE8",
    textPrimary: "#831843",
    textSecondary: "#9CA3AF",
    buttonStyle: "soft",
    buttonRadius: "16px",
    buttonTextColor: "#EC4899",
    cardRadius: "20px",
    cardStyle: "bordered",
    cardShadow: "none",
    blockSpacing: "14px",
    blockLayout: "card-image-top",
    headerStyle: "centered",
    avatarStyle: "circle",
    socialPosition: "footer",
    supportsCover: false,
    supportsBackgroundImage: false,
    modalBg: "#FFFFFF",
    modalBorder: "#FBCFE8",
    modalTextPrimary: "#831843",
    modalTextSecondary: "#9CA3AF",
    inputBg: "#FDF2F8",
    inputBorder: "#FBCFE8",
    inputText: "#831843",
  },
  // ── Djolof — Clean white/blue, compact horizontal rows ──
  {
    id: "djolof",
    name: "Djolof",
    category: "popular",
    primary: "#2563EB",
    background: "#FFFFFF",
    backgroundType: "solid",
    cardBg: "#FFFFFF",
    cardBorder: "#E5E7EB",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    buttonStyle: "filled",
    buttonRadius: "9999px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "14px",
    cardStyle: "bordered",
    cardShadow: "none",
    blockSpacing: "12px",
    blockLayout: "compact-row",
    headerStyle: "centered",
    avatarStyle: "circle",
    socialPosition: "header",
    supportsCover: false,
    supportsBackgroundImage: false,
    modalBg: "#FFFFFF",
    modalBorder: "#E5E7EB",
    modalTextPrimary: "#111827",
    modalTextSecondary: "#6B7280",
    inputBg: "#F9FAFB",
    inputBorder: "#D1D5DB",
    inputText: "#111827",
  },
  // ── Baobab — Elegant warm tones, minimal stack ──
  {
    id: "baobab",
    name: "Baobab",
    category: "elegant",
    primary: "#78716C",
    background: "#FAFAF9",
    backgroundType: "solid",
    cardBg: "#FFFFFF",
    cardBorder: "#E7E5E4",
    textPrimary: "#292524",
    textSecondary: "#78716C",
    buttonStyle: "filled",
    buttonRadius: "8px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "12px",
    cardStyle: "bordered",
    cardShadow: "none",
    blockSpacing: "12px",
    blockLayout: "minimal-stack",
    headerStyle: "centered",
    avatarStyle: "rounded",
    socialPosition: "footer",
    supportsCover: false,
    supportsBackgroundImage: false,
    modalBg: "#FFFFFF",
    modalBorder: "#E7E5E4",
    modalTextPrimary: "#292524",
    modalTextSecondary: "#78716C",
    inputBg: "#FAFAF9",
    inputBorder: "#D6D3D1",
    inputText: "#292524",
  },
  // ── Adjua — Soft lavender, compact rows ──
  {
    id: "adjua",
    name: "Adjua",
    category: "colorful",
    primary: "#7C3AED",
    background: "#FAF5FF",
    backgroundType: "gradient",
    backgroundGradient: "linear-gradient(180deg, #EDE9FE 0%, #FAF5FF 40%, #FFFFFF 100%)",
    cardBg: "#FFFFFF",
    cardBorder: "#E9D5FF",
    textPrimary: "#3B0764",
    textSecondary: "#7C3AED",
    buttonStyle: "filled",
    buttonRadius: "12px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "18px",
    cardStyle: "bordered",
    cardShadow: "0 2px 8px rgba(124,58,237,0.06)",
    blockSpacing: "14px",
    blockLayout: "compact-row",
    headerStyle: "centered",
    avatarStyle: "circle",
    socialPosition: "footer",
    supportsCover: false,
    supportsBackgroundImage: false,
    modalBg: "#FFFFFF",
    modalBorder: "#E9D5FF",
    modalTextPrimary: "#3B0764",
    modalTextSecondary: "#7C3AED",
    inputBg: "#FAF5FF",
    inputBorder: "#DDD6FE",
    inputText: "#3B0764",
  },
  // ── Mansa — Warm gold luxury, cream bg, warm cards with gold accents ──
  {
    id: "mansa",
    name: "Mansa",
    category: "elegant",
    primary: "#92400E",
    background: "#FEF3C7",
    backgroundType: "gradient",
    backgroundGradient: "linear-gradient(180deg, #FDE68A 0%, #FEF3C7 30%, #FFFBEB 100%)",
    cardBg: "#FFFBEB",
    cardBorder: "#D97706",
    textPrimary: "#1C1917",
    textSecondary: "#78716C",
    buttonStyle: "filled",
    buttonRadius: "8px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "14px",
    cardStyle: "elevated",
    cardShadow: "0 4px 12px rgba(0,0,0,0.08)",
    blockSpacing: "14px",
    blockLayout: "compact-row",
    headerStyle: "centered",
    avatarStyle: "rounded",
    socialPosition: "header",
    supportsCover: true,
    supportsBackgroundImage: false,
    modalBg: "#FFFBEB",
    modalBorder: "#FDE68A",
    modalTextPrimary: "#1C1917",
    modalTextSecondary: "#78716C",
    inputBg: "#FFFBEB",
    inputBorder: "#FDE68A",
    inputText: "#1C1917",
  },
  // ── Okapi — Dark + orange gradient top, bold accent, inspired by Eddie ──
  {
    id: "okapi",
    name: "Okapi",
    category: "dark",
    primary: "#EA580C",
    background: "#0A0A0A",
    backgroundType: "gradient",
    backgroundGradient: "linear-gradient(180deg, #EA580C 0%, #431407 25%, #0A0A0A 50%)",
    cardBg: "#171717",
    cardBorder: "#262626",
    textPrimary: "#FAFAFA",
    textSecondary: "#A3A3A3",
    buttonStyle: "outline",
    buttonRadius: "8px",
    buttonTextColor: "#FAFAFA",
    cardRadius: "14px",
    cardStyle: "bordered",
    cardShadow: "none",
    blockSpacing: "12px",
    blockLayout: "compact-row",
    headerStyle: "centered",
    avatarStyle: "circle",
    socialPosition: "header",
    supportsCover: true,
    supportsBackgroundImage: true,
    modalBg: "#171717",
    modalBorder: "#262626",
    modalTextPrimary: "#FAFAFA",
    modalTextSecondary: "#A3A3A3",
    inputBg: "#0A0A0A",
    inputBorder: "#262626",
    inputText: "#FAFAFA",
  },
  // ── Teranga — Terracotta/brown on white, clean elevated cards, inspired by Abigail ──
  {
    id: "teranga",
    name: "Teranga",
    category: "creator",
    primary: "#991B1B",
    background: "#FFFFFF",
    backgroundType: "solid",
    cardBg: "#FFFFFF",
    cardBorder: "#FEE2E2",
    textPrimary: "#1C1917",
    textSecondary: "#78716C",
    buttonStyle: "filled",
    buttonRadius: "12px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "16px",
    cardStyle: "elevated",
    cardShadow: "0 2px 8px rgba(0,0,0,0.06)",
    blockSpacing: "14px",
    blockLayout: "card-image-top",
    headerStyle: "centered",
    avatarStyle: "circle",
    socialPosition: "header",
    supportsCover: true,
    supportsBackgroundImage: false,
    modalBg: "#FFFFFF",
    modalBorder: "#FEE2E2",
    modalTextPrimary: "#1C1917",
    modalTextSecondary: "#78716C",
    inputBg: "#FEF2F2",
    inputBorder: "#FECACA",
    inputText: "#1C1917",
  },
  // ── Horizon — Bold warm sunset gradient, glass cards ──
  {
    id: "horizon",
    name: "Horizon",
    category: "colorful",
    primary: "#FFFFFF",
    background: "#F97316",
    backgroundType: "gradient" as BackgroundType,
    backgroundGradient: "linear-gradient(160deg, #F97316 0%, #EC4899 40%, #8B5CF6 100%)",
    cardBg: "rgba(255,255,255,0.15)",
    cardBorder: "rgba(255,255,255,0.25)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.75)",
    buttonStyle: "filled" as const,
    buttonRadius: "12px",
    buttonTextColor: "#7C2D12",
    cardRadius: "20px",
    cardStyle: "glass" as CardStyle,
    cardShadow: "0 8px 32px rgba(0,0,0,0.15)",
    blockSpacing: "14px",
    blockLayout: "default" as BlockLayout,
    headerStyle: "centered" as HeaderStyle,
    avatarStyle: "circle" as AvatarStyle,
    socialPosition: "header" as SocialPosition,
    supportsCover: true,
    supportsBackgroundImage: true,
    modalBg: "#FFFFFF",
    modalBorder: "#F3F4F6",
    modalTextPrimary: "#111827",
    modalTextSecondary: "#6B7280",
    inputBg: "#F9FAFB",
    inputBorder: "#E5E7EB",
    inputText: "#111827",
  },
  // ── Pro — Premium creator layout: name+socials top, hero image, elevated cards ──
  {
    id: "pro",
    name: "Pro",
    category: "creator",
    primary: "#6C3AED",
    background: "#FAF7F2",
    backgroundType: "solid",
    cardBg: "#FFFFFF",
    cardBorder: "#F0ECE5",
    textPrimary: "#1A1523",
    textSecondary: "#78716C",
    buttonStyle: "filled",
    buttonRadius: "14px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "20px",
    cardStyle: "elevated",
    cardShadow: "0 4px 16px rgba(0,0,0,0.06)",
    blockSpacing: "14px",
    blockLayout: "card-image-top",
    headerStyle: "pro",
    avatarStyle: "rounded",
    socialPosition: "header",
    supportsCover: true,
    supportsBackgroundImage: true,
    modalBg: "#FFFFFF",
    modalBorder: "#F3F4F6",
    modalTextPrimary: "#1A1523",
    modalTextSecondary: "#78716C",
    inputBg: "#FAF7F2",
    inputBorder: "#E7E5E4",
    inputText: "#1A1523",
  },
  // ── Forêt — Deep forest green gradient, semi-transparent cards ──
  {
    id: "foret",
    name: "Forêt",
    category: "colorful",
    primary: "#86EFAC",
    background: "#052E16",
    backgroundType: "gradient" as BackgroundType,
    backgroundGradient: "linear-gradient(180deg, #052E16 0%, #14532D 50%, #166534 100%)",
    cardBg: "rgba(255,255,255,0.08)",
    cardBorder: "rgba(134,239,172,0.2)",
    textPrimary: "#F0FDF4",
    textSecondary: "rgba(255,255,255,0.6)",
    buttonStyle: "filled" as const,
    buttonRadius: "10px",
    buttonTextColor: "#052E16",
    cardRadius: "16px",
    cardStyle: "glass" as CardStyle,
    cardShadow: "0 4px 16px rgba(0,0,0,0.2)",
    blockSpacing: "14px",
    blockLayout: "minimal-stack" as BlockLayout,
    headerStyle: "left" as HeaderStyle,
    avatarStyle: "rounded" as AvatarStyle,
    socialPosition: "header" as SocialPosition,
    supportsCover: true,
    supportsBackgroundImage: true,
    modalBg: "#FFFFFF",
    modalBorder: "#F3F4F6",
    modalTextPrimary: "#111827",
    modalTextSecondary: "#6B7280",
    inputBg: "#F9FAFB",
    inputBorder: "#E5E7EB",
    inputText: "#111827",
  },
  // ── Kora — Compact top-left avatar, terracotta/warm brown, elevated cards ──
  {
    id: "kora",
    name: "Kora",
    category: "creator" as ThemeCategory,
    primary: "#7F1D1D",
    background: "#FFFFFF",
    backgroundType: "solid" as BackgroundType,
    cardBg: "#FFFFFF",
    cardBorder: "#F5F5F4",
    textPrimary: "#1C1917",
    textSecondary: "#78716C",
    buttonStyle: "filled" as const,
    buttonRadius: "14px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "16px",
    cardStyle: "elevated" as CardStyle,
    cardShadow: "0 2px 8px rgba(0,0,0,0.06)",
    blockSpacing: "12px",
    blockLayout: "card-image-top" as BlockLayout,
    headerStyle: "compact" as HeaderStyle,
    avatarStyle: "circle" as AvatarStyle,
    socialPosition: "header" as SocialPosition,
    supportsCover: false,
    supportsBackgroundImage: false,
    modalBg: "#FFFFFF",
    modalBorder: "#E7E5E4",
    modalTextPrimary: "#1C1917",
    modalTextSecondary: "#78716C",
    inputBg: "#FAFAF9",
    inputBorder: "#D6D3D1",
    inputText: "#1C1917",
  },
  // ── Diva — Warm cream + deep purple, pro layout, full-bleed bg image (inspiré Tatiana) ──
  {
    id: "diva",
    name: "Diva",
    category: "creator" as ThemeCategory,
    primary: "#7C3AED",
    background: "#F5E6D3",
    backgroundType: "solid" as BackgroundType,
    cardBg: "#F5E6D3",
    cardBorder: "#E8D5C0",
    textPrimary: "#1C1917",
    textSecondary: "#78716C",
    buttonStyle: "filled" as const,
    buttonRadius: "12px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "16px",
    cardStyle: "elevated" as CardStyle,
    cardShadow: "0 4px 16px rgba(0,0,0,0.08)",
    blockSpacing: "14px",
    blockLayout: "card-image-top" as BlockLayout,
    headerStyle: "hero" as HeaderStyle,
    avatarStyle: "circle" as AvatarStyle,
    socialPosition: "header" as SocialPosition,
    supportsCover: true,
    supportsBackgroundImage: true,
    modalBg: "#FFFFFF",
    modalBorder: "#E8D5C0",
    modalTextPrimary: "#1C1917",
    modalTextSecondary: "#78716C",
    inputBg: "#FFF9F2",
    inputBorder: "#E8D5C0",
    inputText: "#1C1917",
  },
  // ── Aura — Glass cards + violet, pro layout, full-bleed bg image (inspiré Millie) ──
  {
    id: "aura",
    name: "Aura",
    category: "creator" as ThemeCategory,
    primary: "#8B5CF6",
    background: "#F8F6FF",
    backgroundType: "solid" as BackgroundType,
    cardBg: "rgba(255,255,255,0.85)",
    cardBorder: "rgba(255,255,255,0.6)",
    textPrimary: "#1E1B4B",
    textSecondary: "#6B7280",
    buttonStyle: "filled" as const,
    buttonRadius: "14px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "20px",
    cardStyle: "glass" as CardStyle,
    cardShadow: "0 8px 32px rgba(0,0,0,0.08)",
    blockSpacing: "14px",
    blockLayout: "card-image-top" as BlockLayout,
    headerStyle: "hero" as HeaderStyle,
    avatarStyle: "circle" as AvatarStyle,
    socialPosition: "header" as SocialPosition,
    supportsCover: true,
    supportsBackgroundImage: true,
    modalBg: "#FFFFFF",
    modalBorder: "#E9D5FF",
    modalTextPrimary: "#1E1B4B",
    modalTextSecondary: "#6B7280",
    inputBg: "#F8F6FF",
    inputBorder: "#DDD6FE",
    inputText: "#1E1B4B",
  },
  // ── Muse — Warm cream editorial, cover photo en haut, outline buttons (inspiré Priestess) ──
  {
    id: "muse",
    name: "Muse",
    category: "elegant" as ThemeCategory,
    primary: "#1C1917",
    background: "#F2E6D9",
    backgroundType: "solid" as BackgroundType,
    cardBg: "#FAF3EC",
    cardBorder: "#E8D5C0",
    textPrimary: "#1C1917",
    textSecondary: "#78716C",
    buttonStyle: "outline" as const,
    buttonRadius: "8px",
    buttonTextColor: "#1C1917",
    cardRadius: "12px",
    cardStyle: "bordered" as CardStyle,
    cardShadow: "none",
    blockSpacing: "16px",
    blockLayout: "card-image-top" as BlockLayout,
    headerStyle: "editorial" as HeaderStyle,
    avatarStyle: "rounded" as AvatarStyle,
    socialPosition: "header" as SocialPosition,
    supportsCover: true,
    supportsBackgroundImage: false,
    modalBg: "#FFFFFF",
    modalBorder: "#E8D5C0",
    modalTextPrimary: "#1C1917",
    modalTextSecondary: "#78716C",
    inputBg: "#FAF3EC",
    inputBorder: "#E8D5C0",
    inputText: "#1C1917",
  },
  // ── Mentor — Executive coach : autorité, confiance, premium ──
  // Pensé pour les coachs business, consultants, experts.
  // Fond crème chaud, texte slate profond, boutons nets, cards épurées avec ombre chaude.
  // Header left-aligned pour un positionnement expert. Layout minimal-stack pour focus sur le contenu.
  {
    id: "mentor",
    name: "Mentor",
    category: "coach" as ThemeCategory,
    primary: "#1E293B",
    background: "#F8F7F5",
    backgroundType: "solid" as BackgroundType,
    cardBg: "#FFFFFF",
    cardBorder: "#E8E5E0",
    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    buttonStyle: "filled" as const,
    buttonRadius: "6px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "10px",
    cardStyle: "elevated" as CardStyle,
    cardShadow: "0 2px 12px rgba(15,23,42,0.06)",
    blockSpacing: "12px",
    blockLayout: "minimal-stack" as BlockLayout,
    headerStyle: "left" as HeaderStyle,
    avatarStyle: "rounded" as AvatarStyle,
    socialPosition: "footer" as SocialPosition,
    supportsCover: false,
    supportsBackgroundImage: false,
    modalBg: "#FFFFFF",
    modalBorder: "#E8E5E0",
    modalTextPrimary: "#0F172A",
    modalTextSecondary: "#64748B",
    inputBg: "#F8F7F5",
    inputBorder: "#D4D0CA",
    inputText: "#0F172A",
  },
  // ── Ascend — Coach transformation : dynamique, inspirant, visuel ──
  // Pensé pour les coachs fitness, développement personnel, formateurs.
  // Gradient subtil crème→blanc, vert émeraude audacieux, header pro avec hero image.
  // Layout card-image-top pour mettre en avant les visuels de formations/programmes.
  {
    id: "ascend",
    name: "Ascend",
    category: "coach" as ThemeCategory,
    primary: "#065F46",
    background: "#FAFDF7",
    backgroundType: "gradient" as BackgroundType,
    backgroundGradient: "linear-gradient(180deg, #ECFDF5 0%, #FAFDF7 35%, #FFFFFF 100%)",
    cardBg: "#FFFFFF",
    cardBorder: "#D1FAE5",
    textPrimary: "#022C22",
    textSecondary: "#6B7280",
    buttonStyle: "filled" as const,
    buttonRadius: "14px",
    buttonTextColor: "#FFFFFF",
    cardRadius: "20px",
    cardStyle: "elevated" as CardStyle,
    cardShadow: "0 4px 16px rgba(6,95,70,0.06)",
    blockSpacing: "14px",
    blockLayout: "card-image-top" as BlockLayout,
    headerStyle: "pro" as HeaderStyle,
    avatarStyle: "circle" as AvatarStyle,
    socialPosition: "header" as SocialPosition,
    supportsCover: true,
    supportsBackgroundImage: true,
    modalBg: "#FFFFFF",
    modalBorder: "#D1FAE5",
    modalTextPrimary: "#022C22",
    modalTextSecondary: "#6B7280",
    inputBg: "#F0FDF4",
    inputBorder: "#A7F3D0",
    inputText: "#022C22",
  },
];

export const FONTS = [
  { id: "inter", name: "Inter", family: "'Inter', sans-serif" },
  { id: "poppins", name: "Poppins", family: "'Poppins', sans-serif" },
  { id: "dm-sans", name: "DM Sans", family: "'DM Sans', sans-serif" },
  { id: "space-grotesk", name: "Space Grotesk", family: "'Space Grotesk', sans-serif" },
  { id: "playfair", name: "Playfair", family: "'Playfair Display', serif" },
  { id: "lora", name: "Lora", family: "'Lora', serif" },
  { id: "outfit", name: "Outfit", family: "'Outfit', sans-serif" },
  { id: "plus-jakarta", name: "Plus Jakarta Sans", family: "'Plus Jakarta Sans', sans-serif" },
] as const;

export type FontId = (typeof FONTS)[number]["id"];

export interface ThemeConfig {
  themeId: string;
  themeFont: string;
  themeColors: { primary?: string; background?: string; button?: string } | null;
}

export function getResolvedTheme(config: ThemeConfig): Theme & { customButtonColor?: string } {
  const base = THEMES.find((t) => t.id === config.themeId) || THEMES[0];
  if (!config.themeColors) return base;
  return {
    ...base,
    ...(config.themeColors.primary && { primary: config.themeColors.primary }),
    ...(config.themeColors.background && {
      background: config.themeColors.background,
      backgroundType: "solid" as BackgroundType,
      backgroundGradient: undefined,
    }),
    ...(config.themeColors.button && { customButtonColor: config.themeColors.button }),
  };
}

export function getFont(fontId: string) {
  return FONTS.find((f) => f.id === fontId) || FONTS[0];
}

/** Renvoie le style de bouton résolu (background, color, border) avec contraste garanti */
export function getButtonStyle(theme: Theme & { customButtonColor?: string }) {
  const btnColor = theme.customButtonColor || theme.primary;
  if (theme.buttonStyle === "filled") {
    // Filled: texte sur fond coloré — toujours vérifier le contraste
    const candidateText = theme.customButtonColor
      ? getContrastColor(theme.customButtonColor)
      : theme.buttonTextColor;
    return {
      backgroundColor: btnColor,
      color: ensureContrast(btnColor, candidateText),
      border: "none",
    };
  }
  if (theme.buttonStyle === "outline") {
    // Outline: texte coloré sur fond page — vérifier vs background
    const textColor = ensureContrast(theme.background, btnColor);
    return {
      backgroundColor: "transparent",
      color: textColor,
      border: `1.5px solid ${textColor}`,
    };
  }
  // Soft: texte coloré sur fond teinté — vérifier vs background
  const textColor = ensureContrast(theme.background, btnColor);
  return {
    backgroundColor: `${btnColor}18`,
    color: textColor,
    border: "none",
  };
}

/** Renvoie le background CSS (gradient ou solid) */
export function getBackgroundStyle(theme: Theme): React.CSSProperties {
  if (theme.backgroundType === "gradient" && theme.backgroundGradient) {
    return { background: theme.backgroundGradient };
  }
  return { backgroundColor: theme.background };
}

/** Labels des catégories de thèmes */
export const THEME_CATEGORIES: { id: ThemeCategory | "all"; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "popular", label: "Populaires" },
  { id: "creator", label: "Créateur" },
  { id: "elegant", label: "Élégant" },
  { id: "dark", label: "Sombre" },
  { id: "colorful", label: "Coloré" },
  { id: "coach", label: "Coach" },
];

/** Parse un hex en composantes RGB (supporte #RGB et #RRGGBB) */
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const c = hex.replace("#", "");
  if (c.length === 3) {
    return {
      r: parseInt(c[0] + c[0], 16),
      g: parseInt(c[1] + c[1], 16),
      b: parseInt(c[2] + c[2], 16),
    };
  }
  if (c.length >= 6) {
    return {
      r: parseInt(c.substring(0, 2), 16),
      g: parseInt(c.substring(2, 4), 16),
      b: parseInt(c.substring(4, 6), 16),
    };
  }
  return null;
}

/** Calcule la luminance relative WCAG d'une couleur hex */
export function getLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0.5;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

/** Convertit un hex en string RGB "r g b" pour usage dans CSS rgb() / rgba() */
export function hexToRgbString(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "13 148 136";
  return `${rgb.r} ${rgb.g} ${rgb.b}`;
}

/** Renvoie noir ou blanc selon la luminance du hex pour garantir le contraste */
export function getContrastColor(hex: string): string {
  return getLuminance(hex) > 0.55 ? "#000000" : "#FFFFFF";
}

/** Renvoie une couleur de texte accessible (noir/blanc) sur un fond donné — version CSS var safe */
export function getAccessibleTextColor(bgHex: string): string {
  return getContrastColor(bgHex);
}

/**
 * Convertit un canal sRGB (0-255) en linéaire pour le calcul WCAG.
 */
function sRGBtoLinear(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/**
 * Luminance relative WCAG 2.x (range 0–1).
 * Utilise la formule officielle avec gamma correction, pas la formule simplifiée.
 */
function wcagLuminance(r: number, g: number, b: number): number {
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
}

/**
 * Vérifie le contraste WCAG entre texte et fond.
 * Si le ratio est insuffisant (< minRatio), renvoie noir ou blanc automatiquement.
 * minRatio = 3 = WCAG AA pour les textes larges/gras (boutons CTA).
 */
export function ensureContrast(bgHex: string, textHex: string, minRatio = 3): string {
  const bgRgb = parseHex(bgHex);
  const textRgb = parseHex(textHex);
  if (!bgRgb || !textRgb) return getContrastColor(bgHex);
  const bgL = wcagLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const textL = wcagLuminance(textRgb.r, textRgb.g, textRgb.b);
  const lighter = Math.max(bgL, textL);
  const darker = Math.min(bgL, textL);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  if (ratio >= minRatio) return textHex;
  // Auto-fix: choisir noir ou blanc selon ce qui donne le meilleur contraste
  const whiteRatio = (1 + 0.05) / (bgL + 0.05);
  const blackRatio = (bgL + 0.05) / (0 + 0.05);
  return blackRatio > whiteRatio ? "#000000" : "#FFFFFF";
}

// ── Opérateurs mobile money ──
export type PaymentOperator = "wave_money" | "orange_money" | "maxit" | "mtn_money" | "moov" | "togocell" | "mobicash" | "card";

// Opérateurs actuellement activés chez Bictorys (mars 2026)
// Les autres seront activables via l'admin quand Bictorys les active

export interface OperatorInfo {
  id: PaymentOperator;
  name: string;
  color: string;
  bgColor: string;
  logoUrl: string;
}

// Catalogue complet de tous les opérateurs (y compris futurs)
export const ALL_OPERATORS: OperatorInfo[] = [
  { id: "wave_money", name: "Wave", color: "#1DA1F2", bgColor: "#EFF6FF", logoUrl: "/wave.png" },
  { id: "orange_money", name: "Orange Money", color: "#FF6600", bgColor: "#FFF7ED", logoUrl: "/orange-money.png" },
  { id: "maxit", name: "Maxit", color: "#FF6600", bgColor: "#FFF7ED", logoUrl: "/maxit.png" },
  { id: "mtn_money", name: "MTN Money", color: "#FFCC00", bgColor: "#FFFBEB", logoUrl: "/mtn_money.png" },
  { id: "moov", name: "Moov Money", color: "#0066B3", bgColor: "#EFF6FF", logoUrl: "/moov.png" },
  { id: "togocell", name: "Togocell", color: "#00A651", bgColor: "#ECFDF5", logoUrl: "/togocell.png" },
  { id: "mobicash", name: "Mobicash", color: "#E31937", bgColor: "#FEF2F2", logoUrl: "/mobicash.png" },
  { id: "card", name: "Carte bancaire", color: "#6366F1", bgColor: "#EEF2FF", logoUrl: "/visa-mastercard.png" },
];

// Pays supportés pour le checkout
export interface PaymentCountry {
  code: string;
  name: string;
  flag: string;
}

// Catalogue complet des pays (pour l'admin)
export const ALL_PAYMENT_COUNTRIES: PaymentCountry[] = [
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "BJ", name: "Bénin", flag: "🇧🇯" },
  { code: "OTHER", name: "Autre", flag: "🌍" },
];

// Pays actuellement actifs (testés et confirmés avec Bictorys)
export const PAYMENT_COUNTRIES: PaymentCountry[] = [
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "OTHER", name: "Autre", flag: "🌍" },
];

// Mapping pays → opérateurs ACTIFS (testés et confirmés Bictorys mars 2026)
// Les autres combos seront activables via l'admin
const COUNTRY_OPERATORS: Record<string, PaymentOperator[]> = {
  SN: ["wave_money", "orange_money", "maxit", "card"],
  CI: ["wave_money", "orange_money", "mtn_money", "card"],
  OTHER: ["card"],
};

// Mapping complet (pour référence admin — toutes les combos possibles)
export const ALL_COUNTRY_OPERATORS: Record<string, PaymentOperator[]> = {
  SN: ["wave_money", "orange_money", "maxit", "card"],
  CI: ["wave_money", "orange_money", "mtn_money", "moov", "card"],
  BF: ["wave_money", "moov", "mobicash", "card"],
  ML: ["orange_money", "mobicash", "card"],
  TG: ["moov", "togocell", "card"],
  BJ: ["mtn_money", "moov", "card"],
  OTHER: ["card"],
};

export function getOperatorsForCountry(countryCode: string): OperatorInfo[] {
  const ids = COUNTRY_OPERATORS[countryCode] || COUNTRY_OPERATORS.OTHER;
  return ALL_OPERATORS.filter((op) => ids.includes(op.id));
}

// Détecte le pays depuis un numéro de téléphone (indicatif)
export function detectCountryFromPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  const DIAL_MAP: [string, string][] = [
    ["221", "SN"], ["225", "CI"], ["226", "BF"],
    ["223", "ML"], ["228", "TG"], ["229", "BJ"],
  ];
  for (const [dial, code] of DIAL_MAP) {
    if (digits.startsWith(dial)) return code;
  }
  return "SN";
}

// Vérifie si le numéro de téléphone correspond au pays sélectionné
export function isPhoneMismatch(countryCode: string, phone: string): boolean {
  if (countryCode === "OTHER" || !phone) return false;
  return detectCountryFromPhone(phone) !== countryCode;
}

// Retourne si un opérateur est désactivé (phone mismatch → mobile money désactivé, carte toujours active)
export function isOperatorDisabled(operatorId: PaymentOperator, countryCode: string, phone: string): boolean {
  if (operatorId === "card") return false;
  return isPhoneMismatch(countryCode, phone);
}

// Backward compat — les anciens imports de OPERATORS continuent de fonctionner
export const OPERATORS = ALL_OPERATORS.filter((op) => ["wave_money", "orange_money", "maxit", "card"].includes(op.id));

// ── Icônes de blocs lien ──
export type LinkIcon =
  | "instagram"
  | "whatsapp"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "telegram"
  | "twitter"
  | "website"
  | "other";

// ── Limites par plan ──
const IS_DEV = process.env.NODE_ENV === "development";

export const PLAN_LIMITS = {
  FREE: {
    maxBlocks: IS_DEV ? Infinity : 3,
    maxSaleBlocks: IS_DEV ? Infinity : 1,
    maxBookingBlocks: IS_DEV ? Infinity : 1,
    commissionRate: IS_DEV ? 0.03 : 0.05,
    maxStorageMB: IS_DEV ? 1024 : 100,
  },
  PRO: {
    maxBlocks: Infinity,
    maxSaleBlocks: Infinity,
    maxBookingBlocks: Infinity,
    commissionRate: 0.03,
    maxStorageMB: 1024,
  },
} as const;
