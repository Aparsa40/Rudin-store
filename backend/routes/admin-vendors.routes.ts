import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { UserModel } from '../models/user.model.js';
import { recordAudit, withAuditTransaction } from '../lib/audit.js';

const adminVendorsRouter = Router();
// Vendor application review requires the vendors:review permission. The
// primary MANAGER passes every permission check; an ADMIN passes only when
// the manager granted that permission.
adminVendorsRouter.use(requireAuth, requirePermission('vendors:review'));

adminVendorsRouter.get('/applications', async (req, res, next) => {
  try {
    const requestedStatus =
      typeof req.query.status === 'string' ? req.query.status.toUpperCase() : 'PENDING';
    if (!['PENDING', 'APPROVED', 'REJECTED', 'ALL'].includes(requestedStatus)) {
      res
        .status(400)
        .json({
          error: {
            code: 'INVALID_STATUS',
            message: 'status must be PENDING, APPROVED, REJECTED, or ALL.',
          },
        });
      return;
    }
    const filter = requestedStatus === 'ALL' ? {} : { vendorApplicationStatus: requestedStatus };
    const applications = (await UserModel.find(filter as any)
      .select(
        '_id email firstName lastName storeName storeDescription vendorApplicationStatus role status createdAt',
      )
      .sort({ createdAt: -1 })
      .lean()) as unknown as Array<Record<string, any>>;
    res.status(200).json({
      applications: applications
        .filter((user) => user.vendorApplicationStatus !== 'NONE')
        .map((user) => ({
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          storeName: user.storeName ?? '',
          storeDescription: user.storeDescription ?? '',
          status: user.vendorApplicationStatus,
          role: user.role,
          accountStatus: user.status,
          createdAt: user.createdAt,
        })),
    });
  } catch (error) {
    next(error);
  }
});

// The decision promotes a CUSTOMER to VENDOR or demotes the applicant back to
// CUSTOMER, so it is a security-critical role change: the update and its
// audit record commit inside one transaction.
adminVendorsRouter.patch('/applications/:id', async (req, res, next) => {
  try {
    const decision = req.body?.decision;
    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      res
        .status(400)
        .json({
          error: { code: 'INVALID_DECISION', message: 'decision must be APPROVED or REJECTED.' },
        });
      return;
    }

    const application = await withAuditTransaction(async (session) => {
      const update =
        decision === 'APPROVED'
          ? { $set: { role: 'VENDOR', vendorApplicationStatus: 'APPROVED' } }
          : { $set: { role: 'CUSTOMER', vendorApplicationStatus: 'REJECTED' } };
      const updated = (await UserModel.findOneAndUpdate(
        {
          _id: req.params.id,
          role: 'CUSTOMER',
          status: 'ACTIVE',
          vendorApplicationStatus: 'PENDING',
        },
        update,
        { returnDocument: 'after', runValidators: true, session },
      ).select('_id email firstName lastName storeName vendorApplicationStatus role')) as any;

      if (!updated) return null;

      await recordAudit(
        {
          actorId: req.authUser!.id,
          actorRole: req.authUser!.role,
          action: 'admin.vendor_application.decision',
          targetType: 'user',
          targetId: String(updated._id),
          metadata: {
            decision,
            email: updated.email,
            storeName: updated.storeName ?? '',
            newRole: updated.role,
          },
        },
        session,
      );

      return updated;
    });

    if (!application) {
      res
        .status(404)
        .json({
          error: {
            code: 'APPLICATION_NOT_FOUND',
            message: 'A pending application for an active customer was not found.',
          },
        });
      return;
    }

    res.status(200).json({
      application: {
        id: application._id,
        email: application.email,
        firstName: application.firstName,
        lastName: application.lastName,
        storeName: application.storeName,
        status: application.vendorApplicationStatus,
        role: application.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default adminVendorsRouter;
