"use client";

import { RefreshCw, AlertTriangle } from "lucide-react";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle size={28} className="text-red-400" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          Une erreur est survenue
        </h2>
        <p className="mt-1.5 max-w-xs text-sm text-gray-500">
          Un problème inattendu s&apos;est produit. Réessaye ou reviens plus tard.
        </p>
      </div>
      <button
        onClick={reset}
        className="flex min-h-[48px] items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 active:scale-[0.98]"
      >
        <RefreshCw size={14} />
        Réessayer
      </button>
    </div>
  );
}
