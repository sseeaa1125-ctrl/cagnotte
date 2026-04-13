"use client";

import { useRef, useCallback } from "react";
import Image from "next/image";
import { Avatar } from "@/components/ui";
import { getResolvedTheme, getFont, getBackgroundStyle } from "@/types";
import type { Theme, ThemeConfig, Block } from "@/types";
import { SellerHeader, type SellerHeaderProps } from "@/components/store/SellerHeader";
import { LinkBlock } from "@/components/store/blocks/LinkBlock";
import { StoreCard } from "@/components/store/blocks/StoreCard";

interface PreviewBlock {
  id: string;
  type: string;
  title: string;
  isActive: boolean;
  config: Record<string, unknown>;
  product: { title: string; price: number; coverUrl?: string | null; buttonText?: string | null; ctaStyle?: string } | null;
  bookingService: { title: string; price: number; description?: string | null; duration?: number; location?: string | null; coverUrl?: string | null; buttonText?: string | null; ctaStyle?: string } | null;
  community?: { title: string; description?: string | null; coverUrl?: string | null; priceAmount: number; memberCount: number } | null;
}

interface PhonePreviewProps {
  displayName: string;
  subtitle?: string | null;
  slug: string;
  avatarUrl: string | null;
  coverUrl?: string | null;
  bio: string | null;
  blocks: PreviewBlock[];
  themeConfig?: ThemeConfig;
  headerLayout?: string;
  imageStyle?: string | null;
  showAvatar?: boolean;
  bgImageUrl?: string | null;
  inline?: boolean;
  socialLinks?: Record<string, string | null>;
  id?: string;
}

function formatPreviewPrice(amount: number): string {
  return amount.toLocaleString("fr-FR").replace(/,/g, " ") + " FCFA";
}

