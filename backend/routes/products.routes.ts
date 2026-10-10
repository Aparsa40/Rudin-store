import { Router } from "express";
import { randomBytes } from "node:crypto";
import { requireAuth, requireRole } from "../middleware/auth.js";
import type { SortOrder } from "mongoose";
import { ProductModel } from "../models/product.model.js";
import { normalizeProductSlug, validateProductInput } from "../lib/product-validation.js";

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
    const onSaleOnly = parseBoolean(req.query.onSaleOnly, "onSaleOnly");\n    const featured = parseBoolean(req.query.featured, "featured");\n    const bestSeller = parseBoolean(req.query.bestSeller, "bestSeller");\n    const newArrival = parseBoolean(req.query.newArrival, "newArrival");\n    const flashDeal = parseBoolean(req.query.flashDeal, "flashDeal");

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      res.status(400).json({ error: { code: "INVALID_PRICE_RANGE", message: "minPrice cannot exceed maxPrice." } });
      return;
    }

    const filter: Record<string, any> = { status: "PUBLISHED" };
    if (typeof req.query.categoryId === "string" && req.query.categoryId.trim()) filter.categoryId = req.query.categoryId.trim();
    if (typeof req.query.vendorId === "string" && req.query.vendorId.trim()) filter.vendorId = req.query.vendorId.trim();\n    if (typeof req.query.brandId === "string" && req.query.brandId.trim()) filter.brandId = req.query.brandId.trim();\n    if (featured !== undefined) filter.isFeatured = featured;\n    if (bestSeller !== undefined) filter.isBestSeller = bestSeller;\n    if (newArrival !== undefined) filter.isNewArrival = newArrival;\n    if (flashDeal !== undefined) filter.isFlashDeal = flashDeal;
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }
    if (minRating !== undefined) filter.rating = { $gte: minRating };
    if (inStockOnly) filter.stock = { $gt: 0 };
    if (onSaleOnly) filter.$expr = { $gt: ["$compareAtPrice", "$price"] };

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

