import { getResolvedTheme, getFont, getButtonStyle, getBackgroundStyle, getContrastColor, getAccessibleTextColor, hexToRgbString } from "@/types";
import type { ThemeConfig } from "@/types";

// Map font IDs to Google Fonts URL slugs
const GOOGLE_FONT_SLUGS: Record<string, string> = {
  inter: "Inter",
  poppins: "Poppins",
  "dm-sans": "DM+Sans",
  "space-grotesk": "Space+Grotesk",
  playfair: "Playfair+Display",
  lora: "Lora",
  outfit: "Outfit",
  "plus-jakarta": "Plus+Jakarta+Sans",
};

interface StoreThemeProviderProps {
  themeConfig: ThemeConfig;
  bgImageUrl?: string | null;
  imageStyle?: string | null;
  children: React.ReactNode;
}

export function StoreThemeProvider({
  themeConfig,
  bgImageUrl,
  imageStyle,
  children,
}: StoreThemeProviderProps) {
  const theme = getResolvedTheme(themeConfig);
  const font = getFont(themeConfig.themeFont);
  const btnStyle = getButtonStyle(theme);
  const bgStyle = getBackgroundStyle(theme);
  const googleSlug = GOOGLE_FONT_SLUGS[themeConfig.themeFont];

  // Background image overrides theme background
  const finalBgStyle: React.CSSProperties = bgImageUrl
    ? {
        backgroundImage: `url(${bgImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
      }
    : bgStyle;

  // Resolve thumbnail properties based on block layout
  let thumbSize = "80px";
  let thumbCompactSize = "48px";
  let thumbAspect = "1"; // square default for thumbs
  
  if (theme.blockLayout === "minimal-stack") {
    thumbSize = "64px";
    thumbCompactSize = "40px";
  } else if (theme.blockLayout === "card-image-top") {
    thumbAspect = "16/9"; 
    // width/height don't matter as much here since it relies on aspect-ratio + w-full
  }

  return (
    <>
      {/* UI2: Preload + load Google Font to avoid render-blocking */}
      {googleSlug && themeConfig.themeFont !== "inter" && (
        <>
          <link
            rel="preconnect"
            href="https://fonts.googleapis.com"
          />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${googleSlug}:wght@400;500;600;700;800&display=swap`}
          />
        </>
      )}
    <div
      className="store-theme-root min-h-screen"
      style={
        {
          ...finalBgStyle,
          fontFamily: font.family,
          // Couleurs de base
          "--theme-primary": theme.primary,
          "--theme-primary-rgb": hexToRgbString(theme.primary),
          "--theme-primary-contrast": getContrastColor(theme.primary),
          "--theme-bg": theme.background,
          "--theme-card-bg": theme.cardBg,
          "--theme-card-border": theme.cardBorder,
          "--theme-text": theme.textPrimary,
          "--theme-text-muted": theme.textSecondary,
          // Boutons
          "--theme-btn-bg": btnStyle.backgroundColor,
          "--theme-btn-color": btnStyle.color,
          "--theme-btn-border": btnStyle.border,
          "--theme-btn-radius": theme.buttonRadius,
          "--theme-btn-text": getAccessibleTextColor(theme.primary),
          // Cartes
          "--theme-card-radius": theme.cardRadius,
          "--theme-card-shadow": theme.cardShadow,
          "--theme-block-spacing": theme.blockSpacing,
          "--theme-block-layout": theme.blockLayout,
          "--theme-thumb-size": thumbSize,
          "--theme-thumb-compact-size": thumbCompactSize,
          "--theme-thumb-aspect": thumbAspect,
          "--theme-thumb-radius": (() => { const s = (imageStyle as string) || theme.avatarStyle; return s === "circle" ? "9999px" : s === "square" ? "4px" : `calc(${theme.cardRadius} * 0.5)`; })(),
          // Modal
          "--theme-modal-bg": theme.modalBg,
          "--theme-modal-border": theme.modalBorder,
          "--theme-modal-text": theme.modalTextPrimary,
          "--theme-modal-text-muted": theme.modalTextSecondary,
          "--theme-input-bg": theme.inputBg,
          "--theme-input-border": theme.inputBorder,
          "--theme-input-text": theme.inputText,
          "--theme-placeholder": theme.modalTextSecondary,
          "--theme-font-family": font.family,
          // Glass effect pour certains thèmes
          ...(theme.cardStyle === "glass" ? { "--theme-card-backdrop": "blur(12px)" } : {}),
        } as React.CSSProperties
      }
    >
      {children}
    </div>
    </>
  );
}
