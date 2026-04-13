"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Modal, Input, Spinner, PhoneInput } from "@/components/ui";
import { formatPrice, isInAppBrowser, isTikTokBrowser } from "@/lib/utils";
import { api, ApiError, BACKEND_URL } from "@/lib/api";
import { Lock, Check, ChevronLeft, ChevronDown, Smartphone, ExternalLink, Copy, Share2 } from "lucide-react";
import { ALL_PAYMENT_COUNTRIES, ALL_OPERATORS, type PaymentOperator } from "@/types";
import { usePaymentConfig } from "@/lib/usePaymentConfig";

interface OrderBumpItem {
  id: string;
  title: string;
  description?: string | null;
  price: number;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  amount: number;
  orderType: "SALE" | "BOOKING" | "PAYMENT" | "DONATION";
  sellerSlug: string;
  productId?: string;
  bookingServiceId?: string;
  bookingDate?: string;
  bookingDuration?: number;
  bookingLocation?: string;
  paymentNote?: string;
  donorName?: string;
  donorMessage?: string;
  blockId?: string;
  orderBumps?: OrderBumpItem[];
  onSlotTaken?: () => void;
  prefillEmail?: string;
  prefillName?: string;
  prefillPhone?: string;
  initialStep?: "form" | "payment";
}

interface CreateOrderResponse {
  order: { id: string; reference: string };
  redirectUrl?: string;
  link?: string;
  qrCode?: string;
  message?: string;
}

