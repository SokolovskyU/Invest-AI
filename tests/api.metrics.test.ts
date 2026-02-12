import assert from "assert";
import express from "express";
import { registerRoutes } from "../src/routes";

const app = express();
app.use(express.json({ limit: "32kb" }));

registerRoutes(app, {
  endpoint: "mock",
  appName: "test",
  defaultToken: "test",
  clients: {
    createUsersClient: () => ({} as any),
    createOperationsClient: () => ({} as any),
    createInstrumentsClient: () => ({} as any),
    createMarketDataClient: () => ({} as any),
  },
});

async function run() {
  const server = await new Promise<import("http").Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const { port } = server.address() as any;

  const health = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(health.status, 200);
  const healthBody = await health.json();
  assert.equal(healthBody.ok, true);

  const metrics = await fetch(`http://127.0.0.1:${port}/api/metrics`);
  assert.equal(metrics.status, 200);
  const metricsBody = await metrics.json();
  assert.ok(typeof metricsBody.uptimeSec === "number");
  assert.ok(typeof metricsBody.totalRequests === "number");
  assert.ok(typeof metricsBody.byStatus === "object");
  assert.ok(typeof metricsBody.byRoute === "object");

  await new Promise<void>((resolve) => server.close(() => resolve()));
}

run().then(
  () => console.log("api metrics tests passed"),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
