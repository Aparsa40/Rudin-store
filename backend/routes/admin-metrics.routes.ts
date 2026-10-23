import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { UserModel } from '../models/user.model.js';
import { ProductModel } from '../models/product.model.js';
import { OrderModel } from '../models/order.model.js';
import { CouponModel } from '../models/coupon.model.js';

const adminMetricsRouter = Router();

// Dashboard metrics stay with the primary MANAGER. Every figure is computed
// server-side from live collections; no client-supplied value is trusted.
adminMetricsRouter.use(requireAuth, requireRole('MANAGER'));

/**
 * GET /api/admin/metrics
 *
 * Read-only snapshot of platform counts for the Manager dashboard: customers,
 * vendors, pending vendor applications, products by status, orders by status,
 * non-cancelled order revenue, and currently active coupons.
 */
adminMetricsRouter.get('/', async (_req, res, next) => {
  try {
    const now = new Date();

    const [
      customersActive,
      customersDisabled,
      vendorsTotal,
      vendorApplicationsPending,
      productsByStatus,
      ordersByStatus,
      revenueAggregation,
      couponsActive,
    ] = await Promise.all([
      UserModel.countDocuments({ role: 'CUSTOMER', status: 'ACTIVE' }),
      UserModel.countDocuments({ role: 'CUSTOMER', status: 'DISABLED' }),
      UserModel.countDocuments({ role: 'VENDOR' }),
      UserModel.countDocuments({ vendorApplicationStatus: 'PENDING' }),
      ProductModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      OrderModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      OrderModel.aggregate([
        { $match: { status: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' } } },
      ]),
      CouponModel.countDocuments({ isActive: true, validUntil: { $gte: now } }),
    ]);

    const products = { draft: 0, published: 0, archived: 0 };
    for (const entry of productsByStatus) {
      if (entry._id === 'DRAFT') products.draft = entry.count;
      if (entry._id === 'PUBLISHED') products.published = entry.count;
      if (entry._id === 'ARCHIVED') products.archived = entry.count;
    }

    const ordersByStatusMap: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    for (const entry of ordersByStatus) {
      if (typeof entry._id === 'string') ordersByStatusMap[entry._id] = entry.count;
    }

    const revenueRow = revenueAggregation[0] ?? { count: 0, revenue: 0 };

    res.status(200).json({
      metrics: {
        generatedAt: now.toISOString(),
        customers: { active: customersActive, disabled: customersDisabled },
        vendors: { total: vendorsTotal, applicationsPending: vendorApplicationsPending },
        products,
        orders: {
          byStatus: ordersByStatusMap,
          nonCancelled: revenueRow.count,
          // Sum of server-computed order totals; no payment gateway exists yet,
          // so this is gross booked revenue, not settled payments.
          revenue: revenueRow.revenue,
        },
        coupons: { active: couponsActive },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default adminMetricsRouter;
