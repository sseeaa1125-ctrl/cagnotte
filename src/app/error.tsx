"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="max-w-md text-center">
        <p className="font-headings text-5xl font-black text-primary sm:text-6xl">
          Oups
        </p>
        <h1 className="mt-4 font-headings text-xl font-bold text-primary">
          Quelque chose s&apos;est mal passé
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Une erreur inattendue s&apos;est produite. Réessaye, et si ça
          persiste écris-nous à{" "}
          <a
            href="mailto:support@cagnotte.sn"
            className="font-semibold text-primary hover:underline"
          >
            support@cagnotte.sn
          </a>
          .
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-bold text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
