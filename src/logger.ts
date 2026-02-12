export type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getLogLevel(): LogLevel {
  const raw = (process.env.TINVEST_LOG_LEVEL || "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[getLogLevel()];
}

function formatMessage(level: LogLevel, msg: string, extra?: Record<string, unknown>) {
  const base: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
  };
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      base[k] = v;
    }
  }
  return JSON.stringify(base);
}

export function logDebug(msg: string, extra?: Record<string, unknown>): void {
  if (!shouldLog("debug")) return;
  console.log(formatMessage("debug", msg, extra));
}

export function logInfo(msg: string, extra?: Record<string, unknown>): void {
  if (!shouldLog("info")) return;
  console.log(formatMessage("info", msg, extra));
}

export function logWarn(msg: string, extra?: Record<string, unknown>): void {
  if (!shouldLog("warn")) return;
  console.warn(formatMessage("warn", msg, extra));
}

export function logError(msg: string, extra?: Record<string, unknown>): void {
  if (!shouldLog("error")) return;
  console.error(formatMessage("error", msg, extra));
}
