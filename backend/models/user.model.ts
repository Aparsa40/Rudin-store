import { model, Schema } from "mongoose";
import { ADMIN_PERMISSIONS } from "../lib/permissions.js";

const userSchema = new Schema(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, trim: true, maxlength: 80, default: "" },
    phone: { type: String, trim: true, maxlength: 32 },
    role: { type: String, enum: ["CUSTOMER", "VENDOR", "ADMIN", "MANAGER"], required: true, default: "CUSTOMER", index: true },
    // Granular admin capabilities. Meaningful only for ADMIN accounts: the platform
    // MANAGER always has every capability, and customers/vendors keep an empty list.
    // Authorization is enforced server-side on every request.
    permissions: { type: [String], enum: [...ADMIN_PERMISSIONS], default: [] },
    status: { type: String, enum: ["ACTIVE", "DISABLED"], required: true, default: "ACTIVE", index: true },
    createdBy: { type: String },
    storeName: { type: String, trim: true, maxlength: 120 },
    storeDescription: { type: String, trim: true, maxlength: 2000 },
    vendorApplicationStatus: { type: String, enum: ["NONE", "PENDING", "APPROVED", "REJECTED"], default: "NONE", index: true },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    authVersion: { type: Number, required: true, default: 0 },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

// Single-MANAGER invariant at the database level: at most one account may hold the
// platform-owner role. This backs up the serialized bootstrap check against races
// and out-of-band writes.
userSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: "MANAGER" } });

export const UserModel = model("User", userSchema);
