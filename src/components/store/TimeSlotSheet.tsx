"use client";

import { useMemo, useState, useEffect } from "react";
import { X, Clock, MapPin } from "lucide-react";

interface BookingSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ExistingBooking {
  bookingDate: string;
  bookingDuration: number | null;
}

interface TimeSlotSheetProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  slots: BookingSlot[];
  duration: number;
  location?: string | null;
  sellerTimezone: string;
  sellerSlug: string;
  serviceId: string;
  onSelectTime: (time: string) => void;
}

const JOURS_FR_LONG = [
  "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi",
];
const MOIS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${JOURS_FR_LONG[d.getDay()]} ${d.getDate()} ${MOIS_FR[d.getMonth()]}`;
}

export function TimeSlotSheet({
  open,
  onClose,
  selectedDate,
  slots,
  duration,
  location,
  sellerTimezone,
  sellerSlug,
  serviceId,
  onSelectTime,
}: TimeSlotSheetProps) {
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [loading, setLoading] = useState(false);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Fetch availability when sheet opens
  useEffect(() => {
    if (!open || !selectedDate) return;
    
    let isMounted = true;
    
    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(
          `${BACKEND_URL}/api/sellers/${sellerSlug}/availability?serviceId=${serviceId}&date=${selectedDate}`
        );
        const data = res.ok ? await res.json() : { existingBookings: [] };
        if (isMounted) {
          setExistingBookings(data.existingBookings || []);
        }
      } catch {
        if (isMounted) setExistingBookings([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAvailability();

    return () => {
      isMounted = false;
    };
  }, [open, selectedDate, sellerSlug, serviceId]);

  const today = useMemo(() => new Date(), []);

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const d = new Date(selectedDate + "T12:00:00");
    const dayOfWeek = d.getDay();
    const daySlots = slots.filter((s) => s.dayOfWeek === dayOfWeek);

    const times: { time: string; booked: boolean }[] = [];
    for (const slot of daySlots) {
      const [sh, sm] = slot.startTime.split(":").map(Number);
      const [eh, em] = slot.endTime.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      for (let t = startMin; t + duration <= endMin; t += duration) {
        const h = Math.floor(t / 60);
        const m = t % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

        // Check if in the past (today)
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        if (selectedDate === todayStr) {
          const now = new Date();
          if (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())) {
            continue;
          }
        }

        // Check if booked
        const isBooked = existingBookings.some((b) => {
          if (!b.bookingDate) return false;
          try {
            const bDate = new Date(b.bookingDate);
            const fmt = new Intl.DateTimeFormat("en-US", {
              timeZone: sellerTimezone,
              hour: "numeric",
              minute: "numeric",
              hour12: false,
            });
            const parts = fmt.formatToParts(bDate);
            const bH = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
            const bM = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
            return bH === h && bM === m;
          } catch {
            return false;
          }
        });

        times.push({ time: timeStr, booked: isBooked });
      }
    }
    return times;
  }, [selectedDate, slots, existingBookings, duration, today, sellerTimezone]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Choisis un créneau"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="relative z-10 mt-auto w-full sm:mt-0 sm:max-w-md animate-[slideUp_0.2s_ease-out] rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col"
        style={{
          backgroundColor: "var(--theme-modal-bg, #FFFFFF)",
          fontFamily: "var(--theme-font-family, inherit)",
          touchAction: "pan-y",
        }}
      >
        {/* Handle mobile */}
        <div className="flex justify-center py-2 sm:hidden">
          <div
            className="h-1 w-10 rounded-full"
            style={{ backgroundColor: "var(--theme-modal-text-muted, #D1D5DB)" }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 pb-3 pt-2 sm:px-6 sm:pt-4"
          style={{ borderBottom: "1px solid var(--theme-modal-border, #F3F4F6)" }}
        >
          <div>
            <h2
              className="text-base font-bold"
              style={{ color: "var(--theme-modal-text, #111827)" }}
            >
              Choisis un créneau
            </h2>
            <p
              className="mt-0.5 text-xs"
              style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}
            >
              {formatDateLabel(selectedDate)}
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

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.25rem))] sm:px-6 sm:pb-8" style={{ WebkitOverflowScrolling: "touch" }}>
          {/* Info row */}
          <div
            className="mb-4 flex items-center gap-3 text-xs"
            style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}
          >
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {duration} min
            </span>
            {location && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {location}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl px-3 py-3"
                  style={{
                    backgroundColor: "var(--theme-input-bg, #F3F4F6)",
                    border: "1px solid var(--theme-modal-border, #E5E7EB)",
                  }}
                >
                  <div
                    className="mx-auto h-4 w-12 rounded"
                    style={{ backgroundColor: "var(--theme-modal-border, #E5E7EB)" }}
                  />
                </div>
              ))}
            </div>
          ) : timeSlots.length === 0 ? (
            <p
              className="py-8 text-center text-sm"
              style={{ color: "var(--theme-modal-text-muted, #9CA3AF)" }}
            >
              Aucun créneau disponible pour cette date
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => !slot.booked && onSelectTime(slot.time)}
                  disabled={slot.booked}
                  className={`time-slot-btn rounded-xl px-3 py-3 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 ${slot.booked ? "time-slot-booked" : ""}`}
                  style={{
                    backgroundColor: slot.booked
                      ? "var(--theme-modal-border, #F3F4F6)"
                      : "var(--theme-input-bg, #F9FAFB)",
                    color: slot.booked
                      ? "var(--theme-modal-text-muted, #D1D5DB)"
                      : "var(--theme-modal-text, #111827)",
                    border: "1px solid var(--theme-modal-border, #E5E7EB)",
                    opacity: slot.booked ? 0.5 : 1,
                    textDecoration: slot.booked ? "line-through" : "none",
                  }}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
