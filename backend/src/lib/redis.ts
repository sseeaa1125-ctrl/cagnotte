/**
 * Redis client — Upstash Redis (REST-based)
 *
 * Persistent queue storage that survives server restarts.
 * Uses Upstash REST API — no persistent TCP connection needed.
 */
import { Redis } from "@upstash/redis";
import * as logger from "./logger.js";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sont requis dans .env");
}

export const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});

// Vérification de connexion au démarrage
redis.ping().then(() => {
  logger.log("[Redis] Connecté à Upstash Redis");
}).catch((err) => {
  logger.error("[Redis] Erreur connexion Upstash", err);
});
