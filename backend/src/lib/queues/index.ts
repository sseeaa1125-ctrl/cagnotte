/**
 * Queues — Point d'entrée centralisé
 *
 * Architecture :
 * ┌─────────────────────────────────────────────────────┐
 * │  Email Queue (concurrency: 8, retry: 3)             │
 * │  ├── Priority 0 — Auth (inscription, mdp, verif)    │
 * │  ├── Priority 1 — Transactionnel (paiement, welcome)│
 * │  └── Priority 2 — Standard (notif vendeur)          │
 * ├─────────────────────────────────────────────────────┤
 * │  Community Queue (concurrency: 3, retry: 2)         │
 * │  ├── Email relances (renouvellement, grace, kick)   │
 * │  └── Telegram DM (rappels, avertissements)          │
 * └─────────────────────────────────────────────────────┘
 */

export {
  queueAuthEmail,
  queueTransactionalEmail,
  queueStandardEmail,
  getEmailQueueStats,
} from "./emailQueue.js";

export {
  queueCommunityEmail,
  queueTelegramDM,
  queueCommunityReminder,
  getCommunityQueueStats,
} from "./communityQueue.js";

export { JobQueue } from "./JobQueue.js";
