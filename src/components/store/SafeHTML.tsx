"use client";

import { useId } from "react";
import DOMPurify from "dompurify";

interface SafeHTMLProps {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SafeHTML({ html, className, style }: SafeHTMLProps) {
  const id = useId();
  const scopeId = `safe-${id.replace(/:/g, "")}`;

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "h3", "p", "br", "ul", "ol", "li", "a", "div", "span"],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
  });

  return (
    <>
      <style>{`
        .${scopeId} a { color: var(--theme-primary, #0D9488); }
        .${scopeId} strong, .${scopeId} b { font-weight: 700; }
      `}</style>
      <div
        className={`${scopeId} ${className || ""}`}
        style={style}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </>
  );
}
