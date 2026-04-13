"use client";

import { useRef, useState, useCallback } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Link2, Heading2, RemoveFormatting } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder = "Écris ton contenu..." }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(!value);
  const initializedRef = useRef(false);

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      editorRef.current = node;
      if (node && !initializedRef.current) {
        node.innerHTML = value || "";
        setIsEmpty(!value);
        initializedRef.current = true;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const empty = !html || html === "<br>" || html === "<div><br></div>" || html.trim() === "";
    setIsEmpty(empty);
    onChange(empty ? "" : html);
  }, [onChange]);

  function exec(command: string, val?: string) {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    handleInput();
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  const tools = [
    { cmd: "bold", Icon: Bold, tip: "Gras" },
    { cmd: "italic", Icon: Italic, tip: "Italique" },
    { cmd: "underline", Icon: Underline, tip: "Souligné" },
    { cmd: "formatBlock_h3", Icon: Heading2, tip: "Sous-titre" },
    { cmd: "insertUnorderedList", Icon: List, tip: "Liste à puces" },
    { cmd: "insertOrderedList", Icon: ListOrdered, tip: "Liste numérotée" },
    { cmd: "removeFormat", Icon: RemoveFormatting, tip: "Supprimer le formatage" },
  ];

  function handleToolClick(cmd: string) {
    if (cmd === "formatBlock_h3") {
      exec("formatBlock", "<h3>");
    } else {
      exec(cmd);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-300 bg-white transition-colors focus-within:border-teal-600 focus-within:ring-1 focus-within:ring-teal-600">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        {tools.map(({ cmd, Icon, tip }) => (
          <button
            key={cmd}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleToolClick(cmd);
            }}
            title={tip}
            className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
          >
            <Icon size={14} />
          </button>
        ))}
        <div className="mx-1 h-4 w-px bg-gray-300" />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            const url = prompt("URL du lien :");
            if (url) exec("createLink", url);
          }}
          title="Lien"
          className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
        >
          <Link2 size={14} />
        </button>
      </div>
      <div className="relative">
        {isEmpty && (
          <div className="pointer-events-none absolute left-4 top-3 text-sm text-gray-400">
            {placeholder}
          </div>
        )}
        <div
          ref={setRef}
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          className="min-h-[100px] px-4 py-3 text-sm text-gray-900 outline-none [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-bold [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc [&_a]:text-teal-600 [&_a]:underline"
        />
      </div>
    </div>
  );
}
