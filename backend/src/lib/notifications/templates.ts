/**
 * Notification templates — Phase 2 plan 02-02.
 *
 * 9 French notification templates covering the cagnottes.sn surface.
 * Each factory returns { title, body, icon, emailSubject, emailHtml }.
 *
 * Copy is sourced from .planning/phases/02-backend-surfaces-exit-gate/02-RESEARCH.md
 * Q5 (table at line 510), itself grounded in BACKEND-PLAN.md lines 80-89.
 *
 * PROVISIONAL — the exact French wording will be confirmed against
 * Banani screen 20 in Phase 5 (notification feed UI integration).
 *
 * Anonymous donor handling per resolved Q1: public-facing strings use
 * "Un participant anonyme"; the dispatcher passes donorDisplayName
 * separately on `Notification.data` so the creator-side feed can show
 * the real name behind a "Anonyme" hint.
 *
 * HTML emails escapeHtml() any user-supplied fields (donor message, title)
 * to prevent stored XSS — see lib/utils.ts escapeHtml.
 */

import { escapeHtml } from "../utils.js";

// ── FCFA formatting helper ──
// Intl.NumberFormat("fr-FR") uses U+202F NARROW NO-BREAK SPACE; replace with
// a regular space so the wire format matches lib/utils.ts formatPrice() and
// stays consistent across SMS/email/in-app surfaces.
function formatFcfa(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n).replace(/\u202f/g, " ") + " FCFA";
}

// French short date (DD MMMM YYYY) — used by ending-soon and ended templates.
function formatDateFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// Public site URL for absolute links inside transactional emails.
const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "https://cagnotte.sn";

// Inline navy CTA button — Outlook-safe. Brand color #172866.
function ctaButton(label: string, path: string): string {
  const safeLabel = escapeHtml(label);
  const href = `${PUBLIC_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0 8px 0;">
    <tr><td style="border-radius: 14px; background-color: #172866;">
      <a href="${href}" target="_blank" rel="noopener" style="display: inline-block; padding: 16px 32px; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 14px; letter-spacing: 0.2px;">${safeLabel}</a>
    </td></tr>
  </table>`;
}

export interface TemplateOutput {
  title: string;
  body: string;
  icon: string;
  emailSubject: string;
  emailHtml: string;
}

// ── 1. DONATION_RECEIVED ──
export interface DonationReceivedInput {
  donorPublicName: string; // "Julien R." or "Un participant anonyme"
  amount: number;
  cagnotteTitle: string;
}

export function donationReceivedTemplate(input: DonationReceivedInput): TemplateOutput {
  // PROVISIONAL — confirm against Banani screen 20 in Phase 5
  const safeName = escapeHtml(input.donorPublicName);
  const safeTitle = escapeHtml(input.cagnotteTitle);
  const fcfa = formatFcfa(input.amount);
  return {
    title: `${input.donorPublicName} a participé à ${input.cagnotteTitle}`,
    body: `${input.donorPublicName} vient de participer ${fcfa} à ta cagnotte « ${input.cagnotteTitle} »`,
    icon: "heart",
    emailSubject: `${fcfa} reçus — ${input.cagnotteTitle}`,
    emailHtml: `<h2>Nouvelle participation</h2>
      <p><strong>${safeName}</strong> vient de participer <strong>${fcfa}</strong> à ta cagnotte <strong>« ${safeTitle} »</strong>.</p>
      ${ctaButton("Voir ma cagnotte", "/tableau-de-bord")}`,
  };
}

// ── 2 + 3. MILESTONE_REACHED (50 / 100) ──
export interface MilestoneInput {
  cagnotteTitle: string;
  goalAmount: number;
}

