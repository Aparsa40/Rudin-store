import { Router } from 'express';
import type { SortOrder } from 'mongoose';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AuditLogModel } from '../models/audit-log.model.js';

const adminAuditLogsRouter = Router();
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

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

function parseDate(value: unknown, name: string): Date {
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) {
    throw new Error(`Query parameter "${name}" must be a valid date.`);
  }
  return new Date(value);
}

// Audit history stays with the primary MANAGER and is strictly read-only:
// audit records are written only through the audit helper next to the action
// they describe and are never editable or deletable through the API.
adminAuditLogsRouter.use(requireAuth, requireRole('MANAGER'));

/**
 * GET /api/admin/audit-logs
 *
 * Read-only, paginated audit history with optional exact-match action and
 * actorId filters plus a createdAt range filter.
 */
adminAuditLogsRouter.get('/', async (req, res, next) => {
  try {
    const page = parseNumber(req.query.page, 'page', { min: 1, integer: true }) ?? 1;
    const limit =
      parseNumber(req.query.limit, 'limit', {
        min: 1,
        max: MAX_PAGE_SIZE,
        integer: true,
      }) ?? DEFAULT_PAGE_SIZE;

    const filter: Record<string, unknown> = {};
    if (typeof req.query.action === 'string' && req.query.action.trim()) {
      filter.action = req.query.action.trim().slice(0, 100);
    }
    if (typeof req.query.actorId === 'string' && req.query.actorId.trim()) {
      filter.actorId = req.query.actorId.trim().slice(0, 100);
    }
    const createdAt: Record<string, Date> = {};
    if (req.query.from !== undefined) createdAt.$gte = parseDate(req.query.from, 'from');
    if (req.query.to !== undefined) createdAt.$lte = parseDate(req.query.to, 'to');
    if (Object.keys(createdAt).length > 0) filter.createdAt = createdAt;

    const [rows, total] = await Promise.all([
      AuditLogModel.find(filter)
        .sort({ createdAt: -1 as SortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(filter),
    ]);

    res.status(200).json({
      logs: rows.map((row) => ({
        id: row._id,
        actorId: row.actorId,
        actorRole: row.actorRole,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId ?? null,
        metadata: row.metadata ?? {},
        createdAt: row.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith('Query parameter') || error.message.includes('valid date'))
    ) {
      res.status(400).json({ error: { code: 'INVALID_QUERY', message: error.message } });
      return;
    }
    next(error);
  }
});

export default adminAuditLogsRouter;
