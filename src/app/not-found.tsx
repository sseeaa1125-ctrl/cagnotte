import Link from "next/link";

export const metadata = {
  title: "Page introuvable",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-pink/20 px-4">
      <div className="mx-auto max-w-md text-center">
        {/* Illustration — navy "404" in pink halo */}
        <div className="relative mx-auto mb-8 flex h-40 w-40 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-pink/70" />
          <div className="absolute inset-3 rounded-full bg-pink/40" />
          <span className="relative font-headings text-5xl font-black tracking-tight text-primary sm:text-6xl">
            404
          </span>
        </div>

        <h1 className="font-headings text-2xl font-black text-primary sm:text-3xl">
          Cette cagnotte n&apos;existe pas
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
          Le lien est peut-être incorrect, ou la cagnotte a été retirée par
          son créateur.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/cagnottes"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-bold text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Parcourir les cagnottes
          </Link>
        </div>

        <p className="mt-10 text-xs text-gray-500">
          Besoin d&apos;aide ? Écris-nous à{" "}
          <a
            href="mailto:support@cagnotte.sn"
            className="font-semibold text-primary hover:underline"
          >
            support@cagnotte.sn
          </a>
        </p>
      </div>
    </div>
  );
}
