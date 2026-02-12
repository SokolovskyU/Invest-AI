import type { Express } from "express";
import {
  buildAuthMetadata,
  createInstrumentsClient,
  createMarketDataClient,
  createOperationsClient,
  createUsersClient,
} from "./grpc";
import {
  fetchInstrumentsBatch,
  clearAllCaches,
  clearInstrumentCaches,
  getDisplayName,
  getInstrumentInfo,
  incomeCache,
  instrumentBatchCache,
  instrumentCache,
  persistIncomeCache,
  persistInstrumentCaches,
  upsertInstrumentCache,
} from "./cache";
import { grpcCall, grpcCallWithRetry, mapLimit } from "./grpcHelpers";
import {
  formatMoney,
  formatPercent,
  formatRiskLevel,
  normalizeBondCompany,
  safePercent,
  toNumber,
  xirr,
} from "./utils";
import type { Cashflow } from "./utils";
import { renderAnalyticsPage } from "./ui/analyticsPage";
import { renderHomePage } from "./ui/homePage";
import type { AccountsResponse, PortfolioResponse } from "./types";
import { getMetrics } from "./metrics";

export type AppConfig = {
  endpoint: string;
  appName?: string;
  defaultToken?: string;
  clients?: {
    createUsersClient: typeof createUsersClient;
    createOperationsClient: typeof createOperationsClient;
    createInstrumentsClient: typeof createInstrumentsClient;
    createMarketDataClient: typeof createMarketDataClient;
  };
};

