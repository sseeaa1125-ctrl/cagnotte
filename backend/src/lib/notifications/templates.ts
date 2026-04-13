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
      <p>Connecte-toi à ton tableau de bord pour voir le détail.</p>`,
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
        <p>C'est le moment idéal pour relancer le partage — la dynamique est lancée.</p>`,
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
      <p>Bravo ! Tu peux retirer tes fonds depuis ton tableau de bord.</p>`,
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
      <p>C'est le moment de relancer tes proches pour récolter le maximum avant la fin.</p>`,
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
      <p>Tu peux retirer tes fonds depuis ton tableau de bord.</p>`,
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
      <blockquote style="margin:12px 0;padding:12px 16px;background-color:#F9FAFB;border-left:3px solid #0D9488;border-radius:8px;color:#374151;font-style:italic;">${safeMsg}</blockquote>`,
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
      <p>L'argent devrait arriver sur ton mobile money sous quelques minutes.</p>`,
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
    body: `Ton retrait de ${fcfa} n'a pas pu être effectué. Raison : ${reason}. Vérifie ton numéro et réessaye.`,
    icon: "credit-card",
    emailSubject: `Retrait échoué — action requise`,
    emailHtml: `<h2>Retrait échoué</h2>
      <p>Ton retrait de <strong>${fcfa}</strong> n'a pas pu être effectué (tentative ${attempt}).</p>
      <p>Raison : <strong>${safeReason}</strong></p>
      <p>Vérifie ton numéro de mobile money et réessaye depuis ton tableau de bord.</p>`,
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
      <p>Tu peux maintenant retirer tes fonds depuis ton tableau de bord.</p>`,
  };
}

// ── 10. KYC_REJECTED ──
export function kycRejectedTemplate(_input: KycInput, reason: string): TemplateOutput {
  // PROVISIONAL — confirm against Banani screen 20 in Phase 5
  const safeReason = escapeHtml(reason);
  return {
    title: `Documents refusés`,
    body: `Tes documents d'identité ont été refusés. Raison : ${reason}. Soumets de nouveaux documents depuis ton profil.`,
    icon: "check-square",
    emailSubject: `Vérification d'identité refusée`,
    emailHtml: `<h2>Documents refusés</h2>
      <p>Tes documents d'identité n'ont pas pu être validés.</p>
      <p>Raison : <strong>${safeReason}</strong></p>
      <p>Connecte-toi à ton profil pour soumettre de nouveaux documents.</p>`,
  };
}
