import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import { ProfileSidebar } from "@/components/layout/ProfileSidebar";
import { KYC_LABELS, PROFILE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { KycForm } from "./_KycForm";

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 plan 06-02 — /profil/kyc (designed ourselves).
//
// Server component. Reads /api/auth/me with the D-29 widened select which
// now exposes kycFullName, kycIdUrl, kycSelfieUrl in addition to kycStatus.
// Status pill renders 4 variants (NONE / PENDING / APPROVED / REJECTED).
// APPROVED state is read-only; NONE/REJECTED show the upload form;
// PENDING shows a banner + disabled previews.
//
// Previews use the /api/files/:key proxy URLs returned by POST /api/upload —
// NEVER direct R2 URLs (grep guard in the plan).
// ─────────────────────────────────────────────────────────────────────────

interface SellerPayload {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  kycStatus?: string;
  kycFullName?: string | null;
  kycIdUrl?: string | null;
  kycSelfieUrl?: string | null;
}

async function fetchSellerMe(token: string): Promise<SellerPayload | null> {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${backendUrl}/api/auth/me`, {
      headers: { cookie: `izy-token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { seller?: SellerPayload };
    return data.seller ?? null;
  } catch {
    return null;
  }
}

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
      className: "bg-orange-50 text-orange-700",
    },
    approved: {
      icon: <ShieldCheck size={18} aria-hidden />,
      text: KYC_LABELS.approvedBanner,
      className: "bg-green-50 text-green-700",
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
        "flex items-start gap-3 rounded-xl p-4 text-sm",
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
  const cookieStore = await cookies();
  const token = cookieStore.get("izy-token")?.value;
  if (!token) redirect("/connexion?next=/profil/kyc");

  const seller = await fetchSellerMe(token);
  if (!seller) redirect("/connexion?next=/profil/kyc");

  const variant = variantFromStatus(seller.kycStatus);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="font-headings text-2xl font-bold text-primary md:text-3xl">
          {PROFILE_LABELS.h1}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {PROFILE_LABELS.subtitle}
        </p>
      </header>

      <ProfileSidebar
        activeTab="kyc"
        seller={{
          displayName: seller.displayName,
          avatarUrl: seller.avatarUrl,
          email: seller.email,
          kycStatus: seller.kycStatus ?? "NONE",
        }}
      >
        <h2 className="mb-1 font-headings text-xl font-bold text-primary">
          {KYC_LABELS.h1}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {KYC_LABELS.subtitle}
        </p>

        <div className="flex flex-col gap-6">
          <StatusBanner variant={variant} />

          <KycForm
            variant={variant}
            existingFullName={seller.kycFullName ?? ""}
            existingIdUrl={seller.kycIdUrl ?? null}
            existingSelfieUrl={seller.kycSelfieUrl ?? null}
            defaultFullName={seller.displayName}
          />
        </div>
      </ProfileSidebar>
    </div>
  );
}
