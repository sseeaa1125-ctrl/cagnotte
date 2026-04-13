/**
 * Milestone detection — pure function, post-transaction.
 *
 * Phase 2 plan 02-02. Called from routes/webhooks.ts after the PAID
 * Serializable $transaction commits. Concurrent webhooks crossing the
 * same threshold are deduped at the DB layer via Notification.dedupeKey
 * @unique (P06 mitigation), so this function only needs to compute
 * which thresholds were crossed in the (prevTotal → newTotal) transition.
 *
 * No DB writes, no imports — keep it dependency-free so unit tests can
 * exercise it without a Prisma client.
 */

export function detectCrossed(
  prevTotal: number,
  newTotal: number,
  goalAmount: number,
): (50 | 100)[] {
  if (goalAmount <= 0) return [];
  const prevPct = (prevTotal / goalAmount) * 100;
  const newPct = (newTotal / goalAmount) * 100;
  const crossed: (50 | 100)[] = [];
  if (prevPct < 50 && newPct >= 50) crossed.push(50);
  if (prevPct < 100 && newPct >= 100) crossed.push(100);
  return crossed;
}
