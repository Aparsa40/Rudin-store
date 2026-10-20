import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { CouponModel } from '../models/coupon.model.js';
import { OrderModel } from '../models/order.model.js';

const couponsRouter = Router();
const COUPON_TYPES = ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING'] as const;

function round2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function parseMoney(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? round2(value) : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function serializeCoupon(coupon: Record<string, unknown>) {
  const { _id, __v, ...fields } = coupon;
  return { ...fields, id: _id };
}

/** Cross-field rules shared by create and update. Returns an error message or null. */
function validateCouponShape(coupon: {
  type: string;
  value: number;
  minPurchaseAmount?: number;
  maxDiscount?: number;
  validFrom?: Date;
  validUntil: Date;
  usageLimit?: number;
}): string | null {
  if (!COUPON_TYPES.includes(coupon.type as (typeof COUPON_TYPES)[number])) {
    return 'type must be PERCENTAGE, FIXED, or FREE_SHIPPING.';
  }
  if (coupon.type === 'PERCENTAGE') {
    if (coupon.value <= 0 || coupon.value > 100)
      return 'PERCENTAGE coupons require a value between 1 and 100.';
    if (coupon.maxDiscount !== undefined && coupon.maxDiscount <= 0)
      return 'maxDiscount must be a positive amount.';
  } else if (coupon.type === 'FIXED') {
    if (coupon.value <= 0) return 'FIXED coupons require a positive value.';
    if (coupon.maxDiscount !== undefined) return 'maxDiscount applies to PERCENTAGE coupons only.';
  } else if (coupon.value !== 0) {
    return 'FREE_SHIPPING coupons must not define a value.';
  }
  if (coupon.minPurchaseAmount !== undefined && coupon.minPurchaseAmount < 0) {
    return 'minPurchaseAmount must be zero or a positive amount.';
  }
  if (Number.isNaN(coupon.validUntil.getTime())) return 'validUntil must be a valid date.';
  if (coupon.validFrom && coupon.validUntil.getTime() <= coupon.validFrom.getTime()) {
    return 'validUntil must be after validFrom.';
  }
  if (
    coupon.usageLimit !== undefined &&
    (!Number.isInteger(coupon.usageLimit) || coupon.usageLimit < 1)
  ) {
    return 'usageLimit must be an integer of at least 1.';
  }
  return null;
}

/**
 * Server-side discount computation. Always based on a server-known amount
 * (order subtotal from the database, or an explicitly preview-only cart amount);
 * never on client-supplied order totals.
 */
function computeDiscount(
  coupon: { type: string; value: number; maxDiscount?: number | null },
  subtotal: number,
): number {
  if (coupon.type === 'PERCENTAGE') {
    let discount = subtotal * (coupon.value / 100);
    if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
    return round2(Math.min(discount, subtotal));
  }
  if (coupon.type === 'FIXED') return round2(Math.min(coupon.value, subtotal));
  // FREE_SHIPPING: orders do not model a shipping cost yet (always 0), so the
  // computed discount is 0 until checkout defines shipping methods.
  return 0;
}

/** Loads a coupon only when it is currently usable; a single generic 404-safe null otherwise. */
async function findUsableCoupon(code: string) {
  const coupon = await CouponModel.findOne({ code: code.trim().toUpperCase() }).lean();
  if (!coupon || !coupon.isActive) return null;
  const now = new Date();
  if (coupon.validFrom && coupon.validFrom.getTime() > now.getTime()) return null;
  if (coupon.validUntil.getTime() <= now.getTime()) return null;
  if (
    coupon.usageLimit !== undefined &&
    coupon.usageLimit !== null &&
    coupon.usedCount >= coupon.usageLimit
  )
    return null;
  return coupon;
}

/**
 * In-band errors for the redemption transaction. Aborting the transaction rolls
 * the redemption claim and the usage-counter increment back together, and the
 * error is mapped to a precise response outside the transaction.
 */
class RedemptionConflictError extends Error {
  constructor() {
    super('This order has already redeemed a coupon.');
    this.name = 'RedemptionConflictError';
  }
}

class CouponUnusableError extends Error {
  constructor() {
    super('This coupon code is not valid.');
    this.name = 'CouponUnusableError';
  }
}

// Management listing: gated by coupons:manage (the manager always passes).
couponsRouter.get(
  '/',
  requireAuth,
  requirePermission('coupons:manage'),
  async (_req, res, next) => {
    try {
      const coupons = await CouponModel.find().sort({ createdAt: -1 }).lean();
      res
        .status(200)
        .json({
          coupons: coupons.map((coupon) =>
            serializeCoupon(coupon as unknown as Record<string, unknown>),
          ),
        });
    } catch (error) {
      next(error);
    }
  },
);

// Coupon management is limited to the manager and admins holding coupons:manage; all
// discount math, validity windows, and usage caps are validated server-side.
couponsRouter.post(
  '/',
  requireAuth,
  requirePermission('coupons:manage'),
  async (req, res, next) => {
    try {
      const body = req.body ?? {};
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        res
          .status(400)
          .json({
            error: { code: 'INVALID_COUPON', message: 'Request body must be a JSON object.' },
          });
        return;
      }
      const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
      if (code.length < 3 || code.length > 40 || !/^[A-Z0-9][A-Z0-9_-]*$/.test(code)) {
        res
          .status(400)
          .json({
            error: {
              code: 'INVALID_COUPON',
              message: 'code must be 3-40 characters of letters, digits, hyphens, or underscores.',
            },
          });
        return;
      }
      if (body.type !== 'PERCENTAGE' && body.type !== 'FIXED' && body.type !== 'FREE_SHIPPING') {
        res
          .status(400)
          .json({
            error: {
              code: 'INVALID_COUPON',
              message: 'type must be PERCENTAGE, FIXED, or FREE_SHIPPING.',
            },
          });
        return;
      }
      const type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING' = body.type;
      let value: number;
      if (type === 'FREE_SHIPPING') {
        value = 0;
      } else {
        const parsed = parseMoney(body.value);
        if (parsed === null) {
          res
            .status(400)
            .json({ error: { code: 'INVALID_COUPON', message: 'value must be a number.' } });
          return;
        }
        value = parsed;
      }
      let minPurchaseAmount: number | undefined;
      if (body.minPurchaseAmount !== undefined) {
        const parsed = parseMoney(body.minPurchaseAmount);
        if (parsed === null || parsed < 0) {
          res
            .status(400)
            .json({
              error: {
                code: 'INVALID_COUPON',
                message: 'minPurchaseAmount must be zero or a positive number.',
              },
            });
          return;
        }
        minPurchaseAmount = parsed;
      }
      let maxDiscount: number | undefined;
      if (body.maxDiscount !== undefined) {
        const parsed = parseMoney(body.maxDiscount);
        if (parsed === null || parsed <= 0) {
          res
            .status(400)
            .json({
              error: { code: 'INVALID_COUPON', message: 'maxDiscount must be a positive number.' },
            });
          return;
        }
        maxDiscount = parsed;
      }
      let description: string | undefined;
      if (body.description !== undefined) {
        if (typeof body.description !== 'string' || body.description.length > 200) {
          res
            .status(400)
            .json({
              error: {
                code: 'INVALID_COUPON',
                message: 'description must be a string of at most 200 characters.',
              },
            });
          return;
        }
        description = body.description.trim();
      }
      let validFrom: Date | undefined;
      if (body.validFrom !== undefined) {
        const parsed = parseDate(body.validFrom);
        if (!parsed) {
          res
            .status(400)
            .json({
              error: { code: 'INVALID_COUPON', message: 'validFrom must be a valid date.' },
            });
          return;
        }
        validFrom = parsed;
      }
      const validUntil = parseDate(body.validUntil);
      if (!validUntil || validUntil.getTime() <= Date.now()) {
        res
          .status(400)
          .json({
            error: { code: 'INVALID_COUPON', message: 'validUntil must be a future date.' },
          });
        return;
      }
      let usageLimit: number | undefined;
      if (body.usageLimit !== undefined) {
        if (
          typeof body.usageLimit !== 'number' ||
          !Number.isInteger(body.usageLimit) ||
          body.usageLimit < 1
        ) {
          res
            .status(400)
            .json({
              error: {
                code: 'INVALID_COUPON',
                message: 'usageLimit must be an integer of at least 1.',
              },
            });
          return;
        }
        usageLimit = body.usageLimit;
      }
      if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
        res
          .status(400)
          .json({ error: { code: 'INVALID_COUPON', message: 'isActive must be a boolean.' } });
        return;
      }
      const isActive = body.isActive === undefined ? true : body.isActive;

      const shapeError = validateCouponShape({
        type,
        value,
        minPurchaseAmount,
        maxDiscount,
        validFrom,
        validUntil,
        usageLimit,
      });
      if (shapeError) {
        res.status(400).json({ error: { code: 'INVALID_COUPON', message: shapeError } });
        return;
      }

      const coupon = await CouponModel.create({
        _id: `cpn_${randomBytes(12).toString('hex')}`,
        code,
        type,
        value,
        minPurchaseAmount,
        maxDiscount,
        description,
        validFrom,
        validUntil,
        usageLimit,
        usedCount: 0,
        isActive,
      });
      res
        .status(201)
        .json({ coupon: serializeCoupon(coupon.toObject() as unknown as Record<string, unknown>) });
    } catch (error) {
      // The unique code index rejects concurrent creates with the same code.
      if ((error as { code?: number } | null)?.code === 11000) {
        res
          .status(409)
          .json({
            error: {
              code: 'COUPON_CODE_IN_USE',
              message: 'A coupon with this code already exists.',
            },
          });
        return;
      }
      next(error);
    }
  },
);

