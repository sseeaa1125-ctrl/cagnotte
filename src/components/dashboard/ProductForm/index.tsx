"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui";
import { Smartphone, X } from "lucide-react";
import type { ProductTypeDefinition } from "@/lib/productTypes";
import type { ThemeConfig, ProductFile } from "@/types";
import { getResolvedTheme, getFont, getButtonStyle, getBackgroundStyle, hexToRgbString } from "@/types";
import { ProductPreview } from "@/components/dashboard/ProductPreview";
import { ThumbnailTab } from "./ThumbnailTab";
import { AvailabilityTab } from "./AvailabilityTab";
import { CheckoutTab } from "./CheckoutTab";
import { LandingTab } from "./LandingTab";
import { OptionsTab } from "./OptionsTab";
import type { ProductFormData, Tab } from "./types";
import { getTabLabel } from "./types";

// Re-export types so existing imports from "ProductForm" keep working
export type { ProductFormData, SlotRow, CheckoutSection } from "./types";
export { EMPTY_FORM } from "./types";

// Google Fonts URL slugs for preview
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

interface ProductFormProps {
  productType: ProductTypeDefinition;
  form: ProductFormData;
  onChange: (form: ProductFormData) => void;
  onSave: (isDraft: boolean) => void;
  saving: boolean;
  error: string;
  mode: "create" | "edit";
  blockId?: string;
  themeConfig?: ThemeConfig;
  imageStyle?: string | null;
}

