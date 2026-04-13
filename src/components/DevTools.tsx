"use client";

import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useRouter } from "next/navigation";
import {
  Wrench, RotateCcw, X, ChevronUp, Plus, ShoppingBag,
  CalendarCheck, Heart, CreditCard, Users, ChevronRight, ArrowLeft, Play,
} from "lucide-react";

// M1: Vérifier !== "production" au lieu de === "development" pour éviter une fuite si NODE_ENV est mal configuré
const IS_DEV = process.env.NODE_ENV !== "production";

interface DevAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  variant?: "default" | "warning" | "teal";
  action: () => Promise<void>;
}

interface SellerProducts {
  slug: string;
  saleProducts: { id: string; title: string; price: number; fileUrl: string | null }[];
  bookingServices: { id: string; title: string; price: number }[];
  paymentBlocks: { id: string; title: string; blockType: string }[];
  communities: { id: string; title: string; priceAmount: number; billingPeriod?: string }[];
}

type SimView = "main" | "simulate";

export function DevTools() {
  const { refreshSeller } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [view, setView] = useState<SimView>("main");
  const [products, setProducts] = useState<SellerProducts | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);

  const runAction = useCallback(
    async (id: string, action: () => Promise<void>) => {
      setLoading(id);
      try {
        await action();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        toast(`Dev tool error: ${msg}`);
        console.error("[DevTools]", err);
      } finally {
        setLoading(null);
      }
    },
    [toast]
  );

  // Charger les produits quand on ouvre le panel simulation
  useEffect(() => {
    if (view !== "simulate" || products) return;
    let cancelled = false;
    setProductsLoading(true);
    api<SellerProducts>("/api/dev/seller-products")
      .then((data) => { if (!cancelled) setProducts(data); })
      .catch((err) => { if (!cancelled) console.error("[DevTools] fetch products", err); })
      .finally(() => { if (!cancelled) setProductsLoading(false); });
    return () => { cancelled = true; };
  }, [view, products]);

  const simulatePayment = useCallback(
    async (type: string, extraBody: Record<string, string> = {}) => {
      const res = await api<{ success: boolean; reference: string; redirectUrl: string }>(
        "/api/dev/simulate-payment",
        { method: "POST", body: { type, ...extraBody } }
      );
      toast(`Simulation ${type} créée — ref: ${res.reference}`);
      // Ouvrir dans un nouvel onglet pour ne pas perdre le dashboard
      window.open(res.redirectUrl, "_blank");
    },
    [toast]
  );

  const mainActions: DevAction[] = [
    {
      id: "simulate-panel",
      label: "Simuler un paiement",
      description: "Teste les pages de livraison pour chaque type de produit",
      icon: <Play size={14} />,
      variant: "teal",
      action: async () => { setView("simulate"); },
    },
    {
      id: "credit-balance",
      label: "Créditer 5 000 FCFA",
      description: "Ajoute 5 000 FCFA au solde pour tester les retraits",
      icon: <Plus size={14} />,
      action: async () => {
        await api("/api/dev/credit-balance", {
          method: "POST",
          body: { amount: 5000 },
        });
        toast("5 000 FCFA ajoutés au solde !");
      },
    },
    {
      id: "reset-onboarding",
      label: "Reset Onboarding",
      description: "Remet onboardingCompleted à false et redirige vers l'onboarding",
      icon: <RotateCcw size={14} />,
      variant: "warning",
      action: async () => {
        await api("/api/sellers/profile", {
          method: "PUT",
          body: { onboardingCompleted: false },
        });
        await refreshSeller();
        toast("Onboarding réinitialisé — redirection...");
        router.push("/onboarding");
      },
    },
  ];

  // Ne rien rendre en production
  if (!IS_DEV) return null;

  const formatPrice = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

  const renderActionButton = (a: DevAction) => {
    const isLoading = loading === a.id;
    const bgMap = {
      warning: "hover:bg-amber-50 active:bg-amber-100",
      teal: "hover:bg-teal-50 active:bg-teal-100",
      default: "hover:bg-gray-50 active:bg-gray-100",
    };
    const iconBgMap = {
      warning: "bg-amber-100 text-amber-600",
      teal: "bg-teal-100 text-teal-600",
      default: "bg-gray-100 text-gray-600",
    };
    return (
      <button
        key={a.id}
        onClick={() => runAction(a.id, a.action)}
        disabled={isLoading}
        className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${bgMap[a.variant || "default"]} disabled:opacity-50`}
      >
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBgMap[a.variant || "default"]}`}>
          {isLoading ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            a.icon
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-900">{a.label}</p>
          <p className="text-[10px] leading-tight text-gray-500">{a.description}</p>
        </div>
        {a.id === "simulate-panel" && <ChevronRight size={14} className="mt-1.5 shrink-0 text-gray-400" />}
      </button>
    );
  };

  const renderSimItem = (
    id: string,
    icon: React.ReactNode,
    label: string,
    subtitle: string,
    onClick: () => Promise<void>
  ) => {
    const isLoading = loading === id;
    return (
      <button
        key={id}
        onClick={() => runAction(id, onClick)}
        disabled={!!loading}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
          {isLoading ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          ) : (
            icon
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-gray-900">{label}</p>
          <p className="truncate text-[10px] text-gray-500">{subtitle}</p>
        </div>
      </button>
    );
  };

  return (
    <div className="fixed bottom-20 right-4 z-[9999] lg:bottom-4">
      {/* Panel */}
      {open && (
        <div className="mb-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5">
            <div className="flex items-center gap-2">
              {view === "simulate" && (
                <button
                  onClick={() => setView("main")}
                  className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                >
                  <ArrowLeft size={14} />
                </button>
              )}
              <Wrench size={14} className="text-amber-500" />
              <span className="text-xs font-bold text-gray-700">
                {view === "simulate" ? "Simuler un paiement" : "Dev Tools"}
              </span>
            </div>
            <button
              onClick={() => { setOpen(false); setView("main"); }}
              className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>

          {/* Main view */}
          {view === "main" && (
            <div className="max-h-80 overflow-y-auto p-2">
              {mainActions.map(renderActionButton)}
            </div>
          )}

          {/* Simulate view */}
          {view === "simulate" && (
            <div className="max-h-96 overflow-y-auto p-2">
              {productsLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                </div>
              )}

              {!productsLoading && products && (
                <>
                  {/* Produits digitaux */}
                  {products.saleProducts.length > 0 && (
                    <div className="mb-2">
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Produits digitaux
                      </p>
                      {products.saleProducts.map((p) =>
                        renderSimItem(
                          `sim-sale-${p.id}`,
                          <ShoppingBag size={14} />,
                          p.title,
                          `${formatPrice(p.price)} — ${p.fileUrl ? "Fichier digital" : "Sans fichier"}`,
                          () => simulatePayment("SALE", { productId: p.id })
                        )
                      )}
                    </div>
                  )}

                  {/* Coaching / Booking */}
                  {products.bookingServices.length > 0 && (
                    <div className="mb-2">
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Coaching / Réservation
                      </p>
                      {products.bookingServices.map((s) =>
                        renderSimItem(
                          `sim-booking-${s.id}`,
                          <CalendarCheck size={14} />,
                          s.title,
                          formatPrice(s.price),
                          () => simulatePayment("BOOKING", { serviceId: s.id })
                        )
                      )}
                    </div>
                  )}

                  {/* Paiement / Don */}
                  {products.paymentBlocks.length > 0 && (
                    <div className="mb-2">
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Paiement / Don
                      </p>
                      {products.paymentBlocks.map((b) =>
                        renderSimItem(
                          `sim-payment-${b.id}`,
                          b.blockType === "DONATION" ? <Heart size={14} /> : <CreditCard size={14} />,
                          b.title,
                          b.blockType === "DONATION" ? "Don libre — 5 000 FCFA simulé" : "Paiement — 5 000 FCFA simulé",
                          () => simulatePayment(b.blockType === "DONATION" ? "DONATION" : "PAYMENT")
                        )
                      )}
                    </div>
                  )}

                  {/* Communautés */}
                  {products.communities.length > 0 && (
                    <div className="mb-2">
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Communauté Telegram
                      </p>
                      {products.communities.map((c) =>
                        renderSimItem(
                          `sim-community-${c.id}`,
                          <Users size={14} />,
                          c.title,
                          `${formatPrice(c.priceAmount)}${({ WEEKLY: "/sem.", BIWEEKLY: "/15j", MONTHLY: "/mois", QUARTERLY: "/trim.", YEARLY: "/an" } as Record<string, string>)[c.billingPeriod || "MONTHLY"] || "/mois"}`,
                          () => simulatePayment("COMMUNITY", { communityId: c.id })
                        )
                      )}
                    </div>
                  )}

                  {/* Aucun produit */}
                  {products.saleProducts.length === 0 &&
                    products.bookingServices.length === 0 &&
                    products.paymentBlocks.length === 0 &&
                    products.communities.length === 0 && (
                    <div className="px-3 py-8 text-center">
                      <p className="text-xs text-gray-500">Aucun produit/service trouvé.</p>
                      <p className="mt-1 text-[10px] text-gray-400">Crée un bloc dans ton dashboard d&apos;abord.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2">
            <p className="text-[9px] font-medium text-gray-400">
              Visible uniquement en développement
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
        title="Dev Tools"
      >
        {open ? <ChevronUp size={18} /> : <Wrench size={18} />}
      </button>
    </div>
  );
}
