import { Router } from "express";
import { adminAuthRouter } from "./auth.js";
import { adminDashboardRouter } from "./dashboard.js";
import { kycRouter } from "./kyc.js";
import { sellersAdminRouter } from "./sellers.js";
import { cagnottesAdminRouter } from "./cagnottes.js";
import { ordersAdminRouter } from "./orders.js";
import { withdrawalsAdminRouter } from "./withdrawals.js";
import { reportsRouter } from "./reports.js";
import { notificationsAdminRouter } from "./notifications.js";
import { configRouter } from "./config.js";
import { usersRouter } from "./users.js";
import { logsRouter } from "./logs.js";
import { adminUploadRouter } from "./upload.js";
import { verifyAdminCsrf } from "../../lib/adminAuth.js";

export const adminRouter = Router();

// ── Auth (login, refresh, logout, me) — mounted BEFORE CSRF so login/refresh work ──
adminRouter.use("/auth", adminAuthRouter);

// ── CSRF verification on all mutation routes below ──
adminRouter.use(verifyAdminCsrf);

// ── Dashboard (KPIs, revenue chart, activity) ──
adminRouter.use("/dashboard", adminDashboardRouter);

// ── KYC review queue ──
adminRouter.use("/kyc", kycRouter);

// ── Sellers CRUD ──
adminRouter.use("/sellers", sellersAdminRouter);

// ── Cagnottes management ──
adminRouter.use("/cagnottes", cagnottesAdminRouter);

// ── Orders & Revenue ──
adminRouter.use("/orders", ordersAdminRouter);

// ── Withdrawals management ──
adminRouter.use("/withdrawals", withdrawalsAdminRouter);

// ── Reports (signalements) ──
adminRouter.use("/reports", reportsRouter);

// ── Admin notifications (broadcast & targeted) ──
adminRouter.use("/notifications", notificationsAdminRouter);

// ── Platform config (SUPER_ADMIN — requireRole enforced inside router) ──
adminRouter.use("/config", configRouter);

// ── Admin users (SUPER_ADMIN — requireRole enforced inside router) ──
adminRouter.use("/users", usersRouter);

// ── Activity logs ──
adminRouter.use("/logs", logsRouter);

// ── Admin file uploads (édition cagnottes depuis le dashboard admin) ──
// Distinct de /api/upload qui exige requireAuth (seller). Voir admin/upload.ts
// pour la raison. Cap 5 Mo, images only, pas de FileUpload DB row.
adminRouter.use("/upload", adminUploadRouter);
