import type { NextFunction, Request, Response } from "express";
import { evaluateAlertsForSnapshot } from "../platform/alerts";
import { recordHistoryEvent, recordHistorySnapshot } from "../platform/history";

function parseNumberFromText(input: unknown): number {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : 0;
  }
  const value = String(input || "");
  if (!value.trim()) return 0;
  const normalized = value
    .replace(/\s+/g, "")
    .replace(",", ".")
    .replace(/[^0-9+-.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getAccountId(req: Request): string {
  return String((req.body as Record<string, unknown> | undefined)?.accountId || "").trim();
}

function capturePortfolioSnapshot(req: Request, payload: Record<string, unknown>): void {
  const accountId = getAccountId(req);
  if (!accountId) return;
  const snapshot = recordHistorySnapshot({
    accountId,
    source: "portfolio",
    totalText: String(payload.total || ""),
    totalValue: parseNumberFromText(payload.total),
  });
  if (!snapshot) return;
  const created = evaluateAlertsForSnapshot(snapshot);
  for (const notification of created) {
    recordHistoryEvent({
      accountId,
      eventType: "alert",
      title: notification.title,
      details: notification.message,
      payload: notification,
    });
  }
}

function captureAnalyticsSnapshot(req: Request, payload: Record<string, unknown>): void {
  const accountId = getAccountId(req);
  if (!accountId) return;
  const snapshot = recordHistorySnapshot({
    accountId,
    source: "analytics",
    totalText: String(payload.total || ""),
    totalValue: parseNumberFromText(payload.total),
    profitValue: Number.isFinite(payload.profitValue)
      ? Number(payload.profitValue)
      : parseNumberFromText(payload.profitRub),
    yieldPct: parseNumberFromText(payload.yieldPct),
    currency: String(payload.currency || "").toUpperCase() || undefined,
  });
  if (!snapshot) return;

  const upcoming = Array.isArray(payload.upcomingEvents) ? payload.upcomingEvents : [];
  for (const event of upcoming.slice(0, 20)) {
    const row = event as Record<string, unknown>;
    recordHistoryEvent({
      accountId,
      eventType: String(row.eventType || "upcoming"),
      title: String(row.name || "Upcoming event"),
      details: `${String(row.date || "")} ${String(row.amount || "")}`.trim(),
      payload: row,
    });
  }

  const created = evaluateAlertsForSnapshot(snapshot);
  for (const notification of created) {
    recordHistoryEvent({
      accountId,
      eventType: "alert",
      title: notification.title,
      details: notification.message,
      payload: notification,
    });
  }
}

export function historyCapture(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== "POST") {
    next();
    return;
  }

  const path = req.path;
  if (path !== "/api/portfolio" && path !== "/api/analytics") {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (body && typeof body === "object") {
      const payload = body as Record<string, unknown>;
      try {
        if (path === "/api/portfolio") {
          capturePortfolioSnapshot(req, payload);
        } else if (path === "/api/analytics") {
          captureAnalyticsSnapshot(req, payload);
        }
      } catch {
        // Keep API response stable even if history capture fails.
      }
    }
    return originalJson(body);
  }) as typeof res.json;

  next();
}
