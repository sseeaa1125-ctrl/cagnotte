import { SafeImage } from "@/components/store/SafeImage";
import {
  Instagram,
  MessageCircle,
  Youtube,
  Facebook,
  Send,
  Twitter,
  Globe,
  ExternalLink,
  Music,
} from "lucide-react";
import { normalizeDeepLink } from "@/lib/deepLinks";

interface LinkBlockProps {
  title: string;
  url: string;
  icon: string;
  coverUrl?: string;
  ctaStyle?: string;
  blockLayout?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  instagram: Instagram,
  whatsapp: MessageCircle,
  tiktok: Music,
  youtube: Youtube,
  facebook: Facebook,
  telegram: Send,
  twitter: Twitter,
  website: Globe,
  other: ExternalLink,
};

export function LinkBlock({ title, url, icon, coverUrl, ctaStyle = "button", blockLayout }: LinkBlockProps) {
  const Icon = ICON_MAP[icon] || ExternalLink;
  const href = normalizeDeepLink(url);

  const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--theme-card-bg, #FFFFFF)",
    border: "1px solid var(--theme-card-border, #E5E7EB)",
    borderRadius: "var(--theme-card-radius, 16px)",
    boxShadow: "var(--theme-card-shadow, none)",
    backdropFilter: "var(--theme-card-backdrop, none)",
  };

  const linkProps = {
    href,
    target: "_blank" as const,
    rel: "noopener noreferrer",
  };

  // ── Style "preview": grande image + titre en dessous ──
  if (ctaStyle === "preview") {
    return (
      <a {...linkProps} className="block overflow-hidden transition-all hover:opacity-90 active:scale-[0.99]" style={cardStyle}>
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
        <div className="flex flex-1 items-center gap-3 px-4 py-3.5 pr-10">
          <span
            className="flex-1 font-semibold line-clamp-1"
            style={{ color: "var(--theme-text, #111827)", fontSize: "14px" }}
          >
            {title}
          </span>
        </div>
      </a>
    );
  }

  // ── Style "callout": miniature à gauche + titre à droite ──
  if (ctaStyle === "callout") {
    return (
      <a {...linkProps} className="flex items-start gap-3 overflow-hidden p-3 pr-10 transition-all active:scale-[0.98]" style={cardStyle}>
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
          <span
            className="font-bold leading-snug line-clamp-1"
            style={{ color: "var(--theme-text, #111827)", fontSize: "15px" }}
          >
            {title}
          </span>
        </div>
      </a>
    );
  }

  // ── Style "button" (default): ligne compacte — icône/miniature + titre ──
  return (
    <a {...linkProps} className="flex h-full w-full items-center gap-3 px-3 py-2.5 pr-10 text-left transition-all active:scale-[0.98]" style={cardStyle}>
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden"
        style={{
          width: "var(--theme-thumb-compact-size, 44px)",
          height: "var(--theme-thumb-compact-size, 44px)",
          backgroundColor: "var(--theme-bg, #F3F4F6)",
          color: "var(--theme-text-muted, #4B5563)",
          borderRadius: "var(--theme-thumb-radius, 8px)",
          aspectRatio: "var(--theme-thumb-aspect, 1)",
        }}
      >
        {coverUrl ? (
          <SafeImage
            src={coverUrl}
            alt={title}
            width={44}
            height={44}
            className="h-full w-full object-cover"
            fallback={<Icon size={18} />}
          />
        ) : (
          <Icon size={18} />
        )}
      </div>
      <span
        className="flex-1 font-semibold line-clamp-1"
        style={{ color: "var(--theme-text, #111827)", fontSize: "13px" }}
      >
        {title}
      </span>
    </a>
  );
}
