/**
 * Structured JSON logger with sensitive data redaction.
 *
 * - Production: JSON lines to stdout (compatible with Railway, Datadog, etc.)
 * - Development: human-readable console output
 *
 * All log entries include a timestamp and level. When a requestId is set
 * via `setRequestId()` (from the correlation middleware), it's attached
 * to every subsequent log in that async context.
 */

import { AsyncLocalStorage } from "node:async_hooks";

const IS_PROD = process.env.NODE_ENV === "production";

// ── Async correlation ID via AsyncLocalStorage ──
const requestContext = new AsyncLocalStorage<{ requestId: string }>();

export function setRequestId(requestId: string, fn: () => void): void {
  requestContext.run({ requestId }, fn);
}

function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

// ── Redaction ──
function redact(msg: string): string {
  return msg
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
    .replace(/FA-[A-Z0-9]{8,}/g, "FA-[REDACTED]")
    .replace(/\+?\d{10,15}/g, "[PHONE]")
    .replace(/payout_[a-f0-9]{16}/g, "payout_[REDACTED]");
}

// ── Structured output ──
interface LogEntry {
  ts: string;
  level: string;
  msg: string;
  requestId?: string;
  error?: string;
  stack?: string;
}

function emit(level: string, message: string, err?: unknown): void {
  const requestId = getRequestId();

  if (IS_PROD) {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      msg: redact(message),
      ...(requestId && { requestId }),
    };

    if (err instanceof Error) {
      entry.error = redact(err.message);
      if (level === "error" && err.stack) {
        entry.stack = err.stack.split("\n").slice(0, 5).join("\n");
      }
    } else if (err !== undefined) {
      entry.error = redact(String(err));
    }

    // Single JSON line to stdout — parseable by any log aggregator
    const out = level === "error" || level === "warn" ? process.stderr : process.stdout;
    out.write(JSON.stringify(entry) + "\n");
  } else {
    // Dev: human-readable
    const prefix = requestId ? `[${requestId}] ` : "";
    if (err) {
      console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
        `${prefix}${message}`,
        err,
      );
    } else {
      console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
        `${prefix}${message}`,
      );
    }
  }
}

export function log(message: string, ...args: unknown[]): void {
  emit("info", args.length ? `${message} ${args.map(String).join(" ")}` : message);
}

export function warn(message: string, ...args: unknown[]): void {
  emit("warn", args.length ? `${message} ${args.map(String).join(" ")}` : message);
}

export function error(message: string, err?: unknown): void {
  emit("error", message, err);
}
