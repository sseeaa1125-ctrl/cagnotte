"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Check } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Skeleton, Input } from "@/components/ui";
import { formatPrice, billingPeriodLabel } from "@/lib/utils";

interface SubData {
  subscription: {
    id: string;
    memberEmail: string;
    memberName: string | null;
    status: string;
    currentPeriodEnd: string;
    lockedPrice: number;
    community: {
      title: string;
      priceAmount: number;
      billingPeriod?: string;
      seller: { slug: string; displayName: string };
    };
  };
}

export default function CancelSubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [data, setData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const [error, setError] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await api<SubData>(`/api/communities/subscription/${id}?token=${encodeURIComponent(token)}`);
        setData(res);
      } catch {
        setError("Abonnement introuvable.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const isAnonymousMember = data?.subscription.memberEmail.endsWith("@noemail.local") ?? false;

  async function handleCancel() {
    if (!isAnonymousMember && !confirmEmail.trim()) { setError("Entre ton email pour confirmer."); return; }
    setCanceling(true);
    setError("");
    try {
      await api(`/api/communities/subscription/${id}/cancel`, {
        method: "POST",
        body: { ...(isAnonymousMember ? {} : { email: confirmEmail.trim() }), token },
      });
      setCanceled(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'annulation.");
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-5 px-4">
          <Skeleton className="mx-auto h-14 w-14 rounded-full" />
          <Skeleton className="mx-auto h-6 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (canceled) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="mx-auto w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
            <Check size={32} className="text-teal-600" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-gray-900">Abonnement annulé</h1>
          <p className="mt-2 text-sm text-gray-600">
            Tu conserves ton accès jusqu&apos;au{" "}
            <strong>
              {data?.subscription.currentPeriodEnd
                ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </strong>
            .
          </p>
          <p className="mt-4 text-xs text-gray-400">
            Tu peux te réabonner à tout moment depuis la page du créateur.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-gray-500">{error || "Abonnement introuvable."}</p>
      </div>
    );
  }

  const sub = data.subscription;
  const endDate = new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-xl font-extrabold text-gray-900">Annuler ton abonnement</h1>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
          <p className="text-sm text-gray-700">
            <strong>Communauté :</strong> {sub.community.title}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Créateur :</strong> {sub.community.seller.displayName}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Prix :</strong> {formatPrice(sub.lockedPrice)}{billingPeriodLabel(sub.community.billingPeriod || "MONTHLY")}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Accès jusqu&apos;au :</strong> {endDate}
          </p>
        </div>

        {sub.status === "canceled" || sub.status === "expired" ? (
          <p className="mt-4 text-sm text-gray-500">
            Cet abonnement est déjà {sub.status === "canceled" ? "annulé" : "expiré"}.
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm text-gray-500">
              Si tu annules, tu conserveras ton accès jusqu&apos;au <strong>{endDate}</strong>,
              puis tu seras retiré(e) du groupe / canal Telegram.
            </p>

            {!isAnonymousMember && (
              <div className="mt-4">
                <Input
                  label="Confirme ton email"
                  type="email"
                  placeholder="toi@email.com"
                  value={confirmEmail}
                  onChange={(e) => { setConfirmEmail(e.target.value); setError(""); }}
                  autoComplete="email"
                />
              </div>
            )}

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleCancel}
              disabled={canceling}
              className="mt-4 w-full rounded-xl bg-red-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {canceling ? "Annulation..." : "Confirmer l'annulation"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
