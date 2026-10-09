import { Router } from "express";
import type { FilterQuery, SortOrder } from "mongoose";
import { ProductModel } from "../models/product.model.js";

const productsRouter = Router();
const MAX_PAGE_SIZE = 100;

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

function parseBoolean(value: unknown, name: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`Query parameter "${name}" must be true or false.`);
}

function serializeProduct(product: Record<string, unknown>) {
  const { _id, ...fields } = product;
  return { ...fields, id: _id };
}

productsRouter.get("/", async (req, res, next) => {
  try {
    const page = parseNumber(req.query.page, "page", { min: 1, integer: true }) ?? 1;
    const limit = parseNumber(req.query.limit, "limit", { min: 1, max: MAX_PAGE_SIZE, integer: true }) ?? 12;
    const minPrice = parseNumber(req.query.minPrice, "minPrice", { min: 0 });
    const maxPrice = parseNumber(req.query.maxPrice, "maxPrice", { min: 0 });
    const minRating = parseNumber(req.query.minRating, "minRating", { min: 0, max: 5 });
    const inStockOnly = parseBoolean(req.query.inStockOnly, "inStockOnly");
    const onSaleOnly = parseBoolean(req.query.onSaleOnly, "onSaleOnly");

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      res.status(400).json({ error: { code: "INVALID_PRICE_RANGE", message: "minPrice cannot exceed maxPrice." } });
      return;
    }

    const filter: FilterQuery<unknown> = { status: "PUBLISHED" };
    if (typeof req.query.categoryId === "string" && req.query.categoryId.trim()) filter.categoryId = req.query.categoryId.trim();
    if (typeof req.query.vendorId === "string" && req.query.vendorId.trim()) filter.vendorId = req.query.vendorId.trim();
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }
    if (minRating !== undefined) filter.rating = { $gte: minRating };
    if (inStockOnly) filter.stock = { $gt: 0 };
    if (onSaleOnly) filter.compareAtPrice = { $gt: 0 };

    if (typeof req.query.q === "string" && req.query.q.trim()) {
      const escapedQuery = req.query.q.trim().slice(0, 120).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: escapedQuery, $options: "i" } },
        { description: { $regex: escapedQuery, $options: "i" } },
        { shortDescription: { $regex: escapedQuery, $options: "i" } },
        { brandName: { $regex: escapedQuery, $options: "i" } },
        { tags: { $regex: escapedQuery, $options: "i" } },
      ];
    }

    const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "featured";
    const sort: Record<string, SortOrder> = {};
    switch (sortBy) {
      case "price-asc": sort.price = 1; break;
      case "price-desc": sort.price = -1; break;
      case "rating": sort.rating = -1; sort.reviewCount = -1; break;
      case "newest": sort.createdAt = -1; break;
      case "featured": sort.isFeatured = -1; sort.createdAt = -1; break;
      default:
        res.status(400).json({ error: { code: "INVALID_SORT", message: "Unsupported sortBy value." } });
        return;
    }

    const [rows, total] = await Promise.all([
      ProductModel.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      ProductModel.countDocuments(filter),
    ]);

    res.status(200).json({
      products: rows.map((row) => serializeProduct(row as unknown as Record<string, unknown>)),
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

productsRouter.get("/:identifier", async (req, res, next) => {
  try {
    const identifier = req.params.identifier;
    const product = await ProductModel.findOne({
      status: "PUBLISHED",
      $or: [{ _id: identifier }, { slug: identifier }],
    }).lean();

    if (!product) {
      res.status(404).json({ error: { code: "PRODUCT_NOT_FOUND", message: "Product not found." } });
      return;
    }

    res.status(200).json({ product: serializeProduct(product as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
});

export default productsRouter;
