import "dotenv/config";
import express from "express";
import type { Server } from "node:http";
import { hydrateCaches } from "./cache";
import { registerRoutes } from "./routes";
import { requestLogger } from "./middleware/requestLogger";
import { logInfo } from "./logger";

const app = express();
app.use(express.json({ limit: "32kb" }));
app.use(requestLogger);

const endpoint =
  process.env.TINVEST_ENDPOINT?.trim() || "invest-public-api.tbank.ru:443";
const appName = process.env.TINVEST_APP_NAME?.trim();
const defaultToken = process.env.TINVEST_TOKEN?.trim();

hydrateCaches();
registerRoutes(app, { endpoint, appName, defaultToken });

const port = Number(process.env.PORT || 3000);
startServer(port);

function startServer(preferredPort: number): void {
  const server: Server = app.listen(preferredPort, () => {
    logInfo("server_listening", { port: preferredPort });
  });

  server.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      const fallbackPort = preferredPort + 1;
      logInfo("server_port_in_use", { port: preferredPort, fallbackPort });
      startServer(fallbackPort);
      return;
    }
    throw err;
  });
}
