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

// ── Brand colors ──
const NAVY = "#172866";
const NAVY_DARK = "#0E1A40";
const PINK = "#FBE6ED";
const BG = "#F8F9FC";

// ── Branded email template — navy/pink cagnotte.sn design ──
function wrapEmailHtml(bodyHtml: string, unsubscribeUrl: string): string {
  // Style bare HTML tags (skip those that already have inline styles)
  const styled = bodyHtml
    .replace(/<h2(?!\s+style)>/g, `<h2 style="font-size:20px;font-weight:700;color:${NAVY};margin:0 0 16px 0;font-family:'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">`)
    .replace(/<p(?!\s+style)>/g, '<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 14px 0;">')
    .replace(/<ul(?!\s+style)>/g, '<ul style="margin:0 0 12px 0;padding-left:20px;">')
    .replace(/<li(?!\s+style)>/g, '<li style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 4px 0;">')
    .replace(/<strong(?!\s+style)>/g, `<strong style="color:${NAVY};font-weight:600;">`)
    .replace(/<p[^>]*>\s*—\s*Izy\s*<\/p>/g, "");

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>cagnotte.sn</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};padding:40px 16px;">
<tr><td align="center">

  <!-- Card -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(23,40,102,0.08);">
    <!-- Header — navy banner -->
    <tr><td style="background-color:${NAVY};padding:28px 32px 24px 32px;text-align:center;">
      <a href="${FRONTEND_URL}" style="text-decoration:none;">
        <span style="font-family:'Poppins',-apple-system,sans-serif;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">cagnotte.sn</span>
      </a>
    </td></tr>
    <!-- Pink accent bar -->
    <tr><td style="background-color:${PINK};height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
    <!-- Body -->
    <tr><td style="padding:32px 32px 36px 32px;">
      ${styled}
    </td></tr>
  </table>

  <!-- Footer -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
    <tr><td style="padding:24px 32px 8px 32px;text-align:center;">
      <p style="margin:0;font-size:13px;color:${NAVY_DARK};font-weight:500;font-family:'Poppins',-apple-system,sans-serif;opacity:0.7;">cagnotte.sn</p>
      <p style="margin:4px 0 0 0;font-size:12px;color:#9CA3AF;line-height:1.5;">La cagnotte en ligne pour le S\u00e9n\u00e9gal</p>
      <p style="margin:10px 0 0 0;font-size:11px;line-height:1.5;">
        <a href="${unsubscribeUrl}" style="color:#B0B0B0;text-decoration:underline;">Se d\u00e9sabonner</a>
      </p>
    </td></tr>
  </table>

</td></tr>
</table>
</body></html>`;
}

// Extraire le texte brut depuis le HTML pour les clients email texte
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
    // Header List-Unsubscribe (RFC 2369) pour éviter le spam
    const unsubUrl = unsubscribeUrl || `${FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(to)}`;
    const headers: Record<string, string> = {
      "List-Unsubscribe": `<${unsubUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };

    // Wrap raw HTML in branded template
    const brandedHtml = wrapEmailHtml(html, unsubUrl);

    // Version texte brut automatique (from raw content, not template)
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
