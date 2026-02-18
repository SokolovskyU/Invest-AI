import assert from "assert";
import express from "express";
import { registerRoutes } from "../src/routes";
import { instrumentCache, instrumentBatchCache } from "../src/cache";

const app = express();
app.use(express.json({ limit: "32kb" }));

const mockUsersClient = {
  GetAccounts: (_req: any, _md: any, cb: any) => {
    cb(null, {
      accounts: [
        {
          id: "acc-1",
          name: "Main",
          type: "ACCOUNT_TYPE_TINKOFF",
          status: "ACCOUNT_STATUS_OPEN",
          access_level: "ACCOUNT_ACCESS_LEVEL_FULL_ACCESS",
          opened_date: { seconds: 1700000000 },
        },
      ],
    });
  },
};

const mockOperationsClient = {
  GetPortfolio: (_req: any, _md: any, cb: any) => {
    cb(null, {
      total_amount_portfolio: { units: "1200", nano: 0, currency: "RUB" },
      positions: [
        {
          figi: "TCS00A10D1W2",
          instrument_type: "bond",
          quantity: { units: "2", nano: 0 },
          average_position_price: { units: "500", nano: 0, currency: "RUB" },
          current_price: { units: "550", nano: 0, currency: "RUB" },
          expected_yield: { units: "100", nano: 0, currency: "RUB" },
        },
        {
          figi: "BLOCKEDFIGI1",
          instrument_type: "share",
          blocked: true,
          quantity: { units: "3", nano: 0 },
          average_position_price: { units: "100", nano: 0, currency: "RUB" },
          current_price: { units: "120", nano: 0, currency: "RUB" },
          expected_yield: { units: "60", nano: 0, currency: "RUB" },
        },
      ],
    });
  },
  GetOperations: (_req: any, _md: any, cb: any) => {
    cb(null, {
      operations: [
        {
          operation_type: "OPERATION_TYPE_BUY",
          payment: { units: "-1000", nano: 0, currency: "RUB" },
          commission: { units: "10", nano: 0, currency: "RUB" },
          date: { seconds: 1700000000 },
        },
        {
          operation_type: "OPERATION_TYPE_BROKER_FEE",
          payment: { units: "-10", nano: 0, currency: "RUB" },
          date: { seconds: 1700000100 },
        },
        {
          operation_type: "OPERATION_TYPE_DIVIDEND",
          payment: { units: "200", nano: 0, currency: "RUB" },
          date: { seconds: 1705000000 },
        },
        {
          operation_type: "OPERATION_TYPE_DIVIDEND_TAX",
          payment: { units: "-20", nano: 0, currency: "RUB" },
          date: { seconds: 1705000100 },
        },
        {
          operation_type: "OPERATION_TYPE_TAX",
          payment: { units: "-26", nano: 0, currency: "RUB" },
          date: { seconds: 1705000200 },
        },
        {
          operation_type: "OPERATION_TYPE_TAX_CORRECTION",
          payment: { units: "6", nano: 0, currency: "RUB" },
          date: { seconds: 1705000300 },
        },
      ],
    });
  },
};

const mockInstrumentsClient = {
  Shares: (_req: any, _md: any, cb: any) =>
    cb(null, {
      instruments: [
        {
          figi: "BLOCKEDFIGI1",
          name: "Blocked Share",
          risk_level: "RISK_LEVEL_MODERATE",
          instrument_type: "share",
        },
      ],
    }),
  Etfs: (_req: any, _md: any, cb: any) => cb(null, { instruments: [] }),
  Currencies: (_req: any, _md: any, cb: any) => cb(null, { instruments: [] }),
  Bonds: (_req: any, _md: any, cb: any) =>
    cb(null, {
      instruments: [
        {
          figi: "TCS00A10D1W2",
          name: "TCS00A10D1W2",
          risk_level: "RISK_LEVEL_LOW",
          instrument_type: "bond",
          maturity_date: { seconds: 1893456000 },
          nominal: { units: "1000", nano: 0, currency: "RUB" },
        },
      ],
    }),
  GetBondCoupons: (_req: any, _md: any, cb: any) =>
    cb(null, {
      events: [
        {
          coupon_date: { seconds: 1893456000 },
          pay_one_bond: { units: "50", nano: 0, currency: "RUB" },
        },
      ],
    }),
  GetDividends: (_req: any, _md: any, cb: any) => cb(null, { dividends: [] }),
};

