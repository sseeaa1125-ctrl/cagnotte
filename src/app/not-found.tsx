import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-teal-50/40 px-4">
      <div className="mx-auto max-w-md text-center">
        {/* Illustration */}
        <div className="relative mx-auto mb-8 flex h-40 w-40 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-teal-100/60" />
          <div className="absolute inset-3 rounded-full bg-teal-50" />
          <span className="relative text-6xl font-black tracking-tight text-teal-600">
            404
          </span>
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
          Page introuvable
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
          Cette page n&apos;existe pas, a été déplacée ou le lien est incorrect.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-[52px] items-center justify-center rounded-full bg-teal-600 px-8 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 active:bg-teal-800"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/login"
            className="inline-flex h-[52px] items-center justify-center rounded-full border border-gray-200 bg-white px-8 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            Se connecter
          </Link>
        </div>

        <p className="mt-10 text-xs text-gray-400">
          Tu cherches une boutique ? Vérifie l&apos;URL ou contacte le vendeur.
        </p>
      </div>
    </div>
  );
}