export function ProductForm({
  productType,
  form,
  onChange,
  onSave,
  saving,
  error: _error,
  mode,
  themeConfig,
  imageStyle,
}: ProductFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>(productType.tabs[0]);
  const [mobilePreview, setMobilePreview] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    // Scroll to top of form on mobile when switching tabs
    if (formRef.current && window.innerWidth < 1024) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }


  // Auto-scroll hint: gentle double-bounce to show tabs are scrollable
  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const timer = setTimeout(() => {
      // First bounce
      el.scrollTo({ left: 48, behavior: "smooth" });
      setTimeout(() => el.scrollTo({ left: 0, behavior: "smooth" }), 500);
      // Second bounce (smaller)
      setTimeout(() => el.scrollTo({ left: 32, behavior: "smooth" }), 1200);
      setTimeout(() => el.scrollTo({ left: 0, behavior: "smooth" }), 1700);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // H1: Warn before leaving with unsaved changes
  const isDirty = form.title.trim().length > 0;
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const latestFormRef = useRef(form);
  useEffect(() => { latestFormRef.current = form; });

  function set<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    const updated = { ...latestFormRef.current, [key]: value };
    latestFormRef.current = updated;
    onChange(updated);
  }

  function setMultiple(updates: Partial<ProductFormData>) {
    const updated = { ...latestFormRef.current, ...updates };
    latestFormRef.current = updated;
    onChange(updated);
  }

  function addFile(newFile: ProductFile) {
    const currentFiles = latestFormRef.current.files;
    set("files", [...currentFiles, newFile]);
    set("redirectUrl", "");
  }

  const tabs = productType.tabs;
  const hasMultipleTabs = tabs.length > 1;

  // Global validation: check ALL tabs at once, return errors per tab
  function getTabErrors(tab: Tab): string | null {
    if (tab === "thumbnail") {
      if (!form.title.trim()) {
        const labels: Record<string, string> = {
          SALE: "Donne un titre à ton produit",
          BOOKING: "Donne un titre à ton service",
          PAYMENT: "Donne un titre à ton paiement",
          DONATION: "Donne un titre à ton don",
          FUNDRAISER: "Donne un titre à ta levée de fonds",
          FORMATION: "Donne un titre à ta formation",
          LINK: "Donne un titre à ton lien",
          LEAD_MAGNET: "Donne un titre à ton lead magnet",
          WAITING_LIST: "Donne un titre à ta liste d'attente",
          PARTNERSHIP: "Donne un titre à ton partenariat",
        };
        return labels[productType.type] || "Titre requis";
      }
      if (productType.type === "LINK" && !form.url.trim()) return "Ajoute l'URL de destination";
    }
    if (tab === "availability") {
      if (form.slots.length === 0) return "Ajoute au moins un créneau disponible";
    }
    if (tab === "checkout") {
      if (productType.hasPrice) {
        const price = parseInt(form.price);
        const freeAllowed = productType.type === "LEAD_MAGNET" || productType.type === "WAITING_LIST";
        if (!freeAllowed && (!form.price || isNaN(price) || price < 500)) {
          return productType.type === "BOOKING"
            ? "Définis un tarif (min. 500 FCFA)"
            : "Définis un prix (min. 500 FCFA)";
        }
      }
      if (productType.hasFile) {
        if ((productType.type === "SALE" || productType.type === "LEAD_MAGNET") && !form.fileUrl && form.files.length === 0 && !form.redirectUrl) {
          return productType.type === "SALE"
            ? "Ajoute un fichier ou une URL de redirection"
            : "Ajoute le fichier à envoyer ou une URL";
        }
      }
    }
    if (tab === "landing") {
      // La page de vente est totalement optionnelle pour les dons et paiements
      if (productType.type === "DONATION" || productType.type === "PAYMENT" || productType.type === "FUNDRAISER" || productType.type === "FORMATION") return null;
      const hasAnything = form.checkoutSections.length > 0 || form.reviews.length > 0;
      if (!hasAnything) return "Ajoute au moins une section à ta page de vente";
    }
    return null;
  }

  const canPublish = tabs.every((tab) => getTabErrors(tab) === null);
  // Build a user-friendly global hint from the first error found
  const firstError = tabs.map((t) => ({ tab: t, error: getTabErrors(t) })).find((e) => e.error);
  const globalHint = firstError
    ? `${getTabLabel(firstError.tab, productType.type)} : ${firstError.error}`
    : "";

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start mb-8 lg:pb-0 relative min-h-0 h-full overflow-x-hidden">
      {/* Form column */}
      <div ref={formRef} className="flex-1 min-w-0 w-full flex flex-col min-h-0 overflow-x-hidden">
        <div className="flex-1 overflow-y-auto space-y-6 lg:pr-2 pb-6">
          {/* Tabs — freely navigable with error badges */}
        {hasMultipleTabs && (
          <div ref={tabsScrollRef} className="overflow-x-auto scrollbar-hide -mx-1 px-1">
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1 min-w-max">
              {tabs.map((tab) => {
                const tabError = getTabErrors(tab);
                return (
                  <button
                    key={tab}
                    onClick={() => switchTab(tab)}
                    className={`relative shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                      activeTab === tab
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {getTabLabel(tab, productType.type)}
                    {tabError && activeTab !== tab && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab content */}
        {activeTab === "thumbnail" && (
          <ThumbnailTab
            productType={productType}
            form={form}
            set={set}
          />
        )}

        {activeTab === "availability" && (
          <AvailabilityTab form={form} set={set} />
        )}

        {activeTab === "checkout" && (
          <CheckoutTab
            productType={productType}
            form={form}
            set={set}
            setMultiple={setMultiple}
            addFile={addFile}
          />
        )}

        {activeTab === "landing" && (
          <LandingTab
            form={form}
            set={set}
            productType={productType}
          />
        )}

        {activeTab === "options" && (
          <OptionsTab
            productType={productType}
            form={form}
            set={set}
          />
        )}

        {/* Actions — desktop inline, hidden on mobile (sticky bar below) */}
        <div className="hidden lg:block space-y-2">
          {!canPublish && globalHint && (
            <p className="text-xs text-amber-600 text-center">{globalHint}</p>
          )}
          <div className="flex gap-3 py-4">
            {mode === "create" && (
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => onSave(true)}
                loading={saving}
                disabled={!form.title}
              >
                Brouillon
              </Button>
            )}
            <Button
              size="lg"
              className="flex-1"
              onClick={() => onSave(false)}
              loading={saving}
              disabled={!canPublish}
            >
              {mode === "create" ? "Publier" : "Enregistrer"}
            </Button>
          </div>
        </div>
        </div>
      </div>

      {/* Desktop preview panel — hidden on mobile */}
      <div className="hidden lg:block lg:w-[280px] xl:w-[340px] shrink-0 sticky top-[calc(64px+1.5rem)] max-h-[calc(100vh-64px-3rem)] overflow-y-auto pb-6 scrollbar-hide">
        <div className="rounded-2xl border border-gray-100 bg-gray-50/50 shadow-sm overflow-hidden p-2.5">
          {themeConfig ? (
            <ThemePreviewWrapper themeConfig={themeConfig} imageStyle={imageStyle}>
              <ProductPreview form={form} productType={productType} />
            </ThemePreviewWrapper>
          ) : (
            <ProductPreview form={form} productType={productType} />
          )}
        </div>
      </div>

      {/* Mobile sticky action bar — bottom tab bar is hidden on this page */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 py-3 [transform:translate3d(0,0,0)]">
        {!canPublish && globalHint && (
          <p className="text-xs text-amber-600 text-center mb-2">{globalHint}</p>
        )}
        <div className="flex gap-3">
          {mode === "create" && (
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => onSave(true)}
              loading={saving}
              disabled={!form.title}
            >
              Brouillon
            </Button>
          )}
          <Button
            size="lg"
            className="flex-1"
            onClick={() => onSave(false)}
            loading={saving}
            disabled={!canPublish}
          >
            {mode === "create" ? "Publier" : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* Mobile floating preview button */}
      <button
        type="button"
        onClick={() => setMobilePreview(true)}
        className="lg:hidden fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-black/20 active:scale-95 transition-transform"
      >
        <Smartphone size={14} />
        Aperçu
      </button>

      {/* Mobile preview modal */}
      {mobilePreview && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobilePreview(false)} />
          <div className="relative z-10 w-full max-h-[80vh] bg-white rounded-t-2xl shadow-2xl overflow-y-auto pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom-4 duration-300">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-gray-100 px-5 py-3">
              <span className="text-sm font-bold text-gray-900">Aperçu</span>
              <button onClick={() => setMobilePreview(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Fermer">
                <X size={16} />
              </button>
            </div>
            <div className="p-5">
              {themeConfig ? (
                <ThemePreviewWrapper themeConfig={themeConfig} imageStyle={imageStyle}>
                  <ProductPreview form={form} productType={productType} />
                </ThemePreviewWrapper>
              ) : (
                <ProductPreview form={form} productType={productType} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// Theme wrapper for preview — applies seller's CSS vars
// ══════════════════════════════════════════════

function ThemePreviewWrapper({ themeConfig, imageStyle, children }: { themeConfig: ThemeConfig; imageStyle?: string | null; children: React.ReactNode }) {
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
        {children}
      </div>
    </>
  );
}