export function registerRoutes(app: Express, config: AppConfig): void {
  const { endpoint, appName, defaultToken } = config;
  const clients = config.clients || {
    createUsersClient,
    createOperationsClient,
    createInstrumentsClient,
    createMarketDataClient,
  };

  app.get("/", (_req, res) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(renderHomePage());
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/metrics", (_req, res) => {
    res.json(getMetrics());
  });

  app.get("/analytics", (_req, res) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(renderAnalyticsPage());
  });

  app.post("/api/accounts", (req, res) => {
    const tokenFromBody =
      typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const token = tokenFromBody || defaultToken;

    if (!token) {
      res.status(400).json({ error: "Missing token" });
      return;
    }

    const client = clients.createUsersClient(endpoint);
    const metadata = buildAuthMetadata(token, appName);

    client.GetAccounts({}, metadata, (err, response) => {
      if (err) {
        res.status(502).json({ error: err.message, details: err.details || null });
        return;
      }
      res.json(response || {});
    });
  });

  app.post("/api/portfolio", (req, res) => {
    const tokenFromBody =
      typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const token = tokenFromBody || defaultToken;
    const accountId =
      typeof req.body?.accountId === "string" ? req.body.accountId.trim() : "";

    if (!token) {
      res.status(400).json({ error: "Missing token" });
      return;
    }
    if (!accountId) {
      res.status(400).json({ error: "Missing accountId" });
      return;
    }

    const client = clients.createOperationsClient(endpoint);
    const metadata = buildAuthMetadata(token, appName);

    client.GetPortfolio({ account_id: accountId }, metadata, async (err, response) => {
      if (err) {
        res.status(502).json({ error: err.message, details: err.details || null });
        return;
      }

      const portfolio = (response as PortfolioResponse) || {};
      const positions: any[] = Array.isArray(portfolio.positions)
        ? portfolio.positions
        : [];
      const instrumentsClient = clients.createInstrumentsClient(endpoint);
      const marketDataClient = clients.createMarketDataClient(endpoint);

      if (positions.length) {
        const shares = await fetchInstrumentsBatch(
          instrumentsClient,
          metadata,
          "Shares",
          "shares"
        );
        const etfs = await fetchInstrumentsBatch(
          instrumentsClient,
          metadata,
          "Etfs",
          "etfs"
        );
        const currencies = await fetchInstrumentsBatch(
          instrumentsClient,
          metadata,
          "Currencies",
          "currencies"
        );
        const bonds = await fetchInstrumentsBatch(
          instrumentsClient,
          metadata,
          "Bonds",
          "bonds"
        );
        const all = ([] as any[]).concat(shares, etfs, currencies, bonds);
        upsertInstrumentCache(all);
        persistInstrumentCaches();
      }

      const receivedDividendOps: Array<{ time: number; amount: number }> = [];

      try {
        const instrumentIds = positions
          .map((p) => String(p.instrument_uid || p.figi || "").trim())
          .filter((id) => id.length > 0);
        const uniqueInstrumentIds = Array.from(new Set(instrumentIds));

        let lastPricesById = new Map<string, number>();
        let closePricesById = new Map<string, number>();

        if (uniqueInstrumentIds.length) {
          try {
            const [lastPricesResp, closePricesResp]: [any, any] = await Promise.all([
              grpcCall(
                marketDataClient.GetLastPrices.bind(marketDataClient),
                { instrument_id: uniqueInstrumentIds },
                metadata
              ),
              grpcCall(
                marketDataClient.GetClosePrices.bind(marketDataClient),
                {
                  instruments: uniqueInstrumentIds.map((id) => ({ instrument_id: id })),
                },
                metadata
              ),
            ]);

            const lastPrices = Array.isArray(lastPricesResp?.last_prices)
              ? lastPricesResp.last_prices
              : [];
            lastPricesById = lastPrices.reduce((map: Map<string, number>, item: any) => {
              const key = String(item?.instrument_uid || item?.figi || "").trim();
              if (!key) return map;
              map.set(key, toNumber(item?.price));
              return map;
            }, new Map<string, number>());

            const closePrices = Array.isArray(closePricesResp?.close_prices)
              ? closePricesResp.close_prices
              : [];
            closePricesById = closePrices.reduce((map: Map<string, number>, item: any) => {
              const key = String(item?.instrument_uid || item?.figi || "").trim();
              if (!key) return map;
              map.set(key, toNumber(item?.price));
              return map;
            }, new Map<string, number>());
          } catch {
            lastPricesById = new Map<string, number>();
            closePricesById = new Map<string, number>();
          }
        }

        const prettyPositions = await Promise.all(
          positions.map(async (p) => {
            const avg = toNumber(p.average_position_price);
            const cur = toNumber(p.current_price);
            const qty = toNumber(p.quantity);
            const instrumentId = String(p.instrument_uid || p.figi || "").trim();
            const currency =
              p.average_position_price?.currency ||
              p.current_price?.currency ||
              p.expected_yield?.currency ||
              "";
            const buyValue = avg * qty;
            const curValue = cur * qty;
            const profit = curValue - buyValue;
            const profitPct = buyValue !== 0 ? (profit / buyValue) * 100 : 0;

            const lastPrice = lastPricesById.get(instrumentId);
            const closePrice = closePricesById.get(instrumentId);
            const hasDayPrices =
              Number.isFinite(lastPrice) &&
              Number.isFinite(closePrice) &&
              closePrice !== 0;
            const dayChangePct = hasDayPrices
              ? (((lastPrice as number) - (closePrice as number)) / (closePrice as number)) * 100
              : null;
            const dayPriceChangeRub = hasDayPrices
              ? ((lastPrice as number) - (closePrice as number))
              : null;

            const info = getInstrumentInfo(p) || { name: "" };
            const displayName = getDisplayName(p);
            let monthlyCoupon = "-";
            if ((p.instrument_type || "").toLowerCase() === "bond" && p.figi) {
              const cacheKey = p.figi + ":bond";
              const cached = incomeCache.get(cacheKey);
              const coupons = cached?.coupons || [];
              const total = (coupons || []).reduce((s, c) => {
                const dt = new Date(Number(c?.coupon_date?.seconds || 0) * 1000);
                if (!dt.getTime()) return s;
                const curCode = (c?.pay_one_bond?.currency || currency).toUpperCase();
                if (curCode !== currency) return s;
                return s + toNumber(c?.pay_one_bond) * qty;
              }, 0);
              monthlyCoupon = total > 0 ? formatMoney(total / 12, currency) : "-";
            }

            return {
              name: displayName,
              instrumentType: (p.instrument_type || "").toLowerCase(),
              rating: formatRiskLevel(info.riskLevel),
              monthlyCoupon,
              currentPrice: formatMoney(curValue, currency),
              profitRub: formatMoney(profit, currency),
              profitPct: formatPercent(profitPct),
              dayPriceChangeRub:
                dayPriceChangeRub === null ? "-" : formatMoney(dayPriceChangeRub, currency),
              dayChangeRub:
                dayPriceChangeRub === null ? "-" : formatMoney(dayPriceChangeRub, currency),
              dayChangePct:
                dayChangePct === null ? "-" : formatPercent(dayChangePct),
              dayClosePriceRub:
                closePrice === undefined ? "-" : formatMoney(closePrice, currency),
              dayLastPriceRub:
                lastPrice === undefined ? "-" : formatMoney(lastPrice, currency),
              dayPriceAvailable: Boolean(hasDayPrices),
            };
          })
        );

        prettyPositions.sort((a, b) => a.name.localeCompare(b.name, "ru"));

        const total = portfolio.total_amount_portfolio
          ? formatMoney(
              toNumber(portfolio.total_amount_portfolio),
              portfolio.total_amount_portfolio.currency
            )
          : "";

        res.json({
          total,
          positions: prettyPositions,
        });
      } catch (e: any) {
        res.status(502).json({ error: e?.message || "Instrument lookup failed" });
      }
    });
  });

  app.post("/api/analytics", (req, res) => {
    const tokenFromBody =
      typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const token = tokenFromBody || defaultToken;
    const accountId =
      typeof req.body?.accountId === "string" ? req.body.accountId.trim() : "";

    if (!token) {
      res.status(400).json({ error: "Missing token" });
      return;
    }
    if (!accountId) {
      res.status(400).json({ error: "Missing accountId" });
      return;
    }

    const client = clients.createOperationsClient(endpoint);
    const metadata = buildAuthMetadata(token, appName);

    client.GetPortfolio({ account_id: accountId }, metadata, async (err, response) => {
      if (err) {
        res.status(502).json({ error: err.message, details: err.details || null });
        return;
      }

      const portfolio = (response as PortfolioResponse) || {};
      const positions: any[] = Array.isArray(portfolio.positions)
        ? portfolio.positions
        : [];
      const instrumentsClient = clients.createInstrumentsClient(endpoint);

      if (positions.length) {
        const shares = await fetchInstrumentsBatch(
          instrumentsClient,
          metadata,
          "Shares",
          "shares"
        );
        const etfs = await fetchInstrumentsBatch(
          instrumentsClient,
          metadata,
          "Etfs",
          "etfs"
        );
        const currencies = await fetchInstrumentsBatch(
          instrumentsClient,
          metadata,
          "Currencies",
          "currencies"
        );
        const bonds = await fetchInstrumentsBatch(
          instrumentsClient,
          metadata,
          "Bonds",
          "bonds"
        );
        const all = ([] as any[]).concat(shares, etfs, currencies, bonds);
        upsertInstrumentCache(all);
        persistInstrumentCaches();
      }

      const currency = (portfolio.total_amount_portfolio?.currency || "RUB").toUpperCase();

      const typeLabels: Record<string, string> = {
        share: "Акции",
        bond: "Облигации",
        etf: "ETF",
        currency: "Валюта",
        futures: "Фьючерсы",
        option: "Опционы",
      };

      const byType = positions.reduce((acc, p) => {
        const cur = toNumber(p.current_price);
        const qty = toNumber(p.quantity);
        const curValue = cur * qty;
        const t = (p.instrument_type || "other").toLowerCase();
        acc[t] = (acc[t] || 0) + curValue;
        return acc;
      }, {} as Record<string, number>);

      const holdings = positions.reduce(
        (acc, p) => {
          const avg = toNumber(p.average_position_price);
          const cur = toNumber(p.current_price);
          const qty = toNumber(p.quantity);
          acc.cost += avg * qty;
          acc.current += cur * qty;
          return acc;
        },
        { cost: 0, current: 0 }
      );
      const totalCurrent = holdings.current;
      const marketProfit = holdings.current - holdings.cost;
      const marketProfitPct =
        holdings.cost !== 0 ? (marketProfit / holdings.cost) * 100 : 0;

      let fromSeconds = 946684800; // 2000-01-01
      try {
        const usersClient = clients.createUsersClient(endpoint);
        const accountsResp: AccountsResponse = await grpcCall(
          usersClient.GetAccounts.bind(usersClient),
          {},
          metadata
        );
        const acc = (accountsResp?.accounts || []).find((a: any) => a.id === accountId);
        if (acc?.opened_date?.seconds) {
          fromSeconds = Number(acc.opened_date.seconds);
        }
      } catch {
        // fallback to default
      }

      const toSeconds = Math.floor(Date.now() / 1000);
      const cashflows: Cashflow[] = [];
      const receivedDividendOps: Array<{ time: number; amount: number }> = [];
      const currentFigiSet = new Set(
        positions.map((p) => String(p?.figi || "").trim()).filter((v) => v.length > 0)
      );
      const currentUidSet = new Set(
        positions
          .map((p) => String(p?.instrument_uid || p?.instrumentUid || "").trim())
          .filter((v) => v.length > 0)
      );
      const firstBuyByFigi = new Map<string, number>();
      const firstBuyByUid = new Map<string, number>();
      let tradesNet = 0;
      let couponsIncome = 0;
      let dividendsIncome = 0;
      let commissionsTotal = 0;
      let taxesTotal = 0;

      try {
        const opsResp: any = await grpcCall(
          client.GetOperations.bind(client),
          {
            account_id: accountId,
            from: { seconds: fromSeconds, nanos: 0 },
            to: { seconds: toSeconds, nanos: 0 },
            state: "OPERATION_STATE_EXECUTED",
          },
          metadata
        );
        const ops = Array.isArray(opsResp?.operations) ? opsResp.operations : [];
        const excludeTypes = new Set([
          "OPERATION_TYPE_INPUT",
          "OPERATION_TYPE_OUTPUT",
          "OPERATION_TYPE_INPUT_SECURITIES",
          "OPERATION_TYPE_OUTPUT_SECURITIES",
        ]);
        const buyTypes = new Set([
          "OPERATION_TYPE_BUY",
          "OPERATION_TYPE_BUY_CARD",
          "OPERATION_TYPE_BUY_MARGIN",
          "OPERATION_TYPE_DELIVERY_BUY",
        ]);
        const sellTypes = new Set([
          "OPERATION_TYPE_SELL",
          "OPERATION_TYPE_SELL_CARD",
          "OPERATION_TYPE_SELL_MARGIN",
          "OPERATION_TYPE_DELIVERY_SELL",
        ]);
        const incomeTypes = new Set([
          "OPERATION_TYPE_DIVIDEND",
          "OPERATION_TYPE_COUPON",
          "OPERATION_TYPE_BOND_REPAYMENT",
          "OPERATION_TYPE_BOND_REPAYMENT_FULL",
          "OPERATION_TYPE_DIVIDEND_TRANSFER",
          "OPERATION_TYPE_OVERNIGHT",
          "OPERATION_TYPE_ACCRUING_VARMARGIN",
        ]);
        const receivedDividendTypes = new Set([
          "OPERATION_TYPE_DIVIDEND",
          "OPERATION_TYPE_DIVIDEND_TRANSFER",
          "OPERATION_TYPE_DIV_EXT",
        ]);
        const receivedDividendTypeIds = new Set([21, 25, 43]);
        const couponIncomeTypes = new Set(["OPERATION_TYPE_COUPON"]);
        const couponIncomeTypeIds = new Set([23]);
        const commissionTypes = new Set([
          "OPERATION_TYPE_SERVICE_FEE",
          "OPERATION_TYPE_BROKER_FEE",
          "OPERATION_TYPE_SUCCESS_FEE",
          "OPERATION_TYPE_TRACK_MFEE",
          "OPERATION_TYPE_TRACK_PFEE",
          "OPERATION_TYPE_MARGIN_FEE",
          "OPERATION_TYPE_CASH_FEE",
          "OPERATION_TYPE_OUT_FEE",
          "OPERATION_TYPE_OUT_STAMP_DUTY",
          "OPERATION_TYPE_OUTPUT_PENALTY",
          "OPERATION_TYPE_ADVICE_FEE",
        ]);
        const commissionTypeIds = new Set([12, 19, 24, 30, 31, 14, 45, 46, 47, 55, 56]);
        const payoutTaxTypes = new Set([
          "OPERATION_TYPE_DIVIDEND_TAX",
          "OPERATION_TYPE_BOND_TAX",
          "OPERATION_TYPE_DIVIDEND_TAX_PROGRESSIVE",
          "OPERATION_TYPE_BOND_TAX_PROGRESSIVE",
        ]);
        const expenseTypes = new Set([
          "OPERATION_TYPE_TAX",
          "OPERATION_TYPE_DIVIDEND_TAX",
          "OPERATION_TYPE_BOND_TAX",
          "OPERATION_TYPE_SERVICE_FEE",
          "OPERATION_TYPE_BROKER_FEE",
          "OPERATION_TYPE_SUCCESS_FEE",
          "OPERATION_TYPE_TRACK_MFEE",
          "OPERATION_TYPE_TRACK_PFEE",
          "OPERATION_TYPE_MARGIN_FEE",
          "OPERATION_TYPE_TAX_CORRECTION",
          "OPERATION_TYPE_BENEFIT_TAX",
          "OPERATION_TYPE_TAX_PROGRESSIVE",
          "OPERATION_TYPE_BOND_TAX_PROGRESSIVE",
          "OPERATION_TYPE_DIVIDEND_TAX_PROGRESSIVE",
          "OPERATION_TYPE_BENEFIT_TAX_PROGRESSIVE",
          "OPERATION_TYPE_TAX_CORRECTION_PROGRESSIVE",
          "OPERATION_TYPE_TAX_REPO_PROGRESSIVE",
          "OPERATION_TYPE_TAX_REPO",
          "OPERATION_TYPE_TAX_REPO_HOLD",
          "OPERATION_TYPE_WRITING_OFF_VARMARGIN",
        ]);
        for (const op of ops) {
          const opType = op?.operation_type ?? op?.type ?? "";
          const opTypeStr = String(opType || "").toUpperCase();
          const seconds = Number(op?.date?.seconds || 0);
          if (!seconds) continue;
          const isBuy =
            buyTypes.has(opType) ||
            buyTypes.has(opTypeStr) ||
            Number(opType) === 15 ||
            Number(opType) === 16 ||
            Number(opType) === 20 ||
            Number(opType) === 28;
          if (!isBuy) continue;

          const opFigi = String(op?.figi || "").trim();
          const opUid = String(op?.instrument_uid || op?.instrumentUid || "").trim();

          if (opFigi && currentFigiSet.has(opFigi)) {
            const prev = firstBuyByFigi.get(opFigi);
            if (!prev || seconds < prev) firstBuyByFigi.set(opFigi, seconds);
          }
          if (opUid && currentUidSet.has(opUid)) {
            const prev = firstBuyByUid.get(opUid);
            if (!prev || seconds < prev) firstBuyByUid.set(opUid, seconds);
          }
        }

        for (const op of ops) {
          const opType = op?.operation_type ?? op?.type ?? "";
          const opTypeStr = String(opType || "").toUpperCase();
          const opTypeNum = Number(opType);
          const opTypeText = `${String(opType || "").toLowerCase()} ${String(op?.description || "").toLowerCase()}`;
          if (excludeTypes.has(opType) || excludeTypes.has(opTypeStr)) continue;
          const opCurrency = (op?.payment?.currency || op?.currency || "").toUpperCase();
          if (opCurrency && opCurrency !== currency) continue;
          const seconds = Number(op?.date?.seconds || 0);
          if (!seconds) continue;

          const raw = toNumber(op?.payment);
          if (!Number.isFinite(raw) || raw === 0) continue;
          const base = Math.abs(raw);
          const isBuy =
            buyTypes.has(opType) ||
            buyTypes.has(opTypeStr) ||
            opTypeNum === 15 ||
            opTypeNum === 16 ||
            opTypeNum === 20 ||
            opTypeNum === 28;
          const isSell =
            sellTypes.has(opType) ||
            sellTypes.has(opTypeStr) ||
            opTypeNum === 22 ||
            opTypeNum === 29;

          let signed: number;
          if (isBuy) signed = -base;
          else if (isSell) signed = base;
          else if (incomeTypes.has(opType) || incomeTypes.has(opTypeStr)) signed = base;
          else if (expenseTypes.has(opType) || expenseTypes.has(opTypeStr)) signed = -base;
          else signed = raw;

          cashflows.push({ time: seconds * 1000, amount: signed });

          const commission = Math.abs(toNumber(op?.commission));
          const commCurrency = (op?.commission?.currency || "").toUpperCase();
          const commissionFromField =
            commission && (!commCurrency || commCurrency === currency) ? commission : 0;
          if (commissionFromField) {
            cashflows.push({ time: seconds * 1000, amount: -commissionFromField });
          }

          const isCouponIncome =
            couponIncomeTypes.has(opType) ||
            couponIncomeTypes.has(opTypeStr) ||
            couponIncomeTypeIds.has(opTypeNum);
          const isDividendIncome =
            receivedDividendTypes.has(opType) ||
            receivedDividendTypes.has(opTypeStr) ||
            receivedDividendTypeIds.has(opTypeNum);
          const isCommission =
            commissionTypes.has(opType) ||
            commissionTypes.has(opTypeStr) ||
            commissionTypeIds.has(opTypeNum);
          const isPayoutTax =
            payoutTaxTypes.has(opType) ||
            payoutTaxTypes.has(opTypeStr) ||
            (opTypeStr.includes("TAX") &&
              (opTypeText.includes("дивид") ||
                opTypeText.includes("купон") ||
                opTypeText.includes("dividend") ||
                opTypeText.includes("coupon")));

          if (isBuy || isSell) tradesNet += raw;

          if (isCouponIncome) {
            // Купоны учитываем по факту получения, включая уже проданные/погашенные бумаги.
            couponsIncome += raw;
          }
          if (isDividendIncome) {
            if (raw > 0) {
              receivedDividendOps.push({ time: seconds * 1000, amount: raw });
            }
            dividendsIncome += raw;
          }
          if (isCommission) {
            // payment < 0 means fee charged, payment > 0 means refund
            commissionsTotal += -raw;
          } else if (commissionFromField > 0) {
            // Trade operations often carry commission in separate field.
            commissionsTotal += commissionFromField;
          }
          if (isPayoutTax) {
            // payment < 0 means tax withheld, payment > 0 means tax refund
            taxesTotal += -raw;
          }
        }
      } catch {
        // Keep analytics available even when operations history is temporarily unavailable.
      }

      const finalValue = toNumber(portfolio.total_amount_portfolio);
      cashflows.push({ time: Date.now(), amount: finalValue });
      const xirrValue = xirr(cashflows);
      const yieldPct = xirrValue === null ? null : xirrValue * 100;
      const operationProfit =
        totalCurrent +
        tradesNet +
        couponsIncome +
        dividendsIncome -
        commissionsTotal -
        taxesTotal;
      const profitBase = totalCurrent > 0 ? totalCurrent : Math.abs(tradesNet);
      const operationProfitPct =
        profitBase > 0 ? (operationProfit / profitBase) * 100 : 0;

      const totalByType = Object.values(byType).reduce((s, v) => s + v, 0);
      const assetPie = Object.keys(byType)
        .sort()
        .map((k) => {
          const value = byType[k];
          const pct = totalByType ? (value / totalByType) * 100 : 0;
          return {
            label: typeLabels[k] || k,
            value,
            valueText: formatMoney(value, currency),
            percentText: formatPercent(pct),
          };
        });

      const assetBreakdown = Object.keys(byType)
        .sort()
        .map((k) => {
          const assets = positions
            .filter((p) => (p.instrument_type || "other").toLowerCase() === k)
            .map((p) => {
              const cur = toNumber(p.current_price);
              const qty = toNumber(p.quantity);
              const curValue = cur * qty;
              const name = getDisplayName(p);
              const pctOfTotal = totalByType ? (curValue / totalByType) * 100 : 0;
              return {
                name: name || "Название недоступно",
                value: curValue,
                valueText: formatMoney(curValue, currency),
                percentText: formatPercent(pctOfTotal),
                percentOfTotal: Math.max(1, Math.round(pctOfTotal)) + "%",
              };
            })
            .sort((a, b) => b.value - a.value);

          const value = byType[k];
          const pct = totalByType ? (value / totalByType) * 100 : 0;
          return {
            type: k,
            typeLabel: typeLabels[k] || k,
            value,
            valueText: formatMoney(value, currency),
            percentText: formatPercent(pct),
            assets,
          };
        });

      const bondCompaniesMap = new Map<string, number>();
      for (const p of positions) {
        if ((p.instrument_type || "").toLowerCase() !== "bond") continue;
        const name = getDisplayName(p);
        const company =
          name === "Название недоступно" ? "Неизвестный эмитент" : normalizeBondCompany(name);
        const cur = toNumber(p.current_price);
        const qty = toNumber(p.quantity);
        const curValue = cur * qty;
        bondCompaniesMap.set(company, (bondCompaniesMap.get(company) || 0) + curValue);
      }
      const bondTotal = Array.from(bondCompaniesMap.values()).reduce((s, v) => s + v, 0);
      const bondCompanies = Array.from(bondCompaniesMap.entries())
        .map(([name, value]) => {
          const pct = bondTotal ? (value / bondTotal) * 100 : 0;
          return {
            name,
            value,
            valueText: formatMoney(value, currency),
            percentText: formatPercent(pct),
          };
        })
        .sort((a, b) => b.value - a.value);

      const now = new Date();
      const endNext12 = new Date(now.getFullYear(), now.getMonth() + 12, now.getDate());
      const start2026 = new Date(2026, 0, 1);
      const end2026 = new Date(2026, 11, 31, 23, 59, 59);
      const fromIncome = now < start2026 ? now : start2026;
      const toIncome = endNext12 > end2026 ? endNext12 : end2026;
      const rangeKey =
        Math.floor(fromIncome.getTime() / 1000) +
        "-" +
        Math.floor(toIncome.getTime() / 1000);

      const monthKey = (d: Date) =>
        d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      const monthLabel = (key: string) => {
        const [y, m] = key.split("-");
        return m + "." + y;
      };

      const next12Map = new Map<string, number>();
      const y2026Map = new Map<string, number>();
      const upcomingEvents: Array<{
        date: string;
        name: string;
        eventType: string;
        amount: string;
        timestamp: number;
      }> = [];
      let couponNext12Total = 0;
      let bondTotalCurrent = 0;
      const nextWeekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const formatEventDate = (d: Date) =>
        String(d.getDate()).padStart(2, "0") +
        "." +
        String(d.getMonth() + 1).padStart(2, "0") +
        "." +
        d.getFullYear();

      await mapLimit(positions, 5, async (p) => {
        const figi = p.figi;
        if (!figi) return;
        const qty = toNumber(p.quantity);
        if (!qty) return;
        const type = (p.instrument_type || "").toLowerCase();
        const positionUid = String(p?.instrument_uid || p?.instrumentUid || "").trim();
        const firstBuySeconds =
          firstBuyByFigi.get(String(figi)) || (positionUid ? firstBuyByUid.get(positionUid) : undefined);
        if (type === "bond") {
          const cur = toNumber(p.current_price);
          bondTotalCurrent += cur * qty;
        }

        const cacheKey = figi + ":" + type;
        const cached = incomeCache.get(cacheKey);
        let coupons: any[] | undefined;
        let dividends: any[] | undefined;

        if (cached && cached.rangeKey === rangeKey) {
          coupons = cached.coupons;
          dividends = cached.dividends;
        } else {
          if (type === "bond") {
            try {
              const couponsResp: any = await grpcCallWithRetry(
                instrumentsClient.GetBondCoupons.bind(instrumentsClient),
                {
                  figi,
                  from: { seconds: Math.floor(fromIncome.getTime() / 1000), nanos: 0 },
                  to: { seconds: Math.floor(toIncome.getTime() / 1000), nanos: 0 },
                },
                metadata,
                5
              );
              coupons = Array.isArray(couponsResp?.events) ? couponsResp.events : [];
            } catch {
              coupons = [];
            }
          }
          if (type === "share" || type === "etf") {
            try {
              const divResp: any = await grpcCallWithRetry(
                instrumentsClient.GetDividends.bind(instrumentsClient),
                {
                  figi,
                  from: { seconds: Math.floor(fromIncome.getTime() / 1000), nanos: 0 },
                  to: { seconds: Math.floor(toIncome.getTime() / 1000), nanos: 0 },
                },
                metadata,
                5
              );
              dividends = Array.isArray(divResp?.dividends) ? divResp.dividends : [];
            } catch {
              dividends = [];
            }
          }
          incomeCache.set(cacheKey, { rangeKey, coupons, dividends });
        }

        if (coupons) {
          for (const c of coupons) {
            const dt = new Date(Number(c?.coupon_date?.seconds || 0) * 1000);
            if (!dt.getTime()) continue;
            const amount = toNumber(c?.pay_one_bond) * qty;
            const cur = (c?.pay_one_bond?.currency || currency).toUpperCase();
            if (cur !== currency) continue;
            const key = monthKey(dt);
            if (dt >= now && dt <= endNext12) {
              next12Map.set(key, (next12Map.get(key) || 0) + amount);
              couponNext12Total += amount;
            }
            if (dt >= now && dt <= nextWeekEnd) {
              upcomingEvents.push({
                date: formatEventDate(dt),
                name: getDisplayName(p),
                eventType: "Купон",
                amount: formatMoney(amount, currency),
                timestamp: dt.getTime(),
              });
            }
            if (dt >= start2026 && dt <= end2026) {
              y2026Map.set(key, (y2026Map.get(key) || 0) + amount);
            }
          }
        }

        if (dividends) {
          for (const d of dividends) {
            const dt = new Date(Number(d?.payment_date?.seconds || 0) * 1000);
            if (!dt.getTime()) continue;
            const lastBuyDateMs = Number(d?.last_buy_date?.seconds || 0) * 1000;
            if (firstBuySeconds) {
              if (lastBuyDateMs > 0) {
                if (firstBuySeconds * 1000 > lastBuyDateMs) continue;
              } else if (firstBuySeconds * 1000 > dt.getTime()) {
                continue;
              }
            }
            const dividendType = String(d?.dividend_type || "").toLowerCase();
            if (dividendType.includes("cancel")) continue;
            const amount = toNumber(d?.dividend_net) * qty;
            if (!Number.isFinite(amount) || amount <= 0) continue;
            const cur = (d?.dividend_net?.currency || currency).toUpperCase();
            if (cur !== currency) continue;
            const key = monthKey(dt);
            if (dt >= now && dt <= endNext12) {
              next12Map.set(key, (next12Map.get(key) || 0) + amount);
            }
            if (dt >= now && dt <= nextWeekEnd) {
              upcomingEvents.push({
                date: formatEventDate(dt),
                name: getDisplayName(p),
                eventType: "Дивиденд",
                amount: formatMoney(amount, currency),
                timestamp: dt.getTime(),
              });
            }
            if (dt >= start2026 && dt <= end2026) {
              y2026Map.set(key, (y2026Map.get(key) || 0) + amount);
            }
          }
        }
      });
      persistIncomeCache();

      const buildMonthList = (start: Date, months: number) => {
        const list: string[] = [];
        const d = new Date(start.getFullYear(), start.getMonth(), 1);
        for (let i = 0; i < months; i++) {
          const key = monthKey(new Date(d.getFullYear(), d.getMonth() + i, 1));
          list.push(key);
        }
        return list;
      };

      const next12Keys = buildMonthList(now, 12);
      const incomeNext12 = next12Keys.map((k) => ({
        month: monthLabel(k),
        amount: formatMoney(next12Map.get(k) || 0, currency),
      }));

      const dividendsStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const dividends12Keys = buildMonthList(dividendsStart, 12);
      const dividends12Map = new Map<string, number>();
      for (const op of receivedDividendOps) {
        const dt = new Date(op.time);
        if (dt < dividendsStart || dt > now) continue;
        const key = monthKey(dt);
        dividends12Map.set(key, (dividends12Map.get(key) || 0) + op.amount);
      }
      const receivedDividends12 = dividends12Keys.map((k) => ({
        month: monthLabel(k),
        amount: formatMoney(dividends12Map.get(k) || 0, currency),
      }));

      const redemptionMap = new Map<string, number>();
      const redemptionsDetails: Array<{ month: string; name: string; amount: string }> = [];
      for (const p of positions) {
        if ((p.instrument_type || "").toLowerCase() !== "bond") continue;
        const meta = getInstrumentInfo(p) || {};
        const maturityMs = meta.maturityMs || 0;
        if (!maturityMs) continue;
        const dt = new Date(maturityMs);
        if (dt < now || dt > endNext12) continue;
        const key = monthKey(dt);
        const nominal = toNumber(meta.nominal);
        const qty = toNumber(p.quantity);
        const curCode = (meta.nominal?.currency || currency).toUpperCase();
        if (curCode !== currency) continue;
        const value = nominal * qty;
        redemptionMap.set(key, (redemptionMap.get(key) || 0) + value);
        redemptionsDetails.push({
          month: monthLabel(key),
          name: getDisplayName(p),
          amount: formatMoney(value, currency),
        });
        if (dt >= now && dt <= nextWeekEnd) {
          upcomingEvents.push({
            date: formatEventDate(dt),
            name: getDisplayName(p),
            eventType: "Погашение",
            amount: formatMoney(value, currency),
            timestamp: dt.getTime(),
          });
        }
      }
      const redemptionsNext12 = next12Keys.map((k) => ({
        month: monthLabel(k),
        value: redemptionMap.get(k) || 0,
        amount: formatMoney(redemptionMap.get(k) || 0, currency),
      }));
      redemptionsDetails.sort((a, b) => a.month.localeCompare(b.month, "ru"));

      const couponYieldPct =
        bondTotalCurrent > 0 ? (couponNext12Total / bondTotalCurrent) * 100 : null;
      upcomingEvents.sort((a, b) => a.timestamp - b.timestamp);

      res.json({
        total: formatMoney(totalCurrent, currency),
        profitRub: formatMoney(operationProfit, currency),
        profitPct: formatPercent(operationProfitPct),
        profitBreakdown: {
          currentValueRub: formatMoney(totalCurrent, currency),
          tradesNetRub: formatMoney(tradesNet, currency),
          couponsRub: formatMoney(couponsIncome, currency),
          dividendsRub: formatMoney(dividendsIncome, currency),
          commissionsRub: formatMoney(commissionsTotal, currency),
          taxesRub: formatMoney(taxesTotal, currency),
          marketProfitRub: formatMoney(marketProfit, currency),
          marketProfitPct: formatPercent(marketProfitPct),
        },
        yieldPct: safePercent(couponYieldPct),
        assetPie,
        assetBreakdown,
        bondCompanies,
        bondCompaniesCount: "Компаний: " + String(bondCompanies.length),
        incomeNext12,
        receivedDividends12,
        redemptionsNext12,
        redemptionsDetails,
        upcomingEvents: upcomingEvents.map((e) => ({
          date: e.date,
          name: e.name,
          eventType: e.eventType,
          amount: e.amount,
        })),
      });
    });
  });

  app.post("/api/cache/refresh", async (_req, res) => {
    clearAllCaches();
    persistInstrumentCaches();
    persistIncomeCache();
    res.json({ ok: true });
  });

  app.post("/api/names/refresh", async (_req, res) => {
    try {
      clearInstrumentCaches();
      if (!defaultToken) {
        res.status(400).json({ ok: false, error: "Missing token" });
        return;
      }
      const instrumentsClient = clients.createInstrumentsClient(endpoint);
      const metadata = buildAuthMetadata(defaultToken || "", appName);

      await fetchInstrumentsBatch(instrumentsClient, metadata, "Shares", "shares");
      await fetchInstrumentsBatch(instrumentsClient, metadata, "Etfs", "etfs");
      await fetchInstrumentsBatch(instrumentsClient, metadata, "Currencies", "currencies");
      await fetchInstrumentsBatch(instrumentsClient, metadata, "Bonds", "bonds");

      const all = ([] as any[]).concat(
        instrumentBatchCache.get("shares") || [],
        instrumentBatchCache.get("etfs") || [],
        instrumentBatchCache.get("currencies") || [],
        instrumentBatchCache.get("bonds") || []
      );

      const updated = upsertInstrumentCache(all);

      persistInstrumentCaches();
      res.json({ ok: true, updated });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message || "Refresh failed" });
    }
  });
}
