"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { SafeImage } from "@/components/store/SafeImage";
import { Users, Lock, Check, ChevronLeft, ChevronDown, Smartphone, ExternalLink, Copy, Share2 } from "lucide-react";
import { formatPrice, isInAppBrowser } from "@/lib/utils";
import { Modal, Input, Spinner, PhoneInput } from "@/components/ui";
import { api, ApiError, BACKEND_URL } from "@/lib/api";
import { ALL_PAYMENT_COUNTRIES, ALL_OPERATORS, type PaymentOperator } from "@/types";
import { usePaymentConfig } from "@/lib/usePaymentConfig";
import type { Community, LeadField } from "@/types";

const PERIOD_LABELS: Record<string, string> = {
  WEEKLY: "/ sem.",
  BIWEEKLY: "/ 15j",
  MONTHLY: "/ mois",
  QUARTERLY: "/ trim.",
  YEARLY: "/ an",
};

const PERIOD_TEXT: Record<string, string> = {
  WEEKLY: "hebdomadaire renouvelé chaque semaine",
  BIWEEKLY: "bimensuel renouvelé tous les 15 jours",
  MONTHLY: "mensuel renouvelé chaque mois",
  QUARTERLY: "trimestriel renouvelé tous les 3 mois",
  YEARLY: "annuel renouvelé chaque année",
};

interface CommunityBlockProps {
  community: Community;
  sellerSlug: string;
}

interface SubscribeResponse {
  subscription: { id: string };
  payment: { id: string; reference: string };
  redirectUrl?: string;
  link?: string;
  qrCode?: string;
  message?: string;
}

