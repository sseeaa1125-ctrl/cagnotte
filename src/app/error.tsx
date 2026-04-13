"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="text-center">
        <p className="text-4xl font-extrabold text-red-400 sm:text-6xl">Oups</p>
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          Une erreur est survenue
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Quelque chose s&apos;est mal passé. Réessaye.
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-block rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
