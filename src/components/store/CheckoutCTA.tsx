"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Send, Users, Heart, CreditCard, Target } from "lucide-react";
import { PhoneInput, Input } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { StoreBottomSheet } from "@/components/store/StoreBottomSheet";
import { BookingSheet, tzToOffset } from "@/components/store/blocks/BookingBlock";
import { CommunitySubscribeModal } from "@/components/store/blocks/CommunityBlock";
import { api, ApiError, BACKEND_URL } from "@/lib/api";
import { FundraiserProgress } from "@/components/store/FundraiserProgress";
import type { Block, LeadField } from "@/types";

const PaymentModal = dynamic(() => import("@/components/store/PaymentModal").then(m => m.PaymentModal), { ssr: false });

interface CheckoutCTAProps {
  block: Block;
  sellerSlug: string;
  sellerTimezone: string;
  sellerName?: string;
  buttonText: string;
  price: number;
  discountPrice: number | null;
  desktopMode?: boolean;
  inline?: boolean;
  onDismiss?: () => void;
}

const DEFAULT_LEAD_FIELDS: LeadField[] = [
  { id: "f-name", type: "name", label: "Prénom", placeholder: "Ton prénom", required: false },
  { id: "f-email", type: "email", label: "Email", placeholder: "Ton email", required: true },
  { id: "f-phone", type: "phone", label: "Téléphone", placeholder: "+221 7X XXX XX XX", required: false },
];

const DEFAULT_CHECKOUT_FIELDS: LeadField[] = [
  { id: "f-name", type: "name", label: "Nom", placeholder: "Ton nom ou pseudo", required: true },
  { id: "f-phone", type: "phone", label: "Téléphone", placeholder: "+221 7X XXX XX XX", required: true },
];

function getInputType(field: LeadField): string {
  if (field.type === "email") return "email";
  if (field.type === "phone" || field.type === "whatsapp") return "tel";
  return "text";
}

