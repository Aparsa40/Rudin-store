import { createHash, randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { Router } from "express";
import { UserModel } from "../models/user.model.js";

const scrypt = promisify(scryptCallback);
const passwordResetRouter = Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_RESPONSE = { message: "If an active account matches that email, password reset instructions will be sent." };

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

passwordResetRouter.post("/request", async (req, res, next) => {
  try {
    const { email } = req.body ?? {};
    if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
      res.status(400).json({ error: { code: "INVALID_EMAIL", message: "Provide a valid email address." } });
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      res.status(503).json({ error: { code: "PASSWORD_RESET_UNAVAILABLE", message: "Password reset email is not configured on this server." } });
      return;
    }

    const user = await UserModel.findOne({ email: email.trim().toLowerCase(), status: "ACTIVE" });
    if (!user) {
      res.status(200).json(GENERIC_RESPONSE);
      return;
    }

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await UserModel.updateOne(
      { _id: user._id, status: "ACTIVE" },
      { $set: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt } },
    );

    const resetUrl = new URL("/reset-password", process.env.WEB_URL ?? "http://localhost:3000");
    resetUrl.searchParams.set("token", rawToken);
    resetUrl.searchParams.set("email", user.email);
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: "Reset your Rudin Store password",
        text: `A password reset was requested for your Rudin Store account. This link expires in 30 minutes: ${resetUrl.toString()} If you did not request this, ignore this email.`,
        html: `<p>A password reset was requested for your Rudin Store account.</p><p><a href="${resetUrl.toString()}">Reset password</a></p><p>This link expires in 30 minutes. If you did not request this, ignore this email.</p>`,
      }),
    });

    if (!emailResponse.ok) {
      await UserModel.updateOne({ _id: user._id, passwordResetTokenHash: tokenHash }, {
        $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
      });
      res.status(502).json({ error: { code: "EMAIL_DELIVERY_FAILED", message: "Password reset email could not be sent. Please try again later." } });
      return;
    }

    res.status(200).json(GENERIC_RESPONSE);
  } catch (error) {
    next(error);
  }
});

passwordResetRouter.post("/confirm", async (req, res, next) => {
  try {
    const { email, token, password } = req.body ?? {};
    if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim()) ||
        typeof token !== "string" || token.length < 20 || token.length > 200 ||
        typeof password !== "string" || password.length < 12 || password.length > 128) {
      res.status(400).json({ error: { code: "INVALID_RESET_REQUEST", message: "Provide the reset link details and a password of 12–128 characters." } });
      return;
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const user = await UserModel.findOne({
      email: email.trim().toLowerCase(),
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
      status: "ACTIVE",
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");

    if (!user) {
      res.status(400).json({ error: { code: "INVALID_OR_EXPIRED_RESET_TOKEN", message: "The reset link is invalid or has expired. Request a new link." } });
      return;
    }

    const passwordHash = await hashPassword(password);
    const result = await UserModel.updateOne(
      {
        _id: user._id,
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
        status: "ACTIVE",
      },
      {
        $set: { passwordHash },
        $inc: { authVersion: 1 },
        $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
      },
    );
    if (result.modifiedCount !== 1) {
      res.status(400).json({ error: { code: "INVALID_OR_EXPIRED_RESET_TOKEN", message: "The reset link is invalid or has expired. Request a new link." } });
      return;
    }

    res.status(200).json({ message: "Password updated. Sign in with your new password." });
  } catch (error) {
    next(error);
  }
});

export default passwordResetRouter;
