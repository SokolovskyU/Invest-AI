export type Cashflow = { time: number; amount: number };

export function toNumber(
  value: { units?: string | number; nano?: number } | null | undefined
): number {
  if (!value) return 0;
  const units = typeof value.units === "string" ? Number(value.units) : Number(value.units || 0);
  const nano = Number(value.nano || 0);
  return units + nano / 1e9;
}

export function formatMoney(value: number, currency?: string): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  const cur = (currency || "").toUpperCase();
  try {
    if (cur && cur.length === 3) {
      return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: cur,
        maximumFractionDigits: 2,
      }).format(rounded);
    }
  } catch {
    // ignore formatting errors
  }
  return String(rounded) + (cur ? " " + cur : "");
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  return String(rounded) + "%";
}

export function safePercent(value: number | null, maxAbs = 500): string {
  if (value === null || !Number.isFinite(value)) return "-";
  if (Math.abs(value) > maxAbs) return "-";
  return formatPercent(value);
}

export function formatRiskLevel(value?: string): string {
  switch (value) {
    case "RISK_LEVEL_LOW":
      return "\u041d\u0438\u0437\u043a\u0438\u0439";
    case "RISK_LEVEL_MODERATE":
      return "\u0421\u0440\u0435\u0434\u043d\u0438\u0439";
    case "RISK_LEVEL_HIGH":
      return "\u0412\u044b\u0441\u043e\u043a\u0438\u0439";
    default:
      return "-";
  }
}

export function isCodeName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  const upper = trimmed.toUpperCase();
  if (upper.startsWith("TCS00A")) return true;
  if (upper.startsWith("RU")) return true;
  if (/^[A-Z0-9]{12}$/.test(upper)) return true;
  if (/^[A-Z0-9._-]{6,}$/i.test(trimmed)) {
    const hasDigit = /\d/.test(trimmed);
    const noSpaces = !/\s/.test(trimmed);
    if (noSpaces && (hasDigit || trimmed === upper)) return true;
  }
  return false;
}

export function normalizeBondCompany(name: string): string {
  if (!name) return "Неизвестный эмитент";
  let n = name.trim();
  const tokens = n.split(/\s+/);
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1];
    if (
      /[\d]/.test(last) ||
      /[A-ZА-Я]+\d+/i.test(last) ||
      /[-/]/.test(last)
    ) {
      tokens.pop();
      continue;
    }
    break;
  }
  n = tokens.join(" ").trim();
  if (n.length < 3) return name.trim();
  return n;
}

export function xirr(cashflows: Cashflow[]): number | null {
  if (!cashflows.length) return null;
  const times = cashflows.map((c) => c.time);
  const minT = Math.min(...times);
  const flows = cashflows.map((c) => ({
    t: (c.time - minT) / (1000 * 60 * 60 * 24 * 365),
    a: c.amount,
  }));

  const hasPos = flows.some((f) => f.a > 0);
  const hasNeg = flows.some((f) => f.a < 0);
  if (!hasPos || !hasNeg) return null;

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    let f = 0;
    let df = 0;
    for (const cf of flows) {
      const denom = Math.pow(1 + rate, cf.t);
      f += cf.a / denom;
      df += (-cf.t * cf.a) / (denom * (1 + rate));
    }
    if (Math.abs(f) < 1e-6) return rate;
    if (df === 0) break;
    const next = rate - f / df;
    if (!Number.isFinite(next) || next <= -0.9999) break;
    rate = next;
  }

  let low = -0.9;
  let high = 10;
  const evalNpv = (r: number) =>
    flows.reduce((s, cf) => s + cf.a / Math.pow(1 + r, cf.t), 0);
  let fLow = evalNpv(low);
  let fHigh = evalNpv(high);
  if (fLow * fHigh > 0) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const fMid = evalNpv(mid);
    if (Math.abs(fMid) < 1e-6) return mid;
    if (fLow * fMid <= 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return null;
}
