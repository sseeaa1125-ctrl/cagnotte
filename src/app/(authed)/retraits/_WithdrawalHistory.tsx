"use client";

import * as React from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowDownRight,
  ChevronDown,
  Smartphone,
  User,
  Hash,
  Calendar,
  Info,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Withdrawal {
  id: string;
  amount: number;
  currency: string;
  status: string;
  phone: string;
  provider: string;
  recipientName: string | null;
  reference: string;
  merchantFee: number | null;
  failureReason: string | null;
  processedAt: string | null;
  createdAt: string;
}

interface WithdrawalsResponse {
  withdrawals: Withdrawal[];
  nextCursor: string | null;
  hasMore: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; className: string; bgClassName: string; description: string }
> = {
  PENDING: {
    label: "En attente",
    icon: Clock,
    className: "text-amber-600",
    bgClassName: "bg-amber-50",
    description: "Ta demande sera traitee sous 48h.",
  },
  PROCESSING: {
    label: "En cours",
    icon: Loader2,
    className: "text-blue-600",
    bgClassName: "bg-blue-50",
    description: "Le virement est en cours de traitement.",
  },
  COMPLETED: {
    label: "Effectue",
    icon: CheckCircle2,
    className: "text-green-600",
    bgClassName: "bg-green-50",
    description: "Le montant a ete envoye sur ton compte.",
  },
  REJECTED: {
    label: "Echoue",
    icon: XCircle,
    className: "text-red-600",
    bgClassName: "bg-red-50",
    description: "Le retrait n'a pas pu etre effectue.",
  },
};

function providerLabel(p: string): string {
  if (p === "wave_money") return "Wave Senegal";
  if (p === "orange_money") return "Orange Money";
  return p;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-SN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-SN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-SN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WithdrawalHistory() {
  const [withdrawals, setWithdrawals] = React.useState<Withdrawal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const fetchWithdrawals = React.useCallback(
    async (cursorParam?: string) => {
      const isLoadMore = !!cursorParam;
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ limit: "15" });
        if (cursorParam) params.set("cursor", cursorParam);

        const res = await api<WithdrawalsResponse>(
          `/api/withdrawals?${params.toString()}`,
        );

        if (isLoadMore) {
          setWithdrawals((prev) => [...prev, ...res.withdrawals]);
        } else {
          setWithdrawals(res.withdrawals);
        }
        setCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
          >
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-48 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-5 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={() => fetchWithdrawals()}
          className="mt-3 text-sm font-semibold text-primary hover:underline"
        >
          Reessayer
        </button>
      </div>
    );
  }

  // ── Empty state ──
  if (withdrawals.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <ArrowDownRight size={24} className="text-gray-400" />
        </div>
        <h3 className="mb-1 font-headings text-lg font-bold text-primary">
          Aucun retrait
        </h3>
        <p className="text-sm text-muted-foreground">
          Tes retraits apparaitront ici une fois que tu en auras effectue un.
        </p>
      </div>
    );
  }

  // ── Withdrawal list ──
  return (
    <div className="space-y-3">
      {withdrawals.map((w) => {
        const config = STATUS_CONFIG[w.status] ?? STATUS_CONFIG.PENDING;
        const Icon = config.icon;
        const isExpanded = expandedId === w.id;

        return (
          <div
            key={w.id}
            className={cn(
              "overflow-hidden rounded-2xl bg-white shadow-sm transition-all",
              isExpanded && "ring-1 ring-primary/20",
            )}
          >
            {/* Clickable header */}
            <button
              type="button"
              onClick={() => toggleExpand(w.id)}
              className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-gray-50"
            >
              {/* Status icon */}
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  config.bgClassName,
                )}
              >
                <Icon
                  size={20}
                  className={cn(
                    config.className,
                    w.status === "PROCESSING" && "animate-spin",
                  )}
                />
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-primary">
                    {formatPrice(w.amount)}
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      config.bgClassName,
                      config.className,
                    )}
                  >
                    {config.label}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {providerLabel(w.provider)} — {w.phone}
                </p>
              </div>

              {/* Date + chevron */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p className="text-xs font-medium text-primary">
                    {formatDate(w.createdAt)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatTime(w.createdAt)}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={cn(
                    "text-muted-foreground transition-transform duration-200",
                    isExpanded && "rotate-180",
                  )}
                />
              </div>
            </button>

            {/* Expandable details */}
            <div
              className={cn(
                "grid transition-all duration-200 ease-in-out",
                isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                  {/* Status description */}
                  <div className={cn(
                    "mb-4 flex items-start gap-2 rounded-xl p-3",
                    config.bgClassName,
                  )}>
                    <Info size={14} className={cn("mt-0.5 shrink-0", config.className)} />
                    <p className={cn("text-xs font-medium", config.className)}>
                      {w.failureReason || config.description}
                    </p>
                  </div>

                  {/* Detail rows */}
                  <div className="space-y-3">
                    <DetailRow
                      icon={<Smartphone size={14} />}
                      label="Operateur"
                      value={providerLabel(w.provider)}
                    />
                    <DetailRow
                      icon={<Smartphone size={14} />}
                      label="Telephone"
                      value={w.phone}
                    />
                    {w.recipientName ? (
                      <DetailRow
                        icon={<User size={14} />}
                        label="Destinataire"
                        value={w.recipientName}
                      />
                    ) : null}
                    <DetailRow
                      icon={<Hash size={14} />}
                      label="Reference"
                      value={w.reference}
                      mono
                    />
                    <DetailRow
                      icon={<Calendar size={14} />}
                      label="Demande le"
                      value={formatFullDate(w.createdAt)}
                    />
                    {w.processedAt ? (
                      <DetailRow
                        icon={<Calendar size={14} />}
                        label="Traite le"
                        value={formatFullDate(w.processedAt)}
                      />
                    ) : null}
                    {w.merchantFee ? (
                      <DetailRow
                        icon={<Info size={14} />}
                        label="Frais"
                        value={formatPrice(w.merchantFee)}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Load more */}
      {hasMore ? (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => cursor && fetchWithdrawals(cursor)}
            disabled={loadingMore}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingMore ? "Chargement..." : "Voir plus"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── Detail row component ──
function DetailRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span
        className={cn(
          "text-xs font-semibold text-primary text-right",
          mono && "font-mono text-[11px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}
