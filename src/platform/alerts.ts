import { randomUUID } from "node:crypto";
import type { HistorySnapshot } from "./history";
import { isFeatureEnabled } from "./featureFlags";

export type AlertMetric = "total_value" | "profit_value" | "yield_pct";
export type AlertOperator = "lt" | "lte" | "gt" | "gte";
export type AlertSeverity = "info" | "warn" | "critical";
export type AlertChannel = "log" | "webhook" | "email" | "telegram";

export type AlertRule = {
  id: string;
  name: string;
  accountId?: string;
  metric: AlertMetric;
  operator: AlertOperator;
  threshold: number;
  severity: AlertSeverity;
  channel: AlertChannel;
  enabled: boolean;
  cooldownMinutes: number;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
};

export type AlertNotification = {
  id: string;
  ruleId: string;
  accountId: string;
  severity: AlertSeverity;
  channel: AlertChannel;
  title: string;
  message: string;
  value: number;
  threshold: number;
  createdAt: string;
  delivered: boolean;
};

const MAX_NOTIFICATIONS = 5_000;
const rules = new Map<string, AlertRule>();
const notifications: AlertNotification[] = [];

function nowIso(): string {
  return new Date().toISOString();
}

function compare(value: number, operator: AlertOperator, threshold: number): boolean {
  if (operator === "lt") return value < threshold;
  if (operator === "lte") return value <= threshold;
  if (operator === "gt") return value > threshold;
  return value >= threshold;
}

function metricValue(snapshot: HistorySnapshot, metric: AlertMetric): number | null {
  if (metric === "total_value")
    return Number.isFinite(snapshot.totalValue) ? snapshot.totalValue : null;
  if (metric === "profit_value") {
    return Number.isFinite(snapshot.profitValue) ? Number(snapshot.profitValue) : null;
  }
  if (metric === "yield_pct") {
    return Number.isFinite(snapshot.yieldPct) ? Number(snapshot.yieldPct) : null;
  }
  return null;
}

function shouldTrigger(rule: AlertRule, snapshot: HistorySnapshot): { ok: boolean; value: number } {
  const value = metricValue(snapshot, rule.metric);
  if (!Number.isFinite(value)) return { ok: false, value: 0 };
  if (!compare(value as number, rule.operator, rule.threshold))
    return { ok: false, value: value as number };
  if (!rule.lastTriggeredAt) return { ok: true, value: value as number };
  const last = new Date(rule.lastTriggeredAt).getTime();
  const cooldownMs = Math.max(0, Number(rule.cooldownMinutes || 0)) * 60_000;
  if (!Number.isFinite(last) || cooldownMs <= 0) return { ok: true, value: value as number };
  return { ok: Date.now() - last >= cooldownMs, value: value as number };
}

function trimNotifications(): void {
  if (notifications.length <= MAX_NOTIFICATIONS) return;
  notifications.splice(0, notifications.length - MAX_NOTIFICATIONS);
}

export function listAlertRules(accountId?: string): AlertRule[] {
  const normalized = String(accountId || "").trim();
  const rows = Array.from(rules.values());
  return rows
    .filter((row) => (normalized ? row.accountId === normalized : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createAlertRule(input: {
  name: string;
  accountId?: string;
  metric: AlertMetric;
  operator: AlertOperator;
  threshold: number;
  severity?: AlertSeverity;
  channel?: AlertChannel;
  enabled?: boolean;
  cooldownMinutes?: number;
}): AlertRule {
  const now = nowIso();
  const rule: AlertRule = {
    id: randomUUID(),
    name: String(input.name || "").trim() || "Alert rule",
    accountId: input.accountId ? String(input.accountId).trim() : undefined,
    metric: input.metric,
    operator: input.operator,
    threshold: Number(input.threshold),
    severity: input.severity || "warn",
    channel: input.channel || "log",
    enabled: input.enabled !== false,
    cooldownMinutes:
      Number.isFinite(input.cooldownMinutes) && Number(input.cooldownMinutes) >= 0
        ? Number(input.cooldownMinutes)
        : 30,
    createdAt: now,
    updatedAt: now,
  };
  rules.set(rule.id, rule);
  return rule;
}

export function updateAlertRule(
  id: string,
  patch: Partial<Omit<AlertRule, "id" | "createdAt">>
): AlertRule | null {
  const existing = rules.get(id);
  if (!existing) return null;
  const next: AlertRule = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  };
  rules.set(id, next);
  return next;
}

export function deleteAlertRule(id: string): boolean {
  return rules.delete(id);
}

export function listAlertNotifications(accountId?: string, limit = 150): AlertNotification[] {
  const normalized = String(accountId || "").trim();
  const max = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 2_000) : 150;
  const rows = normalized
    ? notifications.filter((row) => row.accountId === normalized)
    : notifications;
  return rows.slice(-max).reverse();
}

export function evaluateAlertsForSnapshot(snapshot: HistorySnapshot): AlertNotification[] {
  if (!isFeatureEnabled("alerts_enabled")) return [];
  const created: AlertNotification[] = [];
  for (const rule of rules.values()) {
    if (!rule.enabled) continue;
    if (rule.accountId && rule.accountId !== snapshot.accountId) continue;
    const result = shouldTrigger(rule, snapshot);
    if (!result.ok) continue;

    const notification: AlertNotification = {
      id: randomUUID(),
      ruleId: rule.id,
      accountId: snapshot.accountId,
      severity: rule.severity,
      channel: rule.channel,
      title: `${rule.name}: ${rule.metric} ${rule.operator} ${rule.threshold}`,
      message: `Value ${result.value.toFixed(2)} crossed threshold ${rule.threshold.toFixed(2)}`,
      value: result.value,
      threshold: rule.threshold,
      createdAt: nowIso(),
      delivered: rule.channel === "log",
    };
    notifications.push(notification);
    trimNotifications();
    rule.lastTriggeredAt = notification.createdAt;
    rule.updatedAt = notification.createdAt;
    rules.set(rule.id, rule);
    created.push(notification);
  }
  return created;
}
