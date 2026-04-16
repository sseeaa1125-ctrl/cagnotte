import { Resend } from "resend";
import * as logger from "./logger.js";

if (!process.env.RESEND_API_KEY) {
  logger.warn("[Email] RESEND_API_KEY manquant — les emails ne seront pas envoyés");
}
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = `cagnotte.sn <${process.env.EMAIL_FROM || "noreply@cagnotte.sn"}>`;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  unsubscribeUrl?: string;
}

// ── Branded email template ──
// Sobre, pro, aux couleurs Izy (teal #0D9488). Pas de marketing.
function wrapEmailHtml(bodyHtml: string, unsubscribeUrl: string): string {
  // Style bare HTML tags (skip those that already have inline styles)
  const styled = bodyHtml
    .replace(/<h2(?!\s+style)>/g, '<h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px 0;">')
    .replace(/<p(?!\s+style)>/g, '<p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 12px 0;">')
    .replace(/<ul(?!\s+style)>/g, '<ul style="margin:0 0 12px 0;padding-left:20px;">')
    .replace(/<li(?!\s+style)>/g, '<li style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 4px 0;">')
    // Remove redundant "— Izy" sign-offs (footer handles branding)
    .replace(/<p[^>]*>\s*—\s*Izy\s*<\/p>/g, "");

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Izy Store</title></head>
<body style="margin:0;padding:0;background-color:#F4F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F5F7;padding:32px 16px;">
<tr><td align="center">

  <!-- Card -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr><td style="padding:24px 32px 18px 32px;border-bottom:1px solid #F0F0F0;">
      <a href="${FRONTEND_URL}" style="text-decoration:none;">
        <img src="${FRONTEND_URL}/logo/logo-izy-vert.png" alt="Izy Store" width="120" height="46" style="display:block;border:0;outline:none;" />
      </a>
    </td></tr>
    <!-- Body -->
    <tr><td style="padding:28px 32px 32px 32px;">
      ${styled}
    </td></tr>
  </table>

  <!-- Footer -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
    <tr><td style="padding:20px 32px 8px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.5;">Izy Store — Ta vitrine en ligne</p>
      <p style="margin:6px 0 0 0;font-size:11px;line-height:1.5;">
        <a href="${unsubscribeUrl}" style="color:#B0B0B0;text-decoration:underline;">Se d\u00e9sabonner</a>
      </p>
    </td></tr>
  </table>

</td></tr>
</table>
</body></html>`;
}

// C1: Extraire le texte brut depuis le HTML pour les clients email texte
function htmlToText(html: string): string {
  return html
    .replace(/<a[^>]*href="([^"]*)"[^>]*>[^<]*<\/a>/gi, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendEmail({ to, subject, html, unsubscribeUrl }: SendEmailParams) {
  try {
    // C2: Header List-Unsubscribe (RFC 2369) pour éviter le spam
    const unsubUrl = unsubscribeUrl || `${FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(to)}`;
    const headers: Record<string, string> = {
      "List-Unsubscribe": `<${unsubUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };

    // Wrap raw HTML in branded template
    const brandedHtml = wrapEmailHtml(html, unsubUrl);

    // C1: Version texte brut automatique (from raw content, not template)
    const text = htmlToText(html);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: brandedHtml,
      text,
      headers,
    });

    if (error) {
      logger.error("Erreur envoi email", error);
      throw new Error(`Erreur email: ${error.message}`);
    }

    return data;
  } catch (err) {
    logger.error("Erreur envoi email", err);
    throw err;
  }
}
