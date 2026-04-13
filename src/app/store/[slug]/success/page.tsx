"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { SafeImage } from "@/components/store/SafeImage";
import Link from "next/link";
import { Download, ArrowLeft, Loader2, Calendar, Clock, MapPin, CalendarPlus, Mail, Phone, GraduationCap } from "lucide-react";
import { StoreSkeleton, Avatar } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { PixelScripts } from "@/components/store/PixelScripts";
import { ConversionPixels } from "@/components/store/ConversionPixels";

const API_URL = "";
const POLL_INTERVAL = 3000;
const MAX_POLLS = 30;

interface SellerInfo {
  displayName: string;
  slug: string;
  avatarUrl: string | null;
  supportPhone: string | null;
  metaPixelId?: string | null;
  googleAdsId?: string | null;
  googleAnalyticsId?: string | null;
  tiktokPixelId?: string | null;
}

interface ProductInfo {
  title: string;
  coverUrl: string | null;
  fileName: string | null;
}

interface BookingInfo {
  serviceTitle: string;
  date: string | null;
  duration: number | null;
  location: string | null;
}

interface FormationInfo {
  title: string;
  courseId: string | null;
}

interface StatusResponse {
  status: string;
  orderType: string;
  reference: string;
  downloadUrl?: string;
  amount?: number;
  currency?: string;
  customerName?: string;
  seller?: SellerInfo;
  product?: ProductInfo;
  booking?: BookingInfo;
  formation?: FormationInfo;
  blockType?: string;
  donorMessage?: string;
  thankYouMessage?: string;
}

// ── Mock data for dev simulation (never shipped to prod) ──
const IS_DEV = process.env.NODE_ENV !== "production";

function getMockData(slug: string, type: string | null): StatusResponse {
  const baseSeller: SellerInfo = { displayName: "Boutique Demo", slug, avatarUrl: null, supportPhone: null };
  if (type === "BOOKING") {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(14, 0, 0, 0);
    return {
      status: "PAID", orderType: "BOOKING", reference: "SIM-BOOK-001",
      amount: 25000, seller: baseSeller,
      booking: { serviceTitle: "Coaching individuel (60 min)", date: d.toISOString(), duration: 60, location: "Google Meet" },
    };
  }
  if (type === "PAYMENT") {
    return {
      status: "PAID", orderType: "PAYMENT", reference: "SIM-PAY-001",
      amount: 5000, seller: baseSeller, donorMessage: "Merci pour tout ce que tu fais !",
    };
  }
  if (type === "DONATION") {
    return {
      status: "PAID", orderType: "DONATION", reference: "SIM-DON-001",
      amount: 2000, seller: baseSeller, donorMessage: "Continue comme ça, tu es incroyable !",
    };
  }
  // Default: SALE
  return {
    status: "PAID", orderType: "SALE", reference: "SIM-SALE-001",
    amount: 15000, seller: baseSeller,
    product: { title: "Guide complet — Marketing Digital", coverUrl: null, fileName: "guide-marketing.pdf" },
    downloadUrl: "#mock-download",
  };
}

function SuccessContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const type = searchParams.get("type");
  const isMock = IS_DEV && searchParams.get("mock") === "true";

  const isSale = type === "SALE";
  const isBooking = type === "BOOKING";
  const isPayment = type === "PAYMENT";
  const isDonation = type === "DONATION";

  const [data, setData] = useState<StatusResponse | null>(isMock ? getMockData(params.slug, type) : null);
  const isFormation = isSale && data?.blockType === "FORMATION";
  const [downloadUrl, setDownloadUrl] = useState<string | null>(isMock && isSale ? "#mock-download" : null);
  const [downloadLoading, setDownloadLoading] = useState(isMock ? false : isSale);
  const [pollCount, setPollCount] = useState(0);
  const [paidNoFile, setPaidNoFile] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const pollStatus = useCallback(async () => {
    if (!ref) return;
    try {
      const res = await fetch(`${API_URL}/api/orders/${ref}/status`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const d = (await res.json()) as StatusResponse;
      if (d.status === "PAID") {
        setData(d);
        if (d.downloadUrl) {
          setDownloadUrl(d.downloadUrl);
        } else {
          setPaidNoFile(true);
        }
        setDownloadLoading(false);
      } else if (d.status === "FAILED") {
        setData(d);
      }
    } catch {
      // Silently retry on network error
    }
  }, [ref]);

  useEffect(() => {
    if (isMock) return;
    if (!ref || (data && !isSale)) return;
    if (isSale && (downloadUrl || paidNoFile)) return;
    if (pollCount >= MAX_POLLS) {
      setDownloadLoading(false);
      if (!data) setTimedOut(true);
      return;
    }
    const delay = pollCount === 0 ? 0 : POLL_INTERVAL;
    const timer = setTimeout(() => {
      pollStatus();
      setPollCount((c) => c + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [isMock, ref, data, isSale, downloadUrl, paidNoFile, pollCount, pollStatus]);

  const seller = data?.seller;
  const product = data?.product;
  const booking = data?.booking;

  // Format booking date
  const bookingDateStr = booking?.date
    ? new Date(booking.date).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;
  const bookingTimeStr = booking?.date
    ? new Date(booking.date).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // Build Google Calendar URL for bookings
  const calendarUrl = booking?.date
    ? (() => {
        const start = new Date(booking.date);
        const end = new Date(start.getTime() + (booking.duration || 60) * 60 * 1000);
        const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
        const params = new URLSearchParams({
          action: "TEMPLATE",
          text: booking.serviceTitle || "Rendez-vous",
          dates: `${fmt(start)}/${fmt(end)}`,
          ...(booking.location ? { location: booking.location } : {}),
          ...(seller ? { details: `Rendez-vous avec ${seller.displayName}` } : {}),
        });
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
      })()
    : null;

  // Stagger delay helper for CSS animations
  const stagger = (i: number) => ({ animation: `slideUp 0.5s ease-out ${0.1 + i * 0.08}s both` });

  // ── FAILED state ──
  if (data?.status === "FAILED") {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-red-50/50 to-white">
        <div className="flex flex-col items-center px-5 pt-10 pb-2" style={stagger(0)}>
          <div
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/25"
            style={{ animation: "successRingScale 0.6s ease-out both" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700" style={stagger(1)}>
            <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Paiement échoué
          </div>
        </div>
        <div className="flex flex-1 flex-col px-4 pb-8 pt-4">
          <div className="mx-auto w-full max-w-sm">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" style={stagger(2)}>
              <h1 className="text-xl font-bold text-gray-900">Le paiement n&apos;a pas abouti</h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">Vérifie ton solde ou ton code de confirmation, puis réessaie.</p>
            </div>
            <div className="mt-4 space-y-2.5" style={stagger(3)}>
              <Link href={`/${params.slug}`} className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 active:scale-[0.98]">
                <ArrowLeft size={15} />
                Réessayer
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Timeout state — polling exhausted without confirmation ──
  if (!data && timedOut) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-amber-50/50 to-white">
        <div className="flex flex-col items-center px-5 pt-10 pb-2" style={stagger(0)}>
          <div
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-500/25"
            style={{ animation: "successRingScale 0.6s ease-out both" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700" style={stagger(1)}>
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            En attente de confirmation
          </div>
        </div>
        <div className="flex flex-1 flex-col px-4 pb-8 pt-4">
          <div className="mx-auto w-full max-w-sm">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" style={stagger(2)}>
              <h1 className="text-xl font-bold text-gray-900">La confirmation prend du temps</h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Pas d&apos;inquiétude — tu recevras un email de confirmation avec ton contenu dès que le paiement sera validé.
              </p>
              {ref && <p className="mt-3 font-mono text-xs text-gray-300">Réf. {ref}</p>}
            </div>
            <div className="mt-4 space-y-2.5" style={stagger(3)}>
              <button
                onClick={() => { setTimedOut(false); setPollCount(0); }}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
              >
                <Loader2 size={15} />
                Vérifier à nouveau
              </button>
              <Link href={`/${params.slug}`} className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 active:scale-[0.98]">
                <ArrowLeft size={15} />
                Retourner à la page
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Still loading — verification state
  if (!data) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-white">
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10">
          <div className="w-full max-w-xs text-center">
            <div className="relative mx-auto h-14 w-14">
              <div className="absolute inset-0 rounded-full border-[2.5px] border-gray-200" />
              <div
                className="absolute inset-0 rounded-full border-[2.5px] border-teal-500 border-t-transparent"
                style={{ animation: "spin 1s linear infinite" }}
              />
            </div>
            <p className="mt-5 text-[15px] font-semibold text-gray-900">Vérification en cours</p>
            <p className="mt-1.5 text-sm text-gray-400">Ne ferme pas cette page</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50/80 to-white">

      {/* ── Tracking pixels + conversion events ── */}
      {seller && (
        <>
          <PixelScripts
            metaPixelId={seller.metaPixelId || null}
            googleAdsId={seller.googleAdsId || null}
            googleAnalyticsId={seller.googleAnalyticsId || null}
            tiktokPixelId={seller.tiktokPixelId || null}
          />
          {data.amount != null && (
            <ConversionPixels
              metaPixelId={seller.metaPixelId || null}
              googleAdsId={seller.googleAdsId || null}
              googleAnalyticsId={seller.googleAnalyticsId || null}
              tiktokPixelId={seller.tiktokPixelId || null}
              amount={data.amount}
              currency={data.currency || "XOF"}
              orderReference={data.reference}
              orderType={data.orderType}
            />
          )}
        </>
      )}

      {/* ── Animated success header ── */}
      <div className="flex flex-col items-center px-5 pt-10 pb-2" style={stagger(0)}>
        {/* Animated check icon */}
        <div className="relative">
          {/* Outer pulse ring */}
          <div
            className="absolute -inset-3 rounded-full bg-teal-500/10"
            style={{ animation: "successRingPulse 2s ease-out 0.8s infinite" }}
          />
          {/* Main circle */}
          <div
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/25"
            style={{ animation: "successRingScale 0.6s ease-out both" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 36,
                  strokeDashoffset: 36,
                  animation: "successCheckDraw 0.4s ease-out 0.5s forwards",
                }}
              />
            </svg>
          </div>
          {/* Confetti dots */}
          {[
            { top: "-6px", left: "-8px", bg: "#F59E0B", size: "8px", delay: "0.6s" },
            { top: "-10px", left: "50%", bg: "#0D9488", size: "6px", delay: "0.7s" },
            { top: "-4px", right: "-10px", bg: "#EC4899", size: "7px", delay: "0.8s" },
            { top: "50%", left: "-12px", bg: "#8B5CF6", size: "5px", delay: "0.65s" },
            { top: "50%", right: "-12px", bg: "#F59E0B", size: "5px", delay: "0.75s" },
          ].map((dot, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                top: dot.top,
                left: dot.left,
                right: dot.right,
                width: dot.size,
                height: dot.size,
                backgroundColor: dot.bg,
                animation: `confettiBurst 1s ease-out ${dot.delay} forwards`,
                opacity: 0,
              }}
            />
          ))}
        </div>

        {/* Status badge */}
        <div
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-teal-700"
          style={stagger(1)}
        >
          <div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
          {isBooking ? "Réservation confirmée" : isDonation ? "Don reçu — merci !" : isPayment ? "Paiement reçu" : isFormation ? "Inscription confirmée" : "Commande confirmée"}
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="flex flex-1 flex-col px-4 pb-8 pt-4">
        <div className="mx-auto w-full max-w-sm">

          {/* Card container */}
          <div
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-200/60"
            style={stagger(2)}
          >
            <div className="p-5">

              {/* Seller row */}
              {seller && (
                <div className="flex items-center gap-3 pb-4">
                  <Avatar src={seller.avatarUrl} alt={seller.displayName} size="sm" />
                  <span className="text-sm font-medium text-gray-500">{seller.displayName}</span>
                </div>
              )}

              {/* Product cover (sale) */}
              {isSale && product?.coverUrl && (
                <div className="relative -mx-5 mb-4 aspect-[2.2/1] w-[calc(100%+2.5rem)] overflow-hidden bg-gray-50">
                  <SafeImage
                    src={product.coverUrl}
                    alt={product.title || "Produit"}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Title */}
              <h1 className="text-xl font-bold leading-tight text-gray-900">
                {isBooking
                  ? (booking?.serviceTitle || "Rendez-vous confirmé")
                  : isDonation
                    ? "Merci infiniment !"
                    : isPayment
                      ? "Paiement confirmé"
                      : isFormation
                        ? (data?.formation?.title || product?.title || "Formation confirmée")
                        : (product?.title || "Achat confirmé")
                }
              </h1>
              {isDonation && (
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                  {data.thankYouMessage || "Ton don fait une vraie différence. Merci pour ta générosité."}
                </p>
              )}

              {/* ═══ BOOKING details ═══ */}
              {isBooking && (
                <div className="mt-4 space-y-2.5">
                  {bookingDateStr && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                        <Calendar size={15} className="text-gray-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 first-letter:uppercase">{bookingDateStr}</span>
                    </div>
                  )}
                  {bookingTimeStr && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                        <Clock size={15} className="text-gray-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {bookingTimeStr}{booking?.duration ? ` · ${booking.duration} min` : ""}
                      </span>
                    </div>
                  )}
                  {booking?.location && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                        <MapPin size={15} className="text-gray-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{booking.location}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ FORMATION access info ═══ */}
              {isFormation && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3 rounded-xl bg-violet-50 px-4 py-3.5">
                    <GraduationCap size={20} className="mt-0.5 shrink-0 text-violet-600" />
                    <div>
                      <p className="text-sm font-semibold text-violet-900">Ton accès a été activé</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-violet-700">
                        Tu vas recevoir un email de <span className="font-semibold">Systeme.io</span> avec tes identifiants de connexion à la formation.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <Mail size={16} className="mt-0.5 shrink-0 text-gray-400" />
                    <div>
                      <p className="text-[13px] font-medium text-gray-700">Vérifie ta boîte email</p>
                      <p className="mt-0.5 text-[12px] text-gray-400">L&apos;email peut prendre quelques minutes. Pense à vérifier tes spams.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ PAYMENT / DONATION donor message ═══ */}
              {(isPayment || isDonation) && data.donorMessage && (
                <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-sm italic leading-relaxed text-gray-500">
                    &ldquo;{data.donorMessage}&rdquo;
                  </p>
                </div>
              )}

              {/* ── Summary section ── */}
              <div className="mt-5 border-t border-dashed border-gray-200 pt-4">
                {/* Line items */}
                <div className="space-y-2.5">
                  {isSale && product && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{isFormation ? "Formation" : "Produit"}</span>
                      <span className="text-sm font-medium text-gray-700">{product.title}</span>
                    </div>
                  )}
                  {isBooking && booking && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Service</span>
                      <span className="text-sm font-medium text-gray-700">{booking.serviceTitle}</span>
                    </div>
                  )}
                  {isDonation && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Type</span>
                      <span className="text-sm font-medium text-gray-700">Don</span>
                    </div>
                  )}
                  {isPayment && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Type</span>
                      <span className="text-sm font-medium text-gray-700">Paiement</span>
                    </div>
                  )}
                  {ref && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Référence</span>
                      <span className="font-mono text-xs text-gray-400">{ref}</span>
                    </div>
                  )}
                </div>

                {/* Total */}
                {data.amount != null && (
                  <>
                    <div className="my-3 border-t border-gray-100" />
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-bold text-gray-900">Total</span>
                      <span className="text-[15px] font-bold text-teal-600">{formatPrice(data.amount)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="mt-4 space-y-2.5" style={stagger(3)}>

            {/* Download (sale with file — not formation) */}
            {isSale && !isFormation && downloadUrl && (
              <a
                href={downloadUrl}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition-all hover:bg-teal-700 active:scale-[0.98]"
              >
                <Download size={17} />
                Télécharger mon fichier
              </a>
            )}

            {/* Download loading (not formation) */}
            {isSale && !isFormation && downloadLoading && (
              <div className="flex items-center justify-center gap-2.5 rounded-xl bg-gray-50 px-4 py-3.5">
                <Loader2 size={15} className="animate-spin text-teal-600" />
                <span className="text-sm text-gray-500">Préparation du fichier...</span>
              </div>
            )}

            {/* No file — email fallback (not formation) */}
            {isSale && !isFormation && !downloadLoading && !downloadUrl && (
              <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 px-4 py-3">
                <Mail size={15} className="shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">
                  Le lien de téléchargement a été envoyé par email.
                </p>
              </div>
            )}

            {/* Formation — access button */}
            {isFormation && (
              <a
                href="https://systeme.io/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/20 transition-all hover:bg-violet-700 active:scale-[0.98]"
              >
                <GraduationCap size={17} />
                Accéder à ma formation
              </a>
            )}

            {/* Calendar (booking) */}
            {isBooking && calendarUrl && (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition-all hover:bg-teal-700 active:scale-[0.98]"
              >
                <CalendarPlus size={17} />
                Ajouter au calendrier
              </a>
            )}

            {/* Email notice */}
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3" style={stagger(4)}>
              <Mail size={14} className="shrink-0 text-gray-400" />
              <p className="text-[13px] text-gray-500">Un email de confirmation a été envoyé.</p>
            </div>

            {/* Support phone */}
            {seller?.supportPhone && (
              <a
                href={`https://wa.me/${seller.supportPhone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50"
                style={stagger(5)}
              >
                <Phone size={14} className="shrink-0 text-green-600" />
                <div>
                  <p className="text-[13px] font-medium text-gray-700">Besoin d&apos;aide ?</p>
                  <p className="text-[11px] text-gray-400">Contacter le service client</p>
                </div>
              </a>
            )}

            {/* Back to store */}
            <Link
              href={`/${params.slug}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 active:scale-[0.98]"
              style={stagger(seller?.supportPhone ? 6 : 5)}
            >
              <ArrowLeft size={15} />
              Retourner à la page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<StoreSkeleton />}>
      <SuccessContent />
    </Suspense>
  );
}
