import mongoose, { type ClientSession } from 'mongoose';
import { randomBytes } from 'node:crypto';
import { AuditLogModel } from '../models/audit-log.model.js';
import type { AppRole } from '../middleware/auth.js';

export type AuditEvent = {
  // Acting account id, taken from the server-authenticated request user.
  actorId: string;
  actorRole: AppRole;
  // Stable dotted action name, for example "admin.customer.status_changed".
  action: string;
  // Logical target type, for example "user", "invitation", or "product".
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Writes an audit record.
 *
 * Reliable tier: pass `session` so the audit write joins the caller's MongoDB
 * transaction. A failed audit write then aborts the transaction, so a sensitive
 * mutation and its audit record commit together or not at all. Callers that
 * need a guaranteed audit record must use this tier.
 *
 * Diagnostic tier: omit `session`. The write is performed without transactional
 * coupling; failures propagate to the caller, which decides how to surface
 * them (see recordAuditDiagnostic). This tier carries no delivery guarantee and
 * must not be used for actions whose audit record is required.
 */
export async function recordAudit(event: AuditEvent, session?: ClientSession): Promise<void> {
  await AuditLogModel.create(
    [
      {
        _id: `aud_${randomBytes(12).toString('hex')}`,
        actorId: event.actorId,
        actorRole: event.actorRole,
        action: event.action,
        targetType: event.targetType,
        ...(event.targetId !== undefined ? { targetId: event.targetId } : {}),
        metadata: event.metadata ?? {},
      },
    ],
    session ? { session } : undefined,
  );
}

/**
 * Best-effort diagnostic tier for events that must not fail the request once
 * the primary mutation has already committed (for example a product status
 * change). A failed audit write is surfaced through console.error and is
 * never silently swallowed, but it does not roll back the mutation.
 */
export async function recordAuditDiagnostic(event: AuditEvent): Promise<void> {
  try {
    await recordAudit(event);
  } catch (error) {
    console.error('Diagnostic audit write failed.', {
      action: event.action,
      actorId: event.actorId,
      error: error instanceof Error ? error.message : 'Unknown audit write error',
    });
  }
}

/**
 * Runs an operation inside a MongoDB transaction and returns its result.
 * Route handlers use it to couple a sensitive mutation with its reliable-tier
 * audit write in the same transaction: either both commit or neither does.
 * Requires a replica set or sharded cluster, the same environment requirement
 * as the admin approval flow.
 */
export async function withAuditTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  let result!: T;
  try {
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
