import fs from "node:fs/promises";
import path from "path";
import { isCodeName } from "./utils";
import { grpcCallWithRetry } from "./grpcHelpers";

export type InstrumentCacheEntry = {
  name: string;
  ticker?: string;
  riskLevel?: string;
  instrumentType?: string;
  classCode?: string;
  sector?: string;
  countryOfRisk?: string;
  countryOfRiskName?: string;
  currency?: string;
  maturityMs?: number;
  nominal?: { units?: string | number; nano?: number; currency?: string };
};

export const instrumentCache = new Map<string, InstrumentCacheEntry>();
export const instrumentBatchCache = new Map<string, any>();
const instrumentBatchMeta = new Map<
  string,
  { updatedAt: number; lastErrorAt?: number }
>();
export const incomeCache = new Map<
  string,
  { rangeKey: string; coupons?: any[]; dividends?: any[] }
>();

const cacheContext: { endpoint?: string } = {};
const CACHE_WRITE_DEBOUNCE_MS = 250;
let instrumentPersistTimer: NodeJS.Timeout | undefined;
let incomePersistTimer: NodeJS.Timeout | undefined;
let instrumentWriteQueue = Promise.resolve();
let incomeWriteQueue = Promise.resolve();

function normalizeEndpoint(endpoint?: string): string {
  return String(endpoint || "").trim().toLowerCase();
}

function getCacheDir(): string {
  const fromEnv = String(process.env.TINVEST_CACHE_DIR || "").trim();
  return path.resolve(fromEnv || ".cache");
}

function getInstrumentsCacheFile(): string {
  return path.join(getCacheDir(), "instruments.json");
}

function getIncomeCacheFile(): string {
  return path.join(getCacheDir(), "income.json");
}

function hasEndpointMismatch(cachedEndpoint: unknown): boolean {
  const current = normalizeEndpoint(cacheContext.endpoint);
  const cached = normalizeEndpoint(typeof cachedEndpoint === "string" ? cachedEndpoint : "");
  if (!current || !cached) return false;
  return current !== cached;
}

async function loadJsonCache(filePath: string): Promise<any | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveJsonCache(filePath: string, data: any): Promise<void> {
  try {
    const cacheDir = path.dirname(filePath);
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // ignore cache write errors
  }
}

export function setCacheContext(context: { endpoint?: string }): void {
  cacheContext.endpoint = normalizeEndpoint(context.endpoint);
}

export async function hydrateCaches(): Promise<void> {
  const instrumentsData = await loadJsonCache(getInstrumentsCacheFile());
  if (instrumentsData && hasEndpointMismatch(instrumentsData.sourceEndpoint)) {
    return;
  }
  if (instrumentsData && instrumentsData.items) {
    for (const [k, v] of instrumentsData.items) {
      const rawName = typeof v?.name === "string" ? v.name.trim() : "";
      const safeName = rawName && !isCodeName(rawName) ? rawName : "";
      instrumentCache.set(k, { ...v, name: safeName });
    }
  }
  if (instrumentsData && instrumentsData.batches) {
    for (const [k, v] of instrumentsData.batches) {
      instrumentBatchCache.set(k, v);
    }
  }
  if (instrumentsData && instrumentsData.batchMeta) {
    for (const [k, v] of instrumentsData.batchMeta) {
      instrumentBatchMeta.set(k, v);
    }
  }

  const incomeData = await loadJsonCache(getIncomeCacheFile());
  if (incomeData && hasEndpointMismatch(incomeData.sourceEndpoint)) {
    return;
  }
  if (incomeData && incomeData.items) {
    for (const [k, v] of incomeData.items) {
      incomeCache.set(k, v);
    }
  }
}

function queueInstrumentCacheWrite(): void {
  if (instrumentPersistTimer) clearTimeout(instrumentPersistTimer);
  instrumentPersistTimer = setTimeout(() => {
    instrumentPersistTimer = undefined;
    const payload = {
      items: Array.from(instrumentCache.entries()),
      batches: Array.from(instrumentBatchCache.entries()),
      batchMeta: Array.from(instrumentBatchMeta.entries()),
      sourceEndpoint: normalizeEndpoint(cacheContext.endpoint) || undefined,
      updatedAt: new Date().toISOString(),
    };
    instrumentWriteQueue = instrumentWriteQueue
      .then(() => saveJsonCache(getInstrumentsCacheFile(), payload))
      .catch(() => undefined);
  }, CACHE_WRITE_DEBOUNCE_MS);
  instrumentPersistTimer.unref?.();
}

