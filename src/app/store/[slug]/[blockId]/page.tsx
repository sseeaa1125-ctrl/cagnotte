import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { SafeImage } from "@/components/store/SafeImage";
import Link from "next/link";
import { StoreThemeProvider } from "@/components/store/StoreThemeProvider";
import { PageTracker } from "@/components/store/PageTracker";
import { CheckoutCTA } from "@/components/store/CheckoutCTA";
import { IzyFooter } from "@/components/store/IzyFooter";
import { SafeHTML } from "@/components/store/SafeHTML";
import { VerifiedBadge } from "@/components/store/VerifiedBadge";
// getResolvedTheme removed — not needed on checkout page
import { formatPrice } from "@/lib/utils";
import { getVideoEmbedUrl, getVideoFormat } from "@/components/dashboard/ProductForm/types";
import { FundraiserProgress } from "@/components/store/FundraiserProgress";
import { RecentDonations } from "@/components/store/RecentDonations";
import { PixelScripts } from "@/components/store/PixelScripts";
import type { Block, Review } from "@/types";

export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://izy.store";

interface CheckoutPageProps {
  params: Promise<{ slug: string; blockId: string }>;
}

interface SellerMini {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  themeId: string;
  themeFont: string;
  themeColors: { primary?: string; background?: string; button?: string } | null;
  bgImageUrl: string | null;
  headerLayout: string;
  imageStyle: string | null;
  timezone: string;
  plan: string;
  kycStatus?: string;
  metaPixelId?: string | null;
  googleAdsId?: string | null;
  googleAnalyticsId?: string | null;
  tiktokPixelId?: string | null;
}

