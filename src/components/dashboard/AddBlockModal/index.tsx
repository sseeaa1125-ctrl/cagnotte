"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui";
import { Search, ArrowLeft, X } from "lucide-react";
import { PICKER_TYPES } from "@/lib/productTypes";
import type { ProductTypeDefinition } from "@/lib/productTypes";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { revalidateStore } from "@/app/actions";
import { invalidateCache } from "@/lib/useApi";
import { ProductForm, EMPTY_FORM } from "@/components/dashboard/ProductForm";
import type { ProductFormData } from "@/components/dashboard/ProductForm";
import { DEFAULT_TEMPLATES } from "@/components/dashboard/ProductForm/OptionsTab";
import { SIDEBAR_CATEGORIES } from "./constants";
import { QuickAddScreen } from "./QuickAddScreen";
import { PickerSidebar } from "./PickerSidebar";
import { PickerContent } from "./PickerContent";

// ── URL resolution + validation ──────────────────────────────────
function resolveUrlForSocial(input: string, socialType: string | null): { url: string | null; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { url: null, error: null };

  // Strip leading @ for username-style input
  const handle = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;

  // Detect pseudo (no protocol, no dot, no slash)
  const isPseudo = !handle.includes(".") && !handle.includes("/") && !handle.startsWith("http");

  let finalUrl = trimmed;

  if (isPseudo) {
    switch (socialType) {
      case "Instagram":        finalUrl = `https://instagram.com/${handle}`; break;
      case "TikTok":           finalUrl = `https://tiktok.com/@${handle}`; break;
      case "Telegram":         finalUrl = `https://t.me/${handle}`; break;
      case "Facebook":         finalUrl = `https://facebook.com/${handle}`; break;
      case "YouTube":          finalUrl = `https://youtube.com/@${handle}`; break;
      case "Spotify":          finalUrl = `https://open.spotify.com/user/${handle}`; break;
      case "Snapchat":         finalUrl = `https://snapchat.com/add/${handle}`; break;
      default:
        return { url: null, error: "Saisis une URL complète (ex: https://monsite.com)" };
    }
  } else {
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }
  }

  // Validate with URL constructor
  try {
    const parsed = new URL(finalUrl);
    if (!parsed.hostname.includes(".")) {
      return { url: null, error: "URL invalide. Exemple : https://monsite.com" };
    }
    return { url: finalUrl, error: null };
  } catch {
    return { url: null, error: "URL invalide. Exemple : https://monsite.com" };
  }
}

interface AddBlockModalProps {
  open: boolean;
  onClose: () => void;
  initialQuickAddType?: string | null;
  onBlockCreated?: () => void;
}

