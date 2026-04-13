"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { StoreSkeleton } from "@/components/ui";

// PROXY: client-side calls go through Next.js rewrites (same-origin)
const API_URL = "";
const POLL_INTERVAL = 4000;
const MAX_POLLS = 90;

const IS_DEV = process.env.NODE_ENV !== "production";

function PendingContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get("ref");
  const type = searchParams.get("type");
  const isMock = IS_DEV && searchParams.get("mock") === "true";

  const [status, setStatus] = useState<"polling" | "paid" | "failed" | "timeout">("polling");
  const [pollCount, setPollCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Mock: simulate "paid" after 3 seconds
  useEffect(() => {
    if (!isMock) return;
    const t = setTimeout(() => {
      setStatus("paid");
      setTimeout(() => {
        router.replace(`/${params.slug}/success?ref=${ref || "SIM-001"}&type=${type || "SALE"}&mock=true`);
      }, 1500);
    }, 3000);
    return () => clearTimeout(t);
  }, [isMock, params.slug, ref, type, router]);

  useEffect(() => {
    if (status !== "polling") return;
    const elapsedTimer = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => { clearInterval(elapsedTimer); };
  }, [status]);

  const pollStatus = useCallback(async () => {
    if (!ref || isMock) return;
    try {
      const res = await fetch(`${API_URL}/api/orders/${ref}/status`);
      if (!res.ok) return;
      const data = await res.json() as { status: string; orderType: string };

      if (data.status === "PAID") {
        setStatus("paid");
        const orderType = type || data.orderType;
        const successUrl = orderType === "COMMUNITY"
          ? `/${params.slug}/community-success?ref=${ref}&communityId=${searchParams.get("communityId") || ""}`
          : `/${params.slug}/success?ref=${ref}&type=${orderType}`;
        setTimeout(() => {
          router.replace(successUrl);
        }, 1500);
      } else if (data.status === "FAILED") {
        setStatus("failed");
      }
    } catch {
      // Silently retry on network error
    }
  }, [ref, isMock, params.slug, type, router, searchParams]);

  useEffect(() => {
    if (isMock) return;
    if (status !== "polling" || !ref) return;
    if (pollCount >= MAX_POLLS) {
      const t = setTimeout(() => setStatus("timeout"), 0);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(() => {
      pollStatus();
      setPollCount((c) => c + 1);
    }, POLL_INTERVAL);
    return () => clearTimeout(timer);
  }, [isMock, status, ref, pollCount, pollStatus]);

  // Poll immediately on mount
  useEffect(() => {
    if (!ref || isMock) return;
    const t = setTimeout(() => pollStatus(), 0);
    return () => clearTimeout(t);
  }, [ref, isMock, pollStatus]);

  const stagger = (i: number) => ({ animation: `slideUp 0.5s ease-out ${0.1 + i * 0.08}s both` });

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-white">

      {/* ── Polling ── */}
      {status === "polling" && (
        <div className="flex flex-1 flex-col items-center px-5 pt-14">
          <div className="w-full max-w-xs text-center">
            {/* Animated spinner */}
            <div className="relative mx-auto h-16 w-16">
              <div className="absolute inset-0 rounded-full border-[2.5px] border-gray-200" />
              <div
                className="absolute inset-0 rounded-full border-[2.5px] border-teal-500 border-t-transparent"
                style={{ animation: "spin 1s linear infinite" }}
              />
              {/* Inner icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-teal-600">
                  <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M9.76 14.24l-2.83 2.83m12.14 0l-2.83-2.83M9.76 9.76L6.93 6.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <p className="mt-6 text-base font-semibold text-gray-900">Vérification en cours</p>
            <p className="mt-1.5 text-sm text-gray-400">Ne ferme pas cette page</p>

            {/* Progress bar */}
            <div className="mx-auto mt-6 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600"
                style={{ animation: "indeterminate 1.5s ease-in-out infinite", width: "40%" }}
              />
            </div>

            {elapsed > 10 && (
              <p className="mt-4 font-mono text-xs text-gray-300">
                {elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}min ${elapsed % 60}s`}
              </p>
            )}
            {ref && (
              <p className="mt-1 font-mono text-xs text-gray-300">Réf. {ref}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Paid → redirect ── */}
      {status === "paid" && (
        <div className="flex flex-1 flex-col items-center px-5 pt-14">
          <div className="w-full max-w-xs text-center">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/25"
              style={{ animation: "successRingScale 0.6s ease-out both" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ strokeDasharray: 36, strokeDashoffset: 36, animation: "successCheckDraw 0.4s ease-out 0.3s forwards" }}
                />
              </svg>
            </div>
            <p className="mt-5 text-base font-semibold text-gray-900">Paiement confirmé</p>
            <p className="mt-1 text-sm text-gray-400">Redirection...</p>
          </div>
        </div>
      )}

      {/* ── Failed ── */}
      {status === "failed" && (
        <>
          <div className="flex flex-col items-center px-5 pt-10 pb-2" style={stagger(0)}>
            <div
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/25"
              style={{ animation: "successRingScale 0.6s ease-out both" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700" style={stagger(1)}>
              <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Paiement échoué
            </div>
          </div>
          <div className="flex flex-1 flex-col px-4 pb-8 pt-4">
            <div className="mx-auto w-full max-w-sm">
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" style={stagger(2)}>
                <h1 className="text-xl font-bold text-gray-900">Le paiement n&apos;a pas abouti</h1>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Vérifie ton solde ou ton code de confirmation, puis réessaie.
                </p>
              </div>
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
        </>
      )}

      {/* ── Timeout ── */}
      {status === "timeout" && (
        <>
          <div className="flex flex-col items-center px-5 pt-10 pb-2" style={stagger(0)}>
            <div
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-500/25"
              style={{ animation: "successRingScale 0.6s ease-out both" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700" style={stagger(1)}>
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              En attente de confirmation
            </div>
          </div>
          <div className="flex flex-1 flex-col px-4 pb-8 pt-4">
            <div className="mx-auto w-full max-w-sm">
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" style={stagger(2)}>
                <h1 className="text-xl font-bold text-gray-900">La confirmation prend du temps</h1>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Tu recevras un email dès que le paiement sera validé.
                </p>
              </div>
              <div className="mt-4 space-y-2.5" style={stagger(3)}>
                <button
                  onClick={() => { setStatus("polling"); setPollCount(0); setElapsed(0); }}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
                >
                  <RefreshCw size={15} />
                  Vérifier à nouveau
                </button>
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
        </>
      )}

    </div>
  );
}

export default function PendingPaymentPage() {
  return (
    <Suspense fallback={<StoreSkeleton />}>
      <PendingContent />
    </Suspense>
  );
}
