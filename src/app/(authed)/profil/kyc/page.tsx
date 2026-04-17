import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { KYC_LABELS } from "@/lib/constants";
import { getProfileSeller } from "@/lib/serverProfile";
import { cn } from "@/lib/utils";
import { KycForm } from "./_KycForm";

// ─────────────────────────────────────────────────────────────────────────
// /profil/kyc — layout + nav + page title come from ../layout.tsx.
// Reads the seller through the cached getProfileSeller() so this doesn't
// double-fetch /api/auth/me (the layout already pulled it via the same
// React.cache wrapper in the same request).
// ─────────────────────────────────────────────────────────────────────────

type KycVariant = "none" | "pending" | "approved" | "rejected";

function variantFromStatus(status: string | undefined): KycVariant {
  switch (status) {
    case "APPROVED":
      return "approved";
    case "PENDING":
      return "pending";
    case "REJECTED":
      return "rejected";
    default:
      return "none";
  }
}

function StatusBanner({ variant }: { variant: KycVariant }) {
  const config = {
    none: {
      icon: <ShieldQuestion size={18} aria-hidden />,
      text: KYC_LABELS.noneBanner,
      className: "bg-gray-100 text-gray-700",
    },
    pending: {
      icon: <ShieldQuestion size={18} aria-hidden />,
      text: KYC_LABELS.pendingBanner,
      className: "bg-amber-50 text-amber-700",
    },
    approved: {
      icon: <ShieldCheck size={18} aria-hidden />,
      text: KYC_LABELS.approvedBanner,
      className: "bg-accent text-success",
    },
    rejected: {
      icon: <ShieldAlert size={18} aria-hidden />,
      text: KYC_LABELS.rejectedBanner,
      className: "bg-red-50 text-red-700",
    },
  }[variant];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl p-4 text-sm font-medium",
        config.className,
      )}
      role="status"
    >
      {config.icon}
      <p>{config.text}</p>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function KycPage() {
  const seller = await getProfileSeller();
  const variant = variantFromStatus(seller.kycStatus);

  return (
    <div className="flex flex-col gap-5">
      <StatusBanner variant={variant} />

      <KycForm
        variant={variant}
        existingFullName={seller.kycFullName ?? ""}
        existingIdUrl={seller.kycIdUrl ?? null}
        existingSelfieUrl={seller.kycSelfieUrl ?? null}
        defaultFullName={seller.displayName}
      />
    </div>
  );
}
