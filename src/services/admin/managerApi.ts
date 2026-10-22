import type { AdminRequest } from './adminApi';

/**
 * Thin API module for the Manager console endpoints (metrics, the customer
 * directory, catalog oversight, audit history, and invitation resend).
 *
 * The transport (authentication, base URL, error mapping) is injected as a
 * `request` function exactly like adminApi.ts, so the page keeps its own
 * authenticated client and the query-building and payload-parsing logic stays
 * unit-testable without a server. The backend stays authoritative: nothing
 * here fabricates server state, and a non-2xx response always propagates as an
 * error.
 */

export type ManagerPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ManagerMetrics = {
  generatedAt: string;
  customers: { active: number; disabled: number };
  vendors: { total: number; applicationsPending: number };
  products: { draft: number; published: number; archived: number };
  orders: { byStatus: Record<string, number>; nonCancelled: number; revenue: number };
  coupons: { active: number };
};

export type ManagerCustomerStatus = 'ACTIVE' | 'DISABLED';

export type ManagerCustomer = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  status: ManagerCustomerStatus;
  createdAt: string;
  lastLoginAt: string | null;
  vendorApplicationStatus: string;
};

export type ManagerCustomersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ManagerCustomerStatus;
};

export type ManagerProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type ManagerProductSummary = {
  id: string;
  vendorId: string;
  categoryId: string;
  slug: string;
  title: string;
  brandName: string | null;
  price: number;
  status: ManagerProductStatus;
  stock: number;
  createdAt: string;
  updatedAt: string;
};

export type ManagerProductsQuery = {
  page?: number;
  limit?: number;
  status?: ManagerProductStatus;
  vendorId?: string;
  search?: string;
};

export type ManagerAuditLog = {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ManagerAuditLogsQuery = {
  page?: number;
  limit?: number;
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
};

export type ManagerResendResult = {
  invitation: {
    id: string;
    email: string;
    status: string;
    expiresAt: string;
  };
  message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Parses the shared pagination object. A malformed pagination payload raises a
 * descriptive error instead of degrading to a fabricated result; a valid empty
 * listing stays a legitimate empty result.
 */
function requirePagination(value: unknown, label: string): ManagerPagination {
  if (!isRecord(value)) {
    throw new Error(`The ${label} response was malformed: the pagination object is missing.`);
  }
  const { page, limit, total, totalPages } = value;
  if (
    typeof page !== 'number' ||
    typeof limit !== 'number' ||
    typeof total !== 'number' ||
    typeof totalPages !== 'number'
  ) {
    throw new Error(
      `The ${label} response was malformed: pagination fields must all be numbers.`,
    );
  }
  return { page, limit, total, totalPages };
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`The ${label} response was malformed: the ${label} array is missing.`);
  }
  return value;
}

function appendParams(params: URLSearchParams, query: Record<string, unknown>): string {
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string' && value.trim()) {
      params.set(key, value.trim());
    } else if (typeof value === 'number') {
      params.set(key, String(value));
    }
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

/** Builds the documented `GET /api/admin/customers` query string. */
export function buildManagerCustomersQuery(query: ManagerCustomersQuery = {}): string {
  return appendParams(new URLSearchParams(), {
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
  });
}

/** Builds the documented `GET /api/admin/products` query string. */
export function buildManagerProductsQuery(query: ManagerProductsQuery = {}): string {
  return appendParams(new URLSearchParams(), {
    page: query.page,
    limit: query.limit,
    status: query.status,
    vendorId: query.vendorId,
    search: query.search,
  });
}

/** Builds the documented `GET /api/admin/audit-logs` query string. */
export function buildManagerAuditLogsQuery(query: ManagerAuditLogsQuery = {}): string {
  return appendParams(new URLSearchParams(), {
    page: query.page,
    limit: query.limit,
    action: query.action,
    actorId: query.actorId,
    from: query.from,
    to: query.to,
  });
}

