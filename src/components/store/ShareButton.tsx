"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { ShareSheet } from "@/components/store/ShareSheet";

interface ShareButtonProps {
  slug: string;
  displayName: string;
}

export function ShareButton({ slug, displayName }: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:opacity-80 active:scale-95"
        style={{
          backgroundColor: "var(--theme-card-bg, rgba(0,0,0,0.06))",
          color: "var(--theme-text-muted, #6B7280)",
          border: "1px solid var(--theme-card-border, transparent)",
        }}
        aria-label="Partager cette page"
      >
        <Upload size={15} />
      </button>

      {open && (
        <ShareSheet
          slug={slug}
          displayName={displayName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
