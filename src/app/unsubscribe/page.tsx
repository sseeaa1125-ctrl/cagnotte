"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API_URL = "";

export default function UnsubscribePage() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [email, setEmail] = useState("");

  // Read email from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) setEmail(emailParam); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  async function handleUnsubscribe() {
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/api/auth/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("done");
      } else {
        setStatus("done"); // Show success anyway — don't leak whether email exists
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-teal-600" />
          <span className="text-lg font-extrabold tracking-tight text-teal-600">izy</span>
          <span className="text-lg font-normal text-gray-400">.store</span>
        </div>

        {status === "done" ? (
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Désabonnement confirmé
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Tu ne recevras plus d&apos;emails de notre part. Si c&apos;était une erreur, tu peux te reconnecter à ton compte pour réactiver les notifications.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        ) : (
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Se désabonner
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Tu ne recevras plus d&apos;emails transactionnels et de notifications de Izy Store.
            </p>

            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@email.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {status === "error" && (
              <p className="mt-3 text-sm text-red-600">
                Une erreur est survenue. Réessaye plus tard.
              </p>
            )}

            <button
              onClick={handleUnsubscribe}
              disabled={!email || status === "loading"}
              className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {status === "loading" ? "En cours..." : "Confirmer le désabonnement"}
            </button>

            <p className="mt-4 text-center text-xs text-gray-400">
              Tu pourras toujours te réabonner depuis ton compte.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
