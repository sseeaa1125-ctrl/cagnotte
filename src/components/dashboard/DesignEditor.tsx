"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button, FileUploadButton } from "@/components/ui";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Paintbrush,
  Palette,
  Type,
  Layout,
  ImageIcon,
  Trash2,
  Check,
  RotateCcw,
} from "lucide-react";
import { THEMES, FONTS, THEME_CATEGORIES, getButtonStyle, getBackgroundStyle, getContrastColor } from "@/types";
import type { Theme, ThemeConfig, ThemeCategory } from "@/types";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

interface DesignEditorProps {
  currentThemeId: string;
  currentFont: string;
  currentColors: { primary?: string; background?: string; button?: string } | null;
  currentBgImageUrl: string | null;
  currentHeaderLayout: string;
  currentImageStyle: string | null;
  onThemeChange: (config: ThemeConfig) => void;
  onHeaderLayoutChange: (layout: string) => void;
  onImageStyleChange: (style: string | null) => void;
  onBgImageChange: (url: string | null) => void;
  onSave?: () => void;
  onHasChangesChange?: (hasChanges: boolean) => void;
}

// ── Color presets for quick selection ──
const COLOR_PRESETS = [
  "#0D9488", "#2563EB", "#7C3AED", "#EC4899", "#DC2626",
  "#EA580C", "#D97706", "#16A34A", "#0891B2", "#6366F1",
  "#111827", "#FFFFFF", "#F5F5F4", "#FEF3C7", "#FDF2F8",
];