// Coupon codes are immutable: usage history is tracked per code, so edits that
// silently repurpose an already-distributed code are refused.
couponsRouter.patch(
  '/:id',
  requireAuth,
  requirePermission('coupons:manage'),
  async (req, res, next) => {
    try {
      const body = req.body ?? {};
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        res
          .status(400)
          .json({
            error: { code: 'INVALID_COUPON', message: 'Request body must be a JSON object.' },
          });
        return;
      }
      const coupon = await CouponModel.findById(req.params.id);
      if (!coupon) {
        res.status(404).json({ error: { code: 'COUPON_NOT_FOUND', message: 'Coupon not found.' } });
        return;
      }
      if (body.code !== undefined) {
        res
          .status(400)
          .json({
            error: {
              code: 'INVALID_COUPON',
              message: 'Coupon codes cannot be changed. Create a new coupon instead.',
            },
          });
        return;
      }

      const merged: {
        type: string;
        value: number;
        minPurchaseAmount?: number;
        maxDiscount?: number;
        validFrom?: Date;
        validUntil: Date;
        usageLimit?: number;
      } = {
        type: coupon.type,
        value: coupon.value,
        // Mongoose optional fields may be null; the validation shape uses undefined for absent values.
        minPurchaseAmount: coupon.minPurchaseAmount ?? undefined,
        maxDiscount: coupon.maxDiscount ?? undefined,
        validFrom: coupon.validFrom ?? undefined,
        validUntil: coupon.validUntil,
        usageLimit: coupon.usageLimit ?? undefined,
      };
      const updates: Record<string, unknown> = {};

      if (body.type !== undefined) {
        if (body.type !== 'PERCENTAGE' && body.type !== 'FIXED' && body.type !== 'FREE_SHIPPING') {
          res
            .status(400)
            .json({
              error: {
                code: 'INVALID_COUPON',
                message: 'type must be PERCENTAGE, FIXED, or FREE_SHIPPING.',
              },
            });
          return;
        }
        merged.type = body.type;
        updates.type = body.type;
        if (body.value === undefined && merged.type === 'FREE_SHIPPING') {
          merged.value = 0;
          updates.value = 0;
        }
      }
      if (body.value !== undefined) {
        const parsed = parseMoney(body.value);
        if (parsed === null) {
          res
            .status(400)
            .json({ error: { code: 'INVALID_COUPON', message: 'value must be a number.' } });
          return;
        }
        const value = merged.type === 'FREE_SHIPPING' ? 0 : parsed;
        merged.value = value;
        updates.value = value;
      }
      if (body.minPurchaseAmount !== undefined) {
        const parsed = parseMoney(body.minPurchaseAmount);
        if (parsed === null || parsed < 0) {
          res
            .status(400)
            .json({
              error: {
                code: 'INVALID_COUPON',
                message: 'minPurchaseAmount must be zero or a positive number.',
              },
            });
          return;
        }
        merged.minPurchaseAmount = parsed;
        updates.minPurchaseAmount = parsed;
      }
      if (body.maxDiscount !== undefined) {
        const parsed = parseMoney(body.maxDiscount);
        if (parsed === null || parsed <= 0) {
          res
            .status(400)
            .json({
              error: { code: 'INVALID_COUPON', message: 'maxDiscount must be a positive number.' },
            });
          return;
        }
        merged.maxDiscount = parsed;
        updates.maxDiscount = parsed;
      }
      if (body.description !== undefined) {
        if (typeof body.description !== 'string' || body.description.length > 200) {
          res
            .status(400)
            .json({
              error: {
                code: 'INVALID_COUPON',
                message: 'description must be a string of at most 200 characters.',
              },
            });
          return;
        }
        updates.description = body.description.trim();
      }
      if (body.validFrom !== undefined) {
        const parsed = parseDate(body.validFrom);
        if (!parsed) {
          res
            .status(400)
            .json({
              error: { code: 'INVALID_COUPON', message: 'validFrom must be a valid date.' },
            });
          return;
        }
        merged.validFrom = parsed;
        updates.validFrom = parsed;
      }
      if (body.validUntil !== undefined) {
        const parsed = parseDate(body.validUntil);
        if (!parsed) {
          res
            .status(400)
            .json({
              error: { code: 'INVALID_COUPON', message: 'validUntil must be a valid date.' },
            });
          return;
        }
        merged.validUntil = parsed;
        updates.validUntil = parsed;
      }
      if (body.usageLimit !== undefined) {
        if (
          typeof body.usageLimit !== 'number' ||
          !Number.isInteger(body.usageLimit) ||
          body.usageLimit < 1
        ) {
          res
            .status(400)
            .json({
              error: {
                code: 'INVALID_COUPON',
                message: 'usageLimit must be an integer of at least 1.',
              },
            });
          return;
        }
        merged.usageLimit = body.usageLimit;
        updates.usageLimit = body.usageLimit;
      }
      if (body.isActive !== undefined) {
        if (typeof body.isActive !== 'boolean') {
          res
            .status(400)
            .json({ error: { code: 'INVALID_COUPON', message: 'isActive must be a boolean.' } });
          return;
        }
        updates.isActive = body.isActive;
      }

      const shapeError = validateCouponShape(merged);
      if (shapeError) {
        res.status(400).json({ error: { code: 'INVALID_COUPON', message: shapeError } });
        return;
      }

      const updated = await CouponModel.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { returnDocument: 'after', runValidators: true },
      ).lean();
      if (!updated) {
        res.status(404).json({ error: { code: 'COUPON_NOT_FOUND', message: 'Coupon not found.' } });
        return;
      }
      res
        .status(200)
        .json({ coupon: serializeCoupon(updated as unknown as Record<string, unknown>) });
    } catch (error) {
      next(error);
    }
  },
);

