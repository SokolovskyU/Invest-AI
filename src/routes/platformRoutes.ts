import fs from "node:fs";
import path from "node:path";
import type { Express, Request, Response } from "express";
import {
  createAlertRule,
  deleteAlertRule,
  evaluateAlertsForSnapshot,
  listAlertNotifications,
  listAlertRules,
  updateAlertRule,
} from "../platform/alerts";
import {
  getFeatureFlags,
  resetFeatureFlags,
  setFeatureFlags,
  type FeatureFlagKey,
} from "../platform/featureFlags";
import {
  getHistoryStateMeta,
  getLatestSnapshot,
  listHistoryEvents,
  listHistorySnapshots,
} from "../platform/history";
import { enqueueAnalyticsJob, getJob, isJobsEnabled, listJobs } from "../platform/jobs";
import {
  assignUserAccount,
  canAccessAccount,
  canManageUsers,
  deleteUser,
  listUsers,
  revokeUserAccount,
  upsertUser,
  type UserRole,
} from "../platform/rbac";
import {
  buildPortfolioReport,
  isReportsEnabled,
  reportToJsonBuffer,
  reportToPdfBuffer,
  reportToXlsxBuffer,
  type ReportFormat,
} from "../platform/reports";
import { getMetrics } from "../metrics";

