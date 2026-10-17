import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTH_PORTALS, getHomeRouteForRole, getLoginRouteForRoles } from './authPortals';

test('each portal submits to its own role-specific backend endpoint', () => {
  assert.equal(AUTH_PORTALS.customer.apiPath, '/api/auth/customer/login');
  assert.equal(AUTH_PORTALS.customer.requiredRole, 'CUSTOMER');
  assert.equal(AUTH_PORTALS.customer.loginRoute, '/login');
  assert.equal(AUTH_PORTALS.customer.homeRoute, '/account');

  assert.equal(AUTH_PORTALS.vendor.apiPath, '/api/auth/vendor/login');
  assert.equal(AUTH_PORTALS.vendor.requiredRole, 'VENDOR');
  assert.equal(AUTH_PORTALS.vendor.loginRoute, '/vendor/login');
  assert.equal(AUTH_PORTALS.vendor.homeRoute, '/seller/dashboard');

  assert.equal(AUTH_PORTALS.admin.apiPath, '/api/auth/admin/login');
  assert.equal(AUTH_PORTALS.admin.requiredRole, 'ADMIN');
  assert.equal(AUTH_PORTALS.admin.loginRoute, '/admin/login');
  assert.equal(AUTH_PORTALS.admin.homeRoute, '/admin');

  assert.equal(AUTH_PORTALS.manager.apiPath, '/api/auth/manager/login');
  assert.equal(AUTH_PORTALS.manager.requiredRole, 'MANAGER');
  assert.equal(AUTH_PORTALS.manager.loginRoute, '/manager/login');
  assert.equal(AUTH_PORTALS.manager.homeRoute, '/manager');
});

test('every portal endpoint and required role is unique', () => {
  const apiPaths = Object.values(AUTH_PORTALS).map((portal) => portal.apiPath);
  assert.equal(new Set(apiPaths).size, apiPaths.length);
  const requiredRoles = Object.values(AUTH_PORTALS).map((portal) => portal.requiredRole);
  assert.equal(new Set(requiredRoles).size, requiredRoles.length);
});

test('authenticated roles are routed to their own home area', () => {
  assert.equal(getHomeRouteForRole('CUSTOMER'), '/account');
  assert.equal(getHomeRouteForRole('VENDOR'), '/seller/dashboard');
  assert.equal(getHomeRouteForRole('ADMIN'), '/admin');
  assert.equal(getHomeRouteForRole('MANAGER'), '/manager');
});

test('protected areas redirect unauthenticated visitors to the correct portal', () => {
  assert.equal(getLoginRouteForRoles(undefined), '/login');
  assert.equal(getLoginRouteForRoles([]), '/login');
  assert.equal(getLoginRouteForRoles(['CUSTOMER']), '/login');
  assert.equal(getLoginRouteForRoles(['VENDOR']), '/vendor/login');
  assert.equal(
    getLoginRouteForRoles(['VENDOR', 'ADMIN']),
    '/vendor/login',
    'the shared seller area must use the vendor portal',
  );
  assert.equal(getLoginRouteForRoles(['ADMIN']), '/admin/login');
  assert.equal(getLoginRouteForRoles(['MANAGER']), '/manager/login');
});
