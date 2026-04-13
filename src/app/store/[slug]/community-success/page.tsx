"use client";

import { useSearchParams, useParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Send, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { StoreSkeleton } from "@/components/ui";
import { Avatar } from "@/components/ui";
import { formatPrice, billingPeriodLabel } from "@/lib/utils";

interface PaymentStatusResponse {
  paymentStatus: string;
  subscription: {
    id: string;
    status: string;
    inviteLink: string | null;
    inviteLinkExpiresAt: string | null;
    currentPeriodEnd: string;
    lockedPrice: number;
    community: {
      title: string;
      billingPeriod?: string;
      seller: { slug: string; displayName: string; avatarUrl?: string | null };
    };
  };
}

const IS_DEV = process.env.NODE_ENV !== "production";

function getMockCommunityData(slug: string): PaymentStatusResponse {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return {
    paymentStatus: "COMPLETED",
    subscription: {
      id: "mock-sub-001",
      status: "ACTIVE",
      inviteLink: "https://t.me/+mock-invite-link",
      inviteLinkExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: nextMonth.toISOString(),
      lockedPrice: 5000,
      community: {
        title: "Communauté Premium",
        seller: { slug, displayName: "Boutique Demo", avatarUrl: null },
      },
    },
  };
}

function CommunitySuccessContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const isMock = IS_DEV && searchParams.get("mock") === "true";
  const [data, setData] = useState<PaymentStatusResponse | null>(isMock ? getMockCommunityData(params.slug) : null);
  const [loading, setLoading] = useState(isMock ? false : true);
  const [retryCount, setRetryCount] = useState(0);
  const pollRef = useRef(0);

  useEffect(() => {
    if (isMock) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guard clause, not cascading
    if (!ref) { setLoading(false); return; }

    const abortController = new AbortController();
    pollRef.current = 0;

    async function poll() {
      try {
        while (!abortController.signal.aborted && pollRef.current < 40) {
          pollRef.current++;
          try {
            const res = await api<PaymentStatusResponse>(`/api/communities/payment/${ref}/status`);
            if (abortController.signal.aborted) return;
            if (res.paymentStatus === "COMPLETED" || res.paymentStatus === "FAILED") {
              setData(res);
              setLoading(false);
              return;
            }
          } catch {
            if (abortController.signal.aborted) return;
          }
          await new Promise((r) => setTimeout(r, 3000));
        }
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      } catch { /* guard */ }
    }

    poll();
    return () => { abortController.abort(); };
  }, [ref, isMock, retryCount]);

  const slug = params.slug;

  const stagger = (i: number) => ({ animation: `slideUp 0.5s ease-out ${0.1 + i * 0.08}s both` });

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-white">
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10">
          <div className="w-full max-w-xs text-center">
            <div className="relative mx-auto h-14 w-14">
              <div className="absolute inset-0 rounded-full border-[2.5px] border-gray-200" />
              <div
                className="absolute inset-0 rounded-full border-[2.5px] border-teal-500 border-t-transparent"
                style={{ animation: "spin 1s linear infinite" }}
              />
            </div>
            <p className="mt-5 text-[15px] font-semibold text-gray-900">Vérification en cours</p>
            <p className="mt-1.5 text-sm text-gray-400">Ne ferme pas cette page</p>
          </div>
        </div>
      </div>
    );
  }

  const inviteLink = data?.subscription?.inviteLink;
  const communityTitle = data?.subscription?.community?.title || "la communauté";
  const sellerName = data?.subscription?.community?.seller?.displayName || "";
  const sellerAvatar = data?.subscription?.community?.seller?.avatarUrl || null;
  const sellerSlug = data?.subscription?.community?.seller?.slug || slug;
  const lockedPrice = data?.subscription?.lockedPrice;
  const nextPayment = data?.subscription?.currentPeriodEnd
    ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  // ── Failed ──
  if (data?.paymentStatus === "FAILED") {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-red-50/50 to-white">
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
                href={`/${sellerSlug}`}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
              >
                <RefreshCw size={15} />
                Réessayer
              </Link>
              <Link
                href={`/${sellerSlug}`}
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

  // ── Timeout ──
  if (!data) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-amber-50/50 to-white">
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
          <div
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700"
            style={stagger(1)}
          >
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            En attente de confirmation
          </div>
        </div>
        <div className="flex flex-1 flex-col px-4 pb-8 pt-4">
          <div className="mx-auto w-full max-w-sm">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" style={stagger(2)}>
              <h1 className="text-xl font-bold text-gray-900">La confirmation prend du temps</h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Tu recevras le lien Telegram dès que le paiement sera validé.
              </p>
            </div>
            <div className="mt-4 space-y-2.5" style={stagger(3)}>
              <button
                onClick={() => { setLoading(true); setRetryCount((c) => c + 1); }}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
              >
                <RefreshCw size={15} />
                Vérifier à nouveau
              </button>
              <Link
                href={`/${slug}`}
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

  // ── Success ──
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50/80 to-white">

      {/* ── Animated success header ── */}
      <div className="flex flex-col items-center px-5 pt-10 pb-2" style={stagger(0)}>
        <div className="relative">
          <div
            className="absolute -inset-3 rounded-full bg-teal-500/10"
            style={{ animation: "successRingPulse 2s ease-out 0.8s infinite" }}
          />
          <div
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/25"
            style={{ animation: "successRingScale 0.6s ease-out both" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 36,
                  strokeDashoffset: 36,
                  animation: "successCheckDraw 0.4s ease-out 0.5s forwards",
                }}
              />
            </svg>
          </div>
          {[
            { top: "-6px", left: "-8px", bg: "#F59E0B", size: "8px", delay: "0.6s" },
            { top: "-10px", left: "50%", bg: "#0D9488", size: "6px", delay: "0.7s" },
            { top: "-4px", right: "-10px", bg: "#EC4899", size: "7px", delay: "0.8s" },
            { top: "50%", left: "-12px", bg: "#8B5CF6", size: "5px", delay: "0.65s" },
            { top: "50%", right: "-12px", bg: "#F59E0B", size: "5px", delay: "0.75s" },
          ].map((dot, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                top: dot.top, left: dot.left, right: dot.right,
                width: dot.size, height: dot.size, backgroundColor: dot.bg,
                animation: `confettiBurst 1s ease-out ${dot.delay} forwards`, opacity: 0,
              }}
            />
          ))}
        </div>

        <div
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-teal-700"
          style={stagger(1)}
        >
          <div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
          Inscription confirmée
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="flex flex-1 flex-col px-4 pb-8 pt-4">
        <div className="mx-auto w-full max-w-sm">

          <div
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-200/60"
            style={stagger(2)}
          >
            <div className="p-5">
              {/* Seller */}
              {sellerName && (
                <div className="flex items-center gap-3 pb-4">
                  <Avatar src={sellerAvatar} alt={sellerName} size="sm" />
                  <span className="text-sm font-medium text-gray-500">{sellerName}</span>
                </div>
              )}

              {/* Title */}
              <h1 className="text-xl font-bold leading-tight text-gray-900">
                Bienvenue dans {communityTitle}
              </h1>

              {/* Summary */}
              <div className="mt-5 border-t border-dashed border-gray-200 pt-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Communauté</span>
                    <span className="text-sm font-medium text-gray-700">{communityTitle}</span>
                  </div>
                  {lockedPrice != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Abonnement</span>
                      <span className="text-sm font-medium text-gray-700">{formatPrice(lockedPrice)}{billingPeriodLabel(data?.subscription?.community?.billingPeriod || "MONTHLY")}</span>
                    </div>
                  )}
                  {nextPayment && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Prochain paiement</span>
                      <span className="text-sm font-medium text-gray-700">{nextPayment}</span>
                    </div>
                  )}
                </div>

                {lockedPrice != null && (
                  <>
                    <div className="my-3 border-t border-gray-100" />
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-bold text-gray-900">Total</span>
                      <span className="text-[15px] font-bold text-teal-600">{formatPrice(lockedPrice)}{billingPeriodLabel(data?.subscription?.community?.billingPeriod || "MONTHLY")}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 space-y-2.5" style={stagger(3)}>
            {inviteLink ? (
              <>
                {/* Étapes pour rejoindre */}
                <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                  <p className="text-[13px] font-semibold text-teal-800 mb-2.5">
                    Pour rejoindre le groupe / canal Telegram :
                  </p>
                  <ol className="space-y-2.5 text-[13px] text-gray-700">
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">1</span>
                      <span>Clique sur le bouton bleu ci-dessous</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">2</span>
                      <span>Telegram va s&apos;ouvrir — appuie sur le bouton <strong>« Démarrer »</strong> en bas de l&apos;écran</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">3</span>
                      <span>Tu recevras <strong>automatiquement</strong> le lien pour rejoindre</span>
                    </li>
                  </ol>
                </div>

                <a
                  href={inviteLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#0088cc] px-6 py-3.5 text-sm font-semibold text-white shadow-sm shadow-[#0088cc]/20 transition-all hover:bg-[#0077b5] active:scale-[0.98]"
                >
                  <Send size={17} />
                  Ouvrir Telegram
                </a>
                <p className="text-center text-[12px] text-gray-400">
                  Telegram doit être installé sur ton téléphone
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl bg-blue-50 px-4 py-3">
                <Send size={14} className="shrink-0 text-blue-500" />
                <p className="text-sm text-blue-800">
                  Le lien pour rejoindre sera envoyé prochainement.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3" style={stagger(4)}>
              <Mail size={14} className="shrink-0 text-gray-400" />
              <p className="text-[13px] text-gray-500">
                Tu recevras un rappel 3 jours avant le prochain paiement.
              </p>
            </div>

            <Link
              href={`/${sellerSlug}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 active:scale-[0.98]"
              style={stagger(5)}
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

export default function CommunitySuccessPage() {
  return (
    <Suspense fallback={<StoreSkeleton />}>
      <CommunitySuccessContent />
    </Suspense>
  );
}
