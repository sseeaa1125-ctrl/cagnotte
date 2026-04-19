/**
 * Notification dispatch — typed wrappers, one per fire site.
 *
 * Phase 2 plan 02-02. Each wrapper composes a deterministic dedupeKey,
 * builds the template, and calls createNotification(). The dispatcher
 * never inspects pref/email gating — that's createNotification()'s job.
 *
 * dedupeKey formulas (RESEARCH Q5):
 *   - donation_received:{orderId}
 *   - donation_message:{orderId}
 *   - milestone:{blockId}:{50|100}
 *   - ending_soon:{blockId}            (one per block lifecycle)
 *   - cagnotte_ended:{blockId}
 *   - payout:{withdrawalId}:{completed|failed:attempt{N}}
 *   - kyc:{sellerId}:{approved|rejected}
 *
 * Per resolved Q1: the creator's own feed shows the real donor name via
 * `Notification.data.donorDisplayName` plus a `wasAnonymous: true` flag.
 * Public-facing strings (title/body) use "Un participant anonyme" so the
 * feed surface is safe even if a JS bug skips the masking client-side.
 */

import type { NotificationType } from "../../generated/prisma/client.js";
import { maskPhone } from "../phone.js";
import { createNotification, type CreateNotificationResult } from "./index.js";
import {
  donationReceivedTemplate,
  milestoneTemplate,
  endingSoonTemplate,
  cagnotteEndedTemplate,
  payoutCancelledTemplate,
  withdrawalBlockedTemplate,
  donationMessageTemplate,
  payoutCompletedTemplate,
  payoutFailedTemplate,
  kycApprovedTemplate,
  kycRejectedTemplate,
} from "./templates.js";

// ── Minimal structural types — keep the dispatchers callable from any
// route without forcing a Prisma full-model import. Each route passes the
// fields it actually has after the inserts/lookups in webhook/withdrawal/cron. ──

export interface OrderForDispatch {
  id: string;
  amount: number;
  // The voluntary "Soutenir cagnotte.sn" tip goes 100% to the platform.
  // We subtract it before surfacing the amount to creators so the figure
  // they see equals the donor's actual contribution to the cagnotte.
  voluntaryContribution: number;
  customerName: string | null;
  isAnonymous: boolean;
  donorMessage: string | null;
  messageIsPrivate: boolean;
}

export interface BlockForDispatch {
  id: string;
  sellerId: string;
  title: string;
  config: unknown; // JSON — { goalAmount, endDate, ... }
}

export interface WithdrawalForDispatch {
  id: string;
  sellerId: string;
  amount: number;
  phone: string;
  provider: string;
}

export interface SellerForDispatch {
  id: string;
}

// ── helpers ──
function donorPublicName(order: OrderForDispatch): string {
  if (order.isAnonymous) return "Un participant anonyme";
  return order.customerName?.trim() || "Un participant";
}

function blockGoalAmount(block: BlockForDispatch): number {
  const cfg = (block.config as { goalAmount?: number } | null) || {};
  return typeof cfg.goalAmount === "number" ? cfg.goalAmount : 0;
}

function blockEndDate(block: BlockForDispatch): Date | null {
  const cfg = (block.config as { endDate?: string } | null) || {};
  return cfg.endDate ? new Date(cfg.endDate) : null;
}

// ── 1. DONATION_RECEIVED ──
export async function fireDonationReceived(
  order: OrderForDispatch,
  block: BlockForDispatch,
): Promise<CreateNotificationResult> {
  const cagnotteAmount = order.amount - (order.voluntaryContribution ?? 0);
  const tpl = donationReceivedTemplate({
    donorPublicName: donorPublicName(order),
    amount: cagnotteAmount,
    cagnotteTitle: block.title,
  });
  return createNotification({
    sellerId: block.sellerId,
    type: "DONATION_RECEIVED" satisfies NotificationType,
    dedupeKey: `donation_received:${order.id}`,
    title: tpl.title,
    body: tpl.body,
    icon: tpl.icon,
    blockId: block.id,
    orderId: order.id,
    data: {
      // Per resolved Q1 — creator feed needs the real name behind a "Anonyme" flag
      donorDisplayName: order.customerName || null,
      wasAnonymous: !!order.isAnonymous,
      amount: cagnotteAmount,
      cagnotteTitle: block.title,
    },
    email: { subject: tpl.emailSubject, html: tpl.emailHtml, tier: "transactional" },
  });
}

