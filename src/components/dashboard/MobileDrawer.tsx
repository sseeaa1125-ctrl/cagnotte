"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  X,
  ShoppingBag,
  CalendarCheck,
  Users,
  Settings,
  ExternalLink,
  LogOut,
  BarChart3,
  Inbox,
  Home,
  LayoutGrid,
  DollarSign,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import { Avatar } from "@/components/ui";
import { useNotifications } from "@/contexts/NotificationContext";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  sellerName: string;
  sellerSlug: string;
  sellerAvatar?: string | null;
  onLogout: () => void;
}

const DRAWER_ITEMS: { href: string; label: string; icon: React.ElementType; badgeKey?: "inbox" | "orders" | "bookings" }[] = [
  { href: "/dashboard/blocks", label: "Mon izyStore", icon: LayoutGrid },
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/dashboard/orders", label: "Commandes", icon: ShoppingBag, badgeKey: "orders" },
  { href: "/dashboard/bookings", label: "Réservations", icon: CalendarCheck, badgeKey: "bookings" },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox, badgeKey: "inbox" },
  { href: "/dashboard/revenue", label: "Revenus", icon: DollarSign },
  { href: "/dashboard/statistics", label: "Statistiques", icon: BarChart3 },
  { href: "/dashboard/audience", label: "Audience", icon: Users },
  { href: "/dashboard/communities", label: "Communautés", icon: MessageSquare },
  { href: "/dashboard/settings", label: "Réglages", icon: Settings },
];

export function MobileDrawer({
  open,
  onClose,
  sellerName,
  sellerSlug,
  sellerAvatar,
  onLogout,
}: MobileDrawerProps) {
  const pathname = usePathname();
  const { counts } = useNotifications();

  // Close drawer on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent body scroll when open — position:fixed technique for iOS Safari
  const scrollYRef = useRef(0);
  useEffect(() => {
    if (open) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollYRef.current);
    }
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollYRef.current);
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[80vw] max-w-72 flex-col bg-white shadow-xl transition-transform duration-300 ease-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 px-4">
          <span className="text-lg font-extrabold text-teal-600">izy</span>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Seller info */}
        <div className="shrink-0 border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar src={sellerAvatar} alt={sellerName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">
                {sellerName}
              </p>
              <p className="truncate text-xs text-gray-500">@{sellerSlug}</p>
            </div>
          </div>
        </div>

        {/* Navigation links — scrollable */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {DRAWER_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon size={20} />
                <span className="flex-1">{item.label}</span>
                {item.badgeKey && counts[item.badgeKey] > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {counts[item.badgeKey] > 99 ? "99+" : counts[item.badgeKey]}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Voir mon store — pinned above bottom */}
        <div className="shrink-0 px-3 pb-2">
          <a
            href={`/${sellerSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl bg-teal-50 px-3 py-2.5 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100"
          >
            <ExternalLink size={20} />
            Voir mon store
          </a>
        </div>

        {/* Actions */}
        <div className="shrink-0 border-t border-gray-100 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Tutorial button */}
          <button
            onClick={() => {
              onClose();
              window.startIzyTour?.();
            }}
            className="mb-2 flex w-full items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            <HelpCircle size={20} />
            Tutoriel
          </button>

          {/* Logout button */}
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
