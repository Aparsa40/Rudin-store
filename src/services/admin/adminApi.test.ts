import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminCouponsApi,
  adminOrdersApi,
  buildAdminOrdersQuery,
  buildCouponCreateBody,
  type AdminRequest,
} from './adminApi.js';
import type { AdminCoupon } from '../../types';

/**
 * Fake transport that records every call and returns scripted payloads or
 * throws scripted errors, so the API module is tested without a server.
 */
function recordingRequest(
  handler: (path: string, init?: RequestInit) => unknown,
): { request: AdminRequest; calls: Array<{ path: string; init?: RequestInit }> } {
  const calls: Array<{ path: string; init?: RequestInit }> = [];
  const request = (async <T,>(path: string, init?: RequestInit): Promise<T> => {
    calls.push({ path, init });
    const result = handler(path, init);
    if (result instanceof Promise) return (await result) as T;
    if (result instanceof Error) throw result;
    return result as T;
  }) as AdminRequest;
  return { request, calls };
}

test('orders listing builds only documented query parameters', () => {
  assert.equal(buildAdminOrdersQuery(), '');
  assert.equal(buildAdminOrdersQuery({}), '');
  assert.equal(buildAdminOrdersQuery({ page: 1 }), '?page=1');
  assert.equal(buildAdminOrdersQuery({ page: 2, limit: 10, status: 'PENDING' }), '?page=2&limit=10&status=PENDING');
  assert.equal(
    buildAdminOrdersQuery({
      page: 3,
      limit: 20,
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      userId: 'usr_1',
      orderNumber: 'RD-ABC',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-02-01T00:00:00.000Z',
    }),
    '?page=3&limit=20&status=DELIVERED&paymentStatus=PAID&userId=usr_1&orderNumber=RD-ABC' +
      '&from=2026-01-01T00%3A00%3A00.000Z&to=2026-02-01T00%3A00%3A00.000Z',
  );
  // Empty-string filters are omitted; the backend must never receive them.
  assert.equal(buildAdminOrdersQuery({ status: undefined, orderNumber: '' }), '');
});

test('orders listing parses a successful paginated payload', async () => {
  const { request, calls } = recordingRequest(() => ({
    orders: [{ id: 'ord_1', orderNumber: 'RD-1' }],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  }));
  const result = await adminOrdersApi.list(request, { page: 1, limit: 10 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/api/admin/orders?page=1&limit=10');
  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0].id, 'ord_1');
  assert.deepEqual(result.pagination, { page: 1, limit: 10, total: 1, totalPages: 1 });
});

test('orders listing degrades a malformed payload to an empty result', async () => {
  const { request } = recordingRequest(() => ({ orders: 'not-an-array', pagination: 'nope' }));
  const result = await adminOrdersApi.list(request);
  assert.deepEqual(result, { orders: [], pagination: null });
});

test('order detail requires a well-formed server response', async () => {
  const { request } = recordingRequest(() => ({ order: { id: 'ord_1', orderNumber: 'RD-1' } }));
  const order = await adminOrdersApi.getDetail(request, 'ord_1');
  assert.equal(order.id, 'ord_1');

  const malformed = recordingRequest(() => ({}));
  await assert.rejects(adminOrdersApi.getDetail(malformed.request, 'ord_1'), /malformed/);
});

test('failed order requests propagate real errors and never fake success', async () => {
  const cases: Array<{ status: number; message: string }> = [
    { status: 401, message: 'A valid bearer token is required.' },
    { status: 403, message: 'You do not have permission to perform this action.' },
    { status: 400, message: 'Query parameter "page" is out of range.' },
  ];
  for (const failure of cases) {
    const { request } = recordingRequest(() => {
      const error = new Error(failure.message) as Error & { status?: number };
      error.status = failure.status;
      throw error;
    });
    await assert.rejects(
      adminOrdersApi.list(request, { page: 1 }),
      (error: unknown) =>
        error instanceof Error &&
        (error as Error & { status?: number }).status === failure.status &&
        error.message === failure.message,
    );
  }
});

test('coupon listing parses the server payload and degrades malformed responses', async () => {
  const coupons: AdminCoupon[] = [
    {
      id: 'cpn_1',
      code: 'SAVE5',
      type: 'FIXED',
      value: 5,
      minPurchaseAmount: null,
      maxDiscount: null,
      description: null,
      validFrom: null,
      validUntil: '2026-12-31T23:59:59.000Z',
      usageLimit: null,
      usedCount: 0,
      isActive: true,
    },
  ];
  const ok = recordingRequest(() => ({ coupons }));
  assert.deepEqual(await adminCouponsApi.list(ok.request), coupons);

  const malformed = recordingRequest(() => ({ coupons: { code: 'SAVE5' } }));
  assert.deepEqual(await adminCouponsApi.list(malformed.request), []);
});