export function PhonePreview({
  displayName,
  subtitle,
  slug,
  avatarUrl,
  coverUrl,
  bio,
  blocks,
  themeConfig,
  headerLayout,
  imageStyle,
  showAvatar = true,
  bgImageUrl,
  inline,
  socialLinks,
  id,
}: PhonePreviewProps) {
  const activeBlocks = blocks.filter((b) => b.isActive);
  const theme = themeConfig
    ? getResolvedTheme(themeConfig)
    : getResolvedTheme({ themeId: "default", themeFont: "inter", themeColors: null });
  const font = themeConfig ? getFont(themeConfig.themeFont) : getFont("inter");
  const bgStyle: React.CSSProperties = bgImageUrl
    ? { backgroundImage: `url(${bgImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : getBackgroundStyle(theme);
  const resolvedHeaderStyle = headerLayout || theme.headerStyle;

  const scrollRef = useRef<HTMLDivElement>(null);

  const PHONE_WIDTH = 390;
  const PHONE_HEIGHT = 844;
  const targetWidth = inline === false ? 260 : 300;
  const scale = targetWidth / PHONE_WIDTH;
  const targetHeight = PHONE_HEIGHT * scale;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    e.stopPropagation();
    el.scrollTop += e.deltaY / scale;
  }, [scale]);

  // Thumbnail sizing based on blockLayout (mirrors StoreThemeProvider logic)
  let thumbSize = "80px";
  let thumbCompactSize = "48px";
  let thumbAspect = "1";
  if (theme.blockLayout === "minimal-stack") {
    thumbSize = "64px";
    thumbCompactSize = "40px";
  } else if (theme.blockLayout === "card-image-top") {
    thumbAspect = "16/9";
  }

  return (
    <div id={id} className={inline === false ? "block" : "hidden lg:block self-start shrink-0"}>
      <div className={inline === false ? "" : "sticky top-6"}>
        {/* Outer container taking up the scaled dimensions */}
        <div 
          style={{ width: `${targetWidth}px`, height: `${targetHeight}px` }} 
          className="mx-auto relative"
          onWheel={handleWheel}
        >
          {/* Inner container performing the actual scale */}
          <div 
            className="origin-top-left absolute top-0 left-0 flex flex-col overflow-hidden shadow-2xl bg-white"
            style={{ 
              width: `${PHONE_WIDTH}px`,
              height: `${PHONE_HEIGHT}px`,
              transform: `scale(${scale})`, 
              borderRadius: "56px", // iOS rounded corners for 390x844
              border: "12px solid #111827", // gray-900
            }}
          >
            {/* Notch */}
            <div style={bgStyle} className="relative z-10 shrink-0">
              <div className="mx-auto pt-3 h-9 w-36">
                <div className="h-6 w-full rounded-full bg-gray-900" />
              </div>
            </div>

            {/* Screen content */}
            <div
              ref={scrollRef}
              className="@container flex-1 overflow-y-auto px-5 pt-4 pb-8 scrollbar-hide"
              style={{
                ...bgStyle,
                fontFamily: font.family,
                "--theme-primary": theme.primary,
                "--theme-bg": theme.background,
                "--theme-card-bg": theme.cardBg,
                "--theme-card-border": theme.cardBorder,
                "--theme-card-shadow": theme.cardShadow,
                "--theme-card-backdrop": theme.cardStyle === "glass" ? "blur(12px)" : "none",
                "--theme-block-layout": theme.blockLayout,
                "--theme-text": theme.textPrimary,
                "--theme-text-muted": theme.textSecondary,
                "--theme-card-radius": theme.cardRadius,
                "--theme-thumb-radius": (() => { const s = (imageStyle as string) || theme.avatarStyle; return s === "circle" ? "9999px" : s === "square" ? "4px" : `calc(${theme.cardRadius} * 0.5)`; })(),
                "--theme-thumb-size": thumbSize,
                "--theme-thumb-compact-size": thumbCompactSize,
                "--theme-thumb-aspect": thumbAspect,
              } as React.CSSProperties}
            >
              <SellerHeader
                displayName={displayName}
                subtitle={subtitle || null}
                bio={bio}
                avatarUrl={avatarUrl}
                coverUrl={coverUrl}
                headerStyle={resolvedHeaderStyle as SellerHeaderProps["headerStyle"]}
                avatarStyle={((imageStyle as "circle" | "rounded" | "square") || theme.avatarStyle)}
                supportsCover={theme.supportsCover}
                showAvatar={showAvatar}
                socialLinks={socialLinks as SellerHeaderProps["socialLinks"]}
              />

              {/* Blocks */}
              <div className="mt-6 flex flex-col" style={{ gap: theme.blockSpacing }}>
                {activeBlocks.length === 0 && (
                  <div
                    className="border border-dashed py-8 text-center"
                    style={{ borderColor: theme.cardBorder, borderRadius: theme.cardRadius }}
                  >
                    <p className="text-sm" style={{ color: theme.textSecondary }}>
                      Ajoute ton premier produit
                    </p>
                  </div>
                )}
                {activeBlocks.map((block) => (
                  <PreviewBlockItem key={block.id} block={block} theme={theme} />
                ))}
              </div>

              {/* Sadio: socials at bottom */}
              {resolvedHeaderStyle === "sadio" && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  {/* SellerHeader already handles socials, but sadio might need them in footer */}
                </div>
              )}
            </div>

            {/* Footer — pinned to bottom of phone */}
            <div style={bgStyle} className="shrink-0 py-2 relative z-10">
              <p className="text-center text-[10px]" style={{ color: theme.textSecondary, opacity: 0.5 }}>
                Propulsé par <span className="font-semibold">Izy</span>
              </p>
            </div>

            {/* Home indicator */}
            <div style={bgStyle} className="shrink-0 pb-3 pt-1 relative z-10">
              <div className="mx-auto h-1.5 w-32 rounded-full" style={{ backgroundColor: theme.textSecondary, opacity: 0.3 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewBlockItem({ block, theme }: { block: PreviewBlock; theme: Theme & { customButtonColor?: string } }) {
  const config = (block.config as Record<string, unknown>) || {};

  if (block.type === "LINK") {
    return (
      <LinkBlock
        title={(config.title as string) || block.title}
        url={(config.url as string) || "#"}
        icon={(config.icon as string) || "other"}
        coverUrl={(config.coverUrl as string) || undefined}
        blockLayout={theme.blockLayout}
      />
    );
  }

  const blockTitle =
    block.product?.title ||
    block.bookingService?.title ||
    block.community?.title ||
    (config.title as string) ||
    block.title;

  const blockCover =
    block.product?.coverUrl ||
    block.bookingService?.coverUrl ||
    block.community?.coverUrl ||
    (config.coverUrl as string) ||
    null;

  const defaultCtaStyle = theme.blockLayout === "card-image-top" ? "preview" : "button";
  const ctaStyle =
    block.product?.ctaStyle ||
    block.bookingService?.ctaStyle ||
    (config.ctaStyle as string) ||
    defaultCtaStyle;

  const blockSubtitle = (() => {
    switch (block.type) {
      case "SALE":
        return block.product && block.product.price > 0 ? formatPreviewPrice(block.product.price) : "Gratuit";
      case "BOOKING": {
        if (!block.bookingService) return null;
        const d = block.bookingService.duration || 60;
        return `${formatPreviewPrice(block.bookingService.price)} · ${d} min`;
      }
      case "COMMUNITY":
        return block.community ? `${formatPreviewPrice(block.community.priceAmount)} / mois` : null;
      case "LEAD_MAGNET":
        return block.product && block.product.price > 0 ? formatPreviewPrice(block.product.price) : "Gratuit";
      case "WAITING_LIST":
        return "Liste d\u2019attente";
      case "PAYMENT":
        return "Paiement libre";
      case "DONATION":
        return "Don libre";
      case "PARTNERSHIP":
        return "Partenariat";
      default:
        return null;
    }
  })();

  return (
    <StoreCard
      title={blockTitle}
      subtitle={blockSubtitle}
      coverUrl={blockCover}
      blockType={block.type}
      ctaStyle={ctaStyle}
    />
  );
}
