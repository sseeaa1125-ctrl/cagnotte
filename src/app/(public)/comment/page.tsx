import { Button } from "@/components/ui";
import { HOW_IT_WORKS_LABELS } from "@/lib/constants";

// Phase 8 fixpack — /comment stub page.
// Server component. 3 numbered step cards + CTA to /inscription.
// All copy sourced from HOW_IT_WORKS_LABELS (constants.ts).

export const metadata = {
  title: "Comment ça marche",
  description:
    "Créez votre cagnotte en 3 étapes simples : inscription, partage, collecte via Wave / Orange Money / Free Money.",
};

export default function CommentPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h1 className="font-headings text-4xl font-black text-primary md:text-5xl">
          {HOW_IT_WORKS_LABELS.pageTitle}
        </h1>
        <p className="mt-3 text-base text-muted-foreground md:text-lg">
          {HOW_IT_WORKS_LABELS.pageSubtitle}
        </p>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
        {HOW_IT_WORKS_LABELS.steps.map((step) => (
          <div
            key={step.number}
            className="flex flex-col gap-4 rounded-3xl border border-border bg-background p-6 shadow-sm md:p-8"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full bg-pink font-headings text-2xl font-black text-primary"
              aria-hidden
            >
              {step.number}
            </div>
            <h2 className="font-headings text-xl font-bold text-primary">
              {step.title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-2xl rounded-3xl border border-border bg-background p-8 text-center shadow-sm md:p-12">
        <h2 className="font-headings text-2xl font-bold text-primary md:text-3xl">
          {HOW_IT_WORKS_LABELS.ctaTitle}
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          {HOW_IT_WORKS_LABELS.ctaSubtitle}
        </p>
        <div className="mt-6 flex justify-center">
          <Button as="a" href="/inscription" variant="primary" size="lg">
            {HOW_IT_WORKS_LABELS.ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