// ── Accordion section component ──
function AccordionSection({
  icon: Icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          {subtitle && <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>}
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ── Color picker row with swatches ──
function ColorPickerRow({
  label,
  description,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  defaultValue: string;
  onChange: (v: string) => void;
}) {
  const displayColor = value || defaultValue;
  const textOnColor = getContrastColor(displayColor);
  const isCustom = !!value && value !== defaultValue;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <label className="relative cursor-pointer">
          <input
            type="color"
            value={displayColor}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-gray-200 shadow-sm"
            style={{ backgroundColor: displayColor }}
          >
            <span className="text-[8px] font-bold" style={{ color: textOnColor, opacity: 0.7 }}>
              {displayColor.toUpperCase().slice(0, 7)}
            </span>
          </div>
        </label>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900">{label}</p>
          <p className="text-[11px] text-gray-400">{description}</p>
        </div>
        {isCustom && (
          <button
            onClick={() => onChange("")}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Réinitialiser"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>
      {/* Swatches */}
      <div className="flex flex-wrap gap-1.5">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`h-8 w-8 sm:h-6 sm:w-6 rounded-lg border-2 transition-all ${
              displayColor.toLowerCase() === c.toLowerCase()
                ? "border-teal-600 scale-110 ring-2 ring-teal-600/20"
                : "border-gray-200 hover:scale-105"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

export function DesignEditor({
  currentThemeId,
  currentFont,
  currentColors,
  currentBgImageUrl,
  currentHeaderLayout,
  currentImageStyle,
  onThemeChange,
  onHeaderLayoutChange,
  onImageStyleChange,
  onBgImageChange,
  onSave,
  onHasChangesChange,
}: DesignEditorProps) {
  const [selectedThemeId, setSelectedThemeId] = useState(currentThemeId);
  const [selectedFont, setSelectedFont] = useState(currentFont);
  const [customPrimary, setCustomPrimary] = useState(currentColors?.primary || "");
  const [customBackground, setCustomBackground] = useState(currentColors?.background || "");
  const [customButton, setCustomButton] = useState(currentColors?.button || "");
  const [selectedHeaderLayout, setSelectedHeaderLayout] = useState(currentHeaderLayout || "centered");
  const [selectedImageStyle, setSelectedImageStyle] = useState<string | null>(currentImageStyle);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(currentBgImageUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const [themeFilter, setThemeFilter] = useState<ThemeCategory | "all">("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const selectedTheme = THEMES.find((t) => t.id === selectedThemeId) || THEMES[0];
  const filteredThemes = themeFilter === "all" ? THEMES : THEMES.filter((t) => t.category === themeFilter);

  // Mobile carousel: scroll to selected theme on mount
  const currentIdx = THEMES.findIndex((t) => t.id === selectedThemeId);
  const didInitScroll = useRef(false);
  useEffect(() => {
    if (carouselRef.current && currentIdx >= 0 && !didInitScroll.current) {
      didInitScroll.current = true;
      const card = carouselRef.current.children[currentIdx] as HTMLElement | undefined;
      card?.scrollIntoView({ inline: "center", block: "nearest" });
    }
  }, [currentIdx]);

  // Mobile: scroll carousel to a given index (without selecting)
  const scrollCarouselTo = useCallback((idx: number) => {
    if (carouselRef.current) {
      const card = carouselRef.current.children[idx] as HTMLElement | undefined;
      card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, []);

  // Detect if any setting has changed from the saved state
  const hasChanges =
    selectedThemeId !== currentThemeId ||
    selectedFont !== currentFont ||
    customPrimary !== (currentColors?.primary || "") ||
    customBackground !== (currentColors?.background || "") ||
    customButton !== (currentColors?.button || "") ||
    selectedHeaderLayout !== (currentHeaderLayout || "centered") ||
    selectedImageStyle !== currentImageStyle ||
    bgImageUrl !== currentBgImageUrl;

  // Notify parent when hasChanges changes
  useEffect(() => {
    onHasChangesChange?.(hasChanges);
  }, [hasChanges, onHasChangesChange]);

  function selectTemplate(theme: Theme) {
    setSelectedThemeId(theme.id);
    setCustomPrimary("");
    setCustomBackground("");
    setCustomButton("");
    // Reset header layout to theme default
    setSelectedHeaderLayout(theme.headerStyle);
    onHeaderLayoutChange(theme.headerStyle);
    setSelectedImageStyle(null);
    onImageStyleChange(null);
    if (!theme.supportsBackgroundImage && bgImageUrl) {
      setBgImageUrl(null);
      onBgImageChange(null);
    }
    onThemeChange({
      themeId: theme.id,
      themeFont: selectedFont,
      themeColors: null,
    });
  }

  function buildThemeColors() {
    if (!customPrimary && !customBackground && !customButton) return null;
    return {
      primary: customPrimary || undefined,
      background: customBackground || undefined,
      button: customButton || undefined,
    };
  }

  function handleFontChange(fontId: string) {
    setSelectedFont(fontId);
    onThemeChange({
      themeId: selectedThemeId,
      themeFont: fontId,
      themeColors: buildThemeColors(),
    });
  }

  function handleColorChange(type: "primary" | "background" | "button", value: string) {
    const newPrimary = type === "primary" ? value : customPrimary;
    const newBg = type === "background" ? value : customBackground;
    const newBtn = type === "button" ? value : customButton;
    if (type === "primary") setCustomPrimary(value);
    else if (type === "background") setCustomBackground(value);
    else setCustomButton(value);
    onThemeChange({
      themeId: selectedThemeId,
      themeFont: selectedFont,
      themeColors:
        newPrimary || newBg || newBtn
          ? { primary: newPrimary || undefined, background: newBg || undefined, button: newBtn || undefined }
          : null,
    });
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      await api("/api/sellers/theme", {
        method: "PUT",
        body: {
          themeId: selectedThemeId,
          themeFont: selectedFont,
          themeColors: buildThemeColors(),
          bgImageUrl: bgImageUrl,
          headerLayout: selectedHeaderLayout,
          imageStyle: selectedImageStyle,
        },
      });
      onSave?.();
      toast("Design sauvegardé !");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setSelectedThemeId(currentThemeId);
    setSelectedFont(currentFont);
    setCustomPrimary(currentColors?.primary || "");
    setCustomBackground(currentColors?.background || "");
    setCustomButton(currentColors?.button || "");
    setSelectedHeaderLayout(currentHeaderLayout || "centered");
    setSelectedImageStyle(currentImageStyle);
    setBgImageUrl(currentBgImageUrl);
    onThemeChange({
      themeId: currentThemeId,
      themeFont: currentFont,
      themeColors: currentColors,
    });
    onHeaderLayoutChange(currentHeaderLayout || "centered");
    onImageStyleChange(currentImageStyle);
    onBgImageChange(currentBgImageUrl);
  }

  return (
    <div className="space-y-3">
      {/* ══════════════ MOBILE: Carousel + full options (< lg) ══════════════ */}
      <div className="lg:hidden space-y-4 pt-2">
        {/* Swipeable theme carousel — tap to select only */}
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {THEMES.map((theme, idx) => (
            <button
              key={theme.id}
              onClick={() => {
                selectTemplate(theme);
                scrollCarouselTo(idx);
              }}
              className={`shrink-0 snap-center relative overflow-hidden rounded-2xl border-2 transition-all w-[70vw] max-w-[280px] ${
                selectedThemeId === theme.id
                  ? "border-teal-600 ring-2 ring-teal-600/20"
                  : "border-gray-200 opacity-60"
              }`}
            >
              <TemplateCard theme={theme} />
              {selectedThemeId === theme.id && (
                <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white shadow">
                  <Check size={14} />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Theme name + browse arrows */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => {
              const prev = Math.max(0, currentIdx - 1);
              scrollCarouselTo(prev);
            }}
            disabled={currentIdx <= 0}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="min-w-[120px] text-center text-sm font-bold text-gray-900">
            {selectedTheme.name}
          </span>
          <button
            onClick={() => {
              const next = Math.min(THEMES.length - 1, currentIdx + 1);
              scrollCarouselTo(next);
            }}
            disabled={currentIdx >= THEMES.length - 1}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* ── Palette de couleurs ── */}
        <AccordionSection icon={Palette} title="Couleurs" subtitle="Accent, fond, bouton">
          <div className="space-y-4">
            <ColorPickerRow
              label="Accent"
              description="Couleur principale du thème"
              value={customPrimary}
              defaultValue={selectedTheme.primary}
              onChange={(v) => handleColorChange("primary", v)}
            />
            <div className="border-t border-gray-100" />
            <ColorPickerRow
              label="Fond"
              description="Arrière-plan de la page"
              value={customBackground}
              defaultValue={selectedTheme.background}
              onChange={(v) => handleColorChange("background", v)}
            />
            <div className="border-t border-gray-100" />
            <ColorPickerRow
              label="Bouton"
              description="Couleur des boutons d'action"
              value={customButton}
              defaultValue={selectedTheme.primary}
              onChange={(v) => handleColorChange("button", v)}
            />
            {/* Live button preview */}
            <div className="border-t border-gray-100 pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Aperçu</p>
              <div
                className="flex items-center justify-center rounded-xl p-4"
                style={{ backgroundColor: customBackground || selectedTheme.background }}
              >
                <button
                  className="px-6 py-3 text-sm font-semibold transition-all"
                  style={{
                    ...getButtonStyle({
                      ...selectedTheme,
                      ...(customButton ? { customButtonColor: customButton } : {}),
                      ...(customPrimary ? { primary: customPrimary } : {}),
                    }),
                    borderRadius: selectedTheme.buttonRadius,
                  }}
                >
                  Acheter maintenant
                </button>
              </div>
            </div>
          </div>
        </AccordionSection>

        {/* ── Position du profil ── */}
        <AccordionSection
          icon={Layout}
          title="Position du profil"
          subtitle={
            ({ centered: "Centré", left: "Gauche", compact: "Compact", banner: "Bannière", pro: "Pro", hero: "Hero", editorial: "Éditorial", sadio: "Sadio" } as Record<string, string>)[selectedHeaderLayout] || "Centré"
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(["centered", "left", "compact", "banner", "pro", "hero", "editorial", "sadio"] as const).map((layout) => {
              const labels: Record<string, string> = { centered: "Centré", left: "Gauche", compact: "Compact", banner: "Bannière", pro: "Pro", hero: "Hero", editorial: "Éditorial", sadio: "Sadio" };
              const isActive = selectedHeaderLayout === layout;
              return (
                <button
                  key={layout}
                  onClick={() => {
                    setSelectedHeaderLayout(layout);
                    onHeaderLayoutChange(layout);
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all ${
                    isActive
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="relative flex h-12 w-9 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-1">
                    {layout === "centered" && (
                      <>
                        <div className="h-3 w-3 rounded-full bg-gray-300" />
                        <div className="h-0.5 w-5 rounded-full bg-gray-300" />
                        <div className="h-0.5 w-3 rounded-full bg-gray-200" />
                      </>
                    )}
                    {layout === "left" && (
                      <>
                        <div className="flex w-full items-center gap-0.5">
                          <div className="h-3 w-3 shrink-0 rounded-sm bg-gray-300" />
                          <div className="h-0.5 w-3 rounded-full bg-gray-300" />
                        </div>
                        <div className="h-1.5 w-6 rounded-sm bg-gray-200" />
                      </>
                    )}
                    {layout === "compact" && (
                      <>
                        <div className="flex w-full items-center gap-0.5">
                          <div className="h-2 w-2 shrink-0 rounded-full bg-gray-300" />
                          <div className="h-0.5 w-3 rounded-full bg-gray-300" />
                        </div>
                        <div className="h-1.5 w-6 rounded-sm bg-gray-200" />
                        <div className="h-1.5 w-6 rounded-sm bg-gray-200" />
                      </>
                    )}
                    {layout === "pro" && (
                      <>
                        <div className="h-0.5 w-4 rounded-full bg-gray-300" />
                        <div className="flex gap-0.5">
                          <div className="h-1 w-1 rounded-full bg-gray-200" />
                          <div className="h-1 w-1 rounded-full bg-gray-200" />
                        </div>
                        <div className="h-4 w-6 rounded-sm bg-gray-200" />
                      </>
                    )}
                    {layout === "hero" && (
                      <>
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-gray-300 to-gray-200 opacity-40" />
                        <div className="relative z-10 h-1 w-4 rounded-full bg-gray-400" />
                        <div className="relative z-10 flex gap-0.5">
                          <div className="h-1 w-1 rounded-full bg-gray-400" />
                          <div className="h-1 w-1 rounded-full bg-gray-400" />
                        </div>
                      </>
                    )}
                    {layout === "banner" && (
                      <>
                        <div className="flex w-full items-start gap-1">
                          <div className="h-3.5 w-3.5 shrink-0 rounded-full bg-gray-300" />
                          <div className="flex flex-col gap-0.5">
                            <div className="h-0.5 w-3 rounded-full bg-gray-300" />
                            <div className="flex gap-0.5">
                              <div className="h-0.5 w-0.5 rounded-full bg-gray-200" />
                              <div className="h-0.5 w-0.5 rounded-full bg-gray-200" />
                              <div className="h-0.5 w-0.5 rounded-full bg-gray-200" />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    {layout === "editorial" && (
                      <>
                        <div className="h-3 w-full rounded-sm bg-gray-300" />
                        <div className="flex gap-0.5">
                          <div className="h-1 w-1 rounded-full bg-gray-200" />
                          <div className="h-1 w-1 rounded-full bg-gray-200" />
                        </div>
                        <div className="h-0.5 w-4 rounded-full bg-gray-300" />
                      </>
                    )}
                    {layout === "sadio" && (
                      <>
                        <div className="flex w-full items-center gap-0.5">
                          <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />
                          <div className="flex flex-col gap-0.5">
                            <div className="h-0.5 w-3 rounded-full bg-gray-300" />
                            <div className="h-0.5 w-2 rounded-full bg-gray-200" />
                          </div>
                        </div>
                        <div className="h-1.5 w-6 rounded-sm bg-gray-200" />
                        <div className="h-1.5 w-6 rounded-sm bg-gray-200" />
                        <div className="flex gap-0.5">
                          <div className="h-1 w-1 rounded-full bg-gray-300" />
                          <div className="h-1 w-1 rounded-full bg-gray-300" />
                        </div>
                      </>
                    )}
                  </div>
                  <span className={`text-[11px] font-semibold ${isActive ? "text-teal-700" : "text-gray-600"}`}>
                    {labels[layout]}
                  </span>
                  {layout === selectedTheme.headerStyle && (
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[8px] font-semibold text-gray-400">
                      Défaut
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </AccordionSection>

        {/* ── Forme des images ── */}
        <AccordionSection
          icon={ImageIcon}
          title="Forme des images"
          subtitle={
            selectedImageStyle
              ? ({ circle: "Rondes", rounded: "Arrondies", square: "Carrées" } as Record<string, string>)[selectedImageStyle] || "Thème"
              : "Thème"
          }
        >
          <p className="mb-3 text-[11px] text-gray-400">
            S&apos;applique aux miniatures des blocs et à l&apos;avatar du profil
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([null, "circle", "rounded", "square"] as const).map((style) => {
              const labels: Record<string, string> = { circle: "Rondes", rounded: "Arrondies", square: "Carrées" };
              const label = style ? labels[style] : "Thème";
              const isActive = selectedImageStyle === style;
              const previewRadius = style === "circle" ? "9999px" : style === "square" ? "2px" : style === "rounded" ? "6px" : (selectedTheme.avatarStyle === "circle" ? "9999px" : selectedTheme.avatarStyle === "square" ? "2px" : "6px");
              return (
                <button
                  key={style || "theme-default"}
                  onClick={() => {
                    setSelectedImageStyle(style);
                    onImageStyleChange(style);
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all ${
                    isActive
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className="h-10 w-10 bg-gray-300"
                    style={{ borderRadius: previewRadius }}
                  />
                  <span className={`text-[11px] font-semibold ${isActive ? "text-teal-700" : "text-gray-600"}`}>
                    {label}
                  </span>
                  {style === null && (
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[8px] font-semibold text-gray-400">
                      Défaut
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </AccordionSection>

        {/* ── Police ── */}
        <AccordionSection
          icon={Type}
          title="Police"
          subtitle={FONTS.find((f) => f.id === selectedFont)?.name}
        >
          <div className="space-y-1.5">
            {FONTS.map((font) => (
              <button
                key={font.id}
                onClick={() => handleFontChange(font.id)}
                className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 transition-all ${
                  selectedFont === font.id
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-left">
                  <p
                    className={`text-sm ${selectedFont === font.id ? "font-semibold text-teal-700" : "text-gray-900"}`}
                    style={{ fontFamily: font.family }}
                  >
                    {font.name}
                  </p>
                  <p className="text-[11px] text-gray-400" style={{ fontFamily: font.family }}>
                    Aa Bb Cc 123
                  </p>
                </div>
                {selectedFont === font.id && (
                  <Check size={16} className="shrink-0 text-teal-600" />
                )}
              </button>
            ))}
          </div>
        </AccordionSection>

        {/* ── Image de fond (si supporté) ── */}
        {selectedTheme.supportsBackgroundImage && (
          <AccordionSection icon={ImageIcon} title="Image de fond">
            <p className="mb-3 text-[11px] text-gray-400">
              Couvre tout l&apos;arrière-plan de ta page
            </p>
            {bgImageUrl ? (
              <div className="relative inline-block">
                <img
                  src={bgImageUrl}
                  alt="Fond"
                  className="h-24 w-40 rounded-xl object-cover border border-gray-200"
                />
                <button
                  onClick={() => {
                    setBgImageUrl(null);
                    onBgImageChange(null);
                  }}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600"
                  aria-label="Supprimer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <FileUploadButton
                label="Ajouter une image de fond"
                accept="image/*"
                variant="image"
                currentUrl={null}
                onUpload={(url) => {
                  setBgImageUrl(url);
                  onBgImageChange(url);
                }}
              />
            )}
          </AccordionSection>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Spacer for fixed save bar */}
        {hasChanges && <div className="h-20" />}

        {/* Fixed save bar at bottom */}
        {hasChanges && (
          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 rounded-xl border border-gray-300 px-5 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Annuler
              </button>
              <Button onClick={handleSave} loading={saving} className="flex-1">
                Sauvegarder
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════ DESKTOP: Accordion view (>= lg) ══════════════ */}
      <div className="hidden lg:block space-y-3">
      {/* ── Section 1: Thème ── */}
      <AccordionSection icon={Paintbrush} title="Thème" subtitle={selectedTheme.name} defaultOpen>
        {/* Category filter chips */}
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {THEME_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setThemeFilter(cat.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                themeFilter === cat.id
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Theme grid */}
        <div
          ref={scrollRef}
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4"
        >
          {filteredThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => selectTemplate(theme)}
              className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
                selectedThemeId === theme.id
                  ? "border-teal-600 ring-2 ring-teal-600/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <TemplateCard theme={theme} />
              {selectedThemeId === theme.id && (
                <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm">
                  <Check size={12} />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-2 pt-5">
                <p className="text-[11px] font-semibold text-white">{theme.name}</p>
              </div>
            </button>
          ))}
        </div>
      </AccordionSection>

      {/* ── Section 2: Palette de couleurs ── */}
      <AccordionSection icon={Palette} title="Palette de couleurs">
        <div className="space-y-4">
          <ColorPickerRow
            label="Accent"
            description="Couleur principale du thème"
            value={customPrimary}
            defaultValue={selectedTheme.primary}
            onChange={(v) => handleColorChange("primary", v)}
          />
          <div className="border-t border-gray-100" />
          <ColorPickerRow
            label="Fond"
            description="Arrière-plan de la page"
            value={customBackground}
            defaultValue={selectedTheme.background}
            onChange={(v) => handleColorChange("background", v)}
          />
          <div className="border-t border-gray-100" />
          <ColorPickerRow
            label="Bouton"
            description="Couleur des boutons d'action"
            value={customButton}
            defaultValue={selectedTheme.primary}
            onChange={(v) => handleColorChange("button", v)}
          />

          {/* Live button preview */}
          <div className="border-t border-gray-100 pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Aperçu</p>
            <div
              className="flex items-center justify-center rounded-xl p-4"
              style={{ backgroundColor: customBackground || selectedTheme.background }}
            >
              <button
                className="px-6 py-3 text-sm font-semibold transition-all"
                style={{
                  ...getButtonStyle({
                    ...selectedTheme,
                    ...(customButton ? { customButtonColor: customButton } : {}),
                    ...(customPrimary ? { primary: customPrimary } : {}),
                  }),
                  borderRadius: selectedTheme.buttonRadius,
                }}
              >
                Acheter maintenant
              </button>
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* ── Section 3: Position du profil ── */}
      <AccordionSection
        icon={Layout}
        title="Position du profil"
        subtitle={
          ({ centered: "Centré", left: "Gauche", compact: "Compact", banner: "Bannière", pro: "Pro", hero: "Hero", editorial: "Éditorial", sadio: "Sadio" } as Record<string, string>)[selectedHeaderLayout] || "Centré"
        }
      >
        <div className="space-y-2">
          {(["centered", "left", "compact", "banner", "pro", "hero", "editorial", "sadio"] as const).map((layout) => {
            const labels: Record<string, string> = { centered: "Centré", left: "Gauche", compact: "Compact", banner: "Bannière", pro: "Pro", hero: "Hero", editorial: "Éditorial", sadio: "Sadio" };
            const descriptions: Record<string, string> = {
              centered: "Avatar et nom au centre de la page",
              left: "Profil aligné à gauche avec avatar standard",
              compact: "Petit avatar en haut à gauche, réseaux en dessous",
              banner: "Photo ronde à gauche, nom et réseaux à droite",
              pro: "Nom et réseaux en haut, grande photo de couverture",
              hero: "Nom et réseaux par-dessus l'image de fond plein écran",
              editorial: "Photo de couverture en haut, réseaux puis nom en dessous",
              sadio: "Nom et sous-titre en haut, réseaux sociaux en bas",
            };
            const isActive = selectedHeaderLayout === layout;
            return (
              <button
                key={layout}
                onClick={() => {
                  setSelectedHeaderLayout(layout);
                  onHeaderLayoutChange(layout);
                }}
                className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition-all ${
                  isActive
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {/* Mini layout illustration */}
                <div
                  className="relative flex h-14 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-1"
                >
                  {layout === "centered" && (
                    <>
                      <div className="h-3.5 w-3.5 rounded-full bg-gray-300" />
                      <div className="h-1 w-6 rounded-full bg-gray-300" />
                      <div className="h-0.5 w-4 rounded-full bg-gray-200" />
                      <div className="mt-0.5 h-2 w-7 rounded-sm bg-gray-200" />
                    </>
                  )}
                  {layout === "left" && (
                    <>
                      <div className="flex w-full items-center gap-1">
                        <div className="h-3.5 w-3.5 shrink-0 rounded-sm bg-gray-300" />
                        <div className="flex flex-col gap-0.5">
                          <div className="h-1 w-4 rounded-full bg-gray-300" />
                          <div className="h-0.5 w-3 rounded-full bg-gray-200" />
                        </div>
                      </div>
                      <div className="mt-0.5 flex w-full gap-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                      </div>
                      <div className="h-2 w-7 rounded-sm bg-gray-200" />
                    </>
                  )}
                  {layout === "compact" && (
                    <>
                      <div className="flex w-full items-center gap-1">
                        <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />
                        <div className="h-1 w-4 rounded-full bg-gray-300" />
                      </div>
                      <div className="flex w-full gap-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                      </div>
                      <div className="mt-0.5 h-2 w-7 rounded-sm bg-gray-200" />
                      <div className="h-2 w-7 rounded-sm bg-gray-200" />
                    </>
                  )}
                  {layout === "pro" && (
                    <>
                      <div className="h-1 w-5 rounded-full bg-gray-300" />
                      <div className="flex gap-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                      </div>
                      <div className="h-5 w-7 rounded-sm bg-gray-200" />
                    </>
                  )}
                  {layout === "hero" && (
                    <>
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-gray-300 to-gray-200 opacity-40" />
                      <div className="relative z-10 h-1.5 w-5 rounded-full bg-gray-400" />
                      <div className="relative z-10 flex gap-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      </div>
                      <div className="relative z-10 mt-0.5 h-2 w-7 rounded-sm bg-gray-300" />
                    </>
                  )}
                  {layout === "banner" && (
                    <>
                      <div className="flex w-full items-start gap-1">
                        <div className="h-4 w-4 shrink-0 rounded-full bg-gray-300" />
                        <div className="flex flex-col gap-0.5">
                          <div className="h-1 w-4 rounded-full bg-gray-300" />
                          <div className="flex gap-0.5">
                            <div className="h-1 w-1 rounded-full bg-gray-200" />
                            <div className="h-1 w-1 rounded-full bg-gray-200" />
                            <div className="h-1 w-1 rounded-full bg-gray-200" />
                          </div>
                          <div className="h-0.5 w-3 rounded-full bg-gray-200" />
                        </div>
                      </div>
                    </>
                  )}
                  {layout === "editorial" && (
                    <>
                      <div className="h-4 w-full rounded-sm bg-gray-300" />
                      <div className="flex gap-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                      </div>
                      <div className="h-1 w-5 rounded-full bg-gray-300" />
                      <div className="h-2 w-7 rounded-sm bg-gray-200" />
                    </>
                  )}
                  {layout === "sadio" && (
                    <>
                      <div className="flex w-full items-center gap-1">
                        <div className="h-3 w-3 shrink-0 rounded-full bg-gray-300" />
                        <div className="flex flex-col gap-0.5">
                          <div className="h-1 w-4 rounded-full bg-gray-300" />
                          <div className="h-0.5 w-3 rounded-full bg-gray-200" />
                        </div>
                      </div>
                      <div className="h-2 w-7 rounded-sm bg-gray-200" />
                      <div className="h-2 w-7 rounded-sm bg-gray-200" />
                      <div className="flex gap-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-semibold ${isActive ? "text-teal-700" : "text-gray-900"}`}>
                      {labels[layout]}
                    </p>
                    {layout === selectedTheme.headerStyle && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">
                        Par défaut
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">
                    {descriptions[layout]}
                  </p>
                </div>
                {isActive && (
                  <Check size={16} className="shrink-0 text-teal-600" />
                )}
              </button>
            );
          })}
        </div>
      </AccordionSection>

      {/* ── Section 3.5: Forme des images ── */}
      <AccordionSection
        icon={ImageIcon}
        title="Forme des images"
        subtitle={
          selectedImageStyle
            ? ({ circle: "Rondes", rounded: "Arrondies", square: "Carrées" } as Record<string, string>)[selectedImageStyle] || "Thème"
            : "Thème"
        }
      >
        <p className="mb-3 text-[11px] text-gray-400">
          S&apos;applique aux miniatures des blocs et à l&apos;avatar du profil
        </p>
        <div className="space-y-1.5">
          {([null, "circle", "rounded", "square"] as const).map((style) => {
            const labels: Record<string, string> = { circle: "Rondes", rounded: "Arrondies", square: "Carrées" };
            const descriptions: Record<string, string> = {
              circle: "Images parfaitement rondes (cercle complet)",
              rounded: "Coins arrondis avec un léger rayon",
              square: "Coins droits, forme rectangulaire nette",
            };
            const label = style ? labels[style] : "Thème";
            const desc = style ? descriptions[style] : `Utiliser la forme du thème (${({ circle: "rondes", rounded: "arrondies", square: "carrées" } as Record<string, string>)[selectedTheme.avatarStyle] || "rondes"})`;
            const isActive = selectedImageStyle === style;
            const previewRadius = style === "circle" ? "9999px" : style === "square" ? "2px" : style === "rounded" ? "6px" : (selectedTheme.avatarStyle === "circle" ? "9999px" : selectedTheme.avatarStyle === "square" ? "2px" : "6px");
            return (
              <button
                key={style || "theme-default"}
                onClick={() => {
                  setSelectedImageStyle(style);
                  onImageStyleChange(style);
                }}
                className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition-all ${
                  isActive
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div
                  className="h-10 w-10 shrink-0 bg-gray-300"
                  style={{ borderRadius: previewRadius }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-semibold ${isActive ? "text-teal-700" : "text-gray-900"}`}>
                      {label}
                    </p>
                    {style === null && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">
                        Par défaut
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">{desc}</p>
                </div>
                {isActive && (
                  <Check size={16} className="shrink-0 text-teal-600" />
                )}
              </button>
            );
          })}
        </div>
      </AccordionSection>

      {/* ── Section 4: Police ── */}
      <AccordionSection
        icon={Type}
        title="Police"
        subtitle={FONTS.find((f) => f.id === selectedFont)?.name}
      >
        <div className="space-y-1.5">
          {FONTS.map((font) => (
            <button
              key={font.id}
              onClick={() => handleFontChange(font.id)}
              className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 transition-all ${
                selectedFont === font.id
                  ? "border-teal-600 bg-teal-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="text-left">
                <p
                  className={`text-sm ${selectedFont === font.id ? "font-semibold text-teal-700" : "text-gray-900"}`}
                  style={{ fontFamily: font.family }}
                >
                  {font.name}
                </p>
                <p
                  className="text-[11px] text-gray-400"
                  style={{ fontFamily: font.family }}
                >
                  Aa Bb Cc 123
                </p>
              </div>
              {selectedFont === font.id && (
                <Check size={16} className="shrink-0 text-teal-600" />
              )}
            </button>
          ))}
        </div>
      </AccordionSection>

      {/* ── Section 5: Image de fond (conditionally shown) ── */}
      {selectedTheme.supportsBackgroundImage && (
        <AccordionSection icon={ImageIcon} title="Image de fond">
          <p className="mb-3 text-[11px] text-gray-400">
            Couvre tout l&apos;arrière-plan de ta page
          </p>
          {bgImageUrl ? (
            <div className="relative inline-block">
              <img
                src={bgImageUrl}
                alt="Fond"
                className="h-24 w-40 rounded-xl object-cover border border-gray-200"
              />
              <button
                onClick={() => {
                  setBgImageUrl(null);
                  onBgImageChange(null);
                }}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600"
                aria-label="Supprimer"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ) : (
            <FileUploadButton
              label="Ajouter une image de fond"
              accept="image/*"
              variant="image"
              currentUrl={null}
              onUpload={(url) => {
                setBgImageUrl(url);
                onBgImageChange(url);
              }}
            />
          )}
        </AccordionSection>
      )}

      {/* Error */}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {/* Save bar — sticky at bottom, only visible when changes exist */}
      {hasChanges && (
        <div className="sticky bottom-0 z-30 mt-4 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
              <p className="truncate text-xs font-medium text-gray-500">Modifications non sauvegardées</p>
            </div>
            <button
              onClick={handleCancel}
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Annuler
            </button>
            <Button onClick={handleSave} loading={saving} className="px-6">
              Sauvegarder
            </Button>
          </div>
        </div>
      )}
      </div>{/* end desktop wrapper */}
    </div>
  );
}

function TemplateCard({ theme }: { theme: Theme }) {
  const bgStyle = getBackgroundStyle(theme);
  const btnStyle = getButtonStyle(theme);
  const isLeft = theme.headerStyle === "left";
  const isPro = theme.headerStyle === "pro";
  const isCompact = theme.headerStyle === "compact";
  const avatarRadius =
    theme.avatarStyle === "circle" ? "9999px" : theme.avatarStyle === "rounded" ? "6px" : "0px";

  const miniCard: React.CSSProperties = {
    backgroundColor: theme.cardBg,
    border: `1px solid ${theme.cardBorder}`,
    borderRadius: `calc(${theme.cardRadius} * 0.4)`,
    boxShadow: theme.cardShadow,
    ...(theme.cardStyle === "glass" ? { backdropFilter: "blur(4px)" } : {}),
  };

  function renderBlocks() {
    if (theme.blockLayout === "compact-row") {
      return (
        <div className="mt-3 w-full" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {/* Compact row: icon left + bar right */}
          <div className="flex items-center gap-1.5 px-2 py-1.5" style={miniCard}>
            <div className="h-5 w-5 shrink-0 rounded" style={{ backgroundColor: theme.textSecondary, opacity: 0.15 }} />
            <div className="flex-1">
              <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: theme.textPrimary, opacity: 0.5 }} />
              <div className="mt-0.5 h-1 w-6 rounded-full" style={{ backgroundColor: theme.primary, opacity: 0.6 }} />
            </div>
            <div className="px-1.5 py-0.5 text-[6px] font-bold" style={{ ...btnStyle, borderRadius: `calc(${theme.buttonRadius} * 0.5)` }}>
              Buy
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1.5" style={miniCard}>
            <div className="h-5 w-5 shrink-0 rounded" style={{ backgroundColor: theme.textSecondary, opacity: 0.15 }} />
            <div className="flex-1">
              <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: theme.textPrimary, opacity: 0.5 }} />
              <div className="mt-0.5 h-1 w-7 rounded-full" style={{ backgroundColor: theme.primary, opacity: 0.6 }} />
            </div>
          </div>
        </div>
      );
    }

    if (theme.blockLayout === "minimal-stack") {
      return (
        <div className="mt-3 w-full" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div className="flex items-center justify-between px-2 py-1.5" style={miniCard}>
            <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: theme.textPrimary, opacity: 0.5 }} />
            <div className="h-1.5 w-6 rounded-full" style={{ backgroundColor: theme.primary, opacity: 0.6 }} />
          </div>
          <div className="flex items-center justify-between px-2 py-1.5" style={miniCard}>
            <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: theme.textPrimary, opacity: 0.5 }} />
            <div className="h-1.5 w-7 rounded-full" style={{ backgroundColor: theme.primary, opacity: 0.6 }} />
          </div>
          <div className="flex h-6 w-full items-center justify-center text-[7px] font-bold" style={{ ...btnStyle, borderRadius: `calc(${theme.buttonRadius} * 0.7)` }}>
            Acheter
          </div>
        </div>
      );
    }

    if (theme.blockLayout === "card-image-top") {
      return (
        <div className="mt-3 w-full" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div className="overflow-hidden" style={miniCard}>
            <div className="h-10 w-full" style={{ backgroundColor: theme.textSecondary, opacity: 0.1 }} />
            <div className="px-2 py-1.5">
              <div className="h-1.5 w-14 rounded-full" style={{ backgroundColor: theme.textPrimary, opacity: 0.5 }} />
              <div className="mt-1 flex items-center justify-between">
                <div className="h-1.5 w-8 rounded-full" style={{ backgroundColor: theme.primary, opacity: 0.6 }} />
                <div className="px-1.5 py-0.5 text-[6px] font-bold" style={{ ...btnStyle, borderRadius: `calc(${theme.buttonRadius} * 0.5)` }}>
                  Buy
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // default
    return (
      <div className="mt-3 w-full" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div className="h-5 w-full" style={miniCard} />
        <div className="h-5 w-full" style={{ ...miniCard, backdropFilter: undefined }} />
        <div className="flex h-7 w-full items-center justify-center text-[7px] font-bold" style={{ ...btnStyle, borderRadius: `calc(${theme.buttonRadius} * 0.7)` }}>
          Acheter
        </div>
      </div>
    );
  }

  if (isCompact) {
    return (
      <div
        className="flex h-48 w-full flex-col items-start p-3"
        style={{ ...bgStyle, borderRadius: "12px" }}
      >
        {/* Small avatar + name row */}
        <div className="flex items-center gap-1.5">
          <div
            className="h-6 w-6 shrink-0"
            style={{ backgroundColor: theme.textSecondary, opacity: 0.3, borderRadius: avatarRadius }}
          />
          <div
            className="h-2 w-12 rounded-full"
            style={{ backgroundColor: theme.textPrimary, opacity: 0.6 }}
          />
        </div>
        {/* Social dots */}
        <div className="mt-1.5 flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
            />
          ))}
        </div>
        {renderBlocks()}
      </div>
    );
  }

  if (isPro) {
    return (
      <div
        className="flex h-48 w-full flex-col items-center p-3"
        style={{ ...bgStyle, borderRadius: "12px" }}
      >
        {/* Name at top */}
        <div
          className="h-2 w-16 rounded-full"
          style={{ backgroundColor: theme.textPrimary, opacity: 0.7 }}
        />
        {/* Social dots */}
        <div className="mt-1.5 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-3.5 w-3.5 rounded-full"
              style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
            />
          ))}
        </div>
        {/* Hero image placeholder */}
        <div
          className="relative mt-2 w-full flex-1 overflow-hidden"
          style={{
            backgroundColor: theme.textSecondary,
            opacity: 0.12,
            borderRadius: `calc(${theme.cardRadius} * 0.4)`,
          }}
        />
        {/* One mini block */}
        <div className="mt-2 w-full">
          <div className="flex items-center gap-1.5 px-1.5 py-1" style={miniCard}>
            <div className="h-4 w-4 shrink-0 rounded" style={{ backgroundColor: theme.textSecondary, opacity: 0.15 }} />
            <div className="flex-1">
              <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: theme.textPrimary, opacity: 0.5 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-48 w-full flex-col p-3"
      style={{
        ...bgStyle,
        borderRadius: "12px",
        alignItems: isLeft ? "flex-start" : "center",
      }}
    >
      {/* Mini avatar */}
      <div
        className="h-9 w-9"
        style={{
          backgroundColor: theme.textSecondary,
          opacity: 0.3,
          borderRadius: avatarRadius,
          ...(isLeft ? {} : { margin: "0 auto" }),
        }}
      />
      {/* Name placeholder */}
      <div
        className="mt-2 h-2 w-14 rounded-full"
        style={{
          backgroundColor: theme.textPrimary,
          opacity: 0.6,
          ...(isLeft ? {} : { margin: "0 auto" }),
        }}
      />
      <div
        className="mt-1 h-1.5 w-9 rounded-full"
        style={{
          backgroundColor: theme.textSecondary,
          opacity: 0.4,
          ...(isLeft ? {} : { margin: "0 auto" }),
        }}
      />
      {renderBlocks()}
    </div>
  );
}
