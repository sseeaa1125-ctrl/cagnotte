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
// Data field names MUST match what the backend dispatchers pass in
// `lib/notifications/dispatch.ts`. See each case for the exact contract.
// ─────────────────────────────────────────────────────────────────────────

export interface NotificationData {
  type: string;
  title?: string;
  body?: string;
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
    // dispatch.ts data: { donorDisplayName, wasAnonymous, amount, cagnotteTitle }
    case "DONATION_RECEIVED": {
      const donor = asString(
        d.donorDisplayName,
        d.wasAnonymous ? "Un participant anonyme" : "Un donateur",
      );
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

    // dispatch.ts data: { donorDisplayName, wasAnonymous, isPrivate, cagnotteTitle }
    case "DONATION_MESSAGE": {
      const donor = asString(
        d.donorDisplayName,
        d.wasAnonymous ? "Un participant anonyme" : "Un donateur",
      );
      const title = asString(d.cagnotteTitle, "votre cagnotte");
      return (
        <>
          <Bold>{donor}</Bold> a laissé un message sur la cagnotte{" "}
          <Bold>{title}</Bold>.
        </>
      );
    }

    // dispatch.ts data: { threshold (50|100), goalAmount, cagnotteTitle }
    case "MILESTONE_REACHED": {
      const percent = asNumber(d.threshold, 50);
      const title = asString(d.cagnotteTitle, "votre cagnotte");
      return (
        <>
          Félicitations ! Vous avez atteint <Bold>{percent}%</Bold> de votre
          objectif sur la cagnotte <Bold>{title}</Bold>.
        </>
      );
    }

    // dispatch.ts data: { endDate, cagnotteTitle }
    case "CAGNOTTE_ENDING_SOON": {
      const title = asString(d.cagnotteTitle, "votre cagnotte");
      return (
        <>
          Votre cagnotte <Bold>{title}</Bold> se termine dans{" "}
          <Bold>3 jours</Bold>. {"N'"}oubliez pas de la relancer !
        </>
      );
    }

    // dispatch.ts data: { totalRaised, donorCount, cagnotteTitle }
    case "CAGNOTTE_ENDED": {
      const title = asString(d.cagnotteTitle, "votre cagnotte");
      const total = asNumber(d.totalRaised);
      return (
        <>
          Votre cagnotte <Bold>{title}</Bold> est terminée. Total collecté :{" "}
          <Bold>{formatPrice(total)}</Bold>.
        </>
      );
    }

    // dispatch.ts data: { amount, provider }
    case "PAYOUT_COMPLETED": {
      const amount = asNumber(d.amount);
      const provider = asString(d.provider, "Mobile Money");
      return (
        <>
          Le virement de <Bold>{formatPrice(amount)}</Bold> vers votre compte{" "}
          <Bold>{provider}</Bold> a été effectué avec succès.
        </>
      );
    }

    // dispatch.ts data: { amount, reason, attempt } OR { amount, reason, cancelledByAdmin }
    case "PAYOUT_FAILED": {
      const amount = asNumber(d.amount);
      const reason = asString(d.reason);

      // Admin cancellation — different from a real payment failure
      if (d.cancelledByAdmin) {
        return (
          <>
            {"L'"}équipe cagnotte.sn a annulé votre demande de retrait de{" "}
            <Bold>{formatPrice(amount)}</Bold>.
            {reason ? (
              <>
                {" "}Motif : <Bold>{reason}</Bold>.
              </>
            ) : null}{" "}
            Votre solde a été rétabli.
          </>
        );
      }

      return (
        <>
          Le virement de <Bold>{formatPrice(amount)}</Bold> a échoué.
          {reason ? (
            <>
              {" "}Motif : <Bold>{reason}</Bold>.
            </>
          ) : null}{" "}
          Veuillez vérifier vos coordonnées et réessayer.
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

    // Admin notifications (broadcast/targeted) — render body from notification
    case "SYSTEM":
    default: {
      // Admin notifications store the message in notification.body, not data.message
      const body = n.body || asString(d.message);
      if (body) return <>{body}</>;
      // Last resort: show title
      return <>{n.title || ""}</>;
    }
  }
}
