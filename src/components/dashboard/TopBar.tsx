"use client";

import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { ExternalLink, Menu, ArrowLeft } from "lucide-react";

interface TopBarProps {
  sellerName: string;
  sellerSlug: string;
  sellerAvatar?: string | null;
  onMenuOpen?: () => void;
}

const BACK_BUTTON_PATHS = ["/dashboard/communities"];

export function TopBar({ sellerName, sellerSlug, sellerAvatar, onMenuOpen }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  // Show back on blocks sub-pages (not /dashboard/blocks itself) and communities pages
  const showBack = pathname.startsWith("/dashboard/blocks/") || BACK_BUTTON_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Context-aware back destination
  const isBlockSubpage = pathname.startsWith("/dashboard/blocks/") || pathname.startsWith("/dashboard/communities/");
  const backTarget = isBlockSubpage ? "/dashboard/blocks" : "/dashboard";

  return (
    <header className="shrink-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
      <div className="flex items-center gap-3">
        {showBack ? (
          <button
            onClick={() => router.push(backTarget)}
            className="flex items-center gap-1 rounded-xl px-2 py-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Retour"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-semibold">Retour</span>
          </button>
        ) : (
          <button
            onClick={onMenuOpen}
            className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Ouvrir le menu"
          >
            <Menu size={22} />
          </button>
        )}
        {!showBack && <span className="text-lg font-extrabold text-teal-600">izy</span>}
      </div>
      <div className="flex items-center gap-3">
        {!showBack && (
          <a
            href={`/${sellerSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100"
            aria-label="Voir mon store"
          >
            <ExternalLink size={14} />
            Mon store
          </a>
        )}
        <Avatar src={sellerAvatar} alt={sellerName} size="sm" />
      </div>
    </header>
  );
}
