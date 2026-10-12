import type { Role } from '../types';

/**
 * Role-specific authentication portals.
 * Each portal owns its own route, backend endpoint, required role and
 * post-login destination. A login page must only submit to its own apiPath.
 */
export type AuthPortal = 'customer' | 'vendor' | 'admin' | 'manager';

export interface AuthPortalConfig {
  id: AuthPortal;
  loginRoute: string;
  apiPath: string;
  requiredRole: Role;
  homeRoute: string;
}

export const AUTH_PORTALS: Record<AuthPortal, AuthPortalConfig> = {
  customer: {
    id: 'customer',
    loginRoute: '/login',
    apiPath: '/api/auth/customer/login',
    requiredRole: 'CUSTOMER',
    homeRoute: '/account',
  },
  vendor: {
    id: 'vendor',
    loginRoute: '/vendor/login',
    apiPath: '/api/auth/vendor/login',
    requiredRole: 'VENDOR',
    homeRoute: '/seller/dashboard',
  },
  admin: {
    id: 'admin',
    loginRoute: '/admin/login',
    apiPath: '/api/auth/admin/login',
    requiredRole: 'ADMIN',
    homeRoute: '/admin',
  },
  manager: {
    id: 'manager',
    loginRoute: '/manager/login',
    apiPath: '/api/auth/manager/login',
    requiredRole: 'MANAGER',
    homeRoute: '/manager',
  },
};

/** Post-login destination for an authenticated role. */
export function getHomeRouteForRole(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return AUTH_PORTALS.admin.homeRoute;
    case 'MANAGER':
      return AUTH_PORTALS.manager.homeRoute;
    case 'VENDOR':
      return AUTH_PORTALS.vendor.homeRoute;
    default:
      return AUTH_PORTALS.customer.homeRoute;
  }
}

/**
 * Login page an unauthenticated visitor should be sent to for a protected
 * area. The shared seller area points at the vendor portal; manager and
 * admin-only areas point at their own dedicated portals.
 */
export function getLoginRouteForRoles(allowedRoles?: Role[]): string {
  if (!allowedRoles || allowedRoles.length === 0) {
    return AUTH_PORTALS.customer.loginRoute;
  }
  if (allowedRoles.includes('MANAGER')) {
    return AUTH_PORTALS.manager.loginRoute;
  }
  if (allowedRoles.includes('VENDOR')) {
    return AUTH_PORTALS.vendor.loginRoute;
  }
  if (allowedRoles.includes('ADMIN')) {
    return AUTH_PORTALS.admin.loginRoute;
  }
  return AUTH_PORTALS.customer.loginRoute;
}