function queueIncomeCacheWrite(): void {
  if (incomePersistTimer) clearTimeout(incomePersistTimer);
  incomePersistTimer = setTimeout(() => {
    incomePersistTimer = undefined;
    const payload = {
      items: Array.from(incomeCache.entries()),
      sourceEndpoint: normalizeEndpoint(cacheContext.endpoint) || undefined,
      updatedAt: new Date().toISOString(),
    };
    incomeWriteQueue = incomeWriteQueue
      .then(() => saveJsonCache(getIncomeCacheFile(), payload))
      .catch(() => undefined);
  }, CACHE_WRITE_DEBOUNCE_MS);
  incomePersistTimer.unref?.();
}

export function persistInstrumentCaches(): void {
  queueInstrumentCacheWrite();
}

export function persistIncomeCache(): void {
  queueIncomeCacheWrite();
}

export async function flushPersistedCaches(): Promise<void> {
  if (instrumentPersistTimer) {
    clearTimeout(instrumentPersistTimer);
    instrumentPersistTimer = undefined;
    instrumentWriteQueue = instrumentWriteQueue
      .then(() =>
        saveJsonCache(getInstrumentsCacheFile(), {
          items: Array.from(instrumentCache.entries()),
          batches: Array.from(instrumentBatchCache.entries()),
          batchMeta: Array.from(instrumentBatchMeta.entries()),
          sourceEndpoint: normalizeEndpoint(cacheContext.endpoint) || undefined,
          updatedAt: new Date().toISOString(),
        })
      )
      .catch(() => undefined);
  }
  if (incomePersistTimer) {
    clearTimeout(incomePersistTimer);
    incomePersistTimer = undefined;
    incomeWriteQueue = incomeWriteQueue
      .then(() =>
        saveJsonCache(getIncomeCacheFile(), {
          items: Array.from(incomeCache.entries()),
          sourceEndpoint: normalizeEndpoint(cacheContext.endpoint) || undefined,
          updatedAt: new Date().toISOString(),
        })
      )
      .catch(() => undefined);
  }
  await Promise.all([instrumentWriteQueue, incomeWriteQueue]);
}

export function clearAllCaches(): void {
  instrumentCache.clear();
  instrumentBatchCache.clear();
  instrumentBatchMeta.clear();
  incomeCache.clear();
}

export function clearInstrumentCaches(): void {
  instrumentCache.clear();
  instrumentBatchCache.clear();
  instrumentBatchMeta.clear();
}

function buildInstrumentLookupKeys(p: any): string[] {
  const rawKeys = [
    p?.figi,
    p?.instrument_uid,
    p?.instrumentUid,
    p?.uid,
    p?.position_uid,
    p?.positionUid,
    p?.ticker,
  ];
  const unique = new Set<string>();
  for (const raw of rawKeys) {
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (!value) continue;
    unique.add(value);
  }
  return Array.from(unique);
}

function pickTicker(p: any, info?: InstrumentCacheEntry | null): string {
  const tickerCandidates = [info?.ticker, p?.ticker];
  for (const raw of tickerCandidates) {
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (value) return value;
  }
  return "";
}

export function getInstrumentInfo(p: any): InstrumentCacheEntry | null {
  const keys = buildInstrumentLookupKeys(p);
  for (const k of keys) {
    const hit = instrumentCache.get(k);
    if (hit) return hit;
  }
  return null;
}

export function getInstrumentName(p: any): string {
  const info = getInstrumentInfo(p);
  if (info?.name) return info.name;
  const ticker = pickTicker(p, info);
  if (ticker) return ticker;
  const rawNameCandidates = [p?.name, p?.instrument_name, p?.instrumentName];
  for (const rawName of rawNameCandidates) {
    if (typeof rawName !== "string") continue;
    const trimmed = rawName.trim();
    if (!trimmed) continue;
    if (!isCodeName(trimmed)) return trimmed;
  }
  const keys = buildInstrumentLookupKeys(p);
  return keys[0] || "";
}

export function getDisplayName(p: any): string {
  const name = getInstrumentName(p);
  if (!name) return "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e";
  if (!isCodeName(name)) return name;
  const ticker = pickTicker(p, getInstrumentInfo(p));
  if (ticker) return ticker;
  return "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e";
}