// ── 2. MILESTONE_REACHED ──
export async function fireMilestone(
  block: BlockForDispatch,
  threshold: 50 | 100,
): Promise<CreateNotificationResult> {
  const tpl = milestoneTemplate(
    { cagnotteTitle: block.title, goalAmount: blockGoalAmount(block) },
    threshold,
  );
  return createNotification({
    sellerId: block.sellerId,
    type: "MILESTONE_REACHED" satisfies NotificationType,
    dedupeKey: `milestone:${block.id}:${threshold}`,
    title: tpl.title,
    body: tpl.body,
    icon: tpl.icon,
    blockId: block.id,
    data: { threshold, goalAmount: blockGoalAmount(block), cagnotteTitle: block.title },
    email: { subject: tpl.emailSubject, html: tpl.emailHtml, tier: "standard" },
  });
}

// ── 3. CAGNOTTE_ENDING_SOON ──
export async function fireEndingSoon(
  block: BlockForDispatch,
): Promise<CreateNotificationResult> {
  const endDate = blockEndDate(block) || new Date();
  const tpl = endingSoonTemplate({ cagnotteTitle: block.title, endDate });
  return createNotification({
    sellerId: block.sellerId,
    type: "CAGNOTTE_ENDING_SOON" satisfies NotificationType,
    dedupeKey: `ending_soon:${block.id}`,
    title: tpl.title,
    body: tpl.body,
    icon: tpl.icon,
    blockId: block.id,
    data: { endDate: endDate.toISOString(), cagnotteTitle: block.title },
    email: { subject: tpl.emailSubject, html: tpl.emailHtml, tier: "standard" },
  });
}

// ── 4. CAGNOTTE_ENDED ──
export async function fireCagnotteEnded(
  block: BlockForDispatch,
  totalRaised: number,
  donorCount: number,
): Promise<CreateNotificationResult> {
  const tpl = cagnotteEndedTemplate({ cagnotteTitle: block.title, totalRaised, donorCount });
  return createNotification({
    sellerId: block.sellerId,
    type: "CAGNOTTE_ENDED" satisfies NotificationType,
    dedupeKey: `cagnotte_ended:${block.id}`,
    title: tpl.title,
    body: tpl.body,
    icon: tpl.icon,
    blockId: block.id,
    data: { totalRaised, donorCount, cagnotteTitle: block.title },
    email: { subject: tpl.emailSubject, html: tpl.emailHtml, tier: "standard" },
  });
}

// ── 5. DONATION_MESSAGE ──
export async function fireDonationMessage(
  order: OrderForDispatch,
  block: BlockForDispatch,
): Promise<CreateNotificationResult> {
  const tpl = donationMessageTemplate({
    donorPublicName: donorPublicName(order),
    message: order.donorMessage || "",
    cagnotteTitle: block.title,
  });
  return createNotification({
    sellerId: block.sellerId,
    type: "DONATION_MESSAGE" satisfies NotificationType,
    dedupeKey: `donation_message:${order.id}`,
    title: tpl.title,
    body: tpl.body,
    icon: tpl.icon,
    blockId: block.id,
    orderId: order.id,
    data: {
      // Resolved Q1 — creator feed sees the real message + name; public wall masks
      donorDisplayName: order.customerName || null,
      wasAnonymous: !!order.isAnonymous,
      isPrivate: !!order.messageIsPrivate,
      cagnotteTitle: block.title,
    },
    email: { subject: tpl.emailSubject, html: tpl.emailHtml, tier: "transactional" },
  });
}

// ── 6. PAYOUT_COMPLETED ──
export async function firePayoutCompleted(
  withdrawal: WithdrawalForDispatch,
): Promise<CreateNotificationResult> {
  const tpl = payoutCompletedTemplate({
    amount: withdrawal.amount,
    phoneMasked: maskPhone(withdrawal.phone),
    provider: withdrawal.provider,
  });
  return createNotification({
    sellerId: withdrawal.sellerId,
    type: "PAYOUT_COMPLETED" satisfies NotificationType,
    dedupeKey: `payout:${withdrawal.id}:completed`,
    title: tpl.title,
    body: tpl.body,
    icon: tpl.icon,
    withdrawalId: withdrawal.id,
    data: { amount: withdrawal.amount, provider: withdrawal.provider },
    email: { subject: tpl.emailSubject, html: tpl.emailHtml, tier: "transactional" },
  });
}

