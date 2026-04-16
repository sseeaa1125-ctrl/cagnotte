/**
 * Cagnotte-ended cron — Audit 026 MED-1.
 *
 * Sweeps FUNDRAISER blocks whose `config.endDate` has passed and fires the
 * `CAGNOTTE_ENDED` notification exactly once per block. Mirrors the
 * endingSoonCron pattern (NOTF-04) — hourly interval + 30s boot catch-up,
 * `Block.endedNotifiedAt` as the primary SQL-level dedup guard, and
 * `Notification.dedupeKey` (`cagnotte_ended:{blockId}`) as the secondary
 * safety net against concurrent ticks.
 *
 * Totals (`totalRaised`, `donorCount`) are computed at fire time with a
 * single `prisma.order.groupBy` per candidate block. At the expected
 * per-block volume this stays cheap; if it ever becomes hot we can swap to
 * a precomputed `Block.totalRaised` field.
 */

import { prisma } from "../prisma.js";
import * as logger from "../logger.js";
import { fireCagnotteEnded, type BlockForDispatch } from "./dispatch.js";

interface Candidate {
  id: string;
  sellerId: string;
  title: string;
  config: unknown;
}

async function computeBlockTotals(
  blockId: string,
): Promise<{ totalRaised: number; donorCount: number }> {
  // `paymentStatus: "PAID"` + `blockId` is our invariant for completed
  // donations. `_sum.amount` gives totalRaised; distinct customerEmail gives
  // the donor count. findMany + in-memory aggregate is fine at the expected
  // cardinality (typical cagnotte has <1000 paid orders).
  const paidOrders = await prisma.order.findMany({
    where: { blockId, paymentStatus: "PAID" },
    select: { amount: true, customerEmail: true },
  });
  const totalRaised = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const uniqueDonors = new Set<string>();
  for (const o of paidOrders) {
    if (o.customerEmail) uniqueDonors.add(o.customerEmail.toLowerCase());
  }
  return { totalRaised, donorCount: uniqueDonors.size };
}

export async function runCagnotteEndedSweep(): Promise<void> {
  const now = new Date();

  let candidates: Candidate[] = [];
  try {
    candidates = await prisma.block.findMany({
      where: {
        type: "FUNDRAISER",
        isActive: true,
        endedNotifiedAt: null,
      },
      select: { id: true, sellerId: true, title: true, config: true },
    });
  } catch (err) {
    logger.error("[cagnotte-ended-cron] Erreur lecture candidats", err);
    return;
  }

  let fired = 0;
  let skipped = 0;
  let errors = 0;

  for (const block of candidates) {
    try {
      const cfg = (block.config as { endDate?: string } | null) || {};
      const endDate = cfg.endDate ? new Date(cfg.endDate) : null;

      // Must have a parseable endDate AND that date must be in the past.
      // Blocks without an endDate never trigger this notification —
      // consistent with the creator UX where endDate is optional.
      if (!endDate || isNaN(endDate.getTime()) || endDate > now) {
        skipped++;
        continue;
      }

      const { totalRaised, donorCount } = await computeBlockTotals(block.id);

      const dispatchBlock: BlockForDispatch = {
        id: block.id,
        sellerId: block.sellerId,
        title: block.title,
        config: block.config,
      };
      const { created } = await fireCagnotteEnded(
        dispatchBlock,
        totalRaised,
        donorCount,
      );

      // Set the dedup field regardless of `created` — whether the notification
      // was freshly inserted (`created === true`) or deduped by the unique
      // constraint (`created === false`), we never want to re-evaluate this
      // block. Doing it after the dispatcher call means a transient
      // createNotification failure leaves the block in a "still notifiable"
      // state on the next sweep tick.
      await prisma.block.update({
        where: { id: block.id },
        data: { endedNotifiedAt: new Date() },
      });

      if (created) fired++;
      else skipped++;
    } catch (err) {
      errors++;
      logger.error(`[cagnotte-ended-cron] Erreur block=${block.id}`, err);
      // continue — one failure does not abort the sweep
    }
  }

  if (candidates.length > 0 || fired > 0 || errors > 0) {
    logger.log(
      `[cagnotte-ended-cron] candidates=${candidates.length} fired=${fired} skipped=${skipped} errors=${errors}`,
    );
  }
}
