"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Italic, Link as LinkIcon, Unlink } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import { Modal } from "./Modal";
import { cn } from "@/lib/utils";
// Audit 031 PERF-01 — lightweight client-only stripHtml avoids pulling
// sanitize-html (~160KB) into the client bundle.
import { stripHtml } from "@/lib/sanitize-client";

// ─────────────────────────────────────────────────────────────────────────
// Rich-text editor for cagnotte descriptions.
//
// Scope v1: bold, italic, link. No headings, lists, images — kept narrow
// to match the 5000-char max and the Banani prose style. External links
// auto-open in a new tab with safe rel attributes (rewritten again on
// backend ingest via lib/sanitize.ts).
//
// Character counter uses the text-stripped length so HTML wrappers
// (<p>, <strong>, <a>) don't inflate the count the user sees.
// ─────────────────────────────────────────────────────────────────────────

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  placeholder?: string;
  helper?: string;
  error?: string;
  maxLength?: number;
  className?: string;
  id?: string;
}

export function RichTextEditor({
  value,
  onChange,
  label,
  placeholder,
  helper,
  error,
  maxLength,
  className,
  id,
}: RichTextEditorProps) {
  const reactId = React.useId();
  const editorId = id ?? reactId;

  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkError, setLinkError] = React.useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // v1 scope: no headings, lists, blockquote, code — only bold +
        // italic + paragraph are actually enabled. Keeping the extension
        // installed costs ~0 and preserves default history/typography.
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          // Safe defaults; backend re-applies them on save.
          target: "_blank",
          rel: "noopener noreferrer nofollow",
          class: "text-primary underline underline-offset-2",
        },
        // Prevent `javascript:` URIs at the editor level — the backend
        // also filters these via sanitize-html, but we block them here
        // so the user sees a clean rejection instead of silent data
        // loss after save.
        validate: (href) => /^(https?:\/\/|mailto:)/i.test(href),
      }),
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: editorId,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label ?? "Éditeur de description",
        class: cn(
          "min-h-40 w-full rounded-b-lg border border-t-0 bg-background px-4 py-3 text-base text-primary outline-none",
          "prose prose-sm max-w-none",
          "prose-p:my-2 prose-p:leading-relaxed",
          "prose-strong:text-primary prose-strong:font-bold",
          "prose-em:text-primary",
          "prose-a:text-primary prose-a:underline prose-a:underline-offset-2",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          error ? "border-red-500" : "border-border",
        ),
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      // Tiptap returns `<p></p>` for an empty doc — normalize to "".
      const plain = stripHtml(html);
      onChange(plain.trim() ? html : "");
    },
  });

  // Keep the editor in sync if the parent forcibly resets `value` (e.g.
  // draft hydration from sessionStorage after mount). We compare against
  // the current HTML to avoid infinite loops during normal typing.
  React.useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label className="text-sm font-medium text-primary">{label}</label>
        ) : null}
        <div className="min-h-40 w-full animate-pulse rounded-lg border border-border bg-muted" />
      </div>
    );
  }

  const plainLength = stripHtml(editor.getHTML()).length;

  function openLinkDialog() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    setLinkUrl(previousUrl ?? "");
    setLinkError(null);
    setLinkDialogOpen(true);
  }

  function closeLinkDialog() {
    setLinkDialogOpen(false);
    setLinkUrl("");
    setLinkError(null);
  }

  function submitLink(e: React.FormEvent) {
    e.preventDefault();
    if (!editor) return;
    const trimmed = linkUrl.trim();
    if (!trimmed) {
      setLinkError("Entrez une URL ou utilisez « Retirer » pour supprimer le lien.");
      return;
    }
    const normalized = /^(https?:\/\/|mailto:)/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    // Reject obviously invalid URLs after normalization (no dot in host,
    // spaces, etc). Tiptap's Link extension also has a `validate` callback
    // that rejects non-http/mailto schemes — defense in depth.
    try {
      new URL(normalized);
    } catch {
      setLinkError("URL invalide. Exemple : https://example.com");
      return;
    }

    const selection = editor.state.selection;
    if (selection.empty && !editor.isActive("link")) {
      // No selection AND not inside an existing link → insert the URL as
      // its own text so the user sees something appear. Without this
      // branch, `setLink` on an empty selection does nothing visible.
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: trimmed,
          marks: [{ type: "link", attrs: { href: normalized } }],
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: normalized })
        .run();
    }
    closeLinkDialog();
  }

  function handleRemoveLinkFromDialog() {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    closeLinkDialog();
  }

  function handleUnlink() {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
  }

  const isEmpty = editor.isEmpty;

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={editorId}
          className="text-sm font-medium text-primary"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        {/* Toolbar */}
        <div
          role="toolbar"
          aria-label="Mise en forme"
          className={cn(
            "flex items-center gap-1 rounded-t-lg border border-b-0 bg-gray-50 px-2 py-1.5",
            error ? "border-red-500" : "border-border",
          )}
        >
          <ToolbarButton
            label="Gras"
            pressed={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={16} aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Italique"
            pressed={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={16} aria-hidden />
          </ToolbarButton>
          <span aria-hidden className="mx-1 h-5 w-px bg-gray-300" />
          <ToolbarButton
            label="Ajouter un lien"
            pressed={editor.isActive("link")}
            onClick={openLinkDialog}
          >
            <LinkIcon size={16} aria-hidden />
          </ToolbarButton>
          {editor.isActive("link") ? (
            <ToolbarButton label="Retirer le lien" onClick={handleUnlink}>
              <Unlink size={16} aria-hidden />
            </ToolbarButton>
          ) : null}
        </div>

        {/* The editor content — placeholder rendered as overlay because
            StarterKit's built-in placeholder extension is heavy for a
            single field. */}
        <div className="relative">
          <EditorContent editor={editor} />
          {isEmpty && placeholder ? (
            <p className="pointer-events-none absolute left-4 top-3 select-none text-base text-muted-foreground">
              {placeholder}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-h-4 flex-1">
          {error ? (
            <p className="text-xs text-red-500">{error}</p>
          ) : helper ? (
            <p className="text-xs text-muted-foreground">{helper}</p>
          ) : null}
        </div>
        {maxLength ? (
          <p
            className={cn(
              "text-xs tabular-nums",
              plainLength > maxLength
                ? "text-red-500"
                : "text-muted-foreground",
            )}
          >
            {plainLength}/{maxLength}
          </p>
        ) : null}
      </div>

      {/* Link insertion dialog — replaces window.prompt() so the UI
          stays on-brand. Auto-focuses the URL input on open; Enter
          submits; Esc + backdrop + "Annuler" all close without change.
          If the cursor is already on a link, a third "Retirer" button
          appears to strip the link in one click. */}
      <Modal
        open={linkDialogOpen}
        onClose={closeLinkDialog}
        title="Ajouter un lien"
        size="sm"
      >
        <form onSubmit={submitLink} className="flex flex-col gap-4">
          <Input
            label="URL du lien"
            type="url"
            value={linkUrl}
            onChange={(e) => {
              setLinkUrl(e.target.value);
              if (linkError) setLinkError(null);
            }}
            placeholder="https://example.com"
            autoFocus
            autoComplete="url"
            inputMode="url"
            error={linkError ?? undefined}
            helper={
              linkError
                ? undefined
                : "Le lien s'ouvrira dans un nouvel onglet."
            }
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={closeLinkDialog}
            >
              Annuler
            </Button>
            {editor.isActive("link") ? (
              <Button
                type="button"
                variant="danger"
                onClick={handleRemoveLinkFromDialog}
              >
                Retirer
              </Button>
            ) : null}
            <Button type="submit" variant="primary">
              {editor.isActive("link") ? "Mettre à jour" : "Ajouter"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({
  label,
  pressed,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        "hover:bg-pink/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        pressed ? "bg-primary text-white hover:bg-primary-hover" : "text-primary",
      )}
    >
      {children}
    </button>
  );
}