export function AddBlockModal({ open, onClose, initialQuickAddType = null, onBlockCreated }: AddBlockModalProps) {
  const router = useRouter();
  const { seller } = useAuth();
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState("suggested");
  const [search, setSearch] = useState("");

  // Quick Add State
  const [quickAddType, setQuickAddType] = useState<string | null>(null);
  const [quickAddUrl, setQuickAddUrl] = useState("");
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddDescription, setQuickAddDescription] = useState("");
  const [quickAddCoverUrl, setQuickAddCoverUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Full Form Add State
  const [selectedProductType, setSelectedProductType] = useState<ProductTypeDefinition | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_FORM);
  const [isSavingFull, setIsSavingFull] = useState(false);
  const [fullFormError, setFullFormError] = useState("");

  // Reset all state when modal closes
  useEffect(() => {
    if (!open) {
      setQuickAddType(null);
      setQuickAddUrl("");
      setQuickAddTitle("");
      setQuickAddDescription("");
      setQuickAddCoverUrl(null);
      setSearch("");
      setSelectedProductType(null);
      setFullFormError("");
      setActiveCategory("suggested");
    } else if (initialQuickAddType) {
      setQuickAddType(initialQuickAddType);
      
      // Pre-fill URL if it exists in seller profile
      if (seller) {
        const socialProfileMap: Record<string, string> = {
          "Instagram": "instagramUrl",
          "TikTok": "tiktokUrl",
          "Telegram": "telegramUrl",
          "Facebook": "facebookUrl",
          "YouTube": "youtubeUrl",
          "Snapchat": "snapchatUrl",
          "Twitter": "twitterUrl",
          "X": "twitterUrl"
        };
        const fieldName = socialProfileMap[initialQuickAddType];
        if (fieldName && seller[fieldName as keyof typeof seller]) {
          setQuickAddUrl(seller[fieldName as keyof typeof seller] as string);
        }
      }
    }
  }, [open, initialQuickAddType, seller]);

  const handleSelectType = (type: string, label: string) => {
    if (type === "COMMUNITY") {
      router.push("/dashboard/communities/new");
      onClose();
      return;
    }

    const pt = PICKER_TYPES.find((p) => p.type === type && p.label === label) || PICKER_TYPES.find((p) => p.type === type);
    if (pt) {
      const defaultEmail = DEFAULT_TEMPLATES[pt.type];
      setFormData({
        ...EMPTY_FORM,
        title: pt.label === "Lien" ? "Mon Lien" : "",
        buttonText: pt.defaultButtonText,
        confirmationEmailSubject: defaultEmail?.subject || "",
        confirmationEmailBody: defaultEmail?.body || "",
      });
      setSelectedProductType(pt);
      setSearch("");
    }
  };

  const handleSelectSocial = (socialLabel: string) => {
    setQuickAddType(socialLabel);
    setQuickAddTitle("");
    setQuickAddDescription("");
    setQuickAddCoverUrl(null);
    setSearch("");

    // Pre-fill URL from existing profile data
    const socialProfileMap: Record<string, string> = {
      "Instagram": "instagramUrl",
      "TikTok": "tiktokUrl",
      "Telegram": "telegramUrl",
      "Facebook": "facebookUrl",
      "YouTube": "youtubeUrl",
      "Snapchat": "snapchatUrl",
      "Twitter": "twitterUrl",
      "X": "twitterUrl",
    };
    const fieldName = socialProfileMap[socialLabel];
    const existingValue = fieldName && seller ? (seller as unknown as Record<string, string | null>)[fieldName] : null;
    setQuickAddUrl(existingValue || "");
  };

  const getPlaceholder = () => {
    switch (quickAddType) {
      case "Instagram":  return "Lien ou pseudo (ex: @izi)";
      case "TikTok":     return "Lien ou pseudo (ex: @izi)";
      case "Telegram":   return "Lien ou canal (ex: t.me/canal)";
      case "Facebook":   return "Lien vers la page ou profil";
      case "YouTube":    return "Lien vers la chaîne ou vidéo";
      case "Spotify":    return "Lien ou pseudo artiste";
      default:           return "https://exemple.com";
    }
  };

  // Computed from current input — drives preview + error in QuickAddScreen
  const { url: resolvedPreview, error: urlValidationError } = quickAddUrl.trim()
    ? resolveUrlForSocial(quickAddUrl, quickAddType)
    : { url: null, error: null };

  const handleQuickAddSubmit = async () => {
    if (!quickAddUrl.trim()) {
      toast("L'URL est obligatoire", "error");
      return;
    }
    if (!resolvedPreview) {
      toast(urlValidationError || "URL invalide", "error");
      return;
    }

    const finalUrl = resolvedPreview;

    setIsSubmitting(true);
    try {
      const socialProfileMap: Record<string, string> = {
        "Instagram": "instagramUrl",
        "TikTok": "tiktokUrl",
        "Telegram": "telegramUrl",
        "Facebook": "facebookUrl",
        "YouTube": "youtubeUrl",
        "Snapchat": "snapchatUrl",
        "Twitter": "twitterUrl",
        "X": "twitterUrl"
      };

      const isYouTubeVideo = finalUrl.includes("youtube.com/watch?v=") || 
                             finalUrl.includes("youtu.be/") || 
                             finalUrl.includes("youtube.com/shorts/") || 
                             finalUrl.includes("youtube.com/live/") ||
                             finalUrl.includes("youtube.com/embed/");

      if (quickAddType && socialProfileMap[quickAddType] && !(quickAddType === "YouTube" && isYouTubeVideo)) {
        const fieldName = socialProfileMap[quickAddType];
        await api("/api/sellers/profile", {
          method: "PUT",
          body: {
            [fieldName]: finalUrl
          }
        });
        toast(`${quickAddType} ajouté à votre profil avec succès !`);
      } else {
        const finalTitle = quickAddTitle.trim() || (quickAddType === "Lien" || quickAddType === "Lien personnalisé"
          ? "Mon Lien"
          : quickAddType || "Lien");

        await api("/api/blocks", {
          method: "POST",
          body: {
            type: "LINK",
            title: finalTitle,
            isActive: true,
            config: { 
              title: finalTitle, 
              description: quickAddDescription.trim() || null,
              url: finalUrl, 
              icon: "other", 
              coverUrl: quickAddCoverUrl || null 
            }
          }
        });
        toast("Lien ajouté avec succès !");
      }

      if (seller?.slug) revalidateStore(seller.slug);

      import("canvas-confetti").then((confetti) => {
        confetti.default({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#0D9488", "#F59E0B", "#14B8A6"] });
      });

      onClose();
      onBlockCreated?.();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur lors de l'ajout du lien";
      toast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFullFormSave = async (isDraft: boolean) => {
    setFullFormError("");
    if (!selectedProductType) return;
    const pt = selectedProductType;

    if (!formData.title.trim()) { const msg = "Le titre est obligatoire"; setFullFormError(msg); toast(msg, "error"); return; }

    if (pt.type === "LINK" && !formData.url.trim()) {
      const msg = "L'URL est obligatoire"; setFullFormError(msg); toast(msg, "error"); return;
    }

    if (pt.type === "LINK" && formData.url.trim() && !formData.url.trim().startsWith("http")) {
      const msg = "L'URL doit commencer par http:// ou https://"; setFullFormError(msg); toast(msg, "error"); return;
    }

    if (!isDraft && pt.hasPrice) {
      const priceVal = parseInt(formData.price);
      const freeAllowed = pt.type === "LEAD_MAGNET" || pt.type === "WAITING_LIST";
      if (!freeAllowed && (!formData.price || isNaN(priceVal) || priceVal < 500)) {
        const msg = "Le prix doit être d'au moins 500 FCFA"; setFullFormError(msg); toast(msg, "error"); return;
      }
      if (pt.type === "WAITING_LIST" && formData.price && !isNaN(priceVal) && priceVal > 0 && priceVal < 500) {
        const msg = "Le prix doit être 0 (gratuit) ou au moins 500 FCFA"; setFullFormError(msg); toast(msg, "error"); return;
      }
    }

    if (!isDraft && pt.hasBooking) {
      const dur = parseInt(formData.duration);
      if (!formData.duration || isNaN(dur) || dur < 15) {
        const msg = "La durée doit être d'au moins 15 minutes"; setFullFormError(msg); toast(msg, "error"); return;
      }
    }

    const hasAnyFile = formData.fileUrl || formData.files.length > 0;
    if (!isDraft && pt.type === "LEAD_MAGNET" && !hasAnyFile && !formData.redirectUrl) {
      const msg = "Ajoute un fichier ou une URL de redirection pour publier"; setFullFormError(msg); toast(msg, "error"); return;
    }

    if (!isDraft && pt.type === "SALE" && !hasAnyFile && !formData.redirectUrl) {
      const msg = "Ajoute un fichier ou une URL de redirection pour publier"; setFullFormError(msg); toast(msg, "error"); return;
    }

    setIsSavingFull(true);

    try {
      const body: Record<string, unknown> = {
        type: pt.type,
        title: formData.title,
        config: {},
        isActive: !isDraft,
      };

      if (pt.type === "LINK") {
        body.config = { title: formData.title, url: formData.url, icon: "other", coverUrl: formData.coverUrl || null };
      }

      if (pt.type === "PARTNERSHIP") {
        body.config = {
          title: formData.title,
          description: formData.description || "",
          coverUrl: formData.coverUrl || null,
          buttonText: formData.buttonText || pt.defaultButtonText,
          ...(formData.videoUrl && { videoUrl: formData.videoUrl }),
          ...(formData.checkoutSections.length > 0 && { checkoutSections: formData.checkoutSections }),
        };
      }

      if (pt.hasProduct) {
        const isLeadOrWaiting = pt.type === "LEAD_MAGNET" || pt.type === "WAITING_LIST";
        const priceVal = isLeadOrWaiting
          ? (pt.type === "WAITING_LIST" ? (parseInt(formData.price) || 0) : 0)
          : (parseInt(formData.price) || 0);

        body.product = {
          title: formData.title,
          subtitle: formData.subtitle || null,
          description: formData.description || null,
          price: priceVal,
          coverUrl: formData.coverUrl || null,
          fileUrl: formData.fileUrl || null,
          fileName: formData.fileName || null,
          files: formData.files.length > 0 ? formData.files : null,
          redirectUrl: formData.redirectUrl || null,
          buttonText: formData.buttonText || pt.defaultButtonText,
          ctaStyle: formData.ctaStyle || "button",
          discountPrice: formData.discountPrice ? parseInt(formData.discountPrice) : null,
          confirmationEmailSubject: formData.confirmationEmailSubject || null,
          confirmationEmailBody: formData.confirmationEmailBody || null,
          ...(isLeadOrWaiting && formData.leadFields.length > 0 && { leadFields: formData.leadFields }),
          ...(pt.type === "WAITING_LIST" && formData.maxSubscribers && { maxSubscribers: parseInt(formData.maxSubscribers) || null }),
          ...(pt.type === "WAITING_LIST" && { showSubscriberCount: formData.showSubscriberCount }),
          ...(formData.videoUrl && { videoUrl: formData.videoUrl }),
          ...(formData.checkoutSections.length > 0 && { checkoutSections: formData.checkoutSections }),
          ...(pt.type === "FORMATION" && formData.systemeioCourseId && { systemeioCourseId: formData.systemeioCourseId }),
        };
      }

      if (pt.hasBooking) {
        body.bookingService = {
          title: formData.title,
          description: formData.description || null,
          price: parseInt(formData.price) || 0,
          duration: parseInt(formData.duration) || 60,
          location: formData.location || null,
          coverUrl: formData.coverUrl || null,
          buttonText: formData.buttonText || pt.defaultButtonText,
          ctaStyle: formData.ctaStyle || "button",
          confirmationEmailSubject: formData.confirmationEmailSubject || null,
          confirmationEmailBody: formData.confirmationEmailBody || null,
          ...(formData.videoUrl && { videoUrl: formData.videoUrl }),
          ...(formData.checkoutSections.length > 0 && { checkoutSections: formData.checkoutSections }),
        };
      }

      if (pt.type === "PAYMENT") {
        const amounts = formData.suggestedAmounts.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n) && n >= 500);
        body.config = {
          title: formData.title,
          description: formData.description || "",
          buttonText: formData.buttonText || pt.defaultButtonText,
          suggestedAmounts: amounts.length > 0 ? amounts : [5000, 10000, 25000],
          minAmount: parseInt(formData.minAmount) || 500,
          coverUrl: formData.coverUrl || null,
          confirmationEmailSubject: formData.confirmationEmailSubject || null,
          confirmationEmailBody: formData.confirmationEmailBody || null,
        };
      }

      if (pt.type === "DONATION") {
        const amounts = formData.suggestedAmounts.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n) && n >= 500);
        body.config = {
          title: formData.title,
          description: formData.description || "",
          buttonText: formData.buttonText || pt.defaultButtonText,
          suggestedAmounts: amounts.length > 0 ? amounts : [1000, 2000, 5000],
          minAmount: parseInt(formData.minAmount) || 500,
          coverUrl: formData.coverUrl || null,
          thankYouMessage: formData.thankYouMessage || null,
          confirmationEmailSubject: formData.confirmationEmailSubject || null,
          confirmationEmailBody: formData.confirmationEmailBody || null,
        };
      }

      if (pt.type === "FUNDRAISER") {
        const amounts = formData.suggestedAmounts.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n) && n >= 500);
        body.config = {
          title: formData.title,
          description: formData.description || "",
          goalAmount: Math.max(parseInt(formData.goalAmount) || 10000, 1000),
          endDate: formData.endDate || null,
          showDonorCount: formData.showDonorCount,
          buttonText: formData.buttonText || pt.defaultButtonText,
          ctaStyle: formData.ctaStyle || "button",
          suggestedAmounts: amounts.length > 0 ? amounts : [2000, 5000, 10000],
          minAmount: Math.max(parseInt(formData.minAmount) || 500, 500),
          coverUrl: formData.coverUrl || null,
          thankYouMessage: formData.thankYouMessage || null,
          confirmationEmailSubject: formData.confirmationEmailSubject || null,
          confirmationEmailBody: formData.confirmationEmailBody || null,
          checkoutFields: formData.checkoutFields.length > 0 ? formData.checkoutFields : null,
        };
      }

      const res = await api<{ block: { id: string } }>("/api/blocks", { method: "POST", body });

      if (formData.reviews.length > 0 && res.block?.id) {
        for (const review of formData.reviews) {
          await api(`/api/blocks/${res.block.id}/reviews`, {
            method: "POST",
            body: { name: review.name, text: review.text, rating: review.rating },
          });
        }
      }

      if (formData.orderBumps.length > 0 && res.block?.id) {
        for (const bump of formData.orderBumps) {
          await api(`/api/blocks/${res.block.id}/bumps`, {
            method: "POST",
            body: { title: bump.title, description: bump.description, price: bump.price },
          });
        }
      }

      if (formData.slots.length > 0 && res.block?.id && pt.hasBooking) {
        await api(`/api/blocks/${res.block.id}/slots`, {
          method: "PUT",
          body: {
            slots: formData.slots.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
            })),
          },
        });
      }

      invalidateCache("/api/blocks");
      if (seller?.slug) revalidateStore(seller.slug);
      toast(isDraft ? "Brouillon enregistré !" : "Créé avec succès !");

      if (!isDraft) {
        import("canvas-confetti").then((confetti) => {
          confetti.default({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ["#0D9488", "#F59E0B", "#14B8A6", "#FCD34D"] });
        });
      }

      onClose();
      onBlockCreated?.();
      router.push(`/dashboard/blocks/${res.block.id}/edit`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur réseau";
      setFullFormError(msg);
      toast(msg, "error");
    } finally {
      setIsSavingFull(false);
    }
  };

  // ── Product Form View ────────────────────────────────────────────
  if (selectedProductType) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        className="sm:max-w-4xl max-h-[90vh] h-[90vh] overflow-hidden flex flex-col bg-gray-50"
        contentClassName="overflow-visible p-0 flex flex-col flex-1 min-h-0"
      >
        <div className="flex h-14 items-center justify-between px-4 sm:px-6 bg-white border-b border-gray-100 shrink-0">
          <button
            onClick={() => setSelectedProductType(null)}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
          <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
            <span className="h-6 w-6 flex items-center justify-center rounded-lg text-sm" style={{ backgroundColor: selectedProductType.bgColor }}>
              {selectedProductType.icon.startsWith("/")
                ? <img src={selectedProductType.icon} alt="" className="h-4 w-4 rounded-sm" />
                : selectedProductType.icon}
            </span>
            Créer : {selectedProductType.label}
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X size={14} />
          </button>
        </div>
        <div data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto pt-6 pb-20">
          <ProductForm
            productType={selectedProductType}
            form={formData}
            onChange={setFormData}
            onSave={handleFullFormSave}
            saving={isSavingFull}
            error={fullFormError}
            mode="create"
            themeConfig={seller ? { themeId: seller.themeId, themeFont: seller.themeFont, themeColors: seller.themeColors } : undefined}
          />
        </div>
      </Modal>
    );
  }

  // ── Picker View ──────────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onClose={onClose}
      className="sm:max-w-4xl max-h-[88vh] h-[88vh] overflow-hidden flex flex-col"
      contentClassName="overflow-visible p-0 flex flex-col flex-1 min-h-0"
    >
      <div className="flex flex-1 min-h-0 w-full bg-white">
        <PickerSidebar
          activeCategory={activeCategory}
          onCategoryChange={(cat) => {
            setActiveCategory(cat);
            setQuickAddType(null);
          }}
          onClose={onClose}
        />

        {/* Main Area */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Mobile Header */}
          <div className="sm:hidden flex items-center h-14 px-2 border-b border-gray-100 shrink-0 bg-white">
            {quickAddType ? (
              <button onClick={() => setQuickAddType(null)} className="p-2 text-gray-500 hover:text-gray-900 transition-colors">
                <ArrowLeft size={20} />
              </button>
            ) : <div className="w-10" />}
            <span className="flex-1 text-center font-bold text-[15px] text-gray-900">
              {quickAddType ? `Ajouter ${quickAddType}` : "Ajouter un bloc"}
            </span>
            <button onClick={onClose} className="p-2 mr-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
              <X size={14} />
            </button>
          </div>

          {/* Search bar — hidden when in quick-add mode */}
          {!quickAddType && (
            <div className="shrink-0 px-4 sm:px-5 pt-4 pb-2.5">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher ou coller une URL…"
                  value={search}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearch(val);
                    if (val.startsWith("http://") || val.startsWith("https://")) {
                      setQuickAddType("Lien");
                      setQuickAddUrl(val);
                      setQuickAddTitle("");
                      setQuickAddDescription("");
                    }
                  }}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:border-teal-200 border border-transparent transition-all outline-none"
                />
              </div>
            </div>
          )}

          {/* Mobile horizontal category tabs */}
          {!quickAddType && !search && (
            <div className="sm:hidden shrink-0 flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
              {SIDEBAR_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                    activeCategory === cat.id
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Scrollable content */}
          <div data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-6">
            {quickAddType ? (
              <QuickAddScreen
                quickAddType={quickAddType}
                quickAddUrl={quickAddUrl}
                quickAddTitle={quickAddTitle}
                quickAddDescription={quickAddDescription}
                isSubmitting={isSubmitting}
                placeholder={getPlaceholder()}
                resolvedPreview={resolvedPreview}
                urlError={urlValidationError}
                coverUrl={quickAddCoverUrl}
                onCoverChange={setQuickAddCoverUrl}
                onUrlChange={setQuickAddUrl}
                onTitleChange={setQuickAddTitle}
                onDescriptionChange={setQuickAddDescription}
                onSubmit={handleQuickAddSubmit}
                onBack={() => setQuickAddType(null)}
              />
            ) : (
              <PickerContent
                activeCategory={activeCategory}
                search={search}
                onSelectType={handleSelectType}
                onSelectSocial={handleSelectSocial}
              />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