const mockMarketDataClient = {
  GetLastPrices: (req: any, _md: any, cb: any) => {
    const ids = Array.isArray(req?.instrument_id) ? req.instrument_id : [];
    if (ids.length > 1 && ids.includes("BLOCKEDFIGI1")) {
      cb({ message: "invalid instrument_id" });
      return;
    }
    const rows = ids
      .map((id: string) => {
        if (id === "TCS00A10D1W2") {
          return { instrument_uid: id, figi: id, price: { units: "550", nano: 0 } };
        }
        return null;
      })
      .filter(Boolean);
    cb(null, { last_prices: rows });
  },
  GetClosePrices: (req: any, _md: any, cb: any) => {
    const ids = Array.isArray(req?.instruments)
      ? req.instruments.map((i: any) => String(i?.instrument_id || ""))
      : [];
    if (ids.length > 1 && ids.includes("BLOCKEDFIGI1")) {
      cb({ message: "invalid instrument_id" });
      return;
    }
    const rows = ids
      .map((id: string) => {
        if (id === "TCS00A10D1W2") {
          return { instrument_uid: id, figi: id, price: { units: "540", nano: 0 } };
        }
        return null;
      })
      .filter(Boolean);
    cb(null, { close_prices: rows });
  },
  GetCandles: (_req: any, _md: any, cb: any) =>
    cb(null, {
      candles: [
        {
          close: { units: "540", nano: 0 },
          time: { seconds: 1700000000, nanos: 0 },
          is_complete: true,
        },
        {
          close: { units: "550", nano: 0 },
          time: { seconds: 1700086400, nanos: 0 },
          is_complete: true,
        },
      ],
    }),
};

registerRoutes(app, {
  endpoint: "mock",
  appName: "test",
  defaultToken: "test",
  clients: {
    createUsersClient: () => mockUsersClient as any,
    createOperationsClient: () => mockOperationsClient as any,
    createInstrumentsClient: () => mockInstrumentsClient as any,
    createMarketDataClient: () => mockMarketDataClient as any,
  },
});

async function run() {
  instrumentCache.clear();
  instrumentBatchCache.clear();

  const server = await new Promise<import("http").Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const { port } = server.address() as any;
  const res = await fetch(`http://127.0.0.1:${port}/api/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId: "acc-1" }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();

  assert.ok(body.total);
  assert.ok(body.assetPie);
  assert.ok(body.assetBreakdown);
  assert.ok(Array.isArray(body.myAssets));
  assert.ok(body.myAssets.length > 0);
  assert.ok(body.myAssetsTotals);
  assert.ok(body.bondCompanies);
  assert.ok(body.incomeNext12);
  assert.ok(Array.isArray(body.incomeNext12Details));
  assert.ok(body.redemptionsNext12);
  assert.ok(body.redemptionsDetails);
  assert.equal(typeof body.yieldIncomeValue, "number");
  assert.equal(typeof body.yieldIncomeRub, "string");
  assert.equal(typeof body.yieldBaseValue, "number");
  assert.equal(typeof body.yieldBaseRub, "string");
  assert.equal(body.profitBreakdown.commissions, 10);
  assert.equal(body.profitBreakdown.taxes, 40);

  // Ensure technical codes are not exposed as names
  const hasCodeName = JSON.stringify(body).includes("TCS00A10D1W2");
  assert.equal(hasCodeName, false);

  const portfolioRes = await fetch(`http://127.0.0.1:${port}/api/portfolio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId: "acc-1" }),
  });
  assert.equal(portfolioRes.status, 200);
  const portfolioBody = await portfolioRes.json();
  assert.ok(Array.isArray(portfolioBody.positions));
  assert.equal(portfolioBody.positions.length, 1);
  assert.ok(Array.isArray(portfolioBody.moverPositions));
  assert.equal(portfolioBody.moverPositions.length, 2);
  assert.equal(
    portfolioBody.moverPositions.some((row: any) => row.name === "Blocked Share"),
    true
  );
  assert.equal(portfolioBody.positions[0].dayPriceAvailable, true);
  assert.equal(String(portfolioBody.positions[0].dayChangePct || "").replace(",", "."), "1.85%");

  const invalidPayloadRes = await fetch(`http://127.0.0.1:${port}/api/portfolio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId: 123 }),
  });
  assert.equal(invalidPayloadRes.status, 400);
  const invalidPayloadBody = await invalidPayloadRes.json();
  assert.equal(invalidPayloadBody.error, "Invalid payload");
  assert.equal(Array.isArray(invalidPayloadBody.details), true);

  await new Promise<void>((resolve) => server.close(() => resolve()));
}

run().then(
  () => console.log("api analytics tests passed"),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
