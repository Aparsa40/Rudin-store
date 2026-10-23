import { Router } from 'express';
import type { SortOrder } from 'mongoose';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { ProductModel } from '../models/product.model.js';

const adminProductsRouter = Router();
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const PRODUCT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

function parseNumber(
  value: unknown,
  name: string,
  options: { min?: number; max?: number; integer?: boolean } = {},
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') {
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

// Read-only cross-vendor catalog oversight for the Manager console, gated by
// products:manage (the manager always passes; an admin passes only when
// granted). No route here mutates products: publish, archive, edit, and
// delete remain on the existing product endpoints, so this listing never
// duplicates their business logic.
adminProductsRouter.use(requireAuth, requirePermission('products:manage'));

/**
 * GET /api/admin/products
 *
 * Read-only, paginated product listing with optional status, vendorId, and
 * escaped search filters. Returns summary fields only.
 */
adminProductsRouter.get('/', async (req, res, next) => {
  try {
    const page = parseNumber(req.query.page, 'page', { min: 1, integer: true }) ?? 1;
    const limit =
      parseNumber(req.query.limit, 'limit', {
        min: 1,
        max: MAX_PAGE_SIZE,
        integer: true,
      }) ?? DEFAULT_PAGE_SIZE;

    const filter: Record<string, unknown> = {};

    if (req.query.status !== undefined) {
      if (!PRODUCT_STATUSES.includes(req.query.status as (typeof PRODUCT_STATUSES)[number])) {
        res
          .status(400)
          .json({
            error: {
              code: 'INVALID_QUERY',
              message: `status must be one of: ${PRODUCT_STATUSES.join(', ')}.`,
            },
          });
        return;
      }
      filter.status = req.query.status;
    }

    if (typeof req.query.vendorId === 'string' && req.query.vendorId.trim()) {
      filter.vendorId = req.query.vendorId.trim();
    }

    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      const escaped = req.query.search
        .trim()
        .slice(0, 120)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { brandName: { $regex: escaped, $options: 'i' } },
        { slug: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [rows, total] = await Promise.all([
      ProductModel.find(filter)
        .select('_id vendorId categoryId slug title brandName price status stock createdAt updatedAt')
        .sort({ createdAt: -1 as SortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments(filter),
    ]);

    res.status(200).json({
      products: rows.map((row) => ({
        id: row._id,
        vendorId: row.vendorId,
        categoryId: row.categoryId,
        slug: row.slug,
        title: row.title,
        brandName: row.brandName ?? null,
        price: row.price,
        status: row.status,
        stock: row.stock,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Query parameter')) {
      res.status(400).json({ error: { code: 'INVALID_QUERY', message: error.message } });
      return;
    }
    next(error);
  }
});

export default adminProductsRouter;
