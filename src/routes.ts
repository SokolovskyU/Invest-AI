import express, { type Express, type Request } from "express";
import fs from "node:fs";
import path from "node:path";
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
  getDisplayName,
  getInstrumentInfo,
  incomeCache,
  instrumentBatchCache,
  persistIncomeCache,
  persistInstrumentCaches,
  setCacheContext,
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
} from "./utils";
import { renderAnalyticsPage } from "./ui/analyticsPage";
import { renderHomePage } from "./ui/homePage";
import type { AccountsResponse, PortfolioResponse } from "./types";
import {
  getMetrics,
  getPromMetrics,
  getPromMetricsContentType,
  recordAnalyticsMetrics,
  recordPortfolioMetrics,
} from "./metrics";
import {
  accountScopedPayloadSchema,
  accountsPayloadSchema,
  healthResponseSchema,
  mapZodIssues,
  metricsResponseSchema,
} from "./validation/payloads";
import { logWarn } from "./logger";
import { resolveAuthToken } from "./auth/session";
import { registerSessionRoutes } from "./routes/sessionRoutes";
import { registerPlatformRoutes } from "./routes/platformRoutes";
import { canAccessAccount } from "./platform/rbac";

export type AppConfig = {
  endpoint: string;
  appName?: string;
  defaultToken?: string;
  uiMode?: "auto" | "react" | "legacy";
  clients?: {
    createUsersClient: typeof createUsersClient;
    createOperationsClient: typeof createOperationsClient;
    createInstrumentsClient: typeof createInstrumentsClient;
    createMarketDataClient: typeof createMarketDataClient;
  };
};

