import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';

import { UserModel } from '../models/user.model.js';
import { AdminInvitationModel } from '../models/admin-invitation.model.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { resolveAdminPermissions } from '../lib/admin-permissions.js';
import { sendEmail } from '../lib/email.js';
import { withAdminStateLock } from '../lib/admin-state.js';
import { recordAudit, recordAuditDiagnostic, withAuditTransaction } from '../lib/audit.js';
import { createRateLimiter } from '../middleware/rate-limit.js';

const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('MANAGER'));

const INVITATION_LIFETIME_MS = 48 * 60 * 60 * 1000;

const INVITATION_PENDING_STATUSES = ['INVITED', 'EMAIL_VERIFIED', 'PENDING_APPROVAL'] as const;

type PermissionInput = {
  presets?: unknown;
  allow?: unknown;
  deny?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const email = value.trim().toLowerCase();

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }

  return email;
}

function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[character] ?? character;
  });
}

function getInvitationBaseUrl(): string | null {
  const configuredUrl = process.env.WEB_URL;

  if (!configuredUrl) return null;

  try {
    const url = new URL(configuredUrl);

    const isLocalHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalHost)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/admins
 *
 * Lists existing administrator accounts.
 * Only MANAGER can access this router.
 */
adminRouter.get('/admins', async (_req, res, next) => {
  try {
    const admins = await UserModel.find({ role: 'ADMIN' })
      .select('_id email firstName lastName status createdAt createdBy adminPermissions')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      admins: admins.map((admin) => ({
        id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        status: admin.status,
        createdAt: admin.createdAt,
        createdBy: admin.createdBy,
        permissions: admin.adminPermissions ?? [],
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/invitations
 *
 * Lists invitations and their current workflow states.
 * Sensitive fields such as tokenHash and passwordHash are never returned.
 */
adminRouter.get('/invitations', async (_req, res, next) => {
  try {
    const invitations = await AdminInvitationModel.find({
      status: {
        $in: ['INVITED', 'EMAIL_VERIFIED', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'DISABLED'],
      },
    })
      .select(
        '_id email firstName lastName adminPermissions status createdBy createdAt verifiedAt acceptedAt reviewedBy reviewedAt rejectedReason',
      )
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      invitations: invitations.map((invitation) => ({
        id: invitation._id,
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        permissions: invitation.adminPermissions ?? [],
        status: invitation.status,
        createdBy: invitation.createdBy,
        createdAt: invitation.createdAt,
        verifiedAt: invitation.verifiedAt,
        acceptedAt: invitation.acceptedAt,
        reviewedBy: invitation.reviewedBy,
        reviewedAt: invitation.reviewedAt,
        rejectedReason: invitation.rejectedReason,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/invitations
 *
 * Creates an invitation and sends an email containing a one-time token.
 * It does NOT create an active administrator account.
 *
 * Expected body:
 * {
 *   "email": "person@example.com",
 *   "firstName": "Alex",
 *   "lastName": "Smith",
 *   "permission": { "presets": ["vendor-support"] }
 * }
 */
adminRouter.post('/invitations', async (req, res, next) => {
  let invitationId: string | undefined;

  try {
    const body: unknown = req.body;

    if (!isRecord(body)) {
      res.status(400).json({
        error: {
          code: 'INVALID_INVITATION',
          message: 'Request body must be a JSON object.',
        },
      });
      return;
    }

    const email = normalizeEmail(body.email);
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';

    if (
      !email ||
      firstName.length < 1 ||
      firstName.length > 80 ||
      lastName.length > 80 ||
      (body.lastName !== undefined && typeof body.lastName !== 'string')
    ) {
      res.status(400).json({
        error: {
          code: 'INVALID_INVITATION',
          message:
            'Provide a valid email, a first name of 1–80 characters, and an optional last name of at most 80 characters.',
        },
      });
      return;
    }

    const permissionInput = body.permission;

    if (permissionInput !== undefined && !isRecord(permissionInput)) {
      res.status(400).json({
        error: {
          code: 'INVALID_PERMISSIONS',
          message:
            'permission must be an object containing optional presets, allow, and deny values.',
        },
      });
      return;
    }

    const resolved = resolveAdminPermissions((permissionInput ?? {}) as PermissionInput);

    if ('error' in resolved) {
      res.status(400).json({
        error: {
          code: 'INVALID_PERMISSIONS',
          message: resolved.error,
        },
      });
      return;
    }

    const existingUser = await UserModel.exists({ email });

    if (existingUser) {
      res.status(409).json({
        error: {
          code: 'EMAIL_IN_USE',
          message: 'An account with this email already exists.',
        },
      });
      return;
    }

    const existingInvitation = await AdminInvitationModel.exists({
      $or: [
        { activeEmail: email },
        { email, status: { $in: [...INVITATION_PENDING_STATUSES] } },
      ],
    });

    if (existingInvitation) {
      res.status(409).json({
        error: {
          code: 'INVITATION_EXISTS',
          message: 'An invitation for this email is already in progress.',
        },
      });
      return;
    }

    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
      res.status(503).json({
        error: {
          code: 'EMAIL_NOT_CONFIGURED',
          message: 'The invitation email service is not configured on the server.',
        },
      });
      return;
    }

    const baseUrl = getInvitationBaseUrl();

    if (!baseUrl) {
      res.status(503).json({
        error: {
          code: 'WEB_URL_NOT_CONFIGURED',
          message: 'Configure WEB_URL with the public frontend origin before sending invitations.',
        },
      });
      return;
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = hashInvitationToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS);

    const invitation = await AdminInvitationModel.create({
      _id: `inv_${randomBytes(12).toString('hex')}`,
      email,
      activeEmail: email,
      firstName,
      lastName,
      adminPermissions: resolved.permissions,
      status: 'INVITED',
      tokenHash,
      tokenExpiresAt: expiresAt,
      createdBy: req.authUser!.id,
    });

    invitationId = String(invitation._id);

    const invitationUrl = new URL('/admin-invitation', baseUrl);
    invitationUrl.searchParams.set('token', rawToken);

    const safeFirstName = escapeHtml(firstName);
    const safeInvitationUrl = escapeHtml(invitationUrl.toString());

    try {
      await sendEmail({
        to: email,
        subject: 'Rudin Store administrator invitation',
        text:
          `Hello ${firstName},\n\n` +
          'You have been invited to become a Rudin Store administrator.\n\n' +
          `Open this link to verify your email and continue: ${invitationUrl.toString()}\n\n` +
          'This invitation link expires in 48 hours and can only be used once. ' +
          'You will choose your own password. Your administrator access will remain unavailable until the Manager gives final approval.\n',
        html:
          `<p>Hello ${safeFirstName},</p>` +
          '<p>You have been invited to become a Rudin Store administrator.</p>' +
          `<p><a href="${safeInvitationUrl}">Review your invitation</a></p>` +
          '<p>This invitation link expires in 48 hours and can only be used once. ' +
          'You will choose your own password. Administrator access remains unavailable until the Manager gives final approval.</p>',
      });
    } catch (emailError) {
      // Delete only this still-unaccepted invitation. If its state has
      // already changed, do not overwrite the newer state.
      await AdminInvitationModel.deleteOne({
        _id: invitation._id,
        status: 'INVITED',
      });

      invitationId = undefined;

      console.error('Administrator invitation email delivery failed.', {
        invitationId: String(invitation._id),
        error: emailError instanceof Error ? emailError.message : 'Unknown email provider error',
      });

      res.status(502).json({
        error: {
          code: 'EMAIL_DELIVERY_FAILED',
          message: 'The invitation email could not be sent. Please try again later.',
        },
      });
      return;
    }

    // Diagnostic tier: the invitation document itself is the durable record of
    // the invitation, so a best-effort audit entry with surfaced failures is
    // appropriate here.
    await recordAuditDiagnostic({
      actorId: req.authUser!.id,
      actorRole: req.authUser!.role,
      action: 'admin.invitation.created',
      targetType: 'invitation',
      targetId: String(invitation._id),
      metadata: { email, permissions: resolved.permissions },
    });

    res.status(201).json({
      invitation: {
        id: invitation._id,
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        status: invitation.status,
        permissions: invitation.adminPermissions,
        expiresAt,
      },
      message: 'Invitation email sent.',
    });
  } catch (error) {
    // Best-effort cleanup if creation succeeded but a later operation failed.
    if (invitationId) {
      try {
        await AdminInvitationModel.deleteOne({
          _id: invitationId,
          status: 'INVITED',
        });
      } catch (cleanupError) {
        console.error('Failed to clean up an unsent invitation.', cleanupError);
      }
    }

    const databaseError = error as { code?: number; keyPattern?: Record<string, unknown> } | null;
    if (databaseError?.code === 11000 && databaseError.keyPattern?.activeEmail) {
      res.status(409).json({
        error: {
          code: 'INVITATION_EXISTS',
          message: 'An invitation for this email is already in progress.',
        },
      });
      return;
    }
    next(error);
  }
});

/**
 * PATCH /api/admin/admins/:id/permissions
 *
 * Replaces the permission set using server-side permission resolution.
 * The audit record is coupled to the same transaction as the change: a failed
 * audit write rolls the permission change back.
 */
adminRouter.patch('/admins/:id/permissions', async (req, res, next) => {
  try {
    const body: unknown = req.body;

    if (!isRecord(body)) {
      res.status(400).json({
        error: {
          code: 'INVALID_PERMISSIONS',
          message: 'Request body must be a JSON object.',
        },
      });
      return;
    }

    const resolved = resolveAdminPermissions(body as PermissionInput);

    if ('error' in resolved) {
      res.status(400).json({
        error: {
          code: 'INVALID_PERMISSIONS',
          message: resolved.error,
        },
      });
      return;
    }

    const user = await withAuditTransaction(async (session) => {
      const updated = await UserModel.findOneAndUpdate(
        { _id: req.params.id, role: 'ADMIN' },
        { $set: { adminPermissions: resolved.permissions } },
        { returnDocument: 'after', runValidators: true, session },
      ).select('_id email firstName lastName status adminPermissions');

      if (!updated) return null;

      await recordAudit(
        {
          actorId: req.authUser!.id,
          actorRole: req.authUser!.role,
          action: 'admin.permissions.updated',
          targetType: 'user',
          targetId: String(updated._id),
          metadata: { email: updated.email, permissions: updated.adminPermissions ?? [] },
        },
        session,
      );

      return updated;
    });

    if (!user) {
      res.status(404).json({
        error: {
          code: 'ADMIN_NOT_FOUND',
          message: 'Administrator not found.',
        },
      });
      return;
    }

    res.status(200).json({
      admin: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        permissions: user.adminPermissions ?? [],
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/admins/:id/status
 *
 * Enables or disables an existing administrator.
 * This route does not create accounts or approve pending invitations.
 * The status change, the invitation-state sync, the session revocation, and
 * the audit record all commit inside one transaction.
 */
adminRouter.patch('/admins/:id/status', async (req, res, next) => {
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

    const user = await withAuditTransaction(async (session) => {
      const updated = await UserModel.findOneAndUpdate(
        { _id: req.params.id, role: 'ADMIN' },
        {
          $set: { status },
          // Revoke all previously issued sessions even if the account is later re-enabled.
          $inc: { authVersion: 1 },
        },
        { returnDocument: 'after', runValidators: true, session },
      ).select('_id email firstName lastName status authVersion');

      if (!updated) return null;

      await AdminInvitationModel.updateOne(
        {
          email: updated.email,
          status: { $in: ['ACTIVE', 'DISABLED'] },
        },
        { $set: { status } },
        { session },
      );

      await recordAudit(
        {
          actorId: req.authUser!.id,
          actorRole: req.authUser!.role,
          action: 'admin.status.changed',
          targetType: 'user',
          targetId: String(updated._id),
          metadata: { email: updated.email, to: status, authVersionBumped: true },
        },
        session,
      );

      return updated;
    });

    if (!user) {
      res.status(404).json({
        error: {
          code: 'ADMIN_NOT_FOUND',
          message: 'Administrator not found.',
        },
      });
      return;
    }

    res.status(200).json({
      admin: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/invitations/:id/approve
 *
 * Creates an ACTIVE ADMIN account only after the invitee has verified
 * the email, accepted the invitation, and selected a password.
 * The audit record is written inside the same serialized transaction.
 */
adminRouter.post('/invitations/:id/approve', async (req, res, next) => {
  try {
    const result = await withAdminStateLock(async (session) => {
      const invitation = await AdminInvitationModel.findOne({
        _id: req.params.id,
        status: 'PENDING_APPROVAL',
      })
        .select('+passwordHash')
        .session(session);

      if (!invitation || !invitation.passwordHash) {
        return { kind: 'not-pending' } as const;
      }

      const existingUser = await UserModel.exists({
        email: invitation.email,
      }).session(session);

      if (existingUser) {
        return { kind: 'email-in-use' } as const;
      }

      const [user] = await UserModel.create(
        [
          {
            _id: `usr_${randomBytes(12).toString('hex')}`,
            email: invitation.email,
            passwordHash: invitation.passwordHash,
            firstName: invitation.firstName,
            lastName: invitation.lastName ?? '',
            role: 'ADMIN',
            status: 'ACTIVE',
            createdBy: req.authUser!.id,
            adminPermissions: invitation.adminPermissions ?? [],
          },
        ],
        { session },
      );

      const update = await AdminInvitationModel.updateOne(
        {
          _id: invitation._id,
          status: 'PENDING_APPROVAL',
        },
        {
          $set: {
            status: 'ACTIVE',
            reviewedBy: req.authUser!.id,
            reviewedAt: new Date(),
          },
          $unset: {
            activeEmail: 1,
            passwordHash: 1,
            tokenHash: 1,
            tokenExpiresAt: 1,
          },
        },
        { session },
      );

      if (update.modifiedCount !== 1) {
        throw new Error('INVITATION_APPROVAL_CONFLICT');
      }

      await recordAudit(
        {
          actorId: req.authUser!.id,
          actorRole: req.authUser!.role,
          action: 'admin.invitation.approved',
          targetType: 'user',
          targetId: String(user._id),
          metadata: {
            email: user.email,
            invitationId: String(invitation._id),
            permissions: user.adminPermissions ?? [],
          },
        },
        session,
      );

      return { kind: 'approved', user } as const;
    });

    if (result.kind === 'not-pending') {
      res.status(409).json({
        error: {
          code: 'INVITATION_NOT_PENDING',
          message: 'This invitation is not awaiting final approval.',
        },
      });
      return;
    }

    if (result.kind === 'email-in-use') {
      res.status(409).json({
        error: {
          code: 'EMAIL_IN_USE',
          message: 'An account with this email already exists. The invitation cannot be approved.',
        },
      });
      return;
    }

    res.status(200).json({
      admin: {
        id: result.user._id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        status: result.user.status,
        permissions: result.user.adminPermissions ?? [],
      },
      message: 'Administrator approved and activated.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/invitations/:id/reject
 *
 * Rejects an invitation that has not yet been approved.
 * The rejection and its audit record commit inside one transaction.
 */
adminRouter.post('/invitations/:id/reject', async (req, res, next) => {
  try {
    const body: unknown = req.body;

    if (body !== undefined && !isRecord(body)) {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Request body must be a JSON object.',
        },
      });
      return;
    }

    const rawReason = isRecord(body) ? body.reason : undefined;

    if (rawReason !== undefined && typeof rawReason !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_REASON',
          message: 'reason must be a string.',
        },
      });
      return;
    }

    const reason = typeof rawReason === 'string' ? rawReason.trim().slice(0, 500) : '';

    const invitation = await withAuditTransaction(async (session) => {
      const rejected = await AdminInvitationModel.findOneAndUpdate(
        {
          _id: req.params.id,
          status: { $in: [...INVITATION_PENDING_STATUSES] },
        },
        {
          $set: {
            status: 'REJECTED',
            reviewedBy: req.authUser!.id,
            reviewedAt: new Date(),
            rejectedReason: reason,
          },
          $unset: {
            activeEmail: 1,
            tokenHash: 1,
            tokenExpiresAt: 1,
            passwordHash: 1,
          },
        },
        { returnDocument: 'after', runValidators: true, session },
      ).select('_id email status reviewedAt');

      if (!rejected) return null;

      await recordAudit(
        {
          actorId: req.authUser!.id,
          actorRole: req.authUser!.role,
          action: 'admin.invitation.rejected',
          targetType: 'invitation',
          targetId: String(rejected._id),
          metadata: { email: rejected.email, reason },
        },
        session,
      );

      return rejected;
    });

    if (!invitation) {
      res.status(409).json({
        error: {
          code: 'INVITATION_NOT_REJECTABLE',
          message: 'This invitation cannot be rejected in its current state.',
        },
      });
      return;
    }

    res.status(200).json({
      invitation: {
        id: invitation._id,
        email: invitation.email,
        status: invitation.status,
        reviewedAt: invitation.reviewedAt,
      },
      message: 'Invitation rejected.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/invitations/:id/resend
 *
 * Reissues the one-time invitation token for an invitation that is still in
 * the INVITED state and sends a fresh invitation email. The workflow state is
 * validated before the email-configuration checks, so an unresendable
 * invitation reports INVITATION_NOT_RESENDABLE even on a server without email
 * configured. Replacing tokenHash invalidates the previously issued link
 * immediately and the expiry window restarts. Invitations that already
 * advanced (EMAIL_VERIFIED or later) are never reset through this route;
 * rejecting and re-inviting is the explicit path for those cases.
 */
adminRouter.post(
  '/invitations/:id/resend',
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many resend attempts. Please try again in 15 minutes.',
  }),
  async (req, res, next) => {
    try {
      const currentInvitation = await AdminInvitationModel.findOne({ _id: req.params.id }).select(
        'status',
      );

      if (!currentInvitation) {
        res.status(404).json({
          error: {
            code: 'INVITATION_NOT_FOUND',
            message: 'Invitation not found.',
          },
        });
        return;
      }

      // Validate the workflow state before touching email configuration, so
      // the manager learns why a resend is impossible even when the email
      // provider is not configured.
      if (currentInvitation.status !== 'INVITED') {
        res.status(409).json({
          error: {
            code: 'INVITATION_NOT_RESENDABLE',
            message:
              'Only invitations still awaiting email verification can be resent. Reject and re-invite instead.',
          },
        });
        return;
      }

      if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
        res.status(503).json({
          error: {
            code: 'EMAIL_NOT_CONFIGURED',
            message: 'The invitation email service is not configured on the server.',
          },
        });
        return;
      }

      const baseUrl = getInvitationBaseUrl();

      if (!baseUrl) {
        res.status(503).json({
          error: {
            code: 'WEB_URL_NOT_CONFIGURED',
            message:
              'Configure WEB_URL with the public frontend origin before sending invitations.',
          },
        });
        return;
      }

      const rawToken = randomBytes(32).toString('base64url');
      const tokenHash = hashInvitationToken(rawToken);
      const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS);

      const result = await withAuditTransaction(async (session) => {
        // Conditional update keeps the rotation race-free: only an invitation
        // still in the INVITED state can have its token replaced.
        const invitation = await AdminInvitationModel.findOneAndUpdate(
          { _id: req.params.id, status: 'INVITED' },
          { $set: { tokenHash, tokenExpiresAt: expiresAt } },
          { returnDocument: 'after', session },
        ).select('_id email firstName lastName status');

        if (!invitation) {
          return { kind: 'not-resendable' } as const;
        }

        await recordAudit(
          {
            actorId: req.authUser!.id,
            actorRole: req.authUser!.role,
            action: 'admin.invitation.resent',
            targetType: 'invitation',
            targetId: String(invitation._id),
            metadata: { email: invitation.email, tokenRotated: true },
          },
          session,
        );

        return { kind: 'resendable', invitation } as const;
      });

      if (result.kind === 'not-resendable') {
        // Race fallback: the invitation advanced between the state check and
        // the transactional token rotation.
        res.status(409).json({
          error: {
            code: 'INVITATION_NOT_RESENDABLE',
            message: 'This invitation changed state before the resend could complete.',
          },
        });
        return;
      }

      const invitation = result.invitation;
      const invitationUrl = new URL('/admin-invitation', baseUrl);
      invitationUrl.searchParams.set('token', rawToken);

      const safeFirstName = escapeHtml(invitation.firstName ?? '');
      const safeInvitationUrl = escapeHtml(invitationUrl.toString());

      try {
        await sendEmail({
          to: invitation.email,
          subject: 'Rudin Store administrator invitation (renewed)',
          text:
            `Hello ${invitation.firstName ?? ''},\n\n` +
            'Your Rudin Store administrator invitation link has been renewed.\n\n' +
            `Open this link to verify your email and continue: ${invitationUrl.toString()}\n\n` +
            'This invitation link expires in 48 hours and can only be used once. Any previously sent link is no longer valid.\n',
          html:
            `<p>Hello ${safeFirstName},</p>` +
            '<p>Your Rudin Store administrator invitation link has been renewed.</p>' +
            `<p><a href="${safeInvitationUrl}">Review your invitation</a></p>` +
            '<p>This invitation link expires in 48 hours and can only be used once. Any previously sent link is no longer valid.</p>',
        });
      } catch (emailError) {
        // The token rotation has already committed: the invitation stays in the
        // INVITED state and remains resendable, while the previous link is now
        // invalid. Surface the delivery failure instead of hiding it.
        console.error('Administrator invitation resend email delivery failed.', {
          invitationId: String(invitation._id),
          error: emailError instanceof Error ? emailError.message : 'Unknown email provider error',
        });

        await recordAuditDiagnostic({
          actorId: req.authUser!.id,
          actorRole: req.authUser!.role,
          action: 'admin.invitation.resent_email_failed',
          targetType: 'invitation',
          targetId: String(invitation._id),
          metadata: { email: invitation.email, tokenRotated: true },
        });

        res.status(502).json({
          error: {
            code: 'EMAIL_DELIVERY_FAILED',
            message:
              'The invitation email could not be sent. The invitation link was renewed and can be resent again.',
          },
        });
        return;
      }

      res.status(200).json({
        invitation: {
          id: invitation._id,
          email: invitation.email,
          status: invitation.status,
          expiresAt,
        },
        message: 'Invitation email resent.',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default adminRouter;
