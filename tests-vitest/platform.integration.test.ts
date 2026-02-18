import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { resetFeatureFlags } from "../src/platform/featureFlags";
import { recordHistoryEvent, recordHistorySnapshot } from "../src/platform/history";

function createPlatformApp() {
  return createApp({
    endpoint: "mock",
    appName: "test",
    defaultToken: "test-token",
    uiMode: "legacy",
    clients: {
      createUsersClient: () =>
        ({
          GetAccounts: (
            _req: unknown,
            _md: unknown,
            cb: (err: unknown, response: unknown) => void
          ) => cb(null, { accounts: [] }),
        }) as any,
      createOperationsClient: () => ({}) as any,
      createInstrumentsClient: () => ({}) as any,
      createMarketDataClient: () => ({}) as any,
    },
  });
}

function makeAccountId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

beforeEach(() => {
  resetFeatureFlags();
});

afterEach(() => {
  resetFeatureFlags();
});

describe("platform API integration", () => {
  it("serves OpenAPI specification", async () => {
    const app = createPlatformApp();
    const response = await request(app).get("/api/openapi.yaml");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/yaml");
    expect(response.text).toContain("openapi: 3.1.0");
  });

  it("updates and resets feature flags", async () => {
    const app = createPlatformApp();
    const update = await request(app)
      .post("/api/feature-flags")
      .send({ native_ui_default: true, reports_export_enabled: false });
    expect(update.status).toBe(200);
    expect(update.body.flags.native_ui_default).toBe(true);
    expect(update.body.flags.reports_export_enabled).toBe(false);

    const reset = await request(app).post("/api/feature-flags/reset").send({});
    expect(reset.status).toBe(200);
    expect(reset.body.flags.native_ui_default).toBe(false);
    expect(reset.body.flags.reports_export_enabled).toBe(true);
  });

  it("returns history snapshots and events for account", async () => {
    const app = createPlatformApp();
    const accountId = makeAccountId("history");
    recordHistorySnapshot({
      accountId,
      source: "portfolio",
      totalText: "1000 RUB",
      totalValue: 1000,
    });
    recordHistoryEvent({
      accountId,
      eventType: "note",
      title: "snapshot-created",
    });

    const snapshots = await request(app)
      .get("/api/history/snapshots")
      .query({ accountId, limit: 5 });
    expect(snapshots.status).toBe(200);
    expect(Array.isArray(snapshots.body.items)).toBe(true);
    expect(snapshots.body.items.length).toBeGreaterThan(0);

    const events = await request(app).get("/api/history/events").query({ accountId, limit: 5 });
    expect(events.status).toBe(200);
    expect(Array.isArray(events.body.items)).toBe(true);
    expect(events.body.items.length).toBeGreaterThan(0);
  });

  it("creates alert rule and generates notification from latest snapshot", async () => {
    const app = createPlatformApp();
    const accountId = makeAccountId("alerts");
    recordHistorySnapshot({
      accountId,
      source: "analytics",
      totalText: "12345 RUB",
      totalValue: 12345,
      profitValue: 450,
      yieldPct: 4.2,
      currency: "RUB",
    });

    const createdRule = await request(app).post("/api/alerts/rules").send({
      name: "high-balance",
      accountId,
      metric: "total_value",
      operator: "gt",
      threshold: 10000,
      severity: "warn",
      channel: "log",
      cooldownMinutes: 0,
    });
    expect(createdRule.status).toBe(201);

    const check = await request(app).post("/api/alerts/check").send({ accountId });
    expect(check.status).toBe(200);
    expect(Array.isArray(check.body.created)).toBe(true);
    expect(check.body.created.length).toBeGreaterThan(0);

    const notifications = await request(app)
      .get("/api/alerts/notifications")
      .query({ accountId, limit: 20 });
    expect(notifications.status).toBe(200);
    expect(Array.isArray(notifications.body.items)).toBe(true);
    expect(notifications.body.items.length).toBeGreaterThan(0);
  });

  it("queues and completes analytics background job", async () => {
    const app = createPlatformApp();
    const accountId = makeAccountId("job");

    const created = await request(app).post("/api/jobs/analytics").send({ accountId });
    expect(created.status).toBe(202);
    expect(created.body.id).toBeTypeOf("string");

    await new Promise((resolve) => setTimeout(resolve, 250));
    const fetched = await request(app).get(`/api/jobs/${created.body.id}`);
    expect(fetched.status).toBe(200);
    expect(["running", "completed"]).toContain(fetched.body.status);
  });

  it("exports reports in json, xlsx, and pdf formats", async () => {
    const app = createPlatformApp();
    const accountId = makeAccountId("report");
    recordHistorySnapshot({
      accountId,
      source: "portfolio",
      totalText: "5000 RUB",
      totalValue: 5000,
    });

    const jsonRes = await request(app)
      .post("/api/reports/export")
      .send({ accountId, format: "json" });
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers["content-type"]).toContain("application/json");

    const xlsxRes = await request(app)
      .post("/api/reports/export")
      .send({ accountId, format: "xlsx" });
    expect(xlsxRes.status).toBe(200);
    expect(xlsxRes.headers["content-type"]).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    const pdfRes = await request(app)
      .post("/api/reports/export")
      .send({ accountId, format: "pdf" });
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers["content-type"]).toContain("application/pdf");
  });

  it("enforces RBAC for account-scoped routes when enabled", async () => {
    const app = createPlatformApp();
    const accountId = makeAccountId("rbac-allowed");
    const deniedAccountId = makeAccountId("rbac-denied");
    const userId = `viewer-${Date.now()}`;

    recordHistorySnapshot({
      accountId,
      source: "portfolio",
      totalText: "200 RUB",
      totalValue: 200,
    });

    const enableRbac = await request(app).post("/api/feature-flags").send({ rbac_enabled: true });
    expect(enableRbac.status).toBe(200);

    const createdUser = await request(app)
      .post("/api/admin/users")
      .send({
        id: userId,
        role: "viewer",
        accounts: [accountId],
      });
    expect(createdUser.status).toBe(201);

    const allowed = await request(app)
      .get("/api/history/snapshots")
      .set("x-user-id", userId)
      .query({ accountId });
    expect(allowed.status).toBe(200);

    const denied = await request(app)
      .get("/api/history/snapshots")
      .set("x-user-id", userId)
      .query({ accountId: deniedAccountId });
    expect(denied.status).toBe(403);
  });

  it("returns SLO snapshot", async () => {
    const app = createPlatformApp();
    const response = await request(app).get("/api/slo");
    expect(response.status).toBe(200);
    expect(typeof response.body.objectivePct).toBe("number");
    expect(typeof response.body.availabilityPct).toBe("number");
    expect(typeof response.body.burnRate).toBe("number");
  });
});
