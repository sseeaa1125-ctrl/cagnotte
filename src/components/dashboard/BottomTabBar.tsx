"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, LayoutGrid, ShoppingBag, DollarSign, Inbox } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";

const TAB_ITEMS: { href: string; label: string; icon: React.ElementType; badgeKey?: "inbox" | "orders" }[] = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/dashboard/blocks", label: "Store", icon: LayoutGrid },
  { href: "/dashboard/orders", label: "Ventes", icon: ShoppingBag, badgeKey: "orders" },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox, badgeKey: "inbox" },
  { href: "/dashboard/revenue", label: "Revenus", icon: DollarSign },
];

const HIDDEN_ON = ["/edit", "/dashboard/communities/new"];

export function BottomTabBar() {
  const pathname = usePathname();
  const { counts } = useNotifications();

  // Hide on /dashboard/blocks sub-pages (edit, new, profile) but show on /dashboard/blocks itself
  const isBlocksSubpage = pathname.startsWith("/dashboard/blocks/");
  const hidden = isBlocksSubpage || HIDDEN_ON.some((p) => pathname.includes(p));
  if (hidden) return null;

  return (
    <nav className="shrink-0 z-40 border-t border-gray-200 bg-white lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-center justify-around px-2">
        {TAB_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 min-w-[48px] min-h-[48px] justify-center",
                isActive ? "text-teal-600" : "text-gray-400"
              )}
            >
              <div className="relative">
                <item.icon size={20} />
                {item.badgeKey && counts[item.badgeKey] > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                    {counts[item.badgeKey] > 99 ? "99+" : counts[item.badgeKey]}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
