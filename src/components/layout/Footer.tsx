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
  { label: "Politique de confidentialité", href: "/confidentialite" },
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "RGPD", href: "/rgpd" },
  { label: "Cookies", href: "/cookies" },
];

const PRODUCT_LINKS: Array<{ label: string; href: string }> = [
  { label: NAV_LABELS.cagnottes, href: "/cagnottes" },
  { label: NAV_LABELS.comment, href: "/comment" },
  { label: "Tarifs", href: "/tarifs" },
  { label: NAV_LABELS.creerCagnotte, href: "/inscription" },
];

const HELP_LINKS: Array<{ label: string; href: string }> = [
  { label: "Centre d'aide", href: "/aide" },
  { label: "Mon compte & Sécurité", href: "/aide#compte-securite" },
  { label: "Créer une cagnotte", href: "/aide#creer-gerer-cagnotte" },
  { label: "Participer à une cagnotte", href: "/aide#participer" },
  { label: "Retirer mes fonds", href: "/aide#utiliser-argent" },
  { label: "Problèmes techniques", href: "/aide#technique" },
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
              La plateforme de cagnottes en ligne du Sénégal. Wave, Orange
              Money, Free Money.
            </p>
            <p className="pt-2 text-xs text-white/60">
              Dakar, Sénégal
              <br />
              <a
                href="mailto:contact@cagnottes.sn"
                className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-footer rounded-sm"
              >
                contact@cagnottes.sn
              </a>
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
                    className="text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-footer rounded-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Aide (grouped FAQ sections for quick access) */}
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-white">
              Aide
            </p>
            <ul className="space-y-2">
              {HELP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-footer rounded-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Légal */}
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-white">
              Légal
            </p>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-footer rounded-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 border-t border-white/10 pt-6 text-xs">
          <p className="flex items-center gap-1.5">
            © {year} {MISC.siteName} — Fait au Sénégal
            <Heart size={12} className="fill-current text-pink" aria-hidden />
          </p>
        </div>
      </div>
    </footer>
  );
}
