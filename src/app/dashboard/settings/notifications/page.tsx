"use client";

import { useEffect, useState } from "react";
import { SettingsSkeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { SettingsSubPage, SellerProfile, NotifPrefs, DEFAULT_NOTIF_PREFS } from "../_shared";

export default function NotificationsSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);

  useEffect(() => {
    api<{ seller: SellerProfile }>("/api/auth/me")
      .then((res) => {
        if (res.seller.notificationPrefs) {
          setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...res.seller.notificationPrefs });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleNotif(key: keyof NotifPrefs) {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      api("/api/sellers/profile", {
        method: "PUT",
        body: { notificationPrefs: next },
      }).catch(() => {
        setNotifPrefs(prev);
        toast("Erreur lors de la sauvegarde");
      });
      return next;
    });
  }

  if (loading) return <SettingsSkeleton />;

  return (
    <SettingsSubPage title="Notifications">
      <div className="space-y-6">
        {/* Push notifications */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Notifications push</p>
          <p className="text-xs text-gray-400">Reçois des notifications instantanées sur ton téléphone ou navigateur.</p>
          <NotifToggle
            label="Ventes et commandes"
            description="Nouvelle vente ou commande confirmée"
            checked={notifPrefs.pushOrders}
            onChange={() => toggleNotif("pushOrders")}
          />
          <NotifToggle
            label="Dons"
            description="Nouveau don reçu"
            checked={notifPrefs.pushDonations}
            onChange={() => toggleNotif("pushDonations")}
          />
          <NotifToggle
            label="Paiements"
            description="Nouveau paiement reçu"
            checked={notifPrefs.pushPayments}
            onChange={() => toggleNotif("pushPayments")}
          />
          <NotifToggle
            label="Demandes de partenariat"
            description="Quelqu'un souhaite collaborer avec toi"
            checked={notifPrefs.pushPartnerships}
            onChange={() => toggleNotif("pushPartnerships")}
          />
          <NotifToggle
            label="Communautés"
            description="Nouvel abonné dans ta communauté"
            checked={notifPrefs.pushCommunities}
            onChange={() => toggleNotif("pushCommunities")}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* Email notifications */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Emails</p>
          <NotifToggle
            label="Nouvelles commandes"
            description="Recevoir un email à chaque nouvelle vente"
            checked={notifPrefs.emailOrders}
            onChange={() => toggleNotif("emailOrders")}
          />
          <NotifToggle
            label="Nouvelles réservations"
            description="Recevoir un email quand un client réserve un créneau"
            checked={notifPrefs.emailBookings}
            onChange={() => toggleNotif("emailBookings")}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* Marketing */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Marketing</p>
          <NotifToggle
            label="Actualités et conseils"
            description="Recevoir des conseils pour améliorer tes ventes"
            checked={notifPrefs.emailMarketing}
            onChange={() => toggleNotif("emailMarketing")}
          />
        </div>
      </div>
    </SettingsSubPage>
  );
}

function NotifToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={onChange}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(); } }}
      className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
    >
      <div className="mr-4">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-teal-600" : "bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
}
