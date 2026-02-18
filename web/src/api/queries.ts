import { useQuery } from "@tanstack/react-query";
import { fetchJson, postJson } from "./client";

export type HealthResponse = { ok: boolean };
export type MetricsResponse = {
  uptimeSec: number;
  totalRequests: number;
  byStatus: Record<string, number>;
  byRoute: Record<string, number>;
};

export type AccountsResponse = {
  accounts?: Array<{
    id?: string;
    accountId?: string;
    account_id?: string;
    name?: string;
    type?: string;
    status?: string;
  }>;
};

export type PortfolioRow = {
  name: string;
  instrumentType: string;
  rating?: string;
  monthlyCoupon?: string;
  currentPrice: string;
  profitRub: string;
  profitPct: string;
  dayChangeRub?: string;
  dayPriceChangeRub?: string;
  dayChangePct: string;
  dayClosePriceRub?: string;
  dayLastPriceRub?: string;
  dayPriceAvailable?: boolean;
};

export type PortfolioResponse = {
  total: string;
  positions: PortfolioRow[];
  moverPositions: PortfolioRow[];
};

export type AnalyticsPiePoint = {
  label: string;
  value: number;
  valueText: string;
  percentText: string;
};

export type AnalyticsMonthPoint = {
  month: string;
  value: number;
  amount: string;
};

export type AnalyticsIncomeDetailItem = {
  ticker: string;
  eventType: string;
  amount: number;
  amountText: string;
};

export type AnalyticsIncomeDetailsMonth = {
  month: string;
  items: AnalyticsIncomeDetailItem[];
};

export type AnalyticsBreakdownAsset = {
  name: string;
  value: number;
  valueText: string;
  percentText: string;
  percentOfTotal: string;
};

export type AnalyticsBreakdownRow = {
  type: string;
  typeLabel: string;
  value: number;
  valueText: string;
  percentText: string;
  assets: AnalyticsBreakdownAsset[];
};

export type AnalyticsMyAssetRow = {
  id: string;
  type: string;
  assetClassLabel?: string;
  icon: string;
  name: string;
  currencyCode?: string;
  sectorLabel?: string;
  countryCode?: string;
  countryLabel?: string;
  regionLabel?: string;
  quantity: number;
  quantityText: string;
  invested: number;
  investedText: string;
  currentValue: number;
  currentValueText: string;
  passiveIncome: number;
  passiveIncomeText: string;
  assetYield: number;
  assetYieldText: string;
  profitValue: number;
  profitText: string;
  yieldPct: number;
  yieldPctText: string;
  portfolioSharePct: number;
  portfolioSharePctText: string;
};

export type AnalyticsMyAssetsTotals = {
  quantity: number;
  quantityText: string;
  invested: number;
  investedText: string;
  currentValue: number;
  currentValueText: string;
  passiveIncome: number;
  passiveIncomeText: string;
  assetYield: number;
  assetYieldText: string;
  profitValue: number;
  profitText: string;
  yieldPct: number;
  yieldPctText: string;
  portfolioSharePct: number;
  portfolioSharePctText: string;
};

export type AnalyticsProfitBreakdown = {
  currentValue: number;
  currentValueRub: string;
  tradesNet: number;
  tradesNetRub: string;
  coupons: number;
  couponsRub: string;
  dividends: number;
  dividendsRub: string;
  commissions: number;
  commissionsRub: string;
  taxes: number;
  taxesRub: string;
  marketProfitRub: string;
  marketProfitPct: string;
};

export type AnalyticsEvent = {
  date: string;
  name: string;
  eventType: string;
  amount: string;
  quantity?: number;
  quantityText?: string;
  perAssetValue?: number;
  perAssetAmount?: string;
};

export type AnalyticsBondCompany = {
  name: string;
  value: number;
  valueText: string;
  percentText: string;
};

export type AnalyticsResponse = {
  currency: string;
  total: string;
  profitRub: string;
  profitValue: number;
  profitPct: string;
  profitBreakdown: AnalyticsProfitBreakdown;
  yieldPct: string;
  yieldIncomeValue?: number;
  yieldIncomeRub?: string;
  yieldBaseValue?: number;
  yieldBaseRub?: string;
  assetPie: AnalyticsPiePoint[];
  assetBreakdown: AnalyticsBreakdownRow[];
  myAssets: AnalyticsMyAssetRow[];
  myAssetsTotals: AnalyticsMyAssetsTotals;
  bondCompanies: AnalyticsBondCompany[];
  bondCompaniesCount: string;
  incomeNext12: AnalyticsMonthPoint[];
  incomeNext12Details?: AnalyticsIncomeDetailsMonth[];
  passiveIncomeTotal: number;
  passiveIncomeTotalRub: string;
  passiveIncomeBaseValue: number;
  passiveIncomeBaseRub: string;
  passiveIncomeYieldPct: string;
  receivedDividends12: AnalyticsMonthPoint[];
  receivedDividends12Details?: AnalyticsIncomeDetailsMonth[];
  redemptionsNext12: AnalyticsMonthPoint[];
  redemptionsDetails: Array<{ month: string; name: string; amount: string }>;
  upcomingEvents: AnalyticsEvent[];
};

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

export type HistorySnapshotsResponse = {
  accountId?: string | null;
  items: HistorySnapshot[];
};

export function useHealthQuery() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => fetchJson<HealthResponse>("/api/health"),
    staleTime: 10_000,
  });
}

export function useMetricsQuery() {
  return useQuery({
    queryKey: ["metrics"],
    queryFn: () => fetchJson<MetricsResponse>("/api/metrics"),
    staleTime: 10_000,
  });
}

export function useAccountsQuery(token: string) {
  return useAccountsQueryWithOverride(token);
}

export function useAccountsQueryWithOverride(_token: string, enabledOverride?: boolean) {
  const enabled = enabledOverride ?? true;
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => postJson<AccountsResponse>("/api/accounts", {}),
    enabled,
    staleTime: 60_000,
  });
}

export function usePortfolioQuery(token: string, accountId: string) {
  return usePortfolioQueryWithOverride(token, accountId);
}

export function usePortfolioQueryWithOverride(
  _token: string,
  accountId: string,
  enabledOverride?: boolean
) {
  const enabled = enabledOverride ?? accountId.length > 0;
  return useQuery({
    queryKey: ["portfolio", accountId],
    queryFn: () => postJson<PortfolioResponse>("/api/portfolio", { accountId }),
    enabled: enabled && accountId.length > 0,
    staleTime: 30_000,
  });
}

export function useAnalyticsQuery(token: string, accountId: string) {
  return useAnalyticsQueryWithOverride(token, accountId);
}

export function useAnalyticsQueryWithOverride(
  _token: string,
  accountId: string,
  enabledOverride?: boolean
) {
  const enabled = enabledOverride ?? accountId.length > 0;
  return useQuery({
    queryKey: ["analytics", accountId],
    queryFn: () => postJson<AnalyticsResponse>("/api/analytics", { accountId }),
    enabled: enabled && accountId.length > 0,
    staleTime: 30_000,
  });
}

export function useHistorySnapshotsQueryWithOverride(
  accountId: string,
  enabledOverride?: boolean
) {
  const enabled = enabledOverride ?? accountId.length > 0;
  const query = new URLSearchParams({
    accountId,
    limit: "365",
  });
  return useQuery({
    queryKey: ["history-snapshots", accountId],
    queryFn: () =>
      fetchJson<HistorySnapshotsResponse>(`/api/history/snapshots?${query.toString()}`),
    enabled: enabled && accountId.length > 0,
    staleTime: 60_000,
  });
}