export function CheckoutCTA({ block, sellerSlug, sellerTimezone, sellerName, buttonText, price, discountPrice, desktopMode = false, inline = false, onDismiss }: CheckoutCTAProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const inlineOpened = useRef(false);

  // Booking state
  const [bookingStep, setBookingStep] = useState<"calendar" | "times">("calendar");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Lead/WaitingList form state + prefill extraction for paid waiting lists
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [leadDownloadUrl, setLeadDownloadUrl] = useState<string | null>(null);

  // Partnership form state
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerCompany, setPartnerCompany] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerMessage, setPartnerMessage] = useState("");
  const [partnerBudget, setPartnerBudget] = useState("");
  const [partnerSubmitted, setPartnerSubmitted] = useState(false);

  // Payment (libre/don) state
  const [paymentCustomAmount, setPaymentCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorMessage, setDonorMessage] = useState("");
  const [donorNameError, setDonorNameError] = useState(false);
  const [paymentEmail, setPaymentEmail] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentEmailError, setPaymentEmailError] = useState(false);
  const [paymentPhoneError, setPaymentPhoneError] = useState(false);
  const [donationAmountError, setDonationAmountError] = useState("");
  const isPaymentOrDonation = block.type === "PAYMENT" || block.type === "DONATION" || block.type === "FUNDRAISER";
  const paymentConfig = isPaymentOrDonation ? (block.config as Record<string, unknown> | null) : null;
  const fundraiserEndDate = block.type === "FUNDRAISER" ? (paymentConfig?.endDate as string | null) : null;
  const isFundraiserExpired = (() => {
    if (!fundraiserEndDate) return false;
    const end = new Date(fundraiserEndDate);
    end.setHours(23, 59, 59, 999);
    return new Date() > end;
  })();
  const suggestedAmounts = (paymentConfig?.suggestedAmounts as number[]) || (block.type === "DONATION" ? [1000, 2000, 5000] : block.type === "FUNDRAISER" ? [2000, 5000, 10000] : [5000, 10000, 25000]);
  const minAmount = Math.max((paymentConfig?.minAmount as number) || 500, 500);
  const parsedPaymentAmount = paymentCustomAmount ? parseInt(paymentCustomAmount) : 0;
  const activePaymentAmount = isNaN(parsedPaymentAmount) ? 0 : parsedPaymentAmount;

  // Resolve checkout fields for DONATION/PAYMENT from config (or default 3 fields)
  const rawCheckoutFields = isPaymentOrDonation ? (paymentConfig?.checkoutFields as LeadField[] | undefined) : undefined;
  const configuredCheckoutFields: LeadField[] = rawCheckoutFields?.length ? rawCheckoutFields : DEFAULT_CHECKOUT_FIELDS;
  // Ensure phone is always present (required for mobile money payment)
  const hasCheckoutPhone = configuredCheckoutFields.some((f) => f.type === "phone");
  const checkoutFields: LeadField[] = hasCheckoutPhone
    ? configuredCheckoutFields
    : [...configuredCheckoutFields, { id: "f-phone-auto", type: "phone", label: "Téléphone", placeholder: "+221 7X XXX XX XX", required: true }];
  const checkoutEmailField = checkoutFields.find((f) => f.type === "email");
  const checkoutEmailRequired = checkoutEmailField ? checkoutEmailField.required : false;
  const checkoutNameField = checkoutFields.find((f) => f.type === "name");
  const checkoutNameRequired = checkoutNameField ? checkoutNameField.required : false;

  const effectivePrice = discountPrice && discountPrice > 0 && discountPrice < price
    ? discountPrice
    : price;

  const orderBumps = block.product?.orderBumps?.map(b => ({
    id: b.id,
    title: b.title,
    description: b.description,
    price: b.price,
  })) || [];

  const btnStyle: React.CSSProperties = {
    backgroundColor: "var(--theme-btn-bg, #0D9488)",
    color: "var(--theme-btn-color, #FFFFFF)",
    border: "var(--theme-btn-border, none)",
    borderRadius: "var(--theme-btn-radius, 12px)",
    boxShadow: "0 0 0 1px var(--theme-card-border, rgba(0,0,0,0.08))",
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--theme-input-bg, #FFFFFF)",
    borderColor: "var(--theme-input-border, #D1D5DB)",
    color: "var(--theme-input-text, #111827)",
  };

  function handleCTA() {
    if (block.type === "SALE" || block.type === "FORMATION") {
      setShowPayment(true);
    } else if (block.type === "BOOKING") {
      setSelectedDate(null);
      setSelectedTime(null);
      setBookingStep("calendar");
      setShowAction(true);
    } else if (block.type === "PAYMENT" || block.type === "DONATION" || block.type === "FUNDRAISER") {
      setShowAction(true);
    } else {
      setShowAction(true);
    }
  }

  // Inline mode: auto-open on mount
  useEffect(() => {
    if (inline && !inlineOpened.current) {
      inlineOpened.current = true;
      handleCTA();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inline]);

  // Track that at least one modal/sheet has opened before allowing dismiss
  const hasEverOpened = useRef(false);
  if (showAction || showPayment) hasEverOpened.current = true;

  // Inline mode: dismiss when all modals/sheets are closed (after having been opened)
  useEffect(() => {
    if (inline && hasEverOpened.current && !showAction && !showPayment) {
      onDismiss?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAction, showPayment]);

  function handlePaymentPay() {
    let hasError = false;
    setDonationAmountError("");
    if (activePaymentAmount < minAmount) {
      setDonationAmountError(`Le montant minimum est de ${formatPrice(minAmount)} — chaque geste compte ❤️`);
      hasError = true;
    }
    // Validate based on dynamic checkout fields
    if (checkoutEmailField) {
      if (checkoutEmailRequired && (!paymentEmail.trim() || !/\S+@\S+\.\S+/.test(paymentEmail.trim()))) {
        setPaymentEmailError(true); hasError = true;
      } else if (paymentEmail.trim() && !/\S+@\S+\.\S+/.test(paymentEmail.trim())) {
        setPaymentEmailError(true); hasError = true;
      } else { setPaymentEmailError(false); }
    }
    if (!paymentPhone.trim() || paymentPhone.replace(/\D/g, "").length < 8) {
      setPaymentPhoneError(true); hasError = true;
    } else { setPaymentPhoneError(false); }
    if (checkoutNameRequired && !donorName.trim()) {
      setDonorNameError(true); hasError = true;
    } else { setDonorNameError(false); }
    if (hasError) return;
    setShowAction(false);
    setShowPayment(true);
  }

  // ── Booking handlers ──
  function handleBookingSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedTime(null);
    setBookingStep("times");
  }

  function handleBookingSelectTime(time: string) {
    setSelectedTime(time);
    setShowAction(false);
    setShowPayment(true);
  }

  const service = block.bookingService;
  // Prix fixe par slot (pas de multiplication par durée)
  const bookingTotalPrice = service ? service.price : 0;
  const bookingDateTime = selectedDate && selectedTime
    ? `${selectedDate}T${selectedTime}:00${tzToOffset(sellerTimezone)}`
    : undefined;

  // ── Lead/WaitingList form handlers ──
  const leadProduct = block.product;
  const configuredLeadFields = (leadProduct?.leadFields && leadProduct.leadFields.length > 0)
    ? leadProduct.leadFields
    : DEFAULT_LEAD_FIELDS;
  // Ensure phone field is always present in lead forms
  const isWaitingListPaid = block.type === "WAITING_LIST" && (leadProduct?.price || 0) > 0;
  const hasLeadPhone = configuredLeadFields.some((f) => f.type === "phone");
  const leadFields = hasLeadPhone
    ? (isWaitingListPaid ? configuredLeadFields.map(f => f.type === "phone" ? { ...f, required: true } : f) : configuredLeadFields)
    : [...configuredLeadFields, { id: "f-phone-auto", type: "phone" as const, label: "Téléphone", placeholder: "+221 7X XXX XX XX", required: isWaitingListPaid }];

  // Check if email field is present and required
  const leadEmailField = leadFields.find((f) => f.type === "email");
  const leadEmailRequired = leadEmailField ? leadEmailField.required : false;

  // Extract prefill values from lead form for PaymentModal
  function getLeadPrefills() {
    const nameField = leadFields.find((f) => f.type === "name");
    const phoneField = leadFields.find((f) => f.type === "phone");
    return {
      email: leadEmailField ? (formValues[leadEmailField.id] || "").trim() : "",
      name: nameField ? (formValues[nameField.id] || "").trim() : "",
      phone: phoneField ? (formValues[phoneField.id] || "").trim() : "",
    };
  }

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadProduct) return;
    setFormError("");

    if (isWaitingListPaid) {
      // Validate required fields before transitioning (PhoneInput is custom, HTML required doesn't apply)
      const pf = getLeadPrefills();
      if (leadEmailRequired && (!pf.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pf.email))) {
        setFormError("Email requis");
        return;
      }
      if (pf.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pf.email)) {
        setFormError("Email invalide");
        return;
      }
      if (!pf.phone || pf.phone.replace(/\D/g, "").length < 8) {
        setFormError("Numéro de téléphone requis");
        return;
      }
      setShowAction(false);
      setShowPayment(true);
      return;
    }

    const prefills = getLeadPrefills();
    if (leadEmailRequired && !prefills.email) return;
    if (prefills.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prefills.email)) {
      setFormError("Email invalide");
      return;
    }

    const customFields: Record<string, string> = {};
    for (const field of leadFields) {
      if (field.type !== "email" && field.type !== "name" && field.type !== "phone" && formValues[field.id]) {
        const key = field.type === "custom" ? field.label : field.type;
        customFields[key] = formValues[field.id];
      }
    }

    setFormLoading(true);
    try {
      const res = await api<{ success: boolean; downloadUrl?: string; order: { id: string; reference: string } }>("/api/orders/lead-magnet", {
        method: "POST",
        body: {
          sellerSlug,
          productId: leadProduct.id,
          customerEmail: prefills.email || undefined,
          customerName: prefills.name || undefined,
          customerPhone: prefills.phone || undefined,
          ...(Object.keys(customFields).length > 0 && { customFields }),
        },
        baseUrl: BACKEND_URL,
      });
      setFormSubmitted(true);
      if (res.downloadUrl) {
        setLeadDownloadUrl(res.downloadUrl);
      }
    } catch (err) {
      if (err instanceof ApiError) setFormError(err.message);
      else setFormError("Une erreur est survenue");
    } finally {
      setFormLoading(false);
    }
  }

  // ── Partnership form handler ──
  async function handlePartnershipSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerName.trim() || !partnerEmail.trim() || !partnerMessage.trim()) return;
    setFormError("");
    setFormLoading(true);

    try {
      await api("/api/partnerships", {
        method: "POST",
        body: {
          sellerSlug,
          blockId: block.id,
          name: partnerName.trim(),
          email: partnerEmail.trim(),
          company: partnerCompany.trim() || undefined,
          phone: partnerPhone.trim() || undefined,
          message: partnerMessage.trim(),
          budget: partnerBudget.trim() || undefined,
        },
        baseUrl: BACKEND_URL,
      });
      setPartnerSubmitted(true);
      setShowAction(false);
    } catch (err) {
      if (err instanceof ApiError) setFormError(err.message);
      else setFormError("Une erreur est survenue");
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <>
      {/* CTA — sticky bottom bar (mobile) or inline button (desktop sidebar) — hidden in inline mode */}
      {!inline && (desktopMode ? (
        <div>
          {formSubmitted || partnerSubmitted ? (
            <div className="flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold" style={{ color: "var(--theme-primary, #0D9488)", backgroundColor: "var(--theme-card-bg, #F0FDFA)" }}>
              ✓ {partnerSubmitted ? "Demande envoyée !" : "Inscription confirmée !"}
            </div>
          ) : (
            <button
              onClick={handleCTA}
              className="w-full px-6 py-4 text-[15px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={btnStyle}
            >
              {buttonText}{price > 0 ? ` — ${formatPrice(effectivePrice)}` : ""}
            </button>
          )}
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.12)] [transform:translate3d(0,0,0)]" style={{ backgroundColor: "var(--theme-bg, #FFFFFF)", borderColor: "var(--theme-card-border, #E5E7EB)" }}>
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center gap-3">
              {formSubmitted || partnerSubmitted ? (
                <div className="flex flex-1 items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold" style={{ color: "var(--theme-primary, #0D9488)" }}>
                  ✓ {partnerSubmitted ? "Demande envoyée !" : "Inscription confirmée !"}
                </div>
              ) : (
                <button
                  onClick={handleCTA}
                  className="flex-1 px-6 py-3.5 text-sm font-semibold transition-all active:scale-[0.98]"
                  style={btnStyle}
                >
                  {buttonText}{price > 0 ? ` — ${formatPrice(effectivePrice)}` : ""}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* ── SALE / FORMATION → PaymentModal directly ── */}
      {(block.type === "SALE" || block.type === "FORMATION") && (
        <PaymentModal
          open={showPayment}
          onClose={() => setShowPayment(false)}
          title={block.product?.title || block.title}
          amount={effectivePrice}
          orderType="SALE"
          sellerSlug={sellerSlug}
          productId={block.product?.id}
          orderBumps={orderBumps}
        />
      )}

      {/* ── BOOKING → Calendar sheet directly ── */}
      {block.type === "BOOKING" && service && showAction && (
        <BookingSheet
          step={bookingStep}
          service={service}
          sellerTimezone={sellerTimezone}
          sellerSlug={sellerSlug}
          selectedDate={selectedDate}
          onSelectDate={handleBookingSelectDate}
          onSelectTime={handleBookingSelectTime}
          onBack={() => setBookingStep("calendar")}
          onClose={() => setShowAction(false)}
        />
      )}
      {block.type === "BOOKING" && service && (
        <PaymentModal
          open={showPayment}
          onClose={() => setShowPayment(false)}
          title={service.title}
          amount={bookingTotalPrice}
          orderType="BOOKING"
          sellerSlug={sellerSlug}
          bookingServiceId={service.id}
          bookingDate={bookingDateTime}
          bookingDuration={service.duration}
          bookingLocation={service.location || undefined}
          onSlotTaken={() => {
            setShowPayment(false);
            setSelectedTime(null);
            setBookingStep("times");
            setShowAction(true);
          }}
        />
      )}

      {/* ── COMMUNITY → Subscribe modal directly ── */}
      {block.type === "COMMUNITY" && block.community && (
        <CommunitySubscribeModal
          open={showAction}
          onClose={() => setShowAction(false)}
          community={block.community}
          sellerSlug={sellerSlug}
        />
      )}

      {/* ── LEAD_MAGNET → Form in bottom sheet ── */}
      {(block.type === "LEAD_MAGNET") && leadProduct && (
        <StoreBottomSheet
          open={showAction}
          onClose={() => setShowAction(false)}
          title={formSubmitted ? "C'est fait !" : leadProduct.title}
        >
          {formSubmitted ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "var(--theme-card-bg, #F0FDFA)" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--theme-primary, #0D9488)" }}><path d="M20 6 9 17l-5-5"/></svg>
              </div>
              <p className="mt-4 text-base font-bold" style={{ color: "var(--theme-text, #111827)" }}>
                Inscription confirmée !
              </p>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--theme-text-muted, #6B7280)" }}>
                {leadDownloadUrl
                  ? "Ton contenu est prêt. Tu recevras aussi un email de confirmation."
                  : "Tu recevras un email de confirmation avec ton contenu."
                }
              </p>
              {leadDownloadUrl && (
                <a
                  href={leadDownloadUrl}
                  className="mt-5 flex w-full items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold transition-all active:scale-[0.98]"
                  style={btnStyle}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Télécharger
                </a>
              )}
              <button
                onClick={() => setShowAction(false)}
                className="mt-3 text-sm font-medium transition-colors"
                style={{ color: "var(--theme-text-muted, #9CA3AF)" }}
              >
                Fermer
              </button>
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit} className="space-y-2.5">
              {leadFields.map((field) => (
                field.type === "phone" ? (
                  <PhoneInput
                    key={field.id}
                    label={`${field.label || "Téléphone"}${!field.required ? " (optionnel)" : ""}`}
                    value={formValues[field.id] || ""}
                    onChange={(fullNumber) => setFormValues((prev) => ({ ...prev, [field.id]: fullNumber }))}
                    required={field.required}
                  />
                ) : (
                  <Input
                    key={field.id}
                    type={getInputType(field)}
                    label={`${field.label}${!field.required && field.type !== "email" ? " (optionnel)" : ""}`}
                    placeholder={field.placeholder || field.label}
                    value={formValues[field.id] || ""}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                    required={field.required || field.type === "email"}
                  />
                )
              ))}
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <button
                type="submit"
                disabled={formLoading}
                className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors active:scale-[0.98] disabled:opacity-50"
                style={btnStyle}
              >
                {formLoading ? "Envoi..." : leadProduct.buttonText || "Recevoir"}
              </button>
            </form>
          )}
        </StoreBottomSheet>
      )}

      {/* ── WAITING_LIST → Form in bottom sheet + optional PaymentModal ── */}
      {block.type === "WAITING_LIST" && leadProduct && (
        <>
          <StoreBottomSheet
            open={showAction}
            onClose={() => setShowAction(false)}
            title={leadProduct.title}
          >
            {leadProduct.showSubscriberCount && leadProduct.totalSales != null && (
              <div className="mb-3 flex items-center gap-1.5" style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}>
                <Users size={13} />
                <span className="text-xs font-medium">
                  {leadProduct.totalSales} inscrit{leadProduct.totalSales !== 1 ? "s" : ""}
                  {leadProduct.maxSubscribers ? ` / ${leadProduct.maxSubscribers}` : ""}
                </span>
              </div>
            )}
            <form onSubmit={handleLeadSubmit} className="space-y-2.5">
              {leadFields.map((field) => (
                field.type === "phone" ? (
                  <PhoneInput
                    key={field.id}
                    label={`${field.label || "T\u00e9l\u00e9phone"}${!field.required ? " (optionnel)" : ""}`}
                    value={formValues[field.id] || ""}
                    onChange={(fullNumber) => setFormValues((prev) => ({ ...prev, [field.id]: fullNumber }))}
                    required={field.required}
                  />
                ) : (
                  <Input
                    key={field.id}
                    type={getInputType(field)}
                    label={`${field.label}${!field.required ? " (optionnel)" : ""}`}
                    placeholder={field.placeholder || field.label}
                    value={formValues[field.id] || ""}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                    required={field.required}
                  />
                )
              ))}
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <button
                type="submit"
                disabled={formLoading}
                className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors active:scale-[0.98] disabled:opacity-50"
                style={btnStyle}
              >
                <Users size={16} />
                {formLoading
                  ? "Inscription..."
                  : isWaitingListPaid
                    ? `${leadProduct.buttonText || "S'inscrire"} — ${formatPrice(leadProduct.price)}`
                    : leadProduct.buttonText || "S'inscrire"
                }
              </button>
            </form>
          </StoreBottomSheet>
          {isWaitingListPaid && (() => {
            const pf = getLeadPrefills();
            return (
              <PaymentModal
                open={showPayment}
                onClose={() => { setShowPayment(false); setShowAction(true); }}
                title={leadProduct.title}
                amount={leadProduct.price}
                orderType="SALE"
                sellerSlug={sellerSlug}
                productId={leadProduct.id}
                prefillEmail={pf.email}
                prefillName={pf.name}
                prefillPhone={pf.phone}
                initialStep="payment"
              />
            );
          })()}
        </>
      )}

      {/* ── PARTNERSHIP → Form in bottom sheet ── */}
      {block.type === "PARTNERSHIP" && (
        <StoreBottomSheet
          open={showAction}
          onClose={() => setShowAction(false)}
          title={block.title}
        >
          <form onSubmit={handlePartnershipSubmit} className="space-y-2.5">
            <Input label="Nom" placeholder="Ton nom" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} required />
            <Input label="Email" type="email" placeholder="Ton email" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} required />
            <Input label="Entreprise / Marque (optionnel)" placeholder="Nom de l'entreprise" value={partnerCompany} onChange={(e) => setPartnerCompany(e.target.value)} />
            <PhoneInput
              label="Téléphone (optionnel)"
              value={partnerPhone}
              onChange={(fullNumber) => setPartnerPhone(fullNumber)}
            />
            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--theme-modal-text-muted, #374151)" }}>Message</label>
              <textarea placeholder="Décris ta proposition de partenariat" value={partnerMessage} onChange={(e) => setPartnerMessage(e.target.value)} required rows={3} className="w-full rounded-xl border px-3.5 py-3 text-sm placeholder:opacity-60 resize-none focus:outline-none focus:ring-1" style={{ ...inputStyle, "--tw-ring-color": "var(--theme-primary, #0D9488)" } as React.CSSProperties} />
            </div>
            <Input label="Budget estimé (optionnel)" placeholder="Ex: 500 000 FCFA" value={partnerBudget} onChange={(e) => setPartnerBudget(e.target.value)} />
            {formError && <p className="text-xs text-red-500">{formError}</p>}
            <button
              type="submit"
              disabled={formLoading || !partnerName.trim() || !partnerEmail.trim() || !partnerMessage.trim()}
              className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors active:scale-[0.98] disabled:opacity-50"
              style={btnStyle}
            >
              <Send size={16} />
              {formLoading ? "Envoi..." : "Proposer un partenariat"}
            </button>
          </form>
        </StoreBottomSheet>
      )}

      {/* ── DONATION → Warm donation bottom sheet ── */}
      {block.type === "DONATION" && (
        <>
          <StoreBottomSheet
            open={showAction}
            onClose={() => setShowAction(false)}
            title={block.title}
          >
            <div className="space-y-3 pb-6 sm:pb-2">
              {/* Heart icon + warm intro */}
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: "var(--theme-input-bg, #FFF1F2)" }}>
                <Heart size={16} style={{ color: "var(--theme-primary, #E11D48)" }} />
                <p className="text-xs leading-relaxed" style={{ color: "var(--theme-modal-text-muted, #6B7280)" }}>
                  Chaque don compte et fait une vraie différence
                </p>
              </div>

              {/* Suggested amounts */}
              <div className="flex flex-wrap gap-2">
                {suggestedAmounts.map((amount) => {
                  const isActive = activePaymentAmount === amount;
                  return (
                    <button
                      key={amount}
                      onClick={() => setPaymentCustomAmount(String(amount))}
                      className="rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors"
                      style={{
                        borderColor: isActive ? "var(--theme-primary, #E11D48)" : "var(--theme-input-border, #E5E7EB)",
                        backgroundColor: isActive ? "var(--theme-input-bg, #FFF1F2)" : "var(--theme-card-bg, #FFFFFF)",
                        color: isActive ? "var(--theme-primary, #E11D48)" : "var(--theme-input-text, #111827)",
                      }}
                    >
                      {formatPrice(amount)}
                    </button>
                  );
                })}
              </div>

              {/* Custom amount input */}
              <Input
                type="number"
                label="Montant du don"
                placeholder={`Montant libre (min ${formatPrice(minAmount)})`}
                value={paymentCustomAmount}
                onChange={(e) => setPaymentCustomAmount(e.target.value)}
              />

              {/* Dynamic checkout fields */}
              {checkoutFields.map((field) => {
                if (field.type === "name") return (
                  <Input
                    key={field.id}
                    label={`${field.label}${!field.required ? " (optionnel)" : ""}`}
                    placeholder={field.placeholder || "Ton nom ou pseudo"}
                    value={donorName}
                    onChange={(e) => { setDonorName(e.target.value); if (donorNameError) setDonorNameError(false); }}
                    required={field.required}
                    error={donorNameError ? `${field.label} est requis` : undefined}
                  />
                );
                if (field.type === "email") return (
                  <Input
                    key={field.id}
                    type="email"
                    label={`${field.label}${!field.required ? " (optionnel)" : ""}`}
                    placeholder={field.placeholder || "Ton email"}
                    value={paymentEmail}
                    onChange={(e) => { setPaymentEmail(e.target.value); if (paymentEmailError) setPaymentEmailError(false); }}
                    required={field.required}
                    error={paymentEmailError ? "Email invalide" : undefined}
                  />
                );
                if (field.type === "phone") return (
                  <div key={field.id}>
                    <PhoneInput
                      label={`${field.label}${!field.required ? " (optionnel)" : ""}`}
                      value={paymentPhone}
                      onChange={(fullNumber) => { setPaymentPhone(fullNumber); if (paymentPhoneError) setPaymentPhoneError(false); }}
                      required={field.required}
                    />
                    {paymentPhoneError && <p className="-mt-1 text-[11px] font-medium" style={{ color: "#EF4444" }}>Numéro de téléphone requis</p>}
                  </div>
                );
                return null;
              })}

              {/* Donor message (always visible) */}
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--theme-modal-text-muted, #374151)" }}>Ton message (optionnel)</label>
                <textarea
                  placeholder={sellerName ? `${sellerName} recevra ton message ❤️` : "Laisse un petit mot d'encouragement..."}
                  value={donorMessage}
                  onChange={(e) => setDonorMessage(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="w-full resize-none rounded-xl border px-3.5 py-3 text-sm placeholder:opacity-60 focus:outline-none focus:ring-1"
                  style={{ ...inputStyle, "--tw-ring-color": "var(--theme-primary, #E11D48)" } as React.CSSProperties}
                />
              </div>

              {/* Amount error */}
              {donationAmountError && (
                <p className="text-center text-xs font-medium" style={{ color: "var(--theme-primary, #E11D48)" }}>{donationAmountError}</p>
              )}

              {/* Donate button */}
              <button
                disabled={!activePaymentAmount}
                onClick={handlePaymentPay}
                className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors active:scale-[0.98] disabled:opacity-50"
                style={btnStyle}
              >
                <Heart size={16} />
                {activePaymentAmount > 0
                  ? `${buttonText || "Faire un don"} — ${formatPrice(activePaymentAmount)}`
                  : buttonText || "Faire un don"}
              </button>
            </div>
          </StoreBottomSheet>

          {activePaymentAmount >= minAmount && (
            <PaymentModal
              open={showPayment}
              onClose={() => { setShowPayment(false); setShowAction(true); }}
              title={block.title}
              amount={activePaymentAmount}
              orderType="DONATION"
              blockId={block.id}
              sellerSlug={sellerSlug}
              paymentNote={(paymentConfig?.description as string) || undefined}
              donorName={donorName || undefined}
              donorMessage={donorMessage || undefined}
              prefillEmail={paymentEmail}
              prefillName={donorName}
              prefillPhone={paymentPhone}
              initialStep="payment"
            />
          )}
        </>
      )}

      {/* ── FUNDRAISER → Cagnotte with progress bar + donation flow ── */}
      {block.type === "FUNDRAISER" && (
        <>
          <StoreBottomSheet
            open={showAction}
            onClose={() => setShowAction(false)}
            title={block.title}
          >
            <div className="space-y-3 pb-6 sm:pb-2">
              {/* Progress bar */}
              <FundraiserProgress blockId={block.id} />

              {isFundraiserExpired ? (
                <div className="rounded-xl px-4 py-5 text-center" style={{ backgroundColor: "var(--theme-input-bg, #FEF2F2)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--theme-text, #111827)" }}>Cette levée de fonds est terminée</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--theme-text-muted, #6B7280)" }}>Merci à tous les participants !</p>
                </div>
              ) : (
                <>
                  {/* Suggested amounts */}
                  <div className="flex flex-wrap gap-2">
                    {suggestedAmounts.map((amount) => {
                      const isActive = activePaymentAmount === amount;
                      return (
                        <button
                          key={amount}
                          onClick={() => setPaymentCustomAmount(String(amount))}
                          className="rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors"
                          style={{
                            borderColor: isActive ? "var(--theme-primary, #DC2626)" : "var(--theme-input-border, #E5E7EB)",
                            backgroundColor: isActive ? "var(--theme-input-bg, #FEF2F2)" : "var(--theme-card-bg, #FFFFFF)",
                            color: isActive ? "var(--theme-primary, #DC2626)" : "var(--theme-input-text, #111827)",
                          }}
                        >
                          {formatPrice(amount)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom amount input */}
                  <Input
                    type="number"
                    label="Montant de ta participation"
                    placeholder={`Montant libre (min ${formatPrice(minAmount)})`}
                    value={paymentCustomAmount}
                    onChange={(e) => setPaymentCustomAmount(e.target.value)}
                  />

                  {/* Dynamic checkout fields */}
                  {checkoutFields.map((field) => {
                    if (field.type === "name") return (
                      <Input
                        key={field.id}
                        label={`${field.label}${!field.required ? " (optionnel)" : ""}`}
                        placeholder={field.placeholder || "Ton nom ou pseudo"}
                        value={donorName}
                        onChange={(e) => { setDonorName(e.target.value); if (donorNameError) setDonorNameError(false); }}
                        required={field.required}
                        error={donorNameError ? `${field.label} est requis` : undefined}
                      />
                    );
                    if (field.type === "email") return (
                      <Input
                        key={field.id}
                        type="email"
                        label={`${field.label}${!field.required ? " (optionnel)" : ""}`}
                        placeholder={field.placeholder || "Ton email"}
                        value={paymentEmail}
                        onChange={(e) => { setPaymentEmail(e.target.value); if (paymentEmailError) setPaymentEmailError(false); }}
                        required={field.required}
                        error={paymentEmailError ? "Email invalide" : undefined}
                      />
                    );
                    if (field.type === "phone") return (
                      <div key={field.id}>
                        <PhoneInput
                          label={`${field.label}${!field.required ? " (optionnel)" : ""}`}
                          value={paymentPhone}
                          onChange={(fullNumber) => { setPaymentPhone(fullNumber); if (paymentPhoneError) setPaymentPhoneError(false); }}
                          required={field.required}
                        />
                        {paymentPhoneError && <p className="-mt-1 text-[11px] font-medium" style={{ color: "#EF4444" }}>Numéro de téléphone requis</p>}
                      </div>
                    );
                    return null;
                  })}

                  {/* Donor message */}
                  <div className="w-full">
                    <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--theme-modal-text-muted, #374151)" }}>Ton message (optionnel)</label>
                    <textarea
                      placeholder={sellerName ? `${sellerName} recevra ton message 🎯` : "Laisse un petit mot d'encouragement..."}
                      value={donorMessage}
                      onChange={(e) => setDonorMessage(e.target.value)}
                      maxLength={500}
                      rows={2}
                      className="w-full resize-none rounded-xl border px-3.5 py-3 text-sm placeholder:opacity-60 focus:outline-none focus:ring-1"
                      style={{ ...inputStyle, "--tw-ring-color": "var(--theme-primary, #DC2626)" } as React.CSSProperties}
                    />
                  </div>

                  {/* Amount error */}
                  {donationAmountError && (
                    <p className="text-center text-xs font-medium" style={{ color: "var(--theme-primary, #DC2626)" }}>{donationAmountError}</p>
                  )}

                  {/* Participate button */}
                  <button
                    disabled={!activePaymentAmount}
                    onClick={handlePaymentPay}
                    className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors active:scale-[0.98] disabled:opacity-50"
                    style={btnStyle}
                  >
                    <Target size={16} />
                    {activePaymentAmount > 0
                      ? `${buttonText || "Participer"} — ${formatPrice(activePaymentAmount)}`
                      : buttonText || "Participer"}
                  </button>
                </>
              )}
            </div>
          </StoreBottomSheet>

          {activePaymentAmount >= minAmount && (
            <PaymentModal
              open={showPayment}
              onClose={() => { setShowPayment(false); setShowAction(true); }}
              title={block.title}
              amount={activePaymentAmount}
              orderType="DONATION"
              blockId={block.id}
              sellerSlug={sellerSlug}
              paymentNote={(paymentConfig?.description as string) || undefined}
              donorName={donorName || undefined}
              donorMessage={donorMessage || undefined}
              prefillEmail={paymentEmail}
              prefillName={donorName}
              prefillPhone={paymentPhone}
              initialStep="payment"
            />
          )}
        </>
      )}

      {/* ── PAYMENT → Amount selection in bottom sheet ── */}
      {block.type === "PAYMENT" && (
        <>
          <StoreBottomSheet
            open={showAction}
            onClose={() => setShowAction(false)}
            title={block.title}
          >
            <div className="space-y-3 pb-6 sm:pb-2">
              {/* Suggested amounts */}
              <div className="flex flex-wrap gap-2">
                {suggestedAmounts.map((amount) => {
                  const isActive = activePaymentAmount === amount;
                  return (
                    <button
                      key={amount}
                      onClick={() => setPaymentCustomAmount(String(amount))}
                      className="rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors"
                      style={{
                        borderColor: isActive ? "var(--theme-primary, #0D9488)" : "var(--theme-input-border, #E5E7EB)",
                        backgroundColor: isActive ? "var(--theme-input-bg, #F0FDFA)" : "var(--theme-card-bg, #FFFFFF)",
                        color: isActive ? "var(--theme-primary, #0D9488)" : "var(--theme-input-text, #111827)",
                      }}
                    >
                      {formatPrice(amount)}
                    </button>
                  );
                })}
              </div>

              {/* Custom amount input */}
              <Input
                type="number"
                label="Montant"
                placeholder={`Montant libre (min ${formatPrice(minAmount)})`}
                value={paymentCustomAmount}
                onChange={(e) => setPaymentCustomAmount(e.target.value)}
              />

              {/* Dynamic checkout fields */}
              {checkoutFields.map((field) => {
                if (field.type === "name") return (
                  <Input
                    key={field.id}
                    label={`${field.label}${!field.required ? " (optionnel)" : ""}`}
                    placeholder={field.placeholder || "Ton nom ou @réseau social"}
                    value={donorName}
                    onChange={(e) => { setDonorName(e.target.value); if (donorNameError) setDonorNameError(false); }}
                    required={field.required}
                    error={donorNameError ? `${field.label} est requis` : undefined}
                  />
                );
                if (field.type === "email") return (
                  <Input
                    key={field.id}
                    type="email"
                    label={`${field.label}${!field.required ? " (optionnel)" : ""}`}
                    placeholder={field.placeholder || "Ton email"}
                    value={paymentEmail}
                    onChange={(e) => { setPaymentEmail(e.target.value); if (paymentEmailError) setPaymentEmailError(false); }}
                    required={field.required}
                    error={paymentEmailError ? "Email invalide" : undefined}
                  />
                );
                if (field.type === "phone") return (
                  <div key={field.id}>
                    <PhoneInput
                      label={`${field.label}${!field.required ? " (optionnel)" : ""}`}
                      value={paymentPhone}
                      onChange={(fullNumber) => { setPaymentPhone(fullNumber); if (paymentPhoneError) setPaymentPhoneError(false); }}
                      required={field.required}
                    />
                    {paymentPhoneError && <p className="-mt-1 text-[11px] font-medium" style={{ color: "#EF4444" }}>Numéro de téléphone requis</p>}
                  </div>
                );
                return null;
              })}

              {/* Message (optional) */}
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--theme-modal-text-muted, #374151)" }}>Message (optionnel)</label>
                <textarea
                  placeholder="Laisse un message"
                  value={donorMessage}
                  onChange={(e) => setDonorMessage(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="w-full resize-none rounded-xl border px-3.5 py-3 text-sm placeholder:opacity-60 focus:outline-none focus:ring-1"
                  style={{ ...inputStyle, "--tw-ring-color": "var(--theme-primary, #0D9488)" } as React.CSSProperties}
                />
              </div>

              {/* Pay button */}
              <button
                disabled={!activePaymentAmount || activePaymentAmount < minAmount}
                onClick={handlePaymentPay}
                className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors active:scale-[0.98] disabled:opacity-50"
                style={btnStyle}
              >
                <CreditCard size={16} />
                {activePaymentAmount >= minAmount
                  ? `${buttonText || "Payer"} — ${formatPrice(activePaymentAmount)}`
                  : buttonText || "Payer"}
              </button>
            </div>
          </StoreBottomSheet>

          {activePaymentAmount >= minAmount && (
            <PaymentModal
              open={showPayment}
              onClose={() => { setShowPayment(false); setShowAction(true); }}
              title={block.title}
              amount={activePaymentAmount}
              orderType="PAYMENT"
              sellerSlug={sellerSlug}
              paymentNote={(paymentConfig?.description as string) || undefined}
              donorName={donorName || undefined}
              donorMessage={donorMessage || undefined}
              prefillEmail={paymentEmail}
              prefillName={donorName}
              prefillPhone={paymentPhone}
              initialStep="payment"
            />
          )}
        </>
      )}
    </>
  );
}
