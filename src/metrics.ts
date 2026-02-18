import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

export type MetricsSnapshot = {
  uptimeSec: number;
  totalRequests: number;
  byStatus: Record<string, number>;
  byRoute: Record<string, number>;
};

const startedAt = Date.now();
const totalRequests = { value: 0 };
const byStatus = new Map<string, number>();
const byRoute = new Map<string, number>();

const registry = new Registry();
collectDefaultMetrics({
  register: registry,
  prefix: "invest_",
});

const httpRequestsTotal = new Counter({
  name: "invest_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"] as const,
  registers: [registry],
});

const httpRequestDurationSeconds = new Histogram({
  name: "invest_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.6, 1, 2, 5],
  registers: [registry],
});

const portfolioResponsesTotal = new Counter({
  name: "invest_portfolio_responses_total",
  help: "Total /api/portfolio successful responses",
  registers: [registry],
});

const analyticsResponsesTotal = new Counter({
  name: "invest_analytics_responses_total",
  help: "Total /api/analytics successful responses",
  registers: [registry],
});

const lastPortfolioPositionsGauge = new Gauge({
  name: "invest_portfolio_positions_last",
  help: "Last observed number of returned portfolio positions",
  registers: [registry],
});

const lastAnalyticsAssetTypesGauge = new Gauge({
  name: "invest_analytics_asset_types_last",
  help: "Last observed number of asset types in analytics response",
  registers: [registry],
});

const lastAnalyticsIncomeMonthsGauge = new Gauge({
  name: "invest_analytics_income_months_last",
  help: "Last observed number of income months in analytics response",
  registers: [registry],
});

export function recordRequest(
  routeKey: string,
  status: number,
  durationMs: number,
  method = "GET"
): void {
  totalRequests.value += 1;

  const statusKey = String(status);
  byStatus.set(statusKey, (byStatus.get(statusKey) || 0) + 1);
  byRoute.set(routeKey, (byRoute.get(routeKey) || 0) + 1);

  const normalizedRoute = routeKey || "unknown";
  const normalizedMethod = method || "GET";

  httpRequestsTotal.inc({
    method: normalizedMethod,
    route: normalizedRoute,
    status: statusKey,
  });

  httpRequestDurationSeconds.observe(
    {
      method: normalizedMethod,
      route: normalizedRoute,
      status: statusKey,
    },
    Math.max(0, durationMs) / 1000
  );
}

export function recordPortfolioMetrics(positionCount: number): void {
  portfolioResponsesTotal.inc();
  lastPortfolioPositionsGauge.set(Math.max(0, Number(positionCount) || 0));
}

export function recordAnalyticsMetrics(assetTypesCount: number, incomeMonths: number): void {
  analyticsResponsesTotal.inc();
  lastAnalyticsAssetTypesGauge.set(Math.max(0, Number(assetTypesCount) || 0));
  lastAnalyticsIncomeMonthsGauge.set(Math.max(0, Number(incomeMonths) || 0));
}

export function getMetrics(): MetricsSnapshot {
  return {
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    totalRequests: totalRequests.value,
    byStatus: Object.fromEntries(byStatus.entries()),
    byRoute: Object.fromEntries(byRoute.entries()),
  };
}

export async function getPromMetrics(): Promise<string> {
  return registry.metrics();
}

export function getPromMetricsContentType(): string {
  return registry.contentType;
}
