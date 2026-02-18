import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const mockUsersClient = {
  GetAccounts: (_req: any, _md: any, cb: any) => {
    cb(null, {
      accounts: [
        {
          id: "acc-1",
          name: "Main",
          type: "ACCOUNT_TYPE_TINKOFF",
          status: "ACCOUNT_STATUS_OPEN",
        },
      ],
    });
  },
};

function createUsersClientWithAuthSpy(observedAuthHeaders: string[]) {
  return {
    GetAccounts: (_req: any, md: any, cb: any) => {
      const authHeader = Array.isArray(md?.get?.("authorization"))
        ? String(md.get("authorization")[0] || "")
        : "";
      observedAuthHeaders.push(authHeader);
      cb(null, { accounts: [] });
    },
  };
}

function createTestApp(uiMode?: "auto" | "react" | "legacy") {
  return createApp({
    endpoint: "mock",
    appName: "test",
    defaultToken: "test-token",
    uiMode,
    clients: {
      createUsersClient: () => mockUsersClient as any,
      createOperationsClient: () => ({}) as any,
      createInstrumentsClient: () => ({}) as any,
      createMarketDataClient: () => ({}) as any,
    },
  });
}

const cleanups: Array<() => void> = [];
const reactIndexPath = path.resolve("web", "dist", "index.html");

function pushCleanup(fn: () => void): void {
  cleanups.push(fn);
}

function createReactBuildMarker(marker: string): void {
  const hadIndex = fs.existsSync(reactIndexPath);
  const previous = hadIndex ? fs.readFileSync(reactIndexPath, "utf8") : "";
  fs.mkdirSync(path.dirname(reactIndexPath), { recursive: true });
  fs.writeFileSync(
    reactIndexPath,
    `<!doctype html><html><body><div id="root">${marker}</div></body></html>`,
    "utf8"
  );
  pushCleanup(() => {
    if (hadIndex) {
      fs.writeFileSync(reactIndexPath, previous, "utf8");
      return;
    }
    fs.rmSync(reactIndexPath, { force: true });
  });
}

function hideReactBuild(): void {
  if (!fs.existsSync(reactIndexPath)) return;
  const backupPath = `${reactIndexPath}.vitest-backup-${Date.now()}`;
  fs.renameSync(reactIndexPath, backupPath);
  pushCleanup(() => {
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, reactIndexPath);
    }
  });
}

afterEach(() => {
  while (cleanups.length) {
    const cleanup = cleanups.pop();
    cleanup?.();
  }
});

describe("API integration (Vitest + supertest)", () => {
  it("returns health and metrics", async () => {
    const app = createTestApp();
    const health = await request(app).get("/api/health");
    expect(health.status).toBe(200);
    expect(health.body.ok).toBe(true);

    const metrics = await request(app).get("/api/metrics");
    expect(metrics.status).toBe(200);
    expect(typeof metrics.body.totalRequests).toBe("number");

    const prom = await request(app).get("/metrics");
    expect(prom.status).toBe(200);
    expect(prom.text).toContain("invest_http_requests_total");
  });

  it("validates accounts payload with zod", async () => {
    const app = createTestApp();
    const invalid = await request(app).post("/api/accounts").send({ token: 123 });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe("Invalid payload");
    expect(Array.isArray(invalid.body.details)).toBe(true);
  });

  it("returns accounts on valid request", async () => {
    const app = createTestApp();
    const response = await request(app).post("/api/accounts").send({ token: "t.token" });
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.accounts)).toBe(true);
    expect(response.body.accounts[0].id).toBe("acc-1");
  });

  it("serves legacy UI when uiMode=legacy", async () => {
    const app = createTestApp("legacy");
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("T-Invest Pet");
  });

  it("falls back to legacy UI when uiMode=react and build is missing", async () => {
    hideReactBuild();
    const app = createTestApp("react");
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("T-Invest Pet");
  });

  it("serves React build when uiMode=react and build exists", async () => {
    createReactBuildMarker("react-ui-mode-marker");
    const app = createTestApp("react");

    const home = await request(app).get("/");
    expect(home.status).toBe(200);
    expect(home.text).toContain("react-ui-mode-marker");

    const analytics = await request(app).get("/analytics");
    expect(analytics.status).toBe(200);
    expect(analytics.text).toContain("react-ui-mode-marker");
  });

  it("stores token in server session and reuses it for API calls", async () => {
    const observedAuthHeaders: string[] = [];
    const usersClient = createUsersClientWithAuthSpy(observedAuthHeaders);
    const app = createApp({
      endpoint: "mock",
      appName: "test",
      uiMode: "legacy",
      clients: {
        createUsersClient: () => usersClient as any,
        createOperationsClient: () => ({}) as any,
        createInstrumentsClient: () => ({}) as any,
        createMarketDataClient: () => ({}) as any,
      },
    });

    const session = await request(app).post("/api/session/token").send({ token: "t.session" });
    expect(session.status).toBe(200);
    const cookie = session.headers["set-cookie"]?.[0];
    expect(cookie).toContain("invest_sid=");

    const accounts = await request(app).post("/api/accounts").set("Cookie", cookie).send({});
    expect(accounts.status).toBe(200);
    expect(observedAuthHeaders[0]).toBe("Bearer t.session");

    const logout = await request(app).post("/api/session/logout").set("Cookie", cookie).send({});
    expect(logout.status).toBe(200);
  });
});
