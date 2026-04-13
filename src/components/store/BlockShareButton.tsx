"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { BlockShareSheet } from "@/components/store/BlockShareSheet";

interface BlockShareButtonProps {
  blockTitle: string;
  shareUrl: string;
  sellerSlug: string;
}

export function BlockShareButton({ blockTitle, shareUrl, sellerSlug }: BlockShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/10 active:scale-90"
        style={{ color: "var(--theme-text, #6B7280)" }}
        aria-label="Partager ce lien"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <BlockShareSheet
          blockTitle={blockTitle}
          shareUrl={shareUrl}
          sellerSlug={sellerSlug}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
