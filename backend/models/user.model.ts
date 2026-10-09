import { model, Schema } from "mongoose";

const userSchema = new Schema(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, trim: true, maxlength: 80, default: "" },
    phone: { type: String, trim: true, maxlength: 32 },
    role: { type: String, enum: ["CUSTOMER", "VENDOR", "ADMIN"], required: true, default: "CUSTOMER", index: true },
    status: { type: String, enum: ["ACTIVE", "DISABLED"], required: true, default: "ACTIVE", index: true },
    createdBy: { type: String },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

export const UserModel = model("User", userSchema);