// Non-mutating preview for checkout. The amount is a preview input only; the real
// discount is always recomputed from the database at redemption time.
couponsRouter.post('/validate', async (req, res, next) => {
  try {
    const { code, amount } = req.body ?? {};
    if (
      typeof code !== 'string' ||
      !code.trim() ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      res
        .status(400)
        .json({
          error: {
            code: 'INVALID_COUPON_REQUEST',
            message: 'Provide a coupon code and a non-negative cart amount.',
          },
        });
      return;
    }
    const coupon = await findUsableCoupon(code.trim());
    if (!coupon) {
      res
        .status(404)
        .json({ error: { code: 'COUPON_NOT_FOUND', message: 'This coupon code is not valid.' } });
      return;
    }
    if (coupon.minPurchaseAmount && amount < coupon.minPurchaseAmount) {
      res
        .status(404)
        .json({ error: { code: 'COUPON_NOT_FOUND', message: 'This coupon code is not valid.' } });
      return;
    }
    res
      .status(200)
      .json({
        coupon: serializeCoupon(coupon as unknown as Record<string, unknown>),
        discountAmount: computeDiscount(coupon, amount),
      });
  } catch (error) {
    next(error);
  }
});

/**
 * Redemption. The discount base is the caller's OWN order subtotal read from the
 * database (ownership enforced by the userId filter); client totals are ignored.
 * Exactly one coupon may be redeemed per order: the per-order claim and the
 * usage-counter increment are written together in ONE MongoDB transaction (the
 * same replica-set deployment the order-creation transaction requires).
 * Repeated or concurrent requests for the same order and coupon are idempotent
 * replays of the recorded redemption; a different coupon on an already-redeemed
 * order is refused with 409 COUPON_ALREADY_REDEEMED. Redemption does NOT mutate
 * order totals: totals change only through future checkout integration once
 * payment rules are defined.
 */
