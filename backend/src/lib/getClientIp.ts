import type { Request } from "express";

export function getClientIp(req: Request): string | undefined {
  const ip = req.ip;
  if (Array.isArray(ip)) return ip[0];
  return ip || req.socket.remoteAddress || undefined;
}
