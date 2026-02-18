import { expect, test } from "@playwright/test";

test("react ui mirrors legacy home and analytics flows", async ({ page }) => {
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
          {
            name: "Sber",
            instrumentType: "share",
            currentPrice: "40 000.00 RUB",
            profitRub: "1 500.00 RUB",
            profitPct: "3.80%",
            dayChangePct: "-0.80%",
            dayChangeRub: "-320.00 RUB",
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
          {
            name: "Sber",
            instrumentType: "share",
            currentPrice: "40 000.00 RUB",
            profitRub: "1 500.00 RUB",
            profitPct: "3.80%",
            dayChangePct: "-0.80%",
            dayChangeRub: "-320.00 RUB",
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
        assetPie: [
          { label: "Shares", value: 80, valueText: "98 764.00 RUB", percentText: "80%" },
          { label: "Bonds", value: 20, valueText: "24 692.00 RUB", percentText: "20%" },
        ],
        assetBreakdown: [
          {
            type: "share",
            typeLabel: "Shares",
            value: 98764,
            valueText: "98 764.00 RUB",
            percentText: "80%",
            assets: [
              {
                name: "Gazprom",
                value: 50000,
                valueText: "50 000.00 RUB",
                percentText: "50%",
                percentOfTotal: "50%",
              },
            ],
          },
        ],
        myAssets: [
          {
            id: "asset-1",
            type: "share",
            icon: "SH",
            name: "Gazprom",
            quantity: 10,
            quantityText: "10",
            invested: 45000,
            investedText: "45 000.00 RUB",
            currentValue: 50000,
            currentValueText: "50 000.00 RUB",
            passiveIncome: 500,
            passiveIncomeText: "500.00 RUB",
            assetYield: 5000,
            assetYieldText: "5 000.00 RUB",
            profitValue: 5500,
            profitText: "5 500.00 RUB",
            yieldPct: 12.22,
            yieldPctText: "12.22%",
            portfolioSharePct: 40.5,
            portfolioSharePctText: "40.50%",
          },
        ],
        myAssetsTotals: {
          quantity: 10,
          quantityText: "10",
          invested: 45000,
          investedText: "45 000.00 RUB",
          currentValue: 50000,
          currentValueText: "50 000.00 RUB",
          passiveIncome: 500,
          passiveIncomeText: "500.00 RUB",
          assetYield: 5000,
          assetYieldText: "5 000.00 RUB",
          profitValue: 5500,
          profitText: "5 500.00 RUB",
          yieldPct: 12.22,
          yieldPctText: "12.22%",
          portfolioSharePct: 40.5,
          portfolioSharePctText: "40.50%",
        },
        bondCompanies: [
          { name: "Issuer A", value: 10000, valueText: "10 000.00 RUB", percentText: "40%" },
        ],
        bondCompaniesCount: "Companies: 1",
        incomeNext12: [
          { month: "01.2026", value: 1000, amount: "1 000.00 RUB" },
          { month: "02.2026", value: 1200, amount: "1 200.00 RUB" },
        ],
        passiveIncomeTotal: 2200,
        passiveIncomeTotalRub: "2 200.00 RUB",
        passiveIncomeBaseValue: 100000,
        passiveIncomeBaseRub: "100 000.00 RUB",
        passiveIncomeYieldPct: "2.20%",
        receivedDividends12: [{ month: "01.2026", value: 300, amount: "300.00 RUB" }],
        redemptionsNext12: [{ month: "04.2026", value: 700, amount: "700.00 RUB" }],
        redemptionsDetails: [{ month: "04.2026", name: "Bond A", amount: "700.00 RUB" }],
        upcomingEvents: [
          { date: "14.02.2026", name: "Gazprom", eventType: "Dividend", amount: "300.00 RUB" },
        ],
      }),
    });
  });

  await page.goto("/");
  const homeFrame = page.frameLocator('[data-testid="legacy-frame"]');

  await expect(homeFrame.locator("#tokenToggle")).toBeVisible();
  await homeFrame.locator("#tokenToggle").click();
  await homeFrame.locator("#token").fill("t.test");
  await homeFrame.locator("#load").click();
  await homeFrame.locator("#account").fill("acc-123");
  await homeFrame.locator("#portfolio").click();

  await expect(homeFrame.locator("#kpiTotal")).toContainText("123");
  await expect(homeFrame.locator("#portfolioBody")).toContainText("Акции");
  await expect(homeFrame.locator("#moversListUp")).toBeVisible();

  await page.goto("/analytics");
  const analyticsFrame = page.frameLocator('[data-testid="legacy-frame"]');

  await expect(analyticsFrame.locator("#tokenToggle")).toBeVisible();
  await analyticsFrame.locator("#tokenToggle").click();
  await analyticsFrame.locator("#token").fill("t.test");
  await analyticsFrame.locator("#load").click();
  await analyticsFrame.locator("#account").fill("acc-123");
  await analyticsFrame.locator("#analyze").click();

  await expect(analyticsFrame.locator("#out")).toContainText("Gazprom");
  await expect(analyticsFrame.locator(".tab-buttons")).toBeVisible();
  await expect(analyticsFrame.locator(".tab-btn")).toHaveCount(7);
});
