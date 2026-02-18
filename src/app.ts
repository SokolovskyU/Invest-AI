import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { requestLogger } from "./middleware/requestLogger";
import { historyCapture } from "./middleware/historyCapture";
import { logError } from "./logger";
import { registerRoutes, type AppConfig } from "./routes";

type ApiErrorBody = {
  error: string;
  requestId?: string;
  details?: unknown;
};

function getRequestId(req: Request): string | undefined {
  if (req.requestId && req.requestId.trim().length > 0) {
    return req.requestId;
  }
  const header = req.get("x-request-id");
  return header && header.trim().length > 0 ? header : undefined;
}

function sendError(
  req: Request,
  res: Response<ApiErrorBody>,
  status: number,
  error: string,
  details?: unknown
): void {
  const body: ApiErrorBody = { error };
  const requestId = getRequestId(req);
  if (requestId) body.requestId = requestId;
  if (details !== undefined) body.details = details;
  res.status(status).json(body);
}

export function createApp(config: AppConfig): Express {
  const app = express();

  app.use(express.json({ limit: "32kb" }));
  app.use(requestLogger);
  app.use(historyCapture);

  registerRoutes(app, config);

  app.use((req: Request, res: Response<ApiErrorBody>) => {
    sendError(req, res, 404, "Not found");
  });

  app.use((err: unknown, req: Request, res: Response<ApiErrorBody>, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : "Internal server error";
    const requestId = getRequestId(req);
    logError("http_unhandled_error", {
      path: req.path,
      method: req.method,
      message,
      requestId,
    });
    sendError(req, res, 500, "Internal server error");
  });

  return app;
}