async function getBlockData(slug: string, blockId: string): Promise<{ seller: SellerMini; block: Block } | null> {
  try {
    const res = await fetch(`${API_URL}/api/sellers/${slug}/blocks/${blockId}`, {
      cache: "no-store",
    });
    if (res.status === 301) {
      const data = await res.json();
      if (data.redirect) redirect(`/${data.redirect}/${blockId}`);
    }
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: CheckoutPageProps): Promise<Metadata> {
  const { slug, blockId } = await params;
  const data = await getBlockData(slug, blockId);

  if (!data) return { title: "Page introuvable" };

  const { seller, block } = data;
  const title = block.product?.title || block.bookingService?.title || block.community?.title || block.title;
  const description = block.product?.description || block.bookingService?.description || block.community?.description || "";
  const coverUrl = block.product?.coverUrl || block.bookingService?.coverUrl || block.community?.coverUrl || null;
  const url = `${BASE_URL}/${slug}/${blockId}`;

  return {
    title: `${title} | ${seller.displayName}`,
    description: description || `Découvre ${title} par ${seller.displayName}`,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${seller.displayName}`,
      description: description || `Découvre ${title} par ${seller.displayName}`,
      url,
      siteName: "Izy",
      locale: "fr_FR",
      type: "website",
      ...(coverUrl && { images: [{ url: coverUrl, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${seller.displayName}`,
      description: description || `Découvre ${title} par ${seller.displayName}`,
      ...(coverUrl && { images: [coverUrl] }),
    },
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug, blockId } = await params;
  const data = await getBlockData(slug, blockId);

  if (!data) notFound();

  const { seller, block } = data;

  // LINK blocks don't have checkout pages
  if (block.type === "LINK") {
    notFound();
  }

  const themeConfig = {
    themeId: seller.themeId || "default",
    themeFont: seller.themeFont || "inter",
    themeColors: seller.themeColors || null,
  };

  // Extract config for config-based blocks (PARTNERSHIP, PAYMENT, LINK)
  const blockConfig = block.config as Record<string, unknown> | null;

  // Extract common data
  const title = block.product?.title || block.bookingService?.title || block.community?.title || block.title;
  const description = block.product?.description || block.bookingService?.description || block.community?.description || (blockConfig?.description as string) || "";
  const coverUrl = block.product?.coverUrl || block.bookingService?.coverUrl || block.community?.coverUrl || (blockConfig?.coverUrl as string) || null;
  const price = block.product?.price || block.bookingService?.price || block.community?.priceAmount || 0;
  const discountPrice = block.product?.discountPrice || null;
  const reviews = block.product?.reviews || [];
  const subtitle = block.product?.subtitle || null;
  const defaultButtonText = block.type === "COMMUNITY" ? "Rejoindre" : block.type === "FUNDRAISER" ? "Participer" : block.type === "DONATION" ? "Faire un don" : block.type === "PAYMENT" ? "Payer" : block.type === "FORMATION" ? "Accéder" : "Acheter";
  const buttonText = block.product?.buttonText || block.bookingService?.buttonText || (blockConfig?.buttonText as string) || defaultButtonText;

  // Checkout page content
  const productAny = block.product as Record<string, unknown> | null;
  const serviceAny = block.bookingService as unknown as Record<string, unknown> | null;
  const videoUrl = (productAny?.videoUrl as string) || (serviceAny?.videoUrl as string) || (blockConfig?.videoUrl as string) || null;
  const checkoutSections = ((productAny?.checkoutSections || serviceAny?.checkoutSections || blockConfig?.checkoutSections) as { type: string; title?: string; content?: string; items?: { question?: string; answer?: string; text?: string }[] }[] | null) || [];
  const hasVideoSection = checkoutSections.some((s) => s.type === "video");

  // Booking specific
  const duration = block.bookingService?.duration || null;
  const location = block.bookingService?.location || null;

  // Community specific
  const communityPeriod = block.community?.billingPeriod || null;
  const memberCount = block.community?.memberCount || 0;
  const PERIOD_LABELS: Record<string, string> = {
    WEEKLY: "/ sem.",
    BIWEEKLY: "/ 15j",
    MONTHLY: "/ mois",
    QUARTERLY: "/ trim.",
    YEARLY: "/ an",
  };

  const effectivePrice = discountPrice && discountPrice > 0 && discountPrice < price ? discountPrice : price;

  // Shared sub-components
  const priceDisplay = price > 0 ? (
    <div className="flex items-center gap-2">
      {discountPrice && discountPrice > 0 && discountPrice < price && (
        <span className="text-sm font-medium line-through" style={{ color: "var(--theme-text-muted, #9CA3AF)" }}>
          {formatPrice(price)}
        </span>
      )}
      <span className="text-xl font-bold md:text-2xl" style={{ color: "var(--theme-primary, #0D9488)" }}>
        {formatPrice(effectivePrice)}
      </span>
      {block.type === "COMMUNITY" && communityPeriod && (
        <span className="text-sm" style={{ color: "var(--theme-text-muted, #6B7280)" }}>
          {PERIOD_LABELS[communityPeriod] || "/ mois"}
        </span>
      )}
    </div>
  ) : null;

  const bookingBadges = block.type === "BOOKING" ? (
    <div className="flex flex-wrap gap-2">
      {duration && (
        <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: "var(--theme-card-bg, #F9FAFB)", color: "var(--theme-text-muted, #6B7280)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {duration} min
        </div>
      )}
      {location && (
        <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: "var(--theme-card-bg, #F9FAFB)", color: "var(--theme-text-muted, #6B7280)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          {location}
        </div>
      )}
    </div>
  ) : null;

  const communityMemberBadge = block.type === "COMMUNITY" && memberCount > 0 ? (
    <p className="text-xs font-medium" style={{ color: "var(--theme-text-muted, #6B7280)" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      {memberCount} membre{memberCount > 1 ? "s" : ""}
    </p>
  ) : null;

  const descriptionContent = description ? (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <h2 className="text-lg font-bold" style={{ color: "var(--theme-text, #111827)" }}>
          Description
        </h2>
        <div className="h-px flex-1" style={{ backgroundColor: "var(--theme-card-border, #E5E7EB)" }} />
      </div>
      <div className="prose prose-sm max-w-none leading-relaxed" style={{ color: "var(--theme-text, #374151)" }}>
        {description.split("\n").map((paragraph, i) => (
          <p key={i} className={i > 0 ? "mt-3" : ""}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  ) : null;

  const embedUrl = videoUrl ? getVideoEmbedUrl(videoUrl) : null;
  const isVertical = videoUrl ? getVideoFormat(videoUrl) === "vertical" : false;
  const videoContent = embedUrl ? (
    <div className={`relative w-full overflow-hidden rounded-2xl bg-gray-100 ${isVertical ? "aspect-[9/16] max-w-[320px] mx-auto" : "aspect-video"}`}>
      <iframe
        src={embedUrl}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={title}
      />
    </div>
  ) : null;

  const sectionsContent = checkoutSections.length > 0 ? (
    <div className="space-y-10">
      {checkoutSections.map((section, i) => (
        <div key={i}>
          {section.title && (
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-lg font-bold" style={{ color: "var(--theme-text, #111827)" }}>
                {section.title}
              </h2>
              <div className="h-px flex-1" style={{ backgroundColor: "var(--theme-card-border, #E5E7EB)" }} />
            </div>
          )}

          {section.type === "text" && section.content && (
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: "var(--theme-card-bg, #FFFFFF)", border: "1px solid var(--theme-card-border, #E5E7EB)" }}
            >
              {section.content.includes("<") ? (
                <SafeHTML
                  html={section.content}
                  className="text-sm leading-relaxed [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-bold [&_p]:mt-1.5 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:mt-1 [&_a]:underline"
                  style={{ color: "var(--theme-text, #374151)" }}
                />
              ) : (
                <div className="leading-relaxed" style={{ color: "var(--theme-text, #374151)" }}>
                  {section.content.split("\n").map((p, j) => (
                    <p key={j} className={`text-sm ${j > 0 ? "mt-2.5" : ""}`}>{p}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {section.type === "faq" && section.items && (
            <div className="space-y-2.5">
              {section.items.map((item, j) => (
                <details
                  key={j}
                  className="group overflow-hidden rounded-2xl transition-all"
                  style={{ backgroundColor: "var(--theme-card-bg, #FFFFFF)", border: "1px solid var(--theme-card-border, #E5E7EB)" }}
                >
                  <summary className="flex cursor-pointer items-center gap-3 px-5 py-4 text-[15px] font-semibold select-none" style={{ color: "var(--theme-text, #111827)" }}>
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ backgroundColor: "var(--theme-primary, #0D9488)", color: "#FFFFFF", opacity: 0.9 }}
                    >
                      ?
                    </span>
                    <span className="flex-1">{item.question}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 transition-transform duration-200 group-open:rotate-180" style={{ color: "var(--theme-text-muted, #9CA3AF)" }}><path d="m6 9 6 6 6-6"/></svg>
                  </summary>
                  <div className="border-t px-5 pb-4 pt-3 text-sm leading-relaxed" style={{ color: "var(--theme-text-muted, #6B7280)", borderColor: "var(--theme-card-border, #F3F4F6)" }}>
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          )}

          {section.type === "features" && section.items && (
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: "var(--theme-card-bg, #FFFFFF)", border: "1px solid var(--theme-card-border, #E5E7EB)" }}
            >
              <div className="space-y-3.5">
                {section.items.map((item, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: "color-mix(in srgb, var(--theme-primary, #0D9488) 12%, transparent)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: "var(--theme-primary, #0D9488)" }}><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                    <span className="text-sm font-medium leading-relaxed" style={{ color: "var(--theme-text, #374151)" }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section.type === "video" && section.content && (() => {
            const secEmbedUrl = getVideoEmbedUrl(section.content);
            const secIsVertical = getVideoFormat(section.content) === "vertical";
            return secEmbedUrl ? (
              <div className={`relative w-full overflow-hidden rounded-2xl bg-gray-100 ${secIsVertical ? "aspect-[9/16] max-w-[320px] mx-auto" : "aspect-video"}`}>
                <iframe
                  src={secEmbedUrl}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={title}
                />
              </div>
            ) : null;
          })()}
        </div>
      ))}
    </div>
  ) : null;

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / reviews.length
    : 0;

  const reviewsContent = reviews.length > 0 ? (
    <div>
      {/* Header with average rating */}
      <div className="mb-5 flex items-center gap-3">
        <h2 className="text-lg font-bold" style={{ color: "var(--theme-text, #111827)" }}>
          Avis clients
        </h2>
        <div className="h-px flex-1" style={{ backgroundColor: "var(--theme-card-border, #E5E7EB)" }} />
      </div>

      {/* Average rating summary */}
      <div
        className="mb-5 flex items-center gap-4 rounded-2xl p-4"
        style={{ backgroundColor: "var(--theme-card-bg, #FFFFFF)", border: "1px solid var(--theme-card-border, #E5E7EB)" }}
      >
        <div className="text-center">
          <span className="text-3xl font-extrabold" style={{ color: "var(--theme-text, #111827)" }}>
            {avgRating.toFixed(1)}
          </span>
          <div className="mt-0.5 flex items-center justify-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < Math.round(avgRating) ? "#FBBF24" : "none"} stroke={i < Math.round(avgRating) ? "#FBBF24" : "#D1D5DB"} strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
        </div>
        <div className="h-10 w-px" style={{ backgroundColor: "var(--theme-card-border, #E5E7EB)" }} />
        <p className="text-sm" style={{ color: "var(--theme-text-muted, #6B7280)" }}>
          {reviews.length} avis client{reviews.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Review cards */}
      <div className="space-y-3">
        {reviews.map((review: Review) => (
          <div
            key={review.id}
            className="rounded-2xl p-5"
            style={{
              backgroundColor: "var(--theme-card-bg, #FFFFFF)",
              border: "1px solid var(--theme-card-border, #E5E7EB)",
            }}
          >
            <div className="flex items-start gap-3.5">
              {/* Avatar initials */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ backgroundColor: "color-mix(in srgb, var(--theme-primary, #0D9488) 12%, transparent)", color: "var(--theme-primary, #0D9488)" }}
              >
                {review.name ? review.name.charAt(0).toUpperCase() : "?"}
              </div>
              <div className="min-w-0 flex-1">
                {/* Name + stars row */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold" style={{ color: "var(--theme-text, #111827)" }}>
                    {review.name}
                  </p>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i < review.rating ? "#FBBF24" : "none"} stroke={i < review.rating ? "#FBBF24" : "#D1D5DB"} strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                </div>
                {/* Review text */}
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--theme-text-muted, #6B7280)" }}>
                  &ldquo;{review.text}&rdquo;
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <StoreThemeProvider themeConfig={themeConfig} bgImageUrl={seller.bgImageUrl} imageStyle={seller.imageStyle}>
      <PageTracker slug={slug} />
      <PixelScripts
        metaPixelId={seller.metaPixelId || null}
        googleAdsId={seller.googleAdsId || null}
        googleAnalyticsId={seller.googleAnalyticsId || null}
        tiktokPixelId={seller.tiktokPixelId || null}
      />

      {/* ══════════ MOBILE LAYOUT (< md) ══════════ */}
      <div className="mx-auto max-w-2xl md:hidden">
        {/* Hero cover image */}
        {coverUrl && (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
            <SafeImage src={coverUrl} alt={title} fill className="object-cover" priority sizes="100vw" />
            <Link
              href={`/${slug}`}
              className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </Link>
          </div>
        )}
        <div className="px-4 pb-28 pt-6">
          {!coverUrl && (
            <Link href={`/${slug}`} className="mb-4 inline-flex items-center gap-1 text-sm font-medium transition-colors" style={{ color: "var(--theme-text-muted, #6B7280)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              {seller.displayName}
            </Link>
          )}
          <div className="mb-4 flex items-center gap-3">
            {seller.avatarUrl && <SafeImage src={seller.avatarUrl} alt={seller.displayName} width={36} height={36} className="rounded-full object-cover" />}
            <span className="text-sm font-medium" style={{ color: "var(--theme-text-muted, #6B7280)" }}>
              {seller.displayName}
              {seller.kycStatus === "APPROVED" && <VerifiedBadge size={14} className="ml-1" />}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: "var(--theme-text, #111827)" }}>{title}</h1>
          {subtitle && <p className="mt-1 text-sm" style={{ color: "var(--theme-text-muted, #6B7280)" }}>{subtitle}</p>}
          {block.type === "FUNDRAISER" && <div className="mt-4"><FundraiserProgress blockId={block.id} /></div>}
          {priceDisplay && <div className="mt-3">{priceDisplay}</div>}
          {bookingBadges && <div className="mt-4">{bookingBadges}</div>}
          {communityMemberBadge && <div className="mt-3">{communityMemberBadge}</div>}
          <div className="my-6 border-t" style={{ borderColor: "var(--theme-card-border, #E5E7EB)" }} />
          {descriptionContent}
          {videoContent && !hasVideoSection && <div className="mt-6">{videoContent}</div>}
          {sectionsContent && <div className="mt-8">{sectionsContent}</div>}
          {reviewsContent && <div className="mt-8">{reviewsContent}</div>}
          {block.type === "FUNDRAISER" && <div className="mt-8"><RecentDonations blockId={block.id} /></div>}
        </div>
      </div>

      {/* ══════════ DESKTOP LAYOUT (≥ md) ══════════ */}
      <div className="mx-auto hidden min-h-screen max-w-5xl md:block">
        {/* Back nav */}
        <div className="px-6 pt-6 lg:px-10">
          <Link href={`/${slug}`} className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80" style={{ color: "var(--theme-text-muted, #6B7280)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Retour à {seller.displayName}
          </Link>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-[1fr,380px] gap-8 px-6 pt-6 pb-16 lg:gap-12 lg:px-10">
          {/* ── LEFT: Media + Content ── */}
          <div className="min-w-0">
            {/* Cover image — rounded on desktop */}
            {coverUrl && (
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-gray-100">
                <SafeImage src={coverUrl} alt={title} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 672px" />
              </div>
            )}

            {/* Description */}
            {descriptionContent && <div className={coverUrl ? "mt-8" : ""}>{descriptionContent}</div>}

            {/* Video (standalone fallback for old data without video section) */}
            {videoContent && !hasVideoSection && <div className="mt-8">{videoContent}</div>}

            {/* Checkout sections (includes video sections inline) */}
            {sectionsContent && <div className="mt-10">{sectionsContent}</div>}

            {/* Reviews */}
            {reviewsContent && <div className="mt-10">{reviewsContent}</div>}

            {/* Recent donations for fundraiser */}
            {block.type === "FUNDRAISER" && <div className="mt-10"><RecentDonations blockId={block.id} /></div>}

            {/* Empty state if no content */}
            {!descriptionContent && !videoContent && !sectionsContent && !reviewsContent && !coverUrl && (
              <div className="flex items-center justify-center rounded-2xl py-20" style={{ backgroundColor: "var(--theme-card-bg, #F9FAFB)" }}>
                <p className="text-sm" style={{ color: "var(--theme-text-muted, #9CA3AF)" }}>Pas de description disponible</p>
              </div>
            )}
          </div>

          {/* ── RIGHT: Sticky sidebar ── */}
          <div className="relative">
            <div className="sticky top-6">
              <div
                className="overflow-hidden rounded-2xl p-6"
                style={{
                  backgroundColor: "var(--theme-card-bg, #FFFFFF)",
                  border: "1px solid var(--theme-card-border, #E5E7EB)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                }}
              >
                {/* Seller */}
                <div className="flex items-center gap-3">
                  {seller.avatarUrl && <SafeImage src={seller.avatarUrl} alt={seller.displayName} width={40} height={40} className="rounded-full object-cover" />}
                  <span className="text-sm font-medium" style={{ color: "var(--theme-text-muted, #6B7280)" }}>
                    {seller.displayName}
                    {seller.kycStatus === "APPROVED" && <VerifiedBadge size={14} className="ml-1" />}
                  </span>
                </div>

                {/* Title */}
                <h1 className="mt-4 text-xl font-extrabold leading-tight lg:text-2xl" style={{ color: "var(--theme-text, #111827)" }}>
                  {title}
                </h1>
                {subtitle && <p className="mt-1 text-sm" style={{ color: "var(--theme-text-muted, #6B7280)" }}>{subtitle}</p>}

                {/* Fundraiser progress */}
                {block.type === "FUNDRAISER" && <div className="mt-4"><FundraiserProgress blockId={block.id} /></div>}

                {/* Price */}
                {priceDisplay && <div className="mt-4">{priceDisplay}</div>}

                {/* Badges */}
                {bookingBadges && <div className="mt-4">{bookingBadges}</div>}
                {communityMemberBadge && <div className="mt-3">{communityMemberBadge}</div>}

                {/* Separator */}
                <div className="my-5 border-t" style={{ borderColor: "var(--theme-card-border, #E5E7EB)" }} />

                {/* Desktop CTA button */}
                <CheckoutCTA
                  block={block}
                  sellerSlug={slug}
                  sellerTimezone={seller.timezone || "Africa/Dakar"}
                  sellerName={seller.displayName}
                  buttonText={buttonText}
                  price={price}
                  discountPrice={discountPrice}
                  desktopMode
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-only sticky CTA bar */}
      <div className="md:hidden">
        <CheckoutCTA
          block={block}
          sellerSlug={slug}
          sellerTimezone={seller.timezone || "Africa/Dakar"}
          sellerName={seller.displayName}
          buttonText={buttonText}
          price={price}
          discountPrice={discountPrice}
        />
      </div>

      <div className="pb-28 md:pb-0">
        <IzyFooter slug={seller.slug} showFooter={seller.plan !== "PRO"} />
      </div>
    </StoreThemeProvider>
  );
}
