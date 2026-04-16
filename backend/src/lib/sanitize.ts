import sanitizeHtml from "sanitize-html";

// ─────────────────────────────────────────────────────────────────────────
// XSS gate for rich-text fields (cagnotte description).
//
// CLAUDE.md — Audit 011 D-02: any HTML-rendered user content MUST be
// sanitized at the backend boundary (this file) AND again at the frontend
// render site (src/lib/sanitize.ts) as defense in depth.
//
// Whitelist (v1):
//   - inline formatting: <strong>, <em>, <b>, <i>, <u>
//   - paragraphs + line breaks: <p>, <br>
//   - links: <a href> with protocol filtering (http/https/mailto only)
//
// Every link is force-rewritten to open in a new tab with safe rel
// attributes (noopener + noreferrer + nofollow). No JavaScript URIs can
// slip through — `allowedSchemes` excludes `javascript:` and the
// transformer strips unknown protocols.
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
    // Every link is rewritten with safe defaults. If a stored description
    // ever had `target="_self"` or no rel, we overwrite here.
    a: (_tagName, attribs) => ({
      tagName: "a",
      attribs: {
        href: attribs.href || "#",
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
    }),
    // Common style aliases for legacy paste content.
    b: "strong",
    i: "em",
  },
  // Strip any HTML comments (could hide script shims).
  allowedSchemesByTag: {},
  disallowedTagsMode: "discard",
  parseStyleAttributes: false,
};

/**
 * Sanitize rich-text HTML for storage. Returns a whitelist-safe HTML
 * string. Empty input (undefined, "", whitespace, or a document that
 * reduces to no visible text) returns `undefined` so that `description`
 * can stay optional in Zod (`.optional()`).
 */
export function sanitizeRichText(input: string | undefined | null): string | undefined {
  if (!input || typeof input !== "string") return undefined;
  const cleaned = sanitizeHtml(input, RICH_TEXT_OPTIONS).trim();
  if (!cleaned) return undefined;
  // Reject if the sanitized document has no visible text once tags are
  // stripped — prevents whitespace-only `<p> </p>` submissions.
  const textOnly = sanitizeHtml(cleaned, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, "")
    .trim();
  if (!textOnly) return undefined;
  return cleaned;
}

/**
 * Count visible characters in rich-text HTML, used to enforce the
 * `description: z.string().max(5000)` contract on the sanitized output
 * rather than the raw HTML (so heavy markup doesn't falsely inflate the
 * count).
 */
export function richTextLength(html: string): number {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).length;
}
