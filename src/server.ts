import "dotenv/config";
import type { Server } from "node:http";
import type { Express } from "express";
import { createApp } from "./app";
import { flushPersistedCaches, hydrateCaches, setCacheContext } from "./cache";
import { logInfo } from "./logger";
import { closeGrpcClients } from "./grpc";
import { flushHistoryStore, hydrateHistoryStore } from "./platform/history";

const endpoint =
  process.env.TINVEST_ENDPOINT?.trim() || "invest-public-api.tbank.ru:443";
const appName = process.env.TINVEST_APP_NAME?.trim();
const defaultToken = process.env.TINVEST_TOKEN?.trim();
const uiModeRaw = process.env.UI_MODE?.trim().toLowerCase();
const uiMode =
  uiModeRaw === "auto" || uiModeRaw === "react" || uiModeRaw === "legacy"
    ? uiModeRaw
    : undefined;

let activeServer: Server | null = null;
let shutdownHandlersRegistered = false;
let shuttingDown = false;

void bootstrap();

async function bootstrap(): Promise<void> {
  try {
    setCacheContext({ endpoint });
    await hydrateCaches();
    await hydrateHistoryStore();
    const app = createApp({ endpoint, appName, defaultToken, uiMode });
    const port = Number(process.env.PORT || 3000);
    startServer(app, port);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bootstrap failed";
    logInfo("server_bootstrap_failed", { message });
    process.exit(1);
  }
}

function startServer(app: Express, preferredPort: number): void {
  const server: Server = app.listen(preferredPort, () => {
    logInfo("server_listening", { port: preferredPort });
  });
  activeServer = server;
  registerShutdownHandlers();

  server.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      const fallbackPort = preferredPort + 1;
      logInfo("server_port_in_use", { port: preferredPort, fallbackPort });
      startServer(app, fallbackPort);
      return;
    }
    throw err;
  });

  server.on("close", () => {
    void Promise.allSettled([flushPersistedCaches(), flushHistoryStore()]).finally(() =>
      closeGrpcClients()
    );
  });
}

function registerShutdownHandlers(): void {
  if (shutdownHandlersRegistered) return;
  shutdownHandlersRegistered = true;
  process.once("SIGINT", () => gracefulShutdown("SIGINT"));
  process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
}

function gracefulShutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logInfo("server_shutdown_start", { signal });
  const server = activeServer;
  if (!server) {
    void Promise.allSettled([flushPersistedCaches(), flushHistoryStore()]).finally(() => {
      closeGrpcClients();
      process.exit(0);
    });
    return;
  }

  server.close(() => {
    void Promise.allSettled([flushPersistedCaches(), flushHistoryStore()]).finally(() => {
      closeGrpcClients();
      logInfo("server_shutdown_complete", { signal });
      process.exit(0);
    });
  });

  setTimeout(() => {
    void Promise.allSettled([flushPersistedCaches(), flushHistoryStore()]).finally(() => {
      closeGrpcClients();
      process.exit(1);
    });
  }, 10_000).unref();
}
