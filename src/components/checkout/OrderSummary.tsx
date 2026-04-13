import * as React from "react";
import { Badge } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { SUBTYPE_LABELS, COMMISSION_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface OrderSummaryProps {
  amount: number;
  subtype: "festive" | "solidaire";
  /** Basis points: 600 for solidaire (6%), 800 for festive (8%) */
  commissionBp: number;
  /** Pre-computed by parent: Math.floor(amount * bp / 10000) */
  commissionAmount: number;
  /** Pre-computed by parent: amount - commissionAmount */
  netAmount: number;
  className?: string;
}

export function OrderSummary({
  amount,
  subtype,
  commissionBp,
  commissionAmount,
  netAmount,
  className,
}: OrderSummaryProps) {
  const percentLabel = `${(commissionBp / 100).toFixed(0)}%`;

  return (
    <aside
      className={cn(
        "sticky top-4 space-y-4 rounded-xl border border-border bg-background p-6",
        className,
      )}
      aria-label="Récapitulatif de la contribution"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-headings text-lg font-semibold text-primary">
          Récapitulatif
        </h3>
        <Badge variant={subtype}>{SUBTYPE_LABELS[subtype]}</Badge>
      </div>

      {/* Rows */}
      <dl className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-sm text-muted-foreground">Votre contribution</dt>
          <dd className="text-base font-semibold text-primary">
            {formatPrice(amount)}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-sm text-muted-foreground">
            Commission plateforme
          </dt>
          <dd className="text-sm text-primary">
            {formatPrice(commissionAmount)}
            <span className="ml-1 text-muted-foreground">({percentLabel})</span>
          </dd>
        </div>

        <hr className="border-border" />

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-sm font-medium text-primary">
            {"Total perçu par l'organisateur"}
          </dt>
          <dd className="font-headings text-xl font-bold text-primary">
            {formatPrice(netAmount)}
          </dd>
        </div>
      </dl>

      {/* Footer transparency note */}
      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
        {COMMISSION_LABELS.transparencyNote}
      </p>
    </aside>
  );
}
