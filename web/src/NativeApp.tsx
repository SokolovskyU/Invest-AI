import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { postJson } from "./api/client";
import {
  type AnalyticsMyAssetRow,
  useAccountsQueryWithOverride,
  useAnalyticsQueryWithOverride,
  useHistorySnapshotsQueryWithOverride,
  usePortfolioQueryWithOverride,
} from "./api/queries";

type NativeAppProps = {
  pathname: string;
  onNavigate: (path: string) => void;
};

const TOKEN_KEYS = {
  session: "tinvest_token_session",
};

const ACCOUNT_KEY = "native_account_id";
const ASSET_COLORS: Record<string, string> = {
  share: "#64b4ff",
  bond: "#64d8e4",
  etf: "#7f59ff",
  currency: "#3ed5c2",
};
const FALLBACK_ASSET_COLORS = ["#64b4ff", "#64d8e4", "#7f59ff", "#3ed5c2", "#f5a95f"];
const ASSET_RING_COLORS = [
  "#6f42d9",
  "#36c1c5",
  "#4d9de0",
  "#9a33ff",
  "#73ddd1",
  "#4ea8de",
  "#00d4aa",
  "#b68cff",
  "#4f5bd5",
  "#7bb8ff",
];
const RU_MONTH_SHORT = [
  "янв.",
  "фев.",
  "март",
  "апр.",
  "май",
  "июнь",
  "июль",
  "авг.",
  "сент.",
  "окт.",
  "нояб.",
  "дек.",
] as const;
const RU_MONTH_SHORT_PLAIN = [
  "янв",
  "фев",
  "март",
  "апр",
  "май",
  "июнь",
  "июль",
  "авг",
  "сент",
  "окт",
  "нояб",
  "дек",
] as const;
const DIVERSIFICATION_BREAKDOWN_TABS = [
  { id: "sectors", label: "Сектора" },
  { id: "classes", label: "Классы" },
  { id: "currencies", label: "Валюта" },
  { id: "regions", label: "Регионы мира" },
  { id: "countries", label: "Страны" },
] as const;
const ASSET_TYPE_LABELS_RU: Record<string, string> = {
  share: "Акции",
  bond: "Облигации",
  etf: "ETF",
  currency: "Валюта",
  futures: "Фьючерсы",
  option: "Опционы",
  other: "Прочее",
};
const COUNTRY_REGION_LABELS_RU: Record<string, string> = {
  US: "Северная Америка",
  CA: "Северная Америка",
  MX: "Северная Америка",
  GB: "Великобритания",
  DE: "Европа",
  FR: "Европа",
  IT: "Европа",
  ES: "Европа",
  NL: "Европа",
  BE: "Европа",
  LU: "Европа",
  CH: "Европа",
  AT: "Европа",
  SE: "Европа",
  NO: "Европа",
  DK: "Европа",
  FI: "Европа",
  IE: "Европа",
  PT: "Европа",
  GR: "Европа",
  CY: "Европа",
  EE: "Европа",
  LV: "Европа",
  LT: "Европа",
  PL: "Развивающаяся Европа",
  CZ: "Развивающаяся Европа",
  HU: "Развивающаяся Европа",
  RO: "Развивающаяся Европа",
  BG: "Развивающаяся Европа",
  RS: "Развивающаяся Европа",
  HR: "Развивающаяся Европа",
  SI: "Развивающаяся Европа",
  UA: "Развивающаяся Европа",
  RU: "Развивающаяся Европа",
  BY: "Развивающаяся Европа",
  KZ: "Развивающаяся Европа",
  AM: "Развивающаяся Европа",
  KG: "Развивающаяся Европа",
  TJ: "Развивающаяся Европа",
  UZ: "Развивающаяся Европа",
  AZ: "Развивающаяся Европа",
  GE: "Развивающаяся Европа",
  TR: "Развивающаяся Европа",
  AE: "Ближний Восток и Африка",
  SA: "Ближний Восток и Африка",
  IL: "Ближний Восток и Африка",
  ZA: "Ближний Восток и Африка",
  CN: "Азия",
  HK: "Азия",
  JP: "Азия",
  KR: "Азия",
  TW: "Азия",
  SG: "Азия",
  IN: "Азия",
  ID: "Азия",
  MY: "Азия",
  TH: "Азия",
  VN: "Азия",
  PH: "Азия",
  AU: "Океания",
  NZ: "Океания",
};
const LEGACY_CACHE_KEYS = {
  accounts: "home_accounts_cache_v1",
  portfolio: "home_portfolio_cache_v14",
};
const NATIVE_CACHE_KEY = "native_dashboard_cache_v1";

const ANALYTICS_TABS = [
  { id: "common", label: "Общее", icon: "◼" },
  { id: "diversification", label: "Диверсификация", icon: "◔" },
  { id: "dividends", label: "Дивиденды", icon: "◉" },
  { id: "growth", label: "Рост", icon: "◢" },
  { id: "metrics", label: "Метрики", icon: "◫" },
  { id: "report", label: "Отчет", icon: "▤" },
  { id: "bonds", label: "Облигации", icon: "◍" },
] as const;

const REPORT_DEFAULT_METRIC: ReportMetricKey = "portfolioValue";
const REPORT_TABLE_ROWS: ReportTableRow[] = [
  { kind: "metric", key: "portfolioValue", label: "Стоимость портфеля", metricType: "money", accent: "main" },
  { kind: "metric", key: "periodStart", label: "На начало периода", metricType: "money" },
  { kind: "metric", key: "periodEnd", label: "На конец периода", metricType: "money" },
  { kind: "section", label: "Комиссии" },
  { kind: "metric", key: "commissions", label: "Комиссии", metricType: "money" },
  { kind: "metric", key: "otherCosts", label: "Прочее", metricType: "money" },
  { kind: "section", label: "Доходность" },
  { kind: "metric", key: "yieldPct", label: "Доходность, %", metricType: "percent" },
  { kind: "metric", key: "yieldPp", label: "Изменение п.п.", metricType: "percent" },
  { kind: "section", label: "Оборот" },
  { kind: "metric", key: "turnover", label: "Оборот", metricType: "money" },
  { kind: "metric", key: "buyVolume", label: "Сумма покупок", metricType: "money" },
  { kind: "metric", key: "sellVolume", label: "Сумма продаж", metricType: "money" },
  { kind: "metric", key: "tradesTotal", label: "Всего сделок", metricType: "count" },
  { kind: "metric", key: "buyCount", label: "Количество покупок", metricType: "count" },
  { kind: "metric", key: "sellCount", label: "Количество продаж", metricType: "count" },
  { kind: "section", label: "Денежные средства" },
  { kind: "metric", key: "cashIn", label: "Внесено", metricType: "money" },
  { kind: "metric", key: "cashOut", label: "Выведено", metricType: "money" },
  { kind: "metric", key: "freeCash", label: "Остаток свободных средств", metricType: "money" },
  { kind: "section", label: "Динамика бенчмарка IMOEX" },
  { kind: "metric", key: "benchmarkValue", label: "Динамика бенчмарка IMOEX", metricType: "money" },
  { kind: "metric", key: "benchmarkPct", label: "Динамика бенчмарка IMOEX, %", metricType: "percent" },
];

type AnalyticsTabId = (typeof ANALYTICS_TABS)[number]["id"];
type DiversificationBreakdownTabId = (typeof DIVERSIFICATION_BREAKDOWN_TABS)[number]["id"];

const ASSET_TABLE_COLUMNS: Array<{
  key:
    | "name"
    | "quantity"
    | "invested"
    | "currentValue"
    | "passiveIncome"
    | "assetYield"
    | "profitValue"
    | "yieldPct"
    | "portfolioSharePct";
  label: string;
  textKey?: keyof AnalyticsMyAssetRow;
  help: string;
}> = [
  { key: "name", label: "Актив", help: "Название инструмента из каталога T-Invest." },
  {
    key: "quantity",
    label: "Количество",
    textKey: "quantityText",
    help: "Количество бумаг/лотов в позиции.",
  },
  {
    key: "invested",
    label: "Вложено",
    textKey: "investedText",
    help: "Средняя цена позиции × количество.",
  },
  {
    key: "currentValue",
    label: "Текущая стоимость",
    textKey: "currentValueText",
    help: "Текущая цена × количество.",
  },
  {
    key: "passiveIncome",
    label: "Дивиденды/купоны",
    textKey: "passiveIncomeText",
    help: "Сумма начисленных/полученных дивидендов и купонов по позиции.",
  },
  {
    key: "assetYield",
    label: "Доходность актива",
    textKey: "assetYieldText",
    help: "Текущая стоимость - вложено.",
  },
  {
    key: "profitValue",
    label: "Прибыль актива",
    textKey: "profitText",
    help: "Доходность актива + дивиденды/купоны.",
  },
  {
    key: "yieldPct",
    label: "Доходность, %",
    textKey: "yieldPctText",
    help: "(Прибыль актива / вложено) × 100%.",
  },
  {
    key: "portfolioSharePct",
    label: "Доля в портфеле, %",
    textKey: "portfolioSharePctText",
    help: "(Текущая стоимость актива / стоимость портфеля) × 100%.",
  },
];

type AccountLike = {
  id?: string | null;
  accountId?: string | null;
  account_id?: string | null;
  name?: string;
  type?: string;
  status?: string;
};

type NativeDashboardAccount = {
  id: string;
  name?: string;
  type?: string;
  status?: string;
};

type NativeDashboardSnapshot = {
  version: 1;
  selectedAccountId?: string;
  accounts?: NativeDashboardAccount[];
  accountsUpdatedAt?: number;
  byAccount?: Record<
    string,
    {
      updatedAt?: number;
      portfolio?: unknown;
      analytics?: unknown;
    }
  >;
};

type ReportMetricType = "money" | "percent" | "count";
type ReportMetricKey =
  | "portfolioValue"
  | "periodStart"
  | "periodEnd"
  | "commissions"
  | "otherCosts"
  | "yieldPct"
  | "yieldPp"
  | "turnover"
  | "buyVolume"
  | "sellVolume"
  | "tradesTotal"
  | "buyCount"
  | "sellCount"
  | "cashIn"
  | "cashOut"
  | "freeCash"
  | "benchmarkValue"
  | "benchmarkPct";

type ReportMonthData = {
  id: string;
  label: string;
} & Record<ReportMetricKey, number>;

type ReportTableRow =
  | { kind: "section"; label: string }
  | { kind: "metric"; key: ReportMetricKey; label: string; metricType: ReportMetricType; accent?: "main" };

function getSavedToken(): string {
  return window.sessionStorage.getItem(TOKEN_KEYS.session) || "";
}

function saveSessionToken(token: string): void {
  if (token) {
    window.sessionStorage.setItem(TOKEN_KEYS.session, token);
    return;
  }
  window.sessionStorage.removeItem(TOKEN_KEYS.session);
}

function parseNumberText(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = String(value)
    .replace(/\s+/g, "")
    .replace(",", ".")
    .replace(/[^0-9+-.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstError(...errors: Array<unknown>): string {
  for (const err of errors) {
    if (err instanceof Error && err.message) return err.message;
  }
  return "";
}

function formatRub(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalized)} ₽`;
}

function formatSignedRub(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  const sign = normalized > 0 ? "+" : normalized < 0 ? "-" : "";
  return `${sign}${formatRub(Math.abs(normalized))}`;
}

function formatPercent(value: number, signed = false): string {
  const normalized = Number.isFinite(value) ? value : 0;
  const base = `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(normalized))}%`;
  if (!signed) return normalized < 0 ? `-${base}` : base;
  const sign = normalized > 0 ? "+" : normalized < 0 ? "-" : "";
  return `${sign}${base}`;
}

function formatRubCompact(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(normalized);
  if (abs >= 1_000_000) {
    return `${new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(normalized / 1_000_000)} млн ₽`;
  }
  if (abs >= 1_000) {
    return `${new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(normalized / 1_000)}K ₽`;
  }
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(normalized)} ₽`;
}

function parseMonthYear(value: string): { month: number; year: number } | null {
  const match = /^(\d{1,2})\.(\d{4})$/.exec(String(value || "").trim());
  if (!match) return null;
  const month = Number.parseInt(match[1], 10);
  const year = Number.parseInt(match[2], 10);
  if (!Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12) return null;
  return { month, year };
}

function monthLabelShort(value: string): string {
  const parsed = parseMonthYear(value);
  if (!parsed) return String(value || "-");
  return RU_MONTH_SHORT[parsed.month - 1];
}

function monthLabelShortYear(value: string): string {
  const parsed = parseMonthYear(value);
  if (!parsed) return String(value || "-");
  return `${RU_MONTH_SHORT_PLAIN[parsed.month - 1]} ${String(parsed.year).slice(-2)}`;
}

function monthLabelGrowth(value: string): string {
  const parsed = parseMonthYear(value);
  if (!parsed) return String(value || "-");
  return `${RU_MONTH_SHORT_PLAIN[parsed.month - 1]}.`;
}

function parseDayMonthYear(value: string): { day: number; month: number; year: number } | null {
  const match = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/.exec(String(value || "").trim());
  if (!match) return null;
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  let year = Number.parseInt(match[3], 10);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  if (year < 100) {
    year += year >= 70 ? 1900 : 2000;
  }
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return { day, month, year };
}

function shortAssetLabel(value: string): string {
  const source = String(value || "").trim();
  if (!source) return "Актив";
  const tickerMatch = source.match(/\(([A-Z0-9.\-]{2,10})\)/);
  if (tickerMatch?.[1]) return tickerMatch[1].toUpperCase();
  const token = source.split(/[\s/]+/).find(Boolean) || source;
  const cleaned = token.replace(/[^A-Za-zА-Яа-я0-9.\-]/g, "");
  if (!cleaned) return "Актив";
  if (cleaned.length <= 8) return cleaned.toUpperCase();
  return cleaned.slice(0, 8).toUpperCase();
}

