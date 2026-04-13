/**
 * RedisRateLimitStore — Store Redis pour express-rate-limit
 *
 * Remplace le store en mémoire par défaut par Upstash Redis.
 * Les compteurs survivent aux redémarrages serveur et sont partagés
 * entre instances (si multi-instance futur).
 *
 * D1 FIX: Fallback in-memory si Redis est indisponible.
 * Quand Redis revient, on rebascule automatiquement au prochain appel.
 *
 * Redis keys : rl:{prefix}:{key} avec TTL = windowMs
 */
import type { Store, Options, IncrementResponse } from "express-rate-limit";
import { redis } from "./redis.js";
import * as logger from "./logger.js";

// ── In-memory fallback store (simple Map avec expiration) ──
const memoryStore = new Map<string, { hits: number; resetTime: number }>();
let memoryCleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureMemoryCleanup(windowMs: number): void {
  if (memoryCleanupInterval) return;
  memoryCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of memoryStore) {
      if (v.resetTime <= now) memoryStore.delete(k);
    }
  }, Math.min(windowMs, 60_000));
}

export class RedisRateLimitStore implements Store {
  private keyPrefix: string;
  private windowMs!: number;

  constructor(keyPrefix: string) {
    this.keyPrefix = keyPrefix;
  }

  /**
   * Appelé par express-rate-limit pour initialiser le store avec les options
   */
  init(options: Options): void {
    this.windowMs = options.windowMs;
    ensureMemoryCleanup(this.windowMs);
  }

  /**
   * Incrémente le compteur pour une clé (IP) et retourne le total + resetTime
   */
  async increment(key: string): Promise<IncrementResponse> {
    const redisKey = `rl:${this.keyPrefix}:${key}`;
    const windowSec = Math.ceil(this.windowMs / 1000);

    try {
      // INCR atomique + set TTL si nouvelle clé
      const totalHits = await redis.incr(redisKey);

      // Mettre le TTL uniquement à la première requête (quand totalHits === 1)
      if (totalHits === 1) {
        await redis.expire(redisKey, windowSec);
      }

      // Récupérer le TTL restant pour calculer resetTime
      const ttl = await redis.ttl(redisKey);
      const resetTime = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : this.windowMs));

      return { totalHits, resetTime };
    } catch {
      // D1: Redis down → fallback in-memory (ne pas crasher l'API)
      logger.warn(`[RateLimit] Redis indisponible pour ${this.keyPrefix}, fallback mémoire`);
      return this.incrementMemory(key);
    }
  }

  /**
   * Décrémente le compteur (utilisé quand une requête est "annulée")
   */
  async decrement(key: string): Promise<void> {
    const redisKey = `rl:${this.keyPrefix}:${key}`;
    try {
      await redis.decr(redisKey);
    } catch {
      const memKey = `${this.keyPrefix}:${key}`;
      const entry = memoryStore.get(memKey);
      if (entry && entry.hits > 0) entry.hits--;
    }
  }

  /**
   * Remet le compteur à zéro pour une clé
   */
  async resetKey(key: string): Promise<void> {
    const redisKey = `rl:${this.keyPrefix}:${key}`;
    try {
      await redis.del(redisKey);
    } catch {
      memoryStore.delete(`${this.keyPrefix}:${key}`);
    }
  }

  // ── Fallback in-memory ──
  private incrementMemory(key: string): IncrementResponse {
    const memKey = `${this.keyPrefix}:${key}`;
    const now = Date.now();
    const existing = memoryStore.get(memKey);

    if (existing && existing.resetTime > now) {
      existing.hits++;
      return { totalHits: existing.hits, resetTime: new Date(existing.resetTime) };
    }

    const resetTime = now + this.windowMs;
    memoryStore.set(memKey, { hits: 1, resetTime });
    return { totalHits: 1, resetTime: new Date(resetTime) };
  }
}
