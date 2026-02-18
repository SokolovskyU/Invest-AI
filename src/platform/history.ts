import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export type HistorySnapshot = {
  id: string;
  accountId: string;
  source: "portfolio" | "analytics";
  capturedAt: string;
  dateKey: string;
  totalText: string;
  totalValue: number;
  profitValue?: number;
  yieldPct?: number;
  currency?: string;
};

export type HistoryEvent = {
  id: string;
  accountId: string;
  eventType: string;
  title: string;
  details?: string;
  payload?: unknown;
  createdAt: string;
};

type HistoryState = {
  snapshots: HistorySnapshot[];
  events: HistoryEvent[];
  updatedAt: string;
};

const MAX_SNAPSHOTS = 3_000;
const MAX_EVENTS = 8_000;
const SAVE_DEBOUNCE_MS = 300;
const store: HistoryState = {
  snapshots: [],
  events: [],
  updatedAt: new Date(0).toISOString(),
};

let initialized = false;
let persistTimer: NodeJS.Timeout | undefined;
let persistQueue = Promise.resolve();

function getHistoryPath(): string {
  const cacheDir = path.resolve(
    String(process.env.TINVEST_CACHE_DIR || ".cache").trim() || ".cache"
  );
  return path.join(cacheDir, "history.json");
}

function toDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function clampSnapshots(): void {
  if (store.snapshots.length <= MAX_SNAPSHOTS) return;
  store.snapshots.splice(0, store.snapshots.length - MAX_SNAPSHOTS);
}

function clampEvents(): void {
  if (store.events.length <= MAX_EVENTS) return;
  store.events.splice(0, store.events.length - MAX_EVENTS);
}

function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = undefined;
    const payload: HistoryState = {
      snapshots: store.snapshots,
      events: store.events,
      updatedAt: new Date().toISOString(),
    };
    persistQueue = persistQueue
      .then(async () => {
        const target = getHistoryPath();
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, JSON.stringify(payload, null, 2), "utf8");
      })
      .catch(() => undefined);
  }, SAVE_DEBOUNCE_MS);
  persistTimer.unref?.();
}

function normalizeAccountId(accountId: string | undefined): string {
  return String(accountId || "").trim();
}

export async function hydrateHistoryStore(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    const raw = await fs.readFile(getHistoryPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<HistoryState>;
    store.snapshots = Array.isArray(parsed.snapshots) ? parsed.snapshots : [];
    store.events = Array.isArray(parsed.events) ? parsed.events : [];
    store.updatedAt =
      typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString();
    clampSnapshots();
    clampEvents();
  } catch {
    // ignore cache load failures
  }
}

export async function flushHistoryStore(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = undefined;
    const payload: HistoryState = {
      snapshots: store.snapshots,
      events: store.events,
      updatedAt: new Date().toISOString(),
    };
    persistQueue = persistQueue
      .then(async () => {
        const target = getHistoryPath();
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, JSON.stringify(payload, null, 2), "utf8");
      })
      .catch(() => undefined);
  }
  await persistQueue;
}

export function recordHistorySnapshot(input: {
  accountId: string;
  source: "portfolio" | "analytics";
  capturedAt?: string;
  totalText?: string;
  totalValue?: number;
  profitValue?: number;
  yieldPct?: number;
  currency?: string;
}): HistorySnapshot | null {
  const accountId = normalizeAccountId(input.accountId);
  if (!accountId) return null;
  const capturedAt = input.capturedAt || new Date().toISOString();
  const next: HistorySnapshot = {
    id: randomUUID(),
    accountId,
    source: input.source,
    capturedAt,
    dateKey: toDateKey(capturedAt),
    totalText: String(input.totalText || ""),
    totalValue: Number.isFinite(input.totalValue) ? Number(input.totalValue) : 0,
    profitValue: Number.isFinite(input.profitValue) ? Number(input.profitValue) : undefined,
    yieldPct: Number.isFinite(input.yieldPct) ? Number(input.yieldPct) : undefined,
    currency: input.currency ? String(input.currency).toUpperCase() : undefined,
  };
  store.snapshots.push(next);
  clampSnapshots();
  schedulePersist();
  return next;
}

export function recordHistoryEvent(input: {
  accountId: string;
  eventType: string;
  title: string;
  details?: string;
  payload?: unknown;
}): HistoryEvent | null {
  const accountId = normalizeAccountId(input.accountId);
  if (!accountId) return null;
  const next: HistoryEvent = {
    id: randomUUID(),
    accountId,
    eventType: String(input.eventType || "").trim() || "info",
    title: String(input.title || "").trim() || "Event",
    details: input.details ? String(input.details) : undefined,
    payload: input.payload,
    createdAt: new Date().toISOString(),
  };
  store.events.push(next);
  clampEvents();
  schedulePersist();
  return next;
}

export function listHistorySnapshots(accountId?: string, limit = 180): HistorySnapshot[] {
  const normalizedAccountId = normalizeAccountId(accountId);
  const max = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 1_000) : 180;
  const rows = normalizedAccountId
    ? store.snapshots.filter((row) => row.accountId === normalizedAccountId)
    : store.snapshots;
  return rows.slice(-max).reverse();
}

export function listHistoryEvents(accountId?: string, limit = 250): HistoryEvent[] {
  const normalizedAccountId = normalizeAccountId(accountId);
  const max = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 2_000) : 250;
  const rows = normalizedAccountId
    ? store.events.filter((row) => row.accountId === normalizedAccountId)
    : store.events;
  return rows.slice(-max).reverse();
}

export function getLatestSnapshot(accountId: string): HistorySnapshot | null {
  const normalizedAccountId = normalizeAccountId(accountId);
  if (!normalizedAccountId) return null;
  for (let i = store.snapshots.length - 1; i >= 0; i -= 1) {
    const row = store.snapshots[i];
    if (row.accountId === normalizedAccountId) return row;
  }
  return null;
}

export function getHistoryStateMeta(): { snapshots: number; events: number; updatedAt: string } {
  return {
    snapshots: store.snapshots.length,
    events: store.events.length,
    updatedAt: store.updatedAt,
  };
}
