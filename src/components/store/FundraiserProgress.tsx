"use client";

import { useState, useEffect } from "react";
import { Users, Clock } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface FundraiserData {
  goalAmount: number;
  collected: number;
  donorCount: number;
  percentage: number;
  endDate: string | null;
  showDonorCount: boolean;
}

function getDaysRemaining(endDate: string): number {
  // Parse the date as UTC midnight to match backend logic (end of day)
  const end = new Date(endDate + 'T23:59:59.999Z');
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

export function FundraiserProgress({ blockId }: { blockId: string }) {
  const [data, setData] = useState<FundraiserData | null>(null);

  useEffect(() => {
    fetch(`/api/blocks/${blockId}/progress`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {});
  }, [blockId]);

  if (!data) {
    return (
      <div className="animate-pulse rounded-xl p-3" style={{ backgroundColor: "var(--theme-input-bg, #FEF2F2)" }}>
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="mt-2 h-3 w-full rounded-full bg-gray-200" />
        <div className="mt-2 h-3 w-1/3 rounded bg-gray-200" />
      </div>
    );
  }

  const daysLeft = data.endDate ? getDaysRemaining(data.endDate) : null;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--theme-input-bg, #FEF2F2)" }}>
      <p className="text-sm font-bold" style={{ color: "var(--theme-text, #111827)" }}>
        {formatPrice(data.collected)}{" "}
        <span
          className="text-xs font-normal"
          style={{ color: "var(--theme-text-muted, #6B7280)" }}
        >
          collectés sur {formatPrice(data.goalAmount)}
        </span>
      </p>

      <div
        className="mt-2 h-3 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--theme-card-border, #E5E7EB)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${data.percentage}%`,
            backgroundColor: "var(--theme-primary, #DC2626)",
          }}
        />
      </div>

      <div
        className="mt-2 flex items-center gap-3 text-xs"
        style={{ color: "var(--theme-text-muted, #6B7280)" }}
      >
        <span
          className="font-semibold"
          style={{ color: "var(--theme-primary, #DC2626)" }}
        >
          {data.percentage}%
        </span>
        {data.showDonorCount && data.donorCount > 0 && (
          <span className="flex items-center gap-1">
            <Users size={12} />
            {data.donorCount} participant{data.donorCount > 1 ? "s" : ""}
          </span>
        )}
        {daysLeft !== null && (
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {isExpired ? "Terminée" : `${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}`}
          </span>
        )}
      </div>
    </div>
  );
}
