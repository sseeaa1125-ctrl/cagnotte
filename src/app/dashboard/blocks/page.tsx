"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, Button, Badge, Modal, Avatar, BlocksPageSkeleton, PullToRefreshIndicator } from "@/components/ui";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { getCache, setCache } from "@/lib/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { PhonePreview } from "@/components/dashboard/PhonePreview";
import { DesignEditor } from "@/components/dashboard/DesignEditor";
import { SlotEditorModal } from "@/components/dashboard/SlotEditorModal";
import { AddBlockModal } from "@/components/dashboard/AddBlockModal";
import gsap from "gsap";
import { revalidateStore } from "@/app/actions";
import type { ThemeConfig } from "@/types";
import {
  Link2,
  ShoppingBag,
  Calendar,
  CreditCard,
  Plus,
  GripVertical,
  Trash2,
  Power,
  Copy,
  Check,
  Pencil,
  ExternalLink,
  Palette,
  Smartphone,
  X,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  Users,
  Heart,
  AlertTriangle,
  Instagram,
  Youtube,
  Facebook,
  MessageCircle,
  Send,
  Twitter,
} from "lucide-react";

function TikTok({ size = 24, className = "" }: { size?: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function Snapchat({ size = 24, className = "" }: { size?: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.922-.214.04-.012.06-.012.1-.012.16 0 .3.044.4.12.1.073.16.18.16.33a.46.46 0 01-.27.39c-.12.06-.27.12-.42.18-.33.13-.78.27-1.14.48-.12.06-.21.18-.24.33a.78.78 0 00.06.45c.54 1.17 1.32 2.16 2.31 2.94.18.15.42.27.63.36.57.24.93.48.93.81 0 .42-.6.66-1.14.81-.18.06-.39.09-.57.15-.42.09-.87.24-.96.51-.03.12-.03.27.03.42.15.33.33.66.33.93 0 .39-.39.6-.78.72-.6.18-1.14.27-1.5.36-.12.03-.21.06-.27.09-.18.12-.27.39-.42.75-.18.42-.42.93-.96 1.26-.6.36-1.38.42-2.04.42-.36 0-.66-.03-.84-.06a4.55 4.55 0 00-.69-.06c-.24 0-.51.03-.81.06-.18.03-.48.06-.84.06-.66 0-1.44-.06-2.04-.42-.54-.33-.78-.84-.96-1.26-.15-.36-.24-.63-.42-.75-.06-.03-.15-.06-.27-.09-.36-.09-.9-.18-1.5-.36-.39-.12-.78-.33-.78-.72 0-.27.18-.6.33-.93.06-.15.06-.3.03-.42-.09-.27-.54-.42-.96-.51-.18-.06-.39-.09-.57-.15-.54-.15-1.14-.39-1.14-.81 0-.33.36-.57.93-.81.21-.09.45-.21.63-.36.99-.78 1.77-1.77 2.31-2.94a.78.78 0 00.06-.45.52.52 0 00-.24-.33c-.36-.21-.81-.36-1.14-.48-.15-.06-.3-.12-.42-.18a.46.46 0 01-.27-.39c0-.15.06-.27.16-.33.1-.08.24-.12.4-.12.04 0 .06 0 .1.01.26.09.62.2.92.22.2 0 .33-.05.4-.09l-.03-.51-.003-.06c-.104-1.628-.23-3.654.3-4.848C7.447 1.069 10.804.793 11.794.793h.412z" />
    </svg>
  );
}

interface BlockItem {
  id: string;
  type: string;
  title: string;
  config: Record<string, unknown>;
  isActive: boolean;
  position: number;
  product: { title: string; price: number; description?: string | null; coverUrl?: string | null; fileUrl?: string | null; fileName?: string | null } | null;
  bookingService: { title: string; price: number; description?: string | null; duration?: number; location?: string | null; coverUrl?: string | null; buttonText?: string | null; slots?: { id: string; dayOfWeek: number; startTime: string; endTime: string }[] } | null;
  community?: { id: string; title: string; description?: string | null; coverUrl?: string | null; priceAmount: number; billingPeriod?: string; memberCount: number } | null;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  LINK: Link2,
  SALE: ShoppingBag,
  BOOKING: Calendar,
  PAYMENT: CreditCard,
  DONATION: Heart,
  FUNDRAISER: Heart,
  FORMATION: ShoppingBag,
  LEAD_MAGNET: ShoppingBag,
  WAITING_LIST: Users,
  PARTNERSHIP: Users,
  COMMUNITY: Users,
};

function getBlockCoverUrl(block: BlockItem): string | null {
  if (block.product?.coverUrl) return block.product.coverUrl;
  if (block.bookingService?.coverUrl) return block.bookingService.coverUrl;
  if (block.community?.coverUrl) return block.community.coverUrl;
  if (block.config?.coverUrl) return block.config.coverUrl as string;
  return null;
}

function getBlockSubtitle(block: BlockItem): string | null {
  switch (block.type) {
    case "SALE": {
      if (!block.product) return null;
      return block.product.price > 0 ? formatPrice(block.product.price) : "Gratuit";
    }
    case "BOOKING": {
      if (!block.bookingService) return null;
      const s = block.bookingService;
      const parts = [formatPrice(s.price)];
      if (s.duration) parts.push(`${s.duration} min`);
      return parts.join(" · ");
    }
    case "LEAD_MAGNET": {
      if (!block.product) return null;
      return block.product.price > 0 ? formatPrice(block.product.price) : "Gratuit";
    }
    case "WAITING_LIST":
      return block.product?.price && block.product.price > 0 ? formatPrice(block.product.price) : "Gratuit";
    case "PAYMENT":
      return "Paiement libre";
    case "DONATION":
      return "Don libre";
    case "FUNDRAISER":
      return "Levée de fonds";
    case "FORMATION": {
      if (!block.product) return null;
      return block.product.price > 0 ? formatPrice(block.product.price) : "Gratuit";
    }
    case "PARTNERSHIP":
      return "Partenariat";
    case "COMMUNITY": {
      if (!block.community) return null;
      const c = block.community;
      return c.priceAmount > 0 ? formatPrice(c.priceAmount) : null;
    }
    case "LINK":
      return (block.config?.url as string) || null;
    default:
      return null;
  }
}

const TYPE_LABELS: Record<string, string> = {
  LINK: "Lien",
  SALE: "Vente",
  BOOKING: "Réservation",
  PAYMENT: "Paiement",
  DONATION: "Don",
  FUNDRAISER: "Levée de fonds",
  FORMATION: "Formation",
  LEAD_MAGNET: "Lead Magnet",
  WAITING_LIST: "Liste d'attente",
  PARTNERSHIP: "Partenariat",
  COMMUNITY: "Communauté",
};

export default function BlocksPage() {
  const router = useRouter();
  const { seller, refreshSeller } = useAuth();
  const { toast } = useToast();
  const cachedBlocks = getCache<{ blocks: BlockItem[] }>("/api/blocks");
  const [blocks, setBlocks] = useState<BlockItem[]>(cachedBlocks?.blocks || []);
  const [loading, setLoading] = useState(!cachedBlocks);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"boutique" | "design">("boutique");
  const [designPulse, setDesignPulse] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDesignPulse(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Theme config — initialiser depuis seller si déjà disponible
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => ({
    themeId: seller?.themeId || "default",
    themeFont: seller?.themeFont || "inter",
    themeColors: seller?.themeColors || null,
  }));

  // Saved state — only updates from seller data or after successful save
  // Used as "reference" for DesignEditor's hasChanges detection
  const [savedThemeConfig, setSavedThemeConfig] = useState<ThemeConfig>(() => ({
    themeId: seller?.themeId || "default",
    themeFont: seller?.themeFont || "inter",
    themeColors: seller?.themeColors || null,
  }));
  const [savedHeaderLayout, setSavedHeaderLayout] = useState(seller?.headerLayout || "centered");
  const [savedImageStyle, setSavedImageStyle] = useState<string | null>(seller?.imageStyle || null);
  const [savedBgImageUrl, setSavedBgImageUrl] = useState<string | null>(seller?.bgImageUrl || null);

  // Block action menu
  const [actionMenuBlockId, setActionMenuBlockId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Mobile preview
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Slot editor
  const [showSlotEditor, setShowSlotEditor] = useState(false);
  const [slotEditorBlockId, setSlotEditorBlockId] = useState("");
  const [slotEditorInitial, setSlotEditorInitial] = useState<{ dayOfWeek: number; startTime: string; endTime: string }[]>([]);

  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [quickAddTarget, setQuickAddTarget] = useState<string | null>(null);

  // Header layout (independent of theme)
  const [headerLayout, setHeaderLayout] = useState("centered");

  // Image style override (null = use theme default)
  const [imageStyle, setImageStyle] = useState<string | null>(null);

  // Background image
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);

  // Unsaved changes navigation guard
  const [designHasChanges, setDesignHasChanges] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);


  // Display name local state (can be edited)
  const [displayName, setDisplayName] = useState("");

  // Drag & drop (desktop)
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Touch drag & drop (mobile)
  const [touchDragIdx, setTouchDragIdx] = useState<number | null>(null);
  const [touchOverIdx, setTouchOverIdx] = useState<number | null>(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const touchDragRef = useRef<HTMLDivElement | null>(null);

  // Block list ref
  const blockListRef = useRef<HTMLDivElement>(null);

  // Prevent page scroll during touch drag (native non-passive listener)
  useEffect(() => {
    if (touchDragIdx === null) return;
    const handler = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", handler, { passive: false });
    return () => document.removeEventListener("touchmove", handler);
  }, [touchDragIdx]);

  // GSAP Animation for blocks
  useEffect(() => {
    if (loading || !blocks.length || activeTab !== "boutique") return;
    
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-block-idx]",
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out", clearProps: "all" }
      );
    }, blockListRef);

    return () => ctx.revert();
  }, [loading, blocks.length, activeTab]);

  const fetchBlocks = useCallback(async () => {
    try {
      const res = await api<{ blocks: BlockItem[] }>("/api/blocks");
      setBlocks(res.blocks);
      setCache("/api/blocks", res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  // Pull to refresh
  const { containerRef: pullRefreshRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: fetchBlocks,
  });

  // Sync seller data from AuthContext
  useEffect(() => {
    if (!seller) return;
    setDisplayName(seller.displayName);
    const config: ThemeConfig = {
      themeId: seller.themeId || "default",
      themeFont: seller.themeFont || "inter",
      themeColors: seller.themeColors || null,
    };
    setThemeConfig(config);
    setSavedThemeConfig(config);
    const layout = seller.headerLayout || "centered";
    setHeaderLayout(layout);
    setSavedHeaderLayout(layout);
    const imgStyle = seller.imageStyle || null;
    setImageStyle(imgStyle);
    setSavedImageStyle(imgStyle);
    const bgImg = seller.bgImageUrl || null;
    setBgImageUrl(bgImg);
    setSavedBgImageUrl(bgImg);
  }, [seller]);

  // ── Navigation guard: beforeunload for hard navigation ──
  useEffect(() => {
    if (!designHasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [designHasChanges]);

  // ── Navigation guard: intercept client-side link clicks ──
  useEffect(() => {
    if (!designHasChanges) return;
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      // Internal link — block and show modal
      e.preventDefault();
      e.stopPropagation();
      pendingAction.current = () => router.push(href);
      setShowLeaveModal(true);
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [designHasChanges, router]);

  // Helper: attempt navigation or tab switch, guarded by unsaved changes
  function guardedAction(action: () => void) {
    if (designHasChanges) {
      pendingAction.current = action;
      setShowLeaveModal(true);
    } else {
      action();
    }
  }

  function confirmLeave() {
    setDesignHasChanges(false);
    setShowLeaveModal(false);
    // Execute pending action on next tick after guard is cleared
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) setTimeout(action, 0);
  }

  const [isSavingAndQuitting, setIsSavingAndQuitting] = useState(false);

  async function saveAndQuit() {
    setIsSavingAndQuitting(true);
    try {
      const parentThemeColors =
        !themeConfig.themeColors?.primary &&
        !themeConfig.themeColors?.background &&
        !themeConfig.themeColors?.button
          ? null
          : {
              primary: themeConfig.themeColors?.primary || undefined,
              background: themeConfig.themeColors?.background || undefined,
              button: themeConfig.themeColors?.button || undefined,
            };

      await api("/api/sellers/theme", {
        method: "PUT",
        body: {
          themeId: themeConfig.themeId,
          themeFont: themeConfig.themeFont,
          themeColors: parentThemeColors,
          bgImageUrl: bgImageUrl,
          headerLayout: headerLayout,
          imageStyle: imageStyle,
        },
      });
      toast("Design sauvegardé !");
      
      // Update local baseline state so guards pass
      setSavedThemeConfig(themeConfig);
      setSavedHeaderLayout(headerLayout);
      setSavedImageStyle(imageStyle);
      setSavedBgImageUrl(bgImageUrl);
      setDesignHasChanges(false);
      setShowLeaveModal(false);
      
      // Proceed to intended route
      const action = pendingAction.current;
      pendingAction.current = null;
      if (action) setTimeout(action, 0);
    } catch {
      toast("Erreur lors de la sauvegarde avant de quitter", "error");
    } finally {
      setIsSavingAndQuitting(false);
    }
  }

  function cancelLeave() {
    setShowLeaveModal(false);
    pendingAction.current = null;
  }

  function copyUrl() {
    if (!seller) return;
    navigator.clipboard.writeText(`https://izy.store/${seller.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openProfileEdit() {
    router.push("/dashboard/blocks/profile");
  }

  async function handleToggle(block: BlockItem) {
    try {
      await api(`/api/blocks/${block.id}`, {
        method: "PUT",
        body: { isActive: !block.isActive },
      });
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === block.id ? { ...b, isActive: !b.isActive } : b
        )
      );
      if (seller?.slug) revalidateStore(seller.slug);
      toast(block.isActive ? "Bloc désactivé" : "Bloc activé");
    } catch {
      toast("Erreur lors de la mise à jour", "error");
    }
  }

  async function handleReorder(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const reordered = [...blocks];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setBlocks(reordered);
    try {
      await api("/api/blocks/reorder", {
        method: "PATCH",
        body: { blockIds: reordered.map((b) => b.id) },
      });
      if (seller?.slug) revalidateStore(seller.slug);
    } catch {
      fetchBlocks();
    }
  }

  // ── Touch drag handlers (mobile) ──
  function handleTouchStart(idx: number, e: React.TouchEvent) {
    setTouchDragIdx(idx);
    setTouchOverIdx(idx);
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    const el = (e.target as HTMLElement).closest("[data-block-idx]") as HTMLDivElement | null;
    if (el) {
      touchDragRef.current = el;
      el.style.zIndex = "50";
      el.style.transition = "none";
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchDragIdx === null || !blockListRef.current) return;
    const y = e.touches[0].clientY;
    touchCurrentY.current = y;

    // Apply visual offset to dragged element
    if (touchDragRef.current) {
      const dy = y - touchStartY.current;
      touchDragRef.current.style.transform = `translateY(${dy}px)`;
      touchDragRef.current.style.opacity = "0.8";
    }

    // Determine which block we're over
    const children = blockListRef.current.querySelectorAll<HTMLElement>("[data-block-idx]");
    for (const child of children) {
      const rect = child.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        const overIdx = parseInt(child.dataset.blockIdx || "0", 10);
        if (overIdx !== touchOverIdx) setTouchOverIdx(overIdx);
        break;
      }
    }
  }

  function handleTouchEnd() {
    if (touchDragIdx !== null && touchOverIdx !== null && touchDragIdx !== touchOverIdx) {
      handleReorder(touchDragIdx, touchOverIdx);
    }
    // Reset visual state
    if (touchDragRef.current) {
      touchDragRef.current.style.transform = "";
      touchDragRef.current.style.opacity = "";
      touchDragRef.current.style.zIndex = "";
      touchDragRef.current.style.transition = "";
      touchDragRef.current = null;
    }
    setTouchDragIdx(null);
    setTouchOverIdx(null);
  }

  async function handleDelete(blockId: string) {
    if (deleting) return;
    setDeleting(true);
    try {
      await api(`/api/blocks/${blockId}`, {
        method: "DELETE",
      });
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      toast("Bloc supprimé");
      if (seller?.slug) revalidateStore(seller.slug).catch(() => {});
    } catch (err) {
      console.error("[handleDelete]", err);
      toast("Erreur lors de la suppression", "error");
    } finally {
      setDeleting(false);
      setDeleteBlockId(null);
    }
  }

  if (loading || !seller) {
    return <BlocksPageSkeleton />;
  }

  return (
    <div ref={pullRefreshRef} className="min-h-screen">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">Mon Store</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={copyUrl}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-teal-600 border border-gray-200 transition-colors hover:bg-gray-50"
          >
            <span className="hidden sm:inline">izy.store/{seller.slug}</span>
            <span className="sm:hidden">Copier le lien</span>
            {copied ? (
              <Check size={14} className="text-teal-600" />
            ) : (
              <Copy size={14} />
            )}
          </button>
          <a
            id="tour-my-store"
            href={`/${seller.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-teal-600"
            aria-label="Voir mon store"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Onglets : Ma Boutique / Design */}
      <div className="mt-4 flex gap-2">
        <button
          id="tour-boutique-tab"
          onClick={() => guardedAction(() => setActiveTab("boutique"))}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "boutique"
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <ShoppingBag size={14} />
          Ma Boutique
        </button>
        <button
          id="tour-design-tab"
          onClick={() => { setActiveTab("design"); setDesignPulse(false); }}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "design"
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          } ${designPulse && activeTab !== "design" ? "animate-design-pulse" : ""}`}
        >
          <Palette size={14} />
          Design
        </button>
      </div>

      {/* Two-column layout: Editor + Phone Preview */}
      <div className="mt-6 flex gap-8">
        {/* Left column: Editor */}
        <div className="min-w-0 flex-1">
          {/* Design Editor tab */}
          {activeTab === "design" && (
            <DesignEditor
              currentThemeId={savedThemeConfig.themeId}
              currentFont={savedThemeConfig.themeFont}
              currentColors={savedThemeConfig.themeColors}
              currentBgImageUrl={savedBgImageUrl}
              currentHeaderLayout={savedHeaderLayout}
              currentImageStyle={savedImageStyle}
              onThemeChange={setThemeConfig}
              onHeaderLayoutChange={setHeaderLayout}
              onImageStyleChange={setImageStyle}
              onBgImageChange={setBgImageUrl}
              onSave={() => {
                setSavedThemeConfig(themeConfig);
                setSavedHeaderLayout(headerLayout);
                setSavedImageStyle(imageStyle);
                setSavedBgImageUrl(bgImageUrl);
                refreshSeller();
                if (seller?.slug) revalidateStore(seller.slug);
              }}
              onHasChangesChange={setDesignHasChanges}
            />
          )}

          {/* Store tab content */}
          {activeTab === "boutique" && (
          <>
          {/* Profile section */}
          <Card className="relative">
            <div className="flex items-center gap-4">
              <Avatar src={seller.avatarUrl} alt={displayName} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-base font-bold text-gray-900">
                    {displayName}
                  </h2>
                  <button
                    onClick={openProfileEdit}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-teal-50 hover:text-teal-600"
                    aria-label="Modifier le profil"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
                <p className="text-sm text-gray-400">@{seller.slug}</p>
                {seller?.bio && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">{seller.bio}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {/* Added/Existing social links without '+' */}
                  {seller?.instagramUrl && (
                    <button aria-label="Modifier Instagram" onClick={() => { setIsAddModalOpen(true); setQuickAddTarget("Instagram"); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                      <Instagram size={14} />
                    </button>
                  )}
                  {seller?.tiktokUrl && (
                    <button aria-label="Modifier TikTok" onClick={() => { setIsAddModalOpen(true); setQuickAddTarget("TikTok"); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                      <TikTok size={14} />
                    </button>
                  )}
                  {seller?.youtubeUrl && (
                    <button aria-label="Modifier YouTube" onClick={() => { setIsAddModalOpen(true); setQuickAddTarget("YouTube"); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                      <Youtube size={14} />
                    </button>
                  )}
                  {seller?.facebookUrl && (
                    <button aria-label="Modifier Facebook" onClick={() => { setIsAddModalOpen(true); setQuickAddTarget("Facebook"); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                      <Facebook size={14} />
                    </button>
                  )}
                  {seller?.whatsappNumber && (
                    <button aria-label="Modifier WhatsApp" onClick={() => openProfileEdit()} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                      <MessageCircle size={14} />
                    </button>
                  )}
                  {seller?.twitterUrl && (
                    <button aria-label="Modifier Twitter" onClick={() => { setIsAddModalOpen(true); setQuickAddTarget("Twitter"); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                      <Twitter size={14} />
                    </button>
                  )}
                  {seller?.telegramUrl && (
                    <button aria-label="Modifier Telegram" onClick={() => { setIsAddModalOpen(true); setQuickAddTarget("Telegram"); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                      <Send size={14} />
                    </button>
                  )}
                  {seller?.snapchatUrl && (
                    <button aria-label="Modifier Snapchat" onClick={() => openProfileEdit()} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                      <Snapchat size={14} />
                    </button>
                  )}
                  {seller?.websiteUrl && (
                    <button aria-label="Modifier Site web" onClick={() => openProfileEdit()} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                      <ExternalLink size={14} />
                    </button>
                  )}
                  
                  {/* Missing social links with '+' badge */}
                  {!seller?.instagramUrl && (
                    <button aria-label="Ajouter Instagram" onClick={() => { setIsAddModalOpen(true); setQuickAddTarget("Instagram"); }} className="relative flex h-8 w-8 items-center justify-center rounded-full text-gray-300 hover:bg-gray-50 hover:text-gray-500 transition-colors">
                      <Instagram size={17} />
                      <div className="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-white border border-gray-200">
                        <Plus size={8} className="text-gray-400" />
                      </div>
                    </button>
                  )}
                  {!seller?.tiktokUrl && (
                    <button aria-label="Ajouter TikTok" onClick={() => { setIsAddModalOpen(true); setQuickAddTarget("TikTok"); }} className="relative flex h-8 w-8 items-center justify-center rounded-full text-gray-300 hover:bg-gray-50 hover:text-gray-500 transition-colors">
                      <TikTok size={17} />
                      <div className="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-white border border-gray-200">
                        <Plus size={8} className="text-gray-400" />
                      </div>
                    </button>
                  )}
                  {!seller?.whatsappNumber && (
                    <button aria-label="Ajouter WhatsApp" onClick={() => openProfileEdit()} className="relative flex h-8 w-8 items-center justify-center rounded-full text-gray-300 hover:bg-gray-50 hover:text-gray-500 transition-colors">
                      <MessageCircle size={17} />
                      <div className="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-white border border-gray-200">
                        <Plus size={8} className="text-gray-400" />
                      </div>
                    </button>
                  )}
                  {!seller?.facebookUrl && (
                    <button aria-label="Ajouter Facebook" onClick={() => { setIsAddModalOpen(true); setQuickAddTarget("Facebook"); }} className="relative flex h-8 w-8 items-center justify-center rounded-full text-gray-300 hover:bg-gray-50 hover:text-gray-500 transition-colors">
                      <Facebook size={17} />
                      <div className="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-white border border-gray-200">
                        <Plus size={8} className="text-gray-400" />
                      </div>
                    </button>
                  )}
                  
                  {/* generic Add '+' button */}
                  <button aria-label="Ajouter un réseau social" onClick={() => { setIsAddModalOpen(true); setQuickAddTarget(null); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors ml-1">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Add Product button - Linktree style */}
          <button
            id="tour-add-block"
            onClick={() => guardedAction(() => setIsAddModalOpen(true))}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-[25px] bg-teal-600 px-6 py-4 text-[15px] font-bold text-white transition-all hover:bg-teal-700 hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow"
          >
            <Plus size={20} />
            Ajouter
          </button>

          {/* Block list */}
          {blocks.length > 0 && (
            <div
              ref={blockListRef}
              className="mt-4 space-y-2"
            >
              {blocks.map((block, idx) => {
                const Icon = TYPE_ICONS[block.type] || Link2;
                const isDesktopDragged = dragIdx === idx;
                const isDesktopOver = dragOverIdx === idx;
                const isTouchOver = touchDragIdx !== null && touchOverIdx === idx && touchDragIdx !== idx;

                return (
                  <div
                    key={block.id}
                    data-block-idx={idx}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                    onDrop={() => {
                      if (dragIdx !== null) handleReorder(dragIdx, idx);
                      setDragIdx(null);
                      setDragOverIdx(null);
                    }}
                    className={`transition-all duration-200 ${isDesktopDragged ? "opacity-40" : ""} ${isDesktopOver || isTouchOver ? "ring-2 ring-teal-500/40 ring-offset-1 rounded-2xl" : ""}`}
                  >
                  <Card
                    className={`relative overflow-hidden ${
                      !block.isActive ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Drag handle + keyboard reorder buttons */}
                      <div className="flex shrink-0 flex-col items-center gap-0">
                        <button
                          onClick={() => idx > 0 && handleReorder(idx, idx - 1)}
                          disabled={idx === 0}
                          className="rounded-lg p-2 sm:p-1 text-gray-300 transition-colors hover:text-gray-500 disabled:invisible"
                          aria-label="Monter le bloc"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <div
                          className="touch-none select-none p-1.5 sm:p-0"
                          onTouchStart={(e) => handleTouchStart(idx, e)}
                          onTouchMove={(e) => handleTouchMove(e)}
                          onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}
                        >
                          <GripVertical size={16} className="cursor-grab text-gray-300 active:cursor-grabbing" />
                        </div>
                        <button
                          onClick={() => idx < blocks.length - 1 && handleReorder(idx, idx + 1)}
                          disabled={idx === blocks.length - 1}
                          className="rounded-lg p-2 sm:p-1 text-gray-300 transition-colors hover:text-gray-500 disabled:invisible"
                          aria-label="Descendre le bloc"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      {/* Store-like card content — clickable to edit */}
                      {(() => {
                        const coverUrl = getBlockCoverUrl(block);
                        const subtitle = getBlockSubtitle(block);
                        const editUrl = block.type === "COMMUNITY" && block.community?.id
                          ? `/dashboard/communities/${block.community.id}/edit`
                          : `/dashboard/blocks/${block.id}/edit`;
                        return (
                          <div
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
                            onClick={() => router.push(editUrl)}
                          >
                            {coverUrl ? (
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                <Image src={coverUrl} alt={block.title} fill className="object-cover" unoptimized />
                              </div>
                            ) : (
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-50">
                                <Icon size={20} className="text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-gray-900">
                                {block.title}
                              </p>
                              {subtitle && (
                                <p className="mt-0.5 truncate text-xs font-medium text-teal-600">
                                  {subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Options menu */}
                      <button
                        onClick={() => setActionMenuBlockId(block.id)}
                        className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Options"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </Card>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {blocks.length === 0 && (
            <div className="mt-4 rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center">
              <ShoppingBag size={32} className="mx-auto text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-500">
                Aucun produit pour le moment
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Ajoute ton premier produit pour commencer à vendre
              </p>
            </div>
          )}
          </>
          )}
        </div>

        {/* Right column: Phone Preview (desktop only) */}
        <PhonePreview
          id="tour-phone-preview"
          displayName={displayName}
          subtitle={seller.subtitle || null}
          slug={seller.slug}
          avatarUrl={seller.avatarUrl}
          coverUrl={seller.coverUrl}
          bio={seller?.bio ?? null}
          blocks={blocks}
          themeConfig={themeConfig}
          headerLayout={headerLayout}
          imageStyle={imageStyle}
          showAvatar={seller.showAvatar !== false}
          bgImageUrl={bgImageUrl}
          socialLinks={{
            instagramUrl: seller.instagramUrl,
            tiktokUrl: seller.tiktokUrl,
            youtubeUrl: seller.youtubeUrl,
            facebookUrl: seller.facebookUrl,
            whatsappNumber: seller.whatsappNumber,
            twitterUrl: seller.twitterUrl,
            telegramUrl: seller.telegramUrl,
            snapchatUrl: seller.snapchatUrl,
            websiteUrl: seller.websiteUrl,
          }}
        />
      </div>

      {/* Block action sheet */}
      {actionMenuBlockId && (() => {
        const block = blocks.find((b) => b.id === actionMenuBlockId);
        if (!block) return null;
        const BlockIcon = TYPE_ICONS[block.type] || ShoppingBag;
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setActionMenuBlockId(null)} />
            <div
              className="fixed inset-x-0 bottom-0 z-60 animate-[slideUp_0.2s_ease-out] rounded-t-3xl bg-white shadow-2xl sm:relative sm:inset-auto sm:w-full sm:max-w-sm sm:rounded-2xl"
            >
              {/* Mobile handle */}
              <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden">
                <div className="h-1 w-8 rounded-full bg-gray-200" />
              </div>

              {/* Block header — compact */}
              <div className="px-4 pt-2 pb-3 sm:pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
                    <BlockIcon size={18} className="text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{block.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-medium text-gray-400">{TYPE_LABELS[block.type]}</span>
                      <span className="text-gray-200">·</span>
                      <span className={`text-[10px] font-semibold ${block.isActive ? "text-teal-600" : "text-gray-400"}`}>
                        {block.isActive ? "Actif" : "Inactif"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActionMenuBlockId(null)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Actions list */}
              <div className="px-3 pb-3 space-y-0.5">
                <button
                  onClick={() => {
                    setActionMenuBlockId(null);
                    if (block.type === "COMMUNITY") {
                      const communityId = block.community?.id || ((block.config as Record<string, string>) || {}).communityId;
                      if (communityId) {
                        router.push(`/dashboard/communities/${communityId}/edit`);
                      } else {
                        router.push(`/dashboard/blocks/${block.id}/edit`);
                      }
                    } else {
                      router.push(`/dashboard/blocks/${block.id}/edit`);
                    }
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                    <Pencil size={16} className="text-teal-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-[13px] font-semibold text-gray-800">Modifier</span>
                    <p className="text-[11px] text-gray-400">Éditer le contenu du bloc</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActionMenuBlockId(null);
                    handleToggle(block);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${block.isActive ? "bg-amber-50" : "bg-gray-50"}`}>
                    <Power size={16} className={block.isActive ? "text-amber-500" : "text-gray-400"} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-[13px] font-semibold text-gray-800">
                      {block.isActive ? "Désactiver" : "Activer"}
                    </span>
                    <p className="text-[11px] text-gray-400">
                      {block.isActive ? "Masquer de ta page" : "Afficher sur ta page"}
                    </p>
                  </div>
                </button>

                {block.type === "BOOKING" && (
                  <button
                    onClick={() => {
                      setActionMenuBlockId(null);
                      setSlotEditorBlockId(block.id);
                      setSlotEditorInitial(
                        block.bookingService?.slots?.map((s) => ({
                          dayOfWeek: s.dayOfWeek,
                          startTime: s.startTime,
                          endTime: s.endTime,
                        })) || []
                      );
                      setShowSlotEditor(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <Calendar size={16} className="text-blue-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-[13px] font-semibold text-gray-800">Horaires</span>
                      <p className="text-[11px] text-gray-400">Gérer les créneaux disponibles</p>
                    </div>
                  </button>
                )}

                {/* Separator */}
                <div className="my-1.5! mx-3 border-t border-gray-100" />

                <button
                  onClick={() => {
                    setActionMenuBlockId(null);
                    setDeleteBlockId(block.id);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-red-50 active:bg-red-100"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50">
                    <Trash2 size={16} className="text-red-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-[13px] font-semibold text-red-600">Supprimer</span>
                    <p className="text-[11px] text-red-400">Action irréversible</p>
                  </div>
                </button>
              </div>

              {/* Safe area padding on mobile */}
              <div className="sm:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
            </div>
          </div>
        );
      })()}

      {/* Slot editor modal for BOOKING blocks */}
      <SlotEditorModal
        open={showSlotEditor}
        onClose={() => setShowSlotEditor(false)}
        blockId={slotEditorBlockId}
        initialSlots={slotEditorInitial}
        onSaved={() => fetchBlocks()}
      />

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteBlockId}
        onClose={() => setDeleteBlockId(null)}
        title="Supprimer ce bloc"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Es-tu sûr de vouloir supprimer ce bloc ? Cette action est irréversible.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteBlockId(null)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={deleting}
              disabled={deleting}
              onClick={() => deleteBlockId && handleDelete(deleteBlockId)}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mobile preview floating button */}
      <button
        onClick={() => setShowMobilePreview(true)}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-black/20 transition-all active:scale-95 lg:hidden"
        aria-label="Voir l'aperçu"
      >
        <Smartphone size={14} />
        Aperçu
      </button>

      {/* Mobile preview overlay */}
      {showMobilePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 lg:hidden animate-[scaleIn_0.2s_ease-out]">
          <button
            onClick={() => setShowMobilePreview(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-opacity hover:bg-white/20"
            aria-label="Fermer l'aperçu"
          >
            <X size={20} />
          </button>
          <PhonePreview
            displayName={displayName}
            subtitle={seller.subtitle || null}
            slug={seller.slug}
            avatarUrl={seller.avatarUrl}
            coverUrl={seller.coverUrl}
            bio={seller?.bio ?? null}
            blocks={blocks}
            themeConfig={themeConfig}
            headerLayout={headerLayout}
            imageStyle={imageStyle}
            showAvatar={seller.showAvatar !== false}
            bgImageUrl={bgImageUrl}
            inline={false}
            socialLinks={{
              instagramUrl: seller.instagramUrl,
              tiktokUrl: seller.tiktokUrl,
              youtubeUrl: seller.youtubeUrl,
              facebookUrl: seller.facebookUrl,
              whatsappNumber: seller.whatsappNumber,
              twitterUrl: seller.twitterUrl,
              telegramUrl: seller.telegramUrl,
              snapchatUrl: seller.snapchatUrl,
              websiteUrl: seller.websiteUrl,
            }}
          />
        </div>
      )}

      {/* ── Unsaved changes modal ── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-60 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={cancelLeave} />
          <div
            className="relative z-10 w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 shadow-2xl animate-[slideUp_0.2s_ease-out] sm:animate-[scaleIn_0.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle mobile */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />

            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 ring-4 ring-amber-50/50">
                <AlertTriangle size={26} className="text-amber-500" />
              </div>
              <h2 className="mt-4 text-lg font-extrabold text-gray-900 tracking-tight">
                Modifications non sauvegardées
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Tu as des changements de design qui n&apos;ont pas été sauvegardés. Si tu quittes maintenant, ils seront perdus.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={saveAndQuit}
                disabled={isSavingAndQuitting}
                className="w-full rounded-xl bg-teal-600 py-3.5 text-[15px] font-extrabold text-white transition-all hover:bg-teal-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingAndQuitting ? "Sauvegarde..." : "Quitter et sauvegarder"}
              </button>
              <button
                onClick={confirmLeave}
                disabled={isSavingAndQuitting}
                className="w-full rounded-xl border border-gray-200 bg-white py-3.5 text-[15px] font-semibold text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.98]"
              >
                Quitter sans sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
      <AddBlockModal
        open={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setQuickAddTarget(null); }}
        initialQuickAddType={quickAddTarget}
        onBlockCreated={() => { fetchBlocks(); refreshSeller(); }}
      />
    </div>
  );
}
