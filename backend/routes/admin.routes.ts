import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { Router } from "express";
import { UserModel } from "../models/user.model.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const scrypt = promisify(scryptCallback);
const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/admins", async (_req, res, next) => {
  try {
    const admins = await UserModel.find({ role: "ADMIN" }).select("_id email firstName lastName status createdAt createdBy").sort({ createdAt: -1 }).lean();
    res.status(200).json({ admins: admins.map((admin) => ({
      id: admin._id, email: admin.email, firstName: admin.firstName, lastName: admin.lastName,
      status: admin.status, createdAt: admin.createdAt, createdBy: admin.createdBy,
    })) });
  } catch (error) { next(error); }
});

adminRouter.post("/admins", async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body ?? {};
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== "string" || password.length < 12 || password.length > 128 ||
        typeof firstName !== "string" || !firstName.trim() || firstName.trim().length > 80 ||
        (lastName !== undefined && (typeof lastName !== "string" || lastName.length > 80))) {
      res.status(400).json({ error: { code: "INVALID_ADMIN", message: "Provide a valid email, a password of 12–128 characters, and a first name." } });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (await UserModel.exists({ email: normalizedEmail })) {
      res.status(409).json({ error: { code: "EMAIL_IN_USE", message: "An account with this email already exists." } });
      return;
    }
    const salt = randomBytes(16).toString("hex");
    const hash = await scrypt(password, salt, 64) as Buffer;
    const user = await UserModel.create({
      _id: `usr_${randomBytes(12).toString("hex")}`, email: normalizedEmail,
      passwordHash: `scrypt:${salt}:${hash.toString("hex")}`, firstName: firstName.trim(),
      lastName: typeof lastName === "string" ? lastName.trim() : "", role: "ADMIN",
      status: "ACTIVE", createdBy: req.authUser!.id,
    });
    res.status(201).json({ admin: {
      id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName,
      status: user.status, createdAt: user.createdAt,
    } });
  } catch (error) { next(error); }
});

adminRouter.patch("/admins/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body ?? {};
    if (status !== "ACTIVE" && status !== "DISABLED") {
      res.status(400).json({ error: { code: "INVALID_STATUS", message: "status must be ACTIVE or DISABLED." } });
      return;
    }
    if (req.params.id === req.authUser!.id && status === "DISABLED") {
      res.status(400).json({ error: { code: "CANNOT_DISABLE_SELF", message: "You cannot disable your own admin account." } });
      return;
    }
    if (status === "DISABLED" && await UserModel.countDocuments({ role: "ADMIN", status: "ACTIVE" }) <= 1) {
      res.status(409).json({ error: { code: "LAST_ACTIVE_ADMIN", message: "The last active administrator cannot be disabled." } });
      return;
    }
    const user = await UserModel.findOneAndUpdate(
      { _id: req.params.id, role: "ADMIN" }, { $set: { status } }, { new: true },
    );
    if (!user) {
      res.status(404).json({ error: { code: "ADMIN_NOT_FOUND", message: "Administrator not found." } });
      return;
    }
    res.status(200).json({ admin: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, status: user.status } });
  } catch (error) { next(error); }
});

export default adminRouter;
