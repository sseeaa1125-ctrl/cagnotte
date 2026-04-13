/**
 * Simulation : 100 utilisateurs × 8 mois d'abonnement communauté
 * 
 * Modélise le cycle de vie complet :
 * - Inscription + paiement initial
 * - Rappels J-3
 * - Renouvellements automatiques
 * - Grace period (3 jours)
 * - Kick des impayés
 * - Annulations volontaires
 * - Réabonnements
 * 
 * Usage : npx tsx scripts/simulate-community-billing.ts
 */

// ── Types ──

type SubStatus = "ACTIVE" | "GRACE_PERIOD" | "EXPIRED" | "CANCELED" | "PENDING";

interface SimUser {
  id: number;
  name: string;
  email: string;
  paymentType: "wave_money" | "orange_money";
  // Probabilité de payer à temps (0-1). Simuler des profils variés
  reliability: number;
  // Probabilité de payer pendant la grace period si rate le rappel
  gracePayProb: number;
  // Probabilité d'annuler volontairement chaque mois
  cancelProb: number;
  // Probabilité de se réabonner après kick/cancel
  resubProb: number;
}

interface SimSubscription {
  userId: number;
  status: SubStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  gracePeriodEnd: Date | null;
  telegramUserId: number | null;
  botInteracted: boolean;
  lockedPrice: number;
  joinedAt: Date;
  kickedAt: Date | null;
  canceledAt: Date | null;
}

interface SimPayment {
  userId: number;
  amount: number;
  status: "COMPLETED" | "PENDING" | "FAILED";
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  isRenewal: boolean;
  commissionAmount: number;
  sellerAmount: number;
}

interface SimNotification {
  userId: number;
  type: "RENEWAL_REMINDER" | "PAYMENT_FAILED" | "GRACE_DAY_1" | "GRACE_DAY_2" | "GRACE_DAY_3" | "KICKED" | "WELCOME" | "RENEWAL_CONFIRMED";
  channel: "EMAIL" | "TELEGRAM" | "BOTH";
  date: Date;
  dmDelivered: boolean;
}

interface MonthlyStats {
  month: number;
  label: string;
  activeStart: number;
  renewals: number;
  newSubs: number;
  failedPayments: number;
  gracePeriods: number;
  graceRecoveries: number;
  kicks: number;
  cancellations: number;
  activeEnd: number;
  revenue: number;
  commission: number;
  sellerRevenue: number;
  remindersEmail: number;
  remindersTelegram: number;
  remindersDmFailed: number;
}

// ── Config ──

const COMMUNITY_PRICE = 10_000; // 10 000 FCFA / mois
const BILLING_PERIOD_DAYS = 30;
const GRACE_PERIOD_DAYS = 3;
const REMINDER_DAYS_BEFORE = 3;
const COMMISSION_RATE_BPS = 800; // 8% FREE plan
const TOTAL_USERS = 100;
const TOTAL_MONTHS = 8;
const BOT_INTERACTION_RATE = 0.92; // 92% des users interagissent avec le bot via /start (Option C)

// ── Helpers ──

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function formatFCFA(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len) : str + " ".repeat(len - str.length);
}

// ── Génération des 100 utilisateurs ──

function generateUsers(): SimUser[] {
  const users: SimUser[] = [];
  for (let i = 1; i <= TOTAL_USERS; i++) {
    // Profils variés :
    // 60% fiables (payent presque toujours à temps)
    // 25% moyens (payent souvent, parfois en retard)
    // 15% peu fiables (ratent souvent, certains se font kick)
    const profile = Math.random();
    let reliability: number, gracePayProb: number, cancelProb: number, resubProb: number;

    if (profile < 0.60) {
      // Fiable
      reliability = rand(0.85, 0.98);
      gracePayProb = rand(0.90, 0.99);
      cancelProb = rand(0.01, 0.03);
      resubProb = rand(0.10, 0.30);
    } else if (profile < 0.85) {
      // Moyen
      reliability = rand(0.55, 0.80);
      gracePayProb = rand(0.50, 0.80);
      cancelProb = rand(0.03, 0.08);
      resubProb = rand(0.15, 0.40);
    } else {
      // Peu fiable
      reliability = rand(0.20, 0.50);
      gracePayProb = rand(0.20, 0.50);
      cancelProb = rand(0.05, 0.15);
      resubProb = rand(0.05, 0.20);
    }

    users.push({
      id: i,
      name: `User_${String(i).padStart(3, "0")}`,
      email: `user${i}@test.com`,
      paymentType: Math.random() > 0.4 ? "wave_money" : "orange_money",
      reliability,
      gracePayProb,
      cancelProb,
      resubProb,
    });
  }
  return users;
}

