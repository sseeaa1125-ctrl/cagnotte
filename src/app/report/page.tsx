"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";

const API_URL = "";

const REASONS = [
  { value: "SPAM", label: "Spam ou contenu indésirable" },
  { value: "SCAM", label: "Arnaque ou fraude" },
  { value: "INAPPROPRIATE", label: "Contenu inapproprié ou offensant" },
  { value: "IMPERSONATION", label: "Usurpation d'identité" },
  { value: "OTHER", label: "Autre raison" },
] as const;

const TEXTS = {
  title: "Signaler une page",
  subtitle: "Si tu penses que cette page enfreint nos conditions d'utilisation, tu peux nous le signaler.",
  storeLabel: "Page concernée",
  storePlaceholder: "Nom de la page (ex: nom-du-vendeur)",
  reasonLabel: "Motif du signalement",
  reasonPlaceholder: "Sélectionne un motif",
  descriptionLabel: "Description (optionnel)",
  descriptionPlaceholder: "Décris le problème en détail...",
  emailLabel: "Ton email (optionnel)",
  emailPlaceholder: "Pour te recontacter si besoin",
  submit: "Envoyer le signalement",
  sending: "Envoi en cours...",
  successTitle: "Signalement envoyé",
  successMessage: "Merci pour ton signalement. Notre équipe va l'examiner dans les plus brefs délais.",
  backToStore: "Retour à la page",
};

function ReportForm() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url") || "";

  const [storeSlug, setStoreSlug] = useState(urlParam);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeSlug || !reason) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug: storeSlug.trim(),
          reason,
          description: description.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Erreur lors de l'envoi");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau. Réessaye.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-50">
          <CheckCircle size={32} className="text-emerald-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{TEXTS.successTitle}</h1>
        <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{TEXTS.successMessage}</p>
        <Link
          href={urlParam ? `/${urlParam}` : "/"}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-teal-700 active:scale-[0.98]"
        >
          {TEXTS.backToStore}
        </Link>
      </div>
    );
  }

  const backHref = urlParam ? `/${urlParam}` : "/";

  return (
    <div>
      <div className="mb-6">
        <Link href={backHref} className="flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">
          <ArrowLeft size={16} />
          Retour
        </Link>
      </div>
      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{TEXTS.title}</h1>
      <p className="mt-2 text-sm text-gray-500 leading-relaxed">{TEXTS.subtitle}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {/* Store slug */}
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-gray-700">{TEXTS.storeLabel}</label>
          <input
            type="text"
            value={storeSlug}
            onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder={TEXTS.storePlaceholder}
            required
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>

        {/* Reason select */}
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-gray-700">{TEXTS.reasonLabel}</label>
          <div className="relative">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className={`w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 appearance-none ${reason ? "text-gray-900" : "text-gray-400"}`}
            >
              <option value="" disabled>{TEXTS.reasonPlaceholder}</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-gray-700">{TEXTS.descriptionLabel}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={TEXTS.descriptionPlaceholder}
            rows={4}
            maxLength={1000}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 resize-none"
          />
        </div>

        {/* Email */}
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-gray-700">{TEXTS.emailLabel}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={TEXTS.emailPlaceholder}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-100">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !storeSlug || !reason}
          className="w-full rounded-full bg-teal-600 py-3.5 text-[15px] font-extrabold text-white transition-all hover:bg-teal-700 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {loading ? TEXTS.sending : TEXTS.submit}
        </button>
      </form>
    </div>
  );
}

export default function ReportPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-gray-50/80 font-sans">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] bg-white rounded-[2rem] shadow-xl shadow-gray-900/5 border border-gray-100 p-6 sm:p-10">
          <Suspense fallback={<div className="h-40 flex items-center justify-center text-sm text-gray-400">Chargement...</div>}>
            <ReportForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