couponsRouter.post('/redeem', requireAuth, async (req, res, next) => {
  try {
    const { code, orderId } = req.body ?? {};
    if (
      typeof code !== 'string' ||
      !code.trim() ||
      typeof orderId !== 'string' ||
      !orderId.trim()
    ) {
      res
        .status(400)
        .json({
          error: {
            code: 'INVALID_COUPON_REQUEST',
            message: 'Provide a coupon code and an order id.',
          },
        });
      return;
    }
    const trimmedCode = code.trim();
    const order = await OrderModel.findOne({
      _id: orderId.trim(),
      userId: req.authUser!.id,
    }).lean();
    if (!order) {
      res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
      return;
    }
    // Idempotent replay: the recorded claim is the durable proof that this coupon
    // was already redeemed for this order, so replays return the stored discount
    // without touching the usage counter again.
    const existingClaim = order.couponRedemption;
    if (existingClaim) {
      if (existingClaim.code === trimmedCode.toUpperCase()) {
        res.status(200).json({
          coupon: { id: existingClaim.couponId, code: existingClaim.code },
          discountAmount: existingClaim.discount,
          orderSubtotal: order.subtotal,
          discountedTotal: round2(order.subtotal - existingClaim.discount),
          alreadyRedeemed: true,
        });
        return;
      }
      res
        .status(409)
        .json({
          error: {
            code: 'COUPON_ALREADY_REDEEMED',
            message: 'This order has already redeemed a coupon.',
          },
        });
      return;
    }
    const coupon = await findUsableCoupon(trimmedCode);
    if (!coupon) {
      res
        .status(404)
        .json({ error: { code: 'COUPON_NOT_FOUND', message: 'This coupon code is not valid.' } });
      return;
    }
    if (coupon.minPurchaseAmount && order.subtotal < coupon.minPurchaseAmount) {
      res
        .status(404)
        .json({ error: { code: 'COUPON_NOT_FOUND', message: 'This coupon code is not valid.' } });
      return;
    }
    const discountAmount = computeDiscount(coupon, order.subtotal);
    const now = new Date();
    const session = await mongoose.startSession();
    try {
      let consumed: Record<string, unknown> | undefined;
      await session.withTransaction(async () => {
        // Claim: exactly one concurrent request per order can win this update.
        const claimed = await OrderModel.findOneAndUpdate(
          { _id: order._id, userId: req.authUser!.id, couponRedemption: { $exists: false } },
          {
            $set: {
              couponRedemption: {
                couponId: coupon._id,
                code: coupon.code,
                discount: discountAmount,
                redeemedAt: now,
              },
            },
          },
          { session },
        );
        if (!claimed) throw new RedemptionConflictError();
        // Consume: every usability condition is re-checked inside the atomic update
        // filter, so concurrent redeems race safely and the cap can never be exceeded.
        const filter: Record<string, unknown> = {
          _id: coupon._id,
          isActive: true,
          validUntil: { $gt: now },
          ...(coupon.validFrom ? { validFrom: { $lte: now } } : {}),
          ...(coupon.usageLimit !== undefined && coupon.usageLimit !== null
            ? { usedCount: { $lt: coupon.usageLimit } }
            : {}),
        };
        const updated = await CouponModel.findOneAndUpdate(
          filter,
          { $inc: { usedCount: 1 } },
          { returnDocument: 'after', session },
        ).lean();
        if (!updated) throw new CouponUnusableError();
        consumed = updated as unknown as Record<string, unknown>;
      });
      res.status(200).json({
        coupon: serializeCoupon(consumed!),
        discountAmount,
        orderSubtotal: order.subtotal,
        discountedTotal: round2(order.subtotal - discountAmount),
        alreadyRedeemed: false,
      });
    } catch (error) {
      // The claim was lost to a concurrent request on the same order: either the
      // same coupon won (idempotent replay) or another coupon did (refuse it).
      if (error instanceof RedemptionConflictError) {
        const current = await OrderModel.findOne({
          _id: order._id,
          userId: req.authUser!.id,
        }).lean();
        const claim = current?.couponRedemption;
        if (claim && claim.code === coupon.code) {
          res.status(200).json({
            coupon: { id: claim.couponId, code: claim.code },
            discountAmount: claim.discount,
            orderSubtotal: current!.subtotal,
            discountedTotal: round2(current!.subtotal - claim.discount),
            alreadyRedeemed: true,
          });
          return;
        }
        res
          .status(409)
          .json({
            error: {
              code: 'COUPON_ALREADY_REDEEMED',
              message: 'This order has already redeemed a coupon.',
            },
          });
        return;
      }
      // The coupon was exhausted, deactivated, or expired concurrently: the aborted
      // transaction rolled the claim back, so nothing was consumed.
      if (error instanceof CouponUnusableError) {
        res
          .status(404)
          .json({ error: { code: 'COUPON_NOT_FOUND', message: 'This coupon code is not valid.' } });
        return;
      }
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    next(error);
  }
});

export default couponsRouter;
