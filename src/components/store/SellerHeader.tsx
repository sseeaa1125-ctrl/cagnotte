import { SafeImage } from "@/components/store/SafeImage";
import { VerifiedBadge } from "@/components/store/VerifiedBadge";
import {
  Instagram,
  Youtube,
  Facebook,
  MessageCircle,
  Send,
  Twitter,
  Globe,
} from "lucide-react";
import { normalizeDeepLink, buildWhatsAppLink } from "@/lib/deepLinks";

function TikTokIcon({ size = 24, ...props }: { size?: number; [key: string]: unknown }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} {...props}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13a8.28 8.28 0 005.58 2.16v-3.44a4.85 4.85 0 01-3.77-1.26V6.69h3.77z" />
    </svg>
  );
}

function SnapchatIcon({ size = 24, ...props }: { size?: number; [key: string]: unknown }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} {...props}>
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.922-.214.04-.012.06-.012.1-.012.16 0 .3.044.4.12.1.073.16.18.16.33a.46.46 0 01-.27.39c-.12.06-.27.12-.42.18-.33.13-.78.27-1.14.48-.12.06-.21.18-.24.33a.78.78 0 00.06.45c.54 1.17 1.32 2.16 2.31 2.94.18.15.42.27.63.36.57.24.93.48.93.81 0 .42-.6.66-1.14.81-.18.06-.39.09-.57.15-.42.09-.87.24-.96.51-.03.12-.03.27.03.42.15.33.33.66.33.93 0 .39-.39.6-.78.72-.6.18-1.14.27-1.5.36-.12.03-.21.06-.27.09-.18.12-.27.39-.42.75-.18.42-.42.93-.96 1.26-.6.36-1.38.42-2.04.42-.36 0-.66-.03-.84-.06a4.55 4.55 0 00-.69-.06c-.24 0-.51.03-.81.06-.18.03-.48.06-.84.06-.66 0-1.44-.06-2.04-.42-.54-.33-.78-.84-.96-1.26-.15-.36-.24-.63-.42-.75-.06-.03-.15-.06-.27-.09-.36-.09-.9-.18-1.5-.36-.39-.12-.78-.33-.78-.72 0-.27.18-.6.33-.93.06-.15.06-.3.03-.42-.09-.27-.54-.42-.96-.51-.18-.06-.39-.09-.57-.15-.54-.15-1.14-.39-1.14-.81 0-.33.36-.57.93-.81.21-.09.45-.21.63-.36.99-.78 1.77-1.77 2.31-2.94a.78.78 0 00.06-.45.52.52 0 00-.24-.33c-.36-.21-.81-.36-1.14-.48-.15-.06-.3-.12-.42-.18a.46.46 0 01-.27-.39c0-.15.06-.27.16-.33.1-.08.24-.12.4-.12.04 0 .06 0 .1.01.26.09.62.2.92.22.2 0 .33-.05.4-.09l-.03-.51-.003-.06c-.104-1.628-.23-3.654.3-4.848C7.447 1.069 10.804.793 11.794.793h.412z" />
    </svg>
  );
}

interface SocialLinks {
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  youtubeUrl?: string | null;
  facebookUrl?: string | null;
  whatsappNumber?: string | null;
  twitterUrl?: string | null;
  telegramUrl?: string | null;
  snapchatUrl?: string | null;
  websiteUrl?: string | null;
}

export interface SellerHeaderProps {
  displayName: string;
  subtitle: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl?: string | null;
  headerStyle?: "centered" | "left" | "pro" | "compact" | "hero" | "editorial" | "banner" | "sadio";
  avatarStyle?: "circle" | "rounded" | "square";
  socialPosition?: "header" | "footer";
  supportsCover?: boolean;
  showAvatar?: boolean;
  socialLinks?: SocialLinks;
  isVerified?: boolean;
}

// Adaptive icon size: fewer icons → bigger, more icons → smaller
function getSocialIconSize(count: number): { box: number; icon: number; gap: string } {
  if (count <= 4) return { box: 32, icon: 14, gap: "gap-2" };
  if (count <= 6) return { box: 28, icon: 12, gap: "gap-1.5" };
  return { box: 24, icon: 11, gap: "gap-1" };
}

