import { model, Schema } from 'mongoose';

const couponSchema = new Schema(
  {
    _id: { type: String, required: true },
    // Customer-facing code, always stored uppercase; unique across the store.
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    type: { type: String, enum: ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING'], required: true },
    // PERCENTAGE: percent off (1-100). FIXED: absolute amount off. FREE_SHIPPING: unused (0).
    value: { type: Number, required: true, min: 0 },
    minPurchaseAmount: { type: Number, min: 0 },
    // Cap on the computed discount; applies to PERCENTAGE coupons only.
    maxDiscount: { type: Number, min: 0 },
    description: { type: String, trim: true, maxlength: 200 },
    validFrom: { type: Date },
    validUntil: { type: Date, required: true },
    // Optional global redemption cap; enforced atomically on every redeem.
    usageLimit: { type: Number, min: 1 },
    usedCount: { type: Number, required: true, default: 0, min: 0 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, versionKey: false },
);

export const CouponModel = model('Coupon', couponSchema);
