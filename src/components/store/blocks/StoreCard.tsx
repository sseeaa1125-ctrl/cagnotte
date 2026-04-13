import { SafeImage } from "@/components/store/SafeImage";
import {
  ShoppingBag,
  Calendar,
  Download,
  Users,
  Heart,
  Handshake,
  CreditCard,
  Target,
  type LucideIcon,
} from "lucide-react";

const BLOCK_ICONS: Record<string, LucideIcon> = {
  SALE: ShoppingBag,
  BOOKING: Calendar,
  LEAD_MAGNET: Download,
  WAITING_LIST: Users,
  PAYMENT: CreditCard,
  DONATION: Heart,
  FUNDRAISER: Target,
  FORMATION: ShoppingBag,
  PARTNERSHIP: Handshake,
  COMMUNITY: Users,
};

interface StoreCardProps {
  title: string;
  subtitle?: string | null;
  coverUrl?: string | null;
  blockType: string;
  ctaStyle?: string;
  description?: string | null;
}

export function StoreCard({ 
  title, 
  subtitle, 
  coverUrl, 
  blockType, 
  ctaStyle = "button", 
  description
}: StoreCardProps) {
  const Icon = BLOCK_ICONS[blockType] || ShoppingBag;

  const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--theme-card-bg, #FFFFFF)",
    border: "1px solid var(--theme-card-border, #E5E7EB)",
    borderRadius: "var(--theme-card-radius, 16px)",
    boxShadow: "var(--theme-card-shadow, none)",
    backdropFilter: "var(--theme-card-backdrop, none)",
  };

  // ── Style "preview": large cover image on top + title + subtitle + CTA ──
  if (ctaStyle === "preview") {
    return (
      <div className="overflow-hidden transition-all active:scale-[0.98]" style={cardStyle}>
        <div
          className="relative flex w-full items-center justify-center overflow-hidden"
          style={{
            backgroundColor: "var(--theme-bg, #F3F4F6)",
            aspectRatio: coverUrl ? "16/9" : "3/1",
          }}
        >
          {coverUrl ? (
            <SafeImage
              src={coverUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
              fallback={<Icon size={28} style={{ color: "var(--theme-text-muted, #9CA3AF)" }} />}
            />
          ) : (
            <Icon size={28} style={{ color: "var(--theme-text-muted, #9CA3AF)" }} />
          )}
        </div>
        <div className="px-4 py-3">
          <h3 
            className="font-bold leading-snug line-clamp-1" 
            style={{ 
              color: "var(--theme-text, #111827)",
              fontSize: "15px"
            }}
          >
            {title}
          </h3>
          {description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--theme-text-muted, #6B7280)" }}>
              {description}
            </p>
          )}
          {subtitle && (
            <p 
              className="mt-1 font-bold" 
              style={{ 
                color: "var(--theme-primary, #0D9488)",
                fontSize: "14px"
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Style "callout": image left + text right + CTA bottom ──
  if (ctaStyle === "callout") {
    return (
      <div className="overflow-hidden transition-all active:scale-[0.98]" style={cardStyle}>
        <div className="flex items-start gap-3 p-3 pr-10">
          <div
            className="relative flex shrink-0 items-center justify-center overflow-hidden"
            style={{
              width: "var(--theme-thumb-size, 80px)",
              height: "var(--theme-thumb-size, 80px)",
              backgroundColor: "var(--theme-bg, #F3F4F6)",
              color: "var(--theme-text-muted, #9CA3AF)",
              borderRadius: "var(--theme-thumb-radius, 8px)",
              aspectRatio: "var(--theme-thumb-aspect, 1)",
            }}
          >
            {coverUrl ? (
              <SafeImage
                src={coverUrl}
                alt={title}
                fill
                className="object-cover"
                sizes="80px"
                fallback={<Icon size={24} />}
              />
            ) : (
              <Icon size={24} />
            )}
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <h3 
              className="font-bold leading-snug line-clamp-1" 
              style={{ 
                color: "var(--theme-text, #111827)",
                fontSize: "15px"
              }}
            >
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--theme-text-muted, #6B7280)" }}>
                {description}
              </p>
            )}
            {subtitle && (
              <p 
                className="mt-1 font-bold" 
                style={{ 
                  color: "var(--theme-primary, #0D9488)",
                  fontSize: "14px"
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Style "button" (default): compact row — thumbnail + title + subtitle ──
  return (
    <div
      className="flex items-center gap-3 px-3 py-3 pr-10 transition-all active:scale-[0.98]"
      style={cardStyle}
    >
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden"
        style={{
          width: "var(--theme-thumb-compact-size, 48px)",
          height: "var(--theme-thumb-compact-size, 48px)",
          backgroundColor: "var(--theme-bg, #F3F4F6)",
          color: "var(--theme-text-muted, #9CA3AF)",
          borderRadius: "var(--theme-thumb-radius, 8px)",
          aspectRatio: "var(--theme-thumb-aspect, 1)",
        }}
      >
        {coverUrl ? (
          <SafeImage
            src={coverUrl}
            alt={title}
            width={48}
            height={48}
            className="h-full w-full object-cover"
            fallback={<Icon size={20} />}
          />
        ) : (
          <Icon size={20} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3
          className="truncate font-semibold"
          style={{ 
            color: "var(--theme-text, #111827)",
            fontSize: "14px"
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className="mt-0.5 truncate font-medium"
            style={{ 
              color: "var(--theme-primary, #0D9488)",
              fontSize: "12px"
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