function buildSocialItems(links: SocialLinks) {
  const items: { url: string; label: string; icon: React.ElementType }[] = [];
  if (links.instagramUrl) items.push({ url: normalizeDeepLink(links.instagramUrl), label: "Instagram", icon: Instagram });
  if (links.tiktokUrl) items.push({ url: normalizeDeepLink(links.tiktokUrl), label: "TikTok", icon: TikTokIcon });
  if (links.youtubeUrl) items.push({ url: normalizeDeepLink(links.youtubeUrl), label: "YouTube", icon: Youtube });
  if (links.facebookUrl) items.push({ url: normalizeDeepLink(links.facebookUrl), label: "Facebook", icon: Facebook });
  if (links.whatsappNumber) items.push({ url: buildWhatsAppLink(links.whatsappNumber), label: "WhatsApp", icon: MessageCircle });
  if (links.twitterUrl) items.push({ url: normalizeDeepLink(links.twitterUrl), label: "X / Twitter", icon: Twitter });
  if (links.telegramUrl) items.push({ url: normalizeDeepLink(links.telegramUrl), label: "Telegram", icon: Send });
  if (links.snapchatUrl) items.push({ url: normalizeDeepLink(links.snapchatUrl), label: "Snapchat", icon: SnapchatIcon });
  if (links.websiteUrl) items.push({ url: normalizeDeepLink(links.websiteUrl), label: "Site web", icon: Globe });
  return items;
}