export function milestoneTemplate(input: MilestoneInput, threshold: 50 | 100): TemplateOutput {
  // PROVISIONAL — confirm against Banani screen 20 in Phase 5
  const safeTitle = escapeHtml(input.cagnotteTitle);
  const fcfa = formatFcfa(input.goalAmount);
  if (threshold === 50) {
    return {
      title: `Tu as atteint 50 % de ton objectif !`,
      body: `Ta cagnotte « ${input.cagnotteTitle} » a atteint 50 % de l'objectif. Continue à partager !`,
      icon: "check-square",
      emailSubject: `50 % atteint — ${input.cagnotteTitle}`,
      emailHtml: `<h2>50 % atteint !</h2>
        <p>Ta cagnotte <strong>« ${safeTitle} »</strong> a atteint la moitié de son objectif.</p>
        <p>C'est le moment idéal pour relancer le partage — la dynamique est lancée.</p>
        ${ctaButton("Partager ma cagnotte", "/tableau-de-bord")}`,
    };
  }
  // threshold === 100
  return {
    title: `Objectif atteint !`,
    body: `Ta cagnotte « ${input.cagnotteTitle} » a atteint son objectif de ${fcfa}. Bravo !`,
    icon: "check-square",
    emailSubject: `Objectif atteint — ${input.cagnotteTitle}`,
    emailHtml: `<h2>Objectif atteint</h2>
      <p>Ta cagnotte <strong>« ${safeTitle} »</strong> a atteint son objectif de <strong>${fcfa}</strong>.</p>
      <p>Bravo ! Tu peux retirer tes fonds depuis ton tableau de bord.</p>
      ${ctaButton("Retirer mes fonds", "/retraits")}`,
  };
}

// ── 4. CAGNOTTE_ENDING_SOON ──
export interface EndingSoonInput {
  cagnotteTitle: string;
  endDate: Date;
}

export function endingSoonTemplate(input: EndingSoonInput): TemplateOutput {
  // PROVISIONAL — confirm against Banani screen 20 in Phase 5
  const safeTitle = escapeHtml(input.cagnotteTitle);
  const dateStr = formatDateFr(input.endDate);
  return {
    title: `Ta cagnotte se termine dans 3 jours`,
    body: `« ${input.cagnotteTitle} » se termine le ${dateStr}. C'est le dernier moment pour la partager.`,
    icon: "clock",
    emailSubject: `Plus que 3 jours — ${input.cagnotteTitle}`,
    emailHtml: `<h2>Plus que quelques jours</h2>
      <p>Ta cagnotte <strong>« ${safeTitle} »</strong> se termine le <strong>${dateStr}</strong>.</p>
      <p>C'est le moment de relancer tes proches pour récolter le maximum avant la fin.</p>
      ${ctaButton("Partager ma cagnotte", "/tableau-de-bord")}`,
  };
}

// ── 5. CAGNOTTE_ENDED ──
export interface CagnotteEndedInput {
  cagnotteTitle: string;
  totalRaised: number;
  donorCount: number;
}

export function cagnotteEndedTemplate(input: CagnotteEndedInput): TemplateOutput {
  // PROVISIONAL — confirm against Banani screen 20 in Phase 5
  const safeTitle = escapeHtml(input.cagnotteTitle);
  const fcfa = formatFcfa(input.totalRaised);
  return {
    title: `Ta cagnotte est terminée`,
    body: `« ${input.cagnotteTitle} » s'est terminée avec ${fcfa} collectés auprès de ${input.donorCount} participants.`,
    icon: "clock",
    emailSubject: `${input.cagnotteTitle} est terminée — ${fcfa}`,
    emailHtml: `<h2>Cagnotte terminée</h2>
      <p>Ta cagnotte <strong>« ${safeTitle} »</strong> s'est terminée.</p>
      <p>Total collecté : <strong>${fcfa}</strong><br>Participants : <strong>${input.donorCount}</strong></p>
      <p>Tu peux retirer tes fonds depuis ton tableau de bord.</p>
      ${ctaButton("Retirer mes fonds", "/retraits")}`,
  };
}

// ── 6. DONATION_MESSAGE ──
export interface DonationMessageInput {
  donorPublicName: string;
  message: string;
  cagnotteTitle: string;
}

export function donationMessageTemplate(input: DonationMessageInput): TemplateOutput {
  // PROVISIONAL — confirm against Banani screen 20 in Phase 5
  const safeName = escapeHtml(input.donorPublicName);
  const safeMsg = escapeHtml(input.message);
  const safeTitle = escapeHtml(input.cagnotteTitle);
  return {
    title: `${input.donorPublicName} a laissé un message`,
    body: `« ${input.message} » — sur ta cagnotte « ${input.cagnotteTitle} »`,
    icon: "message-circle",
    emailSubject: `Nouveau message sur ${input.cagnotteTitle}`,
    emailHtml: `<h2>Nouveau message</h2>
      <p><strong>${safeName}</strong> a laissé un message sur ta cagnotte <strong>« ${safeTitle} »</strong> :</p>
      <blockquote style="margin:16px 0;padding:14px 18px;background-color:#FBE6ED;border-left:3px solid #172866;border-radius:10px;color:#374151;font-style:italic;">${safeMsg}</blockquote>
      ${ctaButton("Voir ma cagnotte", "/tableau-de-bord")}`,
  };
}

