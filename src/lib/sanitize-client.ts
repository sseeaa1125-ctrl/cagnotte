// Audit 031 PERF-01 — lightweight client-only HTML stripping.
// Avoids pulling sanitize-html (~160KB) into the client bundle.
// Used only for character counting in RichTextEditor — NOT for security.

export function stripHtml(html: string): string {
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  }
  // Fallback regex for SSR (not security-critical — just char counting)
  return html.replace(/<[^>]*>/g, "").trim();
}