export function SellerHeader({
  displayName,
  subtitle,
  bio,
  avatarUrl,
  coverUrl,
  headerStyle = "centered",
  avatarStyle = "circle",
  socialPosition: _socialPosition,
  supportsCover = false,
  showAvatar = true,
  socialLinks,
  isVerified = false,
}: SellerHeaderProps) {
  const isLeft = headerStyle === "left";
  const isPro = headerStyle === "pro";
  const isCompact = headerStyle === "compact";
  const avatarRadius =
    avatarStyle === "circle" ? "9999px" : avatarStyle === "rounded" ? "16px" : "0px";

  const defaultAvatarSize = 100;

  const socials = socialLinks ? buildSocialItems(socialLinks) : [];
  // Socials always in header, except for "sadio" style where they go to footer
  const hasSocials = headerStyle !== "sadio" && socials.length > 0;
  const iconSizing = getSocialIconSize(socials.length);
  void _socialPosition; // kept for API compat — socialPosition is now driven by headerStyle

  // ── Sadio layout: small avatar + name + subtitle at top, socials go to footer ──
  if (headerStyle === "sadio") {
    return (
      <div className={`flex flex-col ${showAvatar ? "items-start" : "items-center"}`}>
        {showAvatar && (
          <div className="flex items-center gap-2.5">
            <div
              className="shrink-0 overflow-hidden"
              style={{ 
                width: 48, 
                height: 48, 
                borderRadius: avatarRadius 
              }}
            >
              <SafeImage
                src={avatarUrl || ""}
                alt={displayName}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                fallback={
                  <div
                    className="flex h-full w-full items-center justify-center text-[10px] font-semibold"
                    style={{ backgroundColor: "var(--theme-card-bg, #F3F4F6)", color: "var(--theme-text-muted, #6B7280)" }}
                  >
                    {displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                }
              />
            </div>
            <div className="min-w-0">
              <h1
                className="font-bold leading-tight"
                style={{ 
                  color: "var(--theme-text, #111827)",
                  fontSize: "18px"
                }}
              >
                {displayName}
                {isVerified && <VerifiedBadge size={16} className="ml-1" />}
              </h1>
              {subtitle && (
                <p
                  className="mt-0.5 font-medium"
                  style={{ 
                    color: "var(--theme-text-muted, #6B7280)",
                    fontSize: "12px"
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}
        {!showAvatar && (
          <>
            <h1
              className="text-xl font-bold leading-tight @[768px]:text-2xl"
              style={{ color: "var(--theme-text, #111827)" }}
            >
              {displayName}
              {isVerified && <VerifiedBadge size={18} className="ml-1" />}
            </h1>
            {subtitle && (
              <p
                className="mt-1 text-sm font-medium"
                style={{ color: "var(--theme-text-muted, #6B7280)" }}
              >
                {subtitle}
              </p>
            )}
          </>
        )}
        {bio && (
          <p
            className="mt-2 max-w-md text-sm leading-relaxed"
            style={{ color: "var(--theme-text-muted, #6B7280)" }}
          >
            {bio}
          </p>
        )}
      </div>
    );
  }

  // ── Banner layout: circular photo LEFT + name + socials RIGHT — style Abigail Peugh ──
  if (headerStyle === "banner") {
    return (
      <div className="flex items-start gap-3 @[768px]:gap-4">
        {showAvatar && (
          <div className="shrink-0 overflow-hidden" style={{ width: 56, height: 56, borderRadius: avatarRadius }}>
            <SafeImage
              src={avatarUrl || ""}
              alt={displayName}
              width={56}
              height={56}
              className="h-full w-full object-cover"
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-teal-100 text-xs font-semibold text-teal-700">
                  {displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                </div>
              }
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1
            className="font-bold leading-tight"
            style={{ 
              color: "var(--theme-text, #111827)",
              fontSize: "18px"
            }}
          >
            {displayName}
            {isVerified && <VerifiedBadge size={16} className="ml-1" />}
          </h1>
          {subtitle && (
            <p
              className="mt-0.5 text-xs font-medium"
              style={{ color: "var(--theme-text-muted, #6B7280)" }}
            >
              {subtitle}
            </p>
          )}
          {hasSocials && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {socials.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-full opacity-80 transition-opacity hover:opacity-100"
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: "var(--theme-card-bg, #F3F4F6)",
                    color: "var(--theme-text-muted, #6B7280)",
                    border: "1px solid var(--theme-card-border, transparent)",
                  }}
                  aria-label={link.label}
                >
                  <link.icon size={11} />
                </a>
              ))}
            </div>
          )}
          {bio && (
            <p
              className="mt-1.5 text-xs leading-relaxed @[768px]:text-sm"
              style={{ color: "var(--theme-text-muted, #6B7280)" }}
            >
              {bio}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Compact layout: tiny avatar inline with name (mobile), centered+bigger (desktop) ──
  if (isCompact) {
    return (
      <>
        {/* Mobile: tiny avatar + name inline */}
        <div className="flex flex-col items-start @[768px]:hidden">
          <div className="flex items-center gap-2">
            {showAvatar && (
              <div className="shrink-0 overflow-hidden" style={{ borderRadius: avatarRadius, width: 28, height: 28 }}>
                <SafeImage
                  src={avatarUrl || ""}
                  alt={displayName}
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                  fallback={
                    <div className="flex h-full w-full items-center justify-center bg-teal-100 text-[9px] font-semibold text-teal-700">
                      {displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                  }
                />
              </div>
            )}
            <h1
              className="font-bold leading-tight"
              style={{ 
                color: "var(--theme-text, #111827)",
                fontSize: "14px"
              }}
            >
              {displayName}
              {isVerified && <VerifiedBadge size={14} className="ml-1" />}
            </h1>
          </div>
          {subtitle && (
            <p
              className="mt-0.5 text-[11px] font-medium"
              style={{ 
                color: "var(--theme-text-muted, #6B7280)", 
                paddingLeft: showAvatar ? "36px" : undefined,
                fontSize: "11px"
              }}
            >
              {subtitle}
            </p>
          )}
          {hasSocials && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1" style={{ paddingLeft: showAvatar ? "36px" : undefined }}>
              {socials.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-full opacity-80 transition-opacity hover:opacity-100"
                  style={{
                    width: iconSizing.box,
                    height: iconSizing.box,
                    backgroundColor: "var(--theme-card-bg, #F3F4F6)",
                    color: "var(--theme-text-muted, #6B7280)",
                    border: "1px solid var(--theme-card-border, transparent)",
                  }}
                  aria-label={link.label}
                >
                  <link.icon size={iconSizing.icon} />
                </a>
              ))}
            </div>
          )}
          {bio && (
            <p
              className="mt-1 max-w-xs leading-snug"
              style={{ 
                color: "var(--theme-text-muted, #6B7280)", 
                paddingLeft: showAvatar ? "36px" : undefined,
                fontSize: "11px"
              }}
            >
              {bio}
            </p>
          )}
        </div>

        {/* Desktop: centered, bigger avatar + name */}
        <div className="hidden flex-col items-center text-center @[768px]:flex">
          {showAvatar && (
            <div className="shrink-0 overflow-hidden" style={{ borderRadius: avatarRadius, width: 80, height: 80 }}>
              <SafeImage
                src={avatarUrl || ""}
                alt={displayName}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-teal-100 text-lg font-semibold text-teal-700">
                    {displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                }
              />
            </div>
          )}
          <h1
            className="mt-3 text-[22px] font-bold leading-tight"
            style={{ color: "var(--theme-text, #111827)" }}
          >
            {displayName}
            {isVerified && <VerifiedBadge size={18} className="ml-1" />}
          </h1>
          {subtitle && (
            <p
              className="mt-1 text-sm font-medium"
              style={{ color: "var(--theme-text-muted, #6B7280)" }}
            >
              {subtitle}
            </p>
          )}
          {bio && (
            <p
              className="mt-1.5 max-w-md text-sm"
              style={{ color: "var(--theme-text-muted, #6B7280)" }}
            >
              {bio}
            </p>
          )}
          {hasSocials && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {socials.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-full opacity-80 transition-opacity hover:opacity-100"
                  style={{
                    width: iconSizing.box,
                    height: iconSizing.box,
                    backgroundColor: "var(--theme-card-bg, #F3F4F6)",
                    color: "var(--theme-text-muted, #6B7280)",
                    border: "1px solid var(--theme-card-border, transparent)",
                  }}
                  aria-label={link.label}
                >
                  <link.icon size={iconSizing.icon} />
                </a>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  // ── Hero layout: full-bleed bg image, large name at top, socials below — no avatar ──
  if (headerStyle === "hero") {
    return (
      <div className="flex flex-col items-center text-center">
        {/* Large name — displayed over the background image */}
        <h1
          className="font-extrabold tracking-tight leading-tight"
          style={{ 
            color: "var(--theme-text, #FFFFFF)",
            fontSize: "28px"
          }}
        >
          {displayName}
          {isVerified && <VerifiedBadge size={22} className="ml-1.5" />}
        </h1>
        {subtitle && (
          <p
            className="mt-1 text-sm font-medium @[768px]:text-base"
            style={{ color: "var(--theme-text-muted, rgba(255,255,255,0.75))" }}
          >
            {subtitle}
          </p>
        )}

        {/* Social icons row */}
        {hasSocials && (
          <div className={`mt-3 flex flex-wrap items-center justify-center ${iconSizing.gap}`}>
            {socials.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-full opacity-90 transition-opacity hover:opacity-100"
                style={{
                  width: iconSizing.box,
                  height: iconSizing.box,
                  backgroundColor: "rgba(0,0,0,0.25)",
                  color: "var(--theme-text, #FFFFFF)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  backdropFilter: "blur(4px)",
                }}
                aria-label={link.label}
              >
                <link.icon size={iconSizing.icon} />
              </a>
            ))}
          </div>
        )}

        {/* Bio */}
        {bio && (
          <p
            className="mt-2 max-w-xs text-sm @[768px]:max-w-md @[768px]:text-base"
            style={{ color: "var(--theme-text-muted, rgba(255,255,255,0.75))" }}
          >
            {bio}
          </p>
        )}
      </div>
    );
  }

  // ── Editorial layout: cover photo on top, socials below, large name below ──
  if (headerStyle === "editorial") {
    return (
      <div className="flex flex-col items-center text-center">
        {/* Cover image at top — cropped */}
        {coverUrl && supportsCover && (
          <div className="relative -mx-4 -mt-8 mb-4 w-[calc(100%+2rem)] overflow-hidden @[768px]:-mx-6 @[768px]:-mt-14">
            <div
              className="aspect-[16/9] w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${coverUrl})` }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(180deg, transparent 40%, var(--theme-bg, #F2E6D9) 100%)",
              }}
            />
          </div>
        )}

        {/* Social icons below the cover */}
        {hasSocials && (
          <div className={`flex flex-wrap items-center justify-center ${iconSizing.gap}`}>
            {socials.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-full opacity-80 transition-opacity hover:opacity-100"
                style={{
                  width: iconSizing.box,
                  height: iconSizing.box,
                  backgroundColor: "var(--theme-card-bg, #F3F4F6)",
                  color: "var(--theme-text-muted, #6B7280)",
                  border: "1px solid var(--theme-card-border, transparent)",
                }}
                aria-label={link.label}
              >
                <link.icon size={iconSizing.icon} />
              </a>
            ))}
          </div>
        )}

        {/* Large name */}
        <h1
          className="mt-3 font-bold tracking-tight"
          style={{ 
            color: "var(--theme-text, #1C1917)",
            fontSize: "26px"
          }}
        >
          {displayName}
          {isVerified && <VerifiedBadge size={20} className="ml-1" />}
        </h1>
        {subtitle && (
          <p
            className="mt-1 font-medium"
            style={{ 
              color: "var(--theme-text-muted, #78716C)",
              fontSize: "14px"
            }}
          >
            {subtitle}
          </p>
        )}

        {/* Bio */}
        {bio && (
          <p
            className="mt-1.5 max-w-sm text-sm leading-relaxed @[768px]:max-w-md @[768px]:text-base"
            style={{ color: "var(--theme-text-muted, #78716C)" }}
          >
            {bio}
          </p>
        )}
      </div>
    );
  }

  // ── Pro layout: name at top → social icons → large hero image → bio ──
  if (isPro) {
    return (
      <div className="flex flex-col items-center">
        {/* Name at the very top */}
        <h1
          className="font-extrabold tracking-tight"
          style={{ 
            color: "var(--theme-text, #111827)",
            fontSize: "26px"
          }}
        >
          {displayName}
          {isVerified && <VerifiedBadge size={20} className="ml-1" />}
        </h1>
        {subtitle && (
          <p
            className="mt-1 font-medium"
            style={{ 
              color: "var(--theme-text-muted, #6B7280)",
              fontSize: "14px"
            }}
          >
            {subtitle}
          </p>
        )}

        {/* Social icons right below the name */}
        {hasSocials && (
          <div className={`mt-2.5 flex flex-wrap items-center justify-center ${iconSizing.gap}`}>
            {socials.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-full opacity-80 transition-opacity hover:opacity-100"
                style={{
                  width: iconSizing.box,
                  height: iconSizing.box,
                  backgroundColor: "var(--theme-card-bg, #F3F4F6)",
                  color: "var(--theme-text-muted, #6B7280)",
                  border: "1px solid var(--theme-card-border, transparent)",
                }}
                aria-label={link.label}
              >
                <link.icon size={iconSizing.icon} />
              </a>
            ))}
          </div>
        )}

        {/* Large hero image (cover) */}
        {coverUrl && supportsCover && (
          <div className="relative mt-5 w-full overflow-hidden" style={{ borderRadius: "20px" }}>
            <div
              className="aspect-[3/4] w-full bg-cover bg-center @[640px]:aspect-[4/5] @[768px]:aspect-[16/9]"
              style={{ backgroundImage: `url(${coverUrl})` }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(180deg, transparent 50%, var(--theme-bg, #FAF7F2) 100%)",
              }}
            />
          </div>
        )}

        {/* Bio — below hero */}
        {bio && (
          <p
            className={`max-w-xs text-sm text-center @[768px]:max-w-md @[768px]:text-base ${coverUrl && supportsCover ? "-mt-6 relative z-10" : "mt-2"}`}
            style={{ color: "var(--theme-text-muted, #6B7280)" }}
          >
            {bio}
          </p>
        )}
      </div>
    );
  }

  // ── Default / Left layout ──
  return (
    <div className="flex flex-col items-center">
      {/* Cover image — only shown when theme supports it */}
      {coverUrl && supportsCover && (
        <div className="relative -mx-4 -mt-12 mb-[-48px] w-[calc(100%+2rem)] overflow-hidden @[768px]:-mx-6 @[768px]:-mt-14">
          <div
            className="h-48 w-full bg-cover bg-center @[640px]:h-56 @[768px]:h-64"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, transparent 30%, var(--theme-bg, #FFFFFF) 100%)",
            }}
          />
        </div>
      )}

      <div
        className={`relative z-10 flex w-full flex-col ${isLeft ? "items-start text-left" : "items-center text-center"} ${coverUrl ? "pt-8" : ""}`}
      >
        {showAvatar && (
          <div
            className="shrink-0 overflow-hidden"
            style={{ borderRadius: avatarRadius, width: defaultAvatarSize, height: defaultAvatarSize, maxWidth: 100, maxHeight: 100 }}
          >
            <SafeImage
              src={avatarUrl || ""}
              alt={displayName}
              width={defaultAvatarSize}
              height={defaultAvatarSize}
              className="h-full w-full object-cover"
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-teal-100 text-2xl font-semibold text-teal-700">
                  {displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                </div>
              }
            />
          </div>
        )}

        <h1
          className="mt-3 font-bold"
          style={{ 
            color: "var(--theme-text, #111827)",
            fontSize: "22px"
          }}
        >
          {displayName}
          {isVerified && <VerifiedBadge size={18} className="ml-1" />}
        </h1>
        {subtitle && (
          <p
            className="mt-1 font-medium"
            style={{ 
              color: "var(--theme-text-muted, #6B7280)",
              fontSize: "14px"
            }}
          >
            {subtitle}
          </p>
        )}

        {bio && (
          <p
            className="mt-1 max-w-xs text-sm @[768px]:mt-2 @[768px]:max-w-md @[768px]:text-base"
            style={{ color: "var(--theme-text-muted, #6B7280)" }}
          >
            {bio}
          </p>
        )}

        {/* Social icons — always under name/bio */}
        {hasSocials && (
          <div className={`mt-3 flex flex-wrap items-center @[768px]:mt-4 ${isLeft ? '' : 'justify-center'} ${iconSizing.gap}`}>
            {socials.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100"
                style={{
                  width: iconSizing.box,
                  height: iconSizing.box,
                  backgroundColor: "var(--theme-card-bg, #F3F4F6)",
                  color: "var(--theme-text-muted, #6B7280)",
                  border: "1px solid var(--theme-card-border, transparent)",
                }}
                aria-label={link.label}
              >
                <link.icon size={iconSizing.icon} />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
