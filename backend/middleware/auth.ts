import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { UserModel } from "../models/user.model.js";
import { ADMIN_PERMISSIONS, type AdminPermission } from "../lib/admin-permissions.js";

// Single source of truth for account roles. MANAGER is the primary platform
// owner: it appoints ADMIN accounts and passes every permission check. ADMIN
// accounts hold only the granular permissions their manager granted.
export const APP_ROLES = ["CUSTOMER", "VENDOR", "ADMIN", "MANAGER"] as const;
export type AppRole = (typeof APP_ROLES)[number];
export interface AuthUser {
  id: string;
  email: string;
  role: AppRole;
  authVersion?: number;
  // Effective granular permissions; set by requireAuth, absent on freshly minted tokens.
  adminPermissions?: AdminPermission[];
}
declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

function tokenSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_TOKEN_SECRET must be set to a random secret of at least 32 characters.");
  }
  return secret;
}

export function createAccessToken(user: AuthUser, expiresInSeconds = 60 * 60): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: user.id, email: user.email, role: user.role, authVersion: user.authVersion ?? 0, iat: now, exp: now + expiresInSeconds,
  })).toString("base64url");
  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", tokenSecret()).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function verifyAccessToken(token: string): AuthUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const data = `${parts[0]}.${parts[1]}`;
    const expected = createHmac("sha256", tokenSecret()).update(data).digest();
    const supplied = Buffer.from(parts[2], "base64url");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      sub?: string; email?: string; role?: string; authVersion?: number; exp?: number; iat?: number;
    };
    if (!payload.sub || !payload.email || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!(APP_ROLES as readonly string[]).includes(payload.role ?? "")) return null;
    return { id: payload.sub, email: payload.email, role: payload.role as AppRole, authVersion: Number.isInteger(payload.authVersion) ? payload.authVersion : 0 };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authorization = req.header("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  const tokenUser = match ? verifyAccessToken(match[1]) : null;
  if (!tokenUser) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "A valid bearer token is required." } });
    return;
  }
  try {
    // Re-read current role/status so disabled accounts or demoted admins lose access immediately.
    const user = await UserModel.findOne({ _id: tokenUser.id, status: "ACTIVE" }).select("_id email role authVersion adminPermissions");
    if (!user || user.email !== tokenUser.email || (user.authVersion ?? 0) !== (tokenUser.authVersion ?? 0)) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Account is no longer active." } });
      return;
    }
    if (!(APP_ROLES as readonly string[]).includes(user.role)) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Account role is invalid." } });
      return;
    }
    const adminPermissions = (user.adminPermissions ?? []).filter(
      (permission): permission is AdminPermission => (ADMIN_PERMISSIONS as readonly string[]).includes(permission),
    );
    req.authUser = { id: user._id, email: user.email, role: user.role as AppRole, adminPermissions };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required." } });
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have permission to perform this action." } });
      return;
    }
    next();
  };
}

// Permission checks for the manager/admin hierarchy. MANAGER passes every
// permission check; ADMIN passes only with the permission granted by its
// manager; every other role is rejected.
export function requirePermission(permission: AdminPermission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required." } });
      return;
    }
    if (req.authUser.role === "MANAGER" || (req.authUser.role === "ADMIN" && (req.authUser.adminPermissions ?? []).includes(permission))) {
      next();
      return;
    }
    res.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have permission to perform this action." } });
  };
}

// Vendors reach their own resources; the given permission lets the primary
// manager and authorized admins act on the whole area instead.
export function requireVendorOrPermission(permission: AdminPermission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required." } });
      return;
    }
    if (req.authUser.role === "VENDOR") {
      next();
      return;
    }
    requirePermission(permission)(req, res, next);
  };
}

// Whole-catalog management: the primary manager or an admin holding the
// products:manage permission. Everyone else is limited to their own resources.
export function canManageWholeCatalog(user: AuthUser): boolean {
  return user.role === "MANAGER" || (user.role === "ADMIN" && (user.adminPermissions ?? []).includes("products:manage"));
}
