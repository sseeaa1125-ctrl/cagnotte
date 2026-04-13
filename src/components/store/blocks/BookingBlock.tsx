"use client";

import { useState, useEffect } from "react";
import { SafeImage } from "@/components/store/SafeImage";
import { Calendar, Clock, MapPin, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import dynamic from "next/dynamic";
const PaymentModal = dynamic(() => import("@/components/store/PaymentModal").then(m => m.PaymentModal), { ssr: false });
import { BookingCalendar } from "@/components/store/BookingCalendar";
import { TimeSlotSheet } from "@/components/store/TimeSlotSheet";
import type { BookingService, BookingSlot } from "@/types";

interface BookingBlockProps {
  service: BookingService & { slots: BookingSlot[] };
  sellerSlug: string;
  sellerTimezone?: string;
}

// Map IANA timezone to UTC offset for ISO string construction
export function tzToOffset(tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const parts = fmt.formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    const val = tzPart?.value || "GMT";
    if (val === "GMT" || val === "UTC") return "+00:00";
    const match = val.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
    if (!match) return "+00:00";
    const sign = match[1];
    const h = match[2].padStart(2, "0");
    const m = (match[3] || "00").padStart(2, "0");
    return `${sign}${h}:${m}`;
  } catch {
    return "+00:00";
  }
}

