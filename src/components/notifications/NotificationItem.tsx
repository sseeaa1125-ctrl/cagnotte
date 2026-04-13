import * as React from "react";
import {
  Gift,
  MessageCircle,
  Target,
  Clock,
  Calendar,
  Wallet,
  AlertCircle,
  ShieldCheck,
  ShieldX,
  Info,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { NOTIF_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type NotificationType =
  | "DONATION_RECEIVED"
  | "DONATION_MESSAGE"
  | "MILESTONE_REACHED"
  | "CAGNOTTE_ENDING_SOON"
  | "CAGNOTTE_ENDED"
  | "PAYOUT_COMPLETED"
  | "PAYOUT_FAILED"
  | "KYC_APPROVED"
  | "KYC_REJECTED"
  | "SYSTEM";

export interface NotificationItemProps {
  notification: {
    id: string;
    type: NotificationType;
    title?: string;
    subtitle?: string;
    createdAt: string;
    isRead: boolean;
  };
  onClick?: () => void;
  className?: string;
}

const ICON_MAP: Record<
  NotificationType,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  DONATION_RECEIVED: Gift,
  DONATION_MESSAGE: MessageCircle,
  MILESTONE_REACHED: Target,
  CAGNOTTE_ENDING_SOON: Clock,
  CAGNOTTE_ENDED: Calendar,
  PAYOUT_COMPLETED: Wallet,
  PAYOUT_FAILED: AlertCircle,
  KYC_APPROVED: ShieldCheck,
  KYC_REJECTED: ShieldX,
  SYSTEM: Info,
};

export function NotificationItem({
  notification,
  onClick,
  className,
}: NotificationItemProps) {
  const Icon = ICON_MAP[notification.type] ?? Info;
  const effectiveTitle =
    notification.title || NOTIF_LABELS[notification.type] || NOTIF_LABELS.SYSTEM;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg p-4 text-left transition-colors",
        "min-h-12 hover:bg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        !notification.isRead && "bg-pink/30",
        className,
      )}
      aria-label={effectiveTitle}
    >
      {/* Icon bubble */}
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-pink text-primary"
        aria-hidden
      >
        <Icon size={18} />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-semibold text-primary">
          {effectiveTitle}
        </p>
        {notification.subtitle ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {notification.subtitle}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.isRead ? (
        <span
          className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary"
          aria-label="Non lu"
        />
      ) : null}
    </button>
  );
}