productsRouter.get("/mine", requireAuth, requireRole("ADMIN", "VENDOR"), async (req, res, next) => {
  try {
    const filter = req.authUser!.role === "ADMIN" ? {} : { vendorId: req.authUser!.id };
    const products = await ProductModel.find(filter).sort({ createdAt: -1 }).lean();
    res.status(200).json({
      products: products.map((product) => serializeProduct(product as unknown as Record<string, unknown>)),
    });
  } catch (error) {
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


// Admins can publish products; vendors can create drafts owned by their own user ID.
productsRouter.post("/", requireAuth, requireRole("ADMIN", "VENDOR"), async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      res.status(400).json({ error: { code: "INVALID_PRODUCT", message: "Request body must be a JSON object." } });
      return;
    }
    const validationError = validateProductInput(body as Record<string, unknown>);
    if (validationError) {
      res.status(400).json({ error: { code: "INVALID_PRODUCT", message: validationError } });
      return;
    }
    const slug = normalizeProductSlug(body.slug, body.title as string);
    if (!slug) {
      res.status(400).json({ error: { code: "INVALID_SLUG", message: "Provide an ASCII-compatible slug or a title that can be converted to one." } });
      return;
    }
    const vendorId = req.authUser!.role === "ADMIN" && typeof body.vendorId === "string" && body.vendorId.trim()
      ? body.vendorId.trim()
      : req.authUser!.id;
    const status = req.authUser!.role === "ADMIN" && body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    const product = await ProductModel.create({
      _id: `prd_${randomBytes(12).toString("hex")}`, vendorId,
      categoryId: body.categoryId.trim(), brandId: typeof body.brandId === "string" ? body.brandId.trim() : undefined,
      brandName: typeof body.brandName === "string" ? body.brandName.trim() : undefined,
      slug, title: body.title.trim(), description: body.description.trim(), shortDescription: body.shortDescription.trim(),
      price: body.price, compareAtPrice: body.compareAtPrice, stock: body.stock ?? 0,
      images: body.images ?? [], variants: [], tags: Array.isArray(body.tags) ? body.tags.filter((v: unknown) => typeof v === "string").slice(0, 30) : [],
      features: Array.isArray(body.features) ? body.features.filter((v: unknown) => typeof v === "string").slice(0, 50) : [],
      specifications: body.specifications && typeof body.specifications === "object" && !Array.isArray(body.specifications) ? body.specifications : {},
      isFeatured: req.authUser!.role === "ADMIN" && body.isFeatured === true,
      isBestSeller: false, isNewArrival: false, isFlashDeal: false, status,
    });
    res.status(201).json({ product: serializeProduct(product.toObject() as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
});


// Product updates and deletion are scoped to the authenticated owner; admins can manage any product.
productsRouter.patch("/:id", requireAuth, requireRole("ADMIN", "VENDOR"), async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      res.status(400).json({ error: { code: "INVALID_PRODUCT", message: "Request body must be a JSON object." } });
      return;
    }

    const product = await ProductModel.findById(req.params.id);
    if (!product) {
      res.status(404).json({ error: { code: "PRODUCT_NOT_FOUND", message: "Product not found." } });
      return;
    }
    if (req.authUser!.role !== "ADMIN" && product.vendorId !== req.authUser!.id) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "You can only manage products owned by your account." } });
      return;
    }

    const editableFields = [
      "categoryId", "brandId", "brandName", "slug", "title", "description",
      "shortDescription", "price", "compareAtPrice", "stock", "images",
      "tags", "features", "specifications",
    ] as const;
    const merged: Record<string, unknown> = {
      categoryId: product.categoryId,
      brandId: product.brandId,
      brandName: product.brandName,
      slug: product.slug,
      title: product.title,
      description: product.description,
      shortDescription: product.shortDescription,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      stock: product.stock,
      images: product.images,
      tags: product.tags,
      features: product.features,
      specifications: Object.fromEntries(product.specifications ?? new Map()),
    };
    for (const field of editableFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) merged[field] = body[field];
    }

    if (body.status !== undefined) {
      if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(body.status)) {
        res.status(400).json({ error: { code: "INVALID_STATUS", message: "status must be DRAFT, PUBLISHED, or ARCHIVED." } });
        return;
      }
      if (req.authUser!.role !== "ADMIN" && body.status !== "DRAFT") {
        res.status(403).json({ error: { code: "FORBIDDEN", message: "Only administrators can publish or archive products." } });
        return;
      }
    }

    const validationError = validateProductInput(merged);
    if (validationError) {
      res.status(400).json({ error: { code: "INVALID_PRODUCT", message: validationError } });
      return;
    }
    const slug = normalizeProductSlug(merged.slug, merged.title as string);
    if (!slug) {
      res.status(400).json({ error: { code: "INVALID_SLUG", message: "Provide an ASCII-compatible slug or a title that can be converted to one." } });
      return;
    }

    Object.assign(product, {
      categoryId: String(merged.categoryId).trim(),
      brandId: typeof merged.brandId === "string" ? merged.brandId.trim() : undefined,
      brandName: typeof merged.brandName === "string" ? merged.brandName.trim() : undefined,
      slug,
      title: String(merged.title).trim(),
      description: String(merged.description).trim(),
      shortDescription: String(merged.shortDescription).trim(),
      price: merged.price,
      compareAtPrice: merged.compareAtPrice,
      stock: merged.stock ?? 0,
      images: merged.images ?? [],
      tags: merged.tags ?? [],
      features: merged.features ?? [],
      specifications: merged.specifications ?? {},
      ...(body.status === "DRAFT" ? { status: "DRAFT" } : req.authUser!.role === "ADMIN" && body.status ? { status: body.status } : {}),
    });
    if (req.authUser!.role === "ADMIN" && typeof body.isFeatured === "boolean") {
      product.isFeatured = body.isFeatured;
    }
    await product.save();
    res.status(200).json({ product: serializeProduct(product.toObject() as unknown as Record<string, unknown>) });
  } catch (error) {
    next(error);
  }
});

productsRouter.delete("/:id", requireAuth, requireRole("ADMIN", "VENDOR"), async (req, res, next) => {
  try {
    const product = await ProductModel.findById(req.params.id);
    if (!product) {
      res.status(404).json({ error: { code: "PRODUCT_NOT_FOUND", message: "Product not found." } });
      return;
    }
    if (req.authUser!.role !== "ADMIN" && product.vendorId !== req.authUser!.id) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "You can only manage products owned by your account." } });
      return;
    }
    product.status = "ARCHIVED";
    await product.save();
    res.status(200).json({ success: true, productId: product._id, status: product.status });
  } catch (error) {
    next(error);
  }
});

export default productsRouter;
