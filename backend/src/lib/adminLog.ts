import { prisma } from "./prisma.js";
import * as logger from "./logger.js";

export async function logAdminAction(
  adminId: string,
  action: string,
  target: string,
  details?: Record<string, unknown>,
  ip?: string,
): Promise<void> {
  try {
    await prisma.adminLog.create({
      data: { adminId, action, target, details: (details ?? {}) as object, ip },
    });
  } catch (err) {
    logger.error("[AdminLog] Audit write failed", err);
  }
}
