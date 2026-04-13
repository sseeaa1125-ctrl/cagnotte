/**
 * JobQueue — File d'attente persistante avec Upstash Redis :
 * - Concurrency control (nombre de jobs en parallèle)
 * - Retry avec backoff exponentiel
 * - Priorité (plus bas = plus prioritaire)
 * - Dead-letter tracking (jobs échoués après tous les retries)
 * - Monitoring / stats
 * - Persistance : les jobs survivent aux redémarrages serveur
 *
 * Redis keys utilisées :
 * - queue:{name}:waiting   — ZSET (score = priority*1e13 + timestamp)
 * - queue:{name}:delayed   — ZSET (score = timestamp de disponibilité)
 * - queue:{name}:dead      — LIST (max 100 derniers jobs échoués)
 * - queue:{name}:stats     — HASH (enqueued, processed, failed, retried)
 */
import { redis } from "../redis.js";
import * as logger from "../logger.js";

export interface Job<T = unknown> {
  id: string;
  data: T;
  priority: number; // 0 = critique, 1 = important, 2 = standard
  retries: number;
  maxRetries: number;
  createdAt: number;
  lastError?: string;
}

export interface QueueOptions {
  name: string;
  concurrency: number;
  maxRetries: number;
  retryDelayMs: number; // base delay, multiplied by 2^attempt
  rateLimitMs?: number; // min ms between job starts (rate limiting)
  pollIntervalMs?: number; // how often to poll Redis (default: 500ms)
}

type JobHandler<T> = (data: T) => Promise<void>;

export class JobQueue<T = unknown> {
  private activeCount = 0;
  private handler: JobHandler<T> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private draining = false;
  private lastJobStartTime = 0;

  // Redis key prefixes
  private readonly waitingKey: string;
  private readonly delayedKey: string;
  private readonly deadKey: string;
  private readonly statsKey: string;

  constructor(private opts: QueueOptions) {
    this.waitingKey = `queue:${opts.name}:waiting`;
    this.delayedKey = `queue:${opts.name}:delayed`;
    this.deadKey = `queue:${opts.name}:dead`;
    this.statsKey = `queue:${opts.name}:stats`;
  }

  /**
   * Enregistre le handler qui traite chaque job et démarre le polling
   */
  process(handler: JobHandler<T>): void {
    this.handler = handler;
    const interval = this.opts.pollIntervalMs ?? 500;
    this.pollTimer = setInterval(() => this.drain(), interval);
    // Drain immédiatement au cas où il y a des jobs en attente d'un restart précédent
    this.drain();
  }

