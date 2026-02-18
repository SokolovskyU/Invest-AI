import pino from "pino";

export type LogLevel = "debug" | "info" | "warn" | "error";

function getLogLevel(): LogLevel {
  const raw = (process.env.TINVEST_LOG_LEVEL || "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

const logger = pino({
  level: getLogLevel(),
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

function withMessage(msg: string, extra?: Record<string, unknown>): Record<string, unknown> {
  const base: Record<string, unknown> = { msg };
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      base[k] = v;
    }
  }
  return base;
}

export function logDebug(msg: string, extra?: Record<string, unknown>): void {
  logger.debug(withMessage(msg, extra));
}

export function logInfo(msg: string, extra?: Record<string, unknown>): void {
  logger.info(withMessage(msg, extra));
}

export function logWarn(msg: string, extra?: Record<string, unknown>): void {
  logger.warn(withMessage(msg, extra));
}

export function logError(msg: string, extra?: Record<string, unknown>): void {
  logger.error(withMessage(msg, extra));
}
