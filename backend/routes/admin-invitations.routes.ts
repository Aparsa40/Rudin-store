import { createHash, randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { Router } from 'express';
import { AdminInvitationModel } from '../models/admin-invitation.model.js';

const router = Router();
const scrypt = promisify(scryptCallback);

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

/**
 * This endpoint is called by an explicit form submission.
 * Merely opening the invitation URL does not verify or accept it.
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { token } = req.body ?? {};

    if (typeof token !== 'string' || token.length < 30 || token.length > 200) {
      res.status(400).json({
        error: {
          code: 'INVALID_INVITATION',
          message: 'The invitation link is invalid or expired.',
        },
      });
      return;
    }

    const invitation = await AdminInvitationModel.findOne({
      tokenHash: hashToken(token),
      tokenExpiresAt: { $gt: new Date() },
      status: { $in: ['INVITED', 'EMAIL_VERIFIED'] },
    });

    if (!invitation) {
      res.status(400).json({
        error: {
          code: 'INVALID_INVITATION',
          message: 'The invitation link is invalid or expired.',
        },
      });
      return;
    }

    const updated = await AdminInvitationModel.findOneAndUpdate(
      {
        _id: invitation._id,
        tokenHash: hashToken(token),
        tokenExpiresAt: { $gt: new Date() },
        status: 'INVITED',
      },
      { $set: { status: 'EMAIL_VERIFIED', verifiedAt: new Date() } },
      { returnDocument: 'after' },
    );

    if (!updated) {
      res.status(400).json({
        error: {
          code: 'INVALID_INVITATION',
          message: 'The invitation link is invalid or expired.',
        },
      });
      return;
    }

    res.status(200).json({
      message: 'Email verified. Accept the invitation and choose your password to continue.',
      email: updated.email,
      firstName: updated.firstName,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * The invitee explicitly accepts the invitation and chooses a password.
 * The invitation token is consumed here. No User account or admin access
 * is created at this stage.
 */
router.post('/accept', async (req, res, next) => {
  try {
    const { token, password, accepted } = req.body ?? {};

    if (
      typeof token !== 'string' ||
      token.length < 30 ||
      token.length > 200 ||
      typeof password !== 'string' ||
      password.length < 12 ||
      password.length > 128 ||
      accepted !== true
    ) {
      res.status(400).json({
        error: {
          code: 'INVALID_INVITATION_ACCEPTANCE',
          message:
            'Provide a valid invitation, accept the invitation, and choose a password of 12–128 characters.',
        },
      });
      return;
    }

    const tokenHash = hashToken(token);
    const now = new Date();

    const invitation = await AdminInvitationModel.findOne({
      tokenHash,
      tokenExpiresAt: { $gt: now },
      status: 'EMAIL_VERIFIED',
    }).select('+tokenHash +tokenExpiresAt +passwordHash');

    if (!invitation) {
      res.status(400).json({
        error: {
          code: 'INVALID_INVITATION',
          message: 'Verify your email first or request a new invitation.',
        },
      });
      return;
    }

    const passwordHash = await hashPassword(password);

    // Conditional update prevents a second acceptance from consuming the
    // same invitation after another request has already accepted it.
    const result = await AdminInvitationModel.updateOne(
      {
        _id: invitation._id,
        tokenHash,
        tokenExpiresAt: { $gt: new Date() },
        status: 'EMAIL_VERIFIED',
      },
      {
        $set: {
          passwordHash,
          status: 'PENDING_APPROVAL',
          acceptedAt: new Date(),
        },
        $unset: {
          tokenHash: 1,
          tokenExpiresAt: 1,
        },
      },
    );

    if (result.modifiedCount !== 1) {
      res.status(400).json({
        error: {
          code: 'INVITATION_ALREADY_USED',
          message: 'This invitation has already been used or expired.',
        },
      });
      return;
    }

    res.status(200).json({
      message: 'Invitation accepted. Your account is awaiting final Manager approval.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
