import type { Doc } from "../_generated/dataModel";

export const DEFAULT_TASK_LOCK_MS = 30_000;
export const MAX_TASK_LOCK_MS = 5 * 60_000;
export const BASE_RETRY_DELAY_MS = 5_000;
export const MAX_RETRY_DELAY_MS = 5 * 60_000;

export const clampLockMs = (lockMs?: number) => {
  const proposed = lockMs ?? DEFAULT_TASK_LOCK_MS;
  return Math.max(5_000, Math.min(proposed, MAX_TASK_LOCK_MS));
};

export const getRetryDelayMs = (attempt: number) => {
  const safeAttempt = Math.max(1, attempt);
  const delay = BASE_RETRY_DELAY_MS * 2 ** (safeAttempt - 1);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
};

export const getRetryAt = (attempt: number, now = Date.now()) => {
  return now + getRetryDelayMs(attempt);
};

export const classifyAutomationError = (error: unknown): {
  errorClass: Doc<"automationTasks">["errorClass"];
  message: string;
  recoverable: boolean;
} => {
  const message = error instanceof Error ? error.message : "Unknown automation task error.";
  const lower = message.toLowerCase();

  if (lower.includes("rate")) {
    return { errorClass: "rate_limit", message, recoverable: true };
  }
  if (lower.includes("network")) {
    return { errorClass: "network", message, recoverable: true };
  }
  if (lower.includes("timeout")) {
    return { errorClass: "timeout", message, recoverable: true };
  }
  if (lower.includes("invalid") || lower.includes("validation")) {
    return { errorClass: "validation", message, recoverable: false };
  }
  if (lower.includes("404") || lower.includes("forbidden") || lower.includes("unauthorized")) {
    return { errorClass: "upstream_4xx", message, recoverable: false };
  }
  if (lower.includes("500") || lower.includes("502") || lower.includes("503")) {
    return { errorClass: "upstream_5xx", message, recoverable: true };
  }

  return { errorClass: "unknown", message, recoverable: true };
};

export const shouldRetryTask = (args: {
  attempts: number;
  maxAttempts: number;
  recoverable: boolean;
}) => args.recoverable && args.attempts < args.maxAttempts;

