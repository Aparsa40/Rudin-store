import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Router } from "express";
import { UserModel } from "../models/user.model.js";
import { createAccessToken, requireAuth } from "../middleware/auth.js";

const scrypt = promisify(scryptCallback);
const authRouter = Router();

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, hash] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function publicUser(user: { _id: string; email: string; firstName: string; lastName?: string; phone?: string; role: string; createdAt?: Date }) {
  return {
    id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName ?? "",
    phone: user.phone, role: user.role, createdAt: user.createdAt,
  };
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body ?? {};
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== "string" || password.length < 12 || password.length > 128 ||
        typeof firstName !== "string" || firstName.trim().length < 1 || firstName.trim().length > 80 ||
        (lastName !== undefined && (typeof lastName !== "string" || lastName.length > 80)) ||
        (phone !== undefined && (typeof phone !== "string" || phone.length > 32))) {
      res.status(400).json({ error: { code: "INVALID_REGISTRATION", message: "Provide a valid email, a password of 12–128 characters, and a first name (maximum 80 characters)." } });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (await UserModel.exists({ email: normalizedEmail })) {
      res.status(409).json({ error: { code: "EMAIL_IN_USE", message: "An account with this email already exists." } });
      return;
    }

    const userId = `usr_${randomBytes(12).toString("hex")}`;
    const user = await UserModel.create({
      _id: userId, email: normalizedEmail, passwordHash: await hashPassword(password),
      firstName: firstName.trim(), lastName: typeof lastName === "string" ? lastName.trim() : "",
      phone: typeof phone === "string" ? phone.trim() : undefined,
      // Public registration can never assign ADMIN or VENDOR privileges.
      role: "CUSTOMER", status: "ACTIVE",
    });
    const safeUser = publicUser(user);
    res.status(201).json({ user: safeUser, accessToken: createAccessToken({ id: user._id, email: user.email, role: "CUSTOMER" }) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string" || password.length > 128) {
      res.status(400).json({ error: { code: "INVALID_CREDENTIALS", message: "Email and password are required." } });
      return;
    }
    const user = await UserModel.findOne({ email: email.trim().toLowerCase(), status: "ACTIVE" }).select("+passwordHash");
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } });
      return;
    }
    user.lastLoginAt = new Date();
    await user.save();
    const safeUser = publicUser(user);
    res.status(200).json({
      user: safeUser,
      accessToken: createAccessToken({ id: user._id, email: user.email, role: user.role as "CUSTOMER" | "VENDOR" | "ADMIN" }),
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await UserModel.findOne({ _id: req.authUser!.id, status: "ACTIVE" });
    if (!user) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Account is no longer active." } });
      return;
    }
    res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

export default authRouter;
