import { ABOUT_LABELS } from "@/lib/constants";

// Phase 8 fixpack — /a-propos stub page.
// Server component. 4 paragraphs about the platform mission.
// All copy sourced from ABOUT_LABELS (constants.ts).

export const metadata = {
  title: "À propos",
  description:
    "Cagnotte.sn est la plateforme sénégalaise dédiée à la collecte de fonds en ligne via Wave, Orange Money, Free Money et carte bancaire.",
};

export default function AproposPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <header className="mx-auto mb-10 max-w-3xl">
        <h1 className="font-headings text-4xl font-black text-primary md:text-5xl">
          {ABOUT_LABELS.pageTitle}
        </h1>
      </header>

      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        {ABOUT_LABELS.paragraphs.map((p, i) => (
          <p
            key={i}
            className="text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
