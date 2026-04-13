"use client";

import { Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { StoreSkeleton } from "@/components/ui";

function ErrorContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  const stagger = (i: number) => ({ animation: `slideUp 0.5s ease-out ${0.1 + i * 0.08}s both` });

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-red-50/50 to-white">

      {/* ── Animated error header ── */}
      <div className="flex flex-col items-center px-5 pt-10 pb-2" style={stagger(0)}>
        <div
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/25"
          style={{ animation: "successRingScale 0.6s ease-out both" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <div
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700"
          style={stagger(1)}
        >
          <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Paiement échoué
        </div>
      </div>

      {/* ── Card ── */}
      <div className="flex flex-1 flex-col px-4 pb-8 pt-4">
        <div className="mx-auto w-full max-w-sm">
          <div
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-gray-200/60"
            style={stagger(2)}
          >
            <h1 className="text-xl font-bold leading-tight text-gray-900">
              Le paiement n&apos;a pas abouti
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Vérifie ton solde ou ton code de confirmation, puis réessaie.
            </p>
            {ref && (
              <p className="mt-3 font-mono text-xs text-gray-300">Réf. {ref}</p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 space-y-2.5" style={stagger(3)}>
            <Link
              href={`/${params.slug}`}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
            >
              <RefreshCw size={15} />
              Réessayer
            </Link>
            <Link
              href={`/${params.slug}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 active:scale-[0.98]"
            >
              <ArrowLeft size={15} />
              Retourner à la page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentErrorPage() {
  return (
    <Suspense fallback={<StoreSkeleton />}>
      <ErrorContent />
    </Suspense>
  );
}
