import { Router } from "express";
import { adminAuthRouter } from "./auth.js";
import { adminDashboardRouter } from "./dashboard.js";
import { adminSellersRouter } from "./sellers.js";
import { adminOrdersRouter } from "./orders.js";
import { adminWithdrawalsRouter } from "./withdrawals.js";
import { adminKycRouter } from "./kyc.js";
import { adminAnalyticsRouter } from "./analytics.js";
import { adminSystemRouter } from "./system.js";
import { adminReportsRouter } from "./reports.js";
import { adminPaymentMethodsRouter } from "./payment-methods.js";
import { verifyCsrf } from "../../lib/auth.js";

export const adminRouter = Router();

// Auth routes (login sets CSRF cookie, so auth routes handle CSRF inline)
adminRouter.use("/auth", adminAuthRouter);

// Protected admin routes — CSRF on mutations (POST/PATCH/DELETE)
adminRouter.use("/dashboard", adminDashboardRouter);
adminRouter.use("/sellers", verifyCsrf, adminSellersRouter);
adminRouter.use("/orders", verifyCsrf, adminOrdersRouter);
adminRouter.use("/withdrawals", verifyCsrf, adminWithdrawalsRouter);
adminRouter.use("/kyc", verifyCsrf, adminKycRouter);
adminRouter.use("/analytics", adminAnalyticsRouter);
adminRouter.use("/system", adminSystemRouter);
adminRouter.use("/reports", verifyCsrf, adminReportsRouter);
adminRouter.use("/payment-methods", verifyCsrf, adminPaymentMethodsRouter);
