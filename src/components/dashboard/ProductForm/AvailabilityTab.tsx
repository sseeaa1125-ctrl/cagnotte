"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AvailabilityEditor } from "@/components/dashboard/AvailabilityEditor";
import { api } from "@/lib/api";
import { CheckCircle2, ExternalLink } from "lucide-react";
import type { ProductFormData } from "./types";

export function AvailabilityTab({
  form,
  set,
}: {
  form: ProductFormData;
  set: <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => void;
}) {
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; email?: string } | null>(null);

  useEffect(() => {
    api<{ connected: boolean; email?: string }>("/api/integrations/google/status")
      .then(setGoogleStatus)
      .catch(() => setGoogleStatus({ connected: false }));
  }, []);

  return (
    <div className="space-y-5">
      {/* Google Calendar integration prompt */}
      {googleStatus !== null && (
        <div className={`rounded-xl border p-4 ${
          googleStatus.connected
            ? "border-green-200 bg-green-50"
            : "border-blue-200 bg-blue-50"
        }`}>
          <div className="flex items-start gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              googleStatus.connected ? "bg-green-100" : "bg-blue-100"
            }`}>
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                <path d="M18.316 5.684H24v12.632h-5.684V5.684z" fill="#1967D2"/>
                <path d="M5.684 18.316H0V5.684h5.684v12.632z" fill="#188038"/>
                <path d="M18.316 24V18.316H5.684V24h12.632z" fill="#FBBC04"/>
                <path d="M5.684 5.684V0h12.632v5.684H5.684z" fill="#EA4335"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              {googleStatus.connected ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-green-600" />
                    <p className="text-xs font-bold text-green-800">Google Calendar connecté</p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-green-600">
                    Un lien Google Meet sera créé automatiquement pour chaque réservation confirmée.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-blue-800">Google Calendar & Meet</p>
                  <p className="mt-0.5 text-[11px] text-blue-600">
                    Connecte Google Calendar pour créer automatiquement un lien Google Meet à chaque réservation.
                  </p>
                  <Link
                    href="/dashboard/settings/integrations"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 active:scale-[0.98]"
                  >
                    <ExternalLink size={12} />
                    Connecter Google Calendar
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="mb-1 text-sm font-bold text-gray-900">Disponibilités</p>
        <p className="mb-4 text-xs text-gray-500">
          Configure les jours et heures où tes clients peuvent réserver.
        </p>
        <AvailabilityEditor
          slots={form.slots}
          onChange={(slots) => set("slots", slots)}
        />
      </div>
    </div>
  );
}
