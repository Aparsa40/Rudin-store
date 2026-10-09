import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { UserModel } from "../models/user.model.js";

export type AppRole = "CUSTOMER" | "VENDOR" | "ADMIN";
export interface AuthUser {
  id: string;
  email: string;
  role: AppRole;
  authVersion?: number;
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
    if (!["CUSTOMER", "VENDOR", "ADMIN"].includes(payload.role ?? "")) return null;
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
    const user = await UserModel.findOne({ _id: tokenUser.id, status: "ACTIVE" }).select("_id email role authVersion");
    if (!user || user.email !== tokenUser.email || (user.authVersion ?? 0) !== (tokenUser.authVersion ?? 0)) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Account is no longer active." } });
      return;
    }
    if (!["CUSTOMER", "VENDOR", "ADMIN"].includes(user.role)) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Account role is invalid." } });
      return;
    }
    req.authUser = { id: user._id, email: user.email, role: user.role as AppRole };
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
