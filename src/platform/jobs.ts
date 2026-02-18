import { randomUUID } from "node:crypto";
import { isFeatureEnabled } from "./featureFlags";
import { listAlertNotifications } from "./alerts";
import { listHistoryEvents, listHistorySnapshots } from "./history";

export type BackgroundJobStatus = "queued" | "running" | "completed" | "failed";

export type BackgroundJob = {
  id: string;
  type: "analytics_report";
  accountId: string;
  status: BackgroundJobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  result?: Record<string, unknown>;
};

const queue: string[] = [];
const jobs = new Map<string, BackgroundJob>();
let workerBusy = false;

function nowIso(): string {
  return new Date().toISOString();
}

function buildAnalyticsResult(accountId: string): Record<string, unknown> {
  const snapshots = listHistorySnapshots(accountId, 365);
  const events = listHistoryEvents(accountId, 500);
  const notifications = listAlertNotifications(accountId, 200);
  const latest = snapshots[0] || null;
  const first = snapshots[snapshots.length - 1] || null;

  const deltaTotal =
    latest && first && Number.isFinite(latest.totalValue) && Number.isFinite(first.totalValue)
      ? latest.totalValue - first.totalValue
      : 0;

  return {
    accountId,
    generatedAt: nowIso(),
    snapshots: snapshots.length,
    events: events.length,
    notifications: notifications.length,
    latestTotal: latest?.totalValue || 0,
    firstTotal: first?.totalValue || 0,
    deltaTotal,
    latestSnapshot: latest,
  };
}

async function processJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "running";
  job.startedAt = nowIso();
  jobs.set(jobId, job);

  try {
    await new Promise((resolve) => setTimeout(resolve, 150));
    job.result = buildAnalyticsResult(job.accountId);
    job.status = "completed";
    job.finishedAt = nowIso();
    jobs.set(jobId, job);
  } catch (error: unknown) {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "Job failed";
    job.finishedAt = nowIso();
    jobs.set(jobId, job);
  }
}

async function tickWorker(): Promise<void> {
  if (workerBusy) return;
  workerBusy = true;
  try {
    while (queue.length > 0) {
      const jobId = queue.shift();
      if (!jobId) continue;
      await processJob(jobId);
    }
  } finally {
    workerBusy = false;
  }
}

export function isJobsEnabled(): boolean {
  return isFeatureEnabled("background_analytics_jobs");
}

export function enqueueAnalyticsJob(accountId: string): BackgroundJob {
  const normalizedAccountId = String(accountId || "").trim();
  if (!normalizedAccountId) {
    throw new Error("Missing accountId");
  }
  const now = nowIso();
  const job: BackgroundJob = {
    id: randomUUID(),
    type: "analytics_report",
    accountId: normalizedAccountId,
    status: "queued",
    createdAt: now,
  };
  jobs.set(job.id, job);
  queue.push(job.id);
  void tickWorker();
  return job;
}

export function getJob(jobId: string): BackgroundJob | null {
  return jobs.get(jobId) || null;
}

export function listJobs(accountId?: string, limit = 100): BackgroundJob[] {
  const normalized = String(accountId || "").trim();
  const max = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 100;
  const rows = Array.from(jobs.values())
    .filter((job) => (normalized ? job.accountId === normalized : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows.slice(0, max);
}
