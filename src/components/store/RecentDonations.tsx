"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Donation {
  id: string;
  amount: number;
  name: string;
  message: string | null;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `Il y a ${weeks} sem.`;

  const months = Math.floor(days / 30);
  return `Il y a ${months} mois`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  // Handle single-part names or empty parts
  const firstPart = parts[0] || '';
  return firstPart.slice(0, 2).toUpperCase();
}

export function RecentDonations({ blockId }: { blockId: string }) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/blocks/${blockId}/donations`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setDonations(data.donations || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [blockId]);

  if (!loaded) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl p-3" style={{ backgroundColor: "var(--theme-card-bg, #FFFFFF)" }}>
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 rounded bg-gray-200" />
              <div className="h-2.5 w-16 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (donations.length === 0) return null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-bold" style={{ color: "var(--theme-text, #111827)" }}>
          Dernières participations
        </h2>
        <div className="h-px flex-1" style={{ backgroundColor: "var(--theme-card-border, #E5E7EB)" }} />
      </div>

      <div className="space-y-2">
        {donations.map((donation) => (
          <div
            key={donation.id}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors"
            style={{
              backgroundColor: "var(--theme-card-bg, #FFFFFF)",
              border: "1px solid var(--theme-card-border, #E5E7EB)",
            }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{
                backgroundColor: "color-mix(in srgb, var(--theme-primary, #DC2626) 12%, transparent)",
                color: "var(--theme-primary, #DC2626)",
              }}
            >
              {getInitials(donation.name)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold" style={{ color: "var(--theme-text, #111827)" }}>
                  {donation.name}
                </p>
                <span className="shrink-0 text-sm font-bold" style={{ color: "var(--theme-primary, #DC2626)" }}>
                  {formatPrice(donation.amount)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {donation.message && (
                  <p className="truncate text-xs" style={{ color: "var(--theme-text-muted, #6B7280)" }}>
                    &ldquo;{donation.message}&rdquo;
                  </p>
                )}
                <span className="shrink-0 text-[11px]" style={{ color: "var(--theme-text-muted, #9CA3AF)" }}>
                  {timeAgo(donation.createdAt)}
                </span>
              </div>
            </div>

            <Heart size={14} className="shrink-0 opacity-30" style={{ color: "var(--theme-primary, #DC2626)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
