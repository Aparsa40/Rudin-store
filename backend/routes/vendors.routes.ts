import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { UserModel } from '../models/user.model.js';
import { normalizeProductSlug } from '../lib/product-validation.js';

const vendorsRouter = Router();

interface PublicVendorRecord {
  _id: string;
  storeName: string;
  storeDescription?: string | null;
  createdAt?: Date;
}

/**
 * Public vendor serialization. Never expose email, phone, or any other private user field.
 * The slug is derived deterministically from the store name so catalog links stay stable.
 */
function publicVendor(user: PublicVendorRecord) {
  const slug = normalizeProductSlug(undefined, user.storeName) || `vendor-${user._id}`;
  return {
    id: user._id,
    userId: user._id,
    storeName: user.storeName,
    slug,
    description: user.storeDescription ?? '',
    createdAt: user.createdAt,
  };
}

// Public directory of active vendors. Supports an exact slug filter for storefront links.
vendorsRouter.get('/', async (req, res, next) => {
  try {
    const users = await UserModel.find({ role: 'VENDOR', status: 'ACTIVE' })
      .select('_id storeName storeDescription createdAt')
      .sort({ createdAt: -1 })
      .lean<PublicVendorRecord[]>();
    let vendors = users.map(publicVendor);
    const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
    if (slug) vendors = vendors.filter((vendor) => vendor.slug === slug);
    res.status(200).json({ vendors });
  } catch (error) {
    next(error);
  }
});

// Public profile of a single active vendor.
vendorsRouter.get('/:id', async (req, res, next) => {
  try {
    const user = await UserModel.findOne({ _id: req.params.id, role: 'VENDOR', status: 'ACTIVE' })
      .select('_id storeName storeDescription createdAt')
      .lean<PublicVendorRecord | null>();
    if (!user) {
      res.status(404).json({ error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found.' } });
      return;
    }
    res.status(200).json({ vendor: publicVendor(user) });
  } catch (error) {
    next(error);
  }
});

vendorsRouter.post('/apply', requireAuth, requireRole('CUSTOMER'), async (req, res, next) => {
  try {
    const { storeName, storeDescription } = req.body ?? {};
    if (
      typeof storeName !== 'string' ||
      storeName.trim().length < 2 ||
      storeName.trim().length > 120 ||
      (storeDescription !== undefined &&
        (typeof storeDescription !== 'string' || storeDescription.trim().length > 2000))
    ) {
      res.status(400).json({
        error: {
          code: 'INVALID_VENDOR_APPLICATION',
          message:
            'Provide a store name of 2–120 characters and a description of at most 2000 characters.',
        },
      });
      return;
    }

    const user = await UserModel.findOneAndUpdate(
      {
        _id: req.authUser!.id,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        vendorApplicationStatus: { $nin: ['PENDING', 'APPROVED'] },
      },
      {
        $set: {
          storeName: storeName.trim(),
          storeDescription: typeof storeDescription === 'string' ? storeDescription.trim() : '',
          vendorApplicationStatus: 'PENDING',
        },
      },
      { returnDocument: 'after', runValidators: true },
    ).select('_id email firstName lastName storeName storeDescription vendorApplicationStatus');

    if (!user) {
      res.status(409).json({
        error: {
          code: 'VENDOR_APPLICATION_EXISTS',
          message: 'Your account is not eligible for a new vendor application.',
        },
      });
      return;
    }

    res.status(201).json({
      application: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        storeName: user.storeName,
        storeDescription: user.storeDescription,
        status: user.vendorApplicationStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default vendorsRouter;
