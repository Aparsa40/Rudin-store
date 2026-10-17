import { model, Schema } from 'mongoose';

const userSchema = new Schema(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, trim: true, maxlength: 80, default: '' },
    phone: { type: String, trim: true, maxlength: 32 },
    role: {
      type: String,
      enum: ['CUSTOMER', 'VENDOR', 'ADMIN', 'MANAGER'],
      required: true,
      default: 'CUSTOMER',
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'DISABLED'],
      required: true,
      default: 'ACTIVE',
      index: true,
    },
    createdBy: { type: String },
    // Effective granular permissions the MANAGER granted to an ADMIN account.
    // Written only by server-side permission resolution, never from client input.
    adminPermissions: { type: [String], default: [] },
    storeName: { type: String, trim: true, maxlength: 120 },
    storeDescription: { type: String, trim: true, maxlength: 2000 },
    vendorApplicationStatus: {
      type: String,
      enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'NONE',
      index: true,
    },
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
userSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: 'MANAGER' } });

export const UserModel = model('User', userSchema);
