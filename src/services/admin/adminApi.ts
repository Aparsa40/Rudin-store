import type {
  AdminCoupon,
  AdminOrder,
  AdminOrdersPagination,
  AdminOrdersQuery,
  AdminOrderSummary,
} from '../../types';

/**
 * Thin API module for the administrative orders and coupons endpoints.
 *
 * The transport (authentication, base URL, error mapping) is injected as a
 * `request` function so pages can reuse their own authenticated client, and
 * so the query-building and payload-parsing logic stays unit-testable without
 * a server. The backend remains authoritative: nothing here fabricates
 * server state, and a non-2xx response always propagates as an error.
 */

export type AdminRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

/** Builds the documented `GET /api/admin/orders` query string. */
export function buildAdminOrdersQuery(query: AdminOrdersQuery = {}): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.status) params.set('status', query.status);
  if (query.paymentStatus) params.set('paymentStatus', query.paymentStatus);
  if (query.userId) params.set('userId', query.userId);
  if (query.orderNumber) params.set('orderNumber', query.orderNumber);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

function asPagination(value: unknown): AdminOrdersPagination | null {
  if (typeof value !== 'object' || value === null) return null;
  return value as AdminOrdersPagination;
}

export const adminOrdersApi = {
  /** Paginated, filterable read-only order listing (requires `orders:manage`). */
  list: async (
    request: AdminRequest,
    query?: AdminOrdersQuery,
  ): Promise<{ orders: AdminOrderSummary[]; pagination: AdminOrdersPagination | null }> => {
    const payload = await request<{ orders?: unknown; pagination?: unknown }>(
      `/api/admin/orders${buildAdminOrdersQuery(query)}`,
    );
    // Malformed responses degrade to an empty result instead of fabricated orders.
    const orders = Array.isArray(payload?.orders) ? (payload.orders as AdminOrderSummary[]) : [];
    return { orders, pagination: asPagination(payload?.pagination) };
  },

  /** Full order detail including the shipping address (requires `orders:manage`). */
  getDetail: async (request: AdminRequest, id: string): Promise<AdminOrder> => {
    const payload = await request<{ order?: AdminOrder }>(
      `/api/admin/orders/${encodeURIComponent(id)}`,
    );
    if (!payload?.order) {
      throw new Error('The order detail response was malformed.');
    }
    return payload.order;
  },
};

export interface CouponDraft {
  code: string;
  type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
  value?: number;
  minPurchaseAmount?: number;
  maxDiscount?: number;
  description?: string;
  validFrom?: string;
  validUntil: string;
  usageLimit?: number;
}

/** Builds the `POST /api/coupons` body. The server re-validates every field. */
export function buildCouponCreateBody(draft: CouponDraft): Record<string, unknown> {
  const body: Record<string, unknown> = {
    code: draft.code.trim().toUpperCase(),
    type: draft.type,
    validUntil: draft.validUntil,
  };
  if (draft.type !== 'FREE_SHIPPING' && draft.value !== undefined) {
    body.value = draft.value;
  }
  if (draft.minPurchaseAmount !== undefined) {
    body.minPurchaseAmount = draft.minPurchaseAmount;
  }
  if (draft.type === 'PERCENTAGE' && draft.maxDiscount !== undefined) {
    body.maxDiscount = draft.maxDiscount;
  }
  if (draft.description !== undefined && draft.description.trim() !== '') {
    body.description = draft.description.trim();
  }
  if (draft.validFrom) {
    body.validFrom = draft.validFrom;
  }
  if (draft.usageLimit !== undefined) {
    body.usageLimit = draft.usageLimit;
  }
  return body;
}

export const adminCouponsApi = {
  /** Management listing (requires `coupons:manage`). */
  list: async (request: AdminRequest): Promise<AdminCoupon[]> => {
    const payload = await request<{ coupons?: unknown }>('/api/coupons');
    // Malformed responses degrade to an empty list instead of fabricated coupons.
    return Array.isArray(payload?.coupons) ? (payload.coupons as AdminCoupon[]) : [];
  },

  /** Creates a coupon through the server-side validation pipeline. */
  create: async (request: AdminRequest, draft: CouponDraft): Promise<AdminCoupon> => {
    const payload = await request<{ coupon?: AdminCoupon }>('/api/coupons', {
      method: 'POST',
      body: JSON.stringify(buildCouponCreateBody(draft)),
    });
    if (!payload?.coupon) {
      throw new Error('The coupon creation response was malformed.');
    }
    return payload.coupon;
  },

  /** Enables or disables a coupon through the supported `isActive` mutation. */
  toggleActive: async (request: AdminRequest, coupon: AdminCoupon): Promise<AdminCoupon> => {
    const payload = await request<{ coupon?: AdminCoupon }>(
      `/api/coupons/${encodeURIComponent(coupon.id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !coupon.isActive }),
      },
    );
    if (!payload?.coupon) {
      throw new Error('The coupon update response was malformed.');
    }
    return payload.coupon;
  },
};
