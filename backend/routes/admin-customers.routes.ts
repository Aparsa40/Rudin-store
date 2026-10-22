import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { UserModel } from '../models/user.model.js';
import { recordAudit, withAuditTransaction } from '../lib/audit.js';

const adminCustomersRouter = Router();
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const CUSTOMER_STATUSES = ['ACTIVE', 'DISABLED'] as const;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Customer management stays with the primary MANAGER: read-only listings plus
// enable/disable of CUSTOMER accounts only. The target role is always loaded
// and validated server-side, so this router can never mutate ADMIN, MANAGER,
// or VENDOR accounts regardless of the submitted identifiers.
adminCustomersRouter.use(requireAuth, requireRole('MANAGER'));

/**
 * GET /api/admin/customers
 *
 * Read-only, paginated customer directory with an optional escaped search on
 * email and name and an optional status filter.
 */
adminCustomersRouter.get('/', async (req, res, next) => {
  try {
    const page = parseNumber(req.query.page, 'page', { min: 1, integer: true }) ?? 1;
    const limit =
      parseNumber(req.query.limit, 'limit', {
        min: 1,
        max: MAX_PAGE_SIZE,
        integer: true,
      }) ?? DEFAULT_PAGE_SIZE;

    const filter: Record<string, unknown> = { role: 'CUSTOMER' };

    if (req.query.status !== undefined) {
      if (!CUSTOMER_STATUSES.includes(req.query.status as (typeof CUSTOMER_STATUSES)[number])) {
        res
          .status(400)
          .json({
            error: {
              code: 'INVALID_QUERY',
              message: `status must be one of: ${CUSTOMER_STATUSES.join(', ')}.`,
            },
          });
        return;
      }
      filter.status = req.query.status;
    }

    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      const escaped = req.query.search
        .trim()
        .slice(0, 120)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { email: { $regex: escaped, $options: 'i' } },
        { firstName: { $regex: escaped, $options: 'i' } },
        { lastName: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [rows, total] = await Promise.all([
      UserModel.find(filter)
        .select('_id email firstName lastName status createdAt lastLoginAt vendorApplicationStatus')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    res.status(200).json({
      customers: rows.map((customer) => ({
        id: customer._id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        status: customer.status,
        createdAt: customer.createdAt,
        lastLoginAt: customer.lastLoginAt ?? null,
        vendorApplicationStatus: customer.vendorApplicationStatus,
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

/**
 * PATCH /api/admin/customers/:id/status
 *
 * Enables or disables a CUSTOMER account. The target is loaded inside the
 * transaction and its role is validated server-side: ADMIN, MANAGER, and
 * VENDOR accounts can never be changed through this route. Disabling and
 * re-enabling both bump authVersion so every previously issued session token
 * stops working immediately. The audit record is coupled to the same
 * transaction, so a failed audit write rolls the change back.
 */
adminCustomersRouter.patch('/:id/status', async (req, res, next) => {
  try {
    const body: unknown = req.body;

    if (!isRecord(body)) {
      res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Request body must be a JSON object.',
        },
      });
      return;
    }

    const status = body.status;

    if (status !== 'ACTIVE' && status !== 'DISABLED') {
      res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'status must be ACTIVE or DISABLED.',
        },
      });
      return;
    }

    const result = await withAuditTransaction(async (session) => {
      const target = await UserModel.findOne({ _id: req.params.id })
        .select('_id email firstName lastName role status')
        .session(session);

      if (!target) {
        return { kind: 'not-found' } as const;
      }

      // Role is determined from the database, never from client-submitted
      // fields: only CUSTOMER accounts are reachable through this route.
      if (target.role !== 'CUSTOMER') {
        return { kind: 'not-a-customer', role: target.role } as const;
      }

      if (target.status === status) {
        return { kind: 'conflict', status: target.status } as const;
      }

      // Conditional update keeps the change race-free inside the transaction.
      const updated = await UserModel.findOneAndUpdate(
        { _id: req.params.id, role: 'CUSTOMER', status: { $ne: status } },
        {
          $set: { status },
          // Revoke all previously issued sessions even if re-enabled later.
          $inc: { authVersion: 1 },
        },
        { returnDocument: 'after', runValidators: true, session },
      ).select('_id email firstName lastName status');

      if (!updated) {
        return { kind: 'conflict', status: target.status } as const;
      }

      await recordAudit(
        {
          actorId: req.authUser!.id,
          actorRole: req.authUser!.role,
          action: 'admin.customer.status_changed',
          targetType: 'user',
          targetId: String(updated._id),
          metadata: {
            email: updated.email,
            from: target.status,
            to: status,
            authVersionBumped: true,
          },
        },
        session,
      );

      return { kind: 'updated', customer: updated } as const;
    });

    if (result.kind === 'not-found') {
      res.status(404).json({
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found.',
        },
      });
      return;
    }

    if (result.kind === 'not-a-customer') {
      res.status(403).json({
        error: {
          code: 'NOT_A_CUSTOMER',
          message: 'Only CUSTOMER accounts can be managed through this route.',
        },
      });
      return;
    }

    if (result.kind === 'conflict') {
      res.status(409).json({
        error: {
          code: 'STATUS_CONFLICT',
          message: `The account is already ${result.status}.`,
        },
      });
      return;
    }

    res.status(200).json({
      customer: {
        id: result.customer._id,
        email: result.customer.email,
        firstName: result.customer.firstName,
        lastName: result.customer.lastName,
        status: result.customer.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default adminCustomersRouter;
