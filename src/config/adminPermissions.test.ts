import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_SECTION_PERMISSIONS,
  ADMIN_VERIFICATION_PENDING,
  adminVerificationFailed,
  hasAdminPermission,
  parseAdminVerificationResponse,
  resolveSectionsForVerification,
  resolveVisibleAdminSections,
  sanitizeAdminPermissions,
} from './adminPermissions.js';

test('every dashboard section maps to exactly one known permission', () => {
  const sections = Object.keys(ADMIN_SECTION_PERMISSIONS);
  assert.deepEqual([...sections].sort(), ['coupons', 'orders', 'products', 'vendors']);
  for (const permission of Object.values(ADMIN_SECTION_PERMISSIONS)) {
    assert.deepEqual(
      sanitizeAdminPermissions([permission]),
      [permission],
      `the section permission ${permission} must be a recognized permission`,
    );
  }
});

test('the primary manager retains the intended backend access', () => {
  // The backend requirePermission middleware passes the MANAGER unconditionally,
  // so the manager sees every section regardless of any stored list.
  const sections = resolveVisibleAdminSections('MANAGER', []);
  assert.deepEqual(sections, {
    vendors: true,
    products: true,
    orders: true,
    coupons: true,
  });
  assert.equal(hasAdminPermission('MANAGER', undefined, 'orders:manage'), true);
});

test('each permission combination displays only its authorized sections', () => {
  // vendor-support preset
  assert.deepEqual(resolveVisibleAdminSections('ADMIN', ['vendors:review']), {
    vendors: true,
    products: false,
    orders: false,
    coupons: false,
  });

  // catalog-curator preset
  assert.deepEqual(
    resolveVisibleAdminSections('ADMIN', ['vendors:review', 'products:manage']),
    {
      vendors: true,
      products: true,
      orders: false,
      coupons: false,
    },
  );

  // operations preset
  assert.deepEqual(resolveVisibleAdminSections('ADMIN', ['coupons:manage', 'orders:manage']), {
    vendors: false,
    products: false,
    orders: true,
    coupons: true,
  });

  // an account with every permission sees every section
  assert.deepEqual(
    resolveVisibleAdminSections('ADMIN', [
      'vendors:review',
      'products:manage',
      'coupons:manage',
      'orders:manage',
    ]),
    {
      vendors: true,
      products: true,
      orders: true,
      coupons: true,
    },
  );
});

test('missing permissions fail closed', () => {
  // No permissions at all.
  assert.deepEqual(resolveVisibleAdminSections('ADMIN', []), {
    vendors: false,
    products: false,
    orders: false,
    coupons: false,
  });

  // No user object at all (still loading, or malformed session).
  assert.deepEqual(resolveVisibleAdminSections(undefined, undefined), {
    vendors: false,
    products: false,
    orders: false,
    coupons: false,
  });

  assert.equal(hasAdminPermission('ADMIN', undefined, 'orders:manage'), false);
  assert.equal(hasAdminPermission(undefined, ['orders:manage'], 'orders:manage'), false);
});

test('malformed or unknown permission data never grants a section', () => {
  // Unknown strings, wrong types, and nested structures are ignored.
  assert.deepEqual(
    sanitizeAdminPermissions([
      'orders:manage',
      'superuser',
      42,
      null,
      undefined,
      { permission: 'coupons:manage' },
      ['vendors:review'],
    ]),
    ['orders:manage'],
  );

  // Non-array values fail closed.
  assert.deepEqual(sanitizeAdminPermissions('orders:manage'), []);
  assert.deepEqual(sanitizeAdminPermissions(null), []);
  assert.deepEqual(sanitizeAdminPermissions(undefined), []);

  // An account with a malformed stored list sees no sections.
  assert.deepEqual(resolveVisibleAdminSections('ADMIN', sanitizeAdminPermissions('bogus')), {
    vendors: false,
    products: false,
    orders: false,
    coupons: false,
  });
});

test('non-administrator roles never receive administrative sections', () => {
  // Even with permission-looking data attached, customers and vendors are
  // rejected exactly like the backend requirePermission middleware.
  assert.equal(hasAdminPermission('CUSTOMER', ['orders:manage'], 'orders:manage'), false);
  assert.equal(hasAdminPermission('VENDOR', ['products:manage'], 'products:manage'), false);
  assert.deepEqual(resolveVisibleAdminSections('CUSTOMER', ['orders:manage']), {
    vendors: false,
    products: false,
    orders: false,
    coupons: false,
  });
});