export function PaymentModal({
  open,
  onClose,
  title,
  amount,
  orderType,
  sellerSlug,
  productId,
  bookingServiceId,
  bookingDate,
  bookingDuration,
  bookingLocation,
  paymentNote,
  donorName,
  donorMessage,
  blockId,
  orderBumps = [],
  onSlotTaken,
  prefillEmail,
  prefillName,
  prefillPhone,
  initialStep = "form",
}: PaymentModalProps) {
  const [step, setStep] = useState<"form" | "payment" | "otp" | "processing" | "waiting">(initialStep || "form");
  const [waitingData, setWaitingData] = useState<{ qrCode?: string; message?: string; link?: string; reference?: string } | null>(null);
  const [waitingStatus, setWaitingStatus] = useState<"polling" | "paid" | "failed">("polling");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 75; // ~5 minutes (75 × 4s)
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedOperator, setSelectedOperator] = useState<PaymentOperator | null>(null);
  const [paymentCountry, setPaymentCountry] = useState("SN");
  const [countryOpen, setCountryOpen] = useState(false);
  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [copied, setCopied] = useState(false);

  const { countries, getOperatorsForCountry, isPhoneMismatch, isOperatorDisabled, detectCountryFromPhone, detectActiveCountryFromPhone } = usePaymentConfig();

  // Pre-fill values when modal opens
  useEffect(() => {
    if (open) {
      setEmail(prefillEmail || "");
      setName(prefillName || donorName || "");
      setPhone(prefillPhone || "");
      setStep(initialStep || "form");
      // Auto-detect country from prefilled phone when skipping form step
      if (initialStep === "payment" && prefillPhone) {
        setPaymentCountry(detectActiveCountryFromPhone(prefillPhone));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const bumpTotal = orderBumps.filter((b) => selectedBumps.has(b.id)).reduce((sum, b) => sum + b.price, 0);
  const totalAmount = amount + bumpTotal;

  // Step 1 → Step 2: validate info fields
  function handleContinue() {
    if (!name.trim()) { setError("Nom requis"); return; }
    if (!phone.trim()) { setError("Numéro de téléphone requis"); return; }
    if (!email) { setError("Email requis"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Email invalide"); return; }
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
    if (!selectedOperator) {
      setError("Choisis un moyen de paiement");
      return;
    }
    setError("");
    if (needsOtp) {
      setStep("otp");
      return;
    }
    handlePay();
  }

  // Step 2/3 → Processing: submit payment
  async function handlePay() {
    if (!selectedOperator) {
      setError("Choisis un moyen de paiement");
      return;
    }
    if (needsOtp && !otp.trim()) {
      setError("Entre le code OTP généré via #144*82#");
      return;
    }

    setError("");
    setLoading(true);
    setStep("processing");

    try {
      const body: Record<string, unknown> = {
        sellerSlug,
        orderType,
        amount: totalAmount,
        paymentType: selectedOperator,
        paymentCountry: paymentCountry === "OTHER" ? undefined : paymentCountry,
        customerEmail: email.trim() || undefined,
        customerName: name || undefined,
        customerPhone: phone,
      };

      if (productId) body.productId = productId;
      if (bookingServiceId) body.bookingServiceId = bookingServiceId;
      if (bookingDate) body.bookingDate = bookingDate;
      if (bookingDuration) body.bookingDuration = bookingDuration;
      if (bookingLocation) body.bookingLocation = bookingLocation;
      if (paymentNote) body.paymentNote = paymentNote;
      if (donorMessage) body.donorMessage = donorMessage;
      if (blockId) body.blockId = blockId;
      if (donorName && !name) body.customerName = donorName;
      if (otp.trim()) body.otp = otp.trim();
      if (selectedBumps.size > 0) {
        body.selectedBumpIds = Array.from(selectedBumps);
      }
      // Track referrer source for conversion analytics
      if (document.referrer) body.referrer = document.referrer;
      // Timezone pour détection pays acheteur (Wave CI vs Wave SN)
      try { body.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* ignore */ }

      const res = await api<CreateOrderResponse>("/api/orders", {
        method: "POST",
        body,
        baseUrl: BACKEND_URL,
      });

      // Scénario 1: link présent (Wave, Carte, etc.)
      if (res.link) {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        // In-app browser (Facebook, Instagram) → afficher le lien au lieu de redirect (bloqué par WebView)
        // On ne passe PAS le qrCode pour que l'UI affiche les boutons ouvrir/partager/copier
        // Exception: carte bancaire = formulaire web Bictorys → fonctionne dans tous les WebViews
        if (isInAppBrowser() && selectedOperator !== "card") {
          setWaitingData({ link: res.link, reference: res.order.reference });
          setWaitingStatus("polling");
          setStep("waiting");
          return;
        }
        // Si QR code présent (Wave) → mobile: deep link, desktop: QR + polling
        if (res.qrCode && !isMobile) {
          setWaitingData({ qrCode: res.qrCode, link: res.link, reference: res.order.reference });
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
        setWaitingData({ message: res.message, reference: res.order.reference });
        setWaitingStatus("polling");
        setStep("waiting");
        return;
      }

      // Scénario 3: redirectUrl (fallback)
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
        return;
      }

      // Fallback: page d'attente
      window.location.href = `/${sellerSlug}/pending?ref=${res.order.reference}&type=${orderType}`;
    } catch (err) {
      if (err instanceof ApiError) {
        // SLOT_TAKEN: close modal and let parent reopen booking calendar
        if (err.status === 409 && onSlotTaken) {
          handleClose();
          onSlotTaken();
          return;
        }
        // Return to OTP step if that's where we came from, otherwise payment step
        setStep(needsOtp ? "otp" : "payment");
        setError(err.message);
      } else {
        setStep(needsOtp ? "otp" : "payment");
        setError("Erreur réseau. Réessaye.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Polling pour le step "waiting" (QR code ou message USSD)
  const pollStatus = useCallback(async () => {
    if (!waitingData?.reference) return;
    try {
      const data = await api<{ status: string; orderType: string }>(
        `/api/orders/${waitingData.reference}/status`,
        { baseUrl: BACKEND_URL }
      );
      if (data.status === "PAID") {
        setWaitingStatus("paid");
        if (pollRef.current) clearTimeout(pollRef.current);
        setTimeout(() => {
          window.location.href = `/${sellerSlug}/success?ref=${waitingData.reference}&type=${orderType}`;
        }, 1500);
      } else if (data.status === "FAILED") {
        setWaitingStatus("failed");
        if (pollRef.current) clearTimeout(pollRef.current);
      }
    } catch { /* silently retry */ }
  }, [waitingData?.reference, sellerSlug, orderType]);

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
    // U2: Ne pas fermer pendant le processing (paiement en cours)
    if (step === "processing") return;
    if (pollRef.current) clearTimeout(pollRef.current);
    setStep("form");
    setError("");
    setEmail("");
    setName("");
    setPhone("");
    setSelectedOperator(null);
    setSelectedBumps(new Set());
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
        {loading ? "Chargement..." : needsOtp ? "Suivant" : `Payer — ${formatPrice(totalAmount)}`}
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
        {loading ? "Chargement..." : `Payer — ${formatPrice(totalAmount)}`}
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
    <Modal open={open} onClose={handleClose} title={title} footer={footerContent}>
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
              {/* In-app browser (Facebook, Instagram, TikTok) → boutons ouvrir + partager + copier */}
              {waitingData.link && !waitingData.qrCode && !waitingData.message && (() => {
                const op = ALL_OPERATORS.find((o) => o.id === selectedOperator);
                const opName = op?.name || "le paiement";
                const canShare = typeof navigator !== "undefined" && !!navigator.share;
                const isTikTok = isTikTokBrowser();
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
                      {formatPrice(totalAmount)}
                    </p>

                    {/* Explication */}
                    <p
                      className="mt-2 text-center text-xs leading-relaxed"
                      style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}
                    >
                      {isTikTok
                        ? "TikTok ne peut pas ouvrir les liens de paiement. Ouvre dans Safari pour continuer."
                        : "Pour finaliser, ouvre le lien de paiement dans ton navigateur"
                      }
                    </p>

                    {/* ── TikTok: navigator.share en principal (seul moyen de sortir du WebView) ── */}
                    {isTikTok ? (
                      <>
                        {canShare && (
                          <button
                            type="button"
                            onClick={() => { navigator.share({ title: `Paiement ${opName}`, url: waitingData.link! }).catch(() => {}); }}
                            className="mt-4 flex w-full items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
                            style={{ backgroundColor: "var(--theme-btn-bg, #0D9488)", borderRadius: "var(--theme-btn-radius, 12px)" }}
                          >
                            <ExternalLink size={16} />
                            Ouvrir dans le navigateur
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(waitingData.link!).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                          className={`${canShare ? "mt-2" : "mt-4"} flex w-full items-center justify-center gap-1.5 border py-3 text-xs font-semibold transition-all active:scale-[0.98]`}
                          style={{ borderColor: "var(--theme-modal-border, #E5E7EB)", color: "var(--theme-modal-text, #111827)", borderRadius: "var(--theme-btn-radius, 12px)" }}
                        >
                          {copied ? <><Check size={14} /> Lien copié !</> : <><Copy size={14} /> Copier le lien</>}
                        </button>
                      </>
                    ) : (
                      <>
                        {/* ── FB/IG: target="_blank" en principal (fonctionne) ── */}
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

                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(waitingData.link!).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                          className="mt-2 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-all"
                          style={{ color: "var(--theme-modal-text-muted, #9CA3AF)" }}
                        >
                          {copied ? <><Check size={11} /> Lien copié</> : <><Copy size={11} /> Copier le lien</>}
                        </button>
                      </>
                    )}

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
            <p
              className="text-2xl font-extrabold"
              style={{ color: "var(--theme-modal-text, #111827)" }}
            >
              {formatPrice(totalAmount)}
            </p>
            {bumpTotal > 0 && (
              <p className="mt-0.5 text-xs" style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}>
                {formatPrice(amount)} + {formatPrice(bumpTotal)} d&apos;extras
              </p>
            )}
          </div>

          {/* Order bumps */}
          {orderBumps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold" style={{ color: "var(--theme-modal-text, #111827)" }}>
                Ajoute un extra :
              </p>
              {orderBumps.map((bump) => (
                <label
                  key={bump.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors"
                  style={{
                    borderColor: selectedBumps.has(bump.id)
                      ? "var(--theme-primary, #0D9488)"
                      : "var(--theme-modal-border, #E5E7EB)",
                    backgroundColor: selectedBumps.has(bump.id)
                      ? "var(--theme-input-bg, #F0FDFA)"
                      : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedBumps.has(bump.id)}
                    onChange={() => {
                      const next = new Set(selectedBumps);
                      if (next.has(bump.id)) next.delete(bump.id);
                      else next.add(bump.id);
                      setSelectedBumps(next);
                    }}
                    className="h-4 w-4 rounded"
                    style={{ accentColor: "var(--theme-primary, #0D9488)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold" style={{ color: "var(--theme-modal-text, #111827)" }}>
                      {bump.title}
                    </p>
                    {bump.description && (
                      <p className="text-[10px]" style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}>
                        {bump.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-bold" style={{ color: "var(--theme-primary, #0D9488)" }}>
                    +{formatPrice(bump.price)}
                  </span>
                </label>
              ))}
            </div>
          )}

          <Input
            label="Nom"
            placeholder="Ton nom"
            value={name}
            onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
            required
          />
          <PhoneInput
            label="Téléphone"
            value={phone}
            onChange={(fullNumber) => { setPhone(fullNumber); if (error) setError(""); }}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="toi@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
            required
            autoComplete="email"
            error={email.length > 3 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Email invalide" : undefined}
          />
        </div>
      )}

      {/* Step 2: Moyen de paiement */}
      {step === "payment" && (
        <div className="space-y-4">
          {/* Retour + Country selector */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => { if (initialStep === "payment") { handleClose(); } else { setStep("form"); setError(""); } }}
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
            <span className="text-lg font-bold" style={{ color: "var(--theme-modal-text, #111827)" }}>{formatPrice(totalAmount)}</span>
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