export function upsertInstrumentCache(instruments: any[]): number {
  let updated = 0;
  for (const instrument of instruments) {
    const figi = instrument?.figi;
    const uid = instrument?.uid;
    const positionUid = instrument?.position_uid;
    const ticker = instrument?.ticker;
    const rawName = typeof instrument?.name === "string" ? instrument.name.trim() : "";
    const safeName = rawName && !isCodeName(rawName) ? rawName : "";
    const instrumentCurrencyRaw =
      instrument?.currency ??
      instrument?.nominal?.currency ??
      instrument?.initial_nominal?.currency;
    const instrumentCurrency =
      typeof instrumentCurrencyRaw === "string" ? instrumentCurrencyRaw.toLowerCase() : undefined;
    const sectorRaw = typeof instrument?.sector === "string" ? instrument.sector.trim() : "";
    const classCodeRaw =
      typeof instrument?.class_code === "string" ? instrument.class_code.trim() : "";
    const countryOfRiskRaw =
      typeof instrument?.country_of_risk === "string" ? instrument.country_of_risk.trim() : "";
    const countryOfRiskNameRaw =
      typeof instrument?.country_of_risk_name === "string"
        ? instrument.country_of_risk_name.trim()
        : "";
    const keys = new Set<string>();
    if (figi) keys.add(figi);
    if (uid) keys.add(uid);
    if (positionUid) keys.add(positionUid);
    if (ticker) keys.add(ticker);
    for (const k of keys) {
      const existing = instrumentCache.get(k);
      instrumentCache.set(k, {
        name: safeName || existing?.name || "",
        ticker,
        riskLevel: instrument?.risk_level ?? existing?.riskLevel,
        instrumentType: instrument?.instrument_type ?? existing?.instrumentType,
        classCode: classCodeRaw || existing?.classCode,
        sector: sectorRaw || existing?.sector,
        countryOfRisk: countryOfRiskRaw || existing?.countryOfRisk,
        countryOfRiskName: countryOfRiskNameRaw || existing?.countryOfRiskName,
        currency: instrumentCurrency || existing?.currency,
        maturityMs:
          Number(instrument?.maturity_date?.seconds || 0) * 1000 ||
          existing?.maturityMs,
        nominal: instrument?.nominal || existing?.nominal,
      });
      updated++;
    }
  }
  return updated;
}

function getBatchTtlMs(): number {
  const raw = Number(process.env.TINVEST_INSTRUMENTS_CACHE_TTL_HOURS || "24");
  const hours = Number.isFinite(raw) && raw > 0 ? raw : 24;
  return hours * 60 * 60 * 1000;
}

function getBatchRetryAfterMs(): number {
  const raw = Number(process.env.TINVEST_INSTRUMENTS_CACHE_RETRY_MINUTES || "5");
  const minutes = Number.isFinite(raw) && raw > 0 ? raw : 5;
  return minutes * 60 * 1000;
}

function getMinExpectedBatchCount(kind: string): number {
  const normalized = String(kind || "").trim();
  if (normalized === "Shares") return 100;
  if (normalized === "Bonds") return 100;
  if (normalized === "Etfs") return 10;
  if (normalized === "Currencies") return 3;
  if (normalized === "Futures") return 10;
  return 0;
}

function isSuspiciousBatch(kind: string, list: unknown): boolean {
  if (!Array.isArray(list)) return false;
  const minCount = getMinExpectedBatchCount(kind);
  if (minCount <= 0) return false;
  return list.length < minCount;
}

export async function fetchInstrumentsBatch(
  instrumentsClient: any,
  metadata: any,
  kind: string,
  cacheKey: string,
  options?: { forceRefresh?: boolean; throwOnError?: boolean }
): Promise<any[]> {
  const forceRefresh = options?.forceRefresh === true;
  const ttlMs = getBatchTtlMs();
  const retryAfterMs = getBatchRetryAfterMs();
  const meta = instrumentBatchMeta.get(cacheKey);
  if (!forceRefresh) {
    if (instrumentBatchCache.has(cacheKey)) {
      const cached = instrumentBatchCache.get(cacheKey);
      if (meta?.updatedAt && meta.updatedAt > 0) {
        const isFresh = Date.now() - meta.updatedAt < ttlMs;
        if (isFresh && !isSuspiciousBatch(kind, cached)) {
          return cached;
        }
      } else if (!meta) {
        if (!isSuspiciousBatch(kind, cached)) {
          return cached;
        }
      } else if (meta?.lastErrorAt && Date.now() - meta.lastErrorAt < retryAfterMs) {
        return cached;
      }
    }
  }
  const req = { instrument_status: "INSTRUMENT_STATUS_ALL" };
  try {
    const resp: any = await grpcCallWithRetry(
      instrumentsClient[kind].bind(instrumentsClient),
      req,
      metadata,
      5
    );
    const list = Array.isArray(resp?.instruments) ? resp.instruments : [];
    instrumentBatchCache.set(cacheKey, list);
    instrumentBatchMeta.set(cacheKey, { updatedAt: Date.now() });
    persistInstrumentCaches();
    return list;
  } catch (error: any) {
    if (options?.throwOnError) {
      throw error;
    }
    // Don't fail the whole request on rate limit; keep existing cache if any.
    if (!instrumentBatchCache.has(cacheKey)) {
      instrumentBatchCache.set(cacheKey, []);
    }
    const prev = instrumentBatchMeta.get(cacheKey);
    instrumentBatchMeta.set(cacheKey, {
      updatedAt: prev?.updatedAt && prev.updatedAt > 0 ? prev.updatedAt : 0,
      lastErrorAt: Date.now(),
    });
    return instrumentBatchCache.get(cacheKey) || [];
  }
}
