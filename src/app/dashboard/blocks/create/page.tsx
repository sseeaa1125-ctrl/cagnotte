"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { ChevronLeft } from "lucide-react";

import { ProductForm, EMPTY_FORM } from "@/components/dashboard/ProductForm";
import type { ProductFormData } from "@/components/dashboard/ProductForm";
import { PRODUCT_TYPES } from "@/lib/productTypes";
import { DEFAULT_TEMPLATES } from "@/components/dashboard/ProductForm/OptionsTab";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { BlockEditSkeleton } from "@/components/ui";
import { revalidateStore } from "@/app/actions";
import { invalidateCache } from "@/lib/useApi";

function CreateBlockContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { seller } = useAuth();

  const typeParam = searchParams.get("type") || "SALE";
  const labelParam = searchParams.get("label") || "";
  const productType = PRODUCT_TYPES.find(
    (pt) => pt.type === typeParam && (labelParam ? pt.label === labelParam : true)
  ) || PRODUCT_TYPES[0];

  const defaultEmail = DEFAULT_TEMPLATES[productType.type];
  const [form, setForm] = useState<ProductFormData>({
    ...EMPTY_FORM,
    buttonText: productType.defaultButtonText,
    confirmationEmailSubject: defaultEmail?.subject || "",
    confirmationEmailBody: defaultEmail?.body || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");


  async function handleSave(isDraft: boolean) {
    setError("");
    if (!form.title.trim()) { const msg = "Le titre est obligatoire"; setError(msg); toast(msg, "error"); return; }

    if (productType.type === "LINK" && !form.url.trim()) {
      const msg = "L'URL est obligatoire"; setError(msg); toast(msg, "error"); return;
    }

    if (productType.type === "LINK" && form.url.trim() && !form.url.trim().startsWith("http")) {
      const msg = "L'URL doit commencer par http:// ou https://"; setError(msg); toast(msg, "error"); return;
    }

    if (!isDraft && productType.hasPrice) {
      const price = parseInt(form.price);
      // LEAD_MAGNET is always free, WAITING_LIST can be free (price 0)
      const freeAllowed = productType.type === "LEAD_MAGNET" || productType.type === "WAITING_LIST";
      if (!freeAllowed && (!form.price || isNaN(price) || price < 500)) {
        const msg = "Le prix doit être d'au moins 500 FCFA"; setError(msg); toast(msg, "error"); return;
      }
      if (productType.type === "WAITING_LIST" && form.price && !isNaN(price) && price > 0 && price < 500) {
        const msg = "Le prix doit être 0 (gratuit) ou au moins 500 FCFA"; setError(msg); toast(msg, "error"); return;
      }
    }

    if (!isDraft && productType.hasBooking) {
      const dur = parseInt(form.duration);
      if (!form.duration || isNaN(dur) || dur < 15) {
        const msg = "La durée doit être d'au moins 15 minutes"; setError(msg); toast(msg, "error"); return;
      }
    }

    const hasAnyFile = form.fileUrl || form.files.length > 0;
    if (!isDraft && productType.type === "LEAD_MAGNET" && !hasAnyFile && !form.redirectUrl) {
      const msg = "Ajoute un fichier ou une URL de redirection pour publier"; setError(msg); toast(msg, "error"); return;
    }

    if (!isDraft && productType.type === "SALE" && !hasAnyFile && !form.redirectUrl) {
      const msg = "Ajoute un fichier ou une URL de redirection pour publier"; setError(msg); toast(msg, "error"); return;
    }

    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        type: productType.type,
        title: form.title,
        config: {},
        isActive: !isDraft,
      };

      // LINK
      if (productType.type === "LINK") {
        body.config = { title: form.title, url: form.url, icon: "other", coverUrl: form.coverUrl || null, ctaStyle: form.ctaStyle || "button" };
      }

      // Extract videoUrl from video sections for backward compat
      const videoSection = form.checkoutSections.find((s) => s.type === "video");
      const extractedVideoUrl = videoSection?.content || null;

      // PARTNERSHIP — config-based (no product)
      if (productType.type === "PARTNERSHIP") {
        body.config = {
          title: form.title,
          description: form.description || "",
          coverUrl: form.coverUrl || null,
          buttonText: form.buttonText || productType.defaultButtonText,
          ctaStyle: form.ctaStyle || "button",
          videoUrl: extractedVideoUrl,
          checkoutSections: form.checkoutSections.length > 0 ? form.checkoutSections : null,
        };
      }

      // SALE / LEAD_MAGNET / WAITING_LIST
      if (productType.hasProduct) {
        const isLeadOrWaiting = productType.type === "LEAD_MAGNET" || productType.type === "WAITING_LIST";
        const price = isLeadOrWaiting
          ? (productType.type === "WAITING_LIST" ? (parseInt(form.price) || 0) : 0)
          : (parseInt(form.price) || 0);

        body.product = {
          title: form.title,
          subtitle: form.subtitle || null,
          description: form.description || null,
          price,
          coverUrl: form.coverUrl || null,
          fileUrl: form.fileUrl || null,
          fileName: form.fileName || null,
          files: form.files.length > 0 ? form.files : null,
          redirectUrl: form.redirectUrl || null,
          buttonText: form.buttonText || productType.defaultButtonText,
          ctaStyle: form.ctaStyle || "button",
          discountPrice: form.discountPrice ? parseInt(form.discountPrice) : null,
          confirmationEmailSubject: form.confirmationEmailSubject || null,
          confirmationEmailBody: form.confirmationEmailBody || null,
          ...(isLeadOrWaiting && form.leadFields.length > 0 && { leadFields: form.leadFields }),
          ...(productType.type === "WAITING_LIST" && form.maxSubscribers && { maxSubscribers: parseInt(form.maxSubscribers) || null }),
          ...(productType.type === "WAITING_LIST" && { showSubscriberCount: form.showSubscriberCount }),
          videoUrl: extractedVideoUrl,
          checkoutSections: form.checkoutSections.length > 0 ? form.checkoutSections : null,
        };
      }

      // BOOKING
      if (productType.hasBooking) {
        body.bookingService = {
          title: form.title,
          description: form.description || null,
          price: parseInt(form.price) || 0,
          duration: parseInt(form.duration) || 60,
          location: form.location || null,
          coverUrl: form.coverUrl || null,
          buttonText: form.buttonText || productType.defaultButtonText,
          ctaStyle: form.ctaStyle || "button",
          confirmationEmailSubject: form.confirmationEmailSubject || null,
          confirmationEmailBody: form.confirmationEmailBody || null,
          videoUrl: extractedVideoUrl,
          checkoutSections: form.checkoutSections.length > 0 ? form.checkoutSections : null,
        };
      }

      // PAYMENT
      if (productType.type === "PAYMENT") {
        const amounts = form.suggestedAmounts
          .split(",")
          .map((s) => parseInt(s.trim()))
          .filter((n) => !isNaN(n) && n >= 500);
        body.config = {
          title: form.title,
          description: form.description || "",
          buttonText: form.buttonText || productType.defaultButtonText,
          ctaStyle: form.ctaStyle || "button",
          suggestedAmounts: amounts.length > 0 ? amounts : [5000, 10000, 25000],
          minAmount: Math.max(parseInt(form.minAmount) || 500, 500),
          coverUrl: form.coverUrl || null,
          videoUrl: extractedVideoUrl,
          checkoutSections: form.checkoutSections.length > 0 ? form.checkoutSections : null,
          confirmationEmailSubject: form.confirmationEmailSubject || null,
          confirmationEmailBody: form.confirmationEmailBody || null,
          checkoutFields: form.checkoutFields.length > 0 ? form.checkoutFields : null,
        };
      }

      // DONATION
      if (productType.type === "DONATION") {
        const amounts = form.suggestedAmounts
          .split(",")
          .map((s) => parseInt(s.trim()))
          .filter((n) => !isNaN(n) && n >= 500);
        body.config = {
          title: form.title,
          description: form.description || "",
          buttonText: form.buttonText || productType.defaultButtonText,
          ctaStyle: form.ctaStyle || "button",
          suggestedAmounts: amounts.length > 0 ? amounts : [1000, 2000, 5000],
          minAmount: Math.max(parseInt(form.minAmount) || 500, 500),
          coverUrl: form.coverUrl || null,
          thankYouMessage: form.thankYouMessage || null,
          videoUrl: extractedVideoUrl,
          checkoutSections: form.checkoutSections.length > 0 ? form.checkoutSections : null,
          confirmationEmailSubject: form.confirmationEmailSubject || null,
          confirmationEmailBody: form.confirmationEmailBody || null,
          checkoutFields: form.checkoutFields.length > 0 ? form.checkoutFields : null,
        };
      }

      // FUNDRAISER
      if (productType.type === "FUNDRAISER") {
        const amounts = form.suggestedAmounts
          .split(",")
          .map((s) => parseInt(s.trim()))
          .filter((n) => !isNaN(n) && n >= 500);
        body.config = {
          title: form.title,
          description: form.description || "",
          goalAmount: Math.max(parseInt(form.goalAmount) || 10000, 1000),
          endDate: form.endDate || null,
          showDonorCount: form.showDonorCount,
          buttonText: form.buttonText || productType.defaultButtonText,
          ctaStyle: form.ctaStyle || "button",
          suggestedAmounts: amounts.length > 0 ? amounts : [2000, 5000, 10000],
          minAmount: Math.max(parseInt(form.minAmount) || 500, 500),
          coverUrl: form.coverUrl || null,
          thankYouMessage: form.thankYouMessage || null,
          videoUrl: extractedVideoUrl,
          checkoutSections: form.checkoutSections.length > 0 ? form.checkoutSections : null,
          confirmationEmailSubject: form.confirmationEmailSubject || null,
          confirmationEmailBody: form.confirmationEmailBody || null,
          checkoutFields: form.checkoutFields.length > 0 ? form.checkoutFields : null,
        };
      }

      const res = await api<{ block: { id: string } }>("/api/blocks", {
        method: "POST",
        body,
      });

      // Save reviews if any (for new blocks with product)
      if (form.reviews.length > 0 && res.block?.id) {
        for (const review of form.reviews) {
          await api(`/api/blocks/${res.block.id}/reviews`, {
            method: "POST",
            body: { name: review.name, text: review.text, rating: review.rating },
          });
        }
      }

      // Save order bumps if any
      if (form.orderBumps.length > 0 && res.block?.id) {
        for (const bump of form.orderBumps) {
          await api(`/api/blocks/${res.block.id}/bumps`, {
            method: "POST",
            body: { title: bump.title, description: bump.description, price: bump.price },
          });
        }
      }

      // Save booking slots if any
      if (form.slots.length > 0 && res.block?.id && productType.hasBooking) {
        await api(`/api/blocks/${res.block.id}/slots`, {
          method: "PUT",
          body: {
            slots: form.slots.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
            })),
          },
        });
      }

      invalidateCache("/api/blocks");
      if (seller?.slug) revalidateStore(seller.slug);
      toast(isDraft ? "Brouillon enregistré !" : "Produit créé avec succès !");
      
      if (!isDraft) {
        // Dynamic import of confetti to avoid SSR issues
        import("canvas-confetti").then((confetti) => {
          confetti.default({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#0D9488", "#F59E0B", "#14B8A6", "#FCD34D"],
          });
        });
      }

      // Redirect to edit page of the newly created block (stay on form)
      router.replace(`/dashboard/blocks/${res.block.id}/edit`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur réseau";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <button
        onClick={() => router.push("/dashboard/blocks")}
        className="mb-4 flex items-center gap-1.5 rounded-xl py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        <ChevronLeft size={16} />
        Mon Store
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
          style={{ backgroundColor: productType.bgColor }}
        >
          {productType.icon.startsWith("/") ? (
            <img src={productType.icon} alt={productType.label} className="h-6 w-6 rounded-md object-cover" />
          ) : (
            productType.icon
          )}
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-gray-900">
            {productType.type === "WAITING_LIST" ? "Nouvelle" : productType.type === "DONATION" ? "Nouveau bloc" : "Nouveau"} {productType.label.toLowerCase()}
          </h1>
          <p className="text-xs text-gray-500">{productType.description}</p>
        </div>
      </div>

      <ProductForm
        productType={productType}
        form={form}
        onChange={setForm}
        onSave={handleSave}
        saving={saving}
        error={error}
        mode="create"
        themeConfig={seller ? { themeId: seller.themeId, themeFont: seller.themeFont, themeColors: seller.themeColors } : undefined}
        imageStyle={seller?.imageStyle}
      />
    </div>
  );
}

export default function CreateBlockPage() {
  return (
    <Suspense fallback={<BlockEditSkeleton />}>
      <CreateBlockContent />
    </Suspense>
  );
}
