import { expect, test, type Page } from "@playwright/test";

async function mockApi(page: Page): Promise<void> {
  await page.route("**/api/feature-flags", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        flags: {
          native_ui_default: false,
          session_auth_required: false,
          background_analytics_jobs: true,
          reports_export_enabled: true,
          alerts_enabled: true,
          rbac_enabled: false,
        },
      }),
    });
  });

  await page.route("**/api/session/token", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route("**/api/session/logout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route("**/api/accounts", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accounts: [
          {
            id: "acc-123",
            name: "Main",
            type: "ACCOUNT_TYPE_TINKOFF",
            status: "ACCOUNT_STATUS_OPEN",
          },
        ],
      }),
    });
  });

  await page.route("**/api/portfolio", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        total: "123 456.00 RUB",
        positions: [
          {
            name: "Gazprom",
            instrumentType: "share",
            currentPrice: "50 000.00 RUB",
            profitRub: "4 500.00 RUB",
            profitPct: "9.00%",
            dayChangePct: "1.20%",
            dayChangeRub: "600.00 RUB",
            monthlyCoupon: "-",
          },
        ],
        moverPositions: [
          {
            name: "Gazprom",
            instrumentType: "share",
            currentPrice: "50 000.00 RUB",
            profitRub: "4 500.00 RUB",
            profitPct: "9.00%",
            dayChangePct: "1.20%",
            dayChangeRub: "600.00 RUB",
          },
        ],
      }),
    });
  });

  await page.route("**/api/analytics", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        total: "123 456.00 RUB",
        currency: "RUB",
        profitRub: "12 345.00 RUB",
        profitValue: 12345,
        profitPct: "10.00%",
        yieldPct: "7.50%",
        profitBreakdown: {
          currentValue: 123456,
          currentValueRub: "123 456.00 RUB",
          tradesNet: 8000,
          tradesNetRub: "8 000.00 RUB",
          coupons: 1800,
          couponsRub: "1 800.00 RUB",
          dividends: 1200,
          dividendsRub: "1 200.00 RUB",
          commissions: 200,
          commissionsRub: "200.00 RUB",
          taxes: 100,
          taxesRub: "100.00 RUB",
          marketProfitRub: "1 245.00 RUB",
          marketProfitPct: "1.02%",
        },
        assetPie: [{ label: "Shares", value: 100, valueText: "123 456.00 RUB", percentText: "100%" }],
        assetBreakdown: [
          {
            type: "share",
            typeLabel: "Shares",
            value: 123456,
            valueText: "123 456.00 RUB",
            percentText: "100%",
            assets: [],
          },
        ],
        myAssets: [],
        myAssetsTotals: {
          quantity: 0,
          quantityText: "0",
          invested: 0,
          investedText: "0.00 RUB",
          currentValue: 0,
          currentValueText: "0.00 RUB",
          passiveIncome: 0,
          passiveIncomeText: "0.00 RUB",
          assetYield: 0,
          assetYieldText: "0.00 RUB",
          profitValue: 0,
          profitText: "0.00 RUB",
          yieldPct: 0,
          yieldPctText: "0.00%",
          portfolioSharePct: 0,
          portfolioSharePctText: "0.00%",
        },
        bondCompanies: [],
        bondCompaniesCount: "0",
        incomeNext12: [],
        passiveIncomeTotal: 0,
        passiveIncomeTotalRub: "0.00 RUB",
        passiveIncomeBaseValue: 0,
        passiveIncomeBaseRub: "0.00 RUB",
        passiveIncomeYieldPct: "0.00%",
        receivedDividends12: [],
        redemptionsNext12: [],
        redemptionsDetails: [],
        upcomingEvents: [],
      }),
    });
  });
}

test("native ui mode loads data via session flow", async ({ page }) => {
  await mockApi(page);
  await page.goto("/?ui=native");

  await expect(page.getByRole("heading", { name: "Портфель" })).toBeVisible();
  await page.getByRole("button", { name: "token" }).click();
  await page.getByPlaceholder("API токен (опционально, можно из .env)").fill("t.test");
  await page.locator(".native-controls").getByRole("button", { name: "Счета" }).click();
  await page.getByPlaceholder("account_id").fill("acc-123");
  await page.locator(".native-controls").getByRole("button", { name: "Портфель" }).click();

  await expect(page.locator(".native-kpi-value").first()).toContainText("123");
  await expect(page.getByText("Gazprom").first()).toBeVisible();
});

test("mode switch toggles from legacy iframe to native screen", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.frameLocator('[data-testid="legacy-frame"]').locator("body")).toBeVisible();

  await page.getByRole("button", { name: "Native" }).click();
  await expect(page.getByRole("heading", { name: "Портфель" })).toBeVisible();
});
