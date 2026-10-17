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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Parses the listing pagination object. A malformed pagination payload raises
 * a descriptive error instead of degrading to a fabricated result; a valid
 * empty listing stays a legitimate empty result.
 */
function requirePagination(value: unknown): AdminOrdersPagination {
  if (!isRecord(value)) {
    throw new Error('The orders response was malformed: the pagination object is missing.');
  }
  const { page, limit, total, totalPages } = value;
  if (
    typeof page !== 'number' ||
    typeof limit !== 'number' ||
    typeof total !== 'number' ||
    typeof totalPages !== 'number'
  ) {
    throw new Error('The orders response was malformed: pagination fields must all be numbers.');
  }
  return { page, limit, total, totalPages };
}

export const adminOrdersApi = {
  /** Paginated, filterable read-only order listing (requires `orders:manage`). */
  list: async (
    request: AdminRequest,
    query?: AdminOrdersQuery,
  ): Promise<{ orders: AdminOrderSummary[]; pagination: AdminOrdersPagination }> => {
    const payload = await request<{ orders?: unknown; pagination?: unknown }>(
      `/api/admin/orders${buildAdminOrdersQuery(query)}`,
    );
    // Malformed responses raise a descriptive error instead of degrading to a
    // fabricated result; a valid empty orders array stays a legitimate result.
    const ordersPayload = payload?.orders;
    if (!Array.isArray(ordersPayload)) {
      throw new Error('The orders response was malformed: the orders array is missing.');
    }
    const orders = ordersPayload.map((entry: unknown) => {
      if (
        !isRecord(entry) ||
        typeof entry.id !== 'string' ||
        typeof entry.orderNumber !== 'string'
      ) {
        throw new Error('The orders response was malformed: an entry is not a recognizable order.');
      }
      return entry as unknown as AdminOrderSummary;
    });
    return { orders, pagination: requirePagination(payload.pagination) };
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
    // Malformed responses raise a descriptive error instead of degrading to
    // an empty list; a valid empty coupons array stays a legitimate result.
    const couponsPayload = payload?.coupons;
    if (!Array.isArray(couponsPayload)) {
      throw new Error('The coupons response was malformed: the coupons array is missing.');
    }
    return couponsPayload.map((entry: unknown) => {
      if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.code !== 'string') {
        throw new Error('The coupons response was malformed: an entry is not a recognizable coupon.');
      }
      return entry as unknown as AdminCoupon;
    });
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
