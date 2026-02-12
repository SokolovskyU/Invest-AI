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

export function recordRequest(routeKey: string, status: number): void {
  totalRequests.value += 1;
  const statusKey = String(status);
  byStatus.set(statusKey, (byStatus.get(statusKey) || 0) + 1);
  byRoute.set(routeKey, (byRoute.get(routeKey) || 0) + 1);
}

export function getMetrics(): MetricsSnapshot {
  return {
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    totalRequests: totalRequests.value,
    byStatus: Object.fromEntries(byStatus.entries()),
    byRoute: Object.fromEntries(byRoute.entries()),
  };
}
