import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { isFeatureEnabled } from "../platform/featureFlags";

type SessionEntry = {
  token: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

const sessionStore = new Map<string, SessionEntry>();

function getSessionCookieName(): string {
  return process.env.TINVEST_SESSION_COOKIE_NAME?.trim() || "invest_sid";
}

function getSessionTtlMs(): number {
  const raw = Number(process.env.TINVEST_SESSION_TTL_HOURS || "12");
  const hours = Number.isFinite(raw) && raw > 0 ? raw : 12;
  return hours * 60 * 60 * 1000;
}

function getSessionSecureCookie(): boolean {
  const envValue = process.env.TINVEST_SESSION_SECURE?.trim().toLowerCase();
  if (envValue === "true") return true;
  if (envValue === "false") return false;
  return process.env.NODE_ENV === "production";
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const pairs = cookieHeader.split(";");
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function readSessionId(req: Request): string | undefined {
  if (req.investSessionId) return req.investSessionId;
  const cookies = parseCookies(req.headers.cookie);
  const sid = cookies[getSessionCookieName()];
  if (!sid) return undefined;
  req.investSessionId = sid;
  return sid;
}

function cleanupExpiredSessions(now = Date.now()): void {
  for (const [sid, entry] of sessionStore.entries()) {
    if (entry.expiresAt <= now) {
      sessionStore.delete(sid);
    }
  }
}

function setSessionCookie(res: Response, sid: string): void {
  res.cookie(getSessionCookieName(), sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: getSessionSecureCookie(),
    path: "/",
    maxAge: getSessionTtlMs(),
  });
}

function clearSessionCookie(res: Response): void {
  res.cookie(getSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: getSessionSecureCookie(),
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

function touchSession(entry: SessionEntry, now = Date.now()): SessionEntry {
  return {
    ...entry,
    updatedAt: now,
    expiresAt: now + getSessionTtlMs(),
  };
}

export function getSessionToken(req: Request): string {
  if (req.investSessionToken) return req.investSessionToken;
  cleanupExpiredSessions();
  const sid = readSessionId(req);
  if (!sid) return "";
  const entry = sessionStore.get(sid);
  if (!entry) return "";
  const next = touchSession(entry);
  sessionStore.set(sid, next);
  req.investSessionToken = next.token;
  return next.token;
}

export function resolveAuthToken(req: Request, bodyToken?: string, defaultToken?: string): string {
  if (isFeatureEnabled("session_auth_required")) {
    const tokenFromSession = getSessionToken(req);
    if (tokenFromSession) return tokenFromSession;
    return String(defaultToken || "").trim();
  }
  const tokenFromBody = String(bodyToken || "").trim();
  if (tokenFromBody) return tokenFromBody;
  const tokenFromSession = getSessionToken(req);
  if (tokenFromSession) return tokenFromSession;
  return String(defaultToken || "").trim();
}

export function setSessionToken(req: Request, res: Response, token: string): void {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    clearSession(req, res);
    return;
  }

  cleanupExpiredSessions();
  const now = Date.now();
  const existingSid = readSessionId(req);
  const existing = existingSid ? sessionStore.get(existingSid) : undefined;
  const sid = existingSid && existing ? existingSid : randomUUID();
  const next: SessionEntry = {
    token: normalizedToken,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    expiresAt: now + getSessionTtlMs(),
  };
  sessionStore.set(sid, next);
  req.investSessionId = sid;
  req.investSessionToken = normalizedToken;
  setSessionCookie(res, sid);
}

export function clearSession(req: Request, res: Response): void {
  const sid = readSessionId(req);
  if (sid) sessionStore.delete(sid);
  req.investSessionId = undefined;
  req.investSessionToken = undefined;
  clearSessionCookie(res);
}

export function attachSession(req: Request, res: Response, next: NextFunction): void {
  cleanupExpiredSessions();
  const sid = readSessionId(req);
  if (!sid) {
    next();
    return;
  }

  const entry = sessionStore.get(sid);
  if (!entry) {
    req.investSessionToken = undefined;
    clearSessionCookie(res);
    next();
    return;
  }

  const nextEntry = touchSession(entry);
  sessionStore.set(sid, nextEntry);
  req.investSessionToken = nextEntry.token;
  setSessionCookie(res, sid);
  next();
}

export function hasSessionToken(req: Request): boolean {
  return getSessionToken(req).length > 0;
}