export function registerRoutes(app: Express, config: AppConfig): void {
  const { endpoint, appName, defaultToken } = config;
  setCacheContext({ endpoint });
  const clients = config.clients || {
    createUsersClient,
    createOperationsClient,
    createInstrumentsClient,
    createMarketDataClient,
  };
  const unknownDisplayName = "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e";
  const movers24hBaselineCache = new Map<string, { price24h: number; updatedAt: number }>();
  const MOVERS_24H_CACHE_TTL_MS = 10 * 60 * 1000;
  const HOUR_MS = 60 * 60 * 1000;
  const DAY_MS = 24 * HOUR_MS;
  const resolveToken = (req: Request, tokenFromBody?: string): string =>
    resolveAuthToken(req, tokenFromBody, defaultToken);
  const isBlockedPosition = (p: any): boolean => {
    if (!p) return false;
    if (p.blocked === true) return true;
    const blockedLots = toNumber(p.blocked_lots || p.blockedLots);
    if (Number.isFinite(blockedLots) && blockedLots > 0) return true;
    const blocked = Number(p.blocked);
    return Number.isFinite(blocked) && blocked > 0;
  };

  const sendLegacyHome = (_req: any, res: any) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(renderHomePage());
  };

  const sendLegacyAnalytics = (_req: any, res: any) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(renderAnalyticsPage());
  };

  const rawUiMode = String(config.uiMode || process.env.UI_MODE || "")
    .trim()
    .toLowerCase();
  const explicitUiMode =
    rawUiMode === "react" || rawUiMode === "legacy" || rawUiMode === "auto"
      ? rawUiMode
      : "";
  const legacyFlag = process.env.LEGACY_UI?.trim().toLowerCase() === "true";
  const uiMode: "auto" | "react" | "legacy" = explicitUiMode
    ? (explicitUiMode as "auto" | "react" | "legacy")
    : legacyFlag
      ? "legacy"
      : "auto";

  const frontendDistDir = path.resolve("web", "dist");
  const frontendIndexPath = path.join(frontendDistDir, "index.html");
  const hasReactBuild = fs.existsSync(frontendIndexPath);
  const wantsReactUi = uiMode === "react" || uiMode === "auto";
  const useReactUi = wantsReactUi && hasReactBuild;

  if (uiMode === "react" && !hasReactBuild) {
    logWarn("react_ui_build_missing_fallback_legacy", {
      uiMode,
      frontendIndexPath,
    });
  }

  if (useReactUi) {
    app.use(
      express.static(frontendDistDir, {
        index: false,
        etag: true,
        maxAge: "1h",
      })
    );
    app.get("/", (_req, res) => {
      res.sendFile(frontendIndexPath);
    });
    app.get("/analytics", (_req, res) => {
      res.sendFile(frontendIndexPath);
    });
  } else {
    app.get("/", sendLegacyHome);
    app.get("/analytics", sendLegacyAnalytics);
  }

  app.get("/legacy", sendLegacyHome);
  app.get("/legacy/analytics", sendLegacyAnalytics);

  registerSessionRoutes(app);
  registerPlatformRoutes(app);

  app.get("/api/health", (_req, res) => {
    const payload = healthResponseSchema.parse({ ok: true });
    res.json(payload);
  });

  app.get("/api/metrics", (_req, res) => {
    const payload = metricsResponseSchema.parse(getMetrics());
    res.json(payload);
  });

  app.get("/metrics", async (_req, res) => {
    try {
      res.set("Content-Type", getPromMetricsContentType());
      res.send(await getPromMetrics());
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Metrics export failed" });
    }
  });

  app.post("/api/accounts", (req, res) => {
    const parsed = accountsPayloadSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid payload",
        details: mapZodIssues(parsed.error),
      });
      return;
    }

    const tokenFromBody = parsed.data.token || "";
    const token = resolveToken(req, tokenFromBody);

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
    const parsed = accountScopedPayloadSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid payload",
        details: mapZodIssues(parsed.error),
      });
      return;
    }

    const tokenFromBody = parsed.data.token || "";
    const token = resolveToken(req, tokenFromBody);
    const accountId = parsed.data.accountId;

    if (!token) {
      res.status(400).json({ error: "Missing token" });
      return;
    }
    if (!accountId) {
      res.status(400).json({ error: "Missing accountId" });
      return;
    }
    if (!canAccessAccount(req, accountId)) {
      res.status(403).json({ error: "Forbidden: account access denied" });
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
      const rawPositions: any[] = Array.isArray(portfolio.positions)
        ? portfolio.positions
        : [];
      const positions = rawPositions.filter((p) => !isBlockedPosition(p));
      const instrumentsClient = clients.createInstrumentsClient(endpoint);
      const marketDataClient = clients.createMarketDataClient(endpoint);

      if (rawPositions.length) {
        const fetchBatchIfAvailable = async (
          kind: string,
          cacheKey: string
        ): Promise<any[]> => {
          const method = (instrumentsClient as any)?.[kind];
          if (typeof method !== "function") return [];
          return fetchInstrumentsBatch(
            instrumentsClient,
            metadata,
            kind,
            cacheKey
          );
        };

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
        const futures = await fetchBatchIfAvailable("Futures", "futures");
        const options = await fetchBatchIfAvailable("Options", "options");
        const all = ([] as any[]).concat(
          shares,
          etfs,
          currencies,
          bonds,
          futures,
          options
        );
        upsertInstrumentCache(all);

        const unresolvedRequests = new Map<string, { idType: string; id: string }>();
        for (const position of rawPositions) {
          const info = getInstrumentInfo(position);
          const type = String(position?.instrument_type || "").toLowerCase();
          const hasName = getDisplayName(position) !== unknownDisplayName;
          const hasSector = String(info?.sector || "").trim().length > 0;
          const hasCountry = String(info?.countryOfRisk || "").trim().length > 0;
          const hasCurrency =
            String(info?.currency || info?.nominal?.currency || "").trim().length > 0;
          const needsSector = type === "share" || type === "etf";
          const needsCountry = type !== "futures" && type !== "option";
          const needsDiversificationMeta =
            !hasCurrency || (needsCountry && !hasCountry) || (needsSector && !hasSector);
          if (hasName && !needsDiversificationMeta) continue;
          const byUid = String(position?.instrument_uid || position?.instrumentUid || "").trim();
          const byFigi = String(position?.figi || "").trim();
          const byPositionUid = String(position?.position_uid || position?.positionUid || "").trim();

          if (byUid) {
            unresolvedRequests.set(`uid:${byUid}`, {
              idType: "INSTRUMENT_ID_TYPE_UID",
              id: byUid,
            });
          }
          if (byFigi) {
            unresolvedRequests.set(`figi:${byFigi}`, {
              idType: "INSTRUMENT_ID_TYPE_FIGI",
              id: byFigi,
            });
          }
          if (byPositionUid) {
            unresolvedRequests.set(`position_uid:${byPositionUid}`, {
              idType: "INSTRUMENT_ID_TYPE_POSITION_UID",
              id: byPositionUid,
            });
          }
        }

        const getInstrumentBy = (instrumentsClient as any)?.GetInstrumentBy;
        if (unresolvedRequests.size > 0 && typeof getInstrumentBy === "function") {
          const resolvedInstruments = await mapLimit(
            Array.from(unresolvedRequests.values()),
            6,
            async ({ idType, id }) => {
              try {
                const resp: any = await grpcCallWithRetry(
                  getInstrumentBy.bind(instrumentsClient),
                  { id_type: idType, id },
                  metadata,
                  2
                );
                return resp?.instrument || null;
              } catch {
                return null;
              }
            }
          );

          const validResolved = resolvedInstruments.filter(
            (instrument) => instrument && typeof instrument === "object"
          );
          if (validResolved.length > 0) {
            upsertInstrumentCache(validResolved);
          }
        }

        persistInstrumentCaches();
      }

      try {
        const instrumentIds = rawPositions
          .map((p) => String(p.instrument_uid || p.figi || "").trim())
          .filter((id) => id.length > 0);
        const uniqueInstrumentIds = Array.from(new Set(instrumentIds));

        let lastPricesById = new Map<string, number>();
        let closePricesById = new Map<string, number>();

        if (uniqueInstrumentIds.length) {
          const addPrice = (map: Map<string, number>, item: any) => {
            const price = toNumber(item?.price);
            const instrumentUid = String(item?.instrument_uid || "").trim();
            const figi = String(item?.figi || "").trim();
            if (instrumentUid) map.set(instrumentUid, price);
            if (figi) map.set(figi, price);
          };

          let lastPricesResp: any = null;
          let closePricesResp: any = null;

          try {
            lastPricesResp = await grpcCall(
              marketDataClient.GetLastPrices.bind(marketDataClient),
              { instrument_id: uniqueInstrumentIds },
              metadata
            );
          } catch {
            lastPricesResp = null;
          }
          try {
            closePricesResp = await grpcCall(
              marketDataClient.GetClosePrices.bind(marketDataClient),
              {
                instruments: uniqueInstrumentIds.map((id) => ({ instrument_id: id })),
              },
              metadata
            );
          } catch {
            closePricesResp = null;
          }

          const lastPrices = Array.isArray(lastPricesResp?.last_prices)
            ? lastPricesResp.last_prices
            : [];
          lastPricesById = new Map<string, number>();
          for (const item of lastPrices) addPrice(lastPricesById, item);

          const closePrices = Array.isArray(closePricesResp?.close_prices)
            ? closePricesResp.close_prices
            : [];
          closePricesById = new Map<string, number>();
          for (const item of closePrices) addPrice(closePricesById, item);

          let missingDayPriceIds = uniqueInstrumentIds.filter((id) => {
            const last = lastPricesById.get(id);
            const close = closePricesById.get(id);
            return !(Number.isFinite(last) && Number.isFinite(close) && (close as number) !== 0);
          });

          // If bulk price methods partially fail, retry per instrument so one bad id does not hide all movers.
          if (missingDayPriceIds.length) {
            const pricePairs = await mapLimit(
              missingDayPriceIds,
              8,
              async (instrumentId) => {
                let lastPrice = lastPricesById.get(instrumentId);
                let closePrice = closePricesById.get(instrumentId);

                if (!Number.isFinite(lastPrice)) {
                  try {
                    const resp: any = await grpcCall(
                      marketDataClient.GetLastPrices.bind(marketDataClient),
                      { instrument_id: [instrumentId] },
                      metadata
                    );
                    const arr = Array.isArray(resp?.last_prices) ? resp.last_prices : [];
                    if (arr[0]) {
                      addPrice(lastPricesById, arr[0]);
                      lastPrice = lastPricesById.get(instrumentId);
                    }
                  } catch {
                    // ignore per-instrument error
                  }
                }

                if (!Number.isFinite(closePrice) || (closePrice as number) === 0) {
                  try {
                    const resp: any = await grpcCall(
                      marketDataClient.GetClosePrices.bind(marketDataClient),
                      { instruments: [{ instrument_id: instrumentId }] },
                      metadata
                    );
                    const arr = Array.isArray(resp?.close_prices) ? resp.close_prices : [];
                    if (arr[0]) {
                      addPrice(closePricesById, arr[0]);
                      closePrice = closePricesById.get(instrumentId);
                    }
                  } catch {
                    // ignore per-instrument error
                  }
                }

                return {
                  instrumentId,
                  lastPrice,
                  closePrice,
                };
              }
            );

            for (const item of pricePairs) {
              if (!item) continue;
              if (Number.isFinite(item.lastPrice)) {
                lastPricesById.set(item.instrumentId, item.lastPrice as number);
              }
              if (Number.isFinite(item.closePrice)) {
                closePricesById.set(item.instrumentId, item.closePrice as number);
              }
            }

            missingDayPriceIds = uniqueInstrumentIds.filter((id) => {
              const last = lastPricesById.get(id);
              const close = closePricesById.get(id);
              return !(Number.isFinite(last) && Number.isFinite(close) && (close as number) !== 0);
            });
          }

          const getCandles = marketDataClient.GetCandles;
          if (missingDayPriceIds.length && typeof getCandles === "function") {
              const now = new Date();
              const from = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14);
              const fromSeconds = Math.floor(from.getTime() / 1000);
              const toSeconds = Math.floor(now.getTime() / 1000);

              const fallbackPrices = await mapLimit(
                missingDayPriceIds,
                8,
                async (instrumentId) => {
                  const candlesResp: any = await grpcCallWithRetry(
                    getCandles.bind(marketDataClient),
                    {
                      instrument_id: instrumentId,
                      from: { seconds: fromSeconds, nanos: 0 },
                      to: { seconds: toSeconds, nanos: 0 },
                      interval: "CANDLE_INTERVAL_DAY",
                    },
                    metadata,
                    1
                  );
                  const candles = Array.isArray(candlesResp?.candles)
                    ? candlesResp.candles
                    : [];
                  const normalized = candles
                    .map((candle: any) => {
                      const close = toNumber(candle?.close);
                      const seconds = Number(candle?.time?.seconds || 0);
                      const nanos = Number(candle?.time?.nanos || 0);
                      return {
                        close,
                        complete: candle?.is_complete !== false,
                        timeMs: seconds * 1000 + Math.floor(nanos / 1_000_000),
                      };
                    })
                    .filter((row: any) => Number.isFinite(row.close) && row.complete && row.timeMs > 0)
                    .sort((a: any, b: any) => a.timeMs - b.timeMs);
                  if (normalized.length < 2) return null;
                  const latest = normalized[normalized.length - 1];
                  const prev = normalized[normalized.length - 2];
                  if (!Number.isFinite(latest.close) || !Number.isFinite(prev.close) || prev.close === 0) {
                    return null;
                  }
                  return {
                    instrumentId,
                    lastPrice: latest.close,
                    closePrice: prev.close,
                  };
                }
              );

              for (const item of fallbackPrices) {
                if (!item) continue;
                const existingLast = lastPricesById.get(item.instrumentId);
                const existingClose = closePricesById.get(item.instrumentId);
                if (!Number.isFinite(existingLast)) {
                  lastPricesById.set(item.instrumentId, item.lastPrice);
                }
                if (!Number.isFinite(existingClose) || (existingClose as number) === 0) {
                  closePricesById.set(item.instrumentId, item.closePrice);
                }
              }
          }

          // Prefer a real 24h baseline from hourly candles for mover analytics.
          if (typeof getCandles === "function") {
            const nowMs = Date.now();
            const target24hMs = nowMs - DAY_MS;
            const from24hMs = target24hMs - DAY_MS * 2;
            const to24hMs = nowMs;
            const candidate24hIds = uniqueInstrumentIds.filter((id) =>
              Number.isFinite(lastPricesById.get(id))
            );

            const baseline24hRows = await mapLimit(candidate24hIds, 8, async (instrumentId) => {
              const cached = movers24hBaselineCache.get(instrumentId);
              if (
                cached &&
                nowMs - cached.updatedAt < MOVERS_24H_CACHE_TTL_MS &&
                Number.isFinite(cached.price24h) &&
                cached.price24h > 0
              ) {
                return { instrumentId, price24h: cached.price24h };
              }

              try {
                const candlesResp: any = await grpcCallWithRetry(
                  getCandles.bind(marketDataClient),
                  {
                    instrument_id: instrumentId,
                    from: { seconds: Math.floor(from24hMs / 1000), nanos: 0 },
                    to: { seconds: Math.floor(to24hMs / 1000), nanos: 0 },
                    interval: "CANDLE_INTERVAL_HOUR",
                  },
                  metadata,
                  1
                );
                const candles = Array.isArray(candlesResp?.candles) ? candlesResp.candles : [];
                const points: Array<{ timeMs: number; price: number }> = [];
                for (const candle of candles) {
                  const seconds = Number(candle?.time?.seconds || 0);
                  const nanos = Number(candle?.time?.nanos || 0);
                  const startMs = seconds * 1000 + Math.floor(nanos / 1_000_000);
                  if (!(startMs > 0)) continue;
                  const open = toNumber(candle?.open);
                  const close = toNumber(candle?.close);
                  if (Number.isFinite(open) && open > 0) {
                    points.push({ timeMs: startMs, price: open });
                  }
                  if (Number.isFinite(close) && close > 0) {
                    points.push({ timeMs: startMs + HOUR_MS, price: close });
                  }
                }
                if (!points.length) return null;
                let best = points[0];
                let bestDistance = Math.abs(best.timeMs - target24hMs);
                for (let i = 1; i < points.length; i += 1) {
                  const point = points[i];
                  const distance = Math.abs(point.timeMs - target24hMs);
                  if (distance < bestDistance) {
                    best = point;
                    bestDistance = distance;
                  }
                }
                if (!Number.isFinite(best.price) || best.price <= 0) return null;
                movers24hBaselineCache.set(instrumentId, {
                  price24h: best.price,
                  updatedAt: nowMs,
                });
                return {
                  instrumentId,
                  price24h: best.price,
                };
              } catch {
                return null;
              }
            });

            for (const row of baseline24hRows) {
              if (!row || !Number.isFinite(row.price24h) || row.price24h <= 0) continue;
              const existingClose = closePricesById.get(row.instrumentId);
              if (Number.isFinite(existingClose) && (existingClose as number) > 0) {
                continue;
              }
              closePricesById.set(row.instrumentId, row.price24h);
            }
          }
        }

      const toPrettyPositions = async (source: any[]) =>
        Promise.all(
          source.map(async (p) => {
            const avg = toNumber(p.average_position_price);
            const cur = toNumber(p.current_price);
            const qty = toNumber(p.quantity);
            const instrumentId = String(p.instrument_uid || p.figi || "").trim();
            const instrumentType = (p.instrument_type || "").toLowerCase();
            const currency =
              p.average_position_price?.currency ||
              p.current_price?.currency ||
              p.expected_yield?.currency ||
              "";
            const buyValue = avg * qty;
            const curValue = cur * qty;
            const profit = curValue - buyValue;
            const profitPct = buyValue !== 0 ? (profit / buyValue) * 100 : 0;

            const info = getInstrumentInfo(p) || { name: "" };
            const lastPrice = lastPricesById.get(instrumentId);
            const closePrice = closePricesById.get(instrumentId);
            const nominalValue = toNumber(info.nominal);
            const priceScale =
              instrumentType === "bond"
                ? nominalValue > 0
                  ? nominalValue / 100
                  : Number.isFinite(lastPrice) && (lastPrice as number) > 0 && cur > 0
                    ? cur / (lastPrice as number)
                    : 1
                : 1;
            const scaledLastPrice =
              Number.isFinite(lastPrice) ? (lastPrice as number) * priceScale : undefined;
            const scaledClosePrice =
              Number.isFinite(closePrice) ? (closePrice as number) * priceScale : undefined;
            const hasDayPrices =
              Number.isFinite(lastPrice) &&
              Number.isFinite(closePrice) &&
              closePrice !== 0;
            const dayChangePct = hasDayPrices
              ? (((lastPrice as number) - (closePrice as number)) / (closePrice as number)) * 100
              : null;
            const dayPriceChangeRub = hasDayPrices
              ? ((scaledLastPrice as number) - (scaledClosePrice as number))
              : null;

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
                scaledClosePrice === undefined ? "-" : formatMoney(scaledClosePrice, currency),
              dayLastPriceRub:
                scaledLastPrice === undefined ? "-" : formatMoney(scaledLastPrice, currency),
              dayPriceAvailable: Boolean(hasDayPrices),
            };
          })
        );

        const prettyPositions = await toPrettyPositions(positions);
        const moverPositions = await toPrettyPositions(rawPositions);

        prettyPositions.sort((a, b) => a.name.localeCompare(b.name, "ru"));
        moverPositions.sort((a, b) => a.name.localeCompare(b.name, "ru"));

      const totalCurrency = (portfolio.total_amount_portfolio?.currency || "RUB").toUpperCase();
      const totalCurrent = positions.reduce((sum, p) => {
        const cur = toNumber(p.current_price);
        const qty = toNumber(p.quantity);
        return sum + cur * qty;
      }, 0);
      const total =
        totalCurrent > 0
          ? formatMoney(totalCurrent, totalCurrency)
          : portfolio.total_amount_portfolio
            ? formatMoney(toNumber(portfolio.total_amount_portfolio), totalCurrency)
            : "";

        res.json({
          total,
          positions: prettyPositions,
          moverPositions,
        });
        recordPortfolioMetrics(prettyPositions.length);
      } catch (e: any) {
        res.status(502).json({ error: e?.message || "Instrument lookup failed" });
      }
    });
  });

  app.post("/api/analytics", (req, res) => {
    const parsed = accountScopedPayloadSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid payload",
        details: mapZodIssues(parsed.error),
      });
      return;
    }

    const tokenFromBody = parsed.data.token || "";
    const token = resolveToken(req, tokenFromBody);
    const accountId = parsed.data.accountId;

    if (!token) {
      res.status(400).json({ error: "Missing token" });
      return;
    }
    if (!accountId) {
      res.status(400).json({ error: "Missing accountId" });
      return;
    }
    if (!canAccessAccount(req, accountId)) {
      res.status(403).json({ error: "Forbidden: account access denied" });
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
      const rawPositions: any[] = Array.isArray(portfolio.positions)
        ? portfolio.positions
        : [];
      const positions = rawPositions.filter((p) => !isBlockedPosition(p));
      const instrumentsClient = clients.createInstrumentsClient(endpoint);

      if (positions.length) {
        const fetchBatchIfAvailable = async (
          kind: string,
          cacheKey: string
        ): Promise<any[]> => {
          const method = (instrumentsClient as any)?.[kind];
          if (typeof method !== "function") return [];
          return fetchInstrumentsBatch(
            instrumentsClient,
            metadata,
            kind,
            cacheKey
          );
        };

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
        const futures = await fetchBatchIfAvailable("Futures", "futures");
        const options = await fetchBatchIfAvailable("Options", "options");
        const all = ([] as any[]).concat(
          shares,
          etfs,
          currencies,
          bonds,
          futures,
          options
        );
        upsertInstrumentCache(all);

        const unresolvedRequests = new Map<string, { idType: string; id: string }>();
        for (const position of positions) {
          const info = getInstrumentInfo(position);
          const type = String(position?.instrument_type || "").toLowerCase();
          const hasName = getDisplayName(position) !== unknownDisplayName;
          const hasSector = String(info?.sector || "").trim().length > 0;
          const hasCountry = String(info?.countryOfRisk || "").trim().length > 0;
          const hasCurrency =
            String(info?.currency || info?.nominal?.currency || "").trim().length > 0;
          const needsSector = type === "share" || type === "etf";
          const needsCountry = type !== "futures" && type !== "option";
          const needsDiversificationMeta =
            !hasCurrency || (needsCountry && !hasCountry) || (needsSector && !hasSector);
          if (hasName && !needsDiversificationMeta) continue;
          const byUid = String(position?.instrument_uid || position?.instrumentUid || "").trim();
          const byFigi = String(position?.figi || "").trim();
          const byPositionUid = String(position?.position_uid || position?.positionUid || "").trim();

          if (byUid) {
            unresolvedRequests.set(`uid:${byUid}`, {
              idType: "INSTRUMENT_ID_TYPE_UID",
              id: byUid,
            });
          }
          if (byFigi) {
            unresolvedRequests.set(`figi:${byFigi}`, {
              idType: "INSTRUMENT_ID_TYPE_FIGI",
              id: byFigi,
            });
          }
          if (byPositionUid) {
            unresolvedRequests.set(`position_uid:${byPositionUid}`, {
              idType: "INSTRUMENT_ID_TYPE_POSITION_UID",
              id: byPositionUid,
            });
          }
        }

        const getInstrumentBy = (instrumentsClient as any)?.GetInstrumentBy;
        if (unresolvedRequests.size > 0 && typeof getInstrumentBy === "function") {
          const resolvedInstruments = await mapLimit(
            Array.from(unresolvedRequests.values()),
            6,
            async ({ idType, id }) => {
              try {
                const resp: any = await grpcCallWithRetry(
                  getInstrumentBy.bind(instrumentsClient),
                  { id_type: idType, id },
                  metadata,
                  2
                );
                return resp?.instrument || null;
              } catch {
                return null;
              }
            }
          );

          const validResolved = resolvedInstruments.filter(
            (instrument) => instrument && typeof instrument === "object"
          );
          if (validResolved.length > 0) {
            upsertInstrumentCache(validResolved);
          }
        }

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
      const typeIcons: Record<string, string> = {
        share: "◉",
        bond: "◍",
        etf: "◔",
        currency: "◌",
        futures: "◈",
        option: "◐",
        other: "•",
      };
      const formatQuantity = (value: number): string =>
        new Intl.NumberFormat("ru-RU", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 4,
        }).format(value);

      const byType: Record<string, number> = {};
      for (const p of positions) {
        const cur = toNumber(p.current_price);
        const qty = toNumber(p.quantity);
        const curValue = cur * qty;
        const t = (p.instrument_type || "other").toLowerCase();
        byType[t] = (byType[t] || 0) + curValue;
      }

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
        const accountsResp = (await grpcCall(
          usersClient.GetAccounts.bind(usersClient),
          {},
          metadata
        )) as AccountsResponse;
        const acc = (accountsResp?.accounts || []).find((a: any) => a.id === accountId);
        if (acc?.opened_date?.seconds) {
          fromSeconds = Number(acc.opened_date.seconds);
        }
      } catch {
        // fallback to default
      }

      const toSeconds = Math.floor(Date.now() / 1000);
      const receivedDividendOps: Array<{ time: number; amount: number; ticker: string }> = [];
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
      const passiveIncomeByFigi = new Map<string, number>();
      const passiveIncomeByUid = new Map<string, number>();
      let tradesNet = 0;
      let couponsIncome = 0;
      let dividendsIncome = 0;
      let commissionsTotal = 0;
      let taxesTotal = 0;
      const opSeenKeys = new Set<string>();
      const makeOpKey = (op: any): string => {
        const id = String(op?.id || "").trim();
        if (id) return "id:" + id;
        return [
          String(op?.date?.seconds || 0),
          String(op?.operation_type ?? op?.type ?? ""),
          String(op?.payment?.units ?? ""),
          String(op?.payment?.nano ?? ""),
          String(op?.payment?.currency ?? op?.currency ?? ""),
          String(op?.figi ?? ""),
          String(op?.instrument_uid ?? op?.instrumentUid ?? ""),
          String(op?.quantity ?? ""),
        ].join("|");
      };
      const resolveOpTicker = (op: any): string => {
        const fromCatalog = getDisplayName(op);
        if (fromCatalog && fromCatalog !== unknownDisplayName) return fromCatalog;
        const ticker = String(op?.ticker || "").trim();
        if (ticker) return ticker;
        const nameCandidates = [op?.name, op?.instrument_name, op?.instrumentName];
        for (const raw of nameCandidates) {
          if (typeof raw !== "string") continue;
          const value = raw.trim();
          if (value && value.length > 1) return value;
        }
        return "Инструмент";
      };

      try {
        let ops: any[] = [];
        if (typeof client.GetOperationsByCursor === "function") {
          try {
            let cursor = "";
            let pageGuard = 0;
            while (pageGuard < 500) {
              const pageResp: any = await grpcCall(
                client.GetOperationsByCursor.bind(client),
                {
                  account_id: accountId,
                  from: { seconds: fromSeconds, nanos: 0 },
                  to: { seconds: toSeconds, nanos: 0 },
                  state: "OPERATION_STATE_EXECUTED",
                  cursor,
                  limit: 1000,
                  without_trades: true,
                },
                metadata
              );
              const pageItems = Array.isArray(pageResp?.items) ? pageResp.items : [];
              if (pageItems.length) {
                for (const item of pageItems) {
                  const key = makeOpKey(item);
                  if (opSeenKeys.has(key)) continue;
                  opSeenKeys.add(key);
                  ops.push(item);
                }
              }
              const nextCursor = String(pageResp?.next_cursor || "");
              const hasNext = Boolean(pageResp?.has_next);
              if (!hasNext || !nextCursor || nextCursor === cursor) break;
              cursor = nextCursor;
              pageGuard += 1;
            }
          } catch {
            // fallback to GetOperations below
            ops = [];
          }
        }
        if (!ops.length) {
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
          const fallbackOps = Array.isArray(opsResp?.operations) ? opsResp.operations : [];
          for (const item of fallbackOps) {
            const key = makeOpKey(item);
            if (opSeenKeys.has(key)) continue;
            opSeenKeys.add(key);
            ops.push(item);
          }
        }
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
          "OPERATION_TYPE_OVER_COM",
        ]);
        const commissionTypeIds = new Set([12, 14, 19, 24, 30, 31, 45, 46, 47, 55, 56, 62]);
        const payoutTaxTypes = new Set([
          "OPERATION_TYPE_TAX",
          "OPERATION_TYPE_TAX_CORRECTION",
          "OPERATION_TYPE_TAX_PROGRESSIVE",
          "OPERATION_TYPE_TAX_CORRECTION_PROGRESSIVE",
          "OPERATION_TYPE_DIVIDEND_TAX",
          "OPERATION_TYPE_BOND_TAX",
          "OPERATION_TYPE_DIVIDEND_TAX_PROGRESSIVE",
          "OPERATION_TYPE_BOND_TAX_PROGRESSIVE",
          "OPERATION_TYPE_TAX_CORRECTION_COUPON",
        ]);
        const payoutTaxTypeIds = new Set([2, 5, 8, 11, 32, 33, 34, 36, 44]);
        const isCommissionOperation = (opType: unknown, opTypeStr: string, opTypeNum: number): boolean =>
          commissionTypes.has(opType as string) ||
          commissionTypes.has(opTypeStr) ||
          commissionTypeIds.has(opTypeNum);
        const hasExplicitCommissionOps = ops.some((op) => {
          const opType = op?.operation_type ?? op?.type ?? "";
          const opTypeStr = String(opType || "").toUpperCase();
          const opTypeNum = Number(opType);
          if (excludeTypes.has(opType) || excludeTypes.has(opTypeStr)) return false;
          const opCurrency = (op?.payment?.currency || op?.currency || "").toUpperCase();
          if (opCurrency && opCurrency !== currency) return false;
          const seconds = Number(op?.date?.seconds || 0);
          if (!seconds) return false;
          const raw = toNumber(op?.payment);
          if (!Number.isFinite(raw) || raw === 0) return false;
          return isCommissionOperation(opType, opTypeStr, opTypeNum);
        });
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

          const commission = Math.abs(toNumber(op?.commission));
          const commCurrency = (op?.commission?.currency || "").toUpperCase();
          const commissionFromField =
            commission && (!commCurrency || commCurrency === currency) ? commission : 0;

          const isCouponIncome =
            couponIncomeTypes.has(opType) ||
            couponIncomeTypes.has(opTypeStr) ||
            couponIncomeTypeIds.has(opTypeNum);
          const isDividendIncome =
            receivedDividendTypes.has(opType) ||
            receivedDividendTypes.has(opTypeStr) ||
            receivedDividendTypeIds.has(opTypeNum);
          const isCommission = isCommissionOperation(opType, opTypeStr, opTypeNum);
          const isPayoutTax =
            payoutTaxTypes.has(opType) ||
            payoutTaxTypes.has(opTypeStr) ||
            payoutTaxTypeIds.has(opTypeNum) ||
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
              receivedDividendOps.push({
                time: seconds * 1000,
                amount: raw,
                ticker: resolveOpTicker(op),
              });
            }
            dividendsIncome += raw;
          }
          if (isCouponIncome || isDividendIncome) {
            const opFigi = String(op?.figi || "").trim();
            const opUid = String(op?.instrument_uid || op?.instrumentUid || "").trim();
            if (opFigi) {
              passiveIncomeByFigi.set(opFigi, (passiveIncomeByFigi.get(opFigi) || 0) + raw);
            }
            if (opUid) {
              passiveIncomeByUid.set(opUid, (passiveIncomeByUid.get(opUid) || 0) + raw);
            }
          }
          if (isCommission) {
            // payment < 0 means fee charged, payment > 0 means refund
            commissionsTotal += -raw;
          } else if (!hasExplicitCommissionOps && commissionFromField > 0) {
            // Use per-trade commission only when separate fee operations are absent.
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

      const totalByType = Object.values(byType).reduce(
        (sum, value) => sum + Number(value || 0),
        0
      );
      const assetPie = Object.keys(byType)
        .sort()
        .map((k) => {
          const value = Number(byType[k] || 0);
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

          const value = Number(byType[k] || 0);
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
      const sectorLabels: Record<string, string> = {
        it: "Информационные технологии",
        financial: "Финансы",
        energy: "Энергетика",
        materials: "Материалы",
        industrials: "Промышленность и строительство",
        telecom: "Коммуникации",
        consumer: "Товары потребительского сектора",
        health_care: "Здравоохранение",
        real_estate: "Недвижимость",
        utilities: "Коммунальные услуги",
        electrocars: "Электромобили",
        government: "Государственный сектор",
        municipal: "Муниципальный сектор",
        other: "Прочее",
      };
      const countryRegionLabels: Record<string, string> = {
        US: "Северная Америка",
        CA: "Северная Америка",
        MX: "Северная Америка",
        BR: "Латинская Америка",
        AR: "Латинская Америка",
        CL: "Латинская Америка",
        CO: "Латинская Америка",
        PE: "Латинская Америка",
        VE: "Латинская Америка",
        GB: "Великобритания",
        DE: "Европа",
        FR: "Европа",
        IT: "Европа",
        ES: "Европа",
        NL: "Европа",
        BE: "Европа",
        LU: "Европа",
        IE: "Европа",
        CH: "Европа",
        AT: "Европа",
        NO: "Европа",
        SE: "Европа",
        DK: "Европа",
        FI: "Европа",
        PT: "Европа",
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
        GR: "Европа",
        CY: "Европа",
        EE: "Европа",
        LV: "Европа",
        LT: "Европа",
        TR: "Развивающаяся Европа",
        AE: "Ближний Восток и Африка",
        SA: "Ближний Восток и Африка",
        QA: "Ближний Восток и Африка",
        KW: "Ближний Восток и Африка",
        IL: "Ближний Восток и Африка",
        EG: "Ближний Восток и Африка",
        ZA: "Ближний Восток и Африка",
        NG: "Ближний Восток и Африка",
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
      const normalizeCurrencyCode = (value: unknown): string => {
        if (typeof value !== "string") return "";
        const code = value.trim().toUpperCase();
        if (!code) return "";
        if (code === "RUR") return "RUB";
        return code;
      };
      const normalizeCountryCode = (value: unknown): string => {
        if (typeof value !== "string") return "";
        return value.trim().toUpperCase();
      };
      const formatSectorLabel = (value: unknown, type: string): string => {
        if (typeof value === "string") {
          const key = value.trim().toLowerCase();
          if (key) return sectorLabels[key] || "Сектор не определен";
        }
        if (type === "currency") return "Валютный рынок";
        return "Сектор не определен";
      };
      const inferCountryMeta = (
        input: { code: string; name: string; type: string; currencyCode: string; classCode: string; assetName: string }
      ): { code: string; name: string } => {
        if (input.code || input.name) {
          return {
            code: input.code,
            name: input.name,
          };
        }
        const normalizedClassCode = String(input.classCode || "").toUpperCase();
        const looksRussianByClass =
          normalizedClassCode.startsWith("TQ") ||
          normalizedClassCode.startsWith("FQ") ||
          normalizedClassCode.includes("SPBRU");
        const looksRussianByName = /[А-Яа-яЁё]/.test(input.assetName);
        const isLocalRubMarket = input.currencyCode === "RUB";
        if (
          input.type !== "currency" &&
          (isLocalRubMarket || looksRussianByClass || looksRussianByName)
        ) {
          return {
            code: "RU",
            name: "Российская Федерация",
          };
        }
        return { code: "", name: "" };
      };
      const resolveRegionLabel = (countryCode: string, type: string): string => {
        if (countryCode) return countryRegionLabels[countryCode] || "Другие регионы";
        if (type === "currency") return "Валютный рынок";
        if (type === "futures" || type === "option") return "Срочный рынок";
        return "Глобальный рынок";
      };
      const formatCountryLabel = (countryCode: string, countryName: string, type: string): string => {
        if (countryName) return countryName;
        if (countryCode) return countryCode;
        if (type === "currency") return "Валютный рынок";
        if (type === "futures" || type === "option") return "Срочный рынок";
        return "Глобальный рынок";
      };
      const resolveAssetCurrency = (p: any, metaCurrency: string): string => {
        const fromPosition = normalizeCurrencyCode(
          p?.current_price?.currency || p?.average_position_price?.currency || p?.expected_yield?.currency
        );
        const fromMeta = normalizeCurrencyCode(metaCurrency);
        return fromPosition || fromMeta || currency;
      };
      const nowMs = Date.now();
      const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
      const myAssets = positions
        .map((p, index) => {
          const type = (p.instrument_type || "other").toLowerCase();
          const meta = getInstrumentInfo(p);
          const qty = toNumber(p.quantity);
          const avg = toNumber(p.average_position_price);
          const cur = toNumber(p.current_price);
          const invested = avg * qty;
          const currentValue = cur * qty;
          const nominal = toNumber(meta?.nominal);
          const maturityMs = Number(meta?.maturityMs) || 0;
          let assetYield = currentValue - invested;
          if (type === "bond" && nominal > 0) {
            const redemptionValue = nominal * qty;
            const pullToParTotal = redemptionValue - currentValue;
            if (maturityMs > nowMs) {
              const yearsToMaturity = Math.max((maturityMs - nowMs) / msPerYear, 1 / 12);
              assetYield = pullToParTotal / yearsToMaturity;
            } else if (maturityMs > 0) {
              assetYield = pullToParTotal;
            }
          }
          const figi = String(p?.figi || "").trim();
          const uid = String(p?.instrument_uid || p?.instrumentUid || "").trim();
          const passiveIncomeByFigiValue = figi ? passiveIncomeByFigi.get(figi) : undefined;
          const passiveIncome =
            passiveIncomeByFigiValue !== undefined
              ? passiveIncomeByFigiValue
              : uid
                ? passiveIncomeByUid.get(uid) || 0
                : 0;
          const profitValue = assetYield + passiveIncome;
          const yieldPct = invested !== 0 ? (profitValue / invested) * 100 : 0;
          const portfolioSharePct = totalCurrent > 0 ? (currentValue / totalCurrent) * 100 : 0;
          const name = getDisplayName(p);
          const rawCountryCode = normalizeCountryCode(meta?.countryOfRisk);
          const rawCountryName =
            typeof meta?.countryOfRiskName === "string" ? meta.countryOfRiskName.trim() : "";
          const currencyCode = resolveAssetCurrency(p, meta?.currency || meta?.nominal?.currency || "");
          const inferredCountry = inferCountryMeta({
            code: rawCountryCode,
            name: rawCountryName,
            type,
            currencyCode,
            classCode: String(meta?.classCode || ""),
            assetName: name || "",
          });
          const countryCode = inferredCountry.code || rawCountryCode;
          const countryName = inferredCountry.name || rawCountryName;
          return {
            id: `asset-${index + 1}`,
            type,
            assetClassLabel: typeLabels[type] || "Прочее",
            icon: typeIcons[type] || typeIcons.other,
            name: name || "Название недоступно",
            currencyCode,
            sectorLabel: formatSectorLabel(meta?.sector, type),
            countryCode,
            countryLabel: formatCountryLabel(countryCode, countryName, type),
            regionLabel: resolveRegionLabel(countryCode, type),
            quantity: qty,
            quantityText: formatQuantity(qty),
            invested,
            investedText: formatMoney(invested, currency),
            currentValue,
            currentValueText: formatMoney(currentValue, currency),
            passiveIncome,
            passiveIncomeText: formatMoney(passiveIncome, currency),
            assetYield,
            assetYieldText: formatMoney(assetYield, currency),
            profitValue,
            profitText: formatMoney(profitValue, currency),
            yieldPct,
            yieldPctText: formatPercent(yieldPct),
            portfolioSharePct,
            portfolioSharePctText: formatPercent(portfolioSharePct),
          };
        })
        .sort((a, b) => b.currentValue - a.currentValue);
      const myAssetsTotals = myAssets.reduce(
        (acc, asset) => {
          acc.quantity += asset.quantity;
          acc.invested += asset.invested;
          acc.currentValue += asset.currentValue;
          acc.passiveIncome += asset.passiveIncome;
          acc.assetYield += asset.assetYield;
          acc.profitValue += asset.profitValue;
          acc.portfolioSharePct += asset.portfolioSharePct;
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
      const myAssetsYieldPct =
        myAssetsTotals.invested !== 0 ? (myAssetsTotals.profitValue / myAssetsTotals.invested) * 100 : 0;

      const bondCompaniesMap = new Map<string, number>();
      for (const p of positions) {
        if ((p.instrument_type || "").toLowerCase() !== "bond") continue;
        const name = getDisplayName(p);
        const company =
          name === unknownDisplayName
            ? "Неизвестный эмитент"
            : normalizeBondCompany(name);
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
      const next12DetailsMap = new Map<
        string,
        Array<{ ticker: string; eventType: string; amount: number }>
      >();
      const y2026Map = new Map<string, number>();
      const upcomingEvents: Array<{
        date: string;
        name: string;
        eventType: string;
        amount: string;
        timestamp: number;
        quantity: number;
        quantityText: string;
        perAssetValue: number;
        perAssetAmount: string;
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
      const pushNext12Detail = (
        key: string,
        ticker: string,
        eventType: string,
        amount: number
      ): void => {
        const name = String(ticker || "").trim();
        if (!name || !Number.isFinite(amount) || amount <= 0) return;
        const rows = next12DetailsMap.get(key) || [];
        rows.push({ ticker: name, eventType, amount });
        next12DetailsMap.set(key, rows);
      };

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
              pushNext12Detail(key, getDisplayName(p), "Купон", amount);
            }
            if (dt >= now && dt <= nextWeekEnd) {
              upcomingEvents.push({
                date: formatEventDate(dt),
                name: getDisplayName(p),
                eventType: "Купон",
                amount: formatMoney(amount, currency),
                timestamp: dt.getTime(),
                quantity: qty,
                quantityText: formatQuantity(qty),
                perAssetValue: qty > 0 ? amount / qty : 0,
                perAssetAmount: formatMoney(qty > 0 ? amount / qty : 0, currency),
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
            if (dividendType && !dividendType.includes("regular")) continue;
            if (
              dividendType.includes("daily") ||
              dividendType.includes("return") ||
              dividendType.includes("capital") ||
              dividendType.includes("special") ||
              dividendType.includes("extra")
            ) {
              continue;
            }
            const amount = toNumber(d?.dividend_net) * qty;
            if (!Number.isFinite(amount) || amount <= 0) continue;
            const cur = (d?.dividend_net?.currency || currency).toUpperCase();
            if (cur !== currency) continue;
            const key = monthKey(dt);
            if (dt >= now && dt <= endNext12) {
              next12Map.set(key, (next12Map.get(key) || 0) + amount);
              pushNext12Detail(key, getDisplayName(p), "Дивиденд", amount);
            }
            if (dt >= now && dt <= nextWeekEnd) {
              upcomingEvents.push({
                date: formatEventDate(dt),
                name: getDisplayName(p),
                eventType: "Дивиденд",
                amount: formatMoney(amount, currency),
                timestamp: dt.getTime(),
                quantity: qty,
                quantityText: formatQuantity(qty),
                perAssetValue: qty > 0 ? amount / qty : 0,
                perAssetAmount: formatMoney(qty > 0 ? amount / qty : 0, currency),
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
        value: next12Map.get(k) || 0,
        amount: formatMoney(next12Map.get(k) || 0, currency),
      }));
      const incomeNext12Details = next12Keys.map((k) => {
        const rows = (next12DetailsMap.get(k) || [])
          .slice()
          .sort((a, b) => b.amount - a.amount)
          .map((item) => ({
            ticker: item.ticker,
            eventType: item.eventType,
            amount: item.amount,
            amountText: formatMoney(item.amount, currency),
          }));
        return {
          month: monthLabel(k),
          items: rows,
        };
      });
      const passiveIncomeTotal = incomeNext12.reduce((sum, row) => sum + row.value, 0);
      const passiveBaseValue = positions.reduce((sum, p) => {
        const type = (p.instrument_type || "").toLowerCase();
        if (type === "currency") return sum;
        const cur = toNumber(p.current_price);
        const qty = toNumber(p.quantity);
        return sum + cur * qty;
      }, 0);
      const passiveIncomeYieldPct =
        passiveBaseValue > 0 ? (passiveIncomeTotal / passiveBaseValue) * 100 : 0;

      const dividendsStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const dividends12Keys = buildMonthList(dividendsStart, 12);
      const dividends12Map = new Map<string, number>();
      const dividends12DetailsMap = new Map<
        string,
        Array<{ ticker: string; eventType: string; amount: number }>
      >();
      for (const op of receivedDividendOps) {
        const dt = new Date(op.time);
        if (dt < dividendsStart || dt > now) continue;
        const key = monthKey(dt);
        dividends12Map.set(key, (dividends12Map.get(key) || 0) + op.amount);
        const ticker = String(op.ticker || "").trim();
        if (ticker && op.amount > 0) {
          const rows = dividends12DetailsMap.get(key) || [];
          rows.push({ ticker, eventType: "Дивиденд", amount: op.amount });
          dividends12DetailsMap.set(key, rows);
        }
      }
      const receivedDividends12 = dividends12Keys.map((k) => ({
        month: monthLabel(k),
        value: dividends12Map.get(k) || 0,
        amount: formatMoney(dividends12Map.get(k) || 0, currency),
      }));
      const receivedDividends12Details = dividends12Keys.map((k) => {
        const rows = (dividends12DetailsMap.get(k) || [])
          .slice()
          .sort((a, b) => b.amount - a.amount)
          .map((item) => ({
            ticker: item.ticker,
            eventType: item.eventType,
            amount: item.amount,
            amountText: formatMoney(item.amount, currency),
          }));
        return {
          month: monthLabel(k),
          items: rows,
        };
      });

      const redemptionMap = new Map<string, number>();
      const redemptionsDetails: Array<{ month: string; name: string; amount: string }> = [];
      for (const p of positions) {
        if ((p.instrument_type || "").toLowerCase() !== "bond") continue;
        const meta = getInstrumentInfo(p);
        if (!meta) continue;
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
            quantity: qty,
            quantityText: formatQuantity(qty),
            perAssetValue: qty > 0 ? value / qty : 0,
            perAssetAmount: formatMoney(qty > 0 ? value / qty : 0, currency),
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
        currency,
        total: formatMoney(totalCurrent, currency),
        profitRub: formatMoney(operationProfit, currency),
        profitValue: operationProfit,
        profitPct: formatPercent(operationProfitPct),
        profitBreakdown: {
          currentValue: totalCurrent,
          currentValueRub: formatMoney(totalCurrent, currency),
          tradesNet: tradesNet,
          tradesNetRub: formatMoney(tradesNet, currency),
          coupons: couponsIncome,
          couponsRub: formatMoney(couponsIncome, currency),
          dividends: dividendsIncome,
          dividendsRub: formatMoney(dividendsIncome, currency),
          commissions: commissionsTotal,
          commissionsRub: formatMoney(commissionsTotal, currency),
          taxes: taxesTotal,
          taxesRub: formatMoney(taxesTotal, currency),
          marketProfitRub: formatMoney(marketProfit, currency),
          marketProfitPct: formatPercent(marketProfitPct),
        },
        yieldPct: safePercent(couponYieldPct),
        yieldIncomeValue: couponNext12Total,
        yieldIncomeRub: formatMoney(couponNext12Total, currency),
        yieldBaseValue: bondTotalCurrent,
        yieldBaseRub: formatMoney(bondTotalCurrent, currency),
        assetPie,
        assetBreakdown,
        myAssets,
        myAssetsTotals: {
          quantity: myAssetsTotals.quantity,
          quantityText: formatQuantity(myAssetsTotals.quantity),
          invested: myAssetsTotals.invested,
          investedText: formatMoney(myAssetsTotals.invested, currency),
          currentValue: myAssetsTotals.currentValue,
          currentValueText: formatMoney(myAssetsTotals.currentValue, currency),
          passiveIncome: myAssetsTotals.passiveIncome,
          passiveIncomeText: formatMoney(myAssetsTotals.passiveIncome, currency),
          assetYield: myAssetsTotals.assetYield,
          assetYieldText: formatMoney(myAssetsTotals.assetYield, currency),
          profitValue: myAssetsTotals.profitValue,
          profitText: formatMoney(myAssetsTotals.profitValue, currency),
          yieldPct: myAssetsYieldPct,
          yieldPctText: formatPercent(myAssetsYieldPct),
          portfolioSharePct: myAssetsTotals.portfolioSharePct,
          portfolioSharePctText: formatPercent(myAssetsTotals.portfolioSharePct),
        },
        bondCompanies,
        bondCompaniesCount: "Компаний: " + String(bondCompanies.length),
        incomeNext12,
        incomeNext12Details,
        passiveIncomeTotal,
        passiveIncomeTotalRub: formatMoney(passiveIncomeTotal, currency),
        passiveIncomeBaseValue: passiveBaseValue,
        passiveIncomeBaseRub: formatMoney(passiveBaseValue, currency),
        passiveIncomeYieldPct: formatPercent(passiveIncomeYieldPct),
        receivedDividends12,
        receivedDividends12Details,
        redemptionsNext12,
        redemptionsDetails,
        upcomingEvents: upcomingEvents.map((e) => ({
          date: e.date,
          name: e.name,
          eventType: e.eventType,
          amount: e.amount,
          quantity: e.quantity,
          quantityText: e.quantityText,
          perAssetValue: e.perAssetValue,
          perAssetAmount: e.perAssetAmount,
        })),
      });
      recordAnalyticsMetrics(assetPie.length, incomeNext12.length);
    });
  });

  app.post("/api/cache/refresh", async (_req, res) => {
    clearAllCaches();
    persistInstrumentCaches();
    persistIncomeCache();
    res.json({ ok: true });
  });

  app.post("/api/names/refresh", async (req, res) => {
    try {
      const parsed = accountsPayloadSchema.safeParse(req.body || {});
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: "Invalid payload",
          details: mapZodIssues(parsed.error),
        });
        return;
      }

      const tokenFromBody = parsed.data.token || "";
      const token = resolveToken(req, tokenFromBody);

      if (!token) {
        res.status(400).json({ ok: false, error: "Missing token" });
        return;
      }
      const instrumentsClient = clients.createInstrumentsClient(endpoint);
      const metadata = buildAuthMetadata(token, appName);
      const fetchBatchIfAvailable = async (
        kind: string,
        cacheKey: string
      ): Promise<{
        kind: string;
        cacheKey: string;
        status: "ok" | "skipped" | "error";
        count: number;
        error?: string;
      }> => {
        const method = (instrumentsClient as any)?.[kind];
        if (typeof method !== "function") {
          return {
            kind,
            cacheKey,
            status: "skipped",
            count: 0,
          };
        }
        try {
          const list = await fetchInstrumentsBatch(
            instrumentsClient,
            metadata,
            kind,
            cacheKey,
            { forceRefresh: true, throwOnError: true }
          );
          return {
            kind,
            cacheKey,
            status: "ok",
            count: Array.isArray(list) ? list.length : 0,
          };
        } catch (error: any) {
          return {
            kind,
            cacheKey,
            status: "error",
            count: 0,
            error: error?.message || "refresh failed",
          };
        }
      };
      const batches = [
        await fetchBatchIfAvailable("Shares", "shares"),
        await fetchBatchIfAvailable("Etfs", "etfs"),
        await fetchBatchIfAvailable("Currencies", "currencies"),
        await fetchBatchIfAvailable("Bonds", "bonds"),
        await fetchBatchIfAvailable("Futures", "futures"),
        await fetchBatchIfAvailable("Options", "options"),
      ];

      const all = ([] as any[]).concat(
        instrumentBatchCache.get("shares") || [],
        instrumentBatchCache.get("etfs") || [],
        instrumentBatchCache.get("currencies") || [],
        instrumentBatchCache.get("bonds") || [],
        instrumentBatchCache.get("futures") || [],
        instrumentBatchCache.get("options") || []
      );

      const updated = upsertInstrumentCache(all);
      persistInstrumentCaches();
      const requiredKinds = new Set(["Shares", "Etfs", "Currencies", "Bonds", "Futures"]);
      const failures = batches.filter(
        (item) => item.status === "error" && requiredKinds.has(item.kind)
      );
      const warnings = batches.filter(
        (item) => item.status === "error" && !requiredKinds.has(item.kind)
      );
      res.json({
        ok: failures.length === 0,
        updated,
        totalInstruments: all.length,
        warnings: warnings.length,
        batches,
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message || "Refresh failed" });
    }
  });

  if (useReactUi) {
    app.get(/^\/(?!api\/|metrics$|legacy(?:\/|$)).*/, (_req, res) => {
      res.sendFile(frontendIndexPath);
    });
  }
}