  /**
   * Ajoute un job à la queue (persisté dans Redis)
   */
  async add(data: T, priority = 1): Promise<string> {
    const id = `${this.opts.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: Job<T> = {
      id,
      data,
      priority,
      retries: 0,
      maxRetries: this.opts.maxRetries,
      createdAt: Date.now(),
    };

    // Score = priority * 1e13 + timestamp → trie par priorité puis FIFO
    const score = priority * 1e13 + Date.now();
    await redis.zadd(this.waitingKey, { score, member: JSON.stringify(job) });
    await redis.hincrby(this.statsKey, "enqueued", 1);

    return id;
  }

  /**
   * Boucle de traitement — appelée par le polling interval
   */
  private async drain(): Promise<void> {
    if (!this.handler || this.draining) return;
    this.draining = true;

    try {
      // 1. Déplacer les jobs delayed qui sont prêts vers waiting
      await this.promoteDelayed();

      // 2. Traiter les jobs en respectant la concurrency
      while (this.activeCount < this.opts.concurrency) {
        // Rate limiting
        if (this.opts.rateLimitMs) {
          const elapsed = Date.now() - this.lastJobStartTime;
          if (elapsed < this.opts.rateLimitMs) {
            break; // On reviendra au prochain poll
          }
        }

        // ZPOPMIN — récupère le job avec le score le plus bas (priorité max)
        const result = await redis.zpopmin<string>(this.waitingKey, 1);
        if (!result || result.length === 0) break;

        const raw = result[0];
        // Upstash zpopmin retourne [{member, score}] ou [member, score]
        // Le membre peut être un objet (auto-désérialisé par Upstash) ou une string JSON
        const member = typeof raw === "object" && raw !== null && "member" in raw
          ? (raw as { member: unknown }).member
          : raw;

        let job: Job<T>;
        try {
          if (typeof member === "string") {
            job = JSON.parse(member);
          } else if (typeof member === "object" && member !== null) {
            job = member as Job<T>;
          } else {
            throw new Error("Format inattendu");
          }
        } catch {
          logger.error(`[${this.opts.name}] Job invalide dans Redis, ignoré`);
          continue;
        }

        this.activeCount++;
        this.lastJobStartTime = Date.now();
        // Process sans await pour permettre la concurrence
        this.processJob(job);
      }
    } catch (err) {
      logger.error(`[${this.opts.name}] Erreur drain`, err);
    } finally {
      this.draining = false;
    }
  }

  /**
   * Déplace les jobs delayed dont le timestamp est passé vers waiting
   */
  private async promoteDelayed(): Promise<void> {
    const now = Date.now();
    // Récupérer les jobs dont le score (timestamp) <= now
    const ready = await redis.zrange(this.delayedKey, 0, now, { byScore: true, offset: 0, count: 50 }) as string[];
    if (!ready || ready.length === 0) return;

    for (const entry of ready) {
      let job: Job<T>;
      try {
        if (typeof entry === "string") {
          job = JSON.parse(entry);
        } else if (typeof entry === "object" && entry !== null) {
          job = entry as Job<T>;
        } else {
          throw new Error("Format inattendu");
        }
      } catch {
        await redis.zrem(this.delayedKey, entry as string);
        continue;
      }
      const jobStr = JSON.stringify(job);
      const score = job.priority * 1e13 + Date.now();
      await redis.zadd(this.waitingKey, { score, member: jobStr });
      await redis.zrem(this.delayedKey, entry as string);
    }
  }

  private async processJob(job: Job<T>): Promise<void> {
    try {
      await this.handler!(job.data);
      await redis.hincrby(this.statsKey, "processed", 1);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      job.lastError = errMsg;
      job.retries++;

      if (job.retries <= job.maxRetries) {
        // Retry avec backoff exponentiel — on met dans delayed avec un score = timestamp futur
        const delay = this.opts.retryDelayMs * Math.pow(2, job.retries - 1);
        const availableAt = Date.now() + delay;
        await redis.hincrby(this.statsKey, "retried", 1);
        await redis.zadd(this.delayedKey, { score: availableAt, member: JSON.stringify(job) });
        logger.warn(`[${this.opts.name}] Job ${job.id} échoué (tentative ${job.retries}/${job.maxRetries}), retry dans ${delay}ms: ${errMsg}`);
      } else {
        // Dead letter — toutes les tentatives épuisées
        await redis.hincrby(this.statsKey, "failed", 1);
        await redis.lpush(this.deadKey, JSON.stringify(job));
        // Garder max 100 dead letters
        await redis.ltrim(this.deadKey, 0, 99);
        logger.error(`[${this.opts.name}] Job ${job.id} définitivement échoué après ${job.maxRetries} tentatives: ${errMsg}`);
      }
    } finally {
      this.activeCount--;
    }
  }

  /**
   * Stats de monitoring (lit depuis Redis)
   */
  async getStats(): Promise<{
    name: string;
    pending: number;
    delayed: number;
    active: number;
    deadLetter: number;
    enqueued: number;
    processed: number;
    failed: number;
    retried: number;
  }> {
    const [pending, delayed, deadLetter, stats] = await Promise.all([
      redis.zcard(this.waitingKey),
      redis.zcard(this.delayedKey),
      redis.llen(this.deadKey),
      redis.hgetall(this.statsKey),
    ]);

    const s = (stats || {}) as Record<string, string>;

    return {
      name: this.opts.name,
      pending: pending || 0,
      delayed: delayed || 0,
      active: this.activeCount,
      deadLetter: deadLetter || 0,
      enqueued: parseInt(s.enqueued || "0", 10),
      processed: parseInt(s.processed || "0", 10),
      failed: parseInt(s.failed || "0", 10),
      retried: parseInt(s.retried || "0", 10),
    };
  }

  /**
   * Nombre de jobs en attente (sync approximation via dernier poll)
   */
  get size(): number {
    return 0; // Utiliser getStats() pour la valeur exacte
  }

  /**
   * Récupère les dead letters depuis Redis
   */
  async getDeadLetters(): Promise<Job<T>[]> {
    const raw = await redis.lrange<string>(this.deadKey, 0, -1);
    if (!raw) return [];
    return raw.map((s) => {
      try { return JSON.parse(s); } catch { return null; }
    }).filter(Boolean) as Job<T>[];
  }

  /**
   * Vide la dead letter queue
   */
  async clearDeadLetters(): Promise<void> {
    await redis.del(this.deadKey);
  }

  /**
   * Arrête le polling (pour shutdown propre)
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