// ── 7. PAYOUT_COMPLETED ──
export interface PayoutCompletedInput {
  amount: number;
  phoneMasked: string;
  provider: string;
}

export function payoutCompletedTemplate(input: PayoutCompletedInput): TemplateOutput {
  // PROVISIONAL — confirm against Banani screen 20 in Phase 5
  const safePhone = escapeHtml(input.phoneMasked);
  const safeProvider = escapeHtml(input.provider);
  const fcfa = formatFcfa(input.amount);
  return {
    title: `Retrait effectué`,
    body: `Ton retrait de ${fcfa} vers ${input.phoneMasked} (${input.provider}) a été effectué avec succès.`,
    icon: "credit-card",
    emailSubject: `Retrait de ${fcfa} effectué`,
    emailHtml: `<h2>Retrait effectué</h2>
      <p>Ton retrait de <strong>${fcfa}</strong> vers <strong>${safePhone}</strong> (${safeProvider}) a été effectué avec succès.</p>
      <p>L'argent devrait arriver sur ton Mobile Money sous quelques minutes.</p>
      ${ctaButton("Voir mes retraits", "/retraits")}`,
  };
}

// ── 8. PAYOUT_FAILED ──
export interface PayoutFailedInput {
  amount: number;
}

export function payoutFailedTemplate(input: PayoutFailedInput, reason: string, attempt: number): TemplateOutput {
  // PROVISIONAL — confirm against Banani screen 20 in Phase 5
  const safeReason = escapeHtml(reason);
  const fcfa = formatFcfa(input.amount);
  return {
    title: `Retrait échoué`,
    body: `Ton retrait de ${fcfa} n'a pas pu être effectué. Raison : ${safeReason}. Vérifie ton numéro et réessaye.`,
    icon: "credit-card",
    emailSubject: `Retrait échoué — action requise`,
    emailHtml: `<h2>Retrait échoué</h2>
      <p>Ton retrait de <strong>${fcfa}</strong> n'a pas pu être effectué (tentative ${attempt}).</p>
      <p>Raison : <strong>${safeReason}</strong></p>
      <p>Vérifie ton numéro Mobile Money et réessaye depuis ton tableau de bord.</p>
      ${ctaButton("Réessayer le retrait", "/retraits")}`,
  };
}

// ── 8b. PAYOUT_CANCELLED (admin cancellation during 48h window) ──
export interface PayoutCancelledInput {
  amount: number;
}

export function payoutCancelledTemplate(input: PayoutCancelledInput, reason: string): TemplateOutput {
  const safeReason = escapeHtml(reason);
  const fcfa = formatFcfa(input.amount);
  return {
    title: `Retrait annulé`,
    body: `Ta demande de retrait de ${fcfa} a été annulée. Raison : ${safeReason}. Contacte le support pour plus d'informations.`,
    icon: "credit-card",
    emailSubject: `Retrait de ${fcfa} annulé`,
    emailHtml: `<h2>Retrait annulé</h2>
      <p>Ta demande de retrait de <strong>${fcfa}</strong> a été annulée par l'équipe cagnottes.sn.</p>
      <p>Raison : <strong>${safeReason}</strong></p>
      <p>Ton solde a été rétabli. Si tu as des questions, contacte notre support.</p>
      ${ctaButton("Voir mes retraits", "/retraits")}`,
  };
}

// ── 8c. WITHDRAWAL_BLOCKED (admin blocks withdrawals for a seller) ──
export interface WithdrawalBlockedInput {
  sellerName?: string;
}

