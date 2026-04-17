"use client";

import * as React from "react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  DollarSign,
  Gift,
  CreditCard,
  Clock,
} from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { ADMIN_DATE_PRESETS } from "@/lib/adminDatePresets";
import { KpiCard } from "@/components/ui";
import { formatPrice } from "@/lib/format";

// ── Types ──
interface WalletData {
  totalCollected: number;
  orderCount: number;
  platformRevenue: number;
  totalVoluntary: number;
  totalSellerAmount: number;
  totalPayouts: number;
  payoutCount: number;
  totalFees: number;
  sellerRetained: number;
  pendingPayouts: number;
  pendingPayoutCount: number;
  platformBalance: number;
}

export default function AdminWalletPage() {
  const [data, setData] = React.useState<WalletData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activePreset, setActivePreset] = React.useState<number | null>(null);

  const fetchWallet = React.useCallback(async (from?: string, to?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("dateFrom", from);
      if (to) params.set("dateTo", to);
      const qs = params.toString();
      const res = await adminApi<WalletData>(
        `/api/admin/dashboard/wallet${qs ? `?${qs}` : ""}`,
      );
      setData(res);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  function handlePreset(index: number) {
    const preset = ADMIN_DATE_PRESETS[index];
    setActivePreset(index);
    fetchWallet(preset.from(), preset.to());
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-headings text-2xl font-black text-primary">
          Wallet
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue generale des flux financiers de la plateforme
        </p>
      </div>

      {/* Date presets */}
      <div className="flex flex-wrap gap-1.5">
        {ADMIN_DATE_PRESETS.map((preset, i) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePreset(i)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activePreset === i
                ? "border-primary bg-primary text-white"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            <span className="hidden sm:inline">{preset.label}</span>
            <span className="sm:hidden">{preset.shortLabel}</span>
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Main balance card */}
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
                <Landmark size={22} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Solde plateforme
                </p>
                <p className="font-headings text-2xl font-black text-primary sm:text-3xl">
                  {formatPrice(data.platformBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Entrees / Sorties */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Entrees */}
            <div className="space-y-4 rounded-xl border border-border bg-background p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <ArrowDownLeft size={16} />
                </div>
                <h2 className="font-headings text-base font-bold text-primary">
                  Entrees
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total collecte</span>
                  <span className="font-headings text-sm font-bold text-primary">
                    {formatPrice(data.totalCollected)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Wallet size={14} />
                    Reverse aux vendeurs
                  </span>
                  <span className="font-headings text-sm font-bold text-primary">
                    {formatPrice(data.totalSellerAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Gift size={14} />
                    Dont soutien cagnotte.sn
                  </span>
                  <span className="font-headings text-sm font-bold text-pink-600">
                    {formatPrice(data.totalVoluntary)}
                  </span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">
                      Revenu plateforme
                    </span>
                    <span className="font-headings text-base font-black text-green-600">
                      {formatPrice(data.platformRevenue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sorties */}
            <div className="space-y-4 rounded-xl border border-border bg-background p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <ArrowUpRight size={16} />
                </div>
                <h2 className="font-headings text-base font-bold text-primary">
                  Sorties
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Wallet size={14} />
                    Retraits verses
                  </span>
                  <span className="font-headings text-sm font-bold text-primary">
                    {formatPrice(data.totalPayouts)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({data.payoutCount})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CreditCard size={14} />
                    Frais Bictorys
                  </span>
                  <span className="font-headings text-sm font-bold text-primary">
                    {formatPrice(data.totalFees)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock size={14} />
                    Retraits en attente
                  </span>
                  <span className="font-headings text-sm font-bold text-amber-600">
                    {formatPrice(data.pendingPayouts)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({data.pendingPayoutCount})
                    </span>
                  </span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">
                      Solde vendeurs non retire
                    </span>
                    <span className="font-headings text-base font-black text-primary">
                      {formatPrice(data.sellerRetained)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard
              icon={<DollarSign size={18} />}
              label="Commandes payees"
              value={String(data.orderCount)}
            />
            <KpiCard
              icon={<Wallet size={18} />}
              label="Retraits effectues"
              value={String(data.payoutCount)}
            />
            <KpiCard
              icon={<Gift size={18} />}
              label="Soutiens recus"
              value={formatPrice(data.totalVoluntary)}
            />
            <KpiCard
              icon={<Landmark size={18} />}
              label="Solde plateforme"
              value={formatPrice(data.platformBalance)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
