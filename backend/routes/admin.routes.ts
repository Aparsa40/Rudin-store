import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { Router } from "express";
import { UserModel } from "../models/user.model.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { resolveAdminPermissions } from "../lib/admin-permissions.js";

const scrypt = promisify(scryptCallback);
const adminRouter = Router();
// The /api/admin governance area belongs to the primary platform owner only.
// The MANAGER appoints, permits, suspends and revokes ADMIN accounts; admins
// cannot reach these endpoints even when the manager granted them permissions.
adminRouter.use(requireAuth, requireRole("MANAGER"));

const ADMIN_CREDENTIAL_ERROR = "Provide a valid email, a password of 12–128 characters, and a first name.";

function isValidAdminCredentials(body: Record<string, unknown>): boolean {
  const { email, password, firstName, lastName } = body;
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    typeof password === "string" && password.length >= 12 && password.length <= 128 &&
    typeof firstName === "string" && firstName.trim().length >= 1 && firstName.trim().length <= 80 &&
    (lastName === undefined || (typeof lastName === "string" && lastName.length <= 80));
}

adminRouter.get("/admins", async (_req, res, next) => {
  try {
    const admins = await UserModel.find({ role: "ADMIN" })
      .select("_id email firstName lastName status createdAt createdBy adminPermissions")
      .sort({ createdAt: -1 }).lean();
    res.status(200).json({ admins: admins.map((admin) => ({
      id: admin._id, email: admin.email, firstName: admin.firstName, lastName: admin.lastName,
      status: admin.status, createdAt: admin.createdAt, createdBy: admin.createdBy,
      permissions: admin.adminPermissions ?? [],
    })) });
  } catch (error) { next(error); }
});

// Admin accounts are created exclusively by the MANAGER. The optional
// permission object is resolved server-side; client-supplied permission lists
// are never stored directly, and unknown presets or permissions are rejected.
adminRouter.post("/admins", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (!isValidAdminCredentials(body)) {
      res.status(400).json({ error: { code: "INVALID_ADMIN", message: ADMIN_CREDENTIAL_ERROR } });
      return;
    }
    const permissionInput = body.permission;
    if (permissionInput !== undefined && (typeof permissionInput !== "object" || Array.isArray(permissionInput) || permissionInput === null)) {
      res.status(400).json({ error: { code: "INVALID_PERMISSIONS", message: "permission must be an object with optional presets, allow and deny arrays." } });
      return;
    }
    const resolved = resolveAdminPermissions((permissionInput ?? {}) as { presets?: unknown; allow?: unknown; deny?: unknown });
    if ("error" in resolved) {
      res.status(400).json({ error: { code: "INVALID_PERMISSIONS", message: resolved.error } });
      return;
    }
    const normalizedEmail = (body.email as string).trim().toLowerCase();
    if (await UserModel.exists({ email: normalizedEmail })) {
      res.status(409).json({ error: { code: "EMAIL_IN_USE", message: "An account with this email already exists." } });
      return;
    }
    const salt = randomBytes(16).toString("hex");
    const hash = await scrypt(body.password as string, salt, 64) as Buffer;
    const user = await UserModel.create({
      _id: `usr_${randomBytes(12).toString("hex")}`, email: normalizedEmail,
      passwordHash: `scrypt:${salt}:${hash.toString("hex")}`, firstName: (body.firstName as string).trim(),
      lastName: typeof body.lastName === "string" ? body.lastName.trim() : "", role: "ADMIN",
      status: "ACTIVE", createdBy: req.authUser!.id, adminPermissions: resolved.permissions,
    });
    res.status(201).json({ admin: {
      id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName,
      status: user.status, createdAt: user.createdAt, createdBy: user.createdBy,
      permissions: user.adminPermissions,
    } });
  } catch (error) { next(error); }
});

// Only the MANAGER can change what an admin is allowed to do. The stored list is
// replaced wholesale from the server-side resolution; admins cannot edit their
// own permissions because the whole router is MANAGER-only. requireAuth re-reads
// adminPermissions on every request, so grants and revocations apply immediately.
adminRouter.patch("/admins/:id/permissions", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (typeof body !== "object" || Array.isArray(body) || body === null) {
      res.status(400).json({ error: { code: "INVALID_PERMISSIONS", message: "Request body must be a JSON object." } });
      return;
    }
    const resolved = resolveAdminPermissions(body as { presets?: unknown; allow?: unknown; deny?: unknown });
    if ("error" in resolved) {
      res.status(400).json({ error: { code: "INVALID_PERMISSIONS", message: resolved.error } });
      return;
    }
    const user = await UserModel.findOneAndUpdate(
      { _id: req.params.id, role: "ADMIN" },
      { $set: { adminPermissions: resolved.permissions } },
      { new: true, runValidators: true },
    ).select("_id email firstName lastName status adminPermissions");
    if (!user) {
      res.status(404).json({ error: { code: "ADMIN_NOT_FOUND", message: "Administrator not found." } });
      return;
    }
    res.status(200).json({ admin: {
      id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName,
      status: user.status, permissions: user.adminPermissions,
    } });
  } catch (error) { next(error); }
});

// Disabling an admin revokes access immediately: requireAuth re-reads the
// account status on every request. The primary MANAGER owns this decision, so
// no last-active-admin or self-service restriction applies here.
adminRouter.patch("/admins/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body ?? {};
    if (status !== "ACTIVE" && status !== "DISABLED") {
      res.status(400).json({ error: { code: "INVALID_STATUS", message: "status must be ACTIVE or DISABLED." } });
      return;
    }
    const user = await UserModel.findOneAndUpdate(
      { _id: req.params.id, role: "ADMIN" },
      { $set: { status } },
      { new: true },
    );
    if (!user) {
      res.status(404).json({ error: { code: "ADMIN_NOT_FOUND", message: "Administrator not found." } });
      return;
    }
    res.status(200).json({ admin: {
      id: user._id, email: user.email, firstName: user.firstName,
      lastName: user.lastName, status: user.status,
    } });
  } catch (error) { next(error); }
});

export default adminRouter;
