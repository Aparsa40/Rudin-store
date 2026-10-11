import { Router } from "express";
import { randomBytes } from "node:crypto";
import { requireAuth } from "../middleware/auth.js";
import { ProductModel } from "../models/product.model.js";
import { OrderModel } from "../models/order.model.js";

const ordersRouter = Router();

const MAX_ITEMS = 50;
const PAYMENT_METHODS = ["CASH_ON_DELIVERY", "CREDIT_CARD", "PAYPAL", "APPLE_PAY"] as const;

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

function serializeOrder(order: Record<string, unknown>) {
  const { _id, __v, ...fields } = order;
  return { ...fields, id: _id };
}

function parseAddress(value: unknown): { address: Record<string, string>; error?: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { address: {}, error: "shippingAddress must be an object." };
  }
  const source = value as Record<string, unknown>;
  const stringField = (key: string, max: number): string | undefined => {
    const raw = source[key];
    if (typeof raw !== "string" || !raw.trim() || raw.trim().length > max) return undefined;
    return raw.trim();
  };
  const address: Record<string, string> = {};
  const required: Array<[string, number]> = [
    ["fullName", 120], ["phone", 32], ["street1", 200],
    ["city", 100], ["state", 100], ["postalCode", 20], ["country", 100],
  ];
  for (const [key, max] of required) {
    const parsed = stringField(key, max);
    if (!parsed) return { address: {}, error: `shippingAddress.${key} is required (1-${max} characters).` };
    address[key] = parsed;
  }
  const street2 = stringField("street2", 200);
  if (street2) address.street2 = street2;
  return { address };
}

function parseItems(value: unknown): { items: IncomingItem[]; error?: string } {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ITEMS) {
    return { items: [], error: `items must be a non-empty array of at most ${MAX_ITEMS} entries.` };
  }
  const items: IncomingItem[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return { items: [], error: "Each item must be an object with productId and quantity." };
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.productId !== "string" || !record.productId.trim()) {
      return { items: [], error: "Each item requires a productId." };
    }
    if (record.variantId !== undefined && typeof record.variantId !== "string") {
      return { items: [], error: "variantId must be a string when provided." };
    }
    const quantity = record.quantity;
    if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 99) {
      return { items: [], error: "Each item requires an integer quantity between 1 and 99." };
    }
    items.push({
      productId: record.productId.trim(),
      variantId: typeof record.variantId === "string" ? record.variantId.trim() : undefined,
      quantity: quantity as number,
    });
  }
  return { items };
}

/**
 * Atomic stock decrement. The filter guarantees the decrement only happens when
 * enough stock exists, so concurrent orders can never oversell a product.
 */
async function decrementProductStock(productId: string, quantity: number): Promise<boolean> {
  const updated = await ProductModel.findOneAndUpdate(
    { _id: productId, status: "PUBLISHED", stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { new: true },
  ).select("_id");
  return Boolean(updated);
}

async function decrementVariantStock(productId: string, variantId: string, quantity: number): Promise<boolean> {
  const updated = await ProductModel.findOneAndUpdate(
    { _id: productId, status: "PUBLISHED", "variants.id": variantId, "variants.stockQuantity": { $gte: quantity } },
    { $inc: { "variants.$.stockQuantity": -quantity } },
    { new: true },
  ).select("_id");
  return Boolean(updated);
}

async function restoreProductStock(productId: string, quantity: number): Promise<void> {
  await ProductModel.updateOne({ _id: productId }, { $inc: { stock: quantity } });
}

async function restoreVariantStock(productId: string, variantId: string, quantity: number): Promise<void> {
  await ProductModel.updateOne({ _id: productId, "variants.id": variantId }, { $inc: { "variants.$.stockQuantity": quantity } });
}

ordersRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const orders = await OrderModel.find({ userId: req.authUser!.id }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ orders: orders.map((order) => serializeOrder(order as unknown as Record<string, unknown>)) });
  } catch (error) {
    next(error);
  }
});

ordersRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    // Ownership is enforced by the userId filter; other users' orders are indistinguishable from missing ones.
    const order = await OrderModel.findOne({ _id: req.params.id, userId: req.authUser!.id }).lean();
    if (!order) {
      res.status(404).json({ error: { code: "ORDER_NOT_FOUND", message: "Order not found." } });
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
ordersRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      res.status(400).json({ error: { code: "INVALID_ORDER", message: "Request body must be a JSON object." } });
      return;
    }

    const { items, error: itemsError } = parseItems(body.items);
    if (itemsError) {
      res.status(400).json({ error: { code: "INVALID_ORDER", message: itemsError } });
      return;
    }

    const { address, error: addressError } = parseAddress(body.shippingAddress);
    if (addressError) {
      res.status(400).json({ error: { code: "INVALID_ORDER", message: addressError } });
      return;
    }

    if (!PAYMENT_METHODS.includes(body.paymentMethod)) {
      res.status(400).json({ error: { code: "INVALID_ORDER", message: `paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}.` } });
      return;
    }

    // Idempotency: replaying a key returns the original order without re-decrementing stock.
    const idempotencyKeyRaw = req.header("idempotency-key");
    let idempotencyKey: string | undefined;
    if (idempotencyKeyRaw !== undefined) {
      if (typeof idempotencyKeyRaw !== "string" || idempotencyKeyRaw.trim().length < 8 || idempotencyKeyRaw.trim().length > 128) {
        res.status(400).json({ error: { code: "INVALID_IDEMPOTENCY_KEY", message: "Idempotency-Key must be 8-128 characters." } });
        return;
      }
      idempotencyKey = idempotencyKeyRaw.trim();
      const existing = await OrderModel.findOne({ userId: req.authUser!.id, idempotencyKey }).lean();
      if (existing) {
        res.status(200).json({ order: serializeOrder(existing as unknown as Record<string, unknown>), idempotentReplay: true });
        return;
      }
    }

    // Resolve every item against published products. Prices come only from the database.
    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await ProductModel.find({ _id: { $in: productIds }, status: "PUBLISHED" }).lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    const resolved: ResolvedItem[] = [];
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        res.status(400).json({ error: { code: "PRODUCT_NOT_FOUND", message: `Product ${item.productId} is not available.` } });
        return;
      }
      if (item.variantId) {
        const variant = (product.variants ?? []).find((candidate) => candidate.id === item.variantId);
        if (!variant) {
          res.status(400).json({ error: { code: "VARIANT_NOT_FOUND", message: `Variant ${item.variantId} is not available.` } });
          return;
        }
        resolved.push({
          productId: item.productId, variantId: item.variantId, title: `${product.title} (${variant.name})`,
          unitPrice: variant.price, quantity: item.quantity, subtotal: variant.price * item.quantity,
          vendorId: product.vendorId,
        });
      } else {
        if ((product.variants ?? []).length > 0) {
          res.status(400).json({ error: { code: "VARIANT_REQUIRED", message: `Product ${item.productId} requires a variantId.` } });
          return;
        }
        resolved.push({
          productId: item.productId, title: String(product.title),
          unitPrice: product.price, quantity: item.quantity, subtotal: product.price * item.quantity,
          vendorId: product.vendorId,
        });
      }
    }

    // Merge duplicate lines for the same product/variant so each stock bucket is decremented once.
    const merged = new Map<string, ResolvedItem>();
    for (const item of resolved) {
      const key = `${item.productId}:${item.variantId ?? ""}`;
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.subtotal += item.subtotal;
      } else {
        merged.set(key, { ...item });
      }
    }
    const lines = [...merged.values()];

    // Server-side totals. Shipping and tax are zero until a product decision defines
    // shipping methods and tax rules; client-supplied values are never accepted.
    const subtotal = Math.round(lines.reduce((sum, line) => sum + line.subtotal, 0) * 100) / 100;
    const shippingCost = 0;
    const tax = 0;
    const total = Math.round((subtotal + shippingCost + tax) * 100) / 100;

    // Decrement stock atomically, line by line. On failure, compensate the already
    // applied decrements so a failed order never consumes inventory.
    const applied: Array<{ productId: string; variantId?: string; quantity: number }> = [];
    for (const line of lines) {
      const ok = line.variantId
        ? await decrementVariantStock(line.productId, line.variantId, line.quantity)
        : await decrementProductStock(line.productId, line.quantity);
      if (!ok) {
        for (const done of applied) {
          if (done.variantId) await restoreVariantStock(done.productId, done.variantId, done.quantity);
          else await restoreProductStock(done.productId, done.quantity);
        }
        res.status(409).json({
          error: { code: "OUT_OF_STOCK", message: `Insufficient stock for product ${line.productId}.`, productId: line.productId },
        });
        return;
      }
      applied.push({ productId: line.productId, variantId: line.variantId, quantity: line.quantity });
    }

    const orderId = `ord_${randomBytes(12).toString("hex")}`;
    const orderNumber = `RD-${Date.now().toString(36).toUpperCase()}`;
    const created = await OrderModel.create({
      _id: orderId,
      userId: req.authUser!.id,
      orderNumber,
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentMethod: body.paymentMethod,
      items: lines.map((line) => ({
        productId: line.productId, variantId: line.variantId, title: line.title,
        unitPrice: line.unitPrice, quantity: line.quantity, subtotal: line.subtotal, vendorId: line.vendorId,
      })),
      shippingAddress: address,
      subtotal, shippingCost, tax, total,
      idempotencyKey,
    });

    res.status(201).json({ order: serializeOrder(created.toObject() as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
});

export default ordersRouter;