export const managerMetricsApi = {
  /** Server-computed platform snapshot (MANAGER-only). */
  get: async (request: AdminRequest): Promise<ManagerMetrics> => {
    const payload = await request<{ metrics?: unknown }>('/api/admin/metrics');
    const metrics = payload?.metrics;
    if (!isRecord(metrics)) {
      throw new Error('The metrics response was malformed: the metrics object is missing.');
    }
    return metrics as unknown as ManagerMetrics;
  },
};

export const managerCustomersApi = {
  /** Paginated customer directory with search and status filters (MANAGER-only). */
  list: async (
    request: AdminRequest,
    query?: ManagerCustomersQuery,
  ): Promise<{ customers: ManagerCustomer[]; pagination: ManagerPagination }> => {
    const payload = await request<{ customers?: unknown; pagination?: unknown }>(
      `/api/admin/customers${buildManagerCustomersQuery(query)}`,
    );
    const customers = requireArray(payload?.customers, 'customers').map((entry: unknown) => {
      if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.email !== 'string') {
        throw new Error('The customers response was malformed: an entry is not recognizable.');
      }
      return entry as unknown as ManagerCustomer;
    });
    return { customers, pagination: requirePagination(payload?.pagination, 'customers') };
  },

  /**
   * Enables or disables a CUSTOMER account. The server validates the target
   * role on every request, and both transitions revoke the customer's sessions.
   */
  setStatus: async (
    request: AdminRequest,
    id: string,
    status: ManagerCustomerStatus,
  ): Promise<ManagerCustomer> => {
    const payload = await request<{ customer?: ManagerCustomer }>(
      `/api/admin/customers/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
    );
    if (!payload?.customer || typeof payload.customer.id !== 'string') {
      throw new Error('The customer status response was malformed.');
    }
    return payload.customer;
  },
};

export const managerProductsApi = {
  /** Read-only cross-vendor catalog oversight (requires `products:manage`). */
  list: async (
    request: AdminRequest,
    query?: ManagerProductsQuery,
  ): Promise<{ products: ManagerProductSummary[]; pagination: ManagerPagination }> => {
    const payload = await request<{ products?: unknown; pagination?: unknown }>(
      `/api/admin/products${buildManagerProductsQuery(query)}`,
    );
    const products = requireArray(payload?.products, 'products').map((entry: unknown) => {
      if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.slug !== 'string') {
        throw new Error('The products response was malformed: an entry is not recognizable.');
      }
      return entry as unknown as ManagerProductSummary;
    });
    return { products, pagination: requirePagination(payload?.pagination, 'products') };
  },
};

export const managerAuditLogsApi = {
  /** Read-only audit history with exact-match and range filters (MANAGER-only). */
  list: async (
    request: AdminRequest,
    query?: ManagerAuditLogsQuery,
  ): Promise<{ logs: ManagerAuditLog[]; pagination: ManagerPagination }> => {
    const payload = await request<{ logs?: unknown; pagination?: unknown }>(
      `/api/admin/audit-logs${buildManagerAuditLogsQuery(query)}`,
    );
    const logs = requireArray(payload?.logs, 'logs').map((entry: unknown) => {
      if (
        !isRecord(entry) ||
        typeof entry.id !== 'string' ||
        typeof entry.action !== 'string' ||
        typeof entry.actorId !== 'string'
      ) {
        throw new Error('The audit logs response was malformed: an entry is not recognizable.');
      }
      return entry as unknown as ManagerAuditLog;
    });
    return { logs, pagination: requirePagination(payload?.pagination, 'logs') };
  },
};

export const managerInvitationsApi = {
  /**
   * Rotates and re-sends the one-time token of an invitation that is still in
   * the INVITED state. Any previous link becomes invalid immediately.
   */
  resend: async (request: AdminRequest, id: string): Promise<ManagerResendResult> => {
    const payload = await request<ManagerResendResult>(
      `/api/admin/invitations/${encodeURIComponent(id)}/resend`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );
    if (!payload?.invitation || typeof payload.invitation.id !== 'string') {
      throw new Error('The invitation resend response was malformed.');
    }
    return payload;
  },
};
