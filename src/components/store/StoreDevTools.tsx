"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Wrench, X, ChevronUp, ShoppingBag, CalendarCheck,
  Heart, Users, Send, CreditCard,
} from "lucide-react";

const IS_DEV = process.env.NODE_ENV !== "production";

interface SimRoute {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  getUrl: (slug: string) => string;
}

const SIMULATIONS: SimRoute[] = [
  {
    id: "sale-file",
    label: "Achat produit (avec fichier)",
    description: "Success page avec bouton télécharger",
    icon: <ShoppingBag size={14} />,
    getUrl: (slug) => `/${slug}/success?ref=SIM-SALE-001&type=SALE&mock=true`,
  },
  {
    id: "booking",
    label: "Réservation confirmée",
    description: "Success page avec détails du RDV",
    icon: <CalendarCheck size={14} />,
    getUrl: (slug) => `/${slug}/success?ref=SIM-BOOK-001&type=BOOKING&mock=true`,
  },
  {
    id: "donation",
    label: "Don reçu",
    description: "Success page avec message donateur",
    icon: <Heart size={14} />,
    getUrl: (slug) => `/${slug}/success?ref=SIM-DON-001&type=DONATION&mock=true`,
  },
  {
    id: "payment",
    label: "Paiement libre",
    description: "Success page paiement confirmé",
    icon: <CreditCard size={14} />,
    getUrl: (slug) => `/${slug}/success?ref=SIM-PAY-001&type=PAYMENT&mock=true`,
  },
  {
    id: "community",
    label: "Inscription communauté",
    description: "Success page avec lien Telegram",
    icon: <Users size={14} />,
    getUrl: (slug) => `/${slug}/community-success?ref=SIM-COM-001&mock=true`,
  },
  {
    id: "pending",
    label: "Paiement en attente",
    description: "Polling 3s puis redirect vers success",
    icon: <CreditCard size={14} />,
    getUrl: (slug) => `/${slug}/pending?ref=SIM-PEND-001&type=SALE&mock=true`,
  },
  {
    id: "error",
    label: "Paiement échoué",
    description: "Page d'erreur de paiement",
    icon: <X size={14} />,
    getUrl: (slug) => `/${slug}/error?ref=SIM-ERR-001`,
  },
];

export function StoreDevTools() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const slug = params?.slug;

  if (!IS_DEV || !slug) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {/* Panel */}
      {open && (
        <div className="mb-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Wrench size={14} className="text-amber-500" />
              <span className="text-xs font-bold text-gray-700">Store Dev Tools</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>

          {/* Simulation list */}
          <div className="max-h-96 overflow-y-auto p-2">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Simuler des pages post-paiement
            </p>
            {SIMULATIONS.map((sim) => (
              <button
                key={sim.id}
                onClick={() => {
                  router.push(sim.getUrl(slug));
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  {sim.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-900">{sim.label}</p>
                  <p className="truncate text-[10px] text-gray-500">{sim.description}</p>
                </div>
              </button>
            ))}

            {/* Separator */}
            <div className="mx-3 my-2 h-px bg-gray-100" />

            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Navigation rapide
            </p>
            <button
              onClick={() => { router.push(`/${slug}`); setOpen(false); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <Send size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-gray-900">Page boutique</p>
                <p className="truncate text-[10px] text-gray-500">/{slug}</p>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2">
            <p className="text-[9px] font-medium text-gray-400">
              Visible uniquement en développement · slug: {slug}
            </p>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${
          open
            ? "bg-gray-900 text-white"
            : "bg-amber-500 text-white hover:bg-amber-600"
        }`}
        title="Store Dev Tools"
      >
        {open ? <ChevronUp size={18} /> : <Wrench size={18} />}
      </button>
    </div>
  );
}