export function BookingBlock({ service, sellerSlug, sellerTimezone = "Africa/Dakar" }: BookingBlockProps) {
  const [showSheet, setShowSheet] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  // "calendar" = picking a date, "times" = picking a time slot
  const [sheetStep, setSheetStep] = useState<"calendar" | "times">("calendar");

  function openSheet() {
    setSelectedDate(null);
    setSelectedTime(null);
    setSheetStep("calendar");
    setShowSheet(true);
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedTime(null);
    setSheetStep("times");
  }

  function handleBackToCalendar() {
    setSheetStep("calendar");
  }

  function handleSelectTime(time: string) {
    setSelectedTime(time);
    setShowSheet(false);
    setShowPayment(true);
  }

  // Prix fixe par slot (pas de multiplication par durée)
  const totalPrice = service.price;
  const ctaStyle = service.ctaStyle || "button";
  const btnText = service.buttonText || "Réserver";
  const hasSlots = service.slots && service.slots.length > 0;

  // Build ISO datetime in seller's timezone
  const bookingDateTime = selectedDate && selectedTime
    ? `${selectedDate}T${selectedTime}:00${tzToOffset(sellerTimezone)}`
    : undefined;

  const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--theme-card-bg, #FFFFFF)",
    border: "1px solid var(--theme-card-border, #E5E7EB)",
    borderRadius: "var(--theme-card-radius, 16px)",
    boxShadow: "var(--theme-card-shadow, none)",
    backdropFilter: "var(--theme-card-backdrop, none)",
  };

  const btnStyle: React.CSSProperties = {
    backgroundColor: "var(--theme-btn-bg, #0D9488)",
    color: "var(--theme-btn-color, #FFFFFF)",
    border: "var(--theme-btn-border, none)",
    borderRadius: "var(--theme-btn-radius, 12px)",
  };

  const bookingBadges = (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium" style={{ backgroundColor: "rgba(var(--theme-primary-rgb, 13,148,136), 0.08)", color: "var(--theme-primary, #0D9488)" }}>
        <Clock size={10} /> {service.duration} min
      </span>
      {service.location && (
        <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium" style={{ backgroundColor: "rgba(var(--theme-primary-rgb, 13,148,136), 0.08)", color: "var(--theme-primary, #0D9488)" }}>
          <MapPin size={10} /> {service.location}
        </span>
      )}
    </div>
  );

  const ctaButton = hasSlots ? (
    <button
      onClick={openSheet}
      className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] hover:opacity-90"
      style={btnStyle}
    >
      <Calendar size={16} /> {btnText}
    </button>
  ) : (
    <div className="rounded-xl px-4 py-3 text-center text-xs" style={{ backgroundColor: "rgba(var(--theme-primary-rgb, 13,148,136), 0.05)", color: "var(--theme-text-muted, #9CA3AF)" }}>
      Aucun créneau disponible pour le moment
    </div>
  );

  // ── button: compact row ──
  let content: React.ReactNode;
  if (ctaStyle === "button") {
    content = (
      <div className="flex h-full items-center gap-3 overflow-hidden p-3 transition-all" style={cardStyle}>
        {service.coverUrl ? (
          <div className="h-14 w-14 shrink-0 overflow-hidden bg-gray-100" style={{ borderRadius: "calc(var(--theme-card-radius, 16px) * 0.6)" }}>
            <SafeImage src={service.coverUrl} alt={service.title} width={56} height={56} className="h-full w-full object-cover" fallback={<Calendar size={20} />} />
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center" style={{ backgroundColor: "var(--theme-bg, #F3F4F6)", color: "var(--theme-text-muted, #9CA3AF)", borderRadius: "calc(var(--theme-card-radius, 16px) * 0.6)" }}>
            <Calendar size={20} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold" style={{ color: "var(--theme-text, #111827)" }}>{service.title}</h3>
          <p className="mt-0.5 text-xs" style={{ color: "var(--theme-primary, #0D9488)" }}>{formatPrice(totalPrice)}</p>
        </div>
        {hasSlots ? (
          <button onClick={openSheet} className="shrink-0 px-4 py-2.5 text-xs font-semibold transition-colors active:scale-[0.98]" style={btnStyle}>{btnText}</button>
        ) : (
          <span className="shrink-0 text-[10px] text-gray-400">Indisponible</span>
        )}
      </div>
    );
  } else if (ctaStyle === "callout") {
    // ── callout: image LEFT + title/badges/price RIGHT + CTA full-width bottom ──
    content = (
      <div className="flex h-full flex-col overflow-hidden transition-all" style={cardStyle}>
        <div className="flex items-start gap-3 p-3 pb-0 md:gap-4 md:p-4 md:pb-0">
          {service.coverUrl ? (
            <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden bg-gray-100 md:h-[100px] md:w-[100px]" style={{ borderRadius: "calc(var(--theme-card-radius, 16px) * 0.65)" }}>
              <SafeImage src={service.coverUrl} alt={service.title} fill className="object-cover" sizes="100px" fallback={<Calendar size={24} />} />
            </div>
          ) : (
            <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center md:h-[100px] md:w-[100px]" style={{ backgroundColor: "var(--theme-bg, #F3F4F6)", color: "var(--theme-text-muted, #9CA3AF)", borderRadius: "calc(var(--theme-card-radius, 16px) * 0.65)" }}>
              <Calendar size={24} />
            </div>
          )}
          <div className="min-w-0 flex-1 py-0.5">
            <h3 className="text-[15px] font-bold leading-snug md:text-base" style={{ color: "var(--theme-text, #111827)" }}>{service.title}</h3>
            {service.description && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--theme-text-muted, #6B7280)" }}>{service.description}</p>
            )}
            <p className="mt-1.5 text-sm font-bold" style={{ color: "var(--theme-primary, #0D9488)" }}>{formatPrice(totalPrice)}</p>
            {bookingBadges}
          </div>
        </div>
        <div className="p-3 pt-2.5 md:p-4 md:pt-3">{ctaButton}</div>
      </div>
    );
  } else {
    // ── preview: full detailed card ──
    content = (
      <div className="flex h-full flex-col overflow-hidden transition-all" style={cardStyle}>
        {service.coverUrl && (
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
            <SafeImage src={service.coverUrl} alt={service.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 400px" fallback={<Calendar size={28} style={{ color: "var(--theme-text-muted, #9CA3AF)" }} />} />
          </div>
        )}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold" style={{ color: "var(--theme-text, #111827)" }}>{service.title}</h3>
              {service.description && (
                <p className="mt-1 text-xs line-clamp-3 leading-relaxed" style={{ color: "var(--theme-text-muted, #6B7280)" }}>{service.description}</p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <span className="text-sm font-bold" style={{ color: "var(--theme-primary, #0D9488)" }}>{formatPrice(totalPrice)}</span>
            </div>
          </div>
          {bookingBadges}
          <div className="mt-auto pt-3">{ctaButton}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {content}

      {/* Booking bottom sheet — calendar then time slots */}
      {showSheet && (
        <BookingSheet
          step={sheetStep}
          service={service}
          sellerTimezone={sellerTimezone}
          sellerSlug={sellerSlug}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          onSelectTime={handleSelectTime}
          onBack={handleBackToCalendar}
          onClose={() => setShowSheet(false)}
        />
      )}

      {/* Payment modal */}
      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        title={service.title}
        amount={totalPrice}
        orderType="BOOKING"
        sellerSlug={sellerSlug}
        bookingServiceId={service.id}
        bookingDate={bookingDateTime}
        bookingDuration={service.duration}
        bookingLocation={service.location || undefined}
        onSlotTaken={() => {
          setShowPayment(false);
          setSelectedTime(null);
          setSheetStep("times");
          setShowSheet(true);
        }}
      />
    </>
  );
}

// ── Unified booking bottom sheet: calendar → time slots ──
export function BookingSheet({
  step,
  service,
  sellerTimezone,
  sellerSlug,
  selectedDate,
  onSelectDate,
  onSelectTime,
  onBack,
  onClose,
}: {
  step: "calendar" | "times";
  service: BookingService & { slots: BookingSlot[] };
  sellerTimezone: string;
  sellerSlug: string;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  // Lock body scroll when booking sheet is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (step === "times" && selectedDate) {
    return (
      <TimeSlotSheet
        open={true}
        onClose={() => { onBack(); }}
        selectedDate={selectedDate}
        slots={service.slots}
        duration={service.duration}
        location={service.location}
        sellerTimezone={sellerTimezone}
        sellerSlug={sellerSlug}
        serviceId={service.id}
        onSelectTime={onSelectTime}
      />
    );
  }

  // FL4: Calendar step with smooth entry animation
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain sm:items-center animate-[fadeIn_0.15s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label="Choisir une date"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="fixed inset-0 bg-black/50 animate-[fadeIn_0.2s_ease-out]" onClick={onClose} aria-hidden="true" />
      <div
        className="relative z-10 mt-auto w-full sm:mt-0 sm:max-w-md animate-[slideUp_0.2s_ease-out] rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col"
        style={{ backgroundColor: "var(--theme-modal-bg, #FFFFFF)", touchAction: "pan-y" }}
      >
        {/* Mobile handle */}
        <div className="flex justify-center py-2 sm:hidden">
          <div className="h-1 w-10 rounded-full" style={{ backgroundColor: "var(--theme-modal-text-muted, #D1D5DB)" }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 pb-3 pt-2 sm:px-6 sm:pt-4"
          style={{ borderBottom: "1px solid var(--theme-modal-border, #F3F4F6)" }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--theme-modal-text, #111827)" }}>
              Choisis une date
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}>
              {service.title} · {service.duration} min
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-opacity hover:opacity-70"
            style={{ color: "var(--theme-modal-text-muted, #9CA3AF)" }}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Calendar content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.25rem))] sm:px-6 sm:pb-8" style={{ WebkitOverflowScrolling: "touch" }}>
          <BookingCalendar
            slots={service.slots}
            sellerTimezone={sellerTimezone}
            onSelectDate={onSelectDate}
            selectedDate={selectedDate}
          />
          <p
            className="mt-3 text-center text-[10px]"
            style={{ color: "var(--theme-modal-text-muted, #9CA3AF)" }}
          >
            Sélectionne une date pour voir les créneaux disponibles
          </p>
        </div>
      </div>
    </div>
  );
}
