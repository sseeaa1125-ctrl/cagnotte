"use client";

import * as React from "react";
import { Settings, Share2 } from "lucide-react";
import { Button } from "@/components/ui";
import { CREATOR_DETAIL_LABELS } from "@/lib/constants";
import { ShareSheet } from "./ShareSheet";

interface HeroActionsProps {
  slug: string;
  title: string;
  shareUrl: string;
}

// Desktop-only hero actions rendered over the banner.
// Mobile uses <MobileActionBar /> instead.
export function HeroActions({ slug, title, shareUrl }: HeroActionsProps) {
  const [shareOpen, setShareOpen] = React.useState(false);

  return (
    <>
      <div className="hidden shrink-0 gap-2 md:flex">
        <Button
          as="a"
          href={`/tableau-de-bord/cagnottes/${slug}/modifier`}
          size="md"
          iconLeft={<Settings size={16} />}
          className="!border-white/25 !bg-white/10 !text-white backdrop-blur-md hover:!bg-white/20"
        >
          {CREATOR_DETAIL_LABELS.manageCta}
        </Button>
        <Button
          type="button"
          onClick={() => setShareOpen(true)}
          variant="primary"
          size="md"
          iconLeft={<Share2 size={16} />}
          className="!bg-white !text-primary shadow-lg hover:!bg-white/95"
        >
          {CREATOR_DETAIL_LABELS.shareCta}
        </Button>
      </div>
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        title={title}
      />
    </>
  );
}
