"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle, X, ChevronDown } from "lucide-react";
import { shareStoreLink } from "@/lib/share";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/lib/useApi";

const STORAGE_KEY = "izy-checklist-dismissed";

interface DashboardStats {
  totalOrders: number;
  hasBlocks?: boolean;
}

interface Step {
  id: string;
  label: string;
  description: string;
  cta: string;
  done: boolean;
  action: () => void;
}

function ProgressRing({ progress, size, stroke }: { progress: number; size: number; stroke: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress / 100);
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="#0D9488"
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="relative z-10 font-bold text-gray-700" style={{ fontSize: size * 0.30 }}>
        {Math.round(progress)}%
      </span>
    </div>
  );
}

function ChecklistBody({
  steps,
  completedCount,
  progress,
  openId,
  onToggle,
  onDismiss,
}: {
  steps: Step[];
  completedCount: number;
  progress: number;
  openId: string | null;
  onToggle: (id: string) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="p-3">
      <div className="flex items-center gap-2.5">
        <ProgressRing progress={progress} size={44} stroke={3.5} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-gray-900">Lance ta boutique</p>
          <p className="text-[10px] text-gray-500">
            {completedCount}/{steps.length} complétée{completedCount > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
          aria-label="Masquer"
        >
          <X size={11} />
        </button>
      </div>

      <div className="mt-2.5 space-y-0.5">
        {steps.map((step) => {
          const isOpen = openId === step.id && !step.done;
          return (
            <div
              key={step.id}
              className={`overflow-hidden rounded-xl transition-colors duration-200 ${isOpen ? "bg-white shadow-sm ring-1 ring-gray-100" : ""}`}
            >
              <button
                onClick={() => !step.done && onToggle(step.id)}
                disabled={step.done}
                className={`flex w-full items-center gap-2 px-2 py-2 text-left transition-colors duration-150 ${
                  step.done ? "cursor-default" : isOpen ? "" : "hover:bg-gray-100 rounded-xl"
                }`}
              >
                {step.done ? (
                  <CheckCircle size={15} className="shrink-0 text-teal-600" />
                ) : (
                  <Circle size={15} className={`shrink-0 transition-colors duration-200 ${isOpen ? "text-teal-500" : "text-gray-300"}`} />
                )}
                <span className={`flex-1 text-[11px] font-semibold leading-tight ${step.done ? "text-gray-400 line-through" : "text-gray-800"}`}>
                  {step.label}
                </span>
                {!step.done && (
                  <ChevronDown
                    size={12}
                    className={`shrink-0 text-gray-400 transition-transform duration-300 ease-out ${isOpen ? "rotate-180" : ""}`}
                  />
                )}
              </button>

              {/* Smooth height via CSS grid trick */}
              <div className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <div className="px-2 pb-2.5">
                    <p className="mb-2 text-[10px] leading-relaxed text-gray-500">{step.description}</p>
                    <button
                      onClick={step.action}
                      className="w-full rounded-lg bg-teal-600 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-teal-700 active:scale-[0.98]"
                    >
                      {step.cta}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OnboardingChecklist({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const { seller } = useAuth();
  const [dismissed, setDismissed] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "true"); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  // Click outside full card (expanded sidebar) → minimize
  useEffect(() => {
    if (minimized || collapsed) return;
    function handle(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setMinimized(true);
        setOpenId(null);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [minimized, collapsed]);

  // Click outside popover (collapsed sidebar) → close
  useEffect(() => {
    if (!popoverOpen) return;
    function handle(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [popoverOpen]);

  const { data: stats } = useApi<DashboardStats>("/api/sellers/dashboard/stats?period=30");

  if (!seller || dismissed) return null;

  const hasTheme = seller.themeId !== "default" || seller.bgImageUrl !== null;
  const hasProduct = stats?.hasBlocks === true;
  const steps: Step[] = [
    {
      id: "product",
      label: "Ajouter un produit",
      description: "Crée ton premier produit ou service pour commencer à vendre.",
      cta: "Ajouter un bloc",
      done: hasProduct,
      action: () => { router.push("/dashboard/blocks"); setPopoverOpen(false); },
    },
    {
      id: "theme",
      label: "Personnaliser mon store",
      description: "Choisis un thème, des couleurs et une image de fond.",
      cta: "Personnaliser",
      done: hasTheme,
      action: () => { router.push("/dashboard/blocks"); setPopoverOpen(false); },
    },
    {
      id: "share",
      label: "Partager mon lien",
      description: "Envoie ta page à tes premiers visiteurs via WhatsApp ou Instagram.",
      cta: "Partager maintenant",
      done: false,
      action: () => { shareStoreLink(seller.slug, seller.displayName); setPopoverOpen(false); },
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const progress = (completedCount / steps.length) * 100;

  if (allDone) return null;

  // Auto-open first incomplete step on initial expand
  function expand() {
    setMinimized(false);
    if (!openId) {
      const first = steps.find((s) => !s.done);
      if (first) setOpenId(first.id);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    setPopoverOpen(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }

  function handleToggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  // ── Sidebar réduite : anneau → popover flottant ──
  if (collapsed) {
    return (
      <div className="flex justify-center px-2 pb-2" ref={triggerRef}>
        <button
          onClick={() => setPopoverOpen((v) => !v)}
          title="Configuration de ta boutique"
          className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${popoverOpen ? "bg-teal-50" : "hover:bg-gray-50"}`}
        >
          <ProgressRing progress={progress} size={36} stroke={3} />
        </button>

        {popoverOpen && (
          <div
            ref={popoverRef}
            className="fixed bottom-20 left-20 z-50 rounded-2xl border border-gray-200 bg-white shadow-2xl"
            style={{ width: 272 }}
          >
            <ChecklistBody
              steps={steps}
              completedCount={completedCount}
              progress={progress}
              openId={openId}
              onToggle={handleToggle}
              onDismiss={handleDismiss}
            />
          </div>
        )}
      </div>
    );
  }

  // ── Sidebar étendue ──
  return (
    <div ref={cardRef} className="mb-2">

      {/* État minimisé : carte style Linktree */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          minimized ? "opacity-100 max-h-40" : "opacity-0 max-h-0 pointer-events-none"
        }`}
      >
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <ProgressRing progress={progress} size={50} stroke={4} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">Lance ta boutique</p>
              <p className="text-xs text-gray-500">
                {completedCount}/{steps.length} complétée{completedCount > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={expand}
            className="mt-3 w-full rounded-full bg-teal-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-700 active:scale-[0.98]"
          >
            Terminer la config
          </button>
        </div>
      </div>

      {/* État complet : carte accordéon */}
      <div
        className={`grid transition-all duration-300 ease-out ${
          minimized ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="rounded-2xl border border-gray-100 bg-gray-50">
            <ChecklistBody
              steps={steps}
              completedCount={completedCount}
              progress={progress}
              openId={openId}
              onToggle={handleToggle}
              onDismiss={handleDismiss}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
