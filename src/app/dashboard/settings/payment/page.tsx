"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Input, SettingsSkeleton, PhoneInput, PinInput } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { SettingsSubPage, SellerProfile } from "../_shared";
import { Lock, ShieldCheck, Mail } from "lucide-react";

export default function PaymentSettingsPage() {
  const { toast } = useToast();
  const { refreshSeller } = useAuth();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Withdrawal PIN state
  const [hasPin, setHasPin] = useState(false);
  const [pinMode, setPinMode] = useState<"idle" | "create" | "change" | "forgot" | "reset">("idle");
  const [pinCurrent, setPinCurrent] = useState("");
  const [pinNew, setPinNew] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState("");

  const [payoutPhone, setPayoutPhone] = useState("");
  const [payoutPhoneRaw, setPayoutPhoneRaw] = useState("");
  const [payoutCountry, setPayoutCountry] = useState("SN");
  const [payoutName, setPayoutName] = useState("");
  const [payoutProvider, setPayoutProvider] = useState("wave_money");
  const [payoutSaving, setPayoutSaving] = useState(false);

  const handlePayoutPhoneChange = useCallback((fullNumber: string, rawDigits: string, countryCode: string) => {
    setPayoutPhone(fullNumber);
    setPayoutPhoneRaw(rawDigits);
    setPayoutCountry(countryCode);
  }, []);

  const [supportPhone, setSupportPhone] = useState("");
  const [supportPhoneRaw, setSupportPhoneRaw] = useState("");
  const [supportPhoneSaving, setSupportPhoneSaving] = useState(false);

  const handleSupportPhoneChange = useCallback((fullNumber: string, rawDigits: string, _countryCode: string) => {
    setSupportPhone(fullNumber);
    setSupportPhoneRaw(rawDigits);
  }, []);

  useEffect(() => {
    Promise.all([
      api<{ seller: SellerProfile }>("/api/auth/me"),
      api<{ hasPin: boolean }>("/api/sellers/withdrawal-pin/status"),
    ])
      .then(([meRes, pinRes]) => {
        setSeller(meRes.seller);
        setHasPin(pinRes.hasPin);
        if (meRes.seller.payoutPhone) {
          setPayoutPhone(meRes.seller.payoutPhone);
          const raw = meRes.seller.payoutPhone.replace(/\D/g, "");
          const dialMap: Record<string, string> = { SN: "221", CI: "225" };
          const dialPrefix = dialMap[meRes.seller.payoutCountry || "SN"] || "";
          setPayoutPhoneRaw(raw.startsWith(dialPrefix) ? raw.slice(dialPrefix.length) : raw);
        }
        if (meRes.seller.payoutName) setPayoutName(meRes.seller.payoutName);
        if (meRes.seller.payoutProvider) setPayoutProvider(meRes.seller.payoutProvider);
        if (meRes.seller.payoutCountry) setPayoutCountry(meRes.seller.payoutCountry);
        if (meRes.seller.supportPhone) setSupportPhone(meRes.seller.supportPhone);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSavePayout(e: React.FormEvent) {
    e.preventDefault();
    setPayoutSaving(true);
    try {
      await api("/api/sellers/profile", {
        method: "PUT",
        body: {
          payoutPhone: payoutPhone || null,
          payoutProvider,
          payoutName: payoutName || null,
          payoutCountry,
        },
      });
      refreshSeller();
      toast("Numéro de retrait mis à jour !");
    } catch (err) {
      if (err instanceof ApiError) toast(err.message);
      else toast("Erreur réseau");
    } finally {
      setPayoutSaving(false);
    }
  }

  function resetPinForm() {
    setPinMode("idle");
    setPinCurrent("");
    setPinNew("");
    setPinConfirm("");
    setResetCode("");
    setPinError("");
  }

  async function handleCreateOrChangePin() {
    setPinError("");
    if (pinNew.length !== 4 || !/^\d{4}$/.test(pinNew)) {
      setPinError("Le code doit contenir exactement 4 chiffres");
      return;
    }
    if (pinNew !== pinConfirm) {
      setPinError("Les codes ne correspondent pas");
      return;
    }
    if (hasPin && pinMode === "change" && pinCurrent.length !== 4) {
      setPinError("L'ancien code est requis");
      return;
    }
    setPinSaving(true);
    try {
      const body: Record<string, string> = { pin: pinNew };
      if (hasPin && pinMode === "change") body.currentPin = pinCurrent;
      const res = await api<{ message: string }>("/api/sellers/withdrawal-pin", {
        method: "POST",
        body,
      });
      toast(res.message);
      setHasPin(true);
      resetPinForm();
    } catch (err) {
      if (err instanceof ApiError) setPinError(err.message);
      else setPinError("Erreur réseau");
    } finally {
      setPinSaving(false);
    }
  }

  async function handleForgotPin() {
    setPinSaving(true);
    setPinError("");
    try {
      const res = await api<{ message: string }>("/api/sellers/withdrawal-pin/forgot", {
        method: "POST",
        body: {},
      });
      toast(res.message);
      setPinMode("reset");
    } catch (err) {
      if (err instanceof ApiError) setPinError(err.message);
      else setPinError("Erreur réseau");
    } finally {
      setPinSaving(false);
    }
  }

  async function handleResetPin() {
    setPinError("");
    if (resetCode.length !== 6) {
      setPinError("Le code de vérification doit contenir 6 chiffres");
      return;
    }
    if (pinNew.length !== 4 || !/^\d{4}$/.test(pinNew)) {
      setPinError("Le nouveau code doit contenir exactement 4 chiffres");
      return;
    }
    if (pinNew !== pinConfirm) {
      setPinError("Les codes ne correspondent pas");
      return;
    }
    setPinSaving(true);
    try {
      const res = await api<{ message: string }>("/api/sellers/withdrawal-pin/reset", {
        method: "POST",
        body: { code: resetCode, newPin: pinNew },
      });
      toast(res.message);
      setHasPin(true);
      resetPinForm();
    } catch (err) {
      if (err instanceof ApiError) setPinError(err.message);
      else setPinError("Erreur réseau");
    } finally {
      setPinSaving(false);
    }
  }

  if (loading) return <SettingsSkeleton />;

  return (
    <SettingsSubPage title="Paiement">
      <div className="space-y-4">
        <div className="rounded-xl bg-teal-50 p-4">
          <p className="text-sm font-medium text-teal-700">
            Commission Izy : {seller?.plan === "PRO" ? "4%" : "8%"} par transaction
          </p>
          <p className="mt-1 text-xs text-teal-600">
            Paiements via Wave, Orange Money. On ne gagne que quand tu gagnes.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-800">
            Minimum 5 000 FCFA de solde disponible pour effectuer un retrait.
          </p>
        </div>

        <form onSubmit={handleSavePayout} className="space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Numéro de retrait par défaut</p>
          <p className="text-xs text-gray-500 -mt-2">
            Ce numéro sera pré-rempli automatiquement lors de tes demandes de retrait.
          </p>

          <PhoneInput
            label="Numéro mobile money"
            value={payoutPhone}
            onChange={handlePayoutPhoneChange}
            defaultCountry={payoutCountry}
            allowedCountries={["SN"]}
          />

          <Input
            label="Nom du titulaire du compte"
            value={payoutName}
            onChange={(e) => setPayoutName(e.target.value)}
            placeholder="Prénom Nom"
          />

          <Button type="submit" loading={payoutSaving} disabled={!payoutPhoneRaw || payoutPhoneRaw.length < 7}>
            Enregistrer
          </Button>
        </form>

        <hr className="border-gray-100" />

        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Numéro service client</p>
          <p className="text-xs text-gray-500 -mt-1">
            Ce numéro sera affiché à tes clients après leur achat (page de confirmation, livraison).
          </p>

          <PhoneInput
            label="Numéro WhatsApp / téléphone"
            value={supportPhone}
            onChange={handleSupportPhoneChange}
            defaultCountry="SN"
          />

          <Button
            loading={supportPhoneSaving}
            disabled={!supportPhoneRaw || supportPhoneRaw.length < 7}
            onClick={async () => {
              setSupportPhoneSaving(true);
              try {
                const res = await api<{ seller: SellerProfile }>("/api/sellers/profile", {
                  method: "PUT",
                  body: { supportPhone: supportPhone || null },
                });
                setSeller(res.seller);
                toast("Numéro service client enregistré");
              } catch {
                toast("Erreur lors de l'enregistrement", "error");
              } finally {
                setSupportPhoneSaving(false);
              }
            }}
          >
            Enregistrer
          </Button>
        </div>

        <hr className="border-gray-100" />

        {/* ── Code de retrait ── */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Code de retrait</p>
          <p className="text-xs text-gray-500 -mt-1">
            Protège tes retraits avec un code à 4 chiffres. Il te sera demandé à chaque retrait.
          </p>

          {/* Status badge */}
          {hasPin ? (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5">
              <ShieldCheck size={16} className="text-green-600" />
              <span className="text-sm font-medium text-green-700">Code de retrait activé</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
              <Lock size={16} className="text-amber-600" />
              <span className="text-sm font-medium text-amber-700">Aucun code de retrait configuré</span>
            </div>
          )}

          {/* Idle state — action buttons */}
          {pinMode === "idle" && (
            <div className="flex flex-wrap gap-2">
              {!hasPin ? (
                <Button variant="secondary" onClick={() => setPinMode("create")}>
                  <Lock size={14} className="mr-1.5" />
                  Créer un code
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => setPinMode("change")}>
                    <Lock size={14} className="mr-1.5" />
                    Modifier le code
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setPinError(""); setPinMode("forgot"); }}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium px-2 py-2"
                  >
                    Code oublié ?
                  </button>
                </>
              )}
            </div>
          )}

          {/* Create / Change form */}
          {(pinMode === "create" || pinMode === "change") && (
            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-800">
                {pinMode === "create" ? "Créer un code de retrait" : "Modifier le code de retrait"}
              </p>

              {pinMode === "change" && (
                <PinInput
                  label="Code actuel"
                  value={pinCurrent}
                  onChange={setPinCurrent}
                  autoFocus
                />
              )}

              <PinInput
                label="Nouveau code"
                value={pinNew}
                onChange={setPinNew}
                autoFocus={pinMode === "create"}
              />

              <PinInput
                label="Confirmer le code"
                value={pinConfirm}
                onChange={setPinConfirm}
                error={pinConfirm.length === 4 && pinNew.length === 4 && pinNew !== pinConfirm}
              />

              {pinError && <p className="text-center text-xs text-red-500">{pinError}</p>}

              <div className="flex gap-2 pt-1">
                <Button onClick={handleCreateOrChangePin} loading={pinSaving} disabled={pinNew.length !== 4 || pinConfirm.length !== 4}>
                  {pinMode === "create" ? "Créer" : "Modifier"}
                </Button>
                <Button variant="secondary" onClick={resetPinForm}>Annuler</Button>
              </div>
            </div>
          )}

          {/* Forgot PIN — send email */}
          {pinMode === "forgot" && (
            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-800">Réinitialiser le code de retrait</p>
              <p className="text-xs text-gray-500">
                Un code de vérification sera envoyé sur ton email pour réinitialiser ton code de retrait.
              </p>

              {pinError && <p className="text-xs text-red-500">{pinError}</p>}

              <div className="flex gap-2">
                <Button onClick={handleForgotPin} loading={pinSaving}>
                  <Mail size={14} className="mr-1.5" />
                  Envoyer le code par email
                </Button>
                <Button variant="secondary" onClick={resetPinForm}>Annuler</Button>
              </div>
            </div>
          )}

          {/* Reset PIN — enter email code + new PIN */}
          {pinMode === "reset" && (
            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-800">Nouveau code de retrait</p>
              <p className="text-xs text-gray-500">
                Entre le code à 6 chiffres reçu par email, puis choisis ton nouveau code de retrait.
              </p>

              <PinInput
                label="Code de vérification"
                value={resetCode}
                onChange={setResetCode}
                length={6}
                autoFocus
              />

              <PinInput
                label="Nouveau code de retrait"
                value={pinNew}
                onChange={setPinNew}
              />

              <PinInput
                label="Confirmer le code"
                value={pinConfirm}
                onChange={setPinConfirm}
                error={pinConfirm.length === 4 && pinNew.length === 4 && pinNew !== pinConfirm}
              />

              {pinError && <p className="text-center text-xs text-red-500">{pinError}</p>}

              <div className="flex gap-2 pt-1">
                <Button onClick={handleResetPin} loading={pinSaving} disabled={resetCode.length !== 6 || pinNew.length !== 4 || pinConfirm.length !== 4}>
                  Réinitialiser
                </Button>
                <Button variant="secondary" onClick={resetPinForm}>Annuler</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SettingsSubPage>
  );
}
