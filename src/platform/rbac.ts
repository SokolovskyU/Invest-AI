import type { Request } from "express";
import { isFeatureEnabled } from "./featureFlags";

export type UserRole = "viewer" | "editor" | "admin";

export type UserRecord = {
  id: string;
  role: UserRole;
  accounts: string[];
  createdAt: string;
  updatedAt: string;
};

type InternalUserRecord = {
  id: string;
  role: UserRole;
  accounts: Set<string>;
  createdAt: string;
  updatedAt: string;
};

const users = new Map<string, InternalUserRecord>();

function nowIso(): string {
  return new Date().toISOString();
}

function ensureBootstrapAdmin(): void {
  if (users.has("local-admin")) return;
  const now = nowIso();
  users.set("local-admin", {
    id: "local-admin",
    role: "admin",
    accounts: new Set(["*"]),
    createdAt: now,
    updatedAt: now,
  });
}

function normalizeRole(input: string | undefined): UserRole {
  const value = String(input || "")
    .trim()
    .toLowerCase();
  if (value === "admin" || value === "editor" || value === "viewer") {
    return value;
  }
  return "viewer";
}

function toPublic(record: InternalUserRecord): UserRecord {
  return {
    id: record.id,
    role: record.role,
    accounts: Array.from(record.accounts.values()).sort((a, b) => a.localeCompare(b)),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function listUsers(): UserRecord[] {
  ensureBootstrapAdmin();
  return Array.from(users.values())
    .map(toPublic)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function upsertUser(input: { id: string; role?: string; accounts?: string[] }): UserRecord {
  ensureBootstrapAdmin();
  const id = input.id.trim();
  const role = normalizeRole(input.role);
  const now = nowIso();
  const existing = users.get(id);
  const next: InternalUserRecord = {
    id,
    role,
    accounts: new Set(existing?.accounts || []),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  if (Array.isArray(input.accounts) && input.accounts.length > 0) {
    next.accounts = new Set(
      input.accounts.map((item) => String(item || "").trim()).filter((item) => item.length > 0)
    );
  }
  users.set(id, next);
  return toPublic(next);
}

export function deleteUser(id: string): boolean {
  ensureBootstrapAdmin();
  if (id.trim() === "local-admin") return false;
  return users.delete(id.trim());
}

export function assignUserAccount(userId: string, accountId: string): UserRecord | null {
  ensureBootstrapAdmin();
  const record = users.get(userId.trim());
  if (!record) return null;
  const normalized = accountId.trim();
  if (normalized) {
    record.accounts.add(normalized);
    record.updatedAt = nowIso();
  }
  return toPublic(record);
}

export function revokeUserAccount(userId: string, accountId: string): UserRecord | null {
  ensureBootstrapAdmin();
  const record = users.get(userId.trim());
  if (!record) return null;
  const normalized = accountId.trim();
  if (normalized) {
    record.accounts.delete(normalized);
    record.updatedAt = nowIso();
  }
  return toPublic(record);
}

export function getRequestUserId(req: Request): string {
  ensureBootstrapAdmin();
  const headerUserId = String(req.get("x-user-id") || "").trim();
  if (headerUserId) return headerUserId;
  return "local-admin";
}

export function getRequestUser(req: Request): UserRecord {
  ensureBootstrapAdmin();
  const userId = getRequestUserId(req);
  const existing = users.get(userId);
  if (existing) return toPublic(existing);

  const now = nowIso();
  const created: InternalUserRecord = {
    id: userId,
    role: "viewer",
    accounts: new Set<string>(),
    createdAt: now,
    updatedAt: now,
  };
  users.set(userId, created);
  return toPublic(created);
}

export function isRbacEnabled(): boolean {
  return isFeatureEnabled("rbac_enabled");
}

export function canAccessAccount(req: Request, accountId: string): boolean {
  if (!isRbacEnabled()) return true;
  const normalizedAccountId = String(accountId || "").trim();
  if (!normalizedAccountId) return true;
  const user = getRequestUser(req);
  if (user.role === "admin") return true;
  return user.accounts.includes("*") || user.accounts.includes(normalizedAccountId);
}

export function canManageUsers(req: Request): boolean {
  if (!isRbacEnabled()) return true;
  const user = getRequestUser(req);
  return user.role === "admin";
}
