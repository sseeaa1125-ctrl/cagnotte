import sanitizeHtml from "sanitize-html";

// ─────────────────────────────────────────────────────────────────────────
// Frontend render-time XSS gate. Mirrors backend/src/lib/sanitize.ts so
// descriptions that somehow bypass the backend (stale rows, legacy data,
// or a compromised DB) still render safely on the client.
//
// CLAUDE.md — Audit 011 D-02: defense in depth. Never render user HTML
// without passing through this helper first.
// ─────────────────────────────────────────────────────────────────────────

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "b", "i", "u", "a"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  transformTags: {
    a: (_tagName, attribs) => ({
      tagName: "a",
      attribs: {
        href: attribs.href || "#",
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
    }),
    b: "strong",
    i: "em",
  },
  disallowedTagsMode: "discard",
  parseStyleAttributes: false,
};

/**
 * Sanitize rich-text HTML for render. Returns "" when the document is
 * empty so the caller can branch on truthiness before calling
 * `dangerouslySetInnerHTML`.
 */
export function sanitizeRichText(input: string | undefined | null): string {
  if (!input || typeof input !== "string") return "";
  return sanitizeHtml(input, RICH_TEXT_OPTIONS).trim();
}

/**
 * Best-effort detection of legacy plain-text descriptions stored before
 * the rich-text migration. Rows saved as plain text have no HTML tags;
 * we wrap them in <p>…</p> with <br> for each newline so they render
 * inside the prose container without visual regression.
 */
// Audit 030 CR-06 — always route through sanitizeRichText regardless of
// whether input "looks like HTML". The old looksLikeHtml fork was fragile:
// sanitize-html handles plain text fine (returns it unchanged).
export function normalizeLegacyDescription(input: string): string {
  if (!input) return "";
  const sanitized = sanitizeRichText(input);
  // Plain text (no tags survived sanitization) → wrap in <p> with <br> for newlines
  if (!/<\/?[a-z]/i.test(sanitized)) {
    const withBreaks = sanitized.replace(/\n/g, "<br>");
    return `<p>${withBreaks}</p>`;
  }
  return sanitized;
}

/**
 * Strip all tags and return plain text — used for character counting in
 * the editor UI and for sharing/OG descriptions.
 */
export function stripHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
}
