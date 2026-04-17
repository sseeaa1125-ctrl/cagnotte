"use client";

// Audit 031 PERF-02 — Lazy-load TipTap rich text editor (~200KB).
// Only loaded when a page actually renders <RichTextEditor />.
// Consumers keep importing from @/components/ui with no code changes.

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { RichTextEditorProps } from "./RichTextEditor";

const RichTextEditorInner = dynamic(
  () =>
    import("./RichTextEditor").then((m) => ({
      default: m.RichTextEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className={cn(
          "min-h-[10rem] animate-pulse rounded-xl border border-border bg-muted",
        )}
      />
    ),
  },
);

export function RichTextEditor(props: RichTextEditorProps) {
  return <RichTextEditorInner {...props} />;
}