test('successful verification exposes only the sections the server permits', () => {
  const managerReady = parseAdminVerificationResponse({
    user: {
      id: 'usr_m',
      email: 'manager@example.com',
      role: 'MANAGER',
      adminPermissions: ['vendors:review', 'products:manage', 'coupons:manage', 'orders:manage'],
    },
  });
  assert.deepEqual(managerReady, {
    phase: 'ready',
    role: 'MANAGER',
    permissions: ['vendors:review', 'products:manage', 'coupons:manage', 'orders:manage'],
  });
  assert.deepEqual(resolveSectionsForVerification(managerReady), {
    vendors: true,
    products: true,
    orders: true,
    coupons: true,
  });

  const adminReady = parseAdminVerificationResponse({
    user: {
      id: 'usr_a',
      email: 'admin@example.com',
      role: 'ADMIN',
      adminPermissions: ['vendors:review'],
    },
  });
  assert.deepEqual(resolveSectionsForVerification(adminReady), {
    vendors: true,
    products: false,
    orders: false,
    coupons: false,
  });
});

test('malformed verification payloads fail closed with a descriptive error', () => {
  const malformedPayloads: unknown[] = [
    null,
    {},
    { user: null },
    { user: {} },
    { user: { role: 'WIZARD' } },
  ];
  for (const payload of malformedPayloads) {
    const parsed = parseAdminVerificationResponse(payload);
    assert.equal(parsed.phase, 'failed');
    if (parsed.phase === 'failed') {
      assert.equal(typeof parsed.message, 'string');
      assert.match(parsed.message, /malformed/);
    }
    assert.deepEqual(resolveSectionsForVerification(parsed), {
      vendors: false,
      products: false,
      orders: false,
      coupons: false,
    });
  }
});

test('a failed re-verification drops previously granted sections', () => {
  const ready = parseAdminVerificationResponse({
    user: {
      id: 'usr_a',
      email: 'admin@example.com',
      role: 'ADMIN',
      adminPermissions: ['orders:manage', 'coupons:manage'],
    },
  });
  assert.equal(ready.phase, 'ready');
  if (ready.phase === 'ready') {
    assert.equal(resolveSectionsForVerification(ready).orders, true);
    assert.equal(resolveSectionsForVerification(ready).coupons, true);
  }

  const failed = adminVerificationFailed(new Error('network unavailable'));
  assert.deepEqual(failed, { phase: 'failed', message: 'network unavailable' });
  assert.deepEqual(resolveSectionsForVerification(failed), {
    vendors: false,
    products: false,
    orders: false,
    coupons: false,
  });
});

test('a successful retry after a failed verification restores the granted sections', () => {
  const failed = adminVerificationFailed(new TypeError('fetch failed'));
  assert.equal(resolveSectionsForVerification(failed).orders, false);

  const retried = parseAdminVerificationResponse({
    user: {
      id: 'usr_a',
      email: 'admin@example.com',
      role: 'ADMIN',
      adminPermissions: ['orders:manage'],
    },
  });
  assert.deepEqual(resolveSectionsForVerification(retried), {
    vendors: false,
    products: false,
    orders: true,
    coupons: false,
  });
});

test('verification parsing sanitizes unknown permission values', () => {
  const parsed = parseAdminVerificationResponse({
    user: { id: 'usr_a', role: 'ADMIN', adminPermissions: ['orders:manage', 'superuser', 42] },
  });
  assert.deepEqual(parsed, { phase: 'ready', role: 'ADMIN', permissions: ['orders:manage'] });
});

test('pending verification and non-Error failures stay fail closed', () => {
  assert.equal(ADMIN_VERIFICATION_PENDING.phase, 'pending');
  assert.deepEqual(resolveSectionsForVerification(ADMIN_VERIFICATION_PENDING), {
    vendors: false,
    products: false,
    orders: false,
    coupons: false,
  });

  const bare = adminVerificationFailed('boom');
  assert.equal(bare.phase, 'failed');
  if (bare.phase === 'failed') {
    assert.equal(bare.message, 'Unable to verify your administrator permissions.');
  }
});
