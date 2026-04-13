"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// ── Shared types ──

export interface NotifPrefs {
  emailOrders: boolean;
  emailBookings: boolean;
  emailMarketing: boolean;
  pushOrders: boolean;
  pushDonations: boolean;
  pushPayments: boolean;
  pushPartnerships: boolean;
  pushCommunities: boolean;
}

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  emailOrders: true,
  emailBookings: true,
  emailMarketing: false,
  pushOrders: true,
  pushDonations: true,
  pushPayments: true,
  pushPartnerships: true,
  pushCommunities: true,
};

export interface SellerProfile {
  id: string;
  email: string;
  slug: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  plan: string;
  notificationPrefs: NotifPrefs | null;
  payoutPhone: string | null;
  payoutProvider: string | null;
  payoutName: string | null;
  payoutCountry: string | null;
  kycStatus: string;
  supportPhone: string | null;
}

// ── Shared sub-page wrapper ──

export function SettingsSubPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/dashboard/settings"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 active:bg-gray-300"
        >
          <ChevronLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        {children}
      </div>
    </div>
  );
}
