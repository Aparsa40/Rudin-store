import type { AdminPermission, Role } from '../types';

/**
 * Permission gating for the Admin Dashboard.
 *
 * The backend resolves effective permissions on every request through the
 * `requirePermission` middleware; this module only mirrors that model so the
 * UI can hide sections the account cannot use. Frontend visibility is a
 * usability measure, never a security boundary.
 */

export type AdminSectionId = 'vendors' | 'products' | 'orders' | 'coupons';

/** The server-side permission each dashboard section requires. */
export const ADMIN_SECTION_PERMISSIONS: Record<AdminSectionId, AdminPermission> = {
  vendors: 'vendors:review',
  products: 'products:manage',
  orders: 'orders:manage',
  coupons: 'coupons:manage',
};

const VALID_ADMIN_PERMISSIONS: readonly AdminPermission[] = [
  'vendors:review',
  'products:manage',
  'coupons:manage',
  'orders:manage',
];

/**
 * Keeps only known permission strings. Missing or malformed permission data
 * fails closed: an account without a recognizable permission list sees no
 * administrative section.
 */
export function sanitizeAdminPermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is AdminPermission =>
      typeof entry === 'string' && (VALID_ADMIN_PERMISSIONS as readonly string[]).includes(entry),
  );
}

/**
 * Mirrors the backend `requirePermission` middleware: the MANAGER passes every
 * permission check, an ADMIN passes only with the permission granted by its
 * manager, and every other role fails closed.
 */
export function hasAdminPermission(
  role: Role | undefined,
  permissions: AdminPermission[] | undefined,
  permission: AdminPermission,
): boolean {
  if (role === 'MANAGER') return true;
  if (role !== 'ADMIN') return false;
  return (permissions ?? []).includes(permission);
}

/** Resolves which dashboard sections the current account may see. */
export function resolveVisibleAdminSections(
  role: Role | undefined,
  permissions: AdminPermission[] | undefined,
): Record<AdminSectionId, boolean> {
  return {
    vendors: hasAdminPermission(role, permissions, ADMIN_SECTION_PERMISSIONS.vendors),
    products: hasAdminPermission(role, permissions, ADMIN_SECTION_PERMISSIONS.products),
    orders: hasAdminPermission(role, permissions, ADMIN_SECTION_PERMISSIONS.orders),
    coupons: hasAdminPermission(role, permissions, ADMIN_SECTION_PERMISSIONS.coupons),
  };
}


/**
 * The outcome of verifying the administrator account through GET /api/auth/me.
 * Only the ready phase may expose sections; pending and failed fail closed.
 */
export type AdminPermissionVerification =
  | { phase: 'pending' }
  | { phase: 'ready'; role: Role; permissions: AdminPermission[] }
  | { phase: 'failed'; message: string };

/** The verification state before the first server response: nothing is exposed. */
export const ADMIN_VERIFICATION_PENDING: AdminPermissionVerification = { phase: 'pending' };

const VALID_ROLES: readonly Role[] = ['CUSTOMER', 'VENDOR', 'ADMIN', 'MANAGER'];

/**
 * Parses a GET /api/auth/me payload. Any malformed shape - a missing user
 * object, or a missing or unrecognized role - resolves to the failed phase
 * with a descriptive message, never to granted permissions.
 */
export function parseAdminVerificationResponse(payload: unknown): AdminPermissionVerification {
  if (typeof payload !== 'object' || payload === null) {
    return {
      phase: 'failed',
      message: 'The account verification response was malformed: expected an object.',
    };
  }
  const user = (payload as { user?: unknown }).user;
  if (typeof user !== 'object' || user === null) {
    return {
      phase: 'failed',
      message: 'The account verification response was malformed: the user object is missing.',
    };
  }
  const role = (user as { role?: unknown }).role;
  if (typeof role !== 'string' || !(VALID_ROLES as readonly string[]).includes(role)) {
    return {
      phase: 'failed',
      message: 'The account verification response was malformed: the account role is missing or unknown.',
    };
  }
  return {
    phase: 'ready',
    role: role as Role,
    permissions: sanitizeAdminPermissions((user as { adminPermissions?: unknown }).adminPermissions),
  };
}

/**
 * Builds the fail-closed verification state for network, server, or
 * malformed-response errors, so no administrative section renders from stale
 * stored grants while verification cannot be completed.
 */
export function adminVerificationFailed(error: unknown): AdminPermissionVerification {
  const message =
    error instanceof Error && error.message.trim() !== ''
      ? error.message
      : 'Unable to verify your administrator permissions.';
  return { phase: 'failed', message };
}

/** Resolves dashboard visibility for a verification outcome (fail closed). */
export function resolveSectionsForVerification(
  verification: AdminPermissionVerification,
): Record<AdminSectionId, boolean> {
  if (verification.phase !== 'ready') {
    return { vendors: false, products: false, orders: false, coupons: false };
  }
  return resolveVisibleAdminSections(verification.role, verification.permissions);
}
