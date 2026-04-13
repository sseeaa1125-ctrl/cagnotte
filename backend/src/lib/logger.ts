/**
 * M11: Production-safe logger that redacts sensitive data.
 * In production, only logs error level. In dev, logs everything.
 */

const IS_PROD = process.env.NODE_ENV === "production";

function redact(msg: string): string {
  return msg
    // Redact email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
    // Redact order references (FA-XXXXXXXXXX)
    .replace(/FA-[A-Z0-9]{8,}/g, "FA-[REDACTED]")
    // Redact phone numbers (8+ digits)
    .replace(/\b\d{8,15}\b/g, "[PHONE]")
    // Redact file paths with extensions
    .replace(/\/[\w\-./]+\.\w{2,4}\b/g, "[PATH]");
}

export function log(message: string, ...args: unknown[]): void {
  if (!IS_PROD) {
    console.log(message, ...args);
  }
}

export function warn(message: string, ...args: unknown[]): void {
  if (IS_PROD) {
    console.warn(redact(message));
  } else {
    console.warn(message, ...args);
  }
}

export function error(message: string, err?: unknown): void {
  if (IS_PROD) {
    const errMsg = err instanceof Error ? err.message : "";
    console.error(redact(message), errMsg ? redact(errMsg) : "");
  } else {
    console.error(message, err);
  }
}