export function withdrawalBlockedTemplate(_input: WithdrawalBlockedInput, reason: string): TemplateOutput {
  const safeReason = escapeHtml(reason);
  return {
    title: `Retraits suspendus`,
    body: `Tes retraits ont été suspendus. Raison : ${safeReason}. Contacte le support.`,
    icon: "shield-alert",
    emailSubject: `Tes retraits ont été suspendus`,
    emailHtml: `<h2>Retraits suspendus</h2>
      <p>Tes retraits ont été temporairement suspendus par l'équipe cagnottes.sn.</p>
      <p>Raison : <strong>${safeReason}</strong></p>
      <p>Si tu penses que c'est une erreur ou si tu as les documents requis, contacte notre support.</p>
      ${ctaButton("Contacter le support", "/aide")}`,
  };
}

// ── 9. KYC_APPROVED ──
export interface KycInput {
  // Reserved for future personalization (sellerName, etc.)
  sellerName?: string;
}

export function kycApprovedTemplate(_input: KycInput): TemplateOutput {
  // PROVISIONAL — confirm against Banani screen 20 in Phase 5
  return {
    title: `Identité vérifiée`,
    body: `Ton identité a été vérifiée. Tu peux maintenant retirer tes fonds.`,
    icon: "check-square",
    emailSubject: `Ton identité a été vérifiée`,
    emailHtml: `<h2>Identité vérifiée</h2>
      <p>Bonne nouvelle — ton identité a été vérifiée avec succès.</p>
      <p>Tu peux maintenant retirer tes fonds depuis ton tableau de bord.</p>
      ${ctaButton("Retirer mes fonds", "/retraits")}`,
  };
}

// ── 10. KYC_REJECTED ──
export function kycRejectedTemplate(_input: KycInput, reason: string): TemplateOutput {
  // PROVISIONAL — confirm against Banani screen 20 in Phase 5
  const safeReason = escapeHtml(reason);
  return {
    title: `Documents refusés`,
    body: `Tes documents d'identité ont été refusés. Raison : ${safeReason}. Soumets de nouveaux documents depuis ton profil.`,
    icon: "check-square",
    emailSubject: `Vérification d'identité refusée`,
    emailHtml: `<h2>Documents refusés</h2>
      <p>Tes documents d'identité n'ont pas pu être validés.</p>
      <p>Raison : <strong>${safeReason}</strong></p>
      <p>Connecte-toi à ton profil pour soumettre de nouveaux documents.</p>
      ${ctaButton("Soumettre à nouveau", "/profil/kyc")}`,
  };
}

// ── 11. CARD_APPROVED ──
export interface CardReviewInput {
  blockTitle: string;
  blockSlug: string;
}

export function cardApprovedTemplate(input: CardReviewInput): TemplateOutput {
  const safeTitle = escapeHtml(input.blockTitle);
  return {
    title: `Carte bancaire activée`,
    body: `Ta cagnotte « ${input.blockTitle} » accepte désormais les paiements par carte bancaire.`,
    icon: "credit-card",
    emailSubject: `Paiement par carte activé sur ${input.blockTitle}`,
    emailHtml: `<h2>Carte bancaire activée</h2>
      <p>Bonne nouvelle — ta cagnotte <strong>${safeTitle}</strong> accepte désormais les paiements par carte bancaire en plus du mobile money.</p>
      <p>Les donateurs verront automatiquement l'option « Carte bancaire » sur ta page de paiement.</p>
      ${ctaButton("Voir ma cagnotte", `/c/${input.blockSlug}`)}`,
  };
}

// ── 12. CARD_REJECTED ──
export function cardRejectedTemplate(input: CardReviewInput, reason: string): TemplateOutput {
  const safeTitle = escapeHtml(input.blockTitle);
  const safeReason = escapeHtml(reason);
  return {
    title: `Demande carte refusée`,
    body: `Ta demande d'activation de la carte bancaire pour « ${input.blockTitle} » a été refusée. Raison : ${safeReason}.`,
    icon: "credit-card",
    emailSubject: `Demande carte refusée — ${input.blockTitle}`,
    emailHtml: `<h2>Demande carte refusée</h2>
      <p>Ta demande d'activation des paiements par carte bancaire pour <strong>${safeTitle}</strong> a été refusée.</p>
      <p>Raison : <strong>${safeReason}</strong></p>
      <p>Tu peux modifier ta cagnotte et re-soumettre une demande quand tu veux.</p>
      ${ctaButton("Modifier ma cagnotte", `/tableau-de-bord/cagnottes/${input.blockSlug}/modifier`)}`,
  };
}
