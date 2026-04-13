import Link from "next/link";
import {
  Instagram,
  Youtube,
  Facebook,
  MessageCircle,
  Send,
  Twitter,
  Globe,
} from "lucide-react";

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

interface SocialLink {
  url: string;
  label: string;
  icon: React.ElementType;
}

interface IzyFooterProps {
  slug: string;
  showFooter: boolean;
  headerStyle?: string;
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

export function IzyFooter({
  slug,
  showFooter,
  headerStyle,
  instagramUrl,
  tiktokUrl,
  youtubeUrl,
  facebookUrl,
  whatsappNumber,
  twitterUrl,
  telegramUrl,
  snapchatUrl,
  websiteUrl,
}: IzyFooterProps) {
  const socialLinks: SocialLink[] = [];

  if (instagramUrl) socialLinks.push({ url: instagramUrl, label: "Instagram", icon: Instagram });
  if (tiktokUrl) socialLinks.push({ url: tiktokUrl, label: "TikTok", icon: TikTokIcon });
  if (youtubeUrl) socialLinks.push({ url: youtubeUrl, label: "YouTube", icon: Youtube });
  if (facebookUrl) socialLinks.push({ url: facebookUrl, label: "Facebook", icon: Facebook });
  if (whatsappNumber) socialLinks.push({ url: `https://wa.me/${whatsappNumber.replace(/\D/g, "")}`, label: "WhatsApp", icon: MessageCircle });
  if (twitterUrl) socialLinks.push({ url: twitterUrl, label: "X / Twitter", icon: Twitter });
  if (telegramUrl) socialLinks.push({ url: telegramUrl, label: "Telegram", icon: Send });
  if (snapchatUrl) socialLinks.push({ url: snapchatUrl, label: "Snapchat", icon: SnapchatIcon });
  if (websiteUrl) socialLinks.push({ url: websiteUrl, label: "Site web", icon: Globe });

  const showSocials = headerStyle === "sadio" && socialLinks.length > 0;

  return (
    <>
      {/* Social links — inline in content flow */}
      {showSocials && (
        <div className="mt-10 flex items-center justify-center gap-3">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-11 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100"
              style={{
                backgroundColor: "var(--theme-card-bg, #F3F4F6)",
                color: "var(--theme-text-muted, #6B7280)",
                border: "1px solid var(--theme-card-border, transparent)",
              }}
              aria-label={link.label}
            >
              <link.icon size={16} />
            </a>
          ))}
        </div>
      )}

      {/* Discreet footer links + Izy branding — inline at bottom */}
      <div className="mt-10 pb-6 text-center space-y-3">
        {showFooter && (
          <Link
            href="/"
            className="block text-[11px] font-medium transition-opacity hover:opacity-80"
            style={{ color: "var(--theme-text-muted, #9CA3AF)" }}
          >
            Crée ta boutique gratuitement sur <span className="font-semibold">Izy.store</span>
          </Link>
        )}
        <div
          className="flex items-center justify-center gap-0.5 text-[11px]"
          style={{ color: "var(--theme-text-muted, #9CA3AF)", opacity: 0.7 }}
        >
          <Link
            href={`/report?url=${encodeURIComponent(slug)}`}
            className="rounded-lg px-3 py-2 transition-opacity hover:opacity-100"
          >
            Signaler
          </Link>
          <span>·</span>
          <Link
            href="/privacy"
            className="rounded-lg px-3 py-2 transition-opacity hover:opacity-100"
          >
            Confidentialité
          </Link>
        </div>
      </div>
    </>
  );
}
