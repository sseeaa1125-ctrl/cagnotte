"use client";

import Link from "next/link";
import {
  User,
  Lock,
  CreditCard,
  Bell,
  Shield,
  ChevronRight,
  Fingerprint,
  Puzzle,
} from "lucide-react";

const SECTIONS = [
  { id: "profile", label: "Profil", description: "Nom, slug, email et plan", icon: User, iconBg: "bg-teal-50", iconColor: "text-teal-600" },
  { id: "password", label: "Mot de passe", description: "Modifier ton mot de passe", icon: Lock, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
  { id: "payment", label: "Paiement", description: "Commission, retrait et service client", icon: CreditCard, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  { id: "kyc", label: "Vérification d'identité", description: "KYC requis pour retirer tes gains", icon: Fingerprint, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
  { id: "integrations", label: "Intégrations", description: "Google Calendar, Meet et plus", icon: Puzzle, iconBg: "bg-cyan-50", iconColor: "text-cyan-600" },
  { id: "notifications", label: "Notifications", description: "Emails de commandes et marketing", icon: Bell, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
  { id: "security", label: "Sécurité", description: "Supprimer mon compte", icon: Shield, iconBg: "bg-red-50", iconColor: "text-red-500" },
] as const;

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">Réglages</h1>

      <div className="mt-5 space-y-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;

          return (
            <Link
              key={section.id}
              href={`/dashboard/settings/${section.id}`}
              className="flex items-center gap-3.5 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 transition-shadow hover:shadow-sm hover:bg-gray-50 active:bg-gray-100"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${section.iconBg}`}>
                <Icon size={18} className={section.iconColor} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{section.label}</p>
                <p className="text-[11px] text-gray-400 leading-snug">{section.description}</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-gray-400" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
