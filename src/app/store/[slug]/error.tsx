"use client";

import Link from "next/link";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="text-center">
        <p className="text-5xl font-extrabold text-teal-600">Oups</p>
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          Cette page n&apos;a pas pu être chargée
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Vérifie ta connexion internet et réessaye.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
