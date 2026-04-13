"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft } from "lucide-react";

import { ProductForm, EMPTY_FORM } from "@/components/dashboard/ProductForm";
import type { ProductFormData } from "@/components/dashboard/ProductForm";
import { getProductType, PRODUCT_TYPES } from "@/lib/productTypes";
import { DEFAULT_TEMPLATES } from "@/components/dashboard/ProductForm/OptionsTab";
import type { ProductTypeDefinition } from "@/lib/productTypes";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { BlockEditSkeleton } from "@/components/ui";
import { revalidateStore } from "@/app/actions";
import { invalidateCache } from "@/lib/useApi";
import type { Block } from "@/types";

export default function EditBlockPage() {
  const router = useRouter();
  const params = useParams();
  const blockId = params.id as string;
  const { toast } = useToast();
  const { seller } = useAuth();

  const [loading, setLoading] = useState(true);
  const [block, setBlock] = useState<Block | null>(null);
  const [productType, setProductType] = useState<ProductTypeDefinition>(PRODUCT_TYPES[0]);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchBlock = useCallback(async () => {
    try {
      const res = await api<{ block: Block }>(`/api/blocks/${blockId}`);
      const b = res.block;
      setBlock(b);

      const pt = getProductType(b.type) || PRODUCT_TYPES[0];
      setProductType(pt);

      // Populate form from block data
      const f: ProductFormData = { ...EMPTY_FORM };
      f.title = b.title;

      if (b.type === "LINK") {
        const config = b.config as Record<string, unknown>;
        f.url = (config.url as string) || "";
        f.coverUrl = (config.coverUrl as string) || "";
        f.ctaStyle = (config.ctaStyle as string) || "button";
      }

      if (b.product) {
        f.title = b.product.title;
        f.subtitle = b.product.subtitle || "";
        f.description = b.product.description || "";
        f.price = b.product.price > 0 ? String(b.product.price) : "";
        f.coverUrl = b.product.coverUrl || "";
        f.fileUrl = b.product.fileUrl || "";
        f.fileName = b.product.fileName || "";
        f.files = (b.product.files as typeof f.files) || [];
        f.redirectUrl = b.product.redirectUrl || "";
        f.buttonText = b.product.buttonText || pt.defaultButtonText;
        f.ctaStyle = b.product.ctaStyle || "button";
        f.discountPrice = b.product.discountPrice ? String(b.product.discountPrice) : "";
        const emailDefaults = DEFAULT_TEMPLATES[b.type];
        f.confirmationEmailSubject = b.product.confirmationEmailSubject || emailDefaults?.subject || "";
        f.confirmationEmailBody = b.product.confirmationEmailBody || emailDefaults?.body || "";
        f.reviews = b.product.reviews || [];
        f.orderBumps = b.product.orderBumps || [];
        f.leadFields = (b.product.leadFields as typeof f.leadFields) || [];
        f.maxSubscribers = b.product.maxSubscribers ? String(b.product.maxSubscribers) : "";
        f.showSubscriberCount = b.product.showSubscriberCount ?? true;
        const pAny = b.product as unknown as Record<string, unknown>;
        f.checkoutSections = (pAny.checkoutSections as typeof f.checkoutSections) || [];
        // Migrate old videoUrl → video section
        const pVideo = (pAny.videoUrl as string) || "";
        if (pVideo && !f.checkoutSections.some((s) => s.type === "video")) {
          f.checkoutSections = [{ type: "video", content: pVideo }, ...f.checkoutSections];
        }
        f.videoUrl = "";
        f.systemeioCourseId = (pAny.systemeioCourseId as string) || "";
      }

      if (b.bookingService) {
        f.title = b.bookingService.title;
        f.description = b.bookingService.description || "";
        f.price = String(b.bookingService.price);
        f.duration = String(b.bookingService.duration || 60);
        f.location = b.bookingService.location || "";
        f.coverUrl = b.bookingService.coverUrl || "";
        f.buttonText = b.bookingService.buttonText || pt.defaultButtonText;
        f.ctaStyle = b.bookingService.ctaStyle || "button";
        const bookingEmailDefaults = DEFAULT_TEMPLATES[b.type];
        f.confirmationEmailSubject = b.bookingService.confirmationEmailSubject || bookingEmailDefaults?.subject || "";
        f.confirmationEmailBody = b.bookingService.confirmationEmailBody || bookingEmailDefaults?.body || "";
        const sAny = b.bookingService as unknown as Record<string, unknown>;
        f.checkoutSections = (sAny.checkoutSections as typeof f.checkoutSections) || [];
        // Migrate old videoUrl → video section
        const sVideo = (sAny.videoUrl as string) || "";
        if (sVideo && !f.checkoutSections.some((s) => s.type === "video")) {
          f.checkoutSections = [{ type: "video", content: sVideo }, ...f.checkoutSections];
        }
        f.videoUrl = "";
        // Load existing slots
        if (b.bookingService.slots && b.bookingService.slots.length > 0) {
          f.slots = b.bookingService.slots.map((s) => ({
            id: s.id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          }));
        }
      }

      if (b.type === "PARTNERSHIP") {
        const config = b.config as Record<string, unknown>;
        f.description = (config.description as string) || "";
        f.buttonText = (config.buttonText as string) || pt.defaultButtonText;
        f.coverUrl = (config.coverUrl as string) || "";
        f.ctaStyle = (config.ctaStyle as string) || "button";
        f.checkoutSections = (config.checkoutSections as typeof f.checkoutSections) || [];
        const partVideo = (config.videoUrl as string) || "";
        if (partVideo && !f.checkoutSections.some((s) => s.type === "video")) {
          f.checkoutSections = [{ type: "video", content: partVideo }, ...f.checkoutSections];
        }
        f.videoUrl = "";
      }

      if (b.type === "PAYMENT") {
        const config = b.config as Record<string, unknown>;
        f.description = (config.description as string) || "";
        f.buttonText = (config.buttonText as string) || pt.defaultButtonText;
        f.suggestedAmounts = ((config.suggestedAmounts as number[]) || [5000, 10000, 25000]).join(",");
        f.minAmount = String((config.minAmount as number) || 500);
        f.coverUrl = (config.coverUrl as string) || "";
        f.ctaStyle = (config.ctaStyle as string) || "button";
        f.checkoutSections = (config.checkoutSections as typeof f.checkoutSections) || [];
        const payVid = (config.videoUrl as string) || "";
        if (payVid && !f.checkoutSections.some((s) => s.type === "video")) {
          f.checkoutSections = [{ type: "video", content: payVid }, ...f.checkoutSections];
        }
        f.videoUrl = "";
        const paymentEmailDefaults = DEFAULT_TEMPLATES.PAYMENT;
        f.confirmationEmailSubject = (config.confirmationEmailSubject as string) || paymentEmailDefaults.subject;
        f.confirmationEmailBody = (config.confirmationEmailBody as string) || paymentEmailDefaults.body;
        f.checkoutFields = (config.checkoutFields as typeof f.checkoutFields) || [];
      }

      if (b.type === "DONATION") {
        const config = b.config as Record<string, unknown>;
        f.description = (config.description as string) || "";
        f.buttonText = (config.buttonText as string) || pt.defaultButtonText;
        f.suggestedAmounts = ((config.suggestedAmounts as number[]) || [1000, 2000, 5000]).join(",");
        f.minAmount = String((config.minAmount as number) || 500);
        f.coverUrl = (config.coverUrl as string) || "";
        f.ctaStyle = (config.ctaStyle as string) || "button";
        f.thankYouMessage = (config.thankYouMessage as string) || "";
        f.checkoutSections = (config.checkoutSections as typeof f.checkoutSections) || [];
        const donVid = (config.videoUrl as string) || "";
        if (donVid && !f.checkoutSections.some((s) => s.type === "video")) {
          f.checkoutSections = [{ type: "video", content: donVid }, ...f.checkoutSections];
        }
        f.videoUrl = "";
        const donationEmailDefaults = DEFAULT_TEMPLATES.DONATION;
        f.confirmationEmailSubject = (config.confirmationEmailSubject as string) || donationEmailDefaults.subject;
        f.confirmationEmailBody = (config.confirmationEmailBody as string) || donationEmailDefaults.body;
        f.checkoutFields = (config.checkoutFields as typeof f.checkoutFields) || [];
      }

      if (b.type === "FUNDRAISER") {
        const config = b.config as Record<string, unknown>;
        f.description = (config.description as string) || "";
        f.goalAmount = String((config.goalAmount as number) || "");
        f.endDate = (config.endDate as string) || "";
        f.showDonorCount = config.showDonorCount !== false;
        f.buttonText = (config.buttonText as string) || pt.defaultButtonText;
        f.suggestedAmounts = ((config.suggestedAmounts as number[]) || [2000, 5000, 10000]).join(",");
        f.minAmount = String((config.minAmount as number) || 500);
        f.coverUrl = (config.coverUrl as string) || "";
        f.ctaStyle = (config.ctaStyle as string) || "button";
        f.thankYouMessage = (config.thankYouMessage as string) || "";
        f.checkoutSections = (config.checkoutSections as typeof f.checkoutSections) || [];
        const funVid = (config.videoUrl as string) || "";
        if (funVid && !f.checkoutSections.some((s) => s.type === "video")) {
          f.checkoutSections = [{ type: "video", content: funVid }, ...f.checkoutSections];
        }
        f.videoUrl = "";
        const fundraiserEmailDefaults = DEFAULT_TEMPLATES.FUNDRAISER;
        f.confirmationEmailSubject = (config.confirmationEmailSubject as string) || fundraiserEmailDefaults.subject;
        f.confirmationEmailBody = (config.confirmationEmailBody as string) || fundraiserEmailDefaults.body;
        f.checkoutFields = (config.checkoutFields as typeof f.checkoutFields) || [];
      }

      setForm(f);
    } catch {
      setError("Impossible de charger le bloc");
    } finally {
      setLoading(false);
    }
  }, [blockId]);

  useEffect(() => {
    fetchBlock();
  }, [fetchBlock]);

  async function handleSave() {
    if (!block) return;
    setError("");
    if (!form.title.trim()) { const msg = "Le titre est obligatoire"; setError(msg); toast(msg, "error"); return; }

    if (block.type === "LINK" && !form.url.trim()) {
      const msg = "L'URL est obligatoire"; setError(msg); toast(msg, "error"); return;
    }
    if (block.type === "LINK" && form.url.trim() && !form.url.trim().startsWith("http")) {
      const msg = "L'URL doit commencer par http:// ou https://"; setError(msg); toast(msg, "error"); return;
    }

    setSaving(true);

    try {
      const body: Record<string, unknown> = { title: form.title };

      // Extract videoUrl from video sections for backward compat
      const videoSection = form.checkoutSections.find((s) => s.type === "video");
      const extractedVideoUrl = videoSection?.content || null;

      if (block.type === "LINK") {
        body.config = { title: form.title, url: form.url, icon: "other", coverUrl: form.coverUrl || null, ctaStyle: form.ctaStyle || "button" };
      }

      if (block.type === "PARTNERSHIP") {
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

      if (productType.hasProduct) {
        const isLeadOrWaiting = block.type === "LEAD_MAGNET" || block.type === "WAITING_LIST";
        const price = isLeadOrWaiting
          ? (block.type === "WAITING_LIST" ? (parseInt(form.price) || 0) : 0)
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
          ...(isLeadOrWaiting && { leadFields: form.leadFields.length > 0 ? form.leadFields : null }),
          ...(block.type === "WAITING_LIST" && { maxSubscribers: form.maxSubscribers ? parseInt(form.maxSubscribers) : null }),
          ...(block.type === "WAITING_LIST" && { showSubscriberCount: form.showSubscriberCount }),
          videoUrl: extractedVideoUrl,
          checkoutSections: form.checkoutSections.length > 0 ? form.checkoutSections : null,
          ...(block.type === "FORMATION" && { systemeioCourseId: form.systemeioCourseId || null }),
        };
      }

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

      if (block.type === "PAYMENT") {
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

      if (block.type === "DONATION") {
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

      if (block.type === "FUNDRAISER") {
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

      await api(`/api/blocks/${blockId}`, {
        method: "PUT",
        body,
      });

      // Sync reviews: delete removed, add new
      if (productType.hasReviews && block.product) {
        const existingIds = (block.product.reviews || []).map((r) => r.id);
        const currentIds = form.reviews.filter((r) => !r.id.startsWith("temp-")).map((r) => r.id);

        // Delete removed reviews
        for (const id of existingIds) {
          if (!currentIds.includes(id)) {
            await api(`/api/blocks/${blockId}/reviews/${id}`, {
              method: "DELETE",
            });
          }
        }

        // Add new reviews
        for (const review of form.reviews) {
          if (review.id.startsWith("temp-")) {
            await api(`/api/blocks/${blockId}/reviews`, {
              method: "POST",
              body: { name: review.name, text: review.text, rating: review.rating },
            });
          }
        }
      }

      // Sync order bumps
      if (productType.hasOrderBumps && block.product) {
        const existingIds = (block.product.orderBumps || []).map((b) => b.id);
        const currentIds = form.orderBumps.filter((b) => !b.id.startsWith("temp-")).map((b) => b.id);

        for (const id of existingIds) {
          if (!currentIds.includes(id)) {
            await api(`/api/blocks/${blockId}/bumps/${id}`, {
              method: "DELETE",
            });
          }
        }

        for (const bump of form.orderBumps) {
          if (bump.id.startsWith("temp-")) {
            await api(`/api/blocks/${blockId}/bumps`, {
              method: "POST",
              body: { title: bump.title, description: bump.description, price: bump.price },
            });
          }
        }
      }

      // Save booking slots
      if (productType.hasBooking) {
        await api(`/api/blocks/${blockId}/slots`, {
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
      toast("Produit mis à jour !");
      // Re-fetch block data to stay in sync after save
      await fetchBlock();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur réseau";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <BlockEditSkeleton />;
  }

  if (!block) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-500">Bloc introuvable</p>
      </div>
    );
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
            Modifier — {productType.label}
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
        mode="edit"
        blockId={blockId}
        themeConfig={seller ? { themeId: seller.themeId, themeFont: seller.themeFont, themeColors: seller.themeColors } : undefined}
        imageStyle={seller?.imageStyle}
      />
    </div>
  );
}