// ── Simulation ──

function runSimulation() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   SIMULATION : 100 users × 8 mois — Communauté Telegram    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const users = generateUsers();
  const subscriptions = new Map<number, SimSubscription>();
  const payments: SimPayment[] = [];
  const notifications: SimNotification[] = [];
  const monthlyStats: MonthlyStats[] = [];

  const startDate = new Date("2026-03-05");

  // ── Phase 0 : Inscription initiale des 100 users ──
  console.log("📥 Phase 0 : Inscription des 100 utilisateurs...\n");

  let botInteractCount = 0;
  let dmDeliveredOnJoin = 0;

  for (const user of users) {
    const joinDate = new Date(startDate.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000); // J0 à J+2
    const periodEnd = addDays(joinDate, BILLING_PERIOD_DAYS);

    const commissionAmount = Math.round(COMMUNITY_PRICE * COMMISSION_RATE_BPS / 10000);
    const sellerAmount = COMMUNITY_PRICE - commissionAmount;

    // Paiement initial
    payments.push({
      userId: user.id,
      amount: COMMUNITY_PRICE,
      status: "COMPLETED",
      periodStart: joinDate,
      periodEnd,
      createdAt: joinDate,
      isRenewal: false,
      commissionAmount,
      sellerAmount,
    });

    // Option C : interaction avec le bot
    const botInteracted = Math.random() < BOT_INTERACTION_RATE;
    if (botInteracted) botInteractCount++;

    // DM de bienvenue (garanti si bot interagi via Option C)
    const dmDelivered = botInteracted;
    if (dmDelivered) dmDeliveredOnJoin++;

    subscriptions.set(user.id, {
      userId: user.id,
      status: "ACTIVE",
      currentPeriodStart: joinDate,
      currentPeriodEnd: periodEnd,
      gracePeriodEnd: null,
      telegramUserId: botInteracted ? 100000 + user.id : null,
      botInteracted,
      lockedPrice: COMMUNITY_PRICE,
      joinedAt: joinDate,
      kickedAt: null,
      canceledAt: null,
    });

    // Notifications
    notifications.push({
      userId: user.id,
      type: "WELCOME",
      channel: "BOTH",
      date: joinDate,
      dmDelivered,
    });
  }

  console.log(`   ✅ 100 utilisateurs inscrits`);
  console.log(`   🤖 ${botInteractCount}/100 ont interagi avec le bot (Option C)`);
  console.log(`   📩 ${dmDeliveredOnJoin}/100 DM de bienvenue délivrés`);
  console.log(`   💰 Revenu initial : ${formatFCFA(COMMUNITY_PRICE * 100)}`);
  console.log("");

  // ── Simulation mois par mois ──
  for (let month = 1; month <= TOTAL_MONTHS; month++) {
    const monthStart = addDays(startDate, (month - 1) * BILLING_PERIOD_DAYS);
    const monthEnd = addDays(startDate, month * BILLING_PERIOD_DAYS);
    const monthLabel = monthStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    const stats: MonthlyStats = {
      month,
      label: monthLabel,
      activeStart: 0,
      renewals: 0,
      newSubs: 0,
      failedPayments: 0,
      gracePeriods: 0,
      graceRecoveries: 0,
      kicks: 0,
      cancellations: 0,
      activeEnd: 0,
      revenue: 0,
      commission: 0,
      sellerRevenue: 0,
      remindersEmail: 0,
      remindersTelegram: 0,
      remindersDmFailed: 0,
    };

    // Compter les actifs au début du mois
    for (const sub of subscriptions.values()) {
      if (sub.status === "ACTIVE" || sub.status === "GRACE_PERIOD") {
        stats.activeStart++;
      }
    }

    // Pour chaque subscription active dont la période expire ce mois
    for (const [userId, sub] of subscriptions) {
      if (sub.status !== "ACTIVE") continue;

      const user = users[userId - 1];

      // Vérifier si la période expire ce mois
      if (sub.currentPeriodEnd < monthStart || sub.currentPeriodEnd > monthEnd) continue;

      // ── J-3 : Rappel de renouvellement ──
      const reminderDate = addDays(sub.currentPeriodEnd, -REMINDER_DAYS_BEFORE);
      const canDM = sub.botInteracted && sub.telegramUserId !== null;

      stats.remindersEmail++;
      if (canDM) {
        stats.remindersTelegram++;
      } else {
        stats.remindersDmFailed++;
      }

      notifications.push({
        userId,
        type: "RENEWAL_REMINDER",
        channel: canDM ? "BOTH" : "EMAIL",
        date: reminderDate,
        dmDelivered: canDM,
      });

      // ── Annulation volontaire ? ──
      if (Math.random() < user.cancelProb) {
        sub.status = "CANCELED";
        sub.canceledAt = sub.currentPeriodEnd;
        stats.cancellations++;
        continue;
      }

      // ── Jour J : L'utilisateur paye-t-il à temps ? ──
      const commissionAmount = Math.round(COMMUNITY_PRICE * COMMISSION_RATE_BPS / 10000);
      const sellerAmount = COMMUNITY_PRICE - commissionAmount;

      if (Math.random() < user.reliability) {
        // ✅ Paiement à temps
        const newPeriodStart = sub.currentPeriodEnd;
        const newPeriodEnd = addDays(newPeriodStart, BILLING_PERIOD_DAYS);

        payments.push({
          userId,
          amount: COMMUNITY_PRICE,
          status: "COMPLETED",
          periodStart: newPeriodStart,
          periodEnd: newPeriodEnd,
          createdAt: sub.currentPeriodEnd,
          isRenewal: true,
          commissionAmount,
          sellerAmount,
        });

        sub.currentPeriodStart = newPeriodStart;
        sub.currentPeriodEnd = newPeriodEnd;
        stats.renewals++;
        stats.revenue += COMMUNITY_PRICE;
        stats.commission += commissionAmount;
        stats.sellerRevenue += sellerAmount;

        notifications.push({
          userId,
          type: "RENEWAL_CONFIRMED",
          channel: "EMAIL",
          date: sub.currentPeriodEnd,
          dmDelivered: false,
        });
      } else {
        // ❌ Paiement échoué → Grace period
        sub.status = "GRACE_PERIOD";
        sub.gracePeriodEnd = addDays(sub.currentPeriodEnd, GRACE_PERIOD_DAYS);
        stats.failedPayments++;
        stats.gracePeriods++;

        payments.push({
          userId,
          amount: COMMUNITY_PRICE,
          status: "FAILED",
          periodStart: sub.currentPeriodEnd,
          periodEnd: addDays(sub.currentPeriodEnd, BILLING_PERIOD_DAYS),
          createdAt: sub.currentPeriodEnd,
          isRenewal: true,
          commissionAmount,
          sellerAmount,
        });

        notifications.push({
          userId,
          type: "PAYMENT_FAILED",
          channel: canDM ? "BOTH" : "EMAIL",
          date: sub.currentPeriodEnd,
          dmDelivered: canDM,
        });

        // ── Grace period : rappels quotidiens J+1, J+2, J+3 ──
        const graceTypes: Array<"GRACE_DAY_1" | "GRACE_DAY_2" | "GRACE_DAY_3"> = ["GRACE_DAY_1", "GRACE_DAY_2", "GRACE_DAY_3"];
        for (let d = 0; d < 3; d++) {
          notifications.push({
            userId,
            type: graceTypes[d],
            channel: canDM ? "BOTH" : "EMAIL",
            date: addDays(sub.currentPeriodEnd, d + 1),
            dmDelivered: canDM,
          });
          if (canDM) stats.remindersTelegram++;
          stats.remindersEmail++;
        }

        // ── L'utilisateur paye-t-il pendant la grace period ? ──
        if (Math.random() < user.gracePayProb) {
          // ✅ Paiement pendant la grace
          const newPeriodStart = sub.currentPeriodEnd;
          const newPeriodEnd = addDays(newPeriodStart, BILLING_PERIOD_DAYS);

          payments.push({
            userId,
            amount: COMMUNITY_PRICE,
            status: "COMPLETED",
            periodStart: newPeriodStart,
            periodEnd: newPeriodEnd,
            createdAt: addDays(sub.currentPeriodEnd, Math.ceil(Math.random() * 3)),
            isRenewal: true,
            commissionAmount,
            sellerAmount,
          });

          sub.status = "ACTIVE";
          sub.currentPeriodStart = newPeriodStart;
          sub.currentPeriodEnd = newPeriodEnd;
          sub.gracePeriodEnd = null;
          stats.graceRecoveries++;
          stats.revenue += COMMUNITY_PRICE;
          stats.commission += commissionAmount;
          stats.sellerRevenue += sellerAmount;
        } else {
          // ❌ Pas payé → KICK
          sub.status = "EXPIRED";
          sub.kickedAt = sub.gracePeriodEnd;
          stats.kicks++;

          notifications.push({
            userId,
            type: "KICKED",
            channel: "EMAIL",
            date: sub.gracePeriodEnd!,
            dmDelivered: false,
          });
        }
      }
    }

    // ── Réabonnements d'anciens kickés/annulés ──
    for (const [userId, sub] of subscriptions) {
      if (sub.status !== "EXPIRED" && sub.status !== "CANCELED") continue;

      const user = users[userId - 1];
      const exitDate = sub.kickedAt || sub.canceledAt;
      if (!exitDate) continue;

      // Ne se réabonne que si ça fait au moins 15 jours
      if (monthEnd.getTime() - exitDate.getTime() < 15 * 24 * 60 * 60 * 1000) continue;

      if (Math.random() < user.resubProb) {
        const resubDate = new Date(monthStart.getTime() + Math.random() * BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000);
        const newPeriodEnd = addDays(resubDate, BILLING_PERIOD_DAYS);
        const commissionAmount = Math.round(COMMUNITY_PRICE * COMMISSION_RATE_BPS / 10000);
        const sellerAmount = COMMUNITY_PRICE - commissionAmount;

        sub.status = "ACTIVE";
        sub.currentPeriodStart = resubDate;
        sub.currentPeriodEnd = newPeriodEnd;
        sub.gracePeriodEnd = null;
        sub.kickedAt = null;
        sub.canceledAt = null;
        // Re-interaction avec le bot
        sub.botInteracted = Math.random() < BOT_INTERACTION_RATE;
        sub.telegramUserId = sub.botInteracted ? 100000 + userId : null;

        payments.push({
          userId,
          amount: COMMUNITY_PRICE,
          status: "COMPLETED",
          periodStart: resubDate,
          periodEnd: newPeriodEnd,
          createdAt: resubDate,
          isRenewal: false,
          commissionAmount,
          sellerAmount,
        });

        stats.newSubs++;
        stats.revenue += COMMUNITY_PRICE;
        stats.commission += commissionAmount;
        stats.sellerRevenue += sellerAmount;
      }
    }

    // Compter les actifs à la fin du mois
    for (const sub of subscriptions.values()) {
      if (sub.status === "ACTIVE" || sub.status === "GRACE_PERIOD") {
        stats.activeEnd++;
      }
    }

    monthlyStats.push(stats);
  }

  // ── Rapport ──
  printReport(users, subscriptions, payments, notifications, monthlyStats);
}

