import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import mongoose, { type ClientSession } from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { ProductModel } from '../models/product.model.js';
import { OrderModel } from '../models/order.model.js';

const ordersRouter = Router();

const MAX_ITEMS = 50;
const PAYMENT_METHODS = ['CASH_ON_DELIVERY', 'CREDIT_CARD', 'PAYPAL', 'APPLE_PAY'] as const;

interface IncomingItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

interface ResolvedItem {
  productId: string;
  variantId?: string;
  title: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  vendorId: string;
}

/**
 * In-band API error thrown inside the order transaction. Aborting the transaction
 * rolls back every stock decrement, and the error is mapped to a precise response.
 */
class OrderApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'OrderApiError';
  }
}

/** True when the error is a MongoDB duplicate-key failure (unique index violation). */
function isDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as {
    code?: unknown;
    codeName?: unknown;
    writeErrors?: Array<{ code?: unknown }>;
  };
  if (candidate.code === 11000 || candidate.codeName === 'DuplicateKey') return true;
  return (
    Array.isArray(candidate.writeErrors) &&
    candidate.writeErrors.some((writeError) => writeError.code === 11000)
  );
}

/** Shared order serialization; the read-only admin order router reuses it. */
export function serializeOrder(order: Record<string, unknown>) {
  const { _id, __v, ...fields } = order;
  return { ...fields, id: _id };
}

function parseAddress(value: unknown): { address: Record<string, string>; error?: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { address: {}, error: 'shippingAddress must be an object.' };
  }
  const source = value as Record<string, unknown>;
  const stringField = (key: string, max: number): string | undefined => {
    const raw = source[key];
    if (typeof raw !== 'string' || !raw.trim() || raw.trim().length > max) return undefined;
    return raw.trim();
  };
  const address: Record<string, string> = {};
  const required: Array<[string, number]> = [
    ['fullName', 120],
    ['phone', 32],
    ['street1', 200],
    ['city', 100],
    ['state', 100],
    ['postalCode', 20],
    ['country', 100],
  ];
  for (const [key, max] of required) {
    const parsed = stringField(key, max);
    if (!parsed)
      return { address: {}, error: `shippingAddress.${key} is required (1-${max} characters).` };
    address[key] = parsed;
  }
  const street2 = stringField('street2', 200);
  if (street2) address.street2 = street2;
  return { address };
}

function parseItems(value: unknown): { items: IncomingItem[]; error?: string } {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ITEMS) {
    return { items: [], error: `items must be a non-empty array of at most ${MAX_ITEMS} entries.` };
  }
  const items: IncomingItem[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      return { items: [], error: 'Each item must be an object with productId and quantity.' };
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.productId !== 'string' || !record.productId.trim()) {
      return { items: [], error: 'Each item requires a productId.' };
    }
    if (record.variantId !== undefined && typeof record.variantId !== 'string') {
      return { items: [], error: 'variantId must be a string when provided.' };
    }
    const quantity = record.quantity;
    if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 99) {
      return { items: [], error: 'Each item requires an integer quantity between 1 and 99.' };
    }
    items.push({
      productId: record.productId.trim(),
      variantId: typeof record.variantId === 'string' ? record.variantId.trim() : undefined,
      quantity: quantity as number,
    });
  }
  return { items };
}

/**
 * Atomic stock decrement inside the order transaction. The filter guarantees the
 * decrement only happens when enough stock exists, so concurrent orders can
 * never oversell a product.
 */
async function decrementProductStock(
  productId: string,
  quantity: number,
  session: ClientSession,
): Promise<boolean> {
  const updated = await ProductModel.findOneAndUpdate(
    { _id: productId, status: 'PUBLISHED', stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { returnDocument: 'after', session },
  ).select('_id');
  return Boolean(updated);
}

/**
 * Atomic variant stock decrement inside the order transaction. $elemMatch forces the
 * variant identity and the sufficient-stock condition to match the SAME array element:
 * with bare dotted conditions another variant's stock could satisfy the stock predicate
 * and the positional operator would then decrement the wrong variant.
 */
async function decrementVariantStock(
  productId: string,
  variantId: string,
  quantity: number,
  session: ClientSession,
): Promise<boolean> {
  const updated = await ProductModel.findOneAndUpdate(
    {
      _id: productId,
      status: 'PUBLISHED',
      variants: { $elemMatch: { id: variantId, stockQuantity: { $gte: quantity } } },
    },
    { $inc: { 'variants.$.stockQuantity': -quantity } },
    { returnDocument: 'after', session },
  ).select('_id');
  return Boolean(updated);
}

ordersRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const orders = await OrderModel.find({ userId: req.authUser!.id })
      .sort({ createdAt: -1 })
      .lean();
    res
      .status(200)
      .json({
        orders: orders.map((order) => serializeOrder(order as unknown as Record<string, unknown>)),
      });
  } catch (error) {
    next(error);
  }
});

ordersRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    // Ownership is enforced by the userId filter; other users' orders are indistinguishable from missing ones.
    const order = await OrderModel.findOne({ _id: req.params.id, userId: req.authUser!.id }).lean();
    if (!order) {
      res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
      return;
    }
    res.status(200).json({ order: serializeOrder(order as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
});

// Server-authoritative order creation. Prices, totals, and stock availability come
// exclusively from the database; client-supplied monetary values are ignored.
// No payment gateway is integrated, so every order starts PENDING / PENDING.
//
// Stock decrements and order persistence run inside ONE MongoDB transaction
// (the integration database is a replica set, so transactions are available):
// any failure - insufficient stock, a duplicate idempotency key, or a persistence
// error - rolls back every decrement, so failed orders never consume inventory.
ordersRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      res
        .status(400)
        .json({ error: { code: 'INVALID_ORDER', message: 'Request body must be a JSON object.' } });
      return;
    }

    const { items, error: itemsError } = parseItems(body.items);
    if (itemsError) {
      res.status(400).json({ error: { code: 'INVALID_ORDER', message: itemsError } });
      return;
    }

    const { address, error: addressError } = parseAddress(body.shippingAddress);
    if (addressError) {
      res.status(400).json({ error: { code: 'INVALID_ORDER', message: addressError } });
      return;
    }

    if (!PAYMENT_METHODS.includes(body.paymentMethod)) {
      res
        .status(400)
        .json({
          error: {
            code: 'INVALID_ORDER',
            message: `paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}.`,
          },
        });
      return;
    }

    // Idempotency: replaying a key returns the original order without re-decrementing
    // stock. The unique partial index on (userId, idempotencyKey) is the concurrency
    // guard: two concurrent same-key requests cannot both insert, so the loser's
    // transaction aborts and the committed order is replayed.
    const idempotencyKeyRaw = req.header('idempotency-key');
    let idempotencyKey: string | undefined;
    if (idempotencyKeyRaw !== undefined) {
      if (
        typeof idempotencyKeyRaw !== 'string' ||
        idempotencyKeyRaw.trim().length < 8 ||
        idempotencyKeyRaw.trim().length > 128
      ) {
        res
          .status(400)
          .json({
            error: {
              code: 'INVALID_IDEMPOTENCY_KEY',
              message: 'Idempotency-Key must be 8-128 characters.',
            },
          });
        return;
      }
      idempotencyKey = idempotencyKeyRaw.trim();
    }

    const userId = req.authUser!.id;

    const session = await mongoose.startSession();
    try {
      let replayed: Record<string, unknown> | undefined;
      let created: Record<string, unknown> | undefined;

      await session.withTransaction(async () => {
        if (idempotencyKey) {
          const existing = await OrderModel.findOne({ userId, idempotencyKey })
            .session(session)
            .lean();
          if (existing) {
            replayed = existing as unknown as Record<string, unknown>;
            return;
          }
        }

        // Resolve every item against published products. Prices come only from the database.
        const productIds = [...new Set(items.map((item) => item.productId))];
        const products = await ProductModel.find({ _id: { $in: productIds }, status: 'PUBLISHED' })
          .session(session)
          .lean();
        const productMap = new Map(products.map((product) => [String(product._id), product]));

        const resolved: ResolvedItem[] = [];
        for (const item of items) {
          const product = productMap.get(item.productId);
          if (!product) {
            throw new OrderApiError(
              400,
              'PRODUCT_NOT_FOUND',
              `Product ${item.productId} is not available.`,
            );
          }
          if (item.variantId) {
            const variant = (product.variants ?? []).find(
              (candidate) => candidate.id === item.variantId,
            );
            if (!variant) {
              throw new OrderApiError(
                400,
                'VARIANT_NOT_FOUND',
                `Variant ${item.variantId} is not available.`,
              );
            }
            resolved.push({
              productId: item.productId,
              variantId: item.variantId,
              title: `${product.title} (${variant.name})`,
              unitPrice: variant.price,
              quantity: item.quantity,
              subtotal: variant.price * item.quantity,
              vendorId: product.vendorId,
            });
          } else {
            if ((product.variants ?? []).length > 0) {
              throw new OrderApiError(
                400,
                'VARIANT_REQUIRED',
                `Product ${item.productId} requires a variantId.`,
              );
            }
            resolved.push({
              productId: item.productId,
              title: String(product.title),
              unitPrice: product.price,
              quantity: item.quantity,
              subtotal: product.price * item.quantity,
              vendorId: product.vendorId,
            });
          }
        }

        // Stock buckets: duplicate lines for the same product/variant are merged so each
        // stock bucket is decremented exactly once per transaction. Order lines are
        // stored exactly as resolved, each within the per-line quantity limit.
        const buckets = new Map<
          string,
          { productId: string; variantId?: string; quantity: number }
        >();
        for (const item of resolved) {
          const key = `${item.productId}:${item.variantId ?? ''}`;
          const bucket = buckets.get(key);
          if (bucket) {
            bucket.quantity += item.quantity;
          } else {
            buckets.set(key, {
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
            });
          }
        }

        // Server-side totals. Shipping and tax are zero until a product decision defines
        // shipping methods and tax rules; client-supplied values are never accepted.
        const subtotal =
          Math.round(resolved.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
        const shippingCost = 0;
        const tax = 0;
        const total = Math.round((subtotal + shippingCost + tax) * 100) / 100;

        for (const bucket of buckets.values()) {
          const ok = bucket.variantId
            ? await decrementVariantStock(
                bucket.productId,
                bucket.variantId,
                bucket.quantity,
                session,
              )
            : await decrementProductStock(bucket.productId, bucket.quantity, session);
          if (!ok) {
            throw new OrderApiError(
              409,
              'OUT_OF_STOCK',
              `Insufficient stock for product ${bucket.productId}.`,
              { productId: bucket.productId },
            );
          }
        }

        const orderId = `ord_${randomBytes(12).toString('hex')}`;
        const [order] = await OrderModel.create(
          [
            {
              _id: orderId,
              userId,
              orderNumber: `RD-${Date.now().toString(36).toUpperCase()}`,
              status: 'PENDING',
              paymentStatus: 'PENDING',
              paymentMethod: body.paymentMethod,
              items: resolved.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                title: item.title,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                subtotal: item.subtotal,
                vendorId: item.vendorId,
              })),
              shippingAddress: address,
              subtotal,
              shippingCost,
              tax,
              total,
              idempotencyKey,
            },
          ],
          { session },
        );
        created = order.toObject() as unknown as Record<string, unknown>;
      });

      if (replayed) {
        res.status(200).json({ order: serializeOrder(replayed), idempotentReplay: true });
        return;
      }
      res.status(201).json({ order: serializeOrder(created!) });
    } catch (error) {
      // A same-key request can only lose a race after another request committed its
      // order: either the unique index rejected this insert (duplicate key), or the
      // winner's committed decrement left insufficient stock. In both cases this
      // transaction was rolled back and the committed order must be replayed.
      if (idempotencyKey && (error instanceof OrderApiError || isDuplicateKeyError(error))) {
        const committed = await OrderModel.findOne({ userId, idempotencyKey }).lean();
        if (committed) {
          res
            .status(200)
            .json({
              order: serializeOrder(committed as unknown as Record<string, unknown>),
              idempotentReplay: true,
            });
          return;
        }
      }
      if (error instanceof OrderApiError) {
        res
          .status(error.status)
          .json({ error: { code: error.code, message: error.message, ...error.details } });
        return;
      }
      next(error);
    } finally {
      await session.endSession();
    }
  } catch (error) {
    next(error);
  }
});

export default ordersRouter;
