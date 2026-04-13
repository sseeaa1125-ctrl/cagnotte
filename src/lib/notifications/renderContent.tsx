import * as React from "react";
import { formatPrice } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-01 — per-type JSX renderer for Notification.data.
//
// The backend stores plain-text title + body in templates.ts. The Banani
// design (screen 20) uses rich JSX spans (bold navy names + amounts,
// percentage highlights). Rather than touching templates.ts (which is
// emitted by the notification dispatchers), we read `Notification.data`
// (the typed payload passed to createNotification) and build the JSX here.
//
// This is a PURE function — no hooks, no state. Safe for server or client.
// Handles missing fields defensively via nullish coalescing.
// ─────────────────────────────────────────────────────────────────────────

export interface NotificationData {
  type: string;
  data: Record<string, unknown> | null;
}

function Bold({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-primary">{children}</span>;
}

function asString(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function renderNotificationContent(
  n: NotificationData,
): React.ReactNode {
  const d = n.data ?? {};
  const type = (n.type || "").toUpperCase();

  switch (type) {
    case "DONATION_RECEIVED": {
      const donor = asString(d.donorDisplayName, "Un donateur");
      const title = asString(d.cagnotteTitle, "votre cagnotte");
      const amount = asNumber(d.amount);
      return (
        <>
          <Bold>{donor}</Bold> a participé à votre cagnotte{" "}
          <Bold>{title}</Bold> pour un montant de{" "}
          <Bold>{formatPrice(amount)}</Bold>.
        </>
      );
    }

    case "DONATION_MESSAGE": {
      const donor = asString(d.donorDisplayName, "Un donateur");
      const title = asString(d.cagnotteTitle, "votre cagnotte");
      return (
        <>
          <Bold>{donor}</Bold> a laissé un message sur la cagnotte{" "}
          <Bold>{title}</Bold>.
        </>
      );
    }

    case "MILESTONE_REACHED": {
      const percent = asNumber(d.percent, 50);
      const title = asString(d.cagnotteTitle, "votre cagnotte");
      return (
        <>
          Félicitations ! Vous avez atteint <Bold>{percent}%</Bold> de votre
          objectif sur la cagnotte <Bold>{title}</Bold>.
        </>
      );
    }

    case "CAGNOTTE_ENDING_SOON": {
      const days = asNumber(d.daysLeft, 3);
      const title = asString(d.cagnotteTitle, "votre cagnotte");
      return (
        <>
          Votre cagnotte <Bold>{title}</Bold> se termine dans{" "}
          <Bold>{days} jours</Bold>. {"N'"}oubliez pas de la relancer !
        </>
      );
    }

    case "CAGNOTTE_ENDED": {
      const title = asString(d.cagnotteTitle, "votre cagnotte");
      const total = asNumber(d.totalCollected);
      return (
        <>
          Votre cagnotte <Bold>{title}</Bold> est terminée. Total collecté :{" "}
          <Bold>{formatPrice(total)}</Bold>.
        </>
      );
    }

    case "PAYOUT_COMPLETED": {
      const amount = asNumber(d.amount);
      const provider = asString(d.payoutProvider, "bancaire");
      return (
        <>
          Le virement de <Bold>{formatPrice(amount)}</Bold> vers votre compte{" "}
          <Bold>{provider}</Bold> a été effectué avec succès.
        </>
      );
    }

    case "PAYOUT_FAILED": {
      const amount = asNumber(d.amount);
      return (
        <>
          Le virement de <Bold>{formatPrice(amount)}</Bold> a échoué. Veuillez
          vérifier vos coordonnées bancaires.
        </>
      );
    }

    case "KYC_APPROVED":
      return (
        <>
          Votre identité a été vérifiée. Vous pouvez maintenant retirer vos
          fonds.
        </>
      );

    case "KYC_REJECTED": {
      const reason = asString(d.reason, "non précisé");
      return (
        <>
          Votre vérification {"d'"}identité a été refusée. Motif :{" "}
          <Bold>{reason}</Bold>.
        </>
      );
    }

    case "SYSTEM":
    default: {
      const msg = asString(d.message);
      return <>{msg}</>;
    }
  }
}
