import fs from "fs";
import path from "path";
import { isCodeName } from "./utils";
import { grpcCallWithRetry } from "./grpcHelpers";

export type InstrumentCacheEntry = {
  name: string;
  ticker?: string;
  riskLevel?: string;
  instrumentType?: string;
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

const CACHE_DIR = path.resolve(".cache");
const INSTRUMENTS_CACHE_FILE = path.join(CACHE_DIR, "instruments.json");
const INCOME_CACHE_FILE = path.join(CACHE_DIR, "income.json");

function loadJsonCache(filePath: string): any | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveJsonCache(filePath: string, data: any): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // ignore cache write errors
  }
}

export function hydrateCaches(): void {
  const instrumentsData = loadJsonCache(INSTRUMENTS_CACHE_FILE);
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

  const incomeData = loadJsonCache(INCOME_CACHE_FILE);
  if (incomeData && incomeData.items) {
    for (const [k, v] of incomeData.items) {
      incomeCache.set(k, v);
    }
  }
}

export function persistInstrumentCaches(): void {
  saveJsonCache(INSTRUMENTS_CACHE_FILE, {
    items: Array.from(instrumentCache.entries()),
    batches: Array.from(instrumentBatchCache.entries()),
    batchMeta: Array.from(instrumentBatchMeta.entries()),
    updatedAt: new Date().toISOString(),
  });
}

export function persistIncomeCache(): void {
  saveJsonCache(INCOME_CACHE_FILE, {
    items: Array.from(incomeCache.entries()),
    updatedAt: new Date().toISOString(),
  });
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

export function getInstrumentInfo(p: any): InstrumentCacheEntry | null {
  const keys = [p?.figi, p?.instrument_uid, p?.position_uid].filter(
    (v) => typeof v === "string" && v.length
  ) as string[];
  for (const k of keys) {
    const hit = instrumentCache.get(k);
    if (hit) return hit;
  }
  return null;
}

export function getInstrumentName(p: any): string {
  const info = getInstrumentInfo(p);
  if (info?.name) return info.name;
  const keys = [p?.figi, p?.instrument_uid, p?.position_uid].filter(
    (v) => typeof v === "string" && v.length
  ) as string[];
  return keys[0] || "";
}

export function getDisplayName(p: any): string {
  const name = getInstrumentName(p);
  if (!name) return "Название недоступно";
  return isCodeName(name) ? "Название недоступно" : name;
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

export async function fetchInstrumentsBatch(
  instrumentsClient: any,
  metadata: any,
  kind: string,
  cacheKey: string
): Promise<any[]> {
  const ttlMs = getBatchTtlMs();
  const meta = instrumentBatchMeta.get(cacheKey);
  if (instrumentBatchCache.has(cacheKey) && meta?.updatedAt) {
    if (Date.now() - meta.updatedAt < ttlMs) {
      return instrumentBatchCache.get(cacheKey);
    }
  } else if (instrumentBatchCache.has(cacheKey)) {
    return instrumentBatchCache.get(cacheKey);
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
  } catch {
    // Don't fail the whole request on rate limit; keep existing cache if any.
    if (!instrumentBatchCache.has(cacheKey)) {
      instrumentBatchCache.set(cacheKey, []);
    }
    const prev = instrumentBatchMeta.get(cacheKey);
    instrumentBatchMeta.set(cacheKey, {
      updatedAt: prev?.updatedAt || 0,
      lastErrorAt: Date.now(),
    });
    return instrumentBatchCache.get(cacheKey) || [];
  }
}
