/**
 * Structured JSON logger with secret redaction.
 *
 * Security requirements this module enforces:
 * - never log passwords, tokens, API keys, cookies or auth headers
 *   (keys matching REDACT_PATTERN are replaced with "[REDACTED]")
 * - structured output (one JSON object per line) for ingestion by
 *   log tooling / SIEM
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const REDACT_PATTERN =
  /pass(word)?|secret|token|api[-_]?key|authorization|cookie|session|credential|private/i;

const MIN_LEVEL: Level =
  process.env.NODE_ENV === "production" ? "info" : "debug";

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = REDACT_PATTERN.test(k) ? "[REDACTED]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

function emit(
  level: Level,
  message: string,
  context: Record<string, unknown> | undefined,
  base: Record<string, unknown>,
) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...base,
    ...(context ? (redact(context) as Record<string, unknown>) : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export interface Logger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

export function createLogger(base: Record<string, unknown> = {}): Logger {
  const safeBase = redact(base) as Record<string, unknown>;
  return {
    debug: (msg, ctx) => emit("debug", msg, ctx, safeBase),
    info: (msg, ctx) => emit("info", msg, ctx, safeBase),
    warn: (msg, ctx) => emit("warn", msg, ctx, safeBase),
    error: (msg, ctx) => emit("error", msg, ctx, safeBase),
    child: (bindings) => createLogger({ ...safeBase, ...bindings }),
  };
}

export const logger = createLogger({ app: "coinjecko-finance-hub" });
