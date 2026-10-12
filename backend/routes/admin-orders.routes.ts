import { Router } from "express";
import type { SortOrder } from "mongoose";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { OrderModel } from "../models/order.model.js";
import { serializeOrder } from "./orders.routes.js";

const adminOrdersRouter = Router();
const MAX_PAGE_SIZE = 100;
const MAX_PAGE_SIZE_DEFAULT = 20;
const ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;

function parseNumber(
  value: unknown,
  name: string,
  options: { min?: number; max?: number; integer?: boolean } = {},
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Query parameter "${name}" must be a number.`);
  }
  const parsed = Number(value);
  if (
    !Number.isFinite(parsed) ||
    (options.integer && !Number.isInteger(parsed)) ||
    (options.min !== undefined && parsed < options.min) ||
    (options.max !== undefined && parsed > options.max)
  ) {
    throw new Error(`Query parameter "${name}" is out of range.`);
  }
  return parsed;
}

function parseDate(value: unknown, name: string): Date {
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
    throw new Error(`Query parameter "${name}" must be a valid date.`);
  }
  return new Date(value);
}

/**
 * Listing responses omit the customer's full shipping address and the idempotency
 * key; the detail endpoint exposes the address for order operations. This keeps the
 * bulk-listing surface minimal while remaining useful.
 */
function serializeOrderSummary(order: Record<string, unknown>) {
  const { shippingAddress, idempotencyKey, ...summary } = serializeOrder(order) as Record<string, unknown>;
  return summary;
}

// Read-only order visibility for operations, gated by orders:manage (the manager
// always passes; an admin passes only when granted). No route here mutates orders:
// payment and fulfillment transitions remain future scope by design.
adminOrdersRouter.use(requireAuth, requirePermission("orders:manage"));

adminOrdersRouter.get("/", async (req, res, next) => {
  try {
    const page = parseNumber(req.query.page, "page", { min: 1, integer: true }) ?? 1;
    const limit = parseNumber(req.query.limit, "limit", { min: 1, max: MAX_PAGE_SIZE, integer: true }) ?? MAX_PAGE_SIZE_DEFAULT;

    const filter: Record<string, unknown> = {};
    if (req.query.status !== undefined) {
      if (!ORDER_STATUSES.includes(req.query.status as (typeof ORDER_STATUSES)[number])) {
        res.status(400).json({ error: { code: "INVALID_QUERY", message: `status must be one of: ${ORDER_STATUSES.join(", ")}.` } });
        return;
      }
      filter.status = req.query.status;
    }
    if (req.query.paymentStatus !== undefined) {
      if (!PAYMENT_STATUSES.includes(req.query.paymentStatus as (typeof PAYMENT_STATUSES)[number])) {
        res.status(400).json({ error: { code: "INVALID_QUERY", message: `paymentStatus must be one of: ${PAYMENT_STATUSES.join(", ")}.` } });
        return;
      }
      filter.paymentStatus = req.query.paymentStatus;
    }
    if (typeof req.query.userId === "string" && req.query.userId.trim()) {
      filter.userId = req.query.userId.trim();
    }
    const createdAt: Record<string, Date> = {};
    if (req.query.from !== undefined) createdAt.$gte = parseDate(req.query.from, "from");
    if (req.query.to !== undefined) createdAt.$lte = parseDate(req.query.to, "to");
    if (Object.keys(createdAt).length > 0) filter.createdAt = createdAt;
    if (typeof req.query.orderNumber === "string" && req.query.orderNumber.trim()) {
      const escaped = req.query.orderNumber.trim().slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.orderNumber = { $regex: escaped, $options: "i" };
    }

    const [rows, total] = await Promise.all([
      OrderModel.find(filter).sort({ createdAt: -1 as SortOrder }).skip((page - 1) * limit).limit(limit).lean(),
      OrderModel.countDocuments(filter),
    ]);

    res.status(200).json({
      orders: rows.map((order) => serializeOrderSummary(order as unknown as Record<string, unknown>)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Query parameter")) {
      res.status(400).json({ error: { code: "INVALID_QUERY", message: error.message } });
      return;
    }
    next(error);
  }
});

adminOrdersRouter.get("/:id", async (req, res, next) => {
  try {
    const order = await OrderModel.findById(req.params.id).lean();
    if (!order) {
      res.status(404).json({ error: { code: "ORDER_NOT_FOUND", message: "Order not found." } });
      return;
    }
    res.status(200).json({ order: serializeOrder(order as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
});

export default adminOrdersRouter;
