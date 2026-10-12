// Granular capabilities the platform manager can grant to an ADMIN account.
// The MANAGER (platform owner) always has every capability; an admin receives only
// the permissions explicitly assigned to it and can never raise its own access.
export const ADMIN_PERMISSIONS = [
  "SELLER_MANAGEMENT",
  "CUSTOMER_MANAGEMENT",
  "PRODUCT_MANAGEMENT",
  "ORDER_MANAGEMENT",
  "COUPON_MANAGEMENT",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

/**
 * Normalizes a request-supplied permissions value into a validated, de-duplicated
 * subset of ADMIN_PERMISSIONS. Returns an error message for any other shape so
 * API routes can reject unknown or client-invented permission names.
 */
export function parseAdminPermissions(
  value: unknown,
): { permissions: AdminPermission[]; error?: undefined } | { permissions: null; error: string } {
  if (value === undefined) return { permissions: [] };
  if (!Array.isArray(value)) {
    return { permissions: null, error: `permissions must be an array containing only: ${ADMIN_PERMISSIONS.join(", ")}.` };
  }
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string" || !(ADMIN_PERMISSIONS as readonly string[]).includes(entry)) {
      return { permissions: null, error: `permissions must be an array containing only: ${ADMIN_PERMISSIONS.join(", ")}.` };
    }
    seen.add(entry);
  }
  return { permissions: [...seen] as AdminPermission[] };
}
