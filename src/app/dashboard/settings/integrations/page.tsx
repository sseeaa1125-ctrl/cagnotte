"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button, Input, SettingsSkeleton } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { CheckCircle2, ExternalLink, Unplug, ChevronDown, ArrowLeftRight, Info } from "lucide-react";
import { SettingsSubPage } from "../_shared";

type EmailProvider = "brevo" | "systemeio";
type SyncEvents = "all" | "clients" | "leads";

interface EmailList {
  id: string;
  name: string;
  memberCount?: number;
}

interface EmailStatus {
  connected: boolean;
  provider?: string;
  listId?: string | null;
  syncEvents?: string;
  connectedAt?: string;
}

const PROVIDERS: {
  id: EmailProvider;
  name: string;
  fullName: string;
  description: string;
  bgColor: string;
  logoUrl: string;
  placeholder: string;
  helpUrl: string;
  tip: string;
}[] = [
  {
    id: "brevo",
    name: "Brevo",
    fullName: "Brevo (ex Sendinblue)",
    description: "Emailing et marketing automation",
    bgColor: "#ECFDF5",
    logoUrl: "/brevo.png",
    placeholder: "xkeysib-...",
    helpUrl: "https://help.brevo.com/hc/fr/articles/209467485",
    tip: "Assure-toi que \"Blocking unauthorized IP addresses\" est désactivé dans Brevo > Settings > Security.",
  },
  {
    id: "systemeio",
    name: "Systeme.io",
    fullName: "Systeme.io",
    description: "Marketing, tunnels et formations",
    bgColor: "#EFF6FF",
    logoUrl: "/systemeio.png",
    placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpUrl: "https://systeme.io/blog/api",
    tip: "Ta clé API se trouve dans Systeme.io > Settings > API Key.",
  },
];

const SYNC_OPTIONS: { value: SyncEvents; label: string; description: string }[] = [
  { value: "all", label: "Tous les contacts", description: "Clients + Leads" },
  { value: "clients", label: "Clients uniquement", description: "Achats, réservations, dons, communautés" },
  { value: "leads", label: "Leads uniquement", description: "Lead magnets, listes d'attente" },
];

