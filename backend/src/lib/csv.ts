/**
 * Helpers CSV minimaux pour les exports admin.
 *
 * Format : RFC 4180 — champs avec virgules, guillemets ou retours à la ligne
 * entourés de `"` et les `"` internes doublés. UTF-8 BOM préfixé par défaut
 * pour qu'Excel ouvre correctement les caractères accentués.
 */

export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (value instanceof Date) {
    s = value.toISOString();
  } else if (typeof value === "object") {
    s = JSON.stringify(value);
  } else {
    s = String(value);
  }
  // Quote si contient , " \n \r
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
  opts: { bom?: boolean } = {},
): string {
  const { bom = true } = opts;
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((r) => r.map(escapeCsvValue).join(",")),
  ];
  return (bom ? "\uFEFF" : "") + lines.join("\r\n") + "\r\n";
}

/**
 * Helper pour renvoyer un CSV depuis un handler Express.
 * Set les headers Content-Type + Content-Disposition et flush le payload.
 */
import type { Response } from "express";

export function sendCsv(
  res: Response,
  filename: string,
  content: string,
): void {
  // Sanitize filename — pas de CRLF ni de " pour éviter l'injection dans le header
  const safeName = filename.replace(/[\r\n"]/g, "_");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeName}"`,
  );
  res.send(content);
}
