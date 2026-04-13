/**
 * Bictorys circuit breaker — Phase 2 plan 02-01.
 *
 * Hand-rolled, dependency-free, in-memory state machine that protects POST
 * /api/orders from cascading failures when the Bictorys upstream goes down.
 *
 * State machine (per RESEARCH Q3):
 *
 *   CLOSED    → [5 failures in 30s window]  → OPEN
 *   OPEN      → [60s cooldown elapsed]      → HALF_OPEN  (caller may try once)
 *   HALF_OPEN → [1 success]                 → CLOSED
 *   HALF_OPEN → [1 failure]                 → OPEN       (reset 60s cooldown)
 *
 * Pitfall guarded: P07 — orders DDoS / Bictorys quota burn. When the upstream
 * starts failing, we stop spending RPC budget on it within ~30 seconds and
 * return a fast 503 to the client until the cooldown elapses.
 *
 * SCALING NOTE (T-02-09 — accepted risk):
 *   This state lives in the Node process memory, so it does NOT survive a
 *   restart and is NOT shared across instances. Cagnottes.sn runs single-
 *   instance on Railway per CLAUDE.md — fine for v1. When we scale horizontally
 *   in v2, swap the in-memory `bictorysState` for an Upstash Redis-backed
 *   counter (windowed INCR + TTL key). Do NOT change the public API of this
 *   module — the call sites in `routes/orders.ts` should keep working unchanged.
 */

const WINDOW_MS = 30_000;
const COOLDOWN_MS = 60_000;
const FAILURE_THRESHOLD = 5;

interface State {
  /** unix-ms timestamps of recent failures (pruned to WINDOW_MS on each push) */
  failures: number[];
  /** unix-ms timestamp at which the circuit opened, or null when CLOSED */
  openedAt: number | null;
}

const bictorysState: State = { failures: [], openedAt: null };

/**
 * Returns true if the circuit is currently OPEN (calls should fast-fail with
 * 503). Returns false when CLOSED or HALF_OPEN — the caller may attempt one
 * upstream call and should record the result via `recordBictorysSuccess()` or
 * `recordBictorysFailure()`.
 *
 * Note: HALF_OPEN is implemented purely by the wall-clock cooldown elapsing.
 * There is no explicit HALF_OPEN flag — a successful call after the cooldown
 * naturally resets state via `recordBictorysSuccess()`, and a failure pushes a
 * fresh failure timestamp via `recordBictorysFailure()` (which re-opens the
 * circuit if the new failure is the 5th in the rolling window).
 */
export function isBictorysCircuitOpen(): boolean {
  if (bictorysState.openedAt === null) return false;
  if (Date.now() - bictorysState.openedAt >= COOLDOWN_MS) return false;
  return true;
}

/**
 * Record a Bictorys upstream failure. Prunes timestamps older than 30s, then
 * appends `now`. If the total in the rolling window reaches 5, the circuit
 * transitions to OPEN.
 */
export function recordBictorysFailure(): void {
  const now = Date.now();
  bictorysState.failures = bictorysState.failures.filter((t) => now - t < WINDOW_MS);
  bictorysState.failures.push(now);
  if (bictorysState.failures.length >= FAILURE_THRESHOLD) {
    bictorysState.openedAt = now;
  }
}

/**
 * Record a Bictorys upstream success. Fully resets state — failures array
 * cleared, openedAt set to null. Idempotent.
 */
export function recordBictorysSuccess(): void {
  bictorysState.failures = [];
  bictorysState.openedAt = null;
}

/**
 * Test-only escape hatch — resets state for unit-test isolation.
 * Do NOT call from production code paths.
 */
export function __resetCircuitForTests(): void {
  bictorysState.failures = [];
  bictorysState.openedAt = null;
}
