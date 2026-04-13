/**
 * Ending-soon cron — Phase 2 plan 02-02 (NOTF-04).
 *
 * Sweeps FUNDRAISER blocks ending within the next 3 days that haven't
 * yet been notified. Runs hourly via setInterval + a 30s boot catch-up
 * to recover state lost across restarts (P14 mitigation).
 *
 * Dedup strategy (resolved Q8):
 *   - Block.endingSoonNotifiedAt is the primary guard — `WHERE NULL`
 *     filter at the SQL level + UPDATE on first fire.
 *   - Notification.dedupeKey @unique on `ending_soon:{blockId}` is the
 *     secondary safety net (covers a race where the cron fires twice
 *     concurrently on the same block before the UPDATE commits).
 *
 * The endDate window filter is applied in JS rather than SQL because
 * `endDate` lives inside the `Block.config` JSON column. We accept the
 * in-memory filter at the expected block volume (< 1000 candidates).
 */

import { prisma } from "../prisma.js";
import * as logger from "../logger.js";
import { fireEndingSoon, type BlockForDispatch } from "./dispatch.js";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export async function runEndingSoonSweep(): Promise<void> {
  const now = new Date();
  const threeDaysOut = new Date(now.getTime() + THREE_DAYS_MS);

  let candidates: Array<{ id: string; sellerId: string; title: string; config: unknown }> = [];

  try {
    candidates = await prisma.block.findMany({
      where: {
        type: "FUNDRAISER",
        isActive: true,
        endingSoonNotifiedAt: null,
      },
      select: { id: true, sellerId: true, title: true, config: true },
    });
  } catch (err) {
    logger.error("[ending-soon-cron] Erreur lecture candidats", err);
    return;
  }

  let fired = 0;
  let skipped = 0;
  let errors = 0;

  for (const block of candidates) {
    try {
      const cfg = (block.config as { endDate?: string } | null) || {};
      const endDate = cfg.endDate ? new Date(cfg.endDate) : null;
      // Skip blocks with no endDate or outside the J-3 → end-of-life window.
      if (!endDate || isNaN(endDate.getTime())) {
        skipped++;
        continue;
      }
      if (endDate > threeDaysOut || endDate < now) {
        skipped++;
        continue;
      }

      const dispatchBlock: BlockForDispatch = {
        id: block.id,
        sellerId: block.sellerId,
        title: block.title,
        config: block.config,
      };
      const { created } = await fireEndingSoon(dispatchBlock);

      if (created) {
        // Set the dedupe field AFTER the notification successfully created so
        // a transient Notification insert failure leaves the block in a
        // "still notifiable" state on the next sweep tick.
        await prisma.block.update({
          where: { id: block.id },
          data: { endingSoonNotifiedAt: new Date() },
        });
        fired++;
      } else {
        // dedupeKey already existed — set the field anyway so we never
        // re-evaluate this block.
        await prisma.block.update({
          where: { id: block.id },
          data: { endingSoonNotifiedAt: new Date() },
        });
        skipped++;
      }
    } catch (err) {
      errors++;
      logger.error(`[ending-soon-cron] Erreur block=${block.id}`, err);
      // continue — one failure does not abort the sweep
    }
  }

  if (candidates.length > 0 || fired > 0 || errors > 0) {
    logger.log(
      `[ending-soon-cron] candidates=${candidates.length} fired=${fired} skipped=${skipped} errors=${errors}`,
    );
  }
}
