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
      ],
    });
  },
  GetOperations: (_req: any, _md: any, cb: any) => {
    cb(null, {
      operations: [
        {
          operation_type: "OPERATION_TYPE_BUY",
          payment: { units: "-1000", nano: 0, currency: "RUB" },
          date: { seconds: 1700000000 },
        },
        {
          operation_type: "OPERATION_TYPE_DIVIDEND",
          payment: { units: "200", nano: 0, currency: "RUB" },
          date: { seconds: 1705000000 },
        },
      ],
    });
  },
};

const mockInstrumentsClient = {
  Shares: (_req: any, _md: any, cb: any) => cb(null, { instruments: [] }),
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
  GetLastPrices: (_req: any, _md: any, cb: any) => cb(null, { last_prices: [] }),
  GetClosePrices: (_req: any, _md: any, cb: any) => cb(null, { close_prices: [] }),
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
  assert.ok(body.bondCompanies);
  assert.ok(body.incomeNext12);
  assert.ok(body.redemptionsNext12);
  assert.ok(body.redemptionsDetails);

  // Ensure technical codes are not exposed as names
  const hasCodeName = JSON.stringify(body).includes("TCS00A10D1W2");
  assert.equal(hasCodeName, false);

  await new Promise<void>((resolve) => server.close(() => resolve()));
}

run().then(
  () => console.log("api analytics tests passed"),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
