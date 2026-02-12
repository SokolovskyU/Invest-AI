import type { Request, Response, NextFunction } from "express";
import { logInfo } from "../logger";
import { recordRequest } from "../metrics";

function newRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = newRequestId();
  const start = Date.now();
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    recordRequest(req.path, res.statusCode);
    logInfo("http_request", {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs,
    });
  });

  next();
}
