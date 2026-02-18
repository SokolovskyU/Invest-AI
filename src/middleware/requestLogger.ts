import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { logInfo } from "../logger";
import { recordRequest } from "../metrics";

function newRequestId(): string {
  return randomUUID().replace(/-/g, "");
}

function normalizeRequestId(value: string | undefined): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return trimmed.slice(0, 128);
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = normalizeRequestId(req.get("x-request-id")) || newRequestId();
  req.requestId = requestId;
  const start = Date.now();
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    recordRequest(req.path, res.statusCode, durationMs, req.method);
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
