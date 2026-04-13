"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { NAV_LABELS, MISC } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface PublicNavbarProps {
  className?: string;
}

const NAV_ITEMS: Array<{ label: string; href: string }> = [
  { label: NAV_LABELS.accueil, href: "/" },
  { label: NAV_LABELS.cagnottes, href: "/cagnottes" },
  { label: NAV_LABELS.comment, href: "/comment" },
  { label: NAV_LABELS.apropos, href: "/a-propos" },
];

export function PublicNavbar({ className }: PublicNavbarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-background",
        className,
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link
          href="/"
          className="font-headings text-xl font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
        >
          {MISC.siteName}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right CTAs (desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          <Button as="a" href="/connexion" variant="ghost">
            {NAV_LABELS.connexion}
          </Button>
          <Button as="a" href="/inscription" variant="primary">
            {NAV_LABELS.inscription}
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-md text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile nav modal */}
      <Modal
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title={MISC.siteName}
        size="sm"
      >
        <nav className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex min-h-12 items-center rounded-lg px-4 text-base font-medium text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {item.label}
            </a>
          ))}
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            <Button as="a" href="/connexion" variant="ghost" fullWidth>
              {NAV_LABELS.connexion}
            </Button>
            <Button as="a" href="/inscription" variant="primary" fullWidth>
              {NAV_LABELS.inscription}
            </Button>
          </div>
        </nav>
      </Modal>
    </header>
  );
}
