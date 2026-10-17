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
