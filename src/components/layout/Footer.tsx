import * as React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { NAV_LABELS, MISC } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface FooterProps {
  className?: string;
}

const LEGAL_LINKS: Array<{ label: string; href: string }> = [
  { label: "Conditions générales", href: "/cgu" },
  { label: "Confidentialité", href: "/confidentialite" },
  { label: "Mentions légales", href: "/mentions-legales" },
];

const PRODUCT_LINKS: Array<{ label: string; href: string }> = [
  { label: NAV_LABELS.cagnottes, href: "/cagnottes" },
  { label: NAV_LABELS.comment, href: "/comment" },
  { label: NAV_LABELS.creerCagnotte, href: "/inscription" },
];

export function Footer({ className }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn("bg-footer px-6 py-12 text-white/80", className)}
    >
      <div className="container mx-auto">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <p className="font-headings text-xl font-bold text-white">
              {MISC.siteName}
            </p>
            <p className="text-sm leading-relaxed">
              {"La plateforme de cagnottes en ligne du Sénégal. Wave, Orange Money, Free Money, carte bancaire."}
            </p>
          </div>

          {/* Col 2: Produit */}
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-white">
              Produit
            </p>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-footer rounded-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Légal */}
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-white">
              Légal
            </p>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-footer rounded-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-white">
              Contact
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:contact@cagnottes.sn"
                  className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-footer rounded-sm"
                >
                  contact@cagnottes.sn
                </a>
              </li>
              <li>Dakar, Sénégal</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 border-t border-white/10 pt-6 text-xs">
          <p className="flex items-center gap-1.5">
            © {year} {MISC.siteName} — Made in Sénégal
            <Heart size={12} className="fill-current text-pink" aria-hidden />
          </p>
        </div>
      </div>
    </footer>
  );
}
