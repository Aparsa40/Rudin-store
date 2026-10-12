// Granular permissions for ADMIN accounts appointed by the primary MANAGER.
// An admin only ever holds the permissions the manager explicitly granted,
// so administrative work can be delegated without handing over the platform.

export const ADMIN_PERMISSIONS = ["vendors:review", "products:manage", "coupons:manage", "orders:manage"] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

// Server-defined presets give managers a safe shorthand; allow/deny entries
// fine-tune a preset without inventing new permissions. The catalog-curator
// preset intentionally includes vendors:review so a single admin can run the
// full vendor onboarding workflow. The operations preset pairs the coupon and
// order capabilities so an operations admin can be appointed in one step.
export const ADMIN_PRESETS: Record<string, readonly AdminPermission[]> = {
  "vendor-support": ["vendors:review"],
  "catalog-curator": ["vendors:review", "products:manage"],
  "operations": ["coupons:manage", "orders:manage"],
};

function toStringArray(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim() === "")) return null;
  return value;
}

// Resolves the effective permission list for an admin account. Deny always wins
// over preset and allow entries. The resolved list is stored on the account, so
// future preset redefinitions never silently re-grant permissions to existing
// admins. Returns an error string when the input is malformed or references an
// unknown preset or permission.
export function resolveAdminPermissions(input: {
  presets?: unknown;
  allow?: unknown;
  deny?: unknown;
}): { permissions: AdminPermission[] } | { error: string } {
  const presets = toStringArray(input.presets);
  const allow = toStringArray(input.allow);
  const deny = toStringArray(input.deny);
  if (presets === null || allow === null || deny === null) {
    return { error: "presets, allow and deny must each be arrays of non-empty strings." };
  }
  const granted = new Set<AdminPermission>();
  for (const presetName of presets) {
    const preset = ADMIN_PRESETS[presetName];
    if (!preset) {
      return { error: `Unknown admin permission preset: ${presetName}.` };
    }
    for (const permission of preset) granted.add(permission);
  }
  for (const permission of allow) {
    if (!(ADMIN_PERMISSIONS as readonly string[]).includes(permission)) {
      return { error: `Unknown admin permission: ${permission}.` };
    }
    granted.add(permission as AdminPermission);
  }
  for (const permission of deny) {
    if (!(ADMIN_PERMISSIONS as readonly string[]).includes(permission)) {
      return { error: `Unknown admin permission: ${permission}.` };
    }
    granted.delete(permission as AdminPermission);
  }
  return { permissions: [...granted].sort() };
}