export function CommunityBlock({ community, sellerSlug }: CommunityBlockProps) {
  const [showModal, setShowModal] = useState(false);

  const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--theme-card-bg, #FFFFFF)",
    border: "1px solid var(--theme-card-border, #E5E7EB)",
    borderRadius: "var(--theme-card-radius, 16px)",
    boxShadow: "var(--theme-card-shadow, none)",
    backdropFilter: "var(--theme-card-backdrop, none)",
  };

  const btnStyle: React.CSSProperties = {
    backgroundColor: "var(--theme-btn-bg, #0D9488)",
    color: "var(--theme-btn-color, #FFFFFF)",
    border: "var(--theme-btn-border, none)",
    borderRadius: "var(--theme-btn-radius, 12px)",
  };

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden px-4 py-4 transition-all" style={cardStyle}>
        <div className="flex flex-1 items-start gap-3">
          {/* Thumbnail à gauche : image cover ou icône */}
          {community.coverUrl ? (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 md:h-[88px] md:w-[88px]">
              <SafeImage
                src={community.coverUrl}
                alt={community.title}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl md:h-[88px] md:w-[88px]"
              style={{ backgroundColor: "var(--theme-btn-bg, #0D9488)", opacity: 0.12 }}
            >
              <Users size={22} style={{ color: "var(--theme-btn-bg, #0D9488)" }} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3
              className="text-sm font-bold leading-tight md:text-base"
              style={{ color: "var(--theme-text, #111827)" }}
            >
              {community.title}
            </h3>
            {community.description && (
              <p
                className="mt-0.5 line-clamp-2 text-xs md:mt-1 md:line-clamp-2"
                style={{ color: "var(--theme-text-muted, #6B7280)" }}
              >
                {community.description}
              </p>
            )}
            <p
              className="mt-1 text-[11px] md:mt-1.5 md:text-xs"
              style={{ color: "var(--theme-text-muted, #9CA3AF)" }}
            >
              {community.memberCount} membre{community.memberCount !== 1 ? "s" : ""} · {formatPrice(community.priceAmount)} {PERIOD_LABELS[community.billingPeriod] || "/ mois"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="mt-3 w-full py-3 text-sm font-semibold transition-all active:scale-[0.98]"
          style={btnStyle}
        >
          Rejoindre
        </button>
      </div>

      <CommunitySubscribeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        community={community}
        sellerSlug={sellerSlug}
      />
    </>
  );
}

// ── Modal d'abonnement communauté — formulaire unifié ──
export function CommunitySubscribeModal({
  open,
  onClose,
  community,
  sellerSlug,
}: {
  open: boolean;
  onClose: () => void;
  community: Community;
  sellerSlug: string;
}) {
  const [step, setStep] = useState<"form" | "payment" | "otp" | "processing" | "waiting">("form");
  const [waitingData, setWaitingData] = useState<{ qrCode?: string; message?: string; link?: string; reference?: string } | null>(null);
  const [waitingStatus, setWaitingStatus] = useState<"polling" | "paid" | "failed">("polling");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 75;
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [selectedOperator, setSelectedOperator] = useState<PaymentOperator | null>(null);
  const [paymentCountry, setPaymentCountry] = useState("SN");
  const [countryOpen, setCountryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [copied, setCopied] = useState(false);

  const { countries, getOperatorsForCountry, isPhoneMismatch, isOperatorDisabled, detectCountryFromPhone, detectActiveCountryFromPhone } = usePaymentConfig();

  // Resolve fields: use subscribeFields if configured, otherwise default name+phone (no email)
  const configuredFields: LeadField[] = community.subscribeFields && community.subscribeFields.length > 0
    ? community.subscribeFields
    : [
        { id: "f-name", type: "name", label: "Nom", placeholder: "Ton nom", required: true },
        { id: "f-phone", type: "phone", label: "Téléphone", placeholder: "+221 7X XXX XX XX", required: true },
      ];

  // Ensure phone field is always present (required)
  const hasPhoneField = configuredFields.some((f) => f.type === "phone");
  const fields: LeadField[] = hasPhoneField
    ? configuredFields
    : [...configuredFields, { id: "f-phone-auto", type: "phone", label: "Téléphone", placeholder: "+221 7X XXX XX XX", required: true }];

  // Check if email field is present and required
  const emailField = fields.find((f) => f.type === "email");
  const emailRequired = emailField ? emailField.required : false;

  // Step 1 → Step 2: validate info fields
  function handleContinue() {
    if (emailRequired && !email) { setError("Email requis"); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Email invalide"); return; }
    if (!phone.trim()) { setError("Numéro de téléphone requis"); return; }
    // Validate required custom fields
    for (const f of fields) {
      if (!f.required) continue;
      if (f.type === "email" || f.type === "phone") continue;
      if (f.type === "name" && !name.trim()) { setError(`${f.label} est requis`); return; }
      if (f.type === "whatsapp" && !(customValues[f.id] || "").trim()) { setError(`${f.label} est requis`); return; }
      if (f.type === "custom" && !customValues[f.id]?.trim()) { setError(`${f.label} est requis`); return; }
    }
    setError("");
    // Auto-detect country from phone number (fallback OTHER si pays inactif)
    const detected = detectActiveCountryFromPhone(phone);
    setPaymentCountry(detected);
    setSelectedOperator(null);
    setStep("payment");
  }

  // Orange Money CI requires OTP (#144*82#)
  const needsOtp = selectedOperator === "orange_money" && paymentCountry === "CI";

  // Step 2 → OTP (if Orange Money CI) or Processing
  function handlePaymentNext() {
    if (!selectedOperator) { setError("Choisis un moyen de paiement"); return; }
    setError("");
    if (needsOtp) { setStep("otp"); return; }
    handlePay();
  }

  // Step 2/3 → Processing: submit payment
  async function handlePay() {
    if (!selectedOperator) { setError("Choisis un moyen de paiement"); return; }
    if (needsOtp && !otp.trim()) { setError("Entre le code OTP généré via #144*82#"); return; }

    setError("");
    setLoading(true);
    setStep("processing");

    try {
      // Build customFields from non-standard fields
      const cfObj: Record<string, string> = {};
      for (const f of fields) {
        if (f.type === "email" || f.type === "name" || f.type === "phone") continue;
        if (f.type === "whatsapp") {
          const val = customValues[f.id] || "";
          if (val.trim()) cfObj["WhatsApp"] = val.trim();
          continue;
        }
        const val = customValues[f.id];
        if (val?.trim()) cfObj[f.label || f.id] = val.trim();
      }

      let timezone: string | undefined;
      try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* ignore */ }

      const res = await api<SubscribeResponse>(`/api/communities/${community.id}/subscribe`, {
        method: "POST",
        body: {
          email: email.trim() || undefined,
          name: name || undefined,
          phone,
          paymentType: selectedOperator,
          paymentCountry: paymentCountry === "OTHER" ? undefined : paymentCountry,
          ...(Object.keys(cfObj).length > 0 && { customFields: cfObj }),
          ...(otp.trim() && { otp: otp.trim() }),
          timezone,
        },
        baseUrl: BACKEND_URL,
      });

      // Scénario 1: link présent (Wave, Carte, etc.)
      if (res.link) {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        // In-app browser (Facebook, Instagram) → afficher le lien au lieu de redirect (bloqué par WebView)
        // On ne passe PAS le qrCode pour que l'UI affiche les boutons ouvrir/partager/copier
        // Exception: carte bancaire = formulaire web Bictorys → fonctionne dans tous les WebViews
        if (isInAppBrowser() && selectedOperator !== "card") {
          setWaitingData({ link: res.link, reference: res.payment.reference });
          setWaitingStatus("polling");
          setStep("waiting");
          return;
        }
        // Si QR code présent (Wave) → mobile: deep link, desktop: QR + polling
        if (res.qrCode && !isMobile) {
          setWaitingData({ qrCode: res.qrCode, link: res.link, reference: res.payment.reference });
          setWaitingStatus("polling");
          setStep("waiting");
          return;
        }
        // Sinon (carte, Wave mobile) → ouvrir le lien directement
        window.location.href = res.link;
        return;
      }

      // Scénario 2: message USSD (Orange Money CI, MTN CI) → afficher message + polling
      if (res.message) {
        setWaitingData({ message: res.message, reference: res.payment.reference });
        setWaitingStatus("polling");
        setStep("waiting");
        return;
      }

      // Scénario 3: redirectUrl (fallback)
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
        return;
      }

      // Fallback
      window.location.href = `/${sellerSlug}/pending?ref=${res.payment.reference}&type=COMMUNITY&communityId=${community.id}`;
    } catch (err) {
      setStep(needsOtp ? "otp" : "payment");
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Erreur réseau. Réessaye.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Polling pour le step "waiting"
  const pollStatus = useCallback(async () => {
    if (!waitingData?.reference) return;
    try {
      const data = await api<{ status: string }>(
        `/api/orders/${waitingData.reference}/status`,
        { baseUrl: BACKEND_URL }
      );
      if (data.status === "PAID") {
        setWaitingStatus("paid");
        if (pollRef.current) clearTimeout(pollRef.current);
        setTimeout(() => {
          window.location.href = `/${sellerSlug}/community-success?ref=${waitingData.reference}&communityId=${community.id}`;
        }, 1500);
      } else if (data.status === "FAILED") {
        setWaitingStatus("failed");
        if (pollRef.current) clearTimeout(pollRef.current);
      }
    } catch { /* silently retry */ }
  }, [waitingData?.reference, sellerSlug, community.id]);

  useEffect(() => {
    if (step !== "waiting" || waitingStatus !== "polling") return;
    pollCountRef.current = 0;
    const poll = () => {
      if (pollCountRef.current >= MAX_POLLS) {
        setWaitingStatus("failed");
        return;
      }
      pollCountRef.current++;
      pollStatus();
      pollRef.current = setTimeout(poll, 4000);
    };
    pollRef.current = setTimeout(poll, 2000);
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [step, waitingStatus, pollStatus]);

  function handleClose() {
    if (step === "processing") return;
    if (pollRef.current) clearTimeout(pollRef.current);
    setStep("form");
    setError("");
    setEmail("");
    setName("");
    setPhone("");
    setCustomValues({});
    setSelectedOperator(null);
    setWaitingData(null);
    setWaitingStatus("polling");
    setOtp("");
    onClose();
  }

  // Footer changes based on step
  const footerContent = step === "form" ? (
    <>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <button
        onClick={handleContinue}
        className="w-full py-3.5 text-base font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
        style={{
          backgroundColor: "var(--theme-btn-bg, #0D9488)",
          color: "var(--theme-btn-color, #FFFFFF)",
          border: "var(--theme-btn-border, none)",
          borderRadius: "var(--theme-btn-radius, 12px)",
        }}
      >
        Continuer
      </button>
    </>
  ) : step === "payment" ? (
    <>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <button
        onClick={handlePaymentNext}
        disabled={loading || !selectedOperator}
        className="w-full py-3.5 text-base font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
        style={{
          backgroundColor: "var(--theme-btn-bg, #0D9488)",
          color: "var(--theme-btn-color, #FFFFFF)",
          border: "var(--theme-btn-border, none)",
          borderRadius: "var(--theme-btn-radius, 12px)",
        }}
      >
        {loading ? "Chargement..." : needsOtp ? "Suivant" : `Rejoindre — ${formatPrice(community.priceAmount)}`}
      </button>
      {!needsOtp && (
        <p
          className="mt-2 flex items-center justify-center gap-1 text-[10px]"
          style={{ color: "var(--theme-modal-text-muted, #BCBCBC)" }}
        >
          <Lock size={10} />
          Paiement sécurisé via Bictorys
        </p>
      )}
    </>
  ) : step === "otp" ? (
    <>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <button
        onClick={handlePay}
        disabled={loading || !otp.trim()}
        className="w-full py-3.5 text-base font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
        style={{
          backgroundColor: "var(--theme-btn-bg, #0D9488)",
          color: "var(--theme-btn-color, #FFFFFF)",
          border: "var(--theme-btn-border, none)",
          borderRadius: "var(--theme-btn-radius, 12px)",
        }}
      >
        {loading ? "Chargement..." : `Rejoindre — ${formatPrice(community.priceAmount)}`}
      </button>
      <p
        className="mt-2 flex items-center justify-center gap-1 text-[10px]"
        style={{ color: "var(--theme-modal-text-muted, #BCBCBC)" }}
      >
        <Lock size={10} />
        Paiement sécurisé via Bictorys
      </p>
    </>
  ) : step === "waiting" && waitingStatus === "failed" ? (
    <button
      onClick={() => { setStep("payment"); setWaitingData(null); setWaitingStatus("polling"); setError(""); }}
      className="w-full py-3.5 text-base font-semibold transition-all active:scale-[0.98]"
      style={{
        backgroundColor: "var(--theme-btn-bg, #0D9488)",
        color: "var(--theme-btn-color, #FFFFFF)",
        border: "var(--theme-btn-border, none)",
        borderRadius: "var(--theme-btn-radius, 12px)",
      }}
    >
      Réessayer
    </button>
  ) : undefined;

  return (
    <Modal open={open} onClose={handleClose} title={community.title} footer={footerContent}>
      {step === "processing" && (
        <div className="flex flex-col items-center py-8">
          <span style={{ color: "var(--theme-primary, #0D9488)" }}><Spinner size="lg" /></span>
          <p className="mt-4 text-sm" style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}>
            Redirection vers le paiement...
          </p>
        </div>
      )}

      {/* Step "waiting": QR code (Wave desktop) ou message USSD (Orange/MTN CI) */}
      {step === "waiting" && waitingData && (
        <div className="flex flex-col items-center py-6">
          {waitingStatus === "paid" ? (
            <>
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: "var(--theme-primary, #0D9488)" }}
              >
                <Check size={28} className="text-white" />
              </div>
              <p className="mt-4 text-base font-semibold" style={{ color: "var(--theme-modal-text, #111827)" }}>
                Paiement confirmé
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}>
                Redirection...
              </p>
            </>
          ) : waitingStatus === "failed" ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-red-600">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="mt-4 text-base font-semibold" style={{ color: "var(--theme-modal-text, #111827)" }}>
                Paiement échoué
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}>
                Vérifie ton solde ou ton code de confirmation.
              </p>
            </>
          ) : (
            <>
              {/* In-app browser (Facebook, Instagram) → boutons ouvrir + partager + copier */}
              {waitingData.link && !waitingData.qrCode && !waitingData.message && (() => {
                const op = ALL_OPERATORS.find((o) => o.id === selectedOperator);
                const opName = op?.name || "le paiement";
                const canShare = typeof navigator !== "undefined" && !!navigator.share;
                return (
                  <div className="flex w-full flex-col items-center">
                    {/* Logo opérateur */}
                    {op?.logoUrl && (
                      <div
                        className="flex h-16 w-16 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${op.color}15` }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={op.logoUrl} alt={op.name} className="h-9 w-auto object-contain" />
                      </div>
                    )}

                    {/* Montant */}
                    <p className="mt-3 text-xl font-extrabold" style={{ color: "var(--theme-modal-text, #111827)" }}>
                      {formatPrice(community.priceAmount)}
                    </p>

                    {/* Explication simple */}
                    <p
                      className="mt-2 text-center text-xs leading-relaxed"
                      style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}
                    >
                      Pour finaliser, ouvre le lien de paiement dans ton navigateur
                    </p>

                    {/* Bouton principal — Ouvrir */}
                    <a
                      href={waitingData.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex w-full items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
                      style={{ backgroundColor: "var(--theme-btn-bg, #0D9488)", borderRadius: "var(--theme-btn-radius, 12px)" }}
                    >
                      <ExternalLink size={16} />
                      Ouvrir {opName}
                    </a>

                    {/* Bouton secondaire — Partager vers Safari/Chrome (si navigator.share dispo) */}
                    {canShare && (
                      <button
                        type="button"
                        onClick={() => { navigator.share({ title: `Paiement ${opName}`, url: waitingData.link! }).catch(() => {}); }}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 border py-3 text-xs font-semibold transition-all active:scale-[0.98]"
                        style={{ borderColor: "var(--theme-modal-border, #E5E7EB)", color: "var(--theme-modal-text, #111827)", borderRadius: "var(--theme-btn-radius, 12px)" }}
                      >
                        <Share2 size={14} />
                        Ouvrir dans Safari / Chrome
                      </button>
                    )}

                    {/* Copier le lien — discret */}
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(waitingData.link!).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="mt-2 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-all"
                      style={{ color: "var(--theme-modal-text-muted, #9CA3AF)" }}
                    >
                      {copied ? <><Check size={11} /> Lien copié</> : <><Copy size={11} /> Copier le lien</>}
                    </button>

                    {/* Sécurité */}
                    <p
                      className="mt-3 flex items-center justify-center gap-1 text-[10px]"
                      style={{ color: "var(--theme-modal-text-muted, #BCBCBC)" }}
                    >
                      <Lock size={10} />
                      Paiement sécurisé via Bictorys
                    </p>
                  </div>
                );
              })()}

              {/* QR Code (Wave desktop) */}
              {waitingData.qrCode && (
                <div className="flex flex-col items-center">
                  <p className="mb-3 text-sm font-semibold" style={{ color: "var(--theme-modal-text, #111827)" }}>
                    Scanne ce QR code avec {ALL_OPERATORS.find((o) => o.id === selectedOperator)?.name || "ton app"}
                  </p>
                  <div className="overflow-hidden rounded-2xl border-2 p-2" style={{ borderColor: "var(--theme-modal-border, #E5E7EB)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={waitingData.qrCode.startsWith("data:") ? waitingData.qrCode : `data:image/png;base64,${waitingData.qrCode}`}
                      alt={`QR Code paiement ${ALL_OPERATORS.find((o) => o.id === selectedOperator)?.name || "mobile money"}`}
                      className="h-48 w-48 object-contain"
                    />
                  </div>
                  {waitingData.link && (
                    <a
                      href={waitingData.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1.5 text-xs font-medium underline"
                      style={{ color: "var(--theme-primary, #0D9488)" }}
                    >
                      <Smartphone size={14} />
                      Ouvrir dans l&apos;app {ALL_OPERATORS.find((o) => o.id === selectedOperator)?.name || "de paiement"}
                    </a>
                  )}
                </div>
              )}

              {/* Message USSD (Orange Money CI, MTN CI) */}
              {!waitingData.qrCode && waitingData.message && (
                <div className="flex flex-col items-center">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--theme-input-bg, #F0FDFA)" }}
                  >
                    <Smartphone size={24} style={{ color: "var(--theme-primary, #0D9488)" }} />
                  </div>
                  <p className="mt-4 text-sm font-semibold" style={{ color: "var(--theme-modal-text, #111827)" }}>
                    Confirme le paiement sur ton téléphone
                  </p>
                  <div
                    className="mt-3 w-full rounded-xl px-4 py-3 text-center text-sm"
                    style={{ backgroundColor: "var(--theme-input-bg, #F9FAFB)", color: "var(--theme-modal-text, #111827)" }}
                  >
                    {waitingData.message}
                  </div>
                </div>
              )}

              {/* Indicateur de polling */}
              <div className="mt-5 flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: "var(--theme-primary, #0D9488)", animation: "pulse 1.5s ease-in-out infinite" }}
                />
                <p className="text-xs" style={{ color: "var(--theme-modal-text-muted, #9CA3AF)" }}>
                  En attente de confirmation...
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 1: Informations */}
      {step === "form" && (
        <div className="space-y-4">
          <div
            className="rounded-xl px-4 py-3 text-center"
            style={{ backgroundColor: "var(--theme-input-bg, #F9FAFB)" }}
          >
            <div className="flex items-center justify-center gap-2">
              <Users size={18} style={{ color: "var(--theme-primary, #0D9488)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--theme-modal-text, #111827)" }}>
                {community.title}
              </p>
            </div>
            <p className="mt-1 text-2xl font-extrabold" style={{ color: "var(--theme-modal-text, #111827)" }}>
              {formatPrice(community.priceAmount)} <span className="text-sm font-normal" style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}>{PERIOD_LABELS[community.billingPeriod] || "/ mois"}</span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2" style={{ backgroundColor: "var(--theme-input-bg, #F0F9FF)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0088cc"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.53 8.13l-1.8 8.48c-.13.6-.5.74-.99.46l-2.74-2.02-1.32 1.27c-.15.15-.27.27-.55.27l.2-2.77 5.07-4.58c.22-.2-.05-.3-.34-.12l-6.27 3.95-2.7-.84c-.59-.18-.6-.59.12-.87l10.56-4.07c.49-.18.91.12.76.84z"/></svg>
            <span className="text-xs font-medium" style={{ color: "var(--theme-modal-text-muted, #374151)" }}>Groupe / Canal Telegram</span>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}>
            En rejoignant, tu acceptes un abonnement {PERIOD_TEXT[community.billingPeriod] || "mensuel renouvelé chaque mois"}. Tu recevras le lien Telegram après le paiement. Tu peux annuler à tout moment.
          </p>

          {fields.map((field) => {
            if (field.type === "email") {
              return (
                <Input
                  key={field.id}
                  label={`Email${!field.required ? " (optionnel)" : ""}`}
                  type="email"
                  placeholder={field.placeholder || "toi@email.com"}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                  required={field.required}
                  autoComplete="email"
                  error={email.length > 3 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Email invalide" : undefined}
                />
              );
            }
            if (field.type === "phone") {
              return (
                <PhoneInput
                  key={field.id}
                  label="Téléphone"
                  value={phone}
                  onChange={(fullNumber) => { setPhone(fullNumber); if (error) setError(""); }}
                  required
                />
              );
            }
            if (field.type === "name") {
              return (
                <Input
                  key={field.id}
                  label={`${field.label || "Nom"}${!field.required ? " (optionnel)" : ""}`}
                  placeholder={field.placeholder || "Ton nom"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              );
            }
            if (field.type === "whatsapp") {
              return (
                <Input
                  key={field.id}
                  label={`${field.label}${!field.required ? " (optionnel)" : ""}`}
                  type="tel"
                  placeholder={field.placeholder || "+221 77 000 00 00"}
                  value={customValues[field.id] || ""}
                  onChange={(e) => setCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                />
              );
            }
            // Custom fields
            return (
              <Input
                key={field.id}
                label={`${field.label}${!field.required ? " (optionnel)" : ""}`}
                placeholder={field.placeholder || ""}
                value={customValues[field.id] || ""}
                onChange={(e) => setCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
              />
            );
          })}
        </div>
      )}

      {/* Step 2: Moyen de paiement */}
      {step === "payment" && (
        <div className="space-y-4">
          {/* Retour + Country selector */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => { setStep("form"); setError(""); }}
              className="flex items-center gap-1 text-sm font-medium transition-colors"
              style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}
            >
              <ChevronLeft size={16} />
              Retour
            </button>

            {/* Country dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCountryOpen(!countryOpen)}
                className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  borderColor: "var(--theme-modal-border, #E5E7EB)",
                  color: "var(--theme-modal-text, #111827)",
                  backgroundColor: "var(--theme-input-bg, #F9FAFB)",
                }}
              >
                <span>{countries.find((c) => c.code === paymentCountry)?.flag || ALL_PAYMENT_COUNTRIES.find((c) => c.code === paymentCountry)?.flag}</span>
                <span>{countries.find((c) => c.code === paymentCountry)?.name || ALL_PAYMENT_COUNTRIES.find((c) => c.code === paymentCountry)?.name}</span>
                <ChevronDown size={12} />
              </button>
              {countryOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCountryOpen(false)} />
                  <div
                    className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border shadow-lg"
                    style={{
                      borderColor: "var(--theme-modal-border, #E5E7EB)",
                      backgroundColor: "var(--theme-modal-bg, #FFFFFF)",
                    }}
                  >
                    {countries.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setPaymentCountry(c.code);
                          setSelectedOperator(null);
                          setCountryOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium transition-colors hover:opacity-80"
                        style={{
                          color: "var(--theme-modal-text, #111827)",
                          backgroundColor: c.code === paymentCountry ? "var(--theme-input-bg, #F0FDFA)" : "transparent",
                        }}
                      >
                        <span>{c.flag}</span>
                        <span>{c.name}</span>
                        {c.code === paymentCountry && <Check size={12} className="ml-auto" style={{ color: "var(--theme-primary, #0D9488)" }} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Montant récap */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ backgroundColor: "var(--theme-input-bg, #F9FAFB)" }}
          >
            <span className="text-sm" style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}>Total à payer</span>
            <span className="text-lg font-bold" style={{ color: "var(--theme-modal-text, #111827)" }}>{formatPrice(community.priceAmount)}</span>
          </div>

          {/* Avertissement si le numéro ne correspond pas au pays */}
          {isPhoneMismatch(paymentCountry, phone) && (
            <div
              className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-xs leading-relaxed"
              style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 shrink-0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z"/></svg>
              <span>
                Pour payer par mobile money, sélectionne <button type="button" onClick={() => { setPaymentCountry(detectCountryFromPhone(phone)); setSelectedOperator(null); }} className="font-semibold underline">{ALL_PAYMENT_COUNTRIES.find((c) => c.code === detectCountryFromPhone(phone))?.name}</button> ou <button type="button" onClick={() => { setStep("form"); setError(""); }} className="font-semibold underline">modifie ton numéro</button>.
              </span>
            </div>
          )}

          {/* Moyen de paiement */}
          <div className="space-y-2">
            {[...getOperatorsForCountry(paymentCountry)].sort((a, b) => {
              const aDisabled = isOperatorDisabled(a.id, paymentCountry, phone) ? 1 : 0;
              const bDisabled = isOperatorDisabled(b.id, paymentCountry, phone) ? 1 : 0;
              return aDisabled - bDisabled;
            }).map((op) => {
              const disabled = isOperatorDisabled(op.id, paymentCountry, phone);
              const isSelected = selectedOperator === op.id;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => { if (disabled) return; setSelectedOperator(op.id); if (error) setError(""); }}
                  aria-label={`Payer avec ${op.name}`}
                  aria-pressed={isSelected}
                  aria-disabled={disabled}
                  className={`flex w-full items-center gap-3.5 rounded-xl border-2 px-3.5 py-3 text-left transition-all ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  style={{
                    borderColor: isSelected && !disabled ? op.color : "var(--theme-modal-border, #E5E7EB)",
                    backgroundColor: isSelected && !disabled ? op.bgColor : "var(--theme-modal-bg, #FFFFFF)",
                  }}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: isSelected && !disabled ? `${op.color}15` : "var(--theme-input-bg, #F5F5F5)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={op.logoUrl}
                      alt={op.name}
                      className="h-7 w-auto object-contain"
                      loading="lazy"
                    />
                  </div>
                  <span
                    className="flex-1 text-sm font-semibold"
                    style={{ color: "var(--theme-modal-text, #111827)" }}
                  >
                    {op.name}
                  </span>
                  {/* Radio indicator */}
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all"
                    style={{
                      borderColor: isSelected && !disabled ? op.color : "var(--theme-modal-border, #D1D5DB)",
                      backgroundColor: isSelected && !disabled ? op.color : "transparent",
                    }}
                  >
                    {isSelected && !disabled && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      )}

      {/* Step OTP dédié — Orange Money CI */}
      {step === "otp" && (
        <div className="space-y-5">
          {/* Retour */}
          <button
            type="button"
            onClick={() => { setStep("payment"); setError(""); }}
            className="flex items-center gap-1 text-sm font-medium transition-colors"
            style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}
          >
            <ChevronLeft size={16} />
            Retour
          </button>

          {/* Icône Orange */}
          <div className="flex flex-col items-center pt-2">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "#FFF7ED" }}
            >
              <img
                src="/orange-money.png"
                alt="Orange Money"
                className="h-9 w-9 rounded-lg object-contain"
              />
            </div>
            <h3
              className="mt-3 text-base font-bold"
              style={{ color: "var(--theme-modal-text, #111827)" }}
            >
              Orange Money — Code OTP
            </h3>
            <p
              className="mt-1 text-center text-sm leading-relaxed"
              style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}
            >
              Compose <span className="font-bold" style={{ color: "var(--theme-modal-text, #111827)" }}>#144*82#</span> sur ton téléphone pour générer ton code OTP
            </p>
          </div>

          {/* Input OTP */}
          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              autoFocus
              placeholder="Code OTP"
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/[^0-9]/g, "")); if (error) setError(""); }}
              className="w-full rounded-xl border-2 px-4 py-4 text-center text-2xl font-bold tracking-[0.3em] placeholder:text-sm placeholder:font-normal placeholder:tracking-normal"
              style={{
                borderColor: otp.length > 0 ? "var(--theme-primary, #0D9488)" : "var(--theme-modal-border, #E5E7EB)",
                backgroundColor: "var(--theme-modal-bg, #FFFFFF)",
                color: "var(--theme-modal-text, #111827)",
              }}
            />
            <p
              className="mt-2 text-center text-xs"
              style={{ color: "#EA580C" }}
            >
              Entre le code OTP généré via #144*82#
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
