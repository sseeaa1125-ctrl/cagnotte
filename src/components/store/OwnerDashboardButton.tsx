"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { api } from "@/lib/api";

interface OwnerDashboardButtonProps {
  sellerSlug: string;
}

export function OwnerDashboardButton({ sellerSlug }: OwnerDashboardButtonProps) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ seller: { slug: string } }>("/api/auth/me")
      .then((data) => {
        if (!cancelled && data.seller?.slug === sellerSlug) {
          setIsOwner(true);
        }
      })
      .catch(() => {
        // Not logged in or error — do nothing
      });
    return () => { cancelled = true; };
  }, [sellerSlug]);

  if (!isOwner) return null;

  return (
    <Link
      href="/dashboard/blocks"
      className="fixed top-3 right-3 z-50 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
      style={{ backgroundColor: "rgba(13, 148, 136, 0.9)", backdropFilter: "blur(8px)" }}
    >
      <LayoutDashboard size={14} />
      Dashboard
    </Link>
  );
}