export default function IntegrationsSettingsPage() {
  const { toast } = useToast();
  const { seller } = useAuth();

  // ── Google Calendar state ──
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; email?: string; connectedAt?: string } | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleDisconnecting, setGoogleDisconnecting] = useState(false);

  // ── Email Marketing state ──
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<EmailProvider | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [lists, setLists] = useState<EmailList[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [selectedSyncEvents, setSelectedSyncEvents] = useState<SyncEvents>("all");
  const [fetchingLists, setFetchingLists] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [keyValidated, setKeyValidated] = useState(false);

  // ── Tracking Pixels state ──
  const [pixels, setPixels] = useState<{ metaPixelId: string; googleAdsId: string; googleAnalyticsId: string; tiktokPixelId: string }>({
    metaPixelId: "", googleAdsId: "", googleAnalyticsId: "", tiktokPixelId: "",
  });
  const [pixelsSaved, setPixelsSaved] = useState<typeof pixels | null>(null);
  const [savingPixels, setSavingPixels] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const googleResult = params.get("google");
      if (googleResult === "success") {
        toast("Google Calendar connecté !");
        window.history.replaceState({}, "", window.location.pathname);
      } else if (googleResult === "error") {
        toast("Erreur de connexion Google Calendar", "error");
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

    Promise.all([
      api<{ connected: boolean; email?: string; connectedAt?: string }>("/api/integrations/google/status")
        .then(setGoogleStatus)
        .catch(() => setGoogleStatus({ connected: false })),
      api<EmailStatus>("/api/integrations/email/status")
        .then((s) => {
          setEmailStatus(s);
          if (s.syncEvents) setSelectedSyncEvents(s.syncEvents as SyncEvents);
        })
        .catch(() => setEmailStatus({ connected: false })),
      api<{ metaPixelId: string | null; googleAdsId: string | null; googleAnalyticsId: string | null; tiktokPixelId: string | null }>("/api/integrations/pixels")
        .then((p) => {
          const data = {
            metaPixelId: p.metaPixelId || "",
            googleAdsId: p.googleAdsId || "",
            googleAnalyticsId: p.googleAnalyticsId || "",
            tiktokPixelId: p.tiktokPixelId || "",
          };
          setPixels(data);
          setPixelsSaved(data);
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  async function handleFetchLists() {
    if (!selectedProvider || !apiKey) return;
    setFetchingLists(true);
    setEmailError("");
    setKeyValidated(false);
    setLists([]);
    try {
      const res = await api<{ lists: EmailList[] }>("/api/integrations/email/lists", {
        method: "POST",
        body: { provider: selectedProvider, apiKey },
      });
      setLists(res.lists);
      setKeyValidated(true);
      if (res.lists.length > 0) setSelectedListId(res.lists[0].id);
    } catch (err) {
      setEmailError(err instanceof ApiError ? err.message : "Clé API invalide");
      setKeyValidated(false);
    } finally {
      setFetchingLists(false);
    }
  }

  async function handleConnect() {
    if (!selectedProvider || !apiKey) return;
    setConnecting(true);
    setEmailError("");
    try {
      const listIdToSend = selectedProvider === "systemeio" && selectedListId
        ? lists.find((l) => l.id === selectedListId)?.name || selectedListId
        : selectedListId;
      await api("/api/integrations/email/connect", {
        method: "POST",
        body: { provider: selectedProvider, apiKey, listId: listIdToSend || undefined, syncEvents: selectedSyncEvents },
      });
      setEmailStatus({ connected: true, provider: selectedProvider, listId: selectedListId, syncEvents: selectedSyncEvents });
      setApiKey("");
      setLists([]);
      setKeyValidated(false);
      setSelectedProvider(null);
      toast("Outil email marketing connecté !");
    } catch (err) {
      setEmailError(err instanceof ApiError ? err.message : "Erreur de connexion");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await api("/api/integrations/email/disconnect", { method: "DELETE" });
      setEmailStatus({ connected: false });
      toast("Outil email marketing déconnecté");
    } catch {
      toast("Erreur lors de la déconnexion", "error");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSyncEventsChange(value: SyncEvents) {
    setSelectedSyncEvents(value);
    if (emailStatus?.connected) {
      try {
        await api("/api/integrations/email/sync-events", {
          method: "PUT",
          body: { syncEvents: value },
        });
        setEmailStatus((prev) => prev ? { ...prev, syncEvents: value } : prev);
      } catch {
        toast("Erreur lors de la mise à jour", "error");
      }
    }
  }

  const connectedProviderInfo = emailStatus?.provider
    ? PROVIDERS.find((p) => p.id === emailStatus.provider)
    : null;
  const activeProviderInfo = selectedProvider
    ? PROVIDERS.find((p) => p.id === selectedProvider)
    : null;

  if (loading) return <SettingsSkeleton />;

  return (
    <SettingsSubPage title="Intégrations">
      <div className="space-y-5">

        {/* ═══ Google Calendar card ═══ */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path d="M18.316 5.684H24v12.632h-5.684V5.684z" fill="#1967D2"/>
                <path d="M5.684 18.316H0V5.684h5.684v12.632z" fill="#188038"/>
                <path d="M18.316 24V18.316H5.684V24h12.632z" fill="#FBBC04"/>
                <path d="M5.684 5.684V0h12.632v5.684H5.684z" fill="#EA4335"/>
                <path d="M18.316 5.684h-3.79v4.737h4.737V6.948a1.263 1.263 0 0 0-1.264-1.264h.317z" fill="#1967D2"/>
                <path d="M5.684 14.527h3.79v-4.737H4.42v3.473a1.263 1.263 0 0 0 1.264 1.264z" fill="#188038"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">Google Calendar & Meet</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Crée automatiquement un lien Google Meet pour chaque réservation confirmée.
              </p>
            </div>
          </div>

          <div className="mt-4">
            {googleStatus?.connected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-green-800">Connecté</p>
                    <p className="text-[11px] text-green-600 truncate">{googleStatus.email}</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setGoogleDisconnecting(true);
                    try {
                      await api("/api/integrations/google/disconnect", { method: "DELETE" });
                      setGoogleStatus({ connected: false });
                      toast("Google Calendar déconnecté");
                    } catch {
                      toast("Erreur lors de la déconnexion", "error");
                    } finally {
                      setGoogleDisconnecting(false);
                    }
                  }}
                  disabled={googleDisconnecting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  <Unplug size={14} />
                  {googleDisconnecting ? "Déconnexion..." : "Déconnecter"}
                </button>
              </div>
            ) : (
              <button
                onClick={async () => {
                  setGoogleLoading(true);
                  try {
                    const res = await api<{ authUrl: string }>("/api/integrations/google/connect");
                    window.location.href = res.authUrl;
                  } catch {
                    toast("Erreur lors de la connexion Google", "error");
                    setGoogleLoading(false);
                  }
                }}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <ExternalLink size={16} />
                {googleLoading ? "Connexion..." : "Connecter Google Calendar"}
              </button>
            )}
          </div>
        </div>

        {/* ═══ Email Marketing card ═══ */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

          {/* Connected state */}
          {emailStatus?.connected && connectedProviderInfo ? (
            <div className="p-5 space-y-5">
              {/* Avatar ↔ Provider logo */}
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full overflow-hidden bg-gray-100 ring-2 ring-white shadow-sm">
                    {seller?.avatarUrl ? (
                      <Image src={seller.avatarUrl} alt="" width={56} height={56} className="h-full w-full object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-bold text-gray-400">
                        {seller?.displayName?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                  <ArrowLeftRight size={18} className="text-gray-300" />
                  <div className="h-14 w-14 rounded-full overflow-hidden ring-2 ring-white shadow-sm" style={{ backgroundColor: connectedProviderInfo.bgColor }}>
                    <img src={connectedProviderInfo.logoUrl} alt={connectedProviderInfo.name} width={56} height={56} className="h-full w-full object-contain p-2" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">
                    {seller?.displayName || "Mon store"} <span className="text-gray-400 font-normal">×</span> {connectedProviderInfo.fullName}
                  </p>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5">
                    <CheckCircle2 size={12} className="text-green-600" />
                    <span className="text-[11px] font-semibold text-green-700">Connecté</span>
                  </div>
                </div>
              </div>

              {/* Sync events selector */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Synchroniser</p>
                <div className="grid gap-1.5">
                  {SYNC_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSyncEventsChange(opt.value)}
                      className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                        selectedSyncEvents === opt.value
                          ? "border-teal-300 bg-teal-50 ring-1 ring-teal-200"
                          : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <div className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                        selectedSyncEvents === opt.value ? "border-teal-600" : "border-gray-300"
                      }`}>
                        {selectedSyncEvents === opt.value && (
                          <div className="h-2 w-2 rounded-full bg-teal-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{opt.label}</p>
                        <p className="text-[10px] text-gray-400">{opt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Formations info — only for Systeme.io */}
              {emailStatus.provider === "systemeio" && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Formations</p>
                  <div className="flex items-start gap-2.5 rounded-xl border border-violet-100 bg-violet-50/50 px-3.5 py-3">
                    <span className="mt-0.5 text-base">🎓</span>
                    <div>
                      <p className="text-xs font-semibold text-violet-900">Inscription automatique aux cours</p>
                      <p className="mt-0.5 text-[11px] text-violet-600">
                        Quand un client achète un bloc &quot;Formation&quot;, il est automatiquement inscrit au cours Systeme.io associé. Configure le cours dans l&apos;onglet &quot;Formation&quot; de chaque bloc.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-red-500 disabled:opacity-50"
              >
                <Unplug size={14} />
                {disconnecting ? "Déconnexion..." : "Déconnecter"}
              </button>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="p-5 pb-4">
                <p className="text-sm font-bold text-gray-900">Email Marketing</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Exporte automatiquement les emails de tes clients et leads vers ton outil marketing.
                </p>
              </div>

              {/* Provider selection with connect visual when selected */}
              {activeProviderInfo ? (
                <div className="px-5 pb-5 space-y-4">
                  {/* Avatar ↔ Provider logo visual */}
                  <div className="flex flex-col items-center gap-3 py-3 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full overflow-hidden bg-white ring-2 ring-white shadow-sm">
                        {seller?.avatarUrl ? (
                          <Image src={seller.avatarUrl} alt="" width={48} height={48} className="h-full w-full object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-base font-bold text-gray-400 bg-gray-100">
                            {seller?.displayName?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>
                      <ArrowLeftRight size={16} className="text-gray-300" />
                      <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-white shadow-sm" style={{ backgroundColor: activeProviderInfo.bgColor }}>
                        <img src={activeProviderInfo.logoUrl} alt={activeProviderInfo.name} width={48} height={48} className="h-full w-full object-contain p-1.5" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Connecte <span className="font-semibold text-gray-900">{activeProviderInfo.fullName}</span> à Izy
                    </p>
                  </div>

                  {/* Tip */}
                  <div className="flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/50 p-3">
                    <Info size={14} className="mt-0.5 shrink-0 text-teal-600" />
                    <p className="text-[11px] text-teal-700">{activeProviderInfo.tip}</p>
                  </div>

                  {/* API key */}
                  <Input
                    label="Clé API"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={activeProviderInfo.placeholder}
                  />
                  <a
                    href={activeProviderInfo.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:underline -mt-2"
                  >
                    <ExternalLink size={10} />
                    Comment trouver ma clé API ?
                  </a>

                  {/* Fetch lists */}
                  {apiKey.length >= 5 && !keyValidated && (
                    <Button onClick={handleFetchLists} loading={fetchingLists} variant="secondary" size="sm">
                      {fetchingLists ? "Vérification..." : "Vérifier la clé"}
                    </Button>
                  )}

                  {/* Key validated indicator */}
                  {keyValidated && (
                    <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5">
                      <CheckCircle2 size={14} className="text-green-600" />
                      <p className="text-xs font-semibold text-green-700">Clé API valide</p>
                    </div>
                  )}

                  {/* No lists/tags found notice */}
                  {keyValidated && lists.length === 0 && (
                    <p className="text-xs text-gray-500">
                      {selectedProvider === "systemeio"
                        ? "Aucun tag trouvé dans ton compte. Les contacts seront ajoutés sans tag."
                        : "Aucune liste trouvée. Crée une liste dans Brevo avant de connecter."}
                    </p>
                  )}

                  {/* List selection */}
                  {lists.length > 0 && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Liste / Audience</label>
                      <div className="relative">
                        <select
                          value={selectedListId}
                          onChange={(e) => setSelectedListId(e.target.value)}
                          className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                        >
                          {lists.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}{l.memberCount != null ? ` (${l.memberCount})` : ""}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>
                  )}

                  {/* Sync events selector */}
                  {keyValidated && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Quels contacts synchroniser ?</label>
                      <div className="grid gap-1.5">
                        {SYNC_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setSelectedSyncEvents(opt.value)}
                            className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                              selectedSyncEvents === opt.value
                                ? "border-teal-300 bg-teal-50 ring-1 ring-teal-200"
                                : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                            }`}
                          >
                            <div className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                              selectedSyncEvents === opt.value ? "border-teal-600" : "border-gray-300"
                            }`}>
                              {selectedSyncEvents === opt.value && (
                                <div className="h-2 w-2 rounded-full bg-teal-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">{opt.label}</p>
                              <p className="text-[10px] text-gray-400">{opt.description}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Formations info — only for Systeme.io during connection */}
                  {selectedProvider === "systemeio" && keyValidated && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-violet-100 bg-violet-50/50 px-3.5 py-3">
                      <span className="mt-0.5 text-base">🎓</span>
                      <div>
                        <p className="text-xs font-semibold text-violet-900">Formations incluses</p>
                        <p className="mt-0.5 text-[11px] text-violet-600">
                          En connectant Systeme.io, tes cours seront disponibles dans les blocs &quot;Formation&quot;. Les acheteurs seront automatiquement inscrits après paiement.
                        </p>
                      </div>
                    </div>
                  )}

                  {emailError && <p className="text-xs text-red-600">{emailError}</p>}

                  {/* Connect button */}
                  {keyValidated && (
                    <Button onClick={handleConnect} loading={connecting} className="w-full">
                      Connecter {activeProviderInfo.name}
                    </Button>
                  )}

                  {/* Back to provider list */}
                  <button
                    onClick={() => { setSelectedProvider(null); setApiKey(""); setLists([]); setEmailError(""); setKeyValidated(false); }}
                    className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1"
                  >
                    Changer d&apos;outil
                  </button>
                </div>
              ) : (
                <div className="px-5 pb-5 space-y-2">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProvider(p.id); setApiKey(""); setLists([]); setEmailError(""); setKeyValidated(false); }}
                      className="flex w-full items-center gap-3.5 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-left transition-all hover:border-gray-300 hover:shadow-sm active:scale-[0.99]"
                    >
                      <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: p.bgColor }}>
                        <img src={p.logoUrl} alt={p.name} width={40} height={40} className="h-full w-full object-contain p-1.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">{p.fullName}</p>
                        <p className="text-[11px] text-gray-400">{p.description}</p>
                      </div>
                      <ChevronDown size={16} className="-rotate-90 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-[11px] text-gray-400">
            Chaque nouveau contact est automatiquement envoyé vers ta liste avec le tag <span className="font-semibold">client</span> ou <span className="font-semibold">lead</span> selon le type d&apos;action.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* TRACKING PIXELS                            */}
      {/* ═══════════════════════════════════════════ */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Pixels de suivi</h3>
          <p className="mt-0.5 text-xs text-gray-500">Ajoute tes pixels pour suivre les conversions sur ta page publique.</p>
        </div>

        <div className="space-y-3">
          {/* Meta (Facebook) Pixel */}
          <PixelField
            label="Meta Pixel (Facebook)"
            placeholder="123456789012345"
            formatHint="10 à 20 chiffres"
            value={pixels.metaPixelId}
            savedValue={pixelsSaved?.metaPixelId || ""}
            onChange={(v) => setPixels((prev) => ({ ...prev, metaPixelId: v }))}
            helpUrl="https://www.facebook.com/business/help/952192354843755"
            helpText="Business Manager → Sources de données → Pixels"
            icon={
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            }
          />

          {/* Google Analytics (GA4) */}
          <PixelField
            label="Google Analytics (GA4)"
            placeholder="G-XXXXXXXXXX"
            formatHint="Format : G-XXXXXXXXXX"
            value={pixels.googleAnalyticsId}
            savedValue={pixelsSaved?.googleAnalyticsId || ""}
            onChange={(v) => setPixels((prev) => ({ ...prev, googleAnalyticsId: v }))}
            helpUrl="https://support.google.com/analytics/answer/9539598"
            helpText="Admin → Flux de données → ID de mesure"
            icon={
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5">
                <path fill="#F9AB00" d="M21.5 5v14c0 1.38-1.12 2.5-2.5 2.5h-3V2.5h3C20.38 2.5 21.5 3.62 21.5 5z" />
                <path fill="#E37400" d="M13 2.5h3v19h-3z" />
                <circle fill="#F9AB00" cx="6.5" cy="18.5" r="3" />
              </svg>
            }
          />

          {/* Google Ads */}
          <PixelField
            label="Google Ads"
            placeholder="AW-XXXXXXXXXX"
            formatHint="Format : AW-XXXXXXXXX"
            value={pixels.googleAdsId}
            savedValue={pixelsSaved?.googleAdsId || ""}
            onChange={(v) => setPixels((prev) => ({ ...prev, googleAdsId: v }))}
            helpUrl="https://support.google.com/google-ads/answer/6095821"
            helpText="Outils → Conversions → Tag ID"
            icon={
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5">
                <path fill="#4285F4" d="M3.27 12l6.6 11.44a3.3 3.3 0 005.72-3.3L8.99 8.7z" />
                <path fill="#34A853" d="M20.73 12L14.13.56a3.3 3.3 0 00-5.72 3.3l6.6 11.44z" />
                <circle fill="#FBBC04" cx="6.57" cy="18.73" r="3.3" />
              </svg>
            }
          />

          {/* TikTok Pixel */}
          <PixelField
            label="TikTok Pixel"
            placeholder="CXXXXXXXXXXXXXXXXX"
            formatHint="Format : CXXXXXXXXX"
            value={pixels.tiktokPixelId}
            savedValue={pixelsSaved?.tiktokPixelId || ""}
            onChange={(v) => setPixels((prev) => ({ ...prev, tiktokPixelId: v }))}
            helpUrl="https://ads.tiktok.com/help/article/get-started-pixel"
            helpText="TikTok Ads Manager → Événements → Pixel"
            icon={
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="#000000">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-.88-.14 2.88 2.88 0 01-2-2.72 2.89 2.89 0 012.88-2.89c.3 0 .59.05.87.13V9.04a6.3 6.3 0 00-.87-.06 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 009.03 5.73 6.3 6.3 0 003.65-5.73V9.06a8.16 8.16 0 004.76 1.51v-3.4a4.85 4.85 0 01-1-.48z" />
              </svg>
            }
          />
        </div>

        {/* Save button — only shows if pixels changed */}
        {pixelsSaved && (
          JSON.stringify(pixels) !== JSON.stringify(pixelsSaved) ? (
            <Button
              onClick={async () => {
                setSavingPixels(true);
                try {
                  await api("/api/integrations/pixels", {
                    method: "PUT",
                    body: {
                      metaPixelId: pixels.metaPixelId || null,
                      googleAdsId: pixels.googleAdsId || null,
                      googleAnalyticsId: pixels.googleAnalyticsId || null,
                      tiktokPixelId: pixels.tiktokPixelId || null,
                    },
                  });
                  setPixelsSaved({ ...pixels });
                  toast("Pixels sauvegardés !");
                } catch (err) {
                  toast(err instanceof ApiError ? err.message : "Erreur lors de la sauvegarde", "error");
                } finally {
                  setSavingPixels(false);
                }
              }}
              loading={savingPixels}
              className="w-full"
            >
              Sauvegarder les pixels
            </Button>
          ) : (
            (pixels.metaPixelId || pixels.googleAdsId || pixels.googleAnalyticsId || pixels.tiktokPixelId) ? (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5">
                <CheckCircle2 size={14} className="text-green-600" />
                <p className="text-xs font-semibold text-green-700">Pixels actifs sur ta page publique</p>
              </div>
            ) : null
          )
        )}

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-[11px] text-gray-400">
            Les pixels sont injectés automatiquement sur ta page publique. Ils se déclenchent à chaque visite et permettent de suivre tes conversions publicitaires.
          </p>
        </div>
      </div>
    </SettingsSubPage>
  );
}

// ── Pixel input field component ──
function PixelField({
  label,
  placeholder,
  formatHint,
  value,
  savedValue,
  onChange,
  helpUrl,
  helpText,
  icon,
}: {
  label: string;
  placeholder: string;
  formatHint: string;
  value: string;
  savedValue: string;
  onChange: (v: string) => void;
  helpUrl: string;
  helpText: string;
  icon: React.ReactNode;
}) {
  const isActive = savedValue && savedValue.length > 0;
  const isModified = value !== savedValue;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5 space-y-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className="text-[10px] text-gray-400">{formatHint}</p>
        </div>
        {isActive && !isModified && (
          <div className="flex h-5 items-center rounded-full bg-green-100 px-2">
            <span className="text-[10px] font-semibold text-green-700">Actif</span>
          </div>
        )}
        {isModified && (
          <div className="flex h-5 items-center rounded-full bg-amber-100 px-2">
            <span className="text-[10px] font-semibold text-amber-700">Modifié</span>
          </div>
        )}
      </div>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
      />
      <a
        href={helpUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:underline"
      >
        <ExternalLink size={10} />
        {helpText}
      </a>
    </div>
  );
}
