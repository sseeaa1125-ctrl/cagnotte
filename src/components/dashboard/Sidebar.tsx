"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import gsap from "gsap";
import {
  Home,
  LayoutGrid,
  DollarSign,
  Users,
  Settings,
  LogOut,
  ExternalLink,
  ShoppingBag,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  MessageSquare,
  Crown,
  ChevronUp,
  Inbox,
  CalendarCheck,
  HelpCircle,
} from "lucide-react";
import { Avatar } from "@/components/ui";
import { useNotifications } from "@/contexts/NotificationContext";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";

interface SidebarProps {
  sellerName: string;
  sellerSlug: string;
  sellerAvatar?: string | null;
  sellerEmail?: string;
  sellerPlan?: string;
  onLogout: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badgeKey?: "inbox" | "orders" | "bookings";
}

const MAIN_ITEMS: NavItem[] = [
  { href: "/dashboard/blocks", label: "Mon izyStore", icon: LayoutGrid },
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/dashboard/orders", label: "Ventes", icon: ShoppingBag, badgeKey: "orders" },
  { href: "/dashboard/bookings", label: "Réservations", icon: CalendarCheck, badgeKey: "bookings" },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox, badgeKey: "inbox" },
  { href: "/dashboard/revenue", label: "Revenus", icon: DollarSign },
];

const TOOLS_ITEMS: NavItem[] = [
  { href: "/dashboard/statistics", label: "Statistiques", icon: BarChart3 },
  { href: "/dashboard/audience", label: "Audience", icon: Users },
  { href: "/dashboard/communities", label: "Communautés", icon: MessageSquare },
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: "/dashboard/settings", label: "Réglages", icon: Settings },
];

const STORAGE_KEY = "izy-sidebar-collapsed";

function AnimatedLogo() {
  const logoRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (logoRef.current) {
        gsap.fromTo(
          logoRef.current,
          { rotation: -12, y: 20, opacity: 0, scale: 0.9 },
          {
            rotation: 0,
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 1.2,
            ease: "back.out(1.5)",
            delay: 0.1,
            clearProps: "all",
          }
        );
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <Link href="/dashboard" ref={logoRef} className="block shrink-0 origin-left">
      <Image 
        src="/logo/1x/Logo Izy.store.png" 
        alt="Izy.store" 
        width={100} 
        height={30} 
        className="w-[85px] h-auto object-contain"
        priority
      />
    </Link>
  );
}

export function Sidebar({ sellerName, sellerSlug, sellerAvatar, sellerEmail, sellerPlan, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const { counts } = useNotifications();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) === "true";
    }
    return false;
  });

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new Event("sidebar-toggle"));
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 border-r border-gray-200 bg-white transition-all duration-300 ease-in-out",
        collapsed ? "lg:w-[68px]" : "lg:w-60"
      )}
    >
      {/* Logo + collapse toggle */}
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && <AnimatedLogo />}
        <button
          onClick={toggleCollapsed}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600",
            collapsed && "mx-auto"
          )}
          aria-label={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>

      {/* Navigation + Onboarding — scrollable ensemble */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-2 py-4 min-h-0">
        {/* Principal */}
        <div className="space-y-1">
          {MAIN_ITEMS.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} badge={item.badgeKey ? counts[item.badgeKey] : 0} />
          ))}
        </div>

        {/* Séparateur + Outils */}
        <div className="my-3 border-t border-gray-100" />
        {!collapsed && (
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Outils
          </p>
        )}
        <div className="space-y-1">
          {TOOLS_ITEMS.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} badge={0} />
          ))}
        </div>

        {/* Séparateur + Réglages */}
        <div className="my-3 border-t border-gray-100" />
        <div className="space-y-1">
          {BOTTOM_ITEMS.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} badge={0} />
          ))}
        </div>

        {/* Onboarding checklist — à l'intérieur du scroll */}
        <div className="mt-3">
          <OnboardingChecklist collapsed={collapsed} />
        </div>
      </nav>

      {/* Seller profile popover */}
      <SidebarProfile
        sellerName={sellerName}
        sellerSlug={sellerSlug}
        sellerAvatar={sellerAvatar}
        sellerEmail={sellerEmail}
        sellerPlan={sellerPlan}
        collapsed={collapsed}
        onLogout={onLogout}
      />
    </aside>
  );
}

function SidebarProfile({
  sellerName,
  sellerSlug,
  sellerAvatar,
  sellerEmail,
  sellerPlan,
  collapsed,
  onLogout,
}: {
  sellerName: string;
  sellerSlug: string;
  sellerAvatar?: string | null;
  sellerEmail?: string;
  sellerPlan?: string;
  collapsed: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const isPro = sellerPlan === "PRO";

  return (
    <div className="relative border-t border-gray-200" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center p-3 transition-colors hover:bg-gray-50",
          collapsed ? "justify-center" : "gap-3"
        )}
      >
        <div className="relative shrink-0">
          <Avatar src={sellerAvatar} alt={sellerName} size="sm" />
          {isPro && !collapsed && (
            <div className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400">
              <Crown size={8} className="text-white" />
            </div>
          )}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {sellerName}
                </p>
                {isPro && (
                  <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold text-amber-700">
                    PRO
                  </span>
                )}
              </div>
              <p className="truncate text-[11px] text-gray-400">@{sellerSlug}</p>
            </div>
            <ChevronUp
              size={14}
              className={cn(
                "shrink-0 text-gray-400 transition-transform",
                open ? "rotate-180" : ""
              )}
            />
          </>
        )}
      </button>

      {/* Popover menu */}
      {open && (
        <div
          className={cn(
            "absolute z-50 rounded-xl border border-gray-200 bg-white shadow-lg",
            collapsed
              ? "bottom-2 left-[72px] w-56"
              : "bottom-full left-2 right-2 mb-1"
          )}
        >
          {/* Profile header */}
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar src={sellerAvatar} alt={sellerName} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">{sellerName}</p>
                {sellerEmail && (
                  <p className="truncate text-[11px] text-gray-400">{sellerEmail}</p>
                )}
                <div className="mt-1 flex items-center gap-1.5">
                  {isPro ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      <Crown size={9} />
                      Plan Pro
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      Plan Gratuit
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Settings size={15} className="text-gray-400" />
              Réglages
            </Link>
            <a
              href={`/${sellerSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ExternalLink size={15} className="text-gray-400" />
              Voir mon store
            </a>
            <button
              onClick={() => {
                setOpen(false);
                window.startIzyTour?.();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <HelpCircle size={15} className="text-gray-400" />
              Guide interactif
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={15} />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarLink({
  item,
  pathname,
  collapsed,
  badge = 0,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  badge?: number;
}) {
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  const getTourId = (href: string) => {
    if (href === "/dashboard/blocks") return "tour-sidebar-blocks";
    if (href === "/dashboard/inbox") return "tour-sidebar-inbox";
    if (href === "/dashboard/analytics") return "tour-sidebar-analytics";
    if (href === "/dashboard/settings") return "tour-sidebar-settings";
    return undefined;
  };

  return (
    <Link
      id={getTourId(item.href)}
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center rounded-xl transition-colors",
        collapsed
          ? "justify-center px-2 py-2.5"
          : "gap-3 px-3 py-2.5 text-sm font-medium",
        isActive
          ? "bg-teal-50 text-teal-700"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <div className="relative">
        <item.icon size={20} />
        {badge > 0 && collapsed && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {badge > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
