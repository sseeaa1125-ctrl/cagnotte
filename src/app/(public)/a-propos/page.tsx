import Link from "next/link";
import {
  ArrowRight,
  Heart,
  ShieldCheck,
  Wallet,
  Zap,
  Users,
  Smartphone,
  CheckCircle2,
  Share2,
  PartyPopper,
  HandHeart,
} from "lucide-react";

export const metadata = {
  title: "À propos — cagnotte.sn, la plateforme de cagnottes au Sénégal",
  description:
    "cagnotte.sn est la plateforme sénégalaise dédiée à la collecte de fonds en ligne via Wave, Orange Money et Free Money. Fonds versés en 48h.",
  alternates: { canonical: "https://cagnotte.sn/a-propos" },
};

export default function AproposPage() {
  return (
    <div className="bg-gray-50">
      {/* ─── Hero ─── */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-block rounded-full bg-pink px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            La plateforme de cagnottes du Sénégal
          </p>
          <h1 className="font-headings text-4xl font-black leading-tight text-primary md:text-6xl">
            La cagnotte qui
            <br className="hidden md:block" />{" "}
            <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              change des vies.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-600 md:text-lg">
            cagnotte.sn permet à chacun de lever des fonds pour ses projets —
            fêter un baptême, célébrer un mariage, financer une opération
            médicale ou soutenir une cause solidaire. Gratuit pour les
            donateurs, simple pour les organisateurs.
          </p>
        </div>
      </section>

      {/* ─── Key numbers / Trust row ─── */}
      <section className="container mx-auto px-4 pb-4">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {[
            { icon: Wallet, label: "Fonds versés", value: "48 h" },
            { icon: Smartphone, label: "Mobile money", value: "3 opérateurs" },
            { icon: ShieldCheck, label: "Paiements", value: "Sécurisés" },
            { icon: Zap, label: "Création", value: "2 min" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-gray-100"
            >
              <item.icon
                size={24}
                className="mx-auto mb-2 text-primary"
                aria-hidden
              />
              <p className="font-headings text-lg font-black text-primary md:text-xl">
                {item.value}
              </p>
              <p className="mt-1 text-xs font-medium text-gray-500">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Mission ─── */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500">
            Notre mission
          </p>
          <h2 className="mb-6 font-headings text-3xl font-black text-primary md:text-4xl">
            Rendre la collecte de fonds accessible à tous les Sénégalais.
          </h2>
          <div className="flex flex-col gap-5 text-base leading-relaxed text-gray-700 md:text-lg">
            <p>
              Conçue pour le Sénégal, notre plateforme accepte{" "}
              <strong className="text-primary">Wave</strong>,{" "}
              <strong className="text-primary">Orange Money</strong> et{" "}
              <strong className="text-primary">Free Money</strong>. Aucun
              téléchargement, aucune application&nbsp;: un simple lien
              partageable suffit.
            </p>
            <p>
              Chaque Sénégalais doit pouvoir lever des fonds pour ce qui compte,
              sans friction, en FCFA et avec les moyens de paiement qu&apos;il
              utilise tous les jours.
            </p>
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="bg-white py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500">
                Comment ça marche
              </p>
              <h2 className="font-headings text-3xl font-black text-primary md:text-4xl">
                Lance ta cagnotte en 3 étapes.
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  step: "1",
                  icon: CheckCircle2,
                  title: "Crée ta cagnotte",
                  desc: "Choisis un type (festive ou solidaire), un titre, un objectif et une photo de couverture. Ça prend 2 minutes.",
                },
                {
                  step: "2",
                  icon: Share2,
                  title: "Partage le lien",
                  desc: "Ton lien unique cagnotte.sn/ta-cagnotte se partage sur WhatsApp, Facebook, TikTok, par email ou SMS.",
                },
                {
                  step: "3",
                  icon: Wallet,
                  title: "Reçois les fonds",
                  desc: "Les contributions arrivent instantanément sur ta cagnotte. Tu retires sur Wave, Orange Money ou Free Money sous 48 h.",
                },
              ].map((step) => (
                <div
                  key={step.step}
                  className="relative rounded-3xl border border-gray-100 bg-gray-50 p-6 md:p-7"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
                    <step.icon size={22} aria-hidden />
                  </div>
                  <p className="mb-1 text-xs font-bold text-primary/50">
                    Étape {step.step}
                  </p>
                  <h3 className="mb-2 font-headings text-lg font-black text-primary md:text-xl">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600 md:text-base">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Cagnotte types ─── */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500">
              Deux types de cagnottes
            </p>
            <h2 className="font-headings text-3xl font-black text-primary md:text-4xl">
              Pour toutes les occasions de la vie.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl bg-gradient-to-br from-pink to-pink/30 p-7 md:p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                <PartyPopper size={22} aria-hidden />
              </div>
              <h3 className="mb-2 font-headings text-xl font-black text-primary md:text-2xl">
                Cagnotte festive
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-primary/80 md:text-base">
                Baptêmes, mariages, anniversaires, cadeaux communs, voyages,
                pots de départ… Célèbre les grands moments en mode groupe.
              </p>
              <p className="text-xs font-bold text-primary">
                Commission&nbsp;: 8&nbsp;%
              </p>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 p-7 md:p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
                <HandHeart size={22} aria-hidden />
              </div>
              <h3 className="mb-2 font-headings text-xl font-black text-primary md:text-2xl">
                Cagnotte solidaire
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-primary/80 md:text-base">
                Urgences médicales, éducation, projets solidaires, associations,
                aide aux proches… Mobilise la communauté autour d&apos;une
                cause.
              </p>
              <p className="text-xs font-bold text-primary">
                Commission&nbsp;: 6&nbsp;%
              </p>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-gray-500 md:text-sm">
            La participation est toujours <strong>gratuite</strong> pour tes
            donateurs. La commission est prélevée côté organisateur.
          </p>
        </div>
      </section>

      {/* ─── Values ─── */}
      <section className="bg-primary py-14 text-white md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/60">
                Nos engagements
              </p>
              <h2 className="font-headings text-3xl font-black md:text-4xl">
                La confiance avant tout.
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Sécurité renforcée",
                  desc: "Chiffrement de bout en bout, vérification d'identité (KYC) obligatoire pour les retraits.",
                },
                {
                  icon: Zap,
                  title: "Versements rapides",
                  desc: "Retraits traités sous 48 h ouvrées après validation, directement sur ton compte mobile money.",
                },
                {
                  icon: Users,
                  title: "Transparence totale",
                  desc: "Tarifs affichés en clair, pas de frais cachés, les donateurs ne paient jamais de frais.",
                },
              ].map((value) => (
                <div key={value.title} className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 md:p-7">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                    <value.icon size={22} aria-hidden />
                  </div>
                  <h3 className="mb-2 font-headings text-lg font-black md:text-xl">
                    {value.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/70 md:text-base">
                    {value.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-pink p-8 text-center md:p-12">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-sm">
            <Heart size={26} aria-hidden />
          </div>
          <h2 className="mb-3 font-headings text-2xl font-black text-primary md:text-3xl">
            Prêt à lancer ta cagnotte&nbsp;?
          </h2>
          <p className="mb-6 text-sm font-medium text-primary/70 md:text-base">
            Crée la tienne en 2 minutes ou inspire-toi des cagnottes en cours.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/inscription"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
            >
              Créer ma cagnotte
              <ArrowRight
                size={18}
                aria-hidden
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="/cagnottes"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-primary/20 bg-white px-6 py-3 font-bold text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Parcourir les cagnottes
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
