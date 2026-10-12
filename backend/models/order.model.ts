import { model, Schema } from "mongoose";

const orderAddressSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 32 },
    street1: { type: String, required: true, trim: true, maxlength: 200 },
    street2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    country: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { _id: false },
);

const orderItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    variantId: { type: String },
    title: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 99 },
    subtotal: { type: Number, required: true, min: 0 },
    vendorId: { type: String, required: true },
  },
  { _id: false },
);

// One coupon per order: the redemption claim written by the coupon router inside
// the redemption transaction. It is the durable proof that a coupon was consumed
// for this order, so repeated redemption attempts cannot consume it twice.
const couponRedemptionSchema = new Schema(
  {
    couponId: { type: String, required: true },
    code: { type: String, required: true },
    discount: { type: Number, required: true, min: 0 },
    redeemedAt: { type: Date, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true },
    status: { type: String, enum: ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"], default: "PENDING" },
    // No payment gateway is integrated: an order is created PENDING and may only
    // become PAID through a verified payment callback (not implemented yet).
    paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED", "REFUNDED"], default: "PENDING" },
    paymentMethod: { type: String, enum: ["CASH_ON_DELIVERY", "CREDIT_CARD", "PAYPAL", "APPLE_PAY"], required: true },
    items: { type: [orderItemSchema], default: [] },
    shippingAddress: { type: orderAddressSchema, required: true },
    // All monetary fields are computed server-side from database product prices.
    // Client-supplied totals are never trusted or stored.
    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    // Idempotency: one order per (user, key). Optional; requests without a key are always processed.
    idempotencyKey: { type: String, trim: true },
    couponRedemption: { type: couponRedemptionSchema },
  },
  { timestamps: true, versionKey: false },
);

orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } });
orderSchema.index({ userId: 1, createdAt: -1 });

export const OrderModel = model("Order", orderSchema);