function parseIntQuery(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function readAccountId(req: Request): string {
  return String(
    (req.query.accountId as string | undefined) ||
      (req.body as Record<string, unknown> | undefined)?.accountId ||
      ""
  ).trim();
}

function ensureAdmin(req: Request, res: Response): boolean {
  if (canManageUsers(req)) return true;
  res.status(403).json({ error: "Forbidden: admin role required" });
  return false;
}

function ensureAccountScope(req: Request, res: Response, accountId: string): boolean {
  if (!accountId) {
    if (canManageUsers(req)) return true;
    res.status(400).json({ error: "Missing accountId for scoped access" });
    return false;
  }
  if (canAccessAccount(req, accountId)) return true;
  res.status(403).json({ error: "Forbidden: account access denied" });
  return false;
}

function metricToNumber(key: string): number {
  return Number(String(key || "").replace(/[^0-9]/g, "") || "0");
}

function calcSloSnapshot(): Record<string, unknown> {
  const metrics = getMetrics();
  let success = 0;
  let total = 0;

  for (const [status, count] of Object.entries(metrics.byStatus || {})) {
    const numericStatus = metricToNumber(status);
    const numericCount = Number(count) || 0;
    total += numericCount;
    if (numericStatus >= 200 && numericStatus < 500) {
      success += numericCount;
    }
  }

  const availability = total > 0 ? (success / total) * 100 : 100;
  const objective = 99.5;
  const errorBudget = Math.max(0, 100 - objective);
  const consumedBudget = Math.max(0, 100 - availability);
  const burnRate = errorBudget > 0 ? consumedBudget / errorBudget : 0;

  return {
    objectivePct: objective,
    availabilityPct: availability,
    successRequests: success,
    totalRequests: total,
    errorBudgetPct: errorBudget,
    consumedErrorBudgetPct: consumedBudget,
    burnRate,
    healthy: availability >= objective,
  };
}

function serveOpenApiSpec(_req: Request, res: Response): void {
  const specPath = path.resolve("docs", "openapi.yaml");
  if (!fs.existsSync(specPath)) {
    res.status(404).json({ error: "OpenAPI spec not found" });
    return;
  }
  res.set("Content-Type", "application/yaml; charset=utf-8");
  res.sendFile(specPath);
}

export function registerPlatformRoutes(app: Express): void {
  app.get("/api/openapi.yaml", serveOpenApiSpec);

  app.get("/api/feature-flags", (_req, res) => {
    res.json({ flags: getFeatureFlags() });
  });

  app.post("/api/feature-flags", (req, res) => {
    if (!ensureAdmin(req, res)) return;
    const body = (req.body || {}) as Record<string, unknown>;
    const updates: Partial<Record<FeatureFlagKey, boolean>> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== "boolean") continue;
      updates[key as FeatureFlagKey] = value;
    }
    res.json({ flags: setFeatureFlags(updates) });
  });

  app.post("/api/feature-flags/reset", (req, res) => {
    if (!ensureAdmin(req, res)) return;
    res.json({ flags: resetFeatureFlags() });
  });

  app.get("/api/history/meta", (_req, res) => {
    res.json(getHistoryStateMeta());
  });

  app.get("/api/history/snapshots", (req, res) => {
    const accountId = readAccountId(req);
    if (!ensureAccountScope(req, res, accountId)) return;
    const limit = parseIntQuery(req.query.limit, 180);
    res.json({
      accountId: accountId || null,
      items: listHistorySnapshots(accountId || undefined, limit),
    });
  });

  app.get("/api/history/events", (req, res) => {
    const accountId = readAccountId(req);
    if (!ensureAccountScope(req, res, accountId)) return;
    const limit = parseIntQuery(req.query.limit, 250);
    res.json({
      accountId: accountId || null,
      items: listHistoryEvents(accountId || undefined, limit),
    });
  });

  app.get("/api/alerts/rules", (req, res) => {
    const accountId = readAccountId(req);
    if (!ensureAccountScope(req, res, accountId)) return;
    res.json({ items: listAlertRules(accountId || undefined) });
  });

  app.post("/api/alerts/rules", (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const accountId = body.accountId ? String(body.accountId).trim() : "";
    if (!ensureAccountScope(req, res, accountId)) return;
    const threshold = Number(body.threshold);
    const metric = String(body.metric || "") as "total_value" | "profit_value" | "yield_pct";
    const operator = String(body.operator || "") as "lt" | "lte" | "gt" | "gte";
    if (!Number.isFinite(threshold) || !metric || !operator) {
      res.status(400).json({ error: "Invalid rule payload" });
      return;
    }
    const item = createAlertRule({
      name: String(body.name || "Alert rule"),
      accountId: accountId || undefined,
      metric,
      operator,
      threshold,
      severity: (String(body.severity || "warn") as any) || "warn",
      channel: (String(body.channel || "log") as any) || "log",
      cooldownMinutes: Number(body.cooldownMinutes) || 30,
      enabled: body.enabled !== false,
    });
    res.status(201).json(item);
  });

  app.patch("/api/alerts/rules/:id", (req, res) => {
    const id = String(req.params.id || "").trim();
    if (!id) {
      res.status(400).json({ error: "Missing rule id" });
      return;
    }
    const updated = updateAlertRule(id, req.body || {});
    if (!updated) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    res.json(updated);
  });

  app.delete("/api/alerts/rules/:id", (req, res) => {
    const id = String(req.params.id || "").trim();
    const ok = deleteAlertRule(id);
    if (!ok) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    res.json({ ok: true });
  });

  app.get("/api/alerts/notifications", (req, res) => {
    const accountId = readAccountId(req);
    if (!ensureAccountScope(req, res, accountId)) return;
    const limit = parseIntQuery(req.query.limit, 150);
    res.json({ items: listAlertNotifications(accountId || undefined, limit) });
  });

  app.post("/api/alerts/check", (req, res) => {
    const accountId = readAccountId(req);
    if (!ensureAccountScope(req, res, accountId)) return;
    const snapshot = getLatestSnapshot(accountId);
    if (!snapshot) {
      res.status(404).json({ error: "No snapshots found for account" });
      return;
    }
    const created = evaluateAlertsForSnapshot(snapshot);
    res.json({ ok: true, created });
  });

  app.get("/api/jobs", (req, res) => {
    const accountId = readAccountId(req);
    if (!ensureAccountScope(req, res, accountId)) return;
    const limit = parseIntQuery(req.query.limit, 100);
    res.json({ items: listJobs(accountId || undefined, limit) });
  });

  app.post("/api/jobs/analytics", (req, res) => {
    if (!isJobsEnabled()) {
      res.status(403).json({ error: "Background analytics jobs are disabled" });
      return;
    }
    const accountId = readAccountId(req);
    if (!ensureAccountScope(req, res, accountId)) return;
    try {
      const job = enqueueAnalyticsJob(accountId);
      res.status(202).json(job);
    } catch (error: unknown) {
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : "Failed to enqueue job" });
    }
  });

  app.get("/api/jobs/:jobId", (req, res) => {
    const jobId = String(req.params.jobId || "").trim();
    const job = getJob(jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    if (!ensureAccountScope(req, res, job.accountId)) return;
    res.json(job);
  });

  app.get("/api/admin/users", (req, res) => {
    if (!ensureAdmin(req, res)) return;
    res.json({ items: listUsers() });
  });

  app.post("/api/admin/users", (req, res) => {
    if (!ensureAdmin(req, res)) return;
    const body = (req.body || {}) as Record<string, unknown>;
    const id = String(body.id || "").trim();
    if (!id) {
      res.status(400).json({ error: "Missing user id" });
      return;
    }
    const item = upsertUser({
      id,
      role: String(body.role || "viewer") as UserRole,
      accounts: Array.isArray(body.accounts) ? body.accounts.map((x) => String(x)) : [],
    });
    res.status(201).json(item);
  });

  app.delete("/api/admin/users/:userId", (req, res) => {
    if (!ensureAdmin(req, res)) return;
    const ok = deleteUser(String(req.params.userId || ""));
    if (!ok) {
      res.status(404).json({ error: "User not found or protected" });
      return;
    }
    res.json({ ok: true });
  });

  app.post("/api/admin/users/:userId/accounts", (req, res) => {
    if (!ensureAdmin(req, res)) return;
    const userId = String(req.params.userId || "").trim();
    const accountId = String(
      (req.body as Record<string, unknown> | undefined)?.accountId || ""
    ).trim();
    if (!userId || !accountId) {
      res.status(400).json({ error: "Missing userId or accountId" });
      return;
    }
    const user = assignUserAccount(userId, accountId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  });

  app.delete("/api/admin/users/:userId/accounts/:accountId", (req, res) => {
    if (!ensureAdmin(req, res)) return;
    const user = revokeUserAccount(
      String(req.params.userId || ""),
      String(req.params.accountId || "")
    );
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  });

  app.post("/api/reports/export", async (req, res) => {
    if (!isReportsEnabled()) {
      res.status(403).json({ error: "Reports export is disabled" });
      return;
    }
    const accountId = readAccountId(req);
    const format = String(
      (req.body as Record<string, unknown> | undefined)?.format || "json"
    ) as ReportFormat;
    if (!ensureAccountScope(req, res, accountId)) return;
    const report = buildPortfolioReport(accountId);
    if (format === "json") {
      res.set("Content-Type", "application/json; charset=utf-8");
      res.set("Content-Disposition", `attachment; filename="portfolio-report-${accountId}.json"`);
      res.send(reportToJsonBuffer(report));
      return;
    }
    if (format === "xlsx") {
      res.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.set("Content-Disposition", `attachment; filename="portfolio-report-${accountId}.xlsx"`);
      res.send(await reportToXlsxBuffer(report));
      return;
    }
    if (format === "pdf") {
      res.set("Content-Type", "application/pdf");
      res.set("Content-Disposition", `attachment; filename="portfolio-report-${accountId}.pdf"`);
      res.send(await reportToPdfBuffer(report));
      return;
    }
    res.status(400).json({ error: "Unsupported report format" });
  });

  app.get("/api/slo", (_req, res) => {
    res.json(calcSloSnapshot());
  });
}
