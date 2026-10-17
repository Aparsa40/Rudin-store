import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/user.model.js';
import { createAccessToken, requireAuth, type AppRole } from '../middleware/auth.js';
import { withAdminStateLock } from '../lib/admin-state.js';
import { ADMIN_PERMISSIONS, type AdminPermission } from '../lib/admin-permissions.js';

const scrypt = promisify(scryptCallback);
const authRouter = Router();

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, hash] = stored.split(':');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function publicUser(user: {
  _id: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string | null;
  role: string;
  createdAt?: Date;
  adminPermissions?: unknown;
}) {
  // Effective granular permissions, mirroring the `requirePermission` middleware:
  // the MANAGER passes every permission check, an ADMIN holds only the permissions
  // its manager granted (sanitized against the known permission catalog), and
  // every other role carries no administrative permissions. The field is omitted
  // from non-administrative responses so clients fail closed on missing data.
  let adminPermissions: AdminPermission[] | undefined;
  if (user.role === 'MANAGER') {
    adminPermissions = [...ADMIN_PERMISSIONS];
  } else if (user.role === 'ADMIN') {
    adminPermissions = Array.isArray(user.adminPermissions)
      ? user.adminPermissions.filter(
          (entry): entry is AdminPermission =>
            typeof entry === 'string' &&
            (ADMIN_PERMISSIONS as readonly string[]).includes(entry),
        )
      : [];
  }
  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName ?? '',
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
    adminPermissions,
  };
}

// One-time bootstrap creates the single primary MANAGER account and is available
// only while no manager exists. Configure a long random MANAGER_BOOTSTRAP_SECRET
// locally and remove it after bootstrap.
authRouter.post('/bootstrap-manager', async (req, res, next) => {
  try {
    const configuredSecret = process.env.MANAGER_BOOTSTRAP_SECRET;
    if (!configuredSecret || configuredSecret.length < 32) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
      return;
    }
    const suppliedSecret = req.header('x-manager-bootstrap-secret') ?? '';
    const expected = Buffer.from(configuredSecret);
    const supplied = Buffer.from(suppliedSecret);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
      return;
    }
    const { email, password, firstName, lastName } = req.body ?? {};
    if (
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== 'string' ||
      password.length < 12 ||
      password.length > 128 ||
      typeof firstName !== 'string' ||
      !firstName.trim() ||
      firstName.trim().length > 80 ||
      (lastName !== undefined && (typeof lastName !== 'string' || lastName.length > 80))
    ) {
      res
        .status(400)
        .json({
          error: {
            code: 'INVALID_MANAGER',
            message: 'Provide a valid email, a password of 12â128 characters, and a first name.',
          },
        });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await hashPassword(password);
    // Both the "manager already exists" and "email already in use" checks run inside the
    // serialized admin-state transaction so concurrent bootstraps cannot slip through.
    const outcome = await withAdminStateLock(async (session) => {
      if (await UserModel.exists({ role: 'MANAGER' }).session(session)) {
        return { kind: 'closed' } as const;
      }
      if (await UserModel.exists({ email: normalizedEmail }).session(session)) {
        return { kind: 'email-in-use' } as const;
      }
      const [createdUser] = await UserModel.create(
        [
          {
            _id: `usr_${randomBytes(12).toString('hex')}`,
            email: normalizedEmail,
            passwordHash,
            firstName: firstName.trim(),
            lastName: typeof lastName === 'string' ? lastName.trim() : '',
            role: 'MANAGER',
            status: 'ACTIVE',
          },
        ],
        { session },
      );
      return { kind: 'created', user: createdUser } as const;
    });
    if (outcome.kind === 'closed') {
      res
        .status(409)
        .json({ error: { code: 'BOOTSTRAP_CLOSED', message: 'A manager already exists.' } });
      return;
    }
    if (outcome.kind === 'email-in-use') {
      res
        .status(409)
        .json({
          error: { code: 'EMAIL_IN_USE', message: 'An account with this email already exists.' },
        });
      return;
    }
    res.status(201).json({
      user: publicUser(outcome.user),
      accessToken: createAccessToken({
        id: outcome.user._id,
        email: outcome.user.email,
        role: 'MANAGER',
      }),
      note: 'Remove MANAGER_BOOTSTRAP_SECRET from the environment after the primary manager is created.',
    });
  } catch (error) {
    // Safety net: a concurrent registration could still win the unique-email race and
    // surface MongoDB error 11000; map it to the same precise response instead of the
    // generic DUPLICATE_RESOURCE error.
    if ((error as { code?: number } | null)?.code === 11000) {
      res
        .status(409)
        .json({
          error: { code: 'EMAIL_IN_USE', message: 'An account with this email already exists.' },
        });
      return;
    }
    next(error);
  }
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body ?? {};
    if (
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== 'string' ||
      password.length < 12 ||
      password.length > 128 ||
      typeof firstName !== 'string' ||
      firstName.trim().length < 1 ||
      firstName.trim().length > 80 ||
      (lastName !== undefined && (typeof lastName !== 'string' || lastName.length > 80)) ||
      (phone !== undefined && (typeof phone !== 'string' || phone.length > 32))
    ) {
      res
        .status(400)
        .json({
          error: {
            code: 'INVALID_REGISTRATION',
            message:
              'Provide a valid email, a password of 12â128 characters, and a first name (maximum 80 characters).',
          },
        });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (await UserModel.exists({ email: normalizedEmail })) {
      res
        .status(409)
        .json({
          error: { code: 'EMAIL_IN_USE', message: 'An account with this email already exists.' },
        });
      return;
    }
    const user = await UserModel.create({
      _id: `usr_${randomBytes(12).toString('hex')}`,
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      firstName: firstName.trim(),
      lastName: typeof lastName === 'string' ? lastName.trim() : '',
      phone: typeof phone === 'string' ? phone.trim() : undefined,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });
    res.status(201).json({
      user: publicUser(user),
      accessToken: createAccessToken({ id: user._id, email: user.email, role: 'CUSTOMER' }),
    });
  } catch (error) {
    next(error);
  }
});

