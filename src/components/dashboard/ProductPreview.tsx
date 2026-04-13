"use client";

import Image from "next/image";
import { ShoppingBag, Calendar, CreditCard, ExternalLink, Mail, Users, Handshake, Heart } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { ProductFormData } from "@/components/dashboard/ProductForm";
import type { ProductTypeDefinition } from "@/lib/productTypes";
interface ProductPreviewProps {
  form: ProductFormData;
  productType: ProductTypeDefinition;
}

export function ProductPreview({ form, productType }: ProductPreviewProps) {
  const title = form.title || "Titre du produit";
  const price = parseInt(form.price) || 0;
  const discountPrice = form.discountPrice ? parseInt(form.discountPrice) : null;

  const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--theme-card-bg, #FFFFFF)",
    border: "1px solid var(--theme-card-border, #E5E7EB)",
    borderRadius: "var(--theme-card-radius, 16px)",
    boxShadow: "var(--theme-card-shadow, none)",
    backdropFilter: "var(--theme-card-backdrop, none)",
  };

  // ── LINK — matches store LinkBlock with ctaStyle support ──
  if (productType.type === "LINK") {
    const linkCtaStyle = form.ctaStyle || "button";

    // Style "preview": grande image + titre en dessous
    if (linkCtaStyle === "preview") {
      return (
        <PreviewFrame label="Aperçu du lien">
          <div className="overflow-hidden" style={cardStyle}>
            {form.coverUrl ? (
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
                <Image src={form.coverUrl} alt="" fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="flex aspect-[3/1] w-full items-center justify-center" style={{ backgroundColor: "var(--theme-bg, #F3F4F6)" }}>
                <ExternalLink size={28} style={{ color: "var(--theme-text-muted, #9CA3AF)" }} />
              </div>
            )}
            <div className="flex flex-1 items-center gap-3 px-4 py-3.5">
              <span
                className="flex-1 font-semibold line-clamp-1"
                style={{ color: "var(--theme-text, #111827)", fontSize: "14px" }}
              >
                {title}
              </span>
            </div>
          </div>
        </PreviewFrame>
      );
    }

    // Style "callout": miniature à gauche + titre à droite
    if (linkCtaStyle === "callout") {
      return (
        <PreviewFrame label="Aperçu du lien">
          <div className="overflow-hidden" style={cardStyle}>
            <div className="flex items-start gap-3 p-3">
              {form.coverUrl ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-gray-100" style={{ borderRadius: "var(--theme-thumb-radius, 8px)" }}>
                  <Image src={form.coverUrl} alt="" fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center" style={{ backgroundColor: "var(--theme-bg, #F3F4F6)", color: "var(--theme-text-muted, #9CA3AF)", borderRadius: "var(--theme-thumb-radius, 8px)" }}>
                  <ExternalLink size={24} />
                </div>
              )}
              <div className="min-w-0 flex-1 py-0.5">
                <span
                  className="font-bold leading-snug line-clamp-1"
                  style={{ color: "var(--theme-text, #111827)", fontSize: "15px" }}
                >
                  {title}
                </span>
              </div>
            </div>
          </div>
        </PreviewFrame>
      );
    }

    // Style "button" (default): ligne compacte
    return (
      <PreviewFrame label="Aperçu du lien">
        <div
          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-all"
          style={cardStyle}
        >
          {form.coverUrl ? (
            <div className="h-11 w-11 shrink-0 overflow-hidden" style={{ borderRadius: "var(--theme-thumb-radius, 8px)" }}>
              <Image src={form.coverUrl} alt="" width={44} height={44} className="h-full w-full object-cover" unoptimized />
            </div>
          ) : (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center"
              style={{
                backgroundColor: "var(--theme-bg, #F3F4F6)",
                color: "var(--theme-text-muted, #4B5563)",
                borderRadius: "var(--theme-thumb-radius, 8px)",
              }}
            >
              <ExternalLink size={18} />
            </div>
          )}
          <span
            className="flex-1 font-semibold line-clamp-1"
            style={{ color: "var(--theme-text, #111827)", fontSize: "13px" }}
          >
            {title}
          </span>
          <ExternalLink size={16} style={{ color: "var(--theme-text-muted, #9CA3AF)" }} />
        </div>
      </PreviewFrame>
    );
  }

  // ── ALL NON-LINK BLOCKS — StoreCard preview with ctaStyle support ──
  const PREVIEW_ICONS: Record<string, React.ElementType> = {
    SALE: ShoppingBag, BOOKING: Calendar, LEAD_MAGNET: Mail,
    WAITING_LIST: Users, PAYMENT: CreditCard, DONATION: Heart, PARTNERSHIP: Handshake,
  };
  const PreviewIcon = PREVIEW_ICONS[productType.type] || ShoppingBag;
  const storeSubtitle = (() => {
    switch (productType.type) {
      case "SALE": {
        const hasDisc = discountPrice != null && discountPrice > 0 && discountPrice < price;
        return price > 0 ? formatPrice(hasDisc ? discountPrice! : price) : "Gratuit";
      }
      case "BOOKING": {
        const d = parseInt(form.duration) || 60;
        return `${formatPrice(price * Math.ceil(d / 60))} · ${d} min`;
      }
      case "LEAD_MAGNET": return price > 0 ? formatPrice(price) : "Gratuit";
      case "WAITING_LIST": return price > 0 ? formatPrice(price) : "Liste d\u2019attente";
      case "PAYMENT": return "Paiement libre";
      case "DONATION": return "Don";
      case "PARTNERSHIP": return "Partenariat";
      default: return null;
    }
  })();

  const ctaStyle = form.ctaStyle || "button";

  // ── Style "preview": large image on top + title + description + price + CTA ──
  if (ctaStyle === "preview") {
    return (
      <PreviewFrame label="Aperçu miniature">
        <div className="overflow-hidden" style={cardStyle}>
          {form.coverUrl ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
              <Image src={form.coverUrl} alt="" fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="flex aspect-[3/1] w-full items-center justify-center" style={{ backgroundColor: "var(--theme-bg, #F3F4F6)" }}>
              <PreviewIcon size={28} style={{ color: "var(--theme-text-muted, #9CA3AF)" }} />
            </div>
          )}
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
            {form.subtitle && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--theme-text-muted, #6B7280)" }}>
                {form.subtitle}
              </p>
            )}
            {storeSubtitle && (
              <p 
                className="mt-1 font-bold" 
                style={{ 
                  color: "var(--theme-primary, #0D9488)",
                  fontSize: "14px"
                }}
              >
                {storeSubtitle}
              </p>
            )}
          </div>
        </div>
      </PreviewFrame>
    );
  }

  // ── Style "callout": image left + text right ──
  if (ctaStyle === "callout") {
    return (
      <PreviewFrame label="Aperçu miniature">
        <div className="overflow-hidden" style={cardStyle}>
          <div className="flex items-start gap-3 p-3 pr-10">
            {form.coverUrl ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-gray-100" style={{ borderRadius: "var(--theme-thumb-radius, 8px)" }}>
                <Image src={form.coverUrl} alt="" fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center" style={{ backgroundColor: "var(--theme-bg, #F3F4F6)", color: "var(--theme-text-muted, #9CA3AF)", borderRadius: "var(--theme-thumb-radius, 8px)" }}>
                <PreviewIcon size={24} />
              </div>
            )}
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
              {form.subtitle && (
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--theme-text-muted, #6B7280)" }}>
                  {form.subtitle}
                </p>
              )}
              {storeSubtitle && (
                <p 
                  className="mt-1 font-bold" 
                  style={{ 
                    color: "var(--theme-primary, #0D9488)",
                    fontSize: "14px"
                  }}
                >
                  {storeSubtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      </PreviewFrame>
    );
  }

  // ── Style "button" (default): compact row — thumbnail + title + subtitle ──
  return (
    <PreviewFrame label="Aperçu miniature">
      <div
        className="flex items-center gap-3 px-3 py-3 pr-10 transition-all"
        style={cardStyle}
      >
        {form.coverUrl ? (
          <div className="h-12 w-12 shrink-0 overflow-hidden" style={{ borderRadius: "var(--theme-thumb-radius, 8px)" }}>
            <Image src={form.coverUrl} alt="" width={48} height={48} className="h-full w-full object-cover" unoptimized />
          </div>
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center"
            style={{
              backgroundColor: "var(--theme-bg, #F3F4F6)",
              color: "var(--theme-text-muted, #9CA3AF)",
              borderRadius: "var(--theme-thumb-radius, 8px)",
            }}
          >
            <PreviewIcon size={20} />
          </div>
        )}
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
          {storeSubtitle && (
            <p 
              className="mt-0.5 truncate font-medium" 
              style={{ 
                color: "var(--theme-primary, #0D9488)",
                fontSize: "12px"
              }}
            >
              {storeSubtitle}
            </p>
          )}
        </div>
      </div>
    </PreviewFrame>
  );
}

// ── Preview frame wrapper ──
function PreviewFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <div className="rounded-2xl p-3" style={{ backgroundColor: "var(--theme-bg, #F9FAFB)" }}>
        {children}
      </div>
    </div>
  );
}