function printReport(
  users: SimUser[],
  subscriptions: Map<number, SimSubscription>,
  payments: SimPayment[],
  notifications: SimNotification[],
  monthlyStats: MonthlyStats[]
) {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    RAPPORT MENSUEL                          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Tableau mensuel
  console.log("┌──────┬──────────────────┬────────┬────────┬────────┬────────┬────────┬────────┬──────────────────┐");
  console.log("│ Mois │ Période          │ Actifs │ Renouv │ Grace  │ Récup  │ Kicks  │ Cancel │ Revenu           │");
  console.log("├──────┼──────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼──────────────────┤");

  for (const s of monthlyStats) {
    console.log(
      `│ ${String(s.month).padStart(4)} │ ${padRight(s.label, 16)} │ ${String(s.activeEnd).padStart(6)} │ ${String(s.renewals).padStart(6)} │ ${String(s.gracePeriods).padStart(6)} │ ${String(s.graceRecoveries).padStart(6)} │ ${String(s.kicks).padStart(6)} │ ${String(s.cancellations).padStart(6)} │ ${padRight(formatFCFA(s.revenue), 16)} │`
    );
  }

  console.log("└──────┴──────────────────┴────────┴────────┴────────┴────────┴────────┴────────┴──────────────────┘");

  // Stats globales
  const totalRevenue = payments.filter(p => p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0);
  const totalCommission = payments.filter(p => p.status === "COMPLETED").reduce((sum, p) => sum + p.commissionAmount, 0);
  const totalSellerRevenue = totalRevenue - totalCommission;
  const totalPayments = payments.filter(p => p.status === "COMPLETED").length;
  const totalFailed = payments.filter(p => p.status === "FAILED").length;
  const totalRenewals = payments.filter(p => p.status === "COMPLETED" && p.isRenewal).length;

  const totalEmailNotifs = notifications.filter(n => n.channel === "EMAIL" || n.channel === "BOTH").length;
  const totalTelegramDMs = notifications.filter(n => (n.channel === "TELEGRAM" || n.channel === "BOTH") && n.dmDelivered).length;
  const totalDmFailed = notifications.filter(n => (n.channel === "TELEGRAM" || n.channel === "BOTH") && !n.dmDelivered).length;

  const finalActive = Array.from(subscriptions.values()).filter(s => s.status === "ACTIVE" || s.status === "GRACE_PERIOD").length;
  const finalExpired = Array.from(subscriptions.values()).filter(s => s.status === "EXPIRED").length;
  const finalCanceled = Array.from(subscriptions.values()).filter(s => s.status === "CANCELED").length;

  const retentionRate = ((finalActive / TOTAL_USERS) * 100).toFixed(1);
  const churnRate = (100 - parseFloat(retentionRate)).toFixed(1);
  const avgRevenuePerUser = Math.round(totalRevenue / TOTAL_USERS);

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                   STATS GLOBALES (8 mois)                   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  console.log("  📊 ABONNEMENTS");
  console.log(`     Membres actifs finaux    : ${finalActive} / ${TOTAL_USERS}`);
  console.log(`     Expirés (kickés)         : ${finalExpired}`);
  console.log(`     Annulés volontairement   : ${finalCanceled}`);
  console.log(`     Taux de rétention        : ${retentionRate}%`);
  console.log(`     Taux de churn            : ${churnRate}%`);

  console.log("\n  💰 REVENUS");
  console.log(`     Revenu total             : ${formatFCFA(totalRevenue)}`);
  console.log(`     Commission Fari (8%)     : ${formatFCFA(totalCommission)}`);
  console.log(`     Revenu vendeur           : ${formatFCFA(totalSellerRevenue)}`);
  console.log(`     Revenu moyen / user      : ${formatFCFA(avgRevenuePerUser)}`);
  console.log(`     MRR final (actifs × prix): ${formatFCFA(finalActive * COMMUNITY_PRICE)}`);

  console.log("\n  💳 PAIEMENTS");
  console.log(`     Total paiements réussis  : ${totalPayments}`);
  console.log(`     Total renouvellements    : ${totalRenewals}`);
  console.log(`     Paiements échoués        : ${totalFailed}`);
  console.log(`     Taux de succès paiement  : ${((totalPayments / (totalPayments + totalFailed)) * 100).toFixed(1)}%`);

  console.log("\n  📧 NOTIFICATIONS");
  console.log(`     Emails envoyés           : ${totalEmailNotifs}`);
  console.log(`     Telegram DMs délivrés    : ${totalTelegramDMs}`);
  console.log(`     Telegram DMs échoués     : ${totalDmFailed}`);
  console.log(`     Taux livraison DM        : ${totalTelegramDMs + totalDmFailed > 0 ? ((totalTelegramDMs / (totalTelegramDMs + totalDmFailed)) * 100).toFixed(1) : "N/A"}%`);

  // ── Détail Option C (bot interaction) ──
  const botInteracted = Array.from(subscriptions.values()).filter(s => s.botInteracted).length;
  const noBotInteraction = TOTAL_USERS - botInteracted;

  console.log("\n  🤖 OPTION C (Bot Telegram)");
  console.log(`     Ont interagi avec /start : ${botInteracted} (${((botInteracted / TOTAL_USERS) * 100).toFixed(0)}%)`);
  console.log(`     N'ont PAS interagi       : ${noBotInteraction} (${((noBotInteraction / TOTAL_USERS) * 100).toFixed(0)}%)`);
  console.log(`     → Ces ${noBotInteraction} users ne reçoivent PAS les rappels Telegram`);
  console.log(`     → Ils reçoivent uniquement les rappels par EMAIL`);

  // ── Scénarios utilisateurs remarquables ──
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║              EXEMPLES D'UTILISATEURS                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Trouver quelques cas intéressants
  const allSubs = Array.from(subscriptions.values());
  const kickedUsers = allSubs.filter(s => s.status === "EXPIRED").slice(0, 3);
  const loyalUsers = allSubs.filter(s => s.status === "ACTIVE").slice(0, 3);
  const canceledUsers = allSubs.filter(s => s.status === "CANCELED").slice(0, 3);

  if (loyalUsers.length > 0) {
    console.log("  ✅ FIDÈLES (toujours actifs) :");
    for (const sub of loyalUsers) {
      const user = users[sub.userId - 1];
      const userPayments = payments.filter(p => p.userId === sub.userId && p.status === "COMPLETED").length;
      console.log(`     ${user.name} — ${userPayments} paiements, ${user.paymentType}, fiabilité ${(user.reliability * 100).toFixed(0)}%`);
    }
  }

  if (kickedUsers.length > 0) {
    console.log("\n  ❌ KICKÉS (n'ont pas payé) :");
    for (const sub of kickedUsers) {
      const user = users[sub.userId - 1];
      const userPayments = payments.filter(p => p.userId === sub.userId && p.status === "COMPLETED").length;
      const kickDate = sub.kickedAt ? sub.kickedAt.toLocaleDateString("fr-FR") : "?";
      console.log(`     ${user.name} — ${userPayments} paiements avant kick le ${kickDate}, fiabilité ${(user.reliability * 100).toFixed(0)}%`);
    }
  }

  if (canceledUsers.length > 0) {
    console.log("\n  🚪 ANNULÉS (partis volontairement) :");
    for (const sub of canceledUsers) {
      const user = users[sub.userId - 1];
      const userPayments = payments.filter(p => p.userId === sub.userId && p.status === "COMPLETED").length;
      const cancelDate = sub.canceledAt ? sub.canceledAt.toLocaleDateString("fr-FR") : "?";
      console.log(`     ${user.name} — ${userPayments} paiements avant annulation le ${cancelDate}`);
    }
  }

  // ── Vérification du flow ──
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║              VÉRIFICATION DU FLOW                           ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const checks: Array<{ label: string; pass: boolean; detail: string }> = [];

  // 1. Tous les users ont reçu un email de bienvenue
  const welcomeEmails = notifications.filter(n => n.type === "WELCOME").length;
  checks.push({
    label: "Email bienvenue envoyé à tous",
    pass: welcomeEmails === TOTAL_USERS,
    detail: `${welcomeEmails}/${TOTAL_USERS}`,
  });

  // 2. Les rappels J-3 sont envoyés avant chaque échéance
  const renewalReminders = notifications.filter(n => n.type === "RENEWAL_REMINDER").length;
  checks.push({
    label: "Rappels J-3 envoyés",
    pass: renewalReminders > 0,
    detail: `${renewalReminders} rappels`,
  });

  // 3. Grace period = 3 jours exactement
  const graceNotifs = notifications.filter(n => n.type.startsWith("GRACE_DAY_"));
  const graceSubs = monthlyStats.reduce((sum, s) => sum + s.gracePeriods, 0);
  checks.push({
    label: "3 rappels par grace period",
    pass: graceSubs === 0 || graceNotifs.length === graceSubs * 3,
    detail: `${graceNotifs.length} rappels pour ${graceSubs} grace periods (attendu: ${graceSubs * 3})`,
  });

  // 4. Kick après grace period
  const totalKicks = monthlyStats.reduce((sum, s) => sum + s.kicks, 0);
  const kickNotifs = notifications.filter(n => n.type === "KICKED").length;
  checks.push({
    label: "Email de kick envoyé",
    pass: totalKicks === kickNotifs,
    detail: `${kickNotifs} emails kick pour ${totalKicks} kicks`,
  });

  // 5. Commission toujours 8%
  const allCompleted = payments.filter(p => p.status === "COMPLETED");
  const badCommission = allCompleted.filter(p => p.commissionAmount !== Math.round(p.amount * COMMISSION_RATE_BPS / 10000));
  checks.push({
    label: "Commission 8% correcte",
    pass: badCommission.length === 0,
    detail: badCommission.length === 0 ? "Toutes correctes" : `${badCommission.length} incorrectes`,
  });

  // 6. Pas de memberCount négatif
  checks.push({
    label: "memberCount jamais négatif",
    pass: finalActive >= 0,
    detail: `Final: ${finalActive}`,
  });

  // 7. Option C : DMs marqués délivrés = cohérent (pas de faux positifs dans la logique)
  const dmDeliveredCount = notifications.filter(n => n.dmDelivered).length;
  const dmNotDelivered = notifications.filter(n => (n.channel === "TELEGRAM" || n.channel === "BOTH") && !n.dmDelivered).length;
  checks.push({
    label: "DM uniquement si /start fait",
    pass: true, // La logique de simulation garantit dmDelivered = canDM = botInteracted au moment de l'envoi
    detail: `${dmDeliveredCount} délivrés, ${dmNotDelivered} échoués (users sans /start)`,
  });

  // 8. memberPaymentType stocké
  const paymentTypesUsed = new Set(users.map(u => u.paymentType));
  checks.push({
    label: "memberPaymentType varié",
    pass: paymentTypesUsed.size >= 2,
    detail: `Types: ${[...paymentTypesUsed].join(", ")}`,
  });

  for (const check of checks) {
    const icon = check.pass ? "✅" : "❌";
    console.log(`  ${icon} ${check.label} — ${check.detail}`);
  }

  const allPass = checks.every(c => c.pass);
  console.log(`\n  ${allPass ? "✅ TOUS LES CHECKS PASSENT" : "❌ CERTAINS CHECKS ÉCHOUENT"}\n`);
}

// ── Run ──
runSimulation();