// Role-specific portal logins share one credential-verification path. A portal
// rejects otherwise valid credentials whenever the account role does not match,
// with the same generic INVALID_CREDENTIALS response used for unknown accounts,
// so portal visitors cannot enumerate privileged accounts.
async function handlePortalLogin(
  expectedRole: AppRole,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128) {
      res
        .status(400)
        .json({
          error: { code: 'INVALID_CREDENTIALS', message: 'Email and password are required.' },
        });
      return;
    }
    const user = await UserModel.findOne({
      email: email.trim().toLowerCase(),
      status: 'ACTIVE',
    }).select('+passwordHash');
    if (
      !user ||
      !(await verifyPassword(password, user.passwordHash)) ||
      user.role !== expectedRole
    ) {
      res
        .status(401)
        .json({
          error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
        });
      return;
    }
    // Defense in depth: the vendor portal is limited to approved vendor accounts,
    // so customers with pending or rejected applications cannot sign in there.
    if (expectedRole === 'VENDOR' && user.vendorApplicationStatus !== 'APPROVED') {
      res
        .status(401)
        .json({
          error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
        });
      return;
    }
    user.lastLoginAt = new Date();
    await user.save();
    res.status(200).json({
      user: publicUser(user),
      accessToken: createAccessToken({
        id: user._id,
        email: user.email,
        role: user.role as AppRole,
        authVersion: user.authVersion ?? 0,
      }),
    });
  } catch (error) {
    next(error);
  }
}

authRouter.post('/customer/login', (req, res, next) =>
  handlePortalLogin('CUSTOMER', req, res, next),
);
authRouter.post('/vendor/login', (req, res, next) => handlePortalLogin('VENDOR', req, res, next));
authRouter.post('/admin/login', (req, res, next) => handlePortalLogin('ADMIN', req, res, next));
authRouter.post('/manager/login', (req, res, next) => handlePortalLogin('MANAGER', req, res, next));

// Generic login kept for backward compatibility; it accepts every active role.
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128) {
      res
        .status(400)
        .json({
          error: { code: 'INVALID_CREDENTIALS', message: 'Email and password are required.' },
        });
      return;
    }
    const user = await UserModel.findOne({
      email: email.trim().toLowerCase(),
      status: 'ACTIVE',
    }).select('+passwordHash');
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res
        .status(401)
        .json({
          error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
        });
      return;
    }
    user.lastLoginAt = new Date();
    await user.save();
    res.status(200).json({
      user: publicUser(user),
      accessToken: createAccessToken({
        id: user._id,
        email: user.email,
        role: user.role as 'CUSTOMER' | 'VENDOR' | 'ADMIN',
        authVersion: user.authVersion ?? 0,
      }),
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await UserModel.findOne({ _id: req.authUser!.id, status: 'ACTIVE' });
    if (!user) {
      res
        .status(401)
        .json({ error: { code: 'UNAUTHENTICATED', message: 'Account is no longer active.' } });
      return;
    }
    res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

export default authRouter;

