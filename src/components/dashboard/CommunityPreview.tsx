"use client";

import Image from "next/image";
import { Users } from "lucide-react";
import { formatPrice, billingPeriodLabel } from "@/lib/utils";
import { getResolvedTheme, getFont, getButtonStyle, getBackgroundStyle } from "@/types";
import type { ThemeConfig, LeadField } from "@/types";

function hexToRgbString(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

const GOOGLE_FONT_SLUGS: Record<string, string> = {
  inter: "",
  poppins: "Poppins",
  "dm-sans": "DM+Sans",
  playfair: "Playfair+Display",
  space: "Space+Grotesk",
  sora: "Sora",
  outfit: "Outfit",
  satoshi: "Satoshi",
  clash: "Clash+Display",
};

interface CommunityPreviewProps {
  title: string;
  description: string;
  coverUrl: string;
  priceAmount: number;
  billingPeriod?: string;
  subscribeFields: LeadField[];
  themeConfig?: ThemeConfig;
  imageStyle?: string | null;
}

export function CommunityPreview({
  title,
  description,
  coverUrl,
  priceAmount,
  billingPeriod,
  subscribeFields,
  themeConfig,
  imageStyle,
}: CommunityPreviewProps) {
  const content = (
    <CommunityPreviewInner
      title={title}
      description={description}
      coverUrl={coverUrl}
      priceAmount={priceAmount}
      billingPeriod={billingPeriod}
      subscribeFields={subscribeFields}
    />
  );

  if (!themeConfig) {
    return <div className="rounded-2xl overflow-hidden bg-white">{content}</div>;
  }

  const theme = getResolvedTheme(themeConfig);
  const font = getFont(themeConfig.themeFont);
  const btnStyle = getButtonStyle(theme);
  const bgStyle = getBackgroundStyle(theme);
  const googleSlug = GOOGLE_FONT_SLUGS[themeConfig.themeFont];

  return (
    <>
      {googleSlug && themeConfig.themeFont !== "inter" && (
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=${googleSlug}:wght@400;500;600;700;800&display=swap`}
        />
      )}
      <div
        className="store-theme-root rounded-2xl overflow-hidden"
        style={{
          ...bgStyle,
          fontFamily: font.family,
          "--theme-primary": theme.primary,
          "--theme-primary-rgb": hexToRgbString(theme.primary),
          "--theme-bg": theme.background,
          "--theme-card-bg": theme.cardBg,
          "--theme-card-border": theme.cardBorder,
          "--theme-text": theme.textPrimary,
          "--theme-text-muted": theme.textSecondary,
          "--theme-btn-bg": btnStyle.backgroundColor,
          "--theme-btn-color": btnStyle.color,
          "--theme-btn-border": btnStyle.border,
          "--theme-btn-radius": theme.buttonRadius,
          "--theme-card-radius": theme.cardRadius,
          "--theme-card-shadow": theme.cardShadow,
          "--theme-thumb-radius": (() => { const s = (imageStyle as string) || theme.avatarStyle; return s === "circle" ? "9999px" : s === "square" ? "4px" : `calc(${theme.cardRadius} * 0.5)`; })(),
          "--theme-font-family": font.family,
          ...(theme.cardStyle === "glass" ? { "--theme-card-backdrop": "blur(12px)" } : {}),
        } as React.CSSProperties}
      >
        {content}
      </div>
    </>
  );
}

function CommunityPreviewInner({
  title,
  description,
  coverUrl,
  priceAmount,
  billingPeriod,
  subscribeFields,
}: Omit<CommunityPreviewProps, "themeConfig">) {
  const fields: LeadField[] = subscribeFields.length > 0
    ? subscribeFields
    : [
        { id: "f-email", type: "email", label: "Email", placeholder: "toi@email.com", required: true },
        { id: "f-name", type: "name", label: "Nom", placeholder: "Ton nom", required: false },
      ];

  return (
    <div className="p-4 space-y-4">
      {/* Community card block preview */}
      <div
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: "var(--theme-card-bg, #FFFFFF)",
          border: `1px solid var(--theme-card-border, #E5E7EB)`,
          borderRadius: "var(--theme-card-radius, 16px)",
          boxShadow: "var(--theme-card-shadow, none)",
        }}
      >
        <div className="px-3 py-3">
          <div className="flex items-start gap-2.5">
            {coverUrl ? (
              <div className="h-11 w-11 shrink-0 overflow-hidden bg-gray-100" style={{ borderRadius: "var(--theme-thumb-radius, 8px)" }}>
                <Image src={coverUrl} alt="" width={44} height={44} className="h-full w-full object-cover" unoptimized />
              </div>
            ) : (
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center"
                style={{
                  borderRadius: "var(--theme-thumb-radius, 8px)",
                  backgroundColor: "color-mix(in srgb, var(--theme-btn-bg, #0D9488) 12%, transparent)",
                }}
              >
                <Users size={18} style={{ color: "var(--theme-btn-bg, #0D9488)" }} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-bold leading-tight"
                style={{ color: "var(--theme-text, #111827)" }}
              >
                {title || "Nom de la communauté"}
              </p>
              {description && (
                <p
                  className="mt-0.5 line-clamp-1 text-xs"
                  style={{ color: "var(--theme-text-muted, #6B7280)" }}
                >
                  {description}
                </p>
              )}
              <p
                className="mt-0.5 text-[11px]"
                style={{ color: "var(--theme-text-muted, #9CA3AF)" }}
              >
                {formatPrice(priceAmount || 0)}{billingPeriodLabel(billingPeriod || "MONTHLY")}
              </p>
            </div>
          </div>
          <button
            className="mt-2.5 w-full py-2.5 text-xs font-semibold"
            style={{
              backgroundColor: "var(--theme-btn-bg, #0D9488)",
              color: "var(--theme-btn-color, #FFFFFF)",
              border: "var(--theme-btn-border, none)",
              borderRadius: "var(--theme-btn-radius, 12px)",
            }}
          >
            Rejoindre
          </button>
        </div>
      </div>

      {/* Subscribe form preview */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Aperçu du formulaire
        </p>
        <div
          className="rounded-xl p-3 text-center"
          style={{ backgroundColor: "var(--theme-card-bg, #F9FAFB)" }}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Users size={14} style={{ color: "var(--theme-btn-bg, #0D9488)" }} />
            <p className="text-xs font-semibold" style={{ color: "var(--theme-text, #111827)" }}>
              {title || "Communauté"}
            </p>
          </div>
          <p className="mt-0.5 text-lg font-extrabold" style={{ color: "var(--theme-text, #111827)" }}>
            {formatPrice(priceAmount || 0)}
            <span className="text-xs font-normal" style={{ color: "var(--theme-text-muted, #6B7280)" }}>{billingPeriodLabel(billingPeriod || "MONTHLY")}</span>
          </p>
        </div>

        {fields.map((field) => (
          <div key={field.id}>
            <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--theme-text, #374151)" }}>
              {field.label}{!field.required && " (optionnel)"}
            </label>
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                backgroundColor: "var(--theme-card-bg, #F9FAFB)",
                border: "1px solid var(--theme-card-border, #E5E7EB)",
                color: "var(--theme-text-muted, #9CA3AF)",
              }}
            >
              {field.placeholder || field.label}
            </div>
          </div>
        ))}

        <button
          className="w-full py-2.5 text-xs font-semibold"
          style={{
            backgroundColor: "var(--theme-btn-bg, #0D9488)",
            color: "var(--theme-btn-color, #FFFFFF)",
            border: "var(--theme-btn-border, none)",
            borderRadius: "var(--theme-btn-radius, 12px)",
          }}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
