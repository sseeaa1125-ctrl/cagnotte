import * as React from "react";
import { Button } from "@/components/ui";
import { NAV_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface PreFooterProps {
  className?: string;
}

export function PreFooter({ className }: PreFooterProps) {
  return (
    <section
      className={cn(
        "bg-pink px-6 py-16 text-center",
        className,
      )}
    >
      <div className="container mx-auto max-w-2xl space-y-4">
        <h2 className="font-headings text-3xl font-bold text-primary md:text-4xl">
          Prêt à créer votre cagnotte ?
        </h2>
        <p className="text-base text-primary/80">
          Collectez des contributions via Wave, Orange Money ou Free Money.
        </p>
        <div className="flex justify-center pt-2">
          <Button as="a" href="/inscription" variant="primary" size="lg">
            {NAV_LABELS.creerCagnotte}
          </Button>
        </div>
      </div>
    </section>
  );
}