test('coupon creation sends a normalized body and returns only the server coupon', async () => {
  const created: AdminCoupon = {
    id: 'cpn_new',
    code: 'SAVE20',
    type: 'PERCENTAGE',
    value: 20,
    minPurchaseAmount: 100,
    maxDiscount: 50,
    description: '20% off',
    validFrom: null,
    validUntil: '2026-12-31T23:59:59.000Z',
    usageLimit: 100,
    usedCount: 0,
    isActive: true,
  };
  const { request, calls } = recordingRequest(() => ({ coupon: created }));
  const result = await adminCouponsApi.create(request, {
    code: '  save20  ',
    type: 'PERCENTAGE',
    value: 20,
    minPurchaseAmount: 100,
    maxDiscount: 50,
    description: '  20% off  ',
    validUntil: '2026-12-31T23:59:59.000Z',
    usageLimit: 100,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/api/coupons');
  assert.equal(calls[0].init?.method, 'POST');
  const body = JSON.parse(String(calls[0].init?.body));
  // Codes are normalized client-side to the server's storage form.
  assert.equal(body.code, 'SAVE20');
  assert.equal(body.description, '20% off');
  assert.deepEqual(body, {
    code: 'SAVE20',
    type: 'PERCENTAGE',
    validUntil: '2026-12-31T23:59:59.000Z',
    value: 20,
    minPurchaseAmount: 100,
    maxDiscount: 50,
    description: '20% off',
    usageLimit: 100,
  });
  assert.equal(result.id, 'cpn_new');

  const malformed = recordingRequest(() => ({}));
  await assert.rejects(
    adminCouponsApi.create(malformed.request, {
      code: 'SAVE20',
      type: 'PERCENTAGE',
      value: 20,
      validUntil: '2026-12-31T23:59:59.000Z',
    }),
    /malformed/,
  );
});

test('a FREE_SHIPPING draft never sends a discount value', () => {
  const body = buildCouponCreateBody({
    code: 'freeship',
    type: 'FREE_SHIPPING',
    value: 20,
    validUntil: '2026-12-31T23:59:59.000Z',
  });
  assert.equal(body.code, 'FREESHIP');
  assert.equal(body.type, 'FREE_SHIPPING');
  assert.equal('value' in body, false);
});

test('a maxDiscount cap is only sent for PERCENTAGE coupons', () => {
  const percentage = buildCouponCreateBody({
    code: 'PCT',
    type: 'PERCENTAGE',
    value: 10,
    maxDiscount: 25,
    validUntil: '2026-12-31T23:59:59.000Z',
  });
  assert.equal(percentage.maxDiscount, 25);

  const fixed = buildCouponCreateBody({
    code: 'FIX',
    type: 'FIXED',
    value: 10,
    maxDiscount: 25,
    validUntil: '2026-12-31T23:59:59.000Z',
  });
  assert.equal('maxDiscount' in fixed, false);
});

test('toggling a coupon flips isActive through the supported PATCH mutation', async () => {
  const active: AdminCoupon = {
    id: 'cpn_1',
    code: 'SAVE5',
    type: 'FIXED',
    value: 5,
    validUntil: '2026-12-31T23:59:59.000Z',
    usedCount: 0,
    isActive: true,
  };
  const disabledOnServer: AdminCoupon = { ...active, isActive: false };
  const { request, calls } = recordingRequest(() => ({ coupon: disabledOnServer }));

  const result = await adminCouponsApi.toggleActive(request, active);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/api/coupons/cpn_1');
  assert.equal(calls[0].init?.method, 'PATCH');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { isActive: false });
  // The UI state must come from the server response, never from local guessing.
  assert.equal(result.isActive, false);
});

test('failed coupon mutations propagate the server error without fake success', async () => {
  const coupon: AdminCoupon = {
    id: 'cpn_1',
    code: 'SAVE5',
    type: 'FIXED',
    value: 5,
    validUntil: '2026-12-31T23:59:59.000Z',
    usedCount: 0,
    isActive: true,
  };
  const failures = [
    { status: 400, message: 'code must be 3-40 characters of letters, digits, hyphens, or underscores.' },
    { status: 409, message: 'A coupon with this code already exists.' },
    { status: 403, message: 'You do not have permission to perform this action.' },
    { status: 401, message: 'A valid bearer token is required.' },
  ];
  for (const failure of failures) {
    const { request } = recordingRequest(() => {
      const error = new Error(failure.message) as Error & { status?: number };
      error.status = failure.status;
      throw error;
    });
    await assert.rejects(adminCouponsApi.toggleActive(request, coupon), new RegExp(failure.message));
    await assert.rejects(
      adminCouponsApi.create(request, {
        code: 'SAVE5',
        type: 'FIXED',
        value: 5,
        validUntil: '2026-12-31T23:59:59.000Z',
      }),
      new RegExp(failure.message),
    );
  }
});