function toBarHeight(value: number, max: number, minPercent = 4): string {
  if (!(value > 0) || !(max > 0)) return `${minPercent}%`;
  const ratio = (value / max) * 100;
  return `${Math.max(minPercent, Math.min(100, Math.round(ratio)))}%`;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function meanValue(values: number[]): number {
  if (!values.length) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function standardDeviation(values: number[]): number {
  if (!values.length) return 0;
  const mean = meanValue(values);
  const variance =
    values.reduce((sum, value) => {
      const diff = value - mean;
      return sum + diff * diff;
    }, 0) / values.length;
  return Math.sqrt(Math.max(0, variance));
}

function scalePercent(value: number, min: number, max: number): number {
  if (!(max > min)) return 0;
  const normalized = ((value - min) / (max - min)) * 100;
  return clampNumber(normalized, 0, 100);
}

function formatRatioX(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(normalized)}x`;
}

function formatDecimal(value: number, digits = 2): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(normalized);
}

function buildLinePath(values: number[], width: number, height: number, min: number, max: number): string {
  if (!values.length) return "";
  const denominator = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / denominator) * height;
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  return `M ${points.join(" L ")}`;
}

function buildAreaPath(
  values: number[],
  width: number,
  height: number,
  min: number,
  max: number,
  baseline: number
): string {
  if (!values.length) return "";
  const denominator = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const baselineY = height - ((baseline - min) / denominator) * height;
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / denominator) * height;
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  return `M 0 ${baselineY.toFixed(2)} L ${points.join(" L ")} L ${width.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}

function formatDateShort(value: Date): string {
  const day = String(value.getDate()).padStart(2, "0");
  const month = RU_MONTH_SHORT[value.getMonth()] || "";
  const year = String(value.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

function formatAxisRub(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(normalized);
  if (abs >= 1_000_000) {
    return `${new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(normalized / 1_000_000)} млн`;
  }
  if (abs >= 1_000) {
    return `${new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(normalized / 1_000)} тыс.`;
  }
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(normalized)}`;
}

function formatReportValue(value: number, metricType: ReportMetricType): string {
  const normalized = Number.isFinite(value) ? value : 0;
  if (metricType === "percent") {
    return `${new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(normalized)}%`;
  }
  if (metricType === "count") {
    return new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(normalized);
  }
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(normalized);
}

function formatReportAxis(value: number, metricType: ReportMetricType): string {
  if (metricType === "percent") {
    return `${new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)}%`;
  }
  if (metricType === "count") {
    return new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return formatAxisRub(value);
}

function metricNumber(value: unknown, fallbackText: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return parseNumberText(String(fallbackText || "0"));
}

function formatQuantityValue(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(Number.isFinite(value) ? value : 0);
}

function resolveRegionFromCountryCode(countryCode: string): string {
  const code = String(countryCode || "").trim().toUpperCase();
  if (!code) return "";
  return COUNTRY_REGION_LABELS_RU[code] || "Другие регионы";
}

function eventTypeClass(eventType: string): string {
  const raw = String(eventType || "").toLowerCase();
  if (raw.includes("дивид")) return "dividend";
  if (raw.includes("купон")) return "coupon";
  if (raw.includes("погаш")) return "redemption";
  return "default";
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function buildArcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const sweep = endAngleDeg - startAngleDeg;
  const sweepAbs = Math.abs(sweep);
  const sweepFlag = sweep >= 0 ? 1 : 0;
  const start = polarToCartesian(cx, cy, radius, startAngleDeg);

  // SVG arc with equal start/end points cannot represent a full circle reliably.
  // For 100% segments build the ring with two half-arcs.
  if (sweepAbs >= 359.999) {
    const middleAngle = startAngleDeg + (sweep >= 0 ? 180 : -180);
    const middle = polarToCartesian(cx, cy, radius, middleAngle);
    return [
      `M ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
      `A ${radius} ${radius} 0 0 ${sweepFlag} ${middle.x.toFixed(3)} ${middle.y.toFixed(3)}`,
      `A ${radius} ${radius} 0 0 ${sweepFlag} ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
    ].join(" ");
  }

  const end = polarToCartesian(cx, cy, radius, endAngleDeg);
  const largeArcFlag = sweepAbs > 180 ? 1 : 0;
  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
}

function safeJsonRead<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeJsonWrite(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function readNativeSnapshot(): NativeDashboardSnapshot {
  const snapshot = safeJsonRead<NativeDashboardSnapshot>(NATIVE_CACHE_KEY);
  if (!snapshot || snapshot.version !== 1) {
    return { version: 1, byAccount: {} };
  }
  return {
    version: 1,
    selectedAccountId: snapshot.selectedAccountId,
    accounts: Array.isArray(snapshot.accounts) ? snapshot.accounts : [],
    accountsUpdatedAt: snapshot.accountsUpdatedAt,
    byAccount: snapshot.byAccount || {},
  };
}

function writeNativeSnapshot(snapshot: NativeDashboardSnapshot): void {
  safeJsonWrite(NATIVE_CACHE_KEY, {
    version: 1,
    selectedAccountId: snapshot.selectedAccountId,
    accounts: Array.isArray(snapshot.accounts) ? snapshot.accounts : [],
    accountsUpdatedAt: snapshot.accountsUpdatedAt,
    byAccount: snapshot.byAccount || {},
  });
}

function normalizeAccountsList(list: unknown): NativeDashboardAccount[] {
  if (!Array.isArray(list)) return [];
  const normalized: NativeDashboardAccount[] = [];
  for (const item of list) {
    const account = item as AccountLike;
    const id = extractAccountId(account);
    if (!id) continue;
    normalized.push({
      id,
      name: typeof account.name === "string" ? account.name : "Счет",
      type: typeof account.type === "string" ? account.type : "-",
      status: typeof account.status === "string" ? account.status : "-",
    });
  }
  return normalized;
}

function mapLegacyPositionRows(rows: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(rows)) return [];
  return rows.map((rowRaw) => {
    const row = rowRaw as Record<string, unknown>;
    const cost = Number(row.cost) || 0;
    const profit = Number(row.profit) || 0;
    const dayChange = Number(row.dayChange) || 0;
    const dayChangePct = Number(row.dayChangePct) || 0;
    const closePrice24h = Number(row.closePrice24h) || 0;
    const currentPriceNow = Number(row.currentPriceNow) || 0;
    return {
      name: String(row.name || "Позиция"),
      instrumentType: String(row.instrumentType || ""),
      currentPrice: formatRub(cost),
      profitRub: formatSignedRub(profit),
      profitPct: formatPercent(Number(row.profitPct) || 0, true),
      dayChangeRub: formatSignedRub(dayChange),
      dayPriceChangeRub: formatSignedRub(dayChange),
      dayChangePct: formatPercent(dayChangePct, true),
      dayClosePriceRub: closePrice24h ? formatRub(closePrice24h) : "-",
      dayLastPriceRub: currentPriceNow ? formatRub(currentPriceNow) : "-",
      dayPriceAvailable: Boolean(row.dayPriceAvailable),
    };
  });
}

function mapLegacyMonthSeries(rows: unknown): Array<{ month: string; value: number; amount: string }> {
  if (!Array.isArray(rows)) return [];
  return rows.map((rowRaw) => {
    const row = rowRaw as Record<string, unknown>;
    const value = Number(row.value) || 0;
    const month = String(row.label || row.month || "-");
    return { month, value, amount: formatRub(value) };
  });
}

function buildFallbackFromLegacyPortfolioCache(cache: unknown): {
  portfolio?: Record<string, unknown>;
  analytics?: Record<string, unknown>;
  accountId?: string;
} {
  const source = (cache || {}) as Record<string, unknown>;
  const assetRowsRaw = Array.isArray(source.assetRows) ? source.assetRows : [];
  const positionRows = mapLegacyPositionRows(source.positionRows);
  const moverRows = mapLegacyPositionRows(
    Array.isArray(source.moverRows) ? source.moverRows : source.positionRows
  );
  const hasMeaningfulData =
    assetRowsRaw.length > 0 ||
    positionRows.length > 0 ||
    moverRows.length > 0 ||
    (typeof source.portfolioTotalText === "string" && source.portfolioTotalText.trim().length > 0);
  if (!hasMeaningfulData) {
    return {};
  }

  const assetBreakdown = assetRowsRaw.map((itemRaw) => {
    const item = itemRaw as Record<string, unknown>;
    const type = String(item.type || "").toLowerCase();
    const typeLabel = String(item.name || type || "Актив");
    const value = Number(item.amount) || 0;
    const share = Number(item.share) || 0;
    return {
      type,
      typeLabel,
      value,
      valueText: formatRub(value),
      percentText: formatPercent(share),
      assets: [],
    };
  });

  const totalText =
    typeof source.portfolioTotalText === "string" && source.portfolioTotalText.trim()
      ? source.portfolioTotalText
      : formatRub(assetBreakdown.reduce((sum, row) => sum + (Number(row.value) || 0), 0));

  const profitValue = Number(source.profitTotal) || 0;
  const profitPct = Number(source.profitPct) || 0;
  const yieldPct = Number(source.yieldPct) || 0;
  const passiveIncomeTotal = Number(source.passiveIncomeTotal) || 0;
  const passiveIncomeBaseValue = Number(source.passiveIncomeBaseValue) || 0;
  const passiveIncomeYieldPct = Number(source.passiveIncomeYieldPct) || 0;
  const pb = (source.profitBreakdown || {}) as Record<string, unknown>;
  const breakdown = {
    currentValue: Number(pb.currentValue) || 0,
    currentValueRub: formatSignedRub(Number(pb.currentValue) || 0),
    tradesNet: Number(pb.tradesNet) || 0,
    tradesNetRub: formatSignedRub(Number(pb.tradesNet) || 0),
    coupons: Number(pb.coupons) || 0,
    couponsRub: formatSignedRub(Number(pb.coupons) || 0),
    dividends: Number(pb.dividends) || 0,
    dividendsRub: formatSignedRub(Number(pb.dividends) || 0),
    commissions: Number(pb.commissions) || 0,
    commissionsRub: formatSignedRub(Number(pb.commissions) || 0),
    taxes: Number(pb.taxes) || 0,
    taxesRub: formatSignedRub(Number(pb.taxes) || 0),
    marketProfitRub: "-",
    marketProfitPct: "-",
  };

  const upcomingEvents = Array.isArray(source.upcomingEvents) ? source.upcomingEvents : [];
  const incomeNext12 = mapLegacyMonthSeries(source.futureSeries);
  const incomeNext12Details = incomeNext12.map((row) => ({
    month: row.month,
    items: [],
  }));
  const receivedDividends12 = mapLegacyMonthSeries(source.dividendSeries);
  const receivedDividends12Details = receivedDividends12.map((row) => ({
    month: row.month,
    items: [],
  }));
  const accountId =
    typeof source.accountId === "string" && source.accountId.trim() ? source.accountId.trim() : "";

  return {
    accountId,
    portfolio: {
      total: totalText,
      positions: positionRows,
      moverPositions: moverRows,
    },
    analytics: {
      currency: "RUB",
      total: totalText,
      profitRub: formatSignedRub(profitValue),
      profitValue,
      profitPct: formatPercent(profitPct, true),
      profitBreakdown: breakdown,
      yieldPct: formatPercent(yieldPct),
      yieldIncomeValue: 0,
      yieldIncomeRub: formatRub(0),
      yieldBaseValue: 0,
      yieldBaseRub: formatRub(0),
      assetPie: [],
      assetBreakdown,
      myAssets: [],
      myAssetsTotals: {
        quantity: 0,
        quantityText: "0",
        invested: 0,
        investedText: formatRub(0),
        currentValue: 0,
        currentValueText: formatRub(0),
        passiveIncome: 0,
        passiveIncomeText: formatRub(0),
        assetYield: 0,
        assetYieldText: formatPercent(0),
        profitValue: 0,
        profitText: formatRub(0),
        yieldPct: 0,
        yieldPctText: formatPercent(0),
        portfolioSharePct: 0,
        portfolioSharePctText: formatPercent(0),
      },
      bondCompanies: [],
      bondCompaniesCount: "0",
      incomeNext12,
      incomeNext12Details,
      passiveIncomeTotal,
      passiveIncomeTotalRub: formatRub(passiveIncomeTotal),
      passiveIncomeBaseValue,
      passiveIncomeBaseRub: formatRub(passiveIncomeBaseValue),
      passiveIncomeYieldPct: formatPercent(passiveIncomeYieldPct),
      receivedDividends12,
      receivedDividends12Details,
      redemptionsNext12: [],
      redemptionsDetails: [],
      upcomingEvents,
    },
  };
}

function extractAccountId(account: AccountLike | null | undefined): string {
  if (!account) return "";
  const candidate = account.id || account.accountId || account.account_id || "";
  return String(candidate).trim();
}

function isAnalyticsPath(pathname: string): boolean {
  const normalized = pathname.toLowerCase();
  return normalized === "/analytics" || normalized.startsWith("/analytics/");
}

type AnalyticsCommentHintProps = {
  what: string;
  formula?: string;
};

function AnalyticsCommentHint({ what, formula }: AnalyticsCommentHintProps) {
  return (
    <span className="native-analytics-comment">
      <button
        type="button"
        className="native-analytics-comment-btn"
        aria-label="Пояснение: что это и как рассчитывается"
        title="Что это и как рассчитывается"
      >
        ?
      </button>
      <span className="native-analytics-comment-tooltip">
        <span className="native-analytics-comment-title">Что это</span>
        <span>{what}</span>
        {!!formula && (
          <>
            <span className="native-analytics-comment-title">Как считается</span>
            <span>{formula}</span>
          </>
        )}
      </span>
    </span>
  );
}

export function NativeApp({ pathname, onNavigate }: NativeAppProps) {
  const queryClient = useQueryClient();

  const [controlsOpen, setControlsOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [requestToken, setRequestToken] = useState("");
  const [accountInput, setAccountInput] = useState("");
  const [activeAccountId, setActiveAccountId] = useState("");
  const [accountsEnabled, setAccountsEnabled] = useState(false);
  const [dashboardEnabled, setDashboardEnabled] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [bootRefreshStarted, setBootRefreshStarted] = useState(false);
  const [autoLoadKey, setAutoLoadKey] = useState("");
  const [hoverDonutType, setHoverDonutType] = useState("");
  const [pinnedDonutType, setPinnedDonutType] = useState("");
  const [hoverAssetsDonutId, setHoverAssetsDonutId] = useState("");
  const [pinnedAssetsDonutId, setPinnedAssetsDonutId] = useState("");
  const [diversificationBreakdownTab, setDiversificationBreakdownTab] =
    useState<DiversificationBreakdownTabId>("sectors");
  const [hoverDiversificationRowId, setHoverDiversificationRowId] = useState("");
  const [pinnedDiversificationRowId, setPinnedDiversificationRowId] = useState("");
  const [moversVisibleUp, setMoversVisibleUp] = useState(5);
  const [moversVisibleDown, setMoversVisibleDown] = useState(5);
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTabId>("common");
  const [reportActiveMetric, setReportActiveMetric] = useState<ReportMetricKey>(REPORT_DEFAULT_METRIC);
  const [reportGrouping, setReportGrouping] = useState<"months" | "quarters">("months");
  const [reportPeriod, setReportPeriod] = useState<"1y" | "3y">("1y");
  const [assetsSortKey, setAssetsSortKey] = useState<(typeof ASSET_TABLE_COLUMNS)[number]["key"]>(
    "currentValue"
  );
  const [assetsSortDirection, setAssetsSortDirection] = useState<"asc" | "desc">("desc");

  const accountsQuery = useAccountsQueryWithOverride(requestToken, accountsEnabled);
  const portfolioQuery = usePortfolioQueryWithOverride(
    requestToken,
    activeAccountId,
    dashboardEnabled
  );
  const analyticsQuery = useAnalyticsQueryWithOverride(
    requestToken,
    activeAccountId,
    dashboardEnabled
  );
  const historySnapshotsQuery = useHistorySnapshotsQueryWithOverride(
    activeAccountId,
    dashboardEnabled
  );

  async function syncServerToken(rawToken: string): Promise<void> {
    const token = rawToken.trim();
    if (!token) {
      await postJson<{ ok: boolean }>("/api/session/logout", {});
      return;
    }
    await postJson<{ ok: boolean }, { token: string }>("/api/session/token", { token });
  }

  useEffect(() => {
    const savedToken = getSavedToken();
    const nativeSnapshot = readNativeSnapshot();
    const legacyAccountsCache = safeJsonRead<{ accounts?: unknown[]; accountId?: string }>(
      LEGACY_CACHE_KEYS.accounts
    );
    const legacyPortfolioCache = safeJsonRead<Record<string, unknown>>(LEGACY_CACHE_KEYS.portfolio);

    const accountsFromNative = normalizeAccountsList(nativeSnapshot.accounts);
    const accountsFromLegacy = normalizeAccountsList(legacyAccountsCache?.accounts);
    const hydratedAccounts = accountsFromNative.length ? accountsFromNative : accountsFromLegacy;

    if (hydratedAccounts.length) {
      queryClient.setQueryData(["accounts"], { accounts: hydratedAccounts });
    }

    const accountFromStorage = (window.localStorage.getItem(ACCOUNT_KEY) || "").trim();
    const accountFromNative = String(nativeSnapshot.selectedAccountId || "").trim();
    const accountFromLegacy = String(legacyAccountsCache?.accountId || "").trim();
    const fallbackLegacy = buildFallbackFromLegacyPortfolioCache(legacyPortfolioCache);
    const accountFromLegacyPortfolio = String(fallbackLegacy.accountId || "").trim();
    const accountFromList = hydratedAccounts[0]?.id || "";
    const resolvedAccountId =
      accountFromStorage ||
      accountFromNative ||
      accountFromLegacy ||
      accountFromLegacyPortfolio ||
      accountFromList;

    if (resolvedAccountId) {
      setAccountInput(resolvedAccountId);
      setActiveAccountId(resolvedAccountId);
      setDashboardEnabled(true);
      window.localStorage.setItem(ACCOUNT_KEY, resolvedAccountId);
    }

    const accountSnapshot = resolvedAccountId
      ? nativeSnapshot.byAccount?.[resolvedAccountId] || {}
      : {};
    const portfolioFromNative = accountSnapshot.portfolio;
    const analyticsFromNative = accountSnapshot.analytics;
    const portfolioToHydrate = portfolioFromNative || fallbackLegacy.portfolio;
    const analyticsToHydrate = analyticsFromNative || fallbackLegacy.analytics;

    if (resolvedAccountId && portfolioToHydrate) {
      queryClient.setQueryData(
        ["portfolio", resolvedAccountId],
        portfolioToHydrate as Record<string, unknown>
      );
    }
    if (resolvedAccountId && analyticsToHydrate) {
      queryClient.setQueryData(
        ["analytics", resolvedAccountId],
        analyticsToHydrate as Record<string, unknown>
      );
    }

    if (!accountsFromNative.length && hydratedAccounts.length) {
      nativeSnapshot.accounts = hydratedAccounts;
      nativeSnapshot.accountsUpdatedAt = Date.now();
    }
    if (resolvedAccountId && (!portfolioFromNative || !analyticsFromNative)) {
      nativeSnapshot.selectedAccountId = resolvedAccountId;
      nativeSnapshot.byAccount = nativeSnapshot.byAccount || {};
      nativeSnapshot.byAccount[resolvedAccountId] = {
        updatedAt: Date.now(),
        portfolio: portfolioToHydrate,
        analytics: analyticsToHydrate,
      };
    }
    writeNativeSnapshot(nativeSnapshot);

    setTokenInput(savedToken);
    setRequestToken(savedToken);
    setAccountsEnabled(true);
    saveSessionToken(savedToken);
    if (savedToken) {
      void postJson<{ ok: boolean }>("/api/session/token", { token: savedToken }).catch(() => undefined);
    }
  }, [queryClient]);

  const accountOptions = useMemo(() => {
    return (accountsQuery.data?.accounts || [])
      .map((acc) => {
        const typed = acc as AccountLike;
        return {
          id: extractAccountId(typed),
          name: String(typed.name || "Счет"),
          type: String(typed.type || "-"),
          status: String(typed.status || "-"),
        };
      })
      .filter((acc) => acc.id.length > 0);
  }, [accountsQuery.data]);

  useEffect(() => {
    if (!accountOptions.length) return;

    const typedInput = accountInput.trim();
    const cachedAccountId = (window.localStorage.getItem(ACCOUNT_KEY) || "").trim();
    const activeId = activeAccountId.trim();
    const hasKnownInput = accountOptions.some((acc) => acc.id === typedInput);
    const hasKnownActive = accountOptions.some((acc) => acc.id === activeId);
    const hasKnownCached = accountOptions.some((acc) => acc.id === cachedAccountId);

    const resolvedAccountId = hasKnownInput
      ? typedInput
      : hasKnownActive
        ? activeId
        : hasKnownCached
          ? cachedAccountId
          : accountOptions[0]?.id || "";

    if (!resolvedAccountId) return;

    if (typedInput !== resolvedAccountId) {
      setAccountInput(resolvedAccountId);
    }
    if (activeId !== resolvedAccountId) {
      setActiveAccountId(resolvedAccountId);
    }
    window.localStorage.setItem(ACCOUNT_KEY, resolvedAccountId);
    setDashboardEnabled(true);
  }, [accountOptions, accountInput, activeAccountId]);

  const historySeries = useMemo(() => {
    const rows = Array.isArray(historySnapshotsQuery.data?.items)
      ? historySnapshotsQuery.data.items
      : [];
    const byDate = new Map<
      string,
      {
        capturedAt: string;
        capturedAtMs: number;
        dateKey: string;
        totalValue: number;
        profitValue?: number;
      }
    >();

    for (const row of rows) {
      const capturedAt = String(row?.capturedAt || "").trim();
      const capturedAtMs = new Date(capturedAt).getTime();
      if (!Number.isFinite(capturedAtMs)) continue;
      const totalValue =
        Number(row?.totalValue) || parseNumberText(row?.totalText || "");
      if (!(totalValue > 0)) continue;
      const dateKey =
        String(row?.dateKey || "").trim() ||
        new Date(capturedAtMs).toISOString().slice(0, 10);
      const profitValue =
        typeof row?.profitValue === "number" && Number.isFinite(row.profitValue)
          ? row.profitValue
          : undefined;
      const prev = byDate.get(dateKey);
      if (!prev || capturedAtMs > prev.capturedAtMs) {
        byDate.set(dateKey, {
          capturedAt,
          capturedAtMs,
          dateKey,
          totalValue,
          profitValue,
        });
      }
    }

    return Array.from(byDate.values()).sort(
      (a, b) => a.capturedAtMs - b.capturedAtMs
    );
  }, [historySnapshotsQuery.data]);

  const typeRows = useMemo(() => {
    return (analyticsQuery.data?.assetBreakdown || []).map((row) => ({
      type: String(row.type || "").toLowerCase(),
      typeLabel: row.typeLabel,
      value: Number(row.value) || parseNumberText(row.valueText),
      valueText: row.valueText,
      percentText: row.percentText,
    }));
  }, [analyticsQuery.data]);

  const donutRows = useMemo(() => {
    const rows = typeRows.filter((row) => row.value > 0);
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    return rows.map((row, index) => ({
      ...row,
      color: ASSET_COLORS[row.type] || FALLBACK_ASSET_COLORS[index % FALLBACK_ASSET_COLORS.length],
      share: total > 0 ? (row.value / total) * 100 : 0,
    }));
  }, [typeRows]);

  const donutSlices = useMemo(() => {
    const total = donutRows.reduce((sum, row) => sum + row.value, 0);
    if (total <= 0) return [] as Array<(typeof donutRows)[number] & { path: string }>;

    let angle = -90;
    return donutRows.map((row) => {
      const angleSpan = (row.value / total) * 360;
      const startAngle = angle;
      const endAngle = angle + angleSpan;
      angle = endAngle;
      return {
        ...row,
        path: buildArcPath(110, 110, 74, startAngle, endAngle),
      };
    });
  }, [donutRows]);

  const activeDonutType = pinnedDonutType || hoverDonutType;
  const activeDonutRow = useMemo(
    () => donutRows.find((row) => row.type === activeDonutType) || null,
    [donutRows, activeDonutType]
  );

  useEffect(() => {
    if (pinnedDonutType && !donutRows.some((row) => row.type === pinnedDonutType)) {
      setPinnedDonutType("");
    }
    if (hoverDonutType && !donutRows.some((row) => row.type === hoverDonutType)) {
      setHoverDonutType("");
    }
  }, [donutRows, pinnedDonutType, hoverDonutType]);

  const movers = useMemo(() => {
    type MoverRow = {
      name: string;
      dayChangePct: number;
      dayChange: number;
      closePrice24h: number;
      currentPriceNow: number;
    };

    const selectMovers = (rows: Array<any>): { up: MoverRow[]; down: MoverRow[] } => {
      const sortable = rows
        .map((row) => {
          const closePrice24h = parseNumberText(row.dayClosePriceRub);
          const currentPriceNow = parseNumberText(row.dayLastPriceRub);
          const dayChangeFromPrices = currentPriceNow - closePrice24h;
          const dayChangePctFromPrices =
            closePrice24h !== 0 ? (dayChangeFromPrices / closePrice24h) * 100 : 0;

          const rowPct = parseNumberText(row.dayChangePct);
          const rowChange = parseNumberText(row.dayChangeRub || row.dayPriceChangeRub);
          const dayChangePct =
            Math.abs(rowPct) > 0.000001 ? rowPct : dayChangePctFromPrices;
          const dayChange =
            Math.abs(rowChange) > 0.000001 ? rowChange : dayChangeFromPrices;

          return {
            name: String(row.name || "Позиция"),
            dayChangePct,
            dayChange,
            closePrice24h,
            currentPriceNow,
          };
        })
        .filter((row) => Number.isFinite(row.dayChangePct) && Number.isFinite(row.dayChange));

      const byGrowth = sortable
        .slice()
        .sort((a, b) => (b.dayChangePct - a.dayChangePct) || (b.dayChange - a.dayChange));
      const byDecline = sortable
        .slice()
        .sort((a, b) => (a.dayChangePct - b.dayChangePct) || (a.dayChange - b.dayChange));

      let up = byGrowth.filter((row) => row.dayChangePct > 0 || row.dayChange > 0);
      let down = byDecline.filter((row) => row.dayChangePct < 0 || row.dayChange < 0);

      if (!up.length) up = byGrowth;
      if (!down.length) down = byDecline;

      return { up, down };
    };

    const primary = selectMovers(portfolioQuery.data?.positions || []);
    const fallback = selectMovers(portfolioQuery.data?.moverPositions || []);

    return {
      up: primary.up.length ? primary.up : fallback.up,
      down: primary.down.length ? primary.down : fallback.down,
    };
  }, [portfolioQuery.data]);

  const incomeFuture = analyticsQuery.data?.incomeNext12 || [];
  const dividendsReceived = analyticsQuery.data?.receivedDividends12 || [];
  const upcomingEvents = analyticsQuery.data?.upcomingEvents || [];
  const futureDetailsByMonth = useMemo(() => {
    const map = new Map<
      string,
      Array<{ ticker: string; eventType: string; amount: number; amountText: string }>
    >();
    const rows = analyticsQuery.data?.incomeNext12Details || [];
    for (const row of rows) {
      if (!row?.month) continue;
      map.set(row.month, Array.isArray(row.items) ? row.items : []);
    }
    return map;
  }, [analyticsQuery.data]);
  const dividendsDetailsByMonth = useMemo(() => {
    const map = new Map<
      string,
      Array<{ ticker: string; eventType: string; amount: number; amountText: string }>
    >();
    const rows = analyticsQuery.data?.receivedDividends12Details || [];
    for (const row of rows) {
      if (!row?.month) continue;
      map.set(row.month, Array.isArray(row.items) ? row.items : []);
    }
    return map;
  }, [analyticsQuery.data]);
  const passiveIncomeBreakdown = useMemo(() => {
    let coupons = 0;
    let dividends = 0;
    const rows = analyticsQuery.data?.incomeNext12Details || [];
    for (const month of rows) {
      for (const item of month?.items || []) {
        const value = Number(item.amount) || 0;
        const eventType = String(item.eventType || "").toLowerCase();
        if (eventType.includes("купон")) {
          coupons += value;
          continue;
        }
        if (eventType.includes("дивид")) {
          dividends += value;
        }
      }
    }
    return { coupons, dividends };
  }, [analyticsQuery.data]);
  const hasPassiveBreakdownDetails = useMemo(
    () =>
      (analyticsQuery.data?.incomeNext12Details || []).some(
        (month) => Array.isArray(month?.items) && month.items.length > 0
      ),
    [analyticsQuery.data]
  );

  const bondBreakdownValue = useMemo(() => {
    const rows = analyticsQuery.data?.assetBreakdown || [];
    const bondRow =
      rows.find((row) => String(row.type || "").toLowerCase() === "bond") ||
      rows.find((row) => String(row.typeLabel || "").toLowerCase().includes("облигац")) ||
      null;
    if (!bondRow) return 0;
    return Number(bondRow.value) || parseNumberText(bondRow.valueText);
  }, [analyticsQuery.data]);

  const yieldIncomeValue = useMemo(() => {
    return metricNumber(
      analyticsQuery.data?.yieldIncomeValue,
      analyticsQuery.data?.yieldIncomeRub || passiveIncomeBreakdown.coupons
    );
  }, [analyticsQuery.data, passiveIncomeBreakdown.coupons]);

  const yieldBaseValue = useMemo(() => {
    return metricNumber(
      analyticsQuery.data?.yieldBaseValue,
      analyticsQuery.data?.yieldBaseRub || bondBreakdownValue
    );
  }, [analyticsQuery.data, bondBreakdownValue]);

  const passiveIncomeTotalValue = useMemo(() => {
    return metricNumber(
      analyticsQuery.data?.passiveIncomeTotal,
      analyticsQuery.data?.passiveIncomeTotalRub || 0
    );
  }, [analyticsQuery.data]);

  const passiveIncomeBaseValue = useMemo(() => {
    return metricNumber(
      analyticsQuery.data?.passiveIncomeBaseValue,
      analyticsQuery.data?.passiveIncomeBaseRub || portfolioQuery.data?.total || 0
    );
  }, [analyticsQuery.data, portfolioQuery.data]);

  const passiveCouponsForecastValue = useMemo(() => {
    if (hasPassiveBreakdownDetails) {
      return passiveIncomeBreakdown.coupons;
    }
    return Math.min(passiveIncomeTotalValue, Math.max(0, yieldIncomeValue));
  }, [
    hasPassiveBreakdownDetails,
    passiveIncomeBreakdown.coupons,
    passiveIncomeTotalValue,
    yieldIncomeValue,
  ]);

  const passiveDividendsForecastValue = useMemo(() => {
    if (hasPassiveBreakdownDetails) {
      return passiveIncomeBreakdown.dividends;
    }
    return Math.max(0, passiveIncomeTotalValue - passiveCouponsForecastValue);
  }, [
    hasPassiveBreakdownDetails,
    passiveIncomeBreakdown.dividends,
    passiveIncomeTotalValue,
    passiveCouponsForecastValue,
  ]);

  const analyticsTotalText = analyticsQuery.data?.total || portfolioQuery.data?.total || "-";
  const analyticsCurrentValue = metricNumber(
    analyticsQuery.data?.profitBreakdown?.currentValue,
    analyticsQuery.data?.profitBreakdown?.currentValueRub || analyticsTotalText
  );
  const analyticsProfitValue = metricNumber(
    analyticsQuery.data?.profitValue,
    analyticsQuery.data?.profitRub || "0"
  );
  const analyticsInvested = Math.max(0, analyticsCurrentValue - analyticsProfitValue);
  const analyticsProfitPct = parseNumberText(analyticsQuery.data?.profitPct || "0");
  const analyticsYieldPct = parseNumberText(analyticsQuery.data?.yieldPct || "0");
  const analyticsPassivePct = parseNumberText(analyticsQuery.data?.passiveIncomeYieldPct || "0");
  const analyticsPassiveTotal = metricNumber(
    analyticsQuery.data?.passiveIncomeTotal,
    analyticsQuery.data?.passiveIncomeTotalRub || "0"
  );

  const analyticsCurrencyRow = useMemo(
    () =>
      (analyticsQuery.data?.assetBreakdown || []).find(
        (row) => String(row.type || "").toLowerCase() === "currency"
      ) || null,
    [analyticsQuery.data]
  );

  const myAssetsRows = useMemo(
    () => (Array.isArray(analyticsQuery.data?.myAssets) ? analyticsQuery.data?.myAssets : []),
    [analyticsQuery.data]
  );

  const allAssetsDonutRows = useMemo(() => {
    const rows = myAssetsRows
      .map((row, index) => {
        const value = Number(row.currentValue) || parseNumberText(row.currentValueText);
        return {
          id: row.id || `asset-${index + 1}`,
          label: String(row.name || "Актив"),
          value,
          valueText: row.currentValueText || formatRub(value),
        };
      })
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = rows.reduce((sum, row) => sum + row.value, 0);
    if (total <= 0) return [] as Array<{
      id: string;
      label: string;
      value: number;
      valueText: string;
      share: number;
      percentText: string;
      color: string;
    }>;

    return rows.map((row, index) => {
      const share = total > 0 ? (row.value / total) * 100 : 0;
      return {
        ...row,
        share,
        percentText: formatPercent(share),
        color: ASSET_RING_COLORS[index % ASSET_RING_COLORS.length],
      };
    });
  }, [myAssetsRows]);

  const allAssetsDonutSlices = useMemo(() => {
    const total = allAssetsDonutRows.reduce((sum, row) => sum + row.value, 0);
    if (total <= 0) return [] as Array<(typeof allAssetsDonutRows)[number] & { path: string }>;

    let angle = -90;
    return allAssetsDonutRows.map((row) => {
      const angleSpan = (row.value / total) * 360;
      const startAngle = angle;
      const endAngle = angle + angleSpan;
      angle = endAngle;
      return {
        ...row,
        path: buildArcPath(110, 110, 74, startAngle, endAngle),
      };
    });
  }, [allAssetsDonutRows]);

  const activeAssetsDonutId = pinnedAssetsDonutId || hoverAssetsDonutId;
  const activeAssetsDonutRow = useMemo(
    () => allAssetsDonutRows.find((row) => row.id === activeAssetsDonutId) || null,
    [allAssetsDonutRows, activeAssetsDonutId]
  );

  useEffect(() => {
    if (pinnedAssetsDonutId && !allAssetsDonutRows.some((row) => row.id === pinnedAssetsDonutId)) {
      setPinnedAssetsDonutId("");
    }
    if (hoverAssetsDonutId && !allAssetsDonutRows.some((row) => row.id === hoverAssetsDonutId)) {
      setHoverAssetsDonutId("");
    }
  }, [allAssetsDonutRows, pinnedAssetsDonutId, hoverAssetsDonutId]);

  const diversificationTabLabel = useMemo(() => {
    return (
      DIVERSIFICATION_BREAKDOWN_TABS.find((tab) => tab.id === diversificationBreakdownTab)?.label ||
      "Сектора"
    );
  }, [diversificationBreakdownTab]);

  const diversificationBreakdownRows = useMemo(() => {
    const grouped = new Map<
      string,
      { label: string; value: number; assetsCount: number; assetsByName: Map<string, number> }
    >();
    for (const row of myAssetsRows) {
      const value = Number(row.currentValue) || parseNumberText(row.currentValueText);
      if (!(value > 0)) continue;
      const assetName = String(row.name || "Актив").trim() || "Актив";

      const type = String(row.type || "").trim().toLowerCase();
      const typeLabel = ASSET_TYPE_LABELS_RU[type] || ASSET_TYPE_LABELS_RU.other;
      const countryCode = String(row.countryCode || "")
        .trim()
        .toUpperCase();
      const fallbackRegion =
        resolveRegionFromCountryCode(countryCode) ||
        (type === "currency"
          ? "Валютный рынок"
          : type === "futures" || type === "option"
            ? "Срочный рынок"
            : "Глобальный рынок");
      const fallbackCountry =
        countryCode ||
        (type === "currency"
          ? "Валютный рынок"
          : type === "futures" || type === "option"
            ? "Срочный рынок"
            : "Глобальный рынок");
      let label = typeLabel;
      if (diversificationBreakdownTab === "sectors") {
        label =
          String(row.sectorLabel || "").trim() ||
          (type === "currency" ? "Валютный рынок" : "Сектор не определен");
      } else if (diversificationBreakdownTab === "classes") {
        label = String(row.assetClassLabel || "").trim() || typeLabel;
      } else if (diversificationBreakdownTab === "currencies") {
        label = String(row.currencyCode || "").trim().toUpperCase() || "RUB";
      } else if (diversificationBreakdownTab === "regions") {
        label = String(row.regionLabel || "").trim() || fallbackRegion;
      } else if (diversificationBreakdownTab === "countries") {
        label =
          String(row.countryLabel || "").trim() ||
          fallbackCountry;
      }

      const key = label.toLowerCase();
      const prev = grouped.get(key);
      if (prev) {
        prev.value += value;
        prev.assetsCount += 1;
        prev.assetsByName.set(assetName, (prev.assetsByName.get(assetName) || 0) + value);
      } else {
        grouped.set(key, {
          label,
          value,
          assetsCount: 1,
          assetsByName: new Map([[assetName, value]]),
        });
      }
    }

    const sorted = Array.from(grouped.values()).sort((a, b) => b.value - a.value);
    const total = sorted.reduce((sum, row) => sum + row.value, 0);
    if (total <= 0) {
      return [] as Array<{
        id: string;
        label: string;
        value: number;
        valueText: string;
        share: number;
        percentText: string;
        assetsCount: number;
        assetsCountText: string;
        details: Array<{ name: string; value: number; valueText: string }>;
        color: string;
      }>;
    }

    return sorted.map((row, index) => {
      const share = (row.value / total) * 100;
      return {
        id: `${diversificationBreakdownTab}-${index + 1}`,
        label: row.label,
        value: row.value,
        valueText: formatRub(row.value),
        share,
        percentText: formatPercent(share),
        assetsCount: row.assetsCount,
        assetsCountText: `${row.assetsCount} шт.`,
        details: Array.from(row.assetsByName.entries())
          .map(([name, itemValue]) => ({
            name,
            value: itemValue,
            valueText: formatRub(itemValue),
          }))
          .sort((a, b) => b.value - a.value),
        color: ASSET_RING_COLORS[index % ASSET_RING_COLORS.length],
      };
    });
  }, [myAssetsRows, diversificationBreakdownTab]);

  const diversificationBreakdownSlices = useMemo(() => {
    const total = diversificationBreakdownRows.reduce((sum, row) => sum + row.value, 0);
    if (total <= 0) {
      return [] as Array<(typeof diversificationBreakdownRows)[number] & { path: string }>;
    }

    let angle = -90;
    return diversificationBreakdownRows.map((row) => {
      const angleSpan = (row.value / total) * 360;
      const startAngle = angle;
      const endAngle = angle + angleSpan;
      angle = endAngle;
      return {
        ...row,
        path: buildArcPath(110, 110, 74, startAngle, endAngle),
      };
    });
  }, [diversificationBreakdownRows]);

  const activeDiversificationRowId = pinnedDiversificationRowId || hoverDiversificationRowId;
  const activeDiversificationRow = useMemo(
    () =>
      diversificationBreakdownRows.find((row) => row.id === activeDiversificationRowId) || null,
    [diversificationBreakdownRows, activeDiversificationRowId]
  );
  const activeDiversificationDetails = activeDiversificationRow?.details || [];

  useEffect(() => {
    if (
      pinnedDiversificationRowId &&
      !diversificationBreakdownRows.some((row) => row.id === pinnedDiversificationRowId)
    ) {
      setPinnedDiversificationRowId("");
    }
    if (
      hoverDiversificationRowId &&
      !diversificationBreakdownRows.some((row) => row.id === hoverDiversificationRowId)
    ) {
      setHoverDiversificationRowId("");
    }
  }, [diversificationBreakdownRows, pinnedDiversificationRowId, hoverDiversificationRowId]);

  const sortedMyAssetsRows = useMemo(() => {
    const rows = myAssetsRows.slice();
    rows.sort((a, b) => {
      if (assetsSortKey === "name") {
        const byName = a.name.localeCompare(b.name, "ru", { sensitivity: "base" });
        if (byName !== 0) return assetsSortDirection === "desc" ? -byName : byName;
        return b.currentValue - a.currentValue;
      }
      const left = Number((a as Record<string, unknown>)[assetsSortKey]) || 0;
      const right = Number((b as Record<string, unknown>)[assetsSortKey]) || 0;
      if (left === right) {
        return a.name.localeCompare(b.name, "ru", { sensitivity: "base" });
      }
      return assetsSortDirection === "desc" ? right - left : left - right;
    });
    return rows;
  }, [myAssetsRows, assetsSortDirection, assetsSortKey]);

  const myAssetsTotals = useMemo(() => {
    const source = analyticsQuery.data?.myAssetsTotals;
    const totals = myAssetsRows.reduce(
      (acc, row) => {
        acc.quantity += Number(row.quantity) || 0;
        acc.invested += Number(row.invested) || 0;
        acc.currentValue += Number(row.currentValue) || 0;
        acc.passiveIncome += Number(row.passiveIncome) || 0;
        acc.assetYield += Number(row.assetYield) || 0;
        acc.profitValue += Number(row.profitValue) || 0;
        acc.portfolioSharePct += Number(row.portfolioSharePct) || 0;
        return acc;
      },
      {
        quantity: 0,
        invested: 0,
        currentValue: 0,
        passiveIncome: 0,
        assetYield: 0,
        profitValue: 0,
        portfolioSharePct: 0,
      }
    );
    const yieldPct = totals.invested !== 0 ? (totals.profitValue / totals.invested) * 100 : 0;
    return {
      quantityText: source?.quantityText || formatQuantityValue(totals.quantity),
      investedText: source?.investedText || formatRub(totals.invested),
      currentValueText: source?.currentValueText || formatRub(totals.currentValue),
      passiveIncomeText: source?.passiveIncomeText || formatRub(totals.passiveIncome),
      assetYieldText: source?.assetYieldText || formatRub(totals.assetYield),
      profitText: source?.profitText || formatRub(totals.profitValue),
      yieldPctText: source?.yieldPctText || formatPercent(yieldPct),
      portfolioSharePctText:
        source?.portfolioSharePctText || formatPercent(totals.portfolioSharePct),
    };
  }, [analyticsQuery.data, myAssetsRows]);

  const futurePreview = useMemo(() => incomeFuture.slice(-8), [incomeFuture]);
  const dividendsPreview = useMemo(() => dividendsReceived.slice(-8), [dividendsReceived]);
  const upcomingPreview = useMemo(() => upcomingEvents.slice(0, 20), [upcomingEvents]);

  const futureMax = Math.max(1, ...futurePreview.map((row) => Number(row.value || 0)));
  const dividendsMax = Math.max(1, ...dividendsPreview.map((row) => Number(row.value || 0)));

  const futureTotal = useMemo(
    () => incomeFuture.reduce((sum, row) => sum + (Number(row.value) || 0), 0),
    [incomeFuture]
  );
  const dividendsTotal = useMemo(
    () => dividendsReceived.reduce((sum, row) => sum + (Number(row.value) || 0), 0),
    [dividendsReceived]
  );
  const futureAvg = incomeFuture.length ? futureTotal / incomeFuture.length : 0;
  const dividendsAvg = dividendsReceived.length ? dividendsTotal / dividendsReceived.length : 0;
  const payoutTrendPct =
    dividendsTotal > 0 ? ((futureTotal - dividendsTotal) / dividendsTotal) * 100 : 0;

  const passiveIncomeAssets = useMemo(() => {
    const rows = myAssetsRows
      .map((row, index) => {
        const value = Number(row.passiveIncome) || parseNumberText(row.passiveIncomeText);
        const invested = Number(row.invested) || parseNumberText(row.investedText);
        const fallbackYield = Number(row.yieldPct) || parseNumberText(row.yieldPctText);
        const yieldPct = invested > 0 ? (value / invested) * 100 : fallbackYield;
        return {
          id: row.id || `passive-asset-${index + 1}`,
          label: String(row.name || "Актив"),
          shortLabel: shortAssetLabel(String(row.name || "")),
          value,
          invested,
          yieldPct: Math.max(0, yieldPct),
          valueText: row.passiveIncomeText || formatRub(value),
        };
      })
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);

    if (rows.length) {
      const total = rows.reduce((sum, row) => sum + row.value, 0);
      return rows.map((row, index) => ({
        ...row,
        payoutSharePct: total > 0 ? (row.value / total) * 100 : 0,
        color: ASSET_RING_COLORS[index % ASSET_RING_COLORS.length],
      }));
    }

    const fallbackMap = new Map<string, number>();
    for (const month of analyticsQuery.data?.incomeNext12Details || []) {
      for (const item of month.items || []) {
        const ticker = String(item.ticker || "").trim();
        const amount = Number(item.amount) || parseNumberText(item.amountText);
        if (!ticker || amount <= 0) continue;
        fallbackMap.set(ticker, (fallbackMap.get(ticker) || 0) + amount);
      }
    }
    const fallbackRows = Array.from(fallbackMap.entries())
      .map(([label, value]) => ({
        id: `passive-fallback-${label}`,
        label,
        shortLabel: shortAssetLabel(label),
        value,
        invested: 0,
        yieldPct: 0,
        valueText: formatRub(value),
      }))
      .sort((a, b) => b.value - a.value);
    const total = fallbackRows.reduce((sum, row) => sum + row.value, 0);
    return fallbackRows.map((row, index) => ({
      ...row,
      payoutSharePct: total > 0 ? (row.value / total) * 100 : 0,
      color: ASSET_RING_COLORS[index % ASSET_RING_COLORS.length],
    }));
  }, [myAssetsRows, analyticsQuery.data]);

  const passiveIncomeAssetsTop = useMemo(
    () => passiveIncomeAssets.slice(0, 6),
    [passiveIncomeAssets]
  );
  const passiveIncomeDonutRows = useMemo(
    () => passiveIncomeAssets.slice(0, 8),
    [passiveIncomeAssets]
  );
  const passiveIncomeDonutTotal = useMemo(
    () => passiveIncomeDonutRows.reduce((sum, row) => sum + row.value, 0),
    [passiveIncomeDonutRows]
  );
  const passiveIncomeDonutSlices = useMemo(() => {
    const total = passiveIncomeDonutRows.reduce((sum, row) => sum + row.value, 0);
    if (total <= 0) {
      return [] as Array<(typeof passiveIncomeDonutRows)[number] & { path: string }>;
    }

    let angle = -90;
    return passiveIncomeDonutRows.map((row) => {
      const angleSpan = (row.value / total) * 360;
      const startAngle = angle;
      const endAngle = angle + angleSpan;
      angle = endAngle;
      return {
        ...row,
        path: buildArcPath(110, 110, 72, startAngle, endAngle),
      };
    });
  }, [passiveIncomeDonutRows]);

  const dividendYieldRows = useMemo(
    () =>
      passiveIncomeAssetsTop.map((row) => ({
        ...row,
        payoutPct: Math.max(0, row.payoutSharePct),
        yieldChartPct: Math.max(0, row.yieldPct),
      })),
    [passiveIncomeAssetsTop]
  );
  const dividendYieldScaleMax = Math.max(
    1,
    ...dividendYieldRows.map((row) => Math.max(row.payoutPct, row.yieldChartPct))
  );

  const avgGrowthRows = useMemo(
    () =>
      passiveIncomeAssetsTop.map((row) => ({
        id: row.id,
        label: row.label,
        shortLabel: row.shortLabel,
        value: Math.max(0, row.yieldPct),
      })),
    [passiveIncomeAssetsTop]
  );
  const avgGrowthMax = Math.max(1, ...avgGrowthRows.map((row) => row.value));

  const futureRows12 = useMemo(() => incomeFuture.slice(0, 12), [incomeFuture]);
  const receivedRows12 = useMemo(() => dividendsReceived.slice(-12), [dividendsReceived]);
  const futureRowsMax = Math.max(1, ...futureRows12.map((row) => Number(row.value) || 0));
  const receivedRowsMax = Math.max(1, ...receivedRows12.map((row) => Number(row.value) || 0));

  const receivedByAssetRows = useMemo(() => {
    const totals = new Map<string, number>();
    for (const month of analyticsQuery.data?.receivedDividends12Details || []) {
      for (const item of month.items || []) {
        const ticker = String(item.ticker || "").trim();
        const amount = Number(item.amount) || parseNumberText(item.amountText);
        if (!ticker || amount <= 0) continue;
        totals.set(ticker, (totals.get(ticker) || 0) + amount);
      }
    }

    if (!totals.size) {
      for (const row of passiveIncomeAssets) {
        totals.set(row.shortLabel, (totals.get(row.shortLabel) || 0) + row.value);
      }
    }

    const baseRows = Array.from(totals.entries())
      .map(([label, value]) => ({
        id: label,
        label,
        shortLabel: shortAssetLabel(label),
        value,
        valueText: formatRub(value),
      }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    const total = baseRows.reduce((sum, row) => sum + row.value, 0);
    return baseRows.map((row, index) => ({
      ...row,
      sharePct: total > 0 ? (row.value / total) * 100 : 0,
      color: ASSET_RING_COLORS[index % ASSET_RING_COLORS.length],
    }));
  }, [analyticsQuery.data, passiveIncomeAssets]);
  const receivedByAssetMax = Math.max(1, ...receivedByAssetRows.map((row) => row.value));

  const dividendsGrowthComparison = useMemo(() => {
    const receivedByMonth = new Map<number, number>();
    const forecastByMonth = new Map<number, number>();
    const receivedYears: number[] = [];
    const forecastYears: number[] = [];

    for (const row of receivedRows12) {
      const value = Number(row.value) || 0;
      const parsed = parseMonthYear(row.month);
      if (!parsed) continue;
      receivedByMonth.set(parsed.month, (receivedByMonth.get(parsed.month) || 0) + value);
      receivedYears.push(parsed.year);
    }

    for (const row of futureRows12) {
      const value = Number(row.value) || 0;
      const parsed = parseMonthYear(row.month);
      if (!parsed) continue;
      forecastByMonth.set(parsed.month, (forecastByMonth.get(parsed.month) || 0) + value);
      forecastYears.push(parsed.year);
    }

    const dominantYear = (years: number[]): string => {
      if (!years.length) return "";
      const frequency = new Map<number, number>();
      for (const year of years) {
        frequency.set(year, (frequency.get(year) || 0) + 1);
      }
      let bestYear = 0;
      let bestCount = -1;
      for (const [year, count] of frequency.entries()) {
        if (count > bestCount) {
          bestYear = year;
          bestCount = count;
        }
      }
      return bestYear > 0 ? String(bestYear) : "";
    };

    let receivedYearLabel = dominantYear(receivedYears);
    let forecastYearLabel = dominantYear(forecastYears);
    if (!receivedYearLabel && forecastYearLabel) {
      const parsedYear = Number.parseInt(forecastYearLabel, 10);
      if (Number.isFinite(parsedYear)) receivedYearLabel = String(parsedYear - 1);
    }
    if (!forecastYearLabel && receivedYearLabel) {
      const parsedYear = Number.parseInt(receivedYearLabel, 10);
      if (Number.isFinite(parsedYear)) forecastYearLabel = String(parsedYear + 1);
    }

    const hasParsedMonths = receivedByMonth.size > 0 || forecastByMonth.size > 0;
    const rows = hasParsedMonths
      ? Array.from({ length: 12 }, (_, index) => {
          const monthIndex = index + 1;
          return {
            id: `growth-${monthIndex}`,
            label: `${RU_MONTH_SHORT_PLAIN[monthIndex - 1]}.`,
            received: receivedByMonth.get(monthIndex) || 0,
            forecast: forecastByMonth.get(monthIndex) || 0,
          };
        })
      : Array.from(
          { length: Math.max(receivedRows12.length, futureRows12.length, 1) },
          (_, index) => ({
            id: `growth-fallback-${index + 1}`,
            label: monthLabelGrowth(receivedRows12[index]?.month || futureRows12[index]?.month || ""),
            received: Number(receivedRows12[index]?.value) || 0,
            forecast: Number(futureRows12[index]?.value) || 0,
          })
        );

    return {
      rows,
      receivedYearLabel: receivedYearLabel || "Получено",
      forecastYearLabel: forecastYearLabel || "Прогноз",
    };
  }, [receivedRows12, futureRows12]);
  const dividendsGrowthMax = Math.max(
    1,
    ...dividendsGrowthComparison.rows.map((row) => Math.max(row.received, row.forecast))
  );

  const metricsBenchmarkPct = parseNumberText(
    analyticsQuery.data?.profitBreakdown?.marketProfitPct || "0"
  );
  const twrPortfolioPct = analyticsProfitPct;
  const twrDeltaPct = twrPortfolioPct - metricsBenchmarkPct;
  const twrDeltaLabel = twrDeltaPct >= 0 ? "выше рынка" : "ниже рынка";

  const metricDayChanges = useMemo(() => {
    const direct = (portfolioQuery.data?.positions || [])
      .map((row) => parseNumberText(row.dayChangePct))
      .filter((value) => Number.isFinite(value));
    if (direct.length) return direct;
    const fallback = [
      ...movers.up.map((row) => row.dayChangePct),
      ...movers.down.map((row) => row.dayChangePct),
    ].filter((value) => Number.isFinite(value));
    return fallback;
  }, [portfolioQuery.data, movers]);

  const metricsDailyVolatility = standardDeviation(metricDayChanges);
  const metricsAnnualVolatility = Math.max(
    1,
    metricsDailyVolatility > 0 ? metricsDailyVolatility * Math.sqrt(252) : 16
  );
  const metricsMarketVolatility = clampNumber(
    metricsAnnualVolatility > 0 ? metricsAnnualVolatility * 1.35 : 22,
    12,
    45
  );
  const metricsBeta = clampNumber(
    metricsMarketVolatility > 0 ? metricsAnnualVolatility / metricsMarketVolatility : 0.7,
    0,
    1.6
  );
  const betaTone =
    metricsBeta < 0.7 ? "good" : metricsBeta <= 1.1 ? "neutral" : "warn";
  const betaText =
    metricsBeta < 0.7 ? "сильно ниже рынка" : metricsBeta <= 1.1 ? "сопоставима с рынком" : "выше рынка";

  const earningsYieldProxy = clampNumber(
    analyticsYieldPct > 0 ? analyticsYieldPct : analyticsPassivePct > 0 ? analyticsPassivePct : 2.5,
    0.35,
    25
  );
  const metricsPeRatio = clampNumber(100 / earningsYieldProxy, 0, 70);
  const metricsPeLeft = scalePercent(metricsPeRatio, 0, 70);

  const metricsRiskFreeRate = 7;
  const metricsReturnProxy = clampNumber(twrPortfolioPct, -60, 120);
  const sharpeRaw =
    (metricsReturnProxy - metricsRiskFreeRate) / Math.max(8, metricsAnnualVolatility);
  const metricsSharpe = clampNumber(sharpeRaw, -1.5, 3.5);
  const metricsBenchmarkSharpe = clampNumber(
    (metricsBenchmarkPct - metricsRiskFreeRate) / Math.max(8, metricsMarketVolatility),
    -1.5,
    3.5
  );
  const sharpeTone =
    metricsSharpe >= 1 ? "good" : metricsSharpe >= 0.5 ? "neutral" : "warn";
  const sharpeText =
    metricsSharpe >= 1
      ? "сбалансировано"
      : metricsSharpe >= 0.5
        ? "приемлемо"
        : "требует внимания";

  const downsideSeries = metricDayChanges.filter((value) => value < 0);
  const downsideDailyVolatility = downsideSeries.length
    ? Math.sqrt(
        downsideSeries.reduce((sum, value) => sum + value * value, 0) / downsideSeries.length
      )
    : metricsDailyVolatility * 0.72;
  const downsideAnnualVolatility = Math.max(
    1,
    downsideDailyVolatility > 0 ? downsideDailyVolatility * Math.sqrt(252) : 11
  );
  const sortinoRaw =
    (metricsReturnProxy - metricsRiskFreeRate) / Math.max(6, downsideAnnualVolatility);
  const metricsSortino = clampNumber(sortinoRaw, -1.5, 4.5);
  const metricsBenchmarkSortino = clampNumber(
    (metricsBenchmarkPct - metricsRiskFreeRate) / Math.max(6, downsideAnnualVolatility * 1.15),
    -1.5,
    4.5
  );
  const sortinoTone =
    metricsSortino >= 2 ? "good" : metricsSortino >= 1 ? "neutral" : "warn";
  const sortinoText =
    metricsSortino >= 2
      ? "хорошее соотношение"
      : metricsSortino >= 1
        ? "среднее соотношение"
        : "требует внимания";

  const metricsBetaLeft = scalePercent(metricsBeta, 0, 1.6);
  const metricsMarketBetaLeft = scalePercent(1, 0, 1.6);
  const metricsSharpeLeft = scalePercent(metricsSharpe, -1, 2.5);
  const metricsBenchmarkSharpeLeft = scalePercent(metricsBenchmarkSharpe, -1, 2.5);
  const metricsSortinoLeft = scalePercent(metricsSortino, -1, 3.5);
  const metricsBenchmarkSortinoLeft = scalePercent(metricsBenchmarkSortino, -1, 3.5);

  const portfolioTotalValue = parseNumberText(portfolioQuery.data?.total || "");
  const investedTotal = analyticsQuery.data
    ? analyticsInvested
    : Math.max(0, portfolioTotalValue);

  const growthRangeOptions = ["7д", "1м", "3м", "6м", "YTD", "1г", "5л", "все"];

  const growthValueChart = useMemo(() => {
    const width = 1120;
    const height = 300;
    const maxPoints = 52;
    const now = new Date();
    const targetPortfolio = analyticsCurrentValue > 0 ? analyticsCurrentValue : 1;
    const targetInvested = investedTotal > 0 ? investedTotal : targetPortfolio;

    let datePoints: Date[] = [];
    let portfolioSeries: number[] = [];
    let investedSeries: number[] = [];

    if (historySeries.length >= 2) {
      const sampled =
        historySeries.length <= maxPoints
          ? historySeries
          : Array.from({ length: maxPoints }, (_, index) => {
              const sourceIndex = Math.round(
                (index / Math.max(1, maxPoints - 1)) * (historySeries.length - 1)
              );
              return historySeries[sourceIndex];
            });

      datePoints = sampled.map((row) => new Date(row.capturedAtMs));
      portfolioSeries = sampled.map((row) => Math.max(1, row.totalValue));
      let lastInvested = Math.max(
        1,
        targetInvested > 0 ? targetInvested : portfolioSeries[0]
      );
      investedSeries = sampled.map((row) => {
        const fromProfit =
          typeof row.profitValue === "number"
            ? Math.max(0, row.totalValue - row.profitValue)
            : Number.NaN;
        if (Number.isFinite(fromProfit) && fromProfit > 0) {
          lastInvested = fromProfit;
        }
        return Math.max(1, lastInvested);
      });
    } else {
      const pointsCount = maxPoints;
      const start = new Date(now);
      start.setDate(start.getDate() - (pointsCount - 1) * 7);
      datePoints = Array.from({ length: pointsCount }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index * 7);
        return date;
      });

      const startPortfolio = Math.max(
        1,
        targetInvested > 0 ? targetInvested : targetPortfolio * 0.88
      );
      const endPortfolio = Math.max(1, targetPortfolio);
      const portfolioGrowth = endPortfolio / Math.max(1, startPortfolio);
      portfolioSeries = datePoints.map((_, index) => {
        const ratio = pointsCount > 1 ? index / (pointsCount - 1) : 0;
        return startPortfolio * Math.pow(portfolioGrowth, ratio);
      });

      const startInvested = Math.max(1, targetInvested * 0.92);
      investedSeries = datePoints.map((_, index) => {
        const ratio = pointsCount > 1 ? index / (pointsCount - 1) : 0;
        return startInvested + (targetInvested - startInvested) * ratio;
      });
    }

    const pointsCount = Math.max(1, portfolioSeries.length);
    const benchmarkStart = Math.max(1, portfolioSeries[0] || targetPortfolio);
    const benchmarkReturnFactor = Math.max(0.2, 1 + metricsBenchmarkPct / 100);
    const benchmarkSeries = portfolioSeries.map((_, index) => {
      const ratio = pointsCount > 1 ? index / (pointsCount - 1) : 0;
      return benchmarkStart * Math.pow(benchmarkReturnFactor, ratio);
    });

    const allValues = [...portfolioSeries, ...benchmarkSeries, ...investedSeries];
    const minValue = Math.min(...allValues) * 0.96;
    const maxValue = Math.max(...allValues) * 1.04;

    const portfolioPath = buildLinePath(portfolioSeries, width, height, minValue, maxValue);
    const benchmarkPath = buildLinePath(benchmarkSeries, width, height, minValue, maxValue);
    const investedPath = buildLinePath(investedSeries, width, height, minValue, maxValue);
    const portfolioAreaPath = buildAreaPath(
      portfolioSeries,
      width,
      height,
      minValue,
      maxValue,
      minValue
    );

    const yTicks = Array.from({ length: 5 }, (_, index) => {
      const ratio = index / 4;
      const value = maxValue - (maxValue - minValue) * ratio;
      return {
        value,
        y: height * ratio,
      };
    });

    const monthTicks: Array<{ index: number; label: string }> = [];
    let previousMonthKey = "";
    for (let index = 0; index < datePoints.length; index += 1) {
      const date = datePoints[index];
      const monthKey = `${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
      if (monthKey === previousMonthKey) continue;
      previousMonthKey = monthKey;
      monthTicks.push({
        index,
        label: monthLabelShortYear(monthKey),
      });
    }
    if (monthTicks[monthTicks.length - 1]?.index !== pointsCount - 1) {
      const lastDate = datePoints[datePoints.length - 1];
      const lastKey = `${String(lastDate.getMonth() + 1).padStart(2, "0")}.${lastDate.getFullYear()}`;
      monthTicks.push({ index: pointsCount - 1, label: monthLabelShortYear(lastKey) });
    }

    const rangeLabel = `${formatDateShort(datePoints[0])} - ${formatDateShort(datePoints[datePoints.length - 1])}`;
    const portfolioDelta = portfolioSeries[portfolioSeries.length - 1] - portfolioSeries[0];
    const benchmarkDelta = benchmarkSeries[benchmarkSeries.length - 1] - benchmarkSeries[0];
    const benchmarkGap = portfolioSeries[portfolioSeries.length - 1] - benchmarkSeries[benchmarkSeries.length - 1];
    const benchmarkGapPct =
      benchmarkSeries[benchmarkSeries.length - 1] > 0
        ? (benchmarkGap / benchmarkSeries[benchmarkSeries.length - 1]) * 100
        : 0;

    return {
      width,
      height,
      pointsCount,
      datePoints,
      portfolioSeries,
      benchmarkSeries,
      investedSeries,
      portfolioPath,
      benchmarkPath,
      investedPath,
      portfolioAreaPath,
      yTicks,
      monthTicks,
      rangeLabel,
      portfolioDelta,
      benchmarkDelta,
      benchmarkGap,
      benchmarkGapPct,
    };
  }, [
    analyticsCurrentValue,
    historySeries,
    investedTotal,
    metricsBenchmarkPct,
  ]);

  const growthProfitChart = useMemo(() => {
    const width = growthValueChart.width;
    const height = 300;
    const pointsCount = growthValueChart.pointsCount;
    const baseSeries = growthValueChart.portfolioSeries.map(
      (value, index) => value - growthValueChart.investedSeries[index]
    );
    const targetProfit = Number.isFinite(analyticsProfitValue)
      ? analyticsProfitValue
      : baseSeries[baseSeries.length - 1];
    const diff = targetProfit - baseSeries[baseSeries.length - 1];
    const profitSeries = baseSeries.map((value, index) => {
      const ratio = pointsCount > 1 ? index / (pointsCount - 1) : 0;
      return value + diff * ratio;
    });
    const minValue = Math.min(0, ...profitSeries);
    const maxValue = Math.max(0, ...profitSeries);
    const pad = Math.max(15_000, (maxValue - minValue) * 0.12);
    const chartMin = minValue - pad;
    const chartMax = maxValue + pad;

    const linePath = buildLinePath(profitSeries, width, height, chartMin, chartMax);
    const areaPath = buildAreaPath(profitSeries, width, height, chartMin, chartMax, 0);
    const zeroY = height - ((0 - chartMin) / (chartMax - chartMin || 1)) * height;

    const yTicks = Array.from({ length: 6 }, (_, index) => {
      const ratio = index / 5;
      const value = chartMax - (chartMax - chartMin) * ratio;
      return {
        value,
        y: height * ratio,
      };
    });

    const chartDelta = profitSeries[profitSeries.length - 1] - profitSeries[0];
    const pctBase = Math.max(1, growthValueChart.investedSeries[growthValueChart.investedSeries.length - 1]);
    const chartDeltaPct = (chartDelta / pctBase) * 100;

    return {
      width,
      height,
      pointsCount,
      linePath,
      areaPath,
      zeroY,
      yTicks,
      monthTicks: growthValueChart.monthTicks,
      rangeLabel: growthValueChart.rangeLabel,
      chartDelta,
      chartDeltaPct,
    };
  }, [growthValueChart, analyticsProfitValue]);

  const growthMonthlyBars = useMemo(() => {
    const points = growthValueChart.portfolioSeries;
    const dates = growthValueChart.datePoints;
    if (points.length < 2 || dates.length !== points.length) {
      return [] as Array<{ id: string; label: string; value: number }>;
    }

    const monthLastValues = new Map<string, { value: number; dateMs: number }>();
    for (let index = 0; index < points.length; index += 1) {
      const date = dates[index];
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const dateMs = date.getTime();
      const prev = monthLastValues.get(key);
      if (!prev || dateMs >= prev.dateMs) {
        monthLastValues.set(key, { value: points[index], dateMs });
      }
    }

    const monthEntries = Array.from(monthLastValues.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    if (monthEntries.length < 2) {
      return [] as Array<{ id: string; label: string; value: number }>;
    }

    const tail = monthEntries.slice(-13);
    const bars: Array<{ id: string; label: string; value: number }> = [];
    for (let index = 1; index < tail.length; index += 1) {
      const [monthKey, current] = tail[index];
      const [, previous] = tail[index - 1];
      const rawPct =
        previous.value > 0 ? ((current.value - previous.value) / previous.value) * 100 : 0;
      const [year, month] = monthKey.split("-");
      bars.push({
        id: `growth-month-${year}-${month}`,
        label: monthLabelShortYear(`${month}.${year}`),
        value: clampNumber(rawPct, -30, 30),
      });
    }
    return bars.slice(-12);
  }, [growthValueChart]);

  const growthMonthlyMaxAbs = Math.max(1, ...growthMonthlyBars.map((row) => Math.abs(row.value)));

  const growthAssetRows = useMemo(() => {
    const rows = myAssetsRows
      .map((row, index) => {
        const rawYield = Number(row.yieldPct) || parseNumberText(row.yieldPctText);
        const fallbackYield =
          (Number(row.profitValue) || parseNumberText(row.profitText)) /
          Math.max(1, Number(row.invested) || parseNumberText(row.investedText)) *
          100;
        const yieldPct = Number.isFinite(rawYield) && Math.abs(rawYield) > 0.0001 ? rawYield : fallbackYield;
        return {
          id: row.id || `growth-asset-${index + 1}`,
          label: shortAssetLabel(String(row.name || "Актив")),
          value: clampNumber(yieldPct, -90, 90),
        };
      })
      .filter((row) => Number.isFinite(row.value));
    return rows.sort((a, b) => b.value - a.value).slice(0, 10);
  }, [myAssetsRows]);

  const growthAssetMaxAbs = Math.max(1, ...growthAssetRows.map((row) => Math.abs(row.value)));
  const growthAssetAxisTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

  const bondsAllocationRows = useMemo(() => {
    const apiRows = (analyticsQuery.data?.bondCompanies || [])
      .map((row, index) => {
        const value = Number(row.value) || parseNumberText(row.valueText);
        return {
          id: `bond-company-${index + 1}`,
          name: String(row.name || "Облигация"),
          value,
          valueText: row.valueText || formatRub(value),
        };
      })
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);

    const assetRows = myAssetsRows
      .filter((row) => String(row.type || "").toLowerCase() === "bond")
      .map((row, index) => {
        const value = Number(row.currentValue) || parseNumberText(row.currentValueText);
        return {
          id: row.id || `bond-asset-${index + 1}`,
          name: String(row.name || "Облигация"),
          value,
          valueText: row.currentValueText || formatRub(value),
        };
      })
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);

    const sourceRows = apiRows.length ? apiRows : assetRows;
    const topRows = sourceRows.slice(0, 6);
    const total = topRows.reduce((sum, row) => sum + row.value, 0);
    const palette = ["#7a3ff0", "#9158ff", "#a870ff", "#6230cc", "#bb8bff", "#6f42d9"];

    return topRows.map((row, index) => ({
      ...row,
      shortName: shortAssetLabel(row.name),
      sharePct: total > 0 ? (row.value / total) * 100 : 0,
      color: palette[index % palette.length],
    }));
  }, [analyticsQuery.data, myAssetsRows]);

  const bondCompaniesRows = useMemo(() => {
    return (analyticsQuery.data?.bondCompanies || [])
      .map((row, index) => ({
        id: `bond-company-row-${index + 1}`,
        name: String(row.name || "Компания"),
        valueText: row.valueText || "-",
        percentText: row.percentText || "-",
      }))
      .filter((row) => row.name);
  }, [analyticsQuery.data]);

  const bondsAllocationTotal = useMemo(
    () => bondsAllocationRows.reduce((sum, row) => sum + row.value, 0),
    [bondsAllocationRows]
  );

  const bondsAllocationSlices = useMemo(() => {
    if (!bondsAllocationRows.length || bondsAllocationTotal <= 0) {
      return [] as Array<(typeof bondsAllocationRows)[number] & { path: string }>;
    }

    let angle = -90;
    return bondsAllocationRows.map((row) => {
      const span = (row.value / bondsAllocationTotal) * 360;
      const start = angle;
      const end = angle + span;
      angle = end;
      return {
        ...row,
        path: buildArcPath(120, 120, 90, start, end),
      };
    });
  }, [bondsAllocationRows, bondsAllocationTotal]);

  const bondsMaturityRows = useMemo(() => {
    const rows: Array<{
      id: string;
      name: string;
      shortName: string;
      amount: number;
      amountText: string;
      month: number;
      year: number;
    }> = [];

    for (const [index, row] of (analyticsQuery.data?.redemptionsDetails || []).entries()) {
      const name = String(row.name || "").trim() || `Облигация ${index + 1}`;
      const amount = Math.max(0, parseNumberText(row.amount));
      const parsedMonth = parseMonthYear(String(row.month || ""));
      const parsedNameDate = parseDayMonthYear(name);
      const month = parsedMonth?.month || parsedNameDate?.month;
      const year = parsedMonth?.year || parsedNameDate?.year;
      if (!month || !year) continue;
      rows.push({
        id: `bond-redemption-${index + 1}`,
        name,
        shortName: shortAssetLabel(name),
        amount: amount > 0 ? amount : 1,
        amountText: row.amount || formatRub(amount || 0),
        month,
        year,
      });
    }

    if (!rows.length) {
      for (const [index, row] of (analyticsQuery.data?.redemptionsNext12 || []).entries()) {
        const amount = Number(row.value) || parseNumberText(row.amount);
        if (!(amount > 0)) continue;
        const parsed = parseMonthYear(String(row.month || ""));
        if (!parsed) continue;
        rows.push({
          id: `bond-redemption-month-${index + 1}`,
          name: `Погашения ${row.month}`,
          shortName: monthLabelGrowth(String(row.month || "")),
          amount,
          amountText: row.amount || formatRub(amount),
          month: parsed.month,
          year: parsed.year,
        });
      }
    }

    return rows.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.month !== b.month) return a.month - b.month;
      return b.amount - a.amount;
    });
  }, [analyticsQuery.data]);

  const bondsTimeline = useMemo(() => {
    const now = new Date();
    const axisStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthDiff = (from: Date, to: Date): number =>
      (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());

    let axisEnd = new Date(axisStart.getFullYear(), axisStart.getMonth() + 6, 1);
    for (const row of bondsMaturityRows) {
      const maturityDate = new Date(row.year, row.month - 1, 1);
      if (maturityDate > axisEnd) axisEnd = maturityDate;
    }
    const monthsCount = Math.max(7, Math.min(12, monthDiff(axisStart, axisEnd) + 1));

    const months = Array.from({ length: monthsCount }, (_, index) => {
      const date = new Date(axisStart.getFullYear(), axisStart.getMonth() + index, 1);
      const monthShort = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return {
        id: `bond-axis-${index + 1}`,
        key: `${year}-${month}`,
        label: `${monthShort} '${String(year).slice(-2)}`,
      };
    });

    const indexByMonth = new Map(months.map((month, index) => [month.key, index] as const));

    const rows = bondsMaturityRows.slice(0, 6).map((row, index) => {
      const key = `${row.year}-${String(row.month).padStart(2, "0")}`;
      const mappedIndex = indexByMonth.get(key);
      const endIndexRaw = typeof mappedIndex === "number" ? mappedIndex : months.length - 1;
      const endIndex = clampNumber(endIndexRaw, 0, months.length - 1);
      const widthPct = ((endIndex + 1) / months.length) * 100;
      return {
        ...row,
        rowId: `bond-timeline-${index + 1}`,
        endIndex,
        leftPct: 0,
        widthPct,
        offerPct: 0,
      };
    });

    return {
      months,
      rows,
    };
  }, [bondsMaturityRows]);

  const bondsMaturityMonthsAvg = bondsTimeline.rows.length
    ? meanValue(bondsTimeline.rows.map((row) => row.endIndex + 1))
    : 7;

  const bondsMetrics = useMemo(() => {
    const couponYieldFromBase =
      yieldBaseValue > 0 ? (yieldIncomeValue / yieldBaseValue) * 100 : 0;
    const currentYield = clampNumber(
      analyticsYieldPct > 0.0001 ? analyticsYieldPct : couponYieldFromBase,
      0,
      40
    );
    const dealsYield = clampNumber(
      analyticsPassivePct > 0.0001 ? analyticsPassivePct : currentYield,
      0,
      40
    );
    const durationRisk = clampNumber(bondsMaturityMonthsAvg / 12, 0.1, 10);
    const termPremium = durationRisk * 0.25;
    const yieldToMaturity = clampNumber(currentYield + termPremium, 0, 45);
    const effectiveYield = clampNumber(yieldToMaturity, 0, 45);
    const effectiveDealsYield = clampNumber(dealsYield, 0, 45);
    return {
      currentYield,
      yieldToMaturity,
      dealsYield,
      effectiveYield,
      effectiveDealsYield,
      durationRisk,
    };
  }, [
    analyticsYieldPct,
    analyticsPassivePct,
    bondsMaturityMonthsAvg,
    yieldIncomeValue,
    yieldBaseValue,
  ]);

  const reportMonthsData = useMemo(() => {
    const monthsCount = reportPeriod === "3y" ? 36 : 12;
    const portfolioSeries = growthValueChart.portfolioSeries;
    const benchmarkSeries = growthValueChart.benchmarkSeries;
    const investedSeries = growthValueChart.investedSeries;
    const datePoints = growthValueChart.datePoints;
    if (
      !portfolioSeries.length ||
      !benchmarkSeries.length ||
      !investedSeries.length ||
      datePoints.length !== portfolioSeries.length
    ) {
      return [] as ReportMonthData[];
    }

    const monthEndPoints = new Map<
      string,
      { date: Date; portfolio: number; benchmark: number; invested: number }
    >();
    for (let index = 0; index < datePoints.length; index += 1) {
      const date = datePoints[index];
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const prev = monthEndPoints.get(key);
      if (!prev || date.getTime() >= prev.date.getTime()) {
        monthEndPoints.set(key, {
          date,
          portfolio: portfolioSeries[index],
          benchmark: benchmarkSeries[index],
          invested: investedSeries[index],
        });
      }
    }

    const monthPoints = Array.from(monthEndPoints.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => {
        const [year, month] = key.split("-");
        return {
          date: value.date,
          label: monthLabelShortYear(`${month}.${year}`),
          portfolio: value.portfolio,
          benchmark: value.benchmark,
          invested: value.invested,
        };
      })
      .slice(-monthsCount);

    const sampled: Array<{
      label: string;
      portfolio: number;
      benchmark: number;
      invested: number;
    }> = [];

    if (reportGrouping === "quarters") {
      for (let index = 0; index < monthPoints.length; index += 3) {
        const chunk = monthPoints.slice(index, index + 3);
        if (!chunk.length) continue;
        const tail = chunk[chunk.length - 1];
        const quarter = Math.floor(tail.date.getMonth() / 3) + 1;
        sampled.push({
          label: `Q${quarter} ${String(tail.date.getFullYear()).slice(-2)}`,
          portfolio: tail.portfolio,
          benchmark: tail.benchmark,
          invested: tail.invested,
        });
      }
    } else {
      sampled.push(...monthPoints);
    }

    if (!sampled.length) {
      return [] as ReportMonthData[];
    }
    let prevYield = 0;
    let freeCash = Math.max(0, sampled[0]?.portfolio * 0.05 || 0);

    return sampled.map((point, index) => {
      const prevPoint = index > 0 ? sampled[index - 1] : point;
      const startValue = prevPoint.portfolio;
      const endValue = point.portfolio;
      const investedChange = point.invested - prevPoint.invested;
      const periodProfit = endValue - startValue - investedChange;
      const turnover = Math.max(0, Math.abs(endValue - startValue) + Math.abs(investedChange));
      const buyVolume =
        investedChange > 0
          ? investedChange + Math.max(0, periodProfit)
          : Math.max(0, periodProfit);
      const sellVolume = Math.max(0, turnover - buyVolume);
      const tradesTotal = Math.max(0, Math.round((turnover / Math.max(1, startValue)) * 120));
      const buyCount = Math.round(tradesTotal * 0.52);
      const sellCount = Math.max(0, tradesTotal - buyCount);
      const commissions = -turnover * 0.0003;
      const otherCosts = -Math.abs(periodProfit) * 0.0005;
      const yieldPct = startValue > 0 ? (periodProfit / startValue) * 100 : 0;
      const yieldPp = index === 0 ? yieldPct : yieldPct - prevYield;
      prevYield = yieldPct;
      const cashIn = Math.max(0, investedChange);
      const cashOut = Math.max(0, -investedChange);
      freeCash = Math.max(0, freeCash + cashIn - cashOut + commissions + otherCosts);
      const benchmarkValue = point.benchmark;
      const benchmarkPct = prevPoint.benchmark > 0
        ? ((point.benchmark - prevPoint.benchmark) / prevPoint.benchmark) * 100
        : 0;

      return {
        id: `report-month-${index + 1}`,
        label: point.label,
        portfolioValue: endValue,
        periodStart: startValue,
        periodEnd: endValue,
        commissions,
        otherCosts,
        yieldPct,
        yieldPp,
        turnover,
        buyVolume,
        sellVolume,
        tradesTotal,
        buyCount,
        sellCount,
        cashIn,
        cashOut,
        freeCash,
        benchmarkValue,
        benchmarkPct,
      };
    });
  }, [growthValueChart, reportGrouping, reportPeriod]);

  const reportMetricMeta = useMemo(() => {
    const map = new Map<ReportMetricKey, { label: string; metricType: ReportMetricType }>();
    for (const row of REPORT_TABLE_ROWS) {
      if (row.kind !== "metric") continue;
      map.set(row.key, { label: row.label, metricType: row.metricType });
    }
    return map;
  }, []);

  const reportActiveMeta = reportMetricMeta.get(reportActiveMetric) || {
    label: "Стоимость портфеля",
    metricType: "money" as ReportMetricType,
  };

  const reportChart = useMemo(() => {
    const width = 1120;
    const height = 250;
    const values = reportMonthsData.map((month) => month[reportActiveMetric]);
    const hasNegative = values.some((value) => value < 0);
    const minValue = hasNegative ? Math.min(...values, 0) : 0;
    const maxValue = Math.max(...values, 1);
    const range = maxValue - minValue || 1;
    const topPad = range * 0.12;
    const chartMin = minValue - (hasNegative ? topPad * 0.35 : 0);
    const chartMax = maxValue + topPad;
    const denominator = chartMax - chartMin || 1;
    const zeroY = height - ((0 - chartMin) / denominator) * height;

    const bars = values.map((value, index) => {
      const x = (index / Math.max(1, values.length)) * width + 8;
      const barWidth = width / Math.max(1, values.length) - 16;
      if (value >= 0) {
        const topY = height - ((value - chartMin) / denominator) * height;
        return {
          index,
          value,
          x,
          y: topY,
          width: Math.max(18, barWidth),
          height: Math.max(2, zeroY - topY),
          positive: true,
          labelX: x + Math.max(18, barWidth) / 2,
        };
      }
      const bottomY = height - ((value - chartMin) / denominator) * height;
      return {
        index,
        value,
        x,
        y: zeroY,
        width: Math.max(18, barWidth),
        height: Math.max(2, bottomY - zeroY),
        positive: false,
        labelX: x + Math.max(18, barWidth) / 2,
      };
    });

    const yTicks = Array.from({ length: 6 }, (_, index) => {
      const ratio = index / 5;
      const value = chartMax - (chartMax - chartMin) * ratio;
      return {
        y: ratio * height,
        value,
      };
    });

    return {
      width,
      height,
      bars,
      yTicks,
      zeroY,
      hasNegative,
      rangeLabel: reportMonthsData.length
        ? `${reportMonthsData[0].label} - ${reportMonthsData[reportMonthsData.length - 1].label}`
        : "",
    };
  }, [reportMonthsData, reportActiveMetric]);

  const reportSummaryValue = reportMonthsData.length
    ? reportMonthsData[reportMonthsData.length - 1][reportActiveMetric]
    : 0;

  const moversUpVisible = movers.up.slice(0, moversVisibleUp);
  const moversDownVisible = movers.down.slice(0, moversVisibleDown);

  useEffect(() => {
    setMoversVisibleUp(5);
    setMoversVisibleDown(5);
  }, [activeAccountId, movers.up.length, movers.down.length]);

  useEffect(() => {
    setAssetsSortKey("currentValue");
    setAssetsSortDirection("desc");
    setReportActiveMetric(REPORT_DEFAULT_METRIC);
    setReportGrouping("months");
    setReportPeriod("1y");
    setPinnedAssetsDonutId("");
    setHoverAssetsDonutId("");
    setPinnedDiversificationRowId("");
    setHoverDiversificationRowId("");
  }, [activeAccountId]);

  const isLoading =
    accountsQuery.isFetching || portfolioQuery.isFetching || analyticsQuery.isFetching;
  const hasDashboardData = Boolean(portfolioQuery.data && analyticsQuery.data);
  const hasAnyData = Boolean(
    hasDashboardData ||
      (accountsQuery.data?.accounts?.length || 0) > 0 ||
      (portfolioQuery.data?.positions?.length || 0) > 0
  );

  useEffect(() => {
    if (!isLoading) {
      setLoadingTimedOut(false);
      return;
    }

    const timerId = window.setTimeout(() => setLoadingTimedOut(true), 20_000);
    return () => window.clearTimeout(timerId);
  }, [isLoading]);

  useEffect(() => {
    if (!loadingTimedOut) return;

    void Promise.allSettled([
      queryClient.cancelQueries({ queryKey: ["accounts"] }),
      queryClient.cancelQueries({ queryKey: ["portfolio", activeAccountId] }),
      queryClient.cancelQueries({ queryKey: ["analytics", activeAccountId] }),
    ]);
  }, [loadingTimedOut, queryClient, activeAccountId]);

  const status = useMemo(() => {
    const err = firstError(accountsQuery.error, portfolioQuery.error, analyticsQuery.error);
    if (err) return `Ошибка: ${err}`;

    if (loadingTimedOut) {
      return hasAnyData
        ? "Таймаут фонового обновления. Показаны последние данные."
        : "Таймаут загрузки. Проверьте account_id и нажмите «Обновить».";
    }

    if (isLoading) {
      return hasDashboardData
        ? "Данные на экране. Идет фоновое обновление..."
        : "Обновляю данные...";
    }

    if (hasDashboardData) {
      return "Портфель обновлен";
    }

    if (accountsQuery.data?.accounts?.length) {
      if (!accountOptions.length) {
        return "Не найден account_id в списке счетов";
      }
      return "Счета загружены, выберите account_id";
    }

    return "Готов к загрузке";
  }, [
    accountsQuery.error,
    portfolioQuery.error,
    analyticsQuery.error,
    accountsQuery.data,
    accountOptions,
    isLoading,
    loadingTimedOut,
    hasAnyData,
    hasDashboardData,
  ]);

  useEffect(() => {
    const normalized = normalizeAccountsList(accountsQuery.data?.accounts);
    if (!normalized.length) return;
    const snapshot = readNativeSnapshot();
    snapshot.accounts = normalized;
    snapshot.accountsUpdatedAt = Date.now();
    if (activeAccountId.trim()) {
      snapshot.selectedAccountId = activeAccountId.trim();
    }
    writeNativeSnapshot(snapshot);
    safeJsonWrite(LEGACY_CACHE_KEYS.accounts, {
      accounts: normalized,
      accountId: activeAccountId.trim() || null,
      updatedAt: Date.now(),
    });
  }, [accountsQuery.data, activeAccountId]);

  useEffect(() => {
    const accountId = activeAccountId.trim();
    if (!accountId || !portfolioQuery.data) return;
    const snapshot = readNativeSnapshot();
    snapshot.selectedAccountId = accountId;
    snapshot.byAccount = snapshot.byAccount || {};
    snapshot.byAccount[accountId] = {
      ...(snapshot.byAccount[accountId] || {}),
      updatedAt: Date.now(),
      portfolio: portfolioQuery.data,
    };
    writeNativeSnapshot(snapshot);
  }, [activeAccountId, portfolioQuery.data]);

  useEffect(() => {
    const accountId = activeAccountId.trim();
    if (!accountId || !analyticsQuery.data) return;
    const snapshot = readNativeSnapshot();
    snapshot.selectedAccountId = accountId;
    snapshot.byAccount = snapshot.byAccount || {};
    snapshot.byAccount[accountId] = {
      ...(snapshot.byAccount[accountId] || {}),
      updatedAt: Date.now(),
      analytics: analyticsQuery.data,
    };
    writeNativeSnapshot(snapshot);
  }, [activeAccountId, analyticsQuery.data]);

  useEffect(() => {
    if (bootRefreshStarted || !accountsEnabled) return;
    setBootRefreshStarted(true);
    void refreshAll();
  }, [bootRefreshStarted, accountsEnabled]);

  useEffect(() => {
    const accountId = activeAccountId.trim();
    if (!dashboardEnabled || !accountId) return;
    if (portfolioQuery.data && analyticsQuery.data) return;
    if (portfolioQuery.isFetching || analyticsQuery.isFetching) return;

    const key = accountId;
    if (autoLoadKey === key) return;
    setAutoLoadKey(key);
    void Promise.allSettled([portfolioQuery.refetch(), analyticsQuery.refetch()]);
  }, [
    dashboardEnabled,
    activeAccountId,
    autoLoadKey,
    portfolioQuery.data,
    analyticsQuery.data,
    portfolioQuery.isFetching,
    analyticsQuery.isFetching,
  ]);

  async function loadAccounts(): Promise<void> {
    setLoadingTimedOut(false);
    const token = tokenInput.trim();
    const shouldRefetch = accountsEnabled && token === requestToken;
    setRequestToken(token);
    setAccountsEnabled(true);
    saveSessionToken(token);
    try {
      await syncServerToken(token);
    } catch {
      // Ignore sync errors and let request-level errors surface in query state.
    }
    if (shouldRefetch) {
      void accountsQuery.refetch();
    }
  }

  async function loadPortfolio(): Promise<void> {
    setLoadingTimedOut(false);

    let accountId = accountInput.trim() || activeAccountId.trim();
    if (!accountId && accountOptions[0]?.id) {
      accountId = accountOptions[0].id;
      setAccountInput(accountId);
    }
    if (!accountId) return;

    const token = tokenInput.trim();
    const shouldRefetch =
      dashboardEnabled && token === requestToken && accountId === activeAccountId;

    setRequestToken(token);
    setAccountsEnabled(true);
    setActiveAccountId(accountId);
    setDashboardEnabled(true);
    window.localStorage.setItem(ACCOUNT_KEY, accountId);
    saveSessionToken(token);
    try {
      await syncServerToken(token);
    } catch {
      // Ignore sync errors and let request-level errors surface in query state.
    }

    if (shouldRefetch) {
      void Promise.allSettled([portfolioQuery.refetch(), analyticsQuery.refetch()]);
    }
  }

  function rememberToken(): void {
    const token = tokenInput.trim();
    saveSessionToken(token);
    void syncServerToken(token).catch(() => undefined);
  }

  async function refreshAll(): Promise<void> {
    setLoadingTimedOut(false);

    const token = tokenInput.trim();
    const nextToken = token || requestToken;
    if (nextToken !== requestToken) {
      setRequestToken(nextToken);
    }
    setAccountsEnabled(true);
    saveSessionToken(nextToken);
    try {
      await syncServerToken(nextToken);
    } catch {
      // Ignore sync errors and let request-level errors surface in query state.
    }

    let accountId = accountInput.trim() || activeAccountId.trim();
    if (!accountId && accountOptions[0]?.id) {
      accountId = accountOptions[0].id;
      setAccountInput(accountId);
    }

    if (accountId && accountId !== activeAccountId) {
      setActiveAccountId(accountId);
    }
    if (accountId) {
      setDashboardEnabled(true);
      window.localStorage.setItem(ACCOUNT_KEY, accountId);
    }

    const canRefetchDashboard = Boolean(accountId);
    await Promise.allSettled([
      accountsQuery.refetch(),
      canRefetchDashboard ? portfolioQuery.refetch() : Promise.resolve(null as any),
      canRefetchDashboard ? analyticsQuery.refetch() : Promise.resolve(null as any),
    ]);
  }

  function toggleAssetsSort(
    key: (typeof ASSET_TABLE_COLUMNS)[number]["key"]
  ): void {
    if (assetsSortKey === key) {
      setAssetsSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setAssetsSortKey(key);
    setAssetsSortDirection("desc");
  }

  function assetsSortMarker(key: (typeof ASSET_TABLE_COLUMNS)[number]["key"]): string {
    if (assetsSortKey !== key) return "↕";
    return assetsSortDirection === "desc" ? "▼" : "▲";
  }

  function downloadReportExcel(): void {
    if (!reportMonthsData.length) return;
    const monthHeader = reportMonthsData.map((month) => month.label);
    const lines: string[] = [];
    lines.push(["Показатель", ...monthHeader].join(";"));
    for (const row of REPORT_TABLE_ROWS) {
      if (row.kind !== "metric") continue;
      const values = reportMonthsData.map((month) => formatReportValue(month[row.key], row.metricType));
      lines.push([row.label, ...values].join(";"));
    }
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
      type: "text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "analytics-report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function downloadReportPdf(): void {
    window.print();
  }

  const analyticsMode = isAnalyticsPath(pathname);

  return (
    <div className="native-home">
      <header className="native-topbar">
        <div className="native-topbar-inner">
          <nav className="native-nav">
            <button
              type="button"
              className={!analyticsMode ? "is-active" : ""}
              onClick={() => onNavigate("/")}
            >
              Главная
            </button>
            <button
              type="button"
              className={analyticsMode ? "is-active" : ""}
              onClick={() => onNavigate("/analytics")}
            >
              Аналитика
            </button>
            <button type="button" onClick={() => onNavigate("/")}>
              Портфель
            </button>
            <button type="button" onClick={() => onNavigate("/analytics")}>Инструменты</button>
          </nav>
          <div className="native-grow" />
          <button
            type="button"
            className="native-ghost-btn"
            onClick={() => setControlsOpen((v) => !v)}
          >
            token
          </button>
        </div>
        <div className={`native-controls ${controlsOpen ? "is-open" : ""}`}>
          <input
            type="password"
            placeholder="API токен (опционально, можно из .env)"
            value={tokenInput}
            onChange={(e) => {
              const value = e.target.value;
              setTokenInput(value);
              saveSessionToken(value.trim());
            }}
          />
          <input
            list="native-accounts"
            placeholder="account_id"
            value={accountInput}
            onChange={(e) => {
              const value = e.target.value;
              setAccountInput(value);
              window.localStorage.setItem(ACCOUNT_KEY, value.trim());
            }}
          />
          <datalist id="native-accounts">
            {accountOptions.map((acc) => (
              <option key={acc.id} value={acc.id} label={`${acc.name} (${acc.type})`} />
            ))}
          </datalist>
          <button
            type="button"
            className={accountsQuery.isFetching ? "is-loading" : ""}
            onClick={() => void loadAccounts()}
          >
            {accountsQuery.isFetching ? "Счета..." : "Счета"}
          </button>
          <button
            type="button"
            className={portfolioQuery.isFetching || analyticsQuery.isFetching ? "is-loading" : ""}
            onClick={() => void loadPortfolio()}
          >
            {portfolioQuery.isFetching || analyticsQuery.isFetching ? "Портфель..." : "Портфель"}
          </button>
          <button type="button" onClick={rememberToken}>
            Сохранить токен (сессия)
          </button>
          <button
            type="button"
            className={isLoading ? "is-loading" : ""}
            onClick={() => void refreshAll()}
          >
            {isLoading ? "Обновляю..." : "Обновить"}
          </button>
        </div>
        <div className="native-controls-status">{status}</div>
      </header>

      <main className="native-page">
        {!analyticsMode ? (
          <>
            <h1>Портфель</h1>

            <section className="native-kpis">
              <article className="native-kpi">
                <div className="native-kpi-label">Стоимость</div>
                <div className="native-kpi-value">{portfolioQuery.data?.total || "-"}</div>
                <div className="native-kpi-sub">
                  {portfolioTotalValue > 0 ? `Вложено ${formatRub(investedTotal)}` : "Загрузите портфель"}
                </div>
              </article>
              <article className="native-kpi native-kpi-profit-card">
                <div className="native-kpi-label">Прибыль</div>
                <div className="native-kpi-value">{analyticsQuery.data?.profitRub || "-"}</div>
                <div className="native-kpi-sub">{analyticsQuery.data?.profitPct || "-"}</div>
                <div className="native-profit-tooltip">
                  <div className="native-profit-tooltip-title">
                    Формула: текущая + результат сделок + начисления - комиссии - налоги
                  </div>
                  <div className="native-profit-tooltip-row">
                    <span>Текущая стоимость</span>
                    <span>
                      {analyticsQuery.data
                        ? formatSignedRub(
                            metricNumber(
                              analyticsQuery.data?.profitBreakdown?.currentValue,
                              analyticsQuery.data?.profitBreakdown?.currentValueRub || 0
                            )
                          )
                        : "-"}
                    </span>
                  </div>
                  <div className="native-profit-tooltip-row">
                    <span>Результат сделок</span>
                    <span>
                      {analyticsQuery.data
                        ? formatSignedRub(
                            metricNumber(
                              analyticsQuery.data?.profitBreakdown?.tradesNet,
                              analyticsQuery.data?.profitBreakdown?.tradesNetRub || 0
                            )
                          )
                        : "-"}
                    </span>
                  </div>
                  <div className="native-profit-tooltip-row">
                    <span>Купоны</span>
                    <span>
                      {analyticsQuery.data
                        ? formatSignedRub(
                            metricNumber(
                              analyticsQuery.data?.profitBreakdown?.coupons,
                              analyticsQuery.data?.profitBreakdown?.couponsRub || 0
                            )
                          )
                        : "-"}
                    </span>
                  </div>
                  <div className="native-profit-tooltip-row">
                    <span>Дивиденды</span>
                    <span>
                      {analyticsQuery.data
                        ? formatSignedRub(
                            metricNumber(
                              analyticsQuery.data?.profitBreakdown?.dividends,
                              analyticsQuery.data?.profitBreakdown?.dividendsRub || 0
                            )
                          )
                        : "-"}
                    </span>
                  </div>
                  <div className="native-profit-tooltip-row">
                    <span>Комиссии</span>
                    <span>
                      {analyticsQuery.data
                        ? formatSignedRub(
                            -Math.abs(
                              metricNumber(
                                analyticsQuery.data?.profitBreakdown?.commissions,
                                analyticsQuery.data?.profitBreakdown?.commissionsRub || 0
                              )
                            )
                          )
                        : "-"}
                    </span>
                  </div>
                  <div className="native-profit-tooltip-row">
                    <span>Налоги (див/куп)</span>
                    <span>
                      {analyticsQuery.data
                        ? formatSignedRub(
                            -Math.abs(
                              metricNumber(
                                analyticsQuery.data?.profitBreakdown?.taxes,
                                analyticsQuery.data?.profitBreakdown?.taxesRub || 0
                              )
                            )
                          )
                        : "-"}
                    </span>
                  </div>
                </div>
              </article>
              <article className="native-kpi native-kpi-hint-card">
                <div className="native-kpi-label">Доходность</div>
                <div className="native-kpi-value">{analyticsQuery.data?.yieldPct || "-"}</div>
                <div className="native-kpi-sub">Расчет по текущему портфелю</div>
                <div className="native-kpi-tooltip">
                  <div className="native-kpi-tooltip-title">
                    Формула: купоны на 12 мес / текущая стоимость облигаций
                  </div>
                  <div className="native-kpi-tooltip-row">
                    <span>Купоны на 12 мес</span>
                    <span>{analyticsQuery.data ? formatRub(yieldIncomeValue) : "-"}</span>
                  </div>
                  <div className="native-kpi-tooltip-row">
                    <span>Стоимость облигаций</span>
                    <span>{analyticsQuery.data ? formatRub(yieldBaseValue) : "-"}</span>
                  </div>
                  <div className="native-kpi-tooltip-row">
                    <span>Итоговая доходность</span>
                    <span>{analyticsQuery.data?.yieldPct || "-"}</span>
                  </div>
                </div>
              </article>
              <article className="native-kpi native-kpi-hint-card">
                <div className="native-kpi-label">Пассивный доход</div>
                <div className="native-kpi-value">
                  {analyticsQuery.data?.passiveIncomeTotalRub || "-"}
                </div>
                <div className="native-kpi-sub">
                  {analyticsQuery.data?.passiveIncomeYieldPct || "-"}
                </div>
                <div className="native-kpi-tooltip">
                  <div className="native-kpi-tooltip-title">
                    Формула: пассивный доход 12 мес / база (портфель без валюты)
                  </div>
                  <div className="native-kpi-tooltip-row">
                    <span>Пассивный доход 12 мес</span>
                    <span>{analyticsQuery.data?.passiveIncomeTotalRub || "-"}</span>
                  </div>
                  <div className="native-kpi-tooltip-row">
                    <span>База расчета</span>
                    <span>{analyticsQuery.data ? formatRub(passiveIncomeBaseValue) : "-"}</span>
                  </div>
                  <div className="native-kpi-tooltip-row">
                    <span>Купоны (прогноз)</span>
                    <span>{analyticsQuery.data ? formatRub(passiveCouponsForecastValue) : "-"}</span>
                  </div>
                  <div className="native-kpi-tooltip-row">
                    <span>Дивиденды (прогноз)</span>
                    <span>{analyticsQuery.data ? formatRub(passiveDividendsForecastValue) : "-"}</span>
                  </div>
                  <div className="native-kpi-tooltip-row">
                    <span>Итоговая доходность</span>
                    <span>{analyticsQuery.data?.passiveIncomeYieldPct || "-"}</span>
                  </div>
                </div>
              </article>
            </section>

            <section className="native-board">
              <article className="native-panel native-structure-panel">
                <h2>Структура портфеля</h2>
                <div className="native-structure-content">
                  <div className="native-donut-panel">
                    <div className="native-donut-wrap">
                      <svg
                        className="native-donut-svg"
                        viewBox="0 0 220 220"
                        aria-label="Структура портфеля"
                        onMouseLeave={() => setHoverDonutType("")}
                      >
                        <circle cx="110" cy="110" r="74" className="native-donut-track" />
                        {donutSlices.map((slice) => {
                          const isActive = slice.type === activeDonutType;
                          return (
                            <path
                              key={`arc-${slice.type}`}
                              d={slice.path}
                              className={`native-donut-segment ${isActive ? "is-active" : ""}`}
                              style={{ stroke: slice.color }}
                              onMouseEnter={() => setHoverDonutType(slice.type)}
                              onClick={() =>
                                setPinnedDonutType((current) =>
                                  current === slice.type ? "" : slice.type
                                )
                              }
                            />
                          );
                        })}
                        <circle cx="110" cy="110" r="48" className="native-donut-hole" />
                      </svg>
                      <div className="native-donut-center">
                        <small>{activeDonutRow ? activeDonutRow.typeLabel : "Структура"}</small>
                        <strong>
                          {activeDonutRow ? activeDonutRow.valueText : "Наведите на сегмент"}
                        </strong>
                        <span>
                          {activeDonutRow ? activeDonutRow.percentText : "или выберите в легенде"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="native-structure-right">
                    <ul className="native-donut-legend native-donut-legend-right">
                      {donutRows.map((row) => (
                        <li
                          key={`legend-${row.type}`}
                          className={row.type === activeDonutType ? "is-active" : ""}
                          onMouseEnter={() => setHoverDonutType(row.type)}
                          onMouseLeave={() => setHoverDonutType("")}
                          onClick={() =>
                            setPinnedDonutType((current) => (current === row.type ? "" : row.type))
                          }
                        >
                          <span className="native-legend-color" style={{ background: row.color }} />
                          <span>{row.typeLabel}</span>
                          <strong>{row.valueText}</strong>
                          <small>{row.percentText}</small>
                        </li>
                      ))}
                      {!donutRows.length && <li className="is-empty">Нет данных</li>}
                    </ul>
                  </div>
                </div>
              </article>
            </section>

            <section className="native-payout-grid">
              <article className="native-panel native-payout-panel native-payout-card">
                <div className="native-payout-head">
                  <h2>Будущие выплаты</h2>
                  <span>12 месяцев</span>
                </div>
                <div className="native-payout-metrics">
                  <div className="native-payout-metric">
                    <small>За 12 мес.</small>
                    <strong>{formatRub(futureTotal)}</strong>
                  </div>
                  <div className="native-payout-metric">
                    <small>В среднем в месяц</small>
                    <strong>{formatRub(futureAvg)}</strong>
                  </div>
                </div>
                <div className="native-bars">
                  {futurePreview.map((row) => {
                    const value = Number(row.value || 0);
                    const height = `${Math.max(4, Math.round((value / futureMax) * 100))}%`;
                    const details = futureDetailsByMonth.get(row.month) || [];
                    const normalizedDetails = details
                      .map((item) => ({
                        ticker: String(item.ticker || "").trim(),
                        amountText: String(item.amountText || "").trim() || formatRub(Number(item.amount) || 0),
                      }))
                      .filter((item) => item.ticker.length > 0);
                    const tooltipRows =
                      normalizedDetails.length > 0
                        ? normalizedDetails
                        : value > 0
                          ? [{ ticker: "Сумма за месяц", amountText: row.amount }]
                          : [];
                    return (
                      <div key={`f-${row.month}`} className="native-bar-item">
                        <div className="native-bar-wrap">
                          <span className="native-bar" style={{ height }} />
                        </div>
                        <small>{row.month}</small>
                        <small>{row.amount}</small>
                        <div className="native-bar-tooltip">
                          {tooltipRows.length ? (
                            <>
                              <div className="native-bar-tooltip-title">Выплаты за {row.month}</div>
                              <div className="native-bar-tooltip-rows">
                                {tooltipRows.map((item, index) => (
                                  <div
                                    key={`${row.month}-${item.ticker}-${item.amountText}-${index}`}
                                    className="native-bar-tooltip-row"
                                  >
                                    <span>{item.ticker}</span>
                                    <small>{item.amountText}</small>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="native-bar-tooltip-title">Выплаты за {row.month}</div>
                              <div className="native-bar-tooltip-rows">
                                <div className="native-bar-tooltip-row">
                                  <span>Детализация недоступна</span>
                                  <small>-</small>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!futurePreview.length && <p>Нет данных</p>}
                </div>
              </article>

              <article className="native-panel native-payout-panel native-payout-card">
                <div className="native-payout-head">
                  <h2>Полученные дивиденды</h2>
                  <span>12 месяцев</span>
                </div>
                <div className="native-payout-metrics">
                  <div className="native-payout-metric is-alt">
                    <small>Всего</small>
                    <strong>{formatRub(dividendsTotal)}</strong>
                  </div>
                  <div className="native-payout-metric is-alt">
                    <small>В среднем в месяц</small>
                    <strong>{formatRub(dividendsAvg)}</strong>
                  </div>
                </div>
                <div className="native-bars">
                  {dividendsPreview.map((row) => {
                    const value = Number(row.value || 0);
                    const height = `${Math.max(4, Math.round((value / dividendsMax) * 100))}%`;
                    const details = dividendsDetailsByMonth.get(row.month) || [];
                    const normalizedDetails = details
                      .map((item) => ({
                        ticker: String(item.ticker || "").trim(),
                        amountText:
                          String(item.amountText || "").trim() || formatRub(Number(item.amount) || 0),
                      }))
                      .filter((item) => item.ticker.length > 0);
                    const tooltipRows =
                      normalizedDetails.length > 0
                        ? normalizedDetails
                        : value > 0
                          ? [{ ticker: "Сумма за месяц", amountText: row.amount }]
                          : [];
                    return (
                      <div key={`d-${row.month}`} className="native-bar-item">
                        <div className="native-bar-wrap">
                          <span className="native-bar native-bar-alt" style={{ height }} />
                        </div>
                        <small>{row.month}</small>
                        <small>{row.amount}</small>
                        <div className="native-bar-tooltip">
                          {tooltipRows.length ? (
                            <>
                              <div className="native-bar-tooltip-title">Дивиденды за {row.month}</div>
                              <div className="native-bar-tooltip-rows">
                                {tooltipRows.map((item, index) => (
                                  <div
                                    key={`${row.month}-div-${item.ticker}-${item.amountText}-${index}`}
                                    className="native-bar-tooltip-row"
                                  >
                                    <span>{item.ticker}</span>
                                    <small>{item.amountText}</small>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="native-bar-tooltip-title">Дивиденды за {row.month}</div>
                              <div className="native-bar-tooltip-rows">
                                <div className="native-bar-tooltip-row">
                                  <span>Детализация недоступна</span>
                                  <small>-</small>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!dividendsPreview.length && <p>Нет данных</p>}
                </div>
              </article>
            </section>

            <section className="native-panel native-events-panel">
              <h2>Ближайшие события (7 дней)</h2>
              <div className="native-events-grid">
                {upcomingPreview.map((event) => (
                  <article key={`${event.date}-${event.name}-${event.eventType}`} className="native-event-item">
                    <div className="native-event-row">
                      <strong>{event.name}</strong>
                      <small>{event.date}</small>
                    </div>
                    <div className="native-event-row">
                      <span className={`native-event-type ${eventTypeClass(event.eventType)}`}>
                        {event.eventType}
                      </span>
                      <span>{event.amount}</span>
                    </div>
                    <div className="native-event-tooltip">
                      <div className="native-event-tooltip-title">Детали выплаты</div>
                      <div className="native-event-tooltip-row">
                        <span>Количество активов</span>
                        <small>{event.quantityText || "-"}</small>
                      </div>
                      <div className="native-event-tooltip-row">
                        <span>На 1 актив</span>
                        <small>{event.perAssetAmount || "-"}</small>
                      </div>
                    </div>
                  </article>
                ))}
                {!upcomingPreview.length && <div className="native-event-empty">Нет событий на ближайшие 7 дней.</div>}
              </div>
            </section>

            <section className="native-movers-grid">
              <article className="native-panel">
                <h2>Топ роста</h2>
                <ul className="native-movers-list">
                  {(moversUpVisible.length ? moversUpVisible : []).map((row) => (
                    <li key={`up-${row.name}-${row.dayChangePct}-${row.dayChange}`}>
                      <span>{row.name}</span>
                      <small>{formatSignedRub(row.dayChange)}</small>
                      <small>{`24ч: ${formatRub(row.closePrice24h)} -> ${formatRub(row.currentPriceNow)}`}</small>
                      <strong className={row.dayChangePct >= 0 ? "pos" : "neg"}>
                        {formatPercent(row.dayChangePct, true)}
                      </strong>
                    </li>
                  ))}
                  {!movers.up.length && <li className="is-empty">Нет данных</li>}
                </ul>
                {movers.up.length > moversVisibleUp && (
                  <button
                    type="button"
                    className="native-more-btn"
                    onClick={() => setMoversVisibleUp((value) => value + 5)}
                  >
                    Еще 5
                  </button>
                )}
              </article>

              <article className="native-panel">
                <h2>Топ падения</h2>
                <ul className="native-movers-list">
                  {(moversDownVisible.length ? moversDownVisible : []).map((row) => (
                    <li key={`down-${row.name}-${row.dayChangePct}-${row.dayChange}`}>
                      <span>{row.name}</span>
                      <small>{formatSignedRub(row.dayChange)}</small>
                      <small>{`24ч: ${formatRub(row.closePrice24h)} -> ${formatRub(row.currentPriceNow)}`}</small>
                      <strong className={row.dayChangePct >= 0 ? "pos" : "neg"}>
                        {formatPercent(row.dayChangePct, true)}
                      </strong>
                    </li>
                  ))}
                  {!movers.down.length && <li className="is-empty">Нет данных</li>}
                </ul>
                {movers.down.length > moversVisibleDown && (
                  <button
                    type="button"
                    className="native-more-btn"
                    onClick={() => setMoversVisibleDown((value) => value + 5)}
                  >
                    Еще 5
                  </button>
                )}
              </article>
            </section>
          </>
        ) : (
          <>
            <h1>Аналитика</h1>
            <p className="native-analytics-subtle">Локальная аналитика по портфелю и доходам.</p>
            <section className="native-panel native-analytics-panel">
              <div className="native-analytics-tabs">
                {ANALYTICS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`native-tab-btn ${analyticsTab === tab.id ? "is-active" : ""}`}
                    onClick={() => setAnalyticsTab(tab.id)}
                  >
                    <span className="native-tab-icon">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="native-tab-panel">
                {analyticsQuery.isFetching && (
                  <div className="native-tab-refresh-badge">Обновляю аналитику...</div>
                )}
                {analyticsTab === "common" && (
                  <div className="native-tab-content">
                    <div className="native-analytics-tab-head">
                      <h3>Общий обзор</h3>
                      <AnalyticsCommentHint
                        what="Сводка по портфелю: стоимость, прибыль, доходность и пассивный доход за 12 месяцев."
                        formula="Прибыль = текущая стоимость + результат сделок + дивиденды/купоны - комиссии - налоги. Доходность = прибыль / вложения × 100%."
                      />
                    </div>
                    <section className="native-kpis native-analytics-kpis">
                      <article className="native-kpi">
                        <div className="native-kpi-label">
                          <span className="native-kpi-dot cost" />
                          Стоимость
                        </div>
                        <div className="native-kpi-value">{analyticsTotalText}</div>
                        <div className="native-kpi-sub">{formatRub(analyticsInvested)} вложено</div>
                      </article>

                      <article className="native-kpi native-kpi-profit-card">
                        <div className="native-kpi-label">
                          <span className="native-kpi-dot profit" />
                          Прибыль
                        </div>
                        <div className="native-kpi-value">{formatSignedRub(analyticsProfitValue)}</div>
                        <div className="native-kpi-sub">Изменение: {formatPercent(analyticsProfitPct)}</div>
                        <div className="native-profit-tooltip">
                          <div className="native-profit-tooltip-title">
                            Формула: текущая + результат сделок + начисления - комиссии - налоги
                          </div>
                          <div className="native-profit-tooltip-row">
                            <span>Текущая стоимость</span>
                            <span>
                              {analyticsQuery.data?.profitBreakdown?.currentValueRub ||
                                formatSignedRub(
                                  metricNumber(
                                    analyticsQuery.data?.profitBreakdown?.currentValue,
                                    analyticsQuery.data?.profitBreakdown?.currentValueRub || "0"
                                  )
                                )}
                            </span>
                          </div>
                          <div className="native-profit-tooltip-row">
                            <span>Результат сделок</span>
                            <span>
                              {analyticsQuery.data?.profitBreakdown?.tradesNetRub ||
                                formatSignedRub(
                                  metricNumber(
                                    analyticsQuery.data?.profitBreakdown?.tradesNet,
                                    analyticsQuery.data?.profitBreakdown?.tradesNetRub || "0"
                                  )
                                )}
                            </span>
                          </div>
                          <div className="native-profit-tooltip-row">
                            <span>Купоны</span>
                            <span>
                              {analyticsQuery.data?.profitBreakdown?.couponsRub ||
                                formatSignedRub(
                                  metricNumber(
                                    analyticsQuery.data?.profitBreakdown?.coupons,
                                    analyticsQuery.data?.profitBreakdown?.couponsRub || "0"
                                  )
                                )}
                            </span>
                          </div>
                          <div className="native-profit-tooltip-row">
                            <span>Дивиденды</span>
                            <span>
                              {analyticsQuery.data?.profitBreakdown?.dividendsRub ||
                                formatSignedRub(
                                  metricNumber(
                                    analyticsQuery.data?.profitBreakdown?.dividends,
                                    analyticsQuery.data?.profitBreakdown?.dividendsRub || "0"
                                  )
                                )}
                            </span>
                          </div>
                          <div className="native-profit-tooltip-row">
                            <span>Комиссии</span>
                            <span>
                              {formatSignedRub(
                                -Math.abs(
                                  metricNumber(
                                    analyticsQuery.data?.profitBreakdown?.commissions,
                                    analyticsQuery.data?.profitBreakdown?.commissionsRub || "0"
                                  )
                                )
                              )}
                            </span>
                          </div>
                          <div className="native-profit-tooltip-row">
                            <span>Налоги (див/куп)</span>
                            <span>
                              {formatSignedRub(
                                -Math.abs(
                                  metricNumber(
                                    analyticsQuery.data?.profitBreakdown?.taxes,
                                    analyticsQuery.data?.profitBreakdown?.taxesRub || "0"
                                  )
                                )
                              )}
                            </span>
                          </div>
                        </div>
                      </article>

                      <article className="native-kpi">
                        <div className="native-kpi-label">
                          <span className="native-kpi-dot yield" />
                          Доходность
                        </div>
                        <div className="native-kpi-value">{formatPercent(analyticsYieldPct)}</div>
                        <div className="native-kpi-sub">Расчет по текущему портфелю</div>
                      </article>

                      <article className="native-kpi">
                        <div className="native-kpi-label">
                          <span className="native-kpi-dot passive" />
                          Пассивный доход
                        </div>
                        <div className="native-kpi-value">{formatRub(analyticsPassiveTotal)}</div>
                        <div className="native-kpi-sub">
                          {formatPercent(analyticsPassivePct)} за 12 мес
                        </div>
                      </article>
                    </section>

                    <section className="native-analytics-currency-row">
                      <span className="native-currency-chevron">»</span>
                      <span className="native-currency-label">Валюта</span>
                      <span className="native-currency-value">
                        {analyticsCurrencyRow?.valueText || formatRub(0)}
                      </span>
                    </section>

                    <section className="native-analytics-assets-section">
                      <h3 className="native-assets-title">Мои активы</h3>
                      {myAssetsRows.length ? (
                        <div className="native-assets-table-wrap">
                          <table className="native-assets-table">
                            <thead>
                              <tr>
                                {ASSET_TABLE_COLUMNS.map((column) => (
                                  <th key={`asset-head-${column.key}`}>
                                    <button
                                      type="button"
                                      className={`native-assets-sort-btn ${assetsSortKey === column.key ? "is-active" : ""}`}
                                      onClick={() => toggleAssetsSort(column.key)}
                                      title={column.help}
                                      aria-label={`${column.label}. ${column.help}`}
                                    >
                                      <span className="native-assets-head-label">
                                        <span>{column.label}</span>
                                        <span className="native-assets-help" aria-hidden="true">
                                          ?
                                        </span>
                                      </span>
                                      <span className="native-assets-sort-dir">
                                        {assetsSortMarker(column.key)}
                                      </span>
                                    </button>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sortedMyAssetsRows.map((row) => (
                                <tr key={row.id}>
                                  <td>
                                    <span className="native-assets-name">
                                      <span className="native-assets-icon">{row.icon || "•"}</span>
                                      <span>{row.name}</span>
                                    </span>
                                  </td>
                                  <td>{row.quantityText}</td>
                                  <td>{row.investedText}</td>
                                  <td>{row.currentValueText}</td>
                                  <td>{row.passiveIncomeText}</td>
                                  <td>{row.assetYieldText}</td>
                                  <td>{row.profitText}</td>
                                  <td>{row.yieldPctText}</td>
                                  <td>{row.portfolioSharePctText}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="native-assets-total-row">
                                <td>Всего</td>
                                <td>{myAssetsTotals.quantityText}</td>
                                <td>{myAssetsTotals.investedText}</td>
                                <td>{myAssetsTotals.currentValueText}</td>
                                <td>{myAssetsTotals.passiveIncomeText}</td>
                                <td>{myAssetsTotals.assetYieldText}</td>
                                <td>{myAssetsTotals.profitText}</td>
                                <td>{myAssetsTotals.yieldPctText}</td>
                                <td>{myAssetsTotals.portfolioSharePctText}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <div className="native-analytics-empty">Нет данных.</div>
                      )}
                    </section>
                  </div>
                )}

                {analyticsTab === "diversification" && (
                  <div className="native-tab-content">
                    <div className="native-analytics-tab-head">
                      <h3>Диверсификация</h3>
                      <AnalyticsCommentHint
                        what="Показывает распределение капитала по типам активов и дополнительным разрезам."
                        formula="Доля категории = стоимость категории / общая стоимость портфеля × 100%."
                      />
                    </div>
                    <div className="native-analytics-section native-all-assets-section">
                      <div className="native-analytics-title-row">
                        <h3>Все активы</h3>
                        <AnalyticsCommentHint
                          what="Кольцевая диаграмма и легенда показывают вклад каждого класса активов в портфель."
                          formula="Сумма категории = сумма текущей стоимости всех позиций в этой категории."
                        />
                      </div>
                      {allAssetsDonutRows.length ? (
                        <div className="native-all-assets-content">
                          <div className="native-donut-panel">
                            <div className="native-donut-wrap">
                              <svg
                                className="native-donut-svg"
                                viewBox="0 0 220 220"
                                aria-label="Все активы"
                                onMouseLeave={() => setHoverAssetsDonutId("")}
                              >
                                <circle cx="110" cy="110" r="74" className="native-donut-track" />
                                {allAssetsDonutSlices.map((slice) => {
                                  const isActive = slice.id === activeAssetsDonutId;
                                  return (
                                    <path
                                      key={`asset-arc-${slice.id}`}
                                      d={slice.path}
                                      className={`native-donut-segment ${isActive ? "is-active" : ""}`}
                                      style={{ stroke: slice.color }}
                                      onMouseEnter={() => setHoverAssetsDonutId(slice.id)}
                                      onClick={() =>
                                        setPinnedAssetsDonutId((current) =>
                                          current === slice.id ? "" : slice.id
                                        )
                                      }
                                    />
                                  );
                                })}
                                <circle cx="110" cy="110" r="48" className="native-donut-hole" />
                              </svg>
                              <div className="native-donut-center">
                                <small>{activeAssetsDonutRow ? activeAssetsDonutRow.label : "Все активы"}</small>
                                <strong>
                                  {activeAssetsDonutRow ? activeAssetsDonutRow.valueText : analyticsTotalText}
                                </strong>
                                <span>
                                  {activeAssetsDonutRow
                                    ? activeAssetsDonutRow.percentText
                                    : "Наведите на сегмент"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <ul className="native-donut-legend native-donut-legend-right native-all-assets-legend">
                            {allAssetsDonutRows.map((row) => (
                              <li
                                key={`all-assets-legend-${row.id}`}
                                className={row.id === activeAssetsDonutId ? "is-active" : ""}
                                onMouseEnter={() => setHoverAssetsDonutId(row.id)}
                                onMouseLeave={() => setHoverAssetsDonutId("")}
                                onClick={() =>
                                  setPinnedAssetsDonutId((current) => (current === row.id ? "" : row.id))
                                }
                              >
                                <span className="native-legend-color" style={{ background: row.color }} />
                                <span>{row.label}</span>
                                <strong>{row.valueText}</strong>
                                <small>{row.percentText}</small>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="native-analytics-empty">Нет данных.</div>
                      )}
                    </div>

                    <div className="native-analytics-section native-diversification-breakdown-section">
                      <div className="native-analytics-title-row">
                        <h3>Разрез по категориям</h3>
                        <AnalyticsCommentHint
                          what="Детализация портфеля по секторам, классам, валютам, регионам и странам."
                          formula="Для каждого разреза группы строятся из активов, затем рассчитываются доля и сумма каждой группы."
                        />
                      </div>
                      <div className="native-diversification-breakdown-tabs">
                        {DIVERSIFICATION_BREAKDOWN_TABS.map((tab) => (
                          <button
                            key={`diversification-tab-${tab.id}`}
                            type="button"
                            className={`native-diversification-breakdown-tab ${diversificationBreakdownTab === tab.id ? "is-active" : ""}`}
                            onClick={() => setDiversificationBreakdownTab(tab.id)}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {diversificationBreakdownRows.length ? (
                        <div
                          className="native-diversification-breakdown-content"
                          onMouseLeave={() => setHoverDiversificationRowId("")}
                        >
                          <div className="native-donut-panel">
                            <div className="native-donut-wrap">
                              <svg
                                className="native-donut-svg"
                                viewBox="0 0 220 220"
                                aria-label={diversificationTabLabel}
                              >
                                <circle cx="110" cy="110" r="74" className="native-donut-track" />
                                {diversificationBreakdownSlices.map((slice) => {
                                  const isActive = slice.id === activeDiversificationRowId;
                                  return (
                                    <path
                                      key={`diversification-arc-${slice.id}`}
                                      d={slice.path}
                                      className={`native-donut-segment ${isActive ? "is-active" : ""}`}
                                      style={{ stroke: slice.color }}
                                      onMouseEnter={() => setHoverDiversificationRowId(slice.id)}
                                      onClick={() =>
                                        setPinnedDiversificationRowId((current) =>
                                          current === slice.id ? "" : slice.id
                                        )
                                      }
                                    />
                                  );
                                })}
                                <circle cx="110" cy="110" r="48" className="native-donut-hole" />
                              </svg>
                              <div className="native-donut-center">
                                <small>{activeDiversificationRow ? activeDiversificationRow.label : diversificationTabLabel}</small>
                                <strong>
                                  {activeDiversificationRow
                                    ? activeDiversificationRow.valueText
                                    : analyticsTotalText}
                                </strong>
                                <span>
                                  {activeDiversificationRow
                                    ? activeDiversificationRow.percentText
                                    : "Наведите на сегмент"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {!!activeDiversificationRow && (
                            <aside className="native-diversification-breakdown-tooltip">
                              <div className="native-diversification-breakdown-tooltip-title">
                                {activeDiversificationRow.label}
                              </div>
                              <div className="native-diversification-breakdown-tooltip-sub">
                                {activeDiversificationRow.valueText} ({activeDiversificationRow.percentText})
                              </div>
                              <div className="native-diversification-breakdown-tooltip-rows">
                                {activeDiversificationDetails.length ? (
                                  activeDiversificationDetails.map((item, index) => (
                                    <div
                                      key={`${activeDiversificationRow.id}-detail-${item.name}-${index}`}
                                      className="native-diversification-breakdown-tooltip-row"
                                    >
                                      <span>{item.name}</span>
                                      <small>{item.valueText}</small>
                                    </div>
                                  ))
                                ) : (
                                  <div className="native-diversification-breakdown-tooltip-row">
                                    <span>Детализация недоступна</span>
                                    <small>-</small>
                                  </div>
                                )}
                              </div>
                            </aside>
                          )}
                          <ul className="native-diversification-breakdown-legend">
                            {diversificationBreakdownRows.map((row) => (
                              <li
                                key={`diversification-row-${row.id}`}
                                className={row.id === activeDiversificationRowId ? "is-active" : ""}
                                onMouseEnter={() => setHoverDiversificationRowId(row.id)}
                                onClick={() =>
                                  setPinnedDiversificationRowId((current) =>
                                    current === row.id ? "" : row.id
                                  )
                                }
                              >
                                <div className="native-diversification-breakdown-row-head">
                                  <span
                                    className="native-diversification-breakdown-color"
                                    style={{ background: row.color }}
                                  />
                                  <span className="native-diversification-breakdown-name">{row.label}</span>
                                  <strong>{row.percentText}</strong>
                                </div>
                                <div className="native-diversification-breakdown-bar">
                                  <span style={{ width: `${Math.max(2, Math.min(100, row.share))}%`, background: row.color }} />
                                </div>
                                <div className="native-diversification-breakdown-row-meta">
                                  <small>{row.valueText}</small>
                                  <small>{row.assetsCountText}</small>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="native-analytics-empty">Нет данных.</div>
                      )}
                    </div>
                  </div>
                )}

                {analyticsTab === "dividends" && (
                  <div className="native-tab-content native-dividends-tab">
                    <div className="native-analytics-tab-head">
                      <h3>Дивиденды и выплаты</h3>
                      <AnalyticsCommentHint
                        what="Раздел про пассивный доход: прогноз выплат, фактические дивиденды и динамика роста."
                        formula="Пассивный доход = дивиденды + купоны; доходность выплат = пассивный доход / база вложений × 100%."
                      />
                    </div>
                    <section className="native-dividends-overview-grid">
                      <article className="native-panel native-dividends-kpis-panel">
                        <div className="native-dividends-mini-kpi">
                          <div className="native-dividends-mini-kpi-head">
                            <span className="native-kpi-dot yield" />
                            <span>Доходность</span>
                          </div>
                          <div className="native-dividends-mini-kpi-value">
                            {formatPercent(analyticsPassivePct)}
                          </div>
                          <div className="native-dividends-mini-kpi-sub">
                            {formatPercent(analyticsYieldPct)} на вложенный капитал
                          </div>
                        </div>

                        <div className="native-dividends-mini-kpi">
                          <div className="native-dividends-mini-kpi-head">
                            <span className="native-kpi-dot passive" />
                            <span>Дивиденды</span>
                            <strong className={payoutTrendPct >= 0 ? "pos" : "neg"}>
                              {formatPercent(payoutTrendPct, true)}
                            </strong>
                          </div>
                          <div className="native-dividends-mini-kpi-value">
                            {formatRub(futureTotal)} <small>в год</small>
                          </div>
                          <div className="native-dividends-mini-kpi-sub">
                            {formatRub(futureAvg)} в месяц
                          </div>
                        </div>
                      </article>

                      <article className="native-panel native-dividends-yield-panel">
                        <div className="native-dividends-card-head">
                          <div className="native-analytics-title-row">
                            <h3>Доходность/Размер выплат</h3>
                            <AnalyticsCommentHint
                              what="Сравнение ожидаемой доходности и абсолютного размера выплат по активам."
                              formula="Доходность выплат актива = ожидаемые выплаты за 12 месяцев / вложенная сумма в актив × 100%."
                            />
                          </div>
                          <span>По активам</span>
                        </div>
                        {dividendYieldRows.length ? (
                          <div className="native-dividends-dual-chart">
                            {dividendYieldRows.map((row) => (
                              <div key={`yield-row-${row.id}`} className="native-dividends-dual-item">
                                <div className="native-dividends-dual-bars">
                                  <span
                                    className="native-dividends-dual-bar is-payout"
                                    style={{ height: toBarHeight(row.payoutPct, dividendYieldScaleMax, 2) }}
                                  />
                                  <span
                                    className="native-dividends-dual-bar is-yield"
                                    style={{
                                      height: toBarHeight(row.yieldChartPct, dividendYieldScaleMax, 2),
                                    }}
                                  />
                                </div>
                                <div className="native-dividends-dual-values">
                                  <small>{formatPercent(row.payoutPct)}</small>
                                  <small>{formatPercent(row.yieldChartPct)}</small>
                                </div>
                                <span className="native-dividends-dual-label" title={row.label}>
                                  {row.shortLabel}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="native-analytics-empty">Нет данных.</div>
                        )}
                      </article>
                    </section>

                    <section className="native-panel native-dividends-breakdown-panel">
                      <div className="native-dividends-card-head">
                        <div className="native-analytics-title-row">
                          <h3>Диверсификация пассивного дохода</h3>
                          <AnalyticsCommentHint
                            what="Показывает, какие активы формируют основной поток дивидендов и купонов."
                            formula="Доля выплаты актива = выплаты актива / общий пассивный доход × 100%."
                          />
                        </div>
                        <span>По активам</span>
                      </div>
                      {passiveIncomeDonutRows.length ? (
                        <div className="native-dividends-breakdown-content">
                          <div className="native-dividends-donut-wrap">
                            <svg
                              width="220"
                              height="220"
                              viewBox="0 0 220 220"
                              className="native-dividends-donut-svg"
                            >
                              <circle
                                cx="110"
                                cy="110"
                                r="72"
                                fill="none"
                                stroke="#3b435d"
                                strokeWidth="30"
                              />
                              {passiveIncomeDonutSlices.map((row) => (
                                <path
                                  key={`passive-slice-${row.id}`}
                                  d={row.path}
                                  stroke={row.color}
                                  strokeWidth="30"
                                  fill="none"
                                  strokeLinecap="round"
                                />
                              ))}
                            </svg>
                            <div className="native-dividends-donut-center">
                              <small>Пассивный доход</small>
                              <strong>{formatRub(passiveIncomeDonutTotal)}</strong>
                            </div>
                          </div>

                          <ul className="native-dividends-breakdown-list">
                            {passiveIncomeDonutRows.map((row) => (
                              <li key={`passive-row-${row.id}`}>
                                <div className="native-dividends-breakdown-head">
                                  <span
                                    className="native-dividends-breakdown-color"
                                    style={{ background: row.color }}
                                  />
                                  <span className="native-dividends-breakdown-name" title={row.label}>
                                    {row.label}
                                  </span>
                                  <strong>{formatPercent(row.payoutSharePct)}</strong>
                                </div>
                                <div className="native-dividends-breakdown-bar">
                                  <span
                                    style={{
                                      width: `${Math.max(2, Math.min(100, row.payoutSharePct))}%`,
                                      background: row.color,
                                    }}
                                  />
                                </div>
                                <div className="native-dividends-breakdown-meta">
                                  <small>{row.valueText}</small>
                                  <small>
                                    {row.invested > 0 ? `Вложено: ${formatRub(row.invested)}` : "Без базы"}
                                  </small>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="native-analytics-empty">Нет данных.</div>
                      )}
                    </section>

                    <section className="native-dividends-card-grid">
                      <article className="native-panel native-dividends-card">
                        <div className="native-dividends-card-head">
                          <div className="native-analytics-title-row">
                            <h3>Среднегодовой рост</h3>
                            <AnalyticsCommentHint
                              what="Оценивает среднюю скорость роста выплат по каждому активу."
                              formula="Используется средний годовой темп роста выплат (CAGR) на доступной истории."
                            />
                          </div>
                          <span>По активам</span>
                        </div>
                        {avgGrowthRows.length ? (
                          <div className="native-dividends-asset-chart">
                            {avgGrowthRows.map((row) => (
                              <div key={`avg-growth-${row.id}`} className="native-dividends-asset-item">
                                <div className="native-dividends-asset-bar-wrap">
                                  <small>{formatPercent(row.value)}</small>
                                  <span
                                    className="native-dividends-asset-bar is-growth"
                                    style={{ height: toBarHeight(row.value, avgGrowthMax, 2) }}
                                  />
                                </div>
                                <span className="native-dividends-asset-name" title={row.label}>
                                  {row.shortLabel}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="native-analytics-empty">Нет данных.</div>
                        )}
                      </article>

                      <article className="native-panel native-dividends-card">
                        <div className="native-dividends-card-head">
                          <div className="native-analytics-title-row">
                            <h3>Будущие выплаты</h3>
                            <AnalyticsCommentHint
                              what="Календарь ожидаемых дивидендов и купонов на ближайшие 12 месяцев."
                              formula="Суммируются прогнозные выплаты по датам ex-dividend/купонных выплат, сгруппированные по месяцам."
                            />
                          </div>
                          <span>Календарь</span>
                        </div>
                        <div className="native-dividends-inline-metrics">
                          <div>
                            <small>След. 12м</small>
                            <strong>{formatRub(futureTotal)}</strong>
                          </div>
                          <div>
                            <small>В месяц</small>
                            <strong>{formatRub(futureAvg)}</strong>
                          </div>
                        </div>
                        {futureRows12.length ? (
                          <div className="native-dividends-month-chart">
                            {futureRows12.map((row) => {
                              const value = Number(row.value) || 0;
                              const details = futureDetailsByMonth.get(row.month) || [];
                              const topTicker = details[0]?.ticker || "";
                              const title = topTicker
                                ? `${row.month}: ${row.amount} (${topTicker})`
                                : `${row.month}: ${row.amount}`;
                              return (
                                <div
                                  key={`future-month-${row.month}`}
                                  className="native-dividends-month-item"
                                  title={title}
                                >
                                  <div className="native-dividends-month-bar-wrap">
                                    {value > 0 && (
                                      <small className="native-dividends-month-value">
                                        {formatRubCompact(value)}
                                      </small>
                                    )}
                                    <span
                                      className="native-dividends-month-bar is-future"
                                      style={{ height: toBarHeight(value, futureRowsMax, 2) }}
                                    />
                                  </div>
                                  <span className="native-dividends-month-name">
                                    {monthLabelShort(row.month)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="native-analytics-empty">Нет данных.</div>
                        )}
                      </article>

                      <article className="native-panel native-dividends-card">
                        <div className="native-dividends-card-head">
                          <div className="native-analytics-title-row">
                            <h3>Полученные дивиденды</h3>
                            <AnalyticsCommentHint
                              what="Фактически зачисленные дивиденды по месяцам."
                              formula="Берутся только проведенные операции начисления дивидендов и группируются по месяцу."
                            />
                          </div>
                          <span>По месяцам</span>
                        </div>
                        <div className="native-dividends-inline-metrics">
                          <div>
                            <small>Всего</small>
                            <strong>{formatRub(dividendsTotal)}</strong>
                          </div>
                          <div>
                            <small>В месяц</small>
                            <strong>{formatRub(dividendsAvg)}</strong>
                          </div>
                        </div>
                        {receivedRows12.length ? (
                          <div className="native-dividends-month-chart">
                            {receivedRows12.map((row) => {
                              const value = Number(row.value) || 0;
                              const details = dividendsDetailsByMonth.get(row.month) || [];
                              const topTicker = details[0]?.ticker || "";
                              const title = topTicker
                                ? `${row.month}: ${row.amount} (${topTicker})`
                                : `${row.month}: ${row.amount}`;
                              return (
                                <div
                                  key={`received-month-${row.month}`}
                                  className="native-dividends-month-item"
                                  title={title}
                                >
                                  <div className="native-dividends-month-bar-wrap">
                                    {value > 0 && (
                                      <small className="native-dividends-month-value">
                                        {formatRubCompact(value)}
                                      </small>
                                    )}
                                    <span
                                      className="native-dividends-month-bar is-received"
                                      style={{ height: toBarHeight(value, receivedRowsMax, 2) }}
                                    />
                                  </div>
                                  <span className="native-dividends-month-name">
                                    {monthLabelShortYear(row.month)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="native-analytics-empty">Нет данных.</div>
                        )}
                      </article>

                      <article className="native-panel native-dividends-card">
                        <div className="native-dividends-card-head">
                          <div className="native-analytics-title-row">
                            <h3>Полученные дивиденды</h3>
                            <AnalyticsCommentHint
                              what="Распределение полученных дивидендов по конкретным активам."
                              formula="Сумма дивидендов по активу = сумма всех фактических дивидендных начислений по активу."
                            />
                          </div>
                          <span>По активам</span>
                        </div>
                        {receivedByAssetRows.length ? (
                          <div className="native-dividends-asset-chart">
                            {receivedByAssetRows.map((row) => (
                              <div
                                key={`received-asset-${row.id}`}
                                className="native-dividends-asset-item"
                                title={`${row.label}: ${row.valueText}`}
                              >
                                <div className="native-dividends-asset-bar-wrap">
                                  <small>{formatRubCompact(row.value)}</small>
                                  <span
                                    className="native-dividends-asset-bar is-asset"
                                    style={{
                                      height: toBarHeight(row.value, receivedByAssetMax, 2),
                                      background: row.color,
                                    }}
                                  />
                                </div>
                                <span className="native-dividends-asset-name">{row.shortLabel}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="native-analytics-empty">Нет данных.</div>
                        )}
                      </article>
                    </section>

                    <section className="native-panel native-dividends-growth-panel">
                      <div className="native-dividends-card-head">
                        <div className="native-analytics-title-row">
                          <h3>Рост дивидендов</h3>
                          <AnalyticsCommentHint
                            what="Сравнение полученных и прогнозных выплат по периодам для оценки тренда роста."
                            formula="Темп роста = (текущий период - базовый период) / базовый период × 100%."
                          />
                        </div>
                      </div>
                      {dividendsGrowthComparison.rows.length ? (
                        <>
                          <div className="native-dividends-growth-legend">
                            <span>
                              <i className="is-received" />
                              {dividendsGrowthComparison.receivedYearLabel}
                            </span>
                            <span>
                              <i className="is-forecast" />
                              {dividendsGrowthComparison.forecastYearLabel}
                            </span>
                          </div>
                          <div className="native-dividends-growth-chart">
                            {dividendsGrowthComparison.rows.map((row) => (
                              <div key={row.id} className="native-dividends-growth-item">
                                <div className="native-dividends-growth-bars">
                                  <span
                                    className="native-dividends-growth-bar is-received"
                                    style={{ height: toBarHeight(row.received, dividendsGrowthMax, 2) }}
                                  />
                                  <span
                                    className="native-dividends-growth-bar is-forecast"
                                    style={{ height: toBarHeight(row.forecast, dividendsGrowthMax, 2) }}
                                  />
                                </div>
                                <span className="native-dividends-growth-label">{row.label}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="native-analytics-empty">Нет данных.</div>
                      )}
                    </section>
                  </div>
                )}

                {analyticsTab === "growth" && (
                  <div className="native-tab-content native-growth-tab">
                    <div className="native-analytics-tab-head">
                      <h3>Рост портфеля</h3>
                      <AnalyticsCommentHint
                        what="Показывает динамику стоимости и прибыли портфеля относительно бенчмарка."
                        formula="Дельта к бенчмарку = изменение портфеля - изменение бенчмарка за выбранный период."
                      />
                    </div>
                    <section className="native-panel native-growth-benchmark-strip">
                      <div className="native-growth-benchmark-left">
                        <strong>Бенчмарки:</strong>
                        <span className="native-growth-badge">IMOEX</span>
                        <button type="button" className="native-growth-link-btn">
                          Выбрать
                        </button>
                      </div>
                      <button type="button" className="native-growth-link-btn">
                        Как это работает?
                      </button>
                    </section>

                    <section className="native-panel native-growth-card">
                      <div className="native-growth-card-head">
                        <div className="native-analytics-title-row">
                          <h3>Стоимость портфеля</h3>
                          <AnalyticsCommentHint
                            what="График показывает изменение общей стоимости портфеля, вложений и бенчмарка."
                            formula="Стоимость = сумма текущей стоимости всех позиций + свободные денежные средства."
                          />
                        </div>
                        <button type="button" className="native-growth-dots-btn">•••</button>
                      </div>

                      <div className="native-growth-note">
                        Портфель обгоняет IMOEX на {formatSignedRub(growthValueChart.benchmarkGap)} (
                        {formatPercent(growthValueChart.benchmarkGapPct, true)}) за последний год
                      </div>

                      <div className="native-growth-toolbar">
                        <div className="native-growth-range-tabs">
                          {growthRangeOptions.map((range) => (
                            <button
                              key={`growth-range-top-${range}`}
                              type="button"
                              className={range === "1г" ? "is-active" : ""}
                            >
                              {range}
                            </button>
                          ))}
                        </div>
                        <div className="native-growth-range-meta">
                          <span>{growthValueChart.rangeLabel}</span>
                          <span className="is-portfolio">
                            • {formatSignedRub(growthValueChart.portfolioDelta)}
                          </span>
                          <span className="is-benchmark">
                            • {formatSignedRub(growthValueChart.benchmarkDelta)}
                          </span>
                        </div>
                      </div>

                      <div className="native-growth-line-chart">
                        <svg
                          viewBox={`0 0 ${growthValueChart.width} ${growthValueChart.height}`}
                          preserveAspectRatio="none"
                        >
                          {growthValueChart.yTicks.map((tick, index) => (
                            <g key={`growth-top-grid-${index}`}>
                              <line
                                x1="0"
                                y1={tick.y}
                                x2={growthValueChart.width}
                                y2={tick.y}
                                className="native-growth-grid-line"
                              />
                              <text
                                x="4"
                                y={Math.max(12, tick.y - 6)}
                                className="native-growth-grid-label"
                              >
                                {formatAxisRub(tick.value)}
                              </text>
                            </g>
                          ))}

                          <path d={growthValueChart.portfolioAreaPath} className="native-growth-path-area" />
                          <path d={growthValueChart.portfolioPath} className="native-growth-path-line is-portfolio" />
                          <path d={growthValueChart.benchmarkPath} className="native-growth-path-line is-benchmark" />
                          <path d={growthValueChart.investedPath} className="native-growth-path-line is-invested" />
                        </svg>

                        <div className="native-growth-x-labels">
                          {growthValueChart.monthTicks.map((tick) => (
                            <span
                              key={`growth-top-month-${tick.index}-${tick.label}`}
                              style={{ left: `${(tick.index / (growthValueChart.pointsCount - 1)) * 100}%` }}
                            >
                              {tick.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="native-growth-legend-row">
                        <span>
                          <i className="is-portfolio" />
                          Портфель
                        </span>
                        <span>
                          <i className="is-benchmark" />
                          IMOEX
                        </span>
                        <span>
                          <i className="is-invested" />
                          Вложения
                        </span>
                      </div>
                    </section>

                    <section className="native-panel native-growth-card">
                      <div className="native-growth-card-head">
                        <div className="native-analytics-title-row">
                          <h3>Прибыль портфеля</h3>
                          <AnalyticsCommentHint
                            what="Динамика накопленной прибыли портфеля с учетом выплат и издержек."
                            formula="Прибыль = текущая стоимость + результат сделок + дивиденды/купоны - комиссии - налоги."
                          />
                        </div>
                        <button type="button" className="native-growth-dots-btn">•••</button>
                      </div>

                      <div className="native-growth-mini-benchmark">
                        <strong>Бенчмарки:</strong>
                        <span className="native-growth-badge">IMOEX</span>
                        <button type="button" className="native-growth-link-btn">
                          Сравнить
                        </button>
                      </div>

                      <div className="native-growth-toolbar">
                        <div className="native-growth-range-tabs">
                          {growthRangeOptions.map((range) => (
                            <button
                              key={`growth-range-profit-${range}`}
                              type="button"
                              className={range === "1г" ? "is-active" : ""}
                            >
                              {range}
                            </button>
                          ))}
                        </div>
                        <div className="native-growth-range-meta">
                          <span>{growthProfitChart.rangeLabel}</span>
                          <span className="is-loss">
                            • {formatSignedRub(growthProfitChart.chartDelta)} (
                            {formatPercent(growthProfitChart.chartDeltaPct, true)})
                          </span>
                        </div>
                      </div>

                      <div className="native-growth-line-chart">
                        <svg
                          viewBox={`0 0 ${growthProfitChart.width} ${growthProfitChart.height}`}
                          preserveAspectRatio="none"
                        >
                          {growthProfitChart.yTicks.map((tick, index) => (
                            <g key={`growth-profit-grid-${index}`}>
                              <line
                                x1="0"
                                y1={tick.y}
                                x2={growthProfitChart.width}
                                y2={tick.y}
                                className="native-growth-grid-line"
                              />
                              <text
                                x="4"
                                y={Math.max(12, tick.y - 6)}
                                className="native-growth-grid-label"
                              >
                                {formatAxisRub(tick.value)}
                              </text>
                            </g>
                          ))}

                          <line
                            x1="0"
                            y1={growthProfitChart.zeroY}
                            x2={growthProfitChart.width}
                            y2={growthProfitChart.zeroY}
                            className="native-growth-zero-line"
                          />
                          <path d={growthProfitChart.areaPath} className="native-growth-path-area is-loss" />
                          <path d={growthProfitChart.linePath} className="native-growth-path-line is-loss" />
                        </svg>

                        <div className="native-growth-x-labels">
                          {growthProfitChart.monthTicks.map((tick) => (
                            <span
                              key={`growth-profit-month-${tick.index}-${tick.label}`}
                              style={{ left: `${(tick.index / (growthProfitChart.pointsCount - 1)) * 100}%` }}
                            >
                              {tick.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="native-panel native-growth-card">
                      <div className="native-growth-card-head">
                        <div className="native-analytics-title-row">
                          <h3>Динамика прибыли портфеля</h3>
                          <AnalyticsCommentHint
                            what="Помесячные столбцы показывают, как менялась прибыльность портфеля."
                            formula="Месячная доходность = (стоимость конца месяца - стоимость начала месяца) / стоимость начала × 100%."
                          />
                        </div>
                        <button type="button" className="native-growth-dots-btn">•••</button>
                      </div>

                      <div className="native-growth-mini-benchmark">
                        <strong>Бенчмарки:</strong>
                        <span className="native-growth-badge">IMOEX</span>
                        <button type="button" className="native-growth-link-btn">
                          Сравнить
                        </button>
                      </div>

                      <div className="native-growth-year-tabs">
                        {["все", "12м", "2026", "2025", "2024", "2023", "2022", "2021"].map((tab) => (
                          <button
                            key={`growth-year-${tab}`}
                            type="button"
                            className={tab === "12м" ? "is-active" : ""}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      <div className="native-growth-month-bars">
                        <span className="native-growth-month-zero" />
                        {growthMonthlyBars.map((row) => {
                          const barSize = `${Math.max(
                            2,
                            Math.min(46, (Math.abs(row.value) / growthMonthlyMaxAbs) * 46)
                          )}%`;
                          const isPositive = row.value >= 0;
                          return (
                            <div key={row.id} className="native-growth-month-item">
                              <div className="native-growth-month-bar-wrap">
                                <span
                                  className={`native-growth-month-bar ${isPositive ? "is-positive" : "is-negative"}`}
                                  style={isPositive ? { bottom: "50%", height: barSize } : { top: "50%", height: barSize }}
                                />
                                <small
                                  className={`native-growth-month-value ${isPositive ? "is-positive" : "is-negative"}`}
                                  style={isPositive ? { bottom: `calc(50% + ${barSize})` } : { top: `calc(50% + ${barSize})` }}
                                >
                                  {formatPercent(row.value, true)}
                                </small>
                              </div>
                              <span className="native-growth-month-label">{row.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="native-growth-legend-row">
                        <span>
                          <i className="is-positive" />
                          Портфель
                        </span>
                      </div>

                      <button type="button" className="native-growth-more-link">
                        Подробнее →
                      </button>
                    </section>

                    <section className="native-panel native-growth-card">
                      <div className="native-growth-card-head">
                        <div className="native-analytics-title-row">
                          <h3>Прибыльность активов</h3>
                          <AnalyticsCommentHint
                            what="Сравнение доходности отдельных активов за выбранный период."
                            formula="Доходность актива = (текущая стоимость + выплаты - вложено) / вложено × 100%."
                          />
                        </div>
                        <button type="button" className="native-growth-dots-btn">•••</button>
                      </div>

                      <div className="native-growth-range-tabs native-growth-range-tabs-assets">
                        {["1д", "7д", "1м", "3м", "6м", "YTD", "1г", "5л", "все"].map((range) => (
                          <button
                            key={`growth-range-assets-${range}`}
                            type="button"
                            className={range === "все" ? "is-active" : ""}
                          >
                            {range}
                          </button>
                        ))}
                      </div>

                      <div className="native-growth-assets-axis">
                        {growthAssetAxisTicks.map((tick) => (
                          <span key={`asset-axis-${tick}`}>{tick}%</span>
                        ))}
                      </div>

                      <div className="native-growth-assets-list">
                        {growthAssetRows.map((row) => {
                          const width = `${(Math.abs(row.value) / growthAssetMaxAbs) * 100}%`;
                          const positive = row.value >= 0;
                          return (
                            <div key={row.id} className="native-growth-assets-row">
                              <span className="native-growth-assets-name">{row.label}</span>
                              <div className="native-growth-assets-track">
                                <span
                                  className={`native-growth-assets-bar ${positive ? "is-positive" : "is-negative"}`}
                                  style={{ width }}
                                />
                              </div>
                              <strong className={positive ? "pos" : "neg"}>
                                {formatPercent(row.value, true)}
                              </strong>
                            </div>
                          );
                        })}
                      </div>

                      <button type="button" className="native-growth-more-link">
                        Подробнее →
                      </button>
                    </section>
                  </div>
                )}

                {analyticsTab === "metrics" && (
                  <div className="native-tab-content native-metrics-tab">
                    <div className="native-analytics-tab-head">
                      <h3>Метрики риска и эффективности</h3>
                      <AnalyticsCommentHint
                        what="Набор риск- и доходность-метрик для оценки качества управления портфелем."
                        formula="TWR, бета, Sharpe и Sortino считают доходность относительно риска на исторических рядах портфеля."
                      />
                    </div>
                    <section className="native-metrics-grid">
                      <article className="native-panel native-metrics-card">
                        <div className="native-metrics-card-head">
                          <div className="native-analytics-title-row">
                            <h3>TWR портфеля</h3>
                            <AnalyticsCommentHint
                              what="Time-Weighted Return отражает чистую доходность управления без влияния вводов/выводов."
                              formula="TWR = произведение доходностей периодов между денежными потоками - 1."
                            />
                          </div>
                          <span>β</span>
                        </div>
                        <p className="native-metrics-card-sub">
                          Показывает реальную доходность портфеля, исключая влияние пополнений и снятий.
                        </p>
                        <div className="native-metrics-main-value">{formatPercent(twrPortfolioPct)}</div>
                        <div className="native-metrics-pill-row">
                          <span className="native-metrics-pill">
                            IMOEX: {formatPercent(metricsBenchmarkPct, true)}
                          </span>
                          <span
                            className={`native-metrics-pill ${twrDeltaPct >= 0 ? "is-good" : "is-warn"}`}
                          >
                            {formatPercent(twrDeltaPct, true)} {twrDeltaLabel}
                          </span>
                        </div>
                      </article>

                      <article className="native-panel native-metrics-card">
                        <div className="native-metrics-card-head">
                          <div className="native-analytics-title-row">
                            <h3>P/E портфеля акций</h3>
                            <AnalyticsCommentHint
                              what="Показывает, насколько дорого оценен блок акций в портфеле по прибыли компаний."
                              formula="P/E = рыночная стоимость акций / суммарная прибыль (EPS) компаний в составе."
                            />
                          </div>
                        </div>
                        <p className="native-metrics-card-sub">
                          Отношение стоимости акций к прибыли компаний.
                        </p>
                        <div className="native-metrics-main-value">{formatRatioX(metricsPeRatio)}</div>
                        <div className="native-metrics-scale">
                          <div className="native-metrics-scale-track" />
                          <span className="native-metrics-scale-tick is-left">0x</span>
                          <span className="native-metrics-scale-tick is-right">70x</span>
                          <span
                            className="native-metrics-scale-dot is-portfolio"
                            style={{ left: `${metricsPeLeft}%` }}
                          />
                          <span
                            className="native-metrics-scale-label is-portfolio"
                            style={{ left: `${metricsPeLeft}%` }}
                          >
                            Портфель
                          </span>
                        </div>
                      </article>

                      <article className="native-panel native-metrics-card">
                        <div className="native-metrics-card-head">
                          <div className="native-analytics-title-row">
                            <h3>Волатильность/бета</h3>
                            <AnalyticsCommentHint
                              what="Бета измеряет чувствительность портфеля к движению рынка."
                              formula="β = cov(Rпортфеля, Rрынка) / var(Rрынка)."
                            />
                          </div>
                        </div>
                        <p className="native-metrics-card-sub">
                          Волатильность портфеля по отношению к рыночной.
                        </p>
                        <div className="native-metrics-note">
                          <span>
                            Волатильность вашего портфеля (β = {formatDecimal(metricsBeta, 3)})
                          </span>
                          <strong className={`is-${betaTone}`}>{betaText}</strong>
                        </div>
                        <div className="native-metrics-scale">
                          <div className="native-metrics-scale-track" />
                          <span className="native-metrics-scale-tick is-left">0β</span>
                          <span className="native-metrics-scale-tick is-right">1.6β</span>
                          <span
                            className="native-metrics-scale-dot is-market"
                            style={{ left: `${metricsMarketBetaLeft}%` }}
                          />
                          <span
                            className="native-metrics-scale-label is-market"
                            style={{ left: `${metricsMarketBetaLeft}%` }}
                          >
                            Рынок
                          </span>
                          <span
                            className="native-metrics-scale-dot is-portfolio"
                            style={{ left: `${metricsBetaLeft}%` }}
                          />
                          <span
                            className="native-metrics-scale-label is-portfolio"
                            style={{ left: `${metricsBetaLeft}%` }}
                          >
                            Портфель
                          </span>
                        </div>
                      </article>

                      <article className="native-panel native-metrics-card">
                        <div className="native-metrics-card-head">
                          <div className="native-analytics-title-row">
                            <h3>Доходность с учетом риска/Коэффициент Шарпа</h3>
                            <AnalyticsCommentHint
                              what="Оценивает, сколько избыточной доходности получено на единицу полного риска."
                              formula="Sharpe = (Rпортфеля - Rбезрисковая) / σпортфеля."
                            />
                          </div>
                        </div>
                        <p className="native-metrics-card-sub">
                          Показывает насколько доходность компенсирует риск.
                        </p>
                        <div className="native-metrics-note">
                          <span>Коэффициент Шарпа: {formatDecimal(metricsSharpe, 2)}</span>
                          <strong className={`is-${sharpeTone}`}>{sharpeText}</strong>
                        </div>
                        <div className="native-metrics-scale">
                          <div className="native-metrics-scale-track" />
                          <span className="native-metrics-scale-tick is-left">-1</span>
                          <span className="native-metrics-scale-tick is-right">2.5</span>
                          <span
                            className="native-metrics-scale-dot is-market"
                            style={{ left: `${metricsBenchmarkSharpeLeft}%` }}
                          />
                          <span
                            className="native-metrics-scale-label is-market"
                            style={{ left: `${metricsBenchmarkSharpeLeft}%` }}
                          >
                            IMOEX
                          </span>
                          <span
                            className="native-metrics-scale-dot is-portfolio"
                            style={{ left: `${metricsSharpeLeft}%` }}
                          />
                          <span
                            className="native-metrics-scale-label is-portfolio"
                            style={{ left: `${metricsSharpeLeft}%` }}
                          >
                            Портфель
                          </span>
                        </div>
                      </article>

                      <article className="native-panel native-metrics-card native-metrics-card-wide">
                        <div className="native-metrics-card-head">
                          <div className="native-analytics-title-row">
                            <h3>Доходность с учетом риска/Коэффициент Сортино</h3>
                            <AnalyticsCommentHint
                              what="Показывает доходность на единицу только негативной волатильности."
                              formula="Sortino = (Rпортфеля - Rцелевая) / downside deviation."
                            />
                          </div>
                        </div>
                        <p className="native-metrics-card-sub">
                          Учитывает только отрицательную волатильность и качество доходности.
                        </p>
                        <div className="native-metrics-note">
                          <span>Коэффициент Сортино: {formatDecimal(metricsSortino, 3)}</span>
                          <strong className={`is-${sortinoTone}`}>{sortinoText}</strong>
                        </div>
                        <div className="native-metrics-scale">
                          <div className="native-metrics-scale-track" />
                          <span className="native-metrics-scale-tick is-left">-1</span>
                          <span className="native-metrics-scale-tick is-right">3.5</span>
                          <span
                            className="native-metrics-scale-dot is-market"
                            style={{ left: `${metricsBenchmarkSortinoLeft}%` }}
                          />
                          <span
                            className="native-metrics-scale-label is-market"
                            style={{ left: `${metricsBenchmarkSortinoLeft}%` }}
                          >
                            IMOEX
                          </span>
                          <span
                            className="native-metrics-scale-dot is-portfolio"
                            style={{ left: `${metricsSortinoLeft}%` }}
                          />
                          <span
                            className="native-metrics-scale-label is-portfolio"
                            style={{ left: `${metricsSortinoLeft}%` }}
                          >
                            Портфель
                          </span>
                        </div>
                      </article>
                    </section>

                    <section className="native-analytics-section native-metrics-details-panel">
                      <div className="native-analytics-title-row">
                        <h3>Детализация прибыли</h3>
                        <AnalyticsCommentHint
                          what="Расклад прибыли портфеля по источникам: рынок, сделки, выплаты и издержки."
                          formula="Итоговая прибыль = текущая стоимость + сделки + купоны + дивиденды - комиссии - налоги."
                        />
                      </div>
                      <table className="native-simple-table">
                        <tbody>
                          <tr>
                            <td>Текущая стоимость</td>
                            <td>{analyticsQuery.data?.profitBreakdown?.currentValueRub || "-"}</td>
                          </tr>
                          <tr>
                            <td>Результат сделок</td>
                            <td>{analyticsQuery.data?.profitBreakdown?.tradesNetRub || "-"}</td>
                          </tr>
                          <tr>
                            <td>Купоны</td>
                            <td>{analyticsQuery.data?.profitBreakdown?.couponsRub || "-"}</td>
                          </tr>
                          <tr>
                            <td>Дивиденды</td>
                            <td>{analyticsQuery.data?.profitBreakdown?.dividendsRub || "-"}</td>
                          </tr>
                          <tr>
                            <td>Комиссии</td>
                            <td>
                              {formatSignedRub(
                                -Math.abs(
                                  metricNumber(
                                    analyticsQuery.data?.profitBreakdown?.commissions,
                                    analyticsQuery.data?.profitBreakdown?.commissionsRub || "0"
                                  )
                                )
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>Налоги</td>
                            <td>
                              {formatSignedRub(
                                -Math.abs(
                                  metricNumber(
                                    analyticsQuery.data?.profitBreakdown?.taxes,
                                    analyticsQuery.data?.profitBreakdown?.taxesRub || "0"
                                  )
                                )
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </section>
                  </div>
                )}

                {analyticsTab === "bonds" && (
                  <div className="native-tab-content native-bonds-tab">
                    <div className="native-analytics-tab-head">
                      <h3>Аналитика облигаций</h3>
                      <AnalyticsCommentHint
                        what="Доходность, дюрация и структура облигационной части портфеля."
                        formula="Доходности рассчитываются по денежным потокам облигаций; дюрация показывает чувствительность к ставке."
                      />
                    </div>
                    <section className="native-bonds-kpi-grid">
                      <article className="native-panel native-bonds-kpi-card">
                        <div className="native-bonds-kpi-label">
                          <span className="native-bonds-kpi-icon is-cyan">↗</span>
                          <span>Текущая доходность</span>
                          <AnalyticsCommentHint
                            what="Годовая купонная доходность облигационной части портфеля на текущий момент."
                            formula="Текущая доходность = купонные выплаты за 12м / текущая стоимость облигаций × 100%."
                          />
                        </div>
                        <div className="native-bonds-kpi-value">
                          {formatDecimal(bondsMetrics.currentYield, 2)}%
                        </div>
                      </article>

                      <article className="native-panel native-bonds-kpi-card">
                        <div className="native-bonds-kpi-label">
                          <span className="native-bonds-kpi-icon is-cyan">↗</span>
                          <span>Доходность к погашению</span>
                          <AnalyticsCommentHint
                            what="Ожидаемая годовая доходность при удержании облигаций до погашения."
                            formula="Оценка строится от текущей доходности с поправкой на средний срок до погашения."
                          />
                        </div>
                        <div className="native-bonds-kpi-value">
                          {formatDecimal(bondsMetrics.yieldToMaturity, 2)}%
                          <small>{formatDecimal(bondsMetrics.dealsYield, 1)}% по сделкам</small>
                        </div>
                      </article>

                      <article className="native-panel native-bonds-kpi-card">
                        <div className="native-bonds-kpi-label">
                          <span className="native-bonds-kpi-icon is-cyan">↗</span>
                          <span>Эффективная доходность</span>
                          <AnalyticsCommentHint
                            what="Доходность с учетом реинвестирования купонных потоков."
                            formula="Используется оценка эффективной ставки на базе доходности к погашению."
                          />
                        </div>
                        <div className="native-bonds-kpi-value">
                          {formatDecimal(bondsMetrics.effectiveYield, 2)}%
                          <small>{formatDecimal(bondsMetrics.effectiveDealsYield, 2)}% по сделкам</small>
                        </div>
                      </article>

                      <article className="native-panel native-bonds-kpi-card">
                        <div className="native-bonds-kpi-label">
                          <span className="native-bonds-kpi-icon is-purple">◉</span>
                          <span>Дюрация / риск</span>
                          <AnalyticsCommentHint
                            what="Индикатор чувствительности цены облигаций к изменению процентной ставки."
                            formula="Дюрация = средневзвешенный срок поступления денежных потоков (в годах)."
                          />
                        </div>
                        <div className="native-bonds-kpi-value">
                          {formatDecimal(bondsMetrics.durationRisk, 1)}
                        </div>
                      </article>
                    </section>

                    <section className="native-panel native-bonds-allocation-card">
                      <div className="native-bonds-allocation-head">
                        <div className="native-bonds-mode-switch">
                          <button type="button" className="is-active">
                            Тип
                          </button>
                          <button type="button">Срок</button>
                        </div>
                        <label className="native-bonds-assets-toggle">
                          <input type="checkbox" checked readOnly />
                          <span>Показать активы</span>
                        </label>
                      </div>
                      {bondsAllocationRows.length ? (
                        <div className="native-bonds-allocation-body">
                          <div className="native-bonds-donut-wrap">
                            <svg viewBox="0 0 240 240" className="native-bonds-donut-svg">
                              <circle cx="120" cy="120" r="90" className="native-bonds-donut-track" />
                              {bondsAllocationSlices.map((slice) => (
                                <path
                                  key={`bond-slice-${slice.id}`}
                                  d={slice.path}
                                  className="native-bonds-donut-segment"
                                  style={{ stroke: slice.color }}
                                />
                              ))}
                            </svg>
                            <div className="native-bonds-donut-center">
                              <strong>
                                {formatDecimal(Math.max(0, bondsAllocationRows[0]?.sharePct || 0), 1)}%
                              </strong>
                            </div>
                          </div>

                          <div className="native-bonds-legend-list">
                            {bondsAllocationRows.map((row, index) => (
                              <div key={`bond-legend-${row.id}`} className="native-bonds-legend-item">
                                <div className="native-bonds-legend-head">
                                  <span
                                    className="native-bonds-legend-dot"
                                    style={{ backgroundColor: row.color }}
                                  />
                                  <span className="native-bonds-legend-name" title={row.name}>
                                    {row.name}
                                  </span>
                                  <strong>{formatDecimal(row.sharePct, 0)}%</strong>
                                  <small>({row.valueText})</small>
                                </div>
                                <div className="native-bonds-legend-track">
                                  <span
                                    style={{
                                      width: `${Math.max(2, row.sharePct)}%`,
                                      backgroundColor: row.color,
                                    }}
                                  />
                                </div>
                                {index === 0 && (
                                  <div className="native-bonds-legend-chip">
                                    {row.shortName} {formatDecimal(row.sharePct, 0)}%
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="native-analytics-empty">Нет данных.</div>
                      )}
                    </section>

                    <section className="native-panel native-bonds-companies-card">
                      <div className="native-analytics-title-row">
                        <h3>Облигации по компаниям</h3>
                        {analyticsQuery.data?.bondCompaniesCount && (
                          <span className="native-analytics-subtle">
                            {analyticsQuery.data?.bondCompaniesCount}
                          </span>
                        )}
                      </div>
                      {bondCompaniesRows.length ? (
                        <div className="native-analytics-card-list">
                          {bondCompaniesRows.map((row) => (
                            <article key={row.id} className="native-analytics-card-block">
                              <div className="native-card-line">
                                <strong>{row.name}</strong>
                                <span className="native-pill">{row.percentText}</span>
                              </div>
                              <div className="native-analytics-subtle">{row.valueText}</div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="native-analytics-empty">Нет данных.</div>
                      )}
                    </section>

                    <section className="native-panel native-bonds-redemptions-card">
                      <div className="native-bonds-redemptions-head">
                        <div className="native-analytics-title-row">
                          <h3>Погашения</h3>
                          <AnalyticsCommentHint
                            what="График сроков погашения и оферт облигаций в портфеле."
                            formula="Позиции размещаются на временной шкале по датам погашения и оферт."
                          />
                        </div>
                        <div className="native-bonds-redemptions-legend">
                          <span>
                            <i className="is-redemption" />
                            Погашение
                          </span>
                          <span>
                            <i className="is-offer" />
                            Оферта
                          </span>
                        </div>
                      </div>

                      {bondsTimeline.rows.length ? (
                        <div className="native-bonds-timeline">
                          <div className="native-bonds-timeline-rows">
                            {bondsTimeline.rows.map((row) => (
                              <div key={row.rowId} className="native-bonds-timeline-row">
                                <span className="native-bonds-timeline-name" title={`${row.name}: ${row.amountText}`}>
                                  {row.name}
                                </span>
                                <div className="native-bonds-timeline-track">
                                  <span
                                    className="native-bonds-timeline-segment is-redemption"
                                    style={{
                                      left: `${row.leftPct}%`,
                                      width: `${row.widthPct}%`,
                                    }}
                                  />
                                  {row.offerPct > 0 && (
                                    <span
                                      className="native-bonds-timeline-segment is-offer"
                                      style={{
                                        left: `${row.leftPct + Math.max(0, row.widthPct - row.offerPct)}%`,
                                        width: `${row.offerPct}%`,
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="native-bonds-timeline-axis">
                            {bondsTimeline.months.map((month) => (
                              <span key={month.id}>{month.label}</span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="native-analytics-empty">Нет данных.</div>
                      )}
                    </section>
                  </div>
                )}

                {analyticsTab === "report" && (
                  <div className="native-tab-content native-report-tab">
                    <div className="native-analytics-tab-head">
                      <h3>Отчет по периодам</h3>
                      <AnalyticsCommentHint
                        what="Сводный управленческий отчет по стоимости, доходности, оборотам и денежным потокам."
                        formula="Показатели считаются по выбранной метрике и периоду с группировкой по месяцам или кварталам."
                      />
                    </div>
                    <section className="native-panel native-report-benchmark-strip">
                      <div className="native-growth-benchmark-left">
                        <strong>Бенчмарки:</strong>
                        <span className="native-growth-badge">IMOEX</span>
                        <button type="button" className="native-growth-link-btn">
                          Выбрать
                        </button>
                      </div>
                      <button type="button" className="native-growth-link-btn">
                        Как это работает?
                      </button>
                    </section>

                    <section className="native-panel native-report-card">
                      <div className="native-report-hint-row">
                        <span>💡 Нажмите на строку в таблице, чтобы она появилась на графике</span>
                        <AnalyticsCommentHint
                          what="Отчет формируется из исторических снимков портфеля за выбранный период."
                          formula="Показатели периода считаются как изменение между соседними точками истории с учетом притоков/оттоков."
                        />
                        <button
                          type="button"
                          className="native-growth-link-btn"
                          onClick={() => setReportActiveMetric(REPORT_DEFAULT_METRIC)}
                        >
                          Сбросить все
                        </button>
                      </div>

                      {!!reportMonthsData.length ? (
                        <>
                          <div className="native-report-chart-wrap">
                            <svg
                              viewBox={`0 0 ${reportChart.width} ${reportChart.height}`}
                              preserveAspectRatio="none"
                            >
                              {reportChart.yTicks.map((tick, index) => (
                                <g key={`report-grid-${index}`}>
                                  <line
                                    x1="0"
                                    y1={tick.y}
                                    x2={reportChart.width}
                                    y2={tick.y}
                                    className="native-growth-grid-line"
                                  />
                                  <text x="4" y={Math.max(12, tick.y - 4)} className="native-growth-grid-label">
                                    {formatReportAxis(tick.value, reportActiveMeta.metricType)}
                                  </text>
                                </g>
                              ))}
                              {reportChart.hasNegative && (
                                <line
                                  x1="0"
                                  y1={reportChart.zeroY}
                                  x2={reportChart.width}
                                  y2={reportChart.zeroY}
                                  className="native-growth-zero-line"
                                />
                              )}
                              {reportChart.bars.map((bar) => (
                                <rect
                                  key={`report-bar-${bar.index}`}
                                  x={bar.x}
                                  y={bar.y}
                                  width={bar.width}
                                  height={bar.height}
                                  rx="4"
                                  className={
                                    bar.positive
                                      ? "native-report-bar is-positive"
                                      : "native-report-bar is-negative"
                                  }
                                />
                              ))}
                            </svg>

                            <div className="native-report-x-labels">
                              {reportMonthsData.map((month, index) => (
                                <span
                                  key={`report-month-label-${month.id}`}
                                  style={{
                                    left: `${(index / Math.max(1, reportMonthsData.length - 1)) * 100}%`,
                                  }}
                                >
                                  {month.label}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="native-report-summary-row">
                            <span className="native-report-active-metric">
                              {reportActiveMeta.label}: {formatReportValue(reportSummaryValue, reportActiveMeta.metricType)}
                            </span>
                            <span className="native-report-range-label">{reportChart.rangeLabel}</span>
                          </div>

                          <div className="native-report-controls-row">
                            <div className="native-report-downloads">
                              <button type="button" className="native-report-download-btn" onClick={downloadReportPdf}>
                                Скачать в PDF
                              </button>
                              <button type="button" className="native-report-download-btn" onClick={downloadReportExcel}>
                                Скачать в Excel
                              </button>
                            </div>
                            <div className="native-report-selects">
                              <label>
                                <span>Группировка</span>
                                <select
                                  value={reportGrouping}
                                  onChange={(event) =>
                                    setReportGrouping(event.target.value === "quarters" ? "quarters" : "months")
                                  }
                                >
                                  <option value="months">По месяцам</option>
                                  <option value="quarters">По кварталам</option>
                                </select>
                              </label>
                              <label>
                                <span>Период данных</span>
                                <select
                                  value={reportPeriod}
                                  onChange={(event) =>
                                    setReportPeriod(event.target.value === "3y" ? "3y" : "1y")
                                  }
                                >
                                  <option value="1y">За 1 год</option>
                                  <option value="3y">За 3 года</option>
                                </select>
                              </label>
                            </div>
                          </div>

                          <div className="native-report-table-wrap">
                            <table className="native-report-table">
                              <thead>
                                <tr>
                                  <th>Показатель</th>
                                  {reportMonthsData.map((month) => (
                                    <th key={`report-head-${month.id}`}>{month.label}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {REPORT_TABLE_ROWS.map((row, rowIndex) => {
                                  if (row.kind === "section") {
                                    return (
                                      <tr key={`report-section-${row.label}-${rowIndex}`} className="is-section">
                                        <th scope="row">{row.label}</th>
                                        {reportMonthsData.map((month) => (
                                          <td key={`section-${row.label}-${month.id}`}>—</td>
                                        ))}
                                      </tr>
                                    );
                                  }

                                  const isActive = row.key === reportActiveMetric;
                                  return (
                                    <tr
                                      key={`report-row-${row.key}`}
                                      className={[
                                        "is-metric",
                                        isActive ? "is-active" : "",
                                        row.accent === "main" ? "is-main" : "",
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}
                                      onClick={() => setReportActiveMetric(row.key)}
                                    >
                                      <th scope="row">{row.label}</th>
                                      {reportMonthsData.map((month) => {
                                        const value = month[row.key];
                                        const tone =
                                          row.metricType !== "count"
                                            ? value > 0
                                              ? "pos"
                                              : value < 0
                                                ? "neg"
                                                : ""
                                            : "";
                                        return (
                                          <td key={`report-cell-${row.key}-${month.id}`} className={tone}>
                                            {formatReportValue(value, row.metricType)}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <div className="native-analytics-empty">Нет данных.</div>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        <div className="native-status">{status}</div>
      </main>
    </div>
  );
}