// ── 7. PAYOUT_FAILED ──
// `attempt` defaults to 1 because Withdrawal has no attempt counter in v1
// (T-02-20 accepted risk). Two failures on the same withdrawal collapse to
// one notification — acceptable for v1.
export async function firePayoutFailed(
  withdrawal: WithdrawalForDispatch,
  reason: string,
  attempt = 1,
): Promise<CreateNotificationResult> {
  const tpl = payoutFailedTemplate({ amount: withdrawal.amount }, reason, attempt);
  return createNotification({
    sellerId: withdrawal.sellerId,
    type: "PAYOUT_FAILED" satisfies NotificationType,
    dedupeKey: `payout:${withdrawal.id}:failed:attempt${attempt}`,
    title: tpl.title,
    body: tpl.body,
    icon: tpl.icon,
    withdrawalId: withdrawal.id,
    data: { amount: withdrawal.amount, reason, attempt },
    email: { subject: tpl.emailSubject, html: tpl.emailHtml, tier: "transactional" },
  });
}

// ── 8. KYC_APPROVED ──
export async function fireKycApproved(
  seller: SellerForDispatch,
): Promise<CreateNotificationResult> {
  const tpl = kycApprovedTemplate({});
  return createNotification({
    sellerId: seller.id,
    type: "KYC_APPROVED" satisfies NotificationType,
    dedupeKey: `kyc:${seller.id}:approved`,
    title: tpl.title,
    body: tpl.body,
    icon: tpl.icon,
    email: { subject: tpl.emailSubject, html: tpl.emailHtml, tier: "transactional" },
  });
}

// ── 9. KYC_REJECTED ──
export async function fireKycRejected(
  seller: SellerForDispatch,
  reason: string,
): Promise<CreateNotificationResult> {
  const tpl = kycRejectedTemplate({}, reason);
  return createNotification({
    sellerId: seller.id,
    type: "KYC_REJECTED" satisfies NotificationType,
    dedupeKey: `kyc:${seller.id}:rejected`,
    title: tpl.title,
    body: tpl.body,
    icon: tpl.icon,
    data: { reason },
    email: { subject: tpl.emailSubject, html: tpl.emailHtml, tier: "transactional" },
  });
}

// ── 10. PAYOUT_CANCELLED (admin cancellation during 48h window) ──
export async function firePayoutCancelled(
  withdrawal: WithdrawalForDispatch,
  reason: string,
): Promise<CreateNotificationResult> {
  const tpl = payoutCancelledTemplate({ amount: withdrawal.amount }, reason);
  return createNotification({
    sellerId: withdrawal.sellerId,
    type: "PAYOUT_FAILED" satisfies NotificationType,
    dedupeKey: `payout:${withdrawal.id}:cancelled`,
    title: tpl.title,
    body: tpl.body,
    icon: tpl.icon,
    withdrawalId: withdrawal.id,
    data: { amount: withdrawal.amount, reason, cancelledByAdmin: true },
    email: { subject: tpl.emailSubject, html: tpl.emailHtml, tier: "transactional" },
  });
}

// ── 11. WITHDRAWAL_BLOCKED (admin blocks all withdrawals for a seller) ──
export async function fireWithdrawalBlocked(
  seller: SellerForDispatch,
  reason: string,
): Promise<CreateNotificationResult> {
  const tpl = withdrawalBlockedTemplate({}, reason);
  return createNotification({
    sellerId: seller.id,
    type: "SYSTEM" satisfies NotificationType,
    dedupeKey: `withdrawal_blocked:${seller.id}:${Date.now()}`,
    title: tpl.title,
    body: tpl.body,
    icon: tpl.icon,
    data: { reason, withdrawalBlocked: true },
    email: { subject: tpl.emailSubject, html: tpl.emailHtml, tier: "transactional" },
  });
}
