"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, ChevronLeft, AlertCircle, Bot, MessageSquare, Zap, Shield, CreditCard, Tag, Copy, RefreshCw, Loader2 } from "lucide-react";
import { Input, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { revalidateStore } from "@/app/actions";

interface GroupInfo {
  chatId: string;
  chatTitle: string;
}

const PERIOD_OPTIONS = [
  { value: "WEEKLY", label: "Hebdomadaire", short: "/ semaine" },
  { value: "BIWEEKLY", label: "Bimensuel", short: "/ 15 jours" },
  { value: "MONTHLY", label: "Mensuel", short: "/ mois" },
  { value: "QUARTERLY", label: "Trimestriel", short: "/ trimestre" },
  { value: "YEARLY", label: "Annuel", short: "/ an" },
];

const PERIOD_SHORT: Record<string, string> = {
  WEEKLY: "/ semaine",
  BIWEEKLY: "/ 15 jours",
  MONTHLY: "/ mois",
  QUARTERLY: "/ trimestre",
  YEARLY: "/ an",
};

const MAX_COMMUNITIES = 3;

export function CommunitySetupWizard() {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [botUsername, setBotUsername] = useState("izystore_bot");
  const [codeLoading, setCodeLoading] = useState(true);
  const [codeExpired, setCodeExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [billingPeriod, setBillingPeriod] = useState("MONTHLY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { seller } = useAuth();
  const [checking, setChecking] = useState(false);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Vérifier la limite de communautés actives au montage
  useEffect(() => {
    api<{ communities: { isActive: boolean }[] }>("/api/communities/seller/list")
      .then((res) => {
        const activeCount = res.communities.filter((c) => c.isActive).length;
        if (activeCount >= MAX_COMMUNITIES) {
          setLimitReached(true);
        }
      })
      .catch(() => {});
  }, []);

  // Générer le code au montage
  const generateCode = useCallback(async () => {
    setCodeLoading(true);
    setError("");
    setCodeExpired(false);
    try {
      const res = await api<{ ok: boolean; code: string; botUsername: string; expiresAt: string }>(
        "/api/telegram/generate-code",
        { method: "POST", body: {} }
      );
      setCode(res.code);
      setBotUsername(res.botUsername);

      // Timer pour expiration (avec cleanup)
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
      const expiresIn = new Date(res.expiresAt).getTime() - Date.now();
      if (expiresIn > 0) {
        expiryTimerRef.current = setTimeout(() => setCodeExpired(true), expiresIn);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de générer le code.");
    } finally {
      setCodeLoading(false);
    }
  }, []);

  useEffect(() => {
    generateCode();

    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [generateCode]);

  // Vérifier manuellement si le code a été validé (5 tentatives, 2s entre chaque)
  const checkCode = useCallback(async () => {
    if (!code || codeExpired) return;
    setChecking(true);
    setError("");
    for (let i = 0; i < 5; i++) {
      try {
        const res = await api<{ ok: boolean; verified: boolean; expired?: boolean; chatId?: string; chatTitle?: string }>(
          `/api/telegram/check-code/${code}`
        );
        if (res.verified && res.chatId) {
          setGroupInfo({ chatId: res.chatId, chatTitle: res.chatTitle || "Groupe / Canal Telegram" });
          setTitle(res.chatTitle || "");
          setStep(2);
          setChecking(false);
          return;
        }
        if (res.expired) {
          setCodeExpired(true);
          setChecking(false);
          return;
        }
      } catch { /* ignore */ }
      if (i < 4) await new Promise((r) => setTimeout(r, 2000));
    }
    setError("Pas encore détecté. Vérifie que tu as bien tapé /connect " + code + " dans ton groupe ou canal, puis réessaye.");
    setChecking(false);
  }, [code, codeExpired]);

  // Copier la commande /connect
  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(`/connect ${code}`);
    } catch {
      // Fallback pour HTTP ou navigateurs sans clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = `/connect ${code}`;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Étape 2 : Créer la communauté ──
  async function createCommunity() {
    if (!title.trim()) { setError("Le titre est obligatoire"); return; }
    const priceNum = parseInt(price);
    if (!price || isNaN(priceNum) || priceNum < 500) {
      setError("Le prix minimum est de 500 FCFA");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api("/api/communities", {
        method: "POST",
        body: {
          chatId: groupInfo!.chatId,
          title: title.trim(),
          description: description.trim() || undefined,
          priceAmount: priceNum,
          billingPeriod,
        },
      });
      if (seller?.slug) revalidateStore(seller.slug);
      toast("Communauté créée avec succès !");
      router.push("/dashboard/blocks");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step labels ──
  const STEP_LABELS = ["Connecter Telegram", "Détails"];
  const STEP_DESCRIPTIONS = [
    "Tape /connect dans ton groupe ou canal Telegram",
    "Configure ton offre d'abonnement",
  ];

  function handleBack() {
    setError("");
    if (step === 2) {
      setGroupInfo(null);
      setTitle("");
      setChecking(false);
      setStep(1);
      generateCode();
    } else {
      router.push("/dashboard/communities");
    }
  }

  if (limitReached) {
    return (
      <div className="pb-32 lg:pb-8">
        <button
          onClick={() => router.push("/dashboard/communities")}
          className="mb-4 flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-gray-700"
        >
          <ChevronLeft size={14} />
          Communautés
        </button>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900">Limite atteinte</h2>
          <p className="mt-2 text-sm text-gray-600">
            Tu as atteint la limite de {MAX_COMMUNITIES} communautés actives par compte.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Désactive une communauté existante pour en créer une nouvelle.
          </p>
          <button
            onClick={() => router.push("/dashboard/communities")}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Voir mes communautés
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 lg:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={handleBack}
            className="mb-2 flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-gray-700"
          >
            <ChevronLeft size={14} />
            Communautés
          </button>
          <h1 className="text-xl font-extrabold text-gray-900">Nouvelle communauté</h1>
          <p className="mt-0.5 text-sm text-gray-500">{STEP_DESCRIPTIONS[step - 1]}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="mb-8 grid grid-cols-2 gap-2">
        {[1, 2].map((s) => {
          const done = s < step;
          const active = s === step;
          return (
            <div key={s} className="text-center">
              <div className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                done ? "bg-teal-600 text-white" : active ? "bg-teal-100 text-teal-700 ring-2 ring-teal-600" : "bg-gray-100 text-gray-400"
              }`}>
                {done ? <Check size={14} /> : s}
              </div>
              <p className={`text-[11px] font-medium ${active ? "text-teal-700" : done ? "text-teal-600" : "text-gray-400"}`}>
                {STEP_LABELS[s - 1]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Two-column layout on desktop */}
      <div className="flex flex-col lg:flex-row lg:gap-8">
        {/* Main content column */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* ── Étape 1 : /connect CODE ── */}
          {step === 1 && (
            <>
              {codeLoading ? (
                <div className="flex items-center justify-center py-12"><Spinner size="md" /></div>
              ) : (
                <>
                  {/* Instructions */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                        <MessageSquare size={20} className="text-violet-500" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-gray-900">Connecte ton groupe ou canal</h2>
                        <p className="text-xs text-gray-500">3 étapes simples, 2 minutes</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Étape 1 */}
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">1</span>
                        <div className="pt-0.5">
                          <p className="text-sm font-medium text-gray-900">Ajoute <strong className="text-sky-600">@{botUsername}</strong> comme <strong>administrateur</strong> dans ton groupe ou canal Telegram</p>
                          <div className="mt-2 flex flex-col gap-1.5">
                            <span className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-teal-100"><Check size={10} className="text-teal-600" /></span>
                              Permission : Inviter des utilisateurs via un lien
                            </span>
                            <span className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-teal-100"><Check size={10} className="text-teal-600" /></span>
                              Permission : Bannir des utilisateurs
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Étape 2 — Commande /connect */}
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">2</span>
                        <div className="pt-0.5 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 mb-2">Tape cette commande <strong>dans ton groupe ou canal</strong> :</p>
                          <button
                            onClick={copyCommand}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-teal-200 bg-teal-50 px-4 py-3 text-left transition-all hover:border-teal-400 active:scale-[0.98]"
                          >
                            <code className="text-base font-bold text-teal-800 tracking-wide">/connect {code}</code>
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
                              {copied ? <Check size={14} /> : <Copy size={14} />}
                            </span>
                          </button>
                          <p className="mt-1.5 text-[10px] text-gray-400 ml-1">
                            {copied ? "Copié ! Colle dans ton groupe ou canal Telegram." : "Appuie pour copier la commande"}
                          </p>
                        </div>
                      </div>

                      {/* Étape 3 — Vérifier */}
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">3</span>
                        <div className="pt-0.5">
                          <p className="text-sm font-medium text-gray-900">Clique sur <strong>Vérifier</strong> ci-dessous</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action : Vérifier ou Code expiré */}
                  {!codeExpired ? (
                    <button
                      onClick={checkCode}
                      disabled={checking}
                      className="flex w-full h-[52px] items-center justify-center gap-2 rounded-xl bg-teal-600 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60 active:scale-[0.98]"
                    >
                      {checking ? (
                        <><Loader2 size={16} className="animate-spin" /> Détection en cours…</>
                      ) : (
                        <><Check size={16} /> J’ai collé la commande — Vérifier</>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                      <p className="text-sm text-red-700">Code expiré.</p>
                      <button
                        onClick={generateCode}
                        className="flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-200"
                      >
                        <RefreshCw size={12} />
                        Nouveau code
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Étape 2 : Détails de la communauté ── */}
          {step === 2 && (
            <>
              <div className="flex flex-wrap gap-2 mb-1">
                <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700">
                  <Check size={13} /> {groupInfo?.chatTitle}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 space-y-5">
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-1">Ton offre</h2>
                  <p className="text-xs text-gray-500">Ces informations seront visibles sur ta page publique</p>
                </div>

                <div>
                  <Input
                    label="Nom de la communauté"
                    placeholder="Communauté VIP Fitness"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setError(""); }}
                  />
                  <p className="mt-1.5 text-[10px] text-gray-400 ml-1">Ce nom sera affiché comme titre du bloc sur ta page</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700">
                    Description courte
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 placeholder:text-gray-400"
                    rows={2}
                    placeholder="Coaching quotidien + contenus exclusifs + accès direct"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                  />
                  <p className="mt-1 text-[10px] text-gray-400 ml-1">Optionnel · {description.length}/500</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700">
                    Période de facturation
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PERIOD_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setBillingPeriod(opt.value)}
                        className={`rounded-xl border-2 px-3 py-2.5 text-center text-sm font-medium transition-all ${
                          billingPeriod === opt.value
                            ? "border-teal-500 bg-teal-50 text-teal-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Input
                    label={`Prix ${PERIOD_SHORT[billingPeriod] || "/ mois"} (FCFA)`}
                    type="number"
                    placeholder="5000"
                    value={price}
                    onChange={(e) => { setPrice(e.target.value); setError(""); }}
                    inputMode="numeric"
                  />
                  <p className="mt-1.5 text-[10px] text-gray-400 ml-1">Minimum 500 FCFA. Tes membres paieront ce montant à chaque renouvellement.</p>
                </div>
              </div>
            </>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons — desktop (only step 2) */}
          {step === 2 && (
            <div className="hidden lg:flex gap-3 pt-2">
              <button
                onClick={handleBack}
                className="flex h-[52px] items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
                Retour
              </button>
              <button
                onClick={createCommunity}
                disabled={loading}
                className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? <Spinner size="sm" /> : "Créer la communauté"}
              </button>
            </div>
          )}
        </div>

        {/* Right sidebar — desktop only, contextual tips */}
        <div className="hidden lg:block w-[280px] shrink-0">
          <div className="sticky top-[calc(64px+1.5rem)] space-y-4">
            {step === 1 && (
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pourquoi un bot ?</p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <Zap size={14} className="mt-0.5 shrink-0 text-amber-500" />
                    <p className="text-xs text-gray-600">Gère les <strong>accès automatiquement</strong> quand un membre paie</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Shield size={14} className="mt-0.5 shrink-0 text-teal-500" />
                    <p className="text-xs text-gray-600">Retire les membres qui <strong>ne renouvellent pas</strong></p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Bot size={14} className="mt-0.5 shrink-0 text-sky-500" />
                    <p className="text-xs text-gray-600">Envoie des <strong>rappels de paiement</strong> par DM</p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Conseils</p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <Tag size={14} className="mt-0.5 shrink-0 text-violet-500" />
                    <p className="text-xs text-gray-600">Choisis un nom <strong>accrocheur</strong> qui donne envie de rejoindre</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CreditCard size={14} className="mt-0.5 shrink-0 text-amber-500" />
                    <p className="text-xs text-gray-600">Le prix mensuel entre <strong>2 000 et 10 000 FCFA</strong> est le plus populaire</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky action bar — only step 2 */}
      {step === 2 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [transform:translate3d(0,0,0)]">
          <div className="flex gap-2">
            <button
              onClick={handleBack}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={createCommunity}
              disabled={loading}
              className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? <Spinner size="sm" /> : "Créer la communauté"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
