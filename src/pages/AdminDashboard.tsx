import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import {
  ADMIN_VERIFICATION_PENDING,
  adminVerificationFailed,
  parseAdminVerificationResponse,
  resolveSectionsForVerification,
  type AdminPermissionVerification,
  type AdminSectionId,
} from '../config/adminPermissions';
import { adminCouponsApi, adminOrdersApi, type CouponDraft } from '../services/admin/adminApi';
import type {
  AdminCoupon,
  AdminCouponType,
  AdminOrder,
  AdminOrderStatus,
  AdminOrderSummary,
  AdminOrdersPagination,
  AdminPaymentStatus,
  Product,
} from '../types';

type VendorApplication = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  storeName: string;
  storeDescription: string;
  status: string;
  role: string;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
  message?: string;
};

/**
 * API error carrying the HTTP status so callers can separate expired sessions
 * (401), permission denials (403), and request-specific failures.
 */
class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

const ORDER_PAGE_SIZE = 10;
const OVERVIEW_RECENT_ORDERS = 5;

const ORDER_STATUSES: readonly AdminOrderStatus[] = [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

const PAYMENT_STATUSES: readonly AdminPaymentStatus[] = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
];

const COUPON_TYPES: readonly AdminCouponType[] = ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING'];

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  );
};

const formatMoney = (value?: number | null): string =>
  typeof value === 'number' && Number.isFinite(value) ? `$${value.toFixed(2)}` : '—';

const getErrorMessage = (payload: ApiErrorPayload, fallback: string): string =>
  payload.error?.message || payload.message || fallback;

const inputClassName =
  'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl ' +
  'focus:outline-none focus:ring-2 focus:ring-slate-900';

const couponValueLabel = (coupon: AdminCoupon): string => {
  if (coupon.type === 'PERCENTAGE') return `${coupon.value}% off`;
  if (coupon.type === 'FIXED') return `${formatMoney(coupon.value)} off`;
  return 'Free shipping';
};

const AccessDeniedPanel: React.FC = () => (
  <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm flex flex-col items-center text-center gap-2">
    <Lock className="w-7 h-7 text-slate-400" aria-hidden="true" />
    <h2 className="text-base font-black text-slate-900">Access restricted</h2>
    <p className="text-xs text-slate-500 max-w-sm">
      Your administrator account does not include the permission required for this section.
      Permissions are granted by the platform Manager and enforced by the API.
    </p>
  </div>
);

const LoadingPanel: React.FC<{ label: string }> = ({ label }) => (
  <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
    <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
    {label}
  </div>
);

const ErrorPanel: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col items-center text-center gap-3">
    <p className="text-xs font-bold text-red-600 max-w-md">{message}</p>
    <Button variant="outline" size="sm" onClick={onRetry}>
      Retry
    </Button>
  </div>
);

const EmptyPanel: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm text-center text-xs text-slate-500">
    {message}
  </div>
);

export const AdminDashboard: React.FC = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const updateUserProfile = useAuthStore((state) => state.updateUserProfile);
  const { addToast } = useUIStore();

  const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

  const [activeTab, setActiveTab] = useState<'overview' | AdminSectionId>('overview');
  const [sessionExpired, setSessionExpired] = useState(false);
  // Server-verified permissions: until /api/auth/me succeeds, no
  // administrative section renders (fail closed, including verification errors).
  const [verification, setVerification] = useState<AdminPermissionVerification>(
    ADMIN_VERIFICATION_PENDING,
  );
  // Bumping this state re-runs the verification effect (retry action).
  const [verificationTick, setVerificationTick] = useState(0);

  // Vendor applications (vendors:review)
  const [vendorsList, setVendorsList] = useState<VendorApplication[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsError, setVendorsError] = useState<string | null>(null);
  const [vendorsDenied, setVendorsDenied] = useState(false);
  const [vendorsTick, setVendorsTick] = useState(0);
  const [reviewingVendorId, setReviewingVendorId] = useState<string | null>(null);

  // Catalog listings (products:manage)
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsDenied, setProductsDenied] = useState(false);
  const [productsTick, setProductsTick] = useState(0);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);

  // Orders listing (orders:manage, read-only)
  const [ordersList, setOrdersList] = useState<AdminOrderSummary[]>([]);
  const [ordersPagination, setOrdersPagination] = useState<AdminOrdersPagination | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersDenied, setOrdersDenied] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<'' | AdminOrderStatus>('');
  const [ordersPaymentFilter, setOrdersPaymentFilter] = useState<'' | AdminPaymentStatus>('');
  const [orderNumberDraft, setOrderNumberDraft] = useState('');
  const [orderNumberFilter, setOrderNumberFilter] = useState('');
  const [ordersTick, setOrdersTick] = useState(0);

  // Order detail modal
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Overview summary (orders:manage)
  const [overviewOrders, setOverviewOrders] = useState<AdminOrderSummary[]>([]);
  const [overviewTotalOrders, setOverviewTotalOrders] = useState<number | null>(null);
  const [overviewOrdersError, setOverviewOrdersError] = useState<string | null>(null);
  const [overviewTick, setOverviewTick] = useState(0);

  // Coupons (coupons:manage)
  const [couponsList, setCouponsList] = useState<AdminCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponsError, setCouponsError] = useState<string | null>(null);
  const [couponsDenied, setCouponsDenied] = useState(false);
  const [couponsTick, setCouponsTick] = useState(0);
  const [togglingCouponId, setTogglingCouponId] = useState<string | null>(null);

  // Coupon creation modal
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<AdminCouponType>('PERCENTAGE');
  const [newValue, setNewValue] = useState('');
  const [newMinSpend, setNewMinSpend] = useState('');
  const [newMaxDiscount, setNewMaxDiscount] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newValidFrom, setNewValidFrom] = useState('');
  const [newValidUntil, setNewValidUntil] = useState('');
  const [newUsageLimit, setNewUsageLimit] = useState('');

  // Permissions come only from the server-verified /api/auth/me response;
  // persisted or stale grants are never used to expose a section.
  const grantedPermissions = verification.phase === 'ready' ? verification.permissions : [];

  // Server-verified permissions mirror the backend `requirePermission` model:
  // the MANAGER passes every check, an ADMIN passes only with granted
  // permissions, and any other role fails closed. Pending and failed
  // verification hide every section.
  const visibleSections = useMemo(
    () => resolveSectionsForVerification(verification),
    [verification],
  );

  const isTabVisible = (tab: 'overview' | AdminSectionId): boolean =>
    tab === 'overview' || visibleSections[tab];

  // A tab can only be deactivated while it is already active, so the fallback
  // keeps an unauthorized selection from rendering restricted content.
  const effectiveTab: 'overview' | AdminSectionId = isTabVisible(activeTab)
    ? activeTab
    : 'overview';

  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      if (!accessToken) {
        throw new AdminApiError(401, 'Your session has expired. Please sign in again.');
      }
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${accessToken}`);
      if (init.body !== undefined && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
      const payload = (await response.json().catch(() => ({}))) as
        (T & ApiErrorPayload) | ApiErrorPayload;
      if (!response.ok) {
        throw new AdminApiError(
          response.status,
          getErrorMessage(
            payload as ApiErrorPayload,
            `Request failed with status ${response.status}.`,
          ),
        );
      }
      return payload as T;
    },
    [accessToken, apiBaseUrl],
  );

  // Verify the account through `/api/auth/me` before any administrative section
  // renders. Only a verified server response can expose a section: pending and
  // failed verification (network, server, or malformed-response errors) keeps
  // the dashboard fail-closed behind a retryable error state. The backend
  // still enforces every permission check on each request.
  useEffect(() => {
    if (!accessToken) {
      setSessionExpired(true);
      return;
    }
    let cancelled = false;
    setVerification(ADMIN_VERIFICATION_PENDING);
    fetch(`${apiBaseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (response) => {
        const payload = (await response
          .json()
          .catch(() => ({}))) as ApiErrorPayload & { user?: unknown };
        if (response.status === 401) {
          if (!cancelled) setSessionExpired(true);
          return;
        }
        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload, 'Unable to verify your administrator permissions.'),
          );
        }
        if (!cancelled) {
          const next = parseAdminVerificationResponse(payload);
          if (next.phase === 'ready') {
            updateUserProfile({ role: next.role, adminPermissions: next.permissions });
          }
          setVerification(next);
        }
      })
      .catch((error: unknown) => {
        // Fail closed: without a verified server response, no administrative
        // section renders, and stale persisted permissions are never used.
        if (!cancelled) setVerification(adminVerificationFailed(error));
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, apiBaseUrl, updateUserProfile, verificationTick]);

  // Vendor applications: only fetched for accounts with vendors:review.
  useEffect(() => {
    if (verification.phase !== 'ready' || !visibleSections.vendors) {
      setVendorsList([]);
      return;
    }
    let cancelled = false;
    setVendorsLoading(true);
    setVendorsError(null);
    setVendorsDenied(false);
    request<{ applications?: unknown }>('/api/admin/vendors/applications?status=PENDING')
      .then((payload) => {
        if (cancelled) return;
        setVendorsList(
          Array.isArray(payload?.applications)
            ? (payload.applications as VendorApplication[])
            : [],
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof AdminApiError && error.status === 401) {
          setSessionExpired(true);
          return;
        }
        if (error instanceof AdminApiError && error.status === 403) {
          setVendorsDenied(true);
          return;
        }
        setVendorsError(
          error instanceof Error ? error.message : 'Unable to load vendor applications.',
        );
      })
      .finally(() => {
        if (!cancelled) setVendorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [verification.phase, visibleSections.vendors, request, vendorsTick]);

  // Catalog listings: only fetched for accounts with products:manage.
  useEffect(() => {
    if (verification.phase !== 'ready' || !visibleSections.products) {
      setProductsList([]);
      return;
    }
    let cancelled = false;
    setProductsLoading(true);
    setProductsError(null);
    setProductsDenied(false);
    request<{ products?: unknown }>('/api/products/mine')
      .then((payload) => {
        if (cancelled) return;
        setProductsList(Array.isArray(payload?.products) ? (payload.products as Product[]) : []);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof AdminApiError && error.status === 401) {
          setSessionExpired(true);
          return;
        }
        if (error instanceof AdminApiError && error.status === 403) {
          setProductsDenied(true);
          return;
        }
        setProductsError(error instanceof Error ? error.message : 'Unable to load products.');
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [verification.phase, visibleSections.products, request, productsTick]);

  // Orders: only fetched for accounts with orders:manage. The per-effect
  // cancellation flag keeps a stale response from overwriting newer results.
  useEffect(() => {
    if (verification.phase !== 'ready' || !visibleSections.orders) {
      setOrdersList([]);
      setOrdersPagination(null);
      return;
    }
    let cancelled = false;
    setOrdersLoading(true);
    setOrdersError(null);
    setOrdersDenied(false);
    adminOrdersApi
      .list(request, {
        page: ordersPage,
        limit: ORDER_PAGE_SIZE,
        status: ordersStatusFilter || undefined,
        paymentStatus: ordersPaymentFilter || undefined,
        orderNumber: orderNumberFilter || undefined,
      })
      .then((result) => {
        if (cancelled) return;
        setOrdersList(result.orders);
        setOrdersPagination(result.pagination);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof AdminApiError && error.status === 401) {
          setSessionExpired(true);
          return;
        }
        if (error instanceof AdminApiError && error.status === 403) {
          setOrdersDenied(true);
          return;
        }
        setOrdersError(error instanceof Error ? error.message : 'Unable to load orders.');
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    verification.phase,
    visibleSections.orders,
    request,
    ordersPage,
    ordersStatusFilter,
    ordersPaymentFilter,
    orderNumberFilter,
    ordersTick,
  ]);

  // Overview summary: a small, unfiltered read of the order API for the
  // overview cards. Truthful counts only; no fabricated metrics.
  useEffect(() => {
    if (verification.phase !== 'ready' || !visibleSections.orders) {
      setOverviewOrders([]);
      setOverviewTotalOrders(null);
      return;
    }
    let cancelled = false;
    setOverviewOrdersError(null);
    adminOrdersApi
      .list(request, { limit: OVERVIEW_RECENT_ORDERS })
      .then((result) => {
        if (cancelled) return;
        setOverviewOrders(result.orders);
        setOverviewTotalOrders(result.pagination?.total ?? null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof AdminApiError && error.status === 401) {
          setSessionExpired(true);
          return;
        }
        setOverviewOrders([]);
        setOverviewTotalOrders(null);
        setOverviewOrdersError(error instanceof Error ? error.message : 'Unable to load orders.');
      });
    return () => {
      cancelled = true;
    };
  }, [verification.phase, visibleSections.orders, request, overviewTick]);

  // Coupons: only fetched for accounts with coupons:manage.
  useEffect(() => {
    if (verification.phase !== 'ready' || !visibleSections.coupons) {
      setCouponsList([]);
      return;
    }
    let cancelled = false;
    setCouponsLoading(true);
    setCouponsError(null);
    setCouponsDenied(false);
    adminCouponsApi
      .list(request)
      .then((coupons) => {
        if (!cancelled) setCouponsList(coupons);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof AdminApiError && error.status === 401) {
          setSessionExpired(true);
          return;
        }
        if (error instanceof AdminApiError && error.status === 403) {
          setCouponsDenied(true);
          return;
        }
        setCouponsError(error instanceof Error ? error.message : 'Unable to load coupons.');
      })
      .finally(() => {
        if (!cancelled) setCouponsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [verification.phase, visibleSections.coupons, request, couponsTick]);

  const handleReviewVendorApplication = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    if (!accessToken || reviewingVendorId) return;
    setReviewingVendorId(id);
    try {
      const payload = await request<{
        application?: { storeName?: string };
      }>(`/api/admin/vendors/applications/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ decision }),
      });
      setVendorsList((applications) =>
        applications.filter((application) => application.id !== id),
      );
      addToast(
        `${payload.application?.storeName || 'Store'} application ${decision.toLowerCase()}.`,
        'success',
      );
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setSessionExpired(true);
        return;
      }
      if (error instanceof AdminApiError && error.status === 403) {
        setVendorsDenied(true);
        addToast('You do not have permission to review vendor applications.', 'error');
        return;
      }
      addToast(
        error instanceof Error ? error.message : 'Unable to review vendor application.',
        'error',
      );
    } finally {
      setReviewingVendorId(null);
    }
  };

  const handleToggleProductFeatured = async (id: string) => {
    const product = productsList.find((item) => item.id === id);
    if (!product || !accessToken || togglingProductId) return;
    setTogglingProductId(id);
    try {
      const payload = await request<{ product?: Product }>(
        `/api/products/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isFeatured: !product.isFeatured }),
        },
      );
      const updatedProduct = payload.product;
      if (!updatedProduct) {
        throw new Error('The product update response was malformed.');
      }
      // The catalog row is replaced by the server-returned product only.
      setProductsList((items) =>
        items.map((item) => (item.id === id ? updatedProduct : item)),
      );
      addToast(`"${product.title}" featured status saved.`, 'success');
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setSessionExpired(true);
        return;
      }
      addToast(error instanceof Error ? error.message : 'Unable to update product.', 'error');
    } finally {
      setTogglingProductId(null);
    }
  };

  const openOrderDetail = async (id: string) => {
    if (!accessToken || detailLoading) return;
    setDetailOrderId(id);
    setDetailOrder(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const order = await adminOrdersApi.getDetail(request, id);
      setDetailOrder(order);
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setSessionExpired(true);
        return;
      }
      setDetailError(error instanceof Error ? error.message : 'Unable to load the order.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeOrderDetail = () => {
    setDetailOrderId(null);
    setDetailOrder(null);
    setDetailError(null);
  };

  const applyOrderFilters = (event: React.FormEvent) => {
    event.preventDefault();
    setOrdersPage(1);
    setOrderNumberFilter(orderNumberDraft.trim());
  };

  const clearOrderFilters = () => {
    setOrdersPage(1);
    setOrdersStatusFilter('');
    setOrdersPaymentFilter('');
    setOrderNumberDraft('');
    setOrderNumberFilter('');
  };

  const handleCreateCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessToken || creatingCoupon) return;
    const code = newCode.trim();
    if (!code || !newValidUntil) {
      addToast('Provide a coupon code and a valid-until date.', 'error');
      return;
    }
    const validUntil = new Date(newValidUntil);
    if (Number.isNaN(validUntil.getTime())) {
      addToast('validUntil must be a valid date.', 'error');
      return;
    }
    if (newType !== 'FREE_SHIPPING' && !Number.isFinite(Number(newValue))) {
      addToast('PERCENTAGE and FIXED coupons require a discount value.', 'error');
      return;
    }
    const optionalNumber = (raw: string): number | undefined => {
      const trimmed = raw.trim();
      if (trimmed === '') return undefined;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    // The server re-validates every field; this only builds the documented body.
    const draft: CouponDraft = {
      code,
      type: newType,
      value: newType === 'FREE_SHIPPING' ? undefined : Number(newValue),
      minPurchaseAmount: optionalNumber(newMinSpend),
      maxDiscount: newType === 'PERCENTAGE' ? optionalNumber(newMaxDiscount) : undefined,
      description: newDescription.trim() || undefined,
      validFrom: newValidFrom ? new Date(newValidFrom).toISOString() : undefined,
      validUntil: validUntil.toISOString(),
      usageLimit: optionalNumber(newUsageLimit),
    };
    setCreatingCoupon(true);
    try {
      const coupon = await adminCouponsApi.create(request, draft);
      setCouponsList((current) => [coupon, ...current]);
      setIsCouponModalOpen(false);
      setNewCode('');
      setNewValue('');
      setNewMinSpend('');
      setNewMaxDiscount('');
      setNewDescription('');
      setNewValidFrom('');
      setNewValidUntil('');
      setNewUsageLimit('');
      addToast(`Coupon "${coupon.code}" created.`, 'success');
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setSessionExpired(true);
        return;
      }
      addToast(error instanceof Error ? error.message : 'Unable to create coupon.', 'error');
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleToggleCoupon = async (coupon: AdminCoupon) => {
    if (!accessToken || togglingCouponId) return;
    setTogglingCouponId(coupon.id);
    try {
      // The list is updated from the server response only; a failed request
      // leaves the previous state untouched.
      const updated = await adminCouponsApi.toggleActive(request, coupon);
      setCouponsList((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      addToast(`Coupon "${updated.code}" ${updated.isActive ? 'enabled' : 'disabled'}.`, 'success');
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setSessionExpired(true);
        return;
      }
      addToast(error instanceof Error ? error.message : 'Unable to update the coupon.', 'error');
    } finally {
      setTogglingCouponId(null);
    }
  };

  const resetCouponModal = () => {
    setIsCouponModalOpen(false);
    setNewCode('');
    setNewType('PERCENTAGE');
    setNewValue('');
    setNewMinSpend('');
    setNewMaxDiscount('');
    setNewDescription('');
    setNewValidFrom('');
    setNewValidUntil('');
    setNewUsageLimit('');
  };

  if (sessionExpired) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 max-w-md text-center space-y-4 shadow-sm">
          <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
          <h1 className="text-xl font-black text-slate-900">Session expired</h1>
          <p className="text-xs text-slate-500">
            Your administrator session is no longer active. Please sign in again to continue.
          </p>
          <Link to="/admin/login" className="inline-block">
            <Button size="sm">Return to admin sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (verification.phase === 'pending') {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-slate-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Verifying administrator permissions…
        </div>
      </div>
    );
  }

  if (verification.phase === 'failed') {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 max-w-md text-center space-y-4 shadow-sm">
          <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
          <h1 className="text-xl font-black text-slate-900">
            Permissions could not be verified
          </h1>
          <p className="text-xs text-slate-500">{verification.message}</p>
          <p className="text-xs text-slate-400">
            Administrative sections stay hidden until the API confirms your permissions. The API
            remains the authoritative permission check.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVerificationTick((tick) => tick + 1)}
          >
            Retry verification
          </Button>
        </div>
      </div>
    );
  }

  const hasAnyAdminAccess = Object.values(visibleSections).some(Boolean);

  const sidebarTabClassName = (tab: 'overview' | AdminSectionId): string =>
    `w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left ${
      effectiveTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 hover:text-white'
    }`;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] bg-slate-50">
      {/* Admin Sidebar */}
      <aside className="w-full lg:w-64 bg-slate-950 text-slate-300 p-6 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-md">
              A
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Rudin Control</h2>
              <Badge variant="primary" size="sm">
                {verification.role === 'MANAGER' ? 'MANAGER' : 'ADMIN'}
              </Badge>
            </div>
          </div>

          <nav className="space-y-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={sidebarTabClassName('overview')}
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4" /> Platform Overview
              </div>
            </button>
            {visibleSections.vendors && (
              <button
                type="button"
                onClick={() => setActiveTab('vendors')}
                className={sidebarTabClassName('vendors')}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" /> Stores &amp; Makers
                </div>
                <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                  {vendorsList.length}
                </span>
              </button>
            )}
            {visibleSections.products && (
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={sidebarTabClassName('products')}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4" /> Global Catalog
                </div>
                <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                  {productsList.length}
                </span>
              </button>
            )}
            {visibleSections.orders && (
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={sidebarTabClassName('orders')}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4" /> All Orders
                </div>
                <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                  {ordersPagination ? ordersPagination.total : '…'}
                </span>
              </button>
            )}
            {visibleSections.coupons && (
              <button
                type="button"
                onClick={() => setActiveTab('coupons')}
                className={sidebarTabClassName('coupons')}
              >
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4" /> Promo Campaigns
                </div>
                <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                  {couponsList.length}
                </span>
              </button>
            )}
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-900 text-[11px] text-slate-500 space-y-1">
          <p className="text-slate-400 font-bold uppercase tracking-wider">Granted permissions</p>
          <p>
            {verification.role === 'MANAGER'
              ? 'Full platform access (Manager)'
              : grantedPermissions.length
                ? grantedPermissions.join(', ')
                : 'No administrative permissions'}
          </p>
          <p className="pt-2 text-slate-600">Permissions are enforced by the API.</p>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
        {/* TAB 1: OVERVIEW */}
        {effectiveTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                Marketplace Administration
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Vendor onboarding, catalog moderation, and operational visibility. Every figure
                below comes from the live API for the sections your account is permitted to use.
              </p>
            </div>

            {!hasAnyAdminAccess && (
              <EmptyPanel message="Your account does not currently include any administrative permissions. The platform Manager grants permissions from the Manager Console." />
            )}

            {/* Truthful, permission-gated summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {visibleSections.vendors && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold text-slate-400">
                    Pending Applications
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">
                    {vendorsLoading ? 'Loading…' : vendorsList.length}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400 mt-1 inline-block">
                    Vendor applications awaiting review
                  </span>
                </div>
              )}

              {visibleSections.products && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold text-slate-400">Catalog Listings</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">
                    {productsLoading ? 'Loading…' : productsList.length}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400 mt-1 inline-block">
                    Products visible to catalog managers
                  </span>
                </div>
              )}

              {visibleSections.orders && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold text-slate-400">Platform Orders</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">
                    {overviewTotalOrders ?? '—'}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400 mt-1 inline-block">
                    Total orders recorded by the API
                  </span>
                </div>
              )}

              {visibleSections.coupons && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold text-slate-400">Coupon Codes</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">
                    {couponsLoading ? 'Loading…' : couponsList.length}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400 mt-1 inline-block">
                    Coupon codes in the management listing
                  </span>
                </div>
              )}
            </div>

            {/* Recent orders: real API data, orders:manage only */}
            {visibleSections.orders && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Recent Orders</h3>
                  {overviewOrdersError && (
                    <button
                      type="button"
                      onClick={() => setOverviewTick((tick) => tick + 1)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Retry
                    </button>
                  )}
                </div>
                {overviewOrdersError ? (
                  <p className="text-xs text-red-600">{overviewOrdersError}</p>
                ) : overviewOrders.length === 0 ? (
                  <p className="text-xs text-slate-500">No orders have been recorded yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-400 font-semibold border-b border-slate-100">
                        <tr>
                          <th className="py-2.5">Order No</th>
                          <th className="py-2.5">Account</th>
                          <th className="py-2.5">Items</th>
                          <th className="py-2.5">Total</th>
                          <th className="py-2.5">Payment</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5 text-right">Detail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {overviewOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50">
                            <td className="py-3 font-mono font-bold text-slate-900">
                              {order.orderNumber}
                            </td>
                            <td className="py-3 font-mono text-slate-500">{order.userId}</td>
                            <td className="py-3">{order.items.length} items</td>
                            <td className="py-3 font-bold text-slate-900">
                              {formatMoney(order.total)}
                            </td>
                            <td className="py-3">{order.paymentStatus}</td>
                            <td className="py-3">
                              <Badge
                                variant={order.status === 'DELIVERED' ? 'success' : 'primary'}
                                size="sm"
                              >
                                {order.status}
                              </Badge>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                type="button"
                                onClick={() => void openOrderDetail(order.id)}
                                className="font-bold text-blue-600 hover:underline"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VENDORS */}
        {effectiveTab === 'vendors' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Vendor Applications</h1>
              <p className="mt-1 text-xs text-slate-500">
                Approve an application to grant vendor access. Rejected applicants remain
                customers. Requires the vendors:review permission.
              </p>
            </div>
            {!visibleSections.vendors || vendorsDenied ? (
              <AccessDeniedPanel />
            ) : vendorsLoading ? (
              <LoadingPanel label="Loading vendor applications…" />
            ) : vendorsError ? (
              <ErrorPanel message={vendorsError} onRetry={() => setVendorsTick((tick) => tick + 1)} />
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-4">Store</th>
                      <th className="p-4">Applicant</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {vendorsList.map((application) => (
                      <tr key={application.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-900">{application.storeName}</td>
                        <td className="p-4">
                          <div className="font-semibold">
                            {application.firstName} {application.lastName}
                          </div>
                          <div className="text-[11px] text-slate-500">{application.email}</div>
                        </td>
                        <td className="p-4 max-w-sm">
                          {application.storeDescription || 'No description supplied.'}
                        </td>
                        <td className="p-4">
                          <Badge variant="warning" size="sm">
                            {application.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right space-x-3">
                          <button
                            type="button"
                            disabled={reviewingVendorId !== null}
                            onClick={() =>
                              void handleReviewVendorApplication(application.id, 'APPROVED')
                            }
                            className="font-bold text-xs text-emerald-600 hover:underline disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={reviewingVendorId !== null}
                            onClick={() =>
                              void handleReviewVendorApplication(application.id, 'REJECTED')
                            }
                            className="font-bold text-xs text-red-600 hover:underline disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                    {vendorsList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          No pending vendor applications.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PRODUCTS */}
        {effectiveTab === 'products' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-black text-slate-900">Catalog Moderation</h1>
            {!visibleSections.products || productsDenied ? (
              <AccessDeniedPanel />
            ) : productsLoading ? (
              <LoadingPanel label="Loading catalog…" />
            ) : productsError ? (
              <ErrorPanel
                message={productsError}
                onRetry={() => setProductsTick((tick) => tick + 1)}
              />
            ) : productsList.length === 0 ? (
              <EmptyPanel message="No products are visible to your account." />
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-4">Product</th>
                      <th className="p-4">Maker</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Rating</th>
                      <th className="p-4">Featured Status</th>
                      <th className="p-4 text-right">Curator Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {productsList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-900">{p.title}</td>
                        <td className="p-4">{p.brandName ?? '—'}</td>
                        <td className="p-4 font-bold">{formatMoney(p.price)}</td>
                        <td className="p-4">{p.rating} ★</td>
                        <td className="p-4">
                          {p.isFeatured ? (
                            <Badge variant="purple" size="sm">
                              Homepage Featured
                            </Badge>
                          ) : (
                            <span className="text-slate-400">Standard</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            disabled={togglingProductId !== null}
                            onClick={() => void handleToggleProductFeatured(p.id)}
                            className="font-bold text-xs text-blue-600 hover:underline disabled:opacity-50"
                          >
                            {togglingProductId === p.id
                              ? 'Saving…'
                              : p.isFeatured
                                ? 'Unfeature'
                                : 'Feature on Home'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ORDERS */}
        {effectiveTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900">All Marketplace Orders</h1>
              <p className="mt-1 text-xs text-slate-500">
                Read-only order visibility from the operations API. Payment and fulfillment
                transitions are not part of the current contract.
              </p>
            </div>
            {!visibleSections.orders || ordersDenied ? (
              <AccessDeniedPanel />
            ) : (
              <>
                <form
                  onSubmit={applyOrderFilters}
                  className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-wrap gap-3 items-end"
                >
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </span>
                    <select
                      value={ordersStatusFilter}
                      onChange={(event) =>
                        setOrdersStatusFilter(event.target.value as '' | AdminOrderStatus)
                      }
                      className={`${inputClassName} bg-white min-w-36`}
                    >
                      <option value="">All statuses</option>
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Payment
                    </span>
                    <select
                      value={ordersPaymentFilter}
                      onChange={(event) =>
                        setOrdersPaymentFilter(event.target.value as '' | AdminPaymentStatus)
                      }
                      className={`${inputClassName} bg-white min-w-36`}
                    >
                      <option value="">All payments</option>
                      {PAYMENT_STATUSES.map((payment) => (
                        <option key={payment} value={payment}>
                          {payment}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5 flex-1 min-w-48">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Order number
                    </span>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={orderNumberDraft}
                        onChange={(event) => setOrderNumberDraft(event.target.value)}
                        placeholder="e.g. RD-ABC"
                        className={`${inputClassName} pl-8`}
                      />
                    </div>
                  </label>
                  <Button type="submit" size="sm" className="gap-2">
                    <Search className="w-3.5 h-3.5" aria-hidden="true" />
                    Apply
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearOrderFilters}
                    disabled={ordersLoading}
                  >
                    Clear
                  </Button>
                </form>

                {ordersLoading ? (
                  <LoadingPanel label="Loading orders…" />
                ) : ordersError ? (
                  <ErrorPanel
                    message={ordersError}
                    onRetry={() => setOrdersTick((tick) => tick + 1)}
                  />
                ) : ordersList.length === 0 ? (
                  <EmptyPanel message="No orders match the current filters." />
                ) : (
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="p-4">Order No</th>
                          <th className="p-4">Account</th>
                          <th className="p-4">Items</th>
                          <th className="p-4">Total</th>
                          <th className="p-4">Payment</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Updated</th>
                          <th className="p-4 text-right">Detail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {ordersList.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50">
                            <td className="p-4 font-mono font-bold text-slate-900">
                              {order.orderNumber}
                            </td>
                            <td className="p-4 font-mono text-slate-500">{order.userId}</td>
                            <td className="p-4">{order.items.length} items</td>
                            <td className="p-4 font-bold text-slate-900">
                              {formatMoney(order.total)}
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={
                                  order.paymentStatus === 'PAID'
                                    ? 'success'
                                    : order.paymentStatus === 'FAILED'
                                      ? 'danger'
                                      : 'warning'
                                }
                                size="sm"
                              >
                                {order.paymentStatus}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={order.status === 'DELIVERED' ? 'success' : 'primary'}
                                size="sm"
                              >
                                {order.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-slate-500">{formatDate(order.updatedAt)}</td>
                            <td className="p-4 text-right">
                              <button
                                type="button"
                                onClick={() => void openOrderDetail(order.id)}
                                className="font-bold text-blue-600 hover:underline"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {ordersPagination && (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                    <span>
                      Page {ordersPagination.page} of {Math.max(ordersPagination.totalPages, 1)} ·{' '}
                      {ordersPagination.total} order(s) match the current filters.
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={ordersLoading || ordersPagination.page <= 1}
                        onClick={() => setOrdersPage((page) => Math.max(1, page - 1))}
                        className="gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          ordersLoading || ordersPagination.page >= ordersPagination.totalPages
                        }
                        onClick={() => setOrdersPage((page) => page + 1)}
                        className="gap-1"
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 5: COUPONS */}
        {effectiveTab === 'coupons' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Promotions &amp; Coupons</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Manage coupon codes through the coupon API. Codes are immutable after creation.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setIsCouponModalOpen(true)}
                className="gap-2 text-xs font-bold"
              >
                <Plus className="w-4 h-4" /> Create Coupon
              </Button>
            </div>

            {!visibleSections.coupons || couponsDenied ? (
              <AccessDeniedPanel />
            ) : couponsLoading ? (
              <LoadingPanel label="Loading coupons…" />
            ) : couponsError ? (
              <ErrorPanel
                message={couponsError}
                onRetry={() => setCouponsTick((tick) => tick + 1)}
              />
            ) : couponsList.length === 0 ? (
              <EmptyPanel message="No coupons exist yet. Create the first coupon to run a promotion." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {couponsList.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3 relative flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono font-black text-base text-slate-900 tracking-wider">
                          {coupon.code}
                        </span>
                        <Badge variant={coupon.isActive ? 'success' : 'danger'} size="sm">
                          {coupon.isActive ? 'ACTIVE' : 'DISABLED'}
                        </Badge>
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        {couponValueLabel(coupon)}
                      </p>
                      {coupon.description && (
                        <p className="text-xs text-slate-500 mt-1">{coupon.description}</p>
                      )}
                      <div className="text-[11px] text-slate-400 mt-2 space-y-0.5">
                        {coupon.minPurchaseAmount ? (
                          <p>Min spend: {formatMoney(coupon.minPurchaseAmount)}</p>
                        ) : null}
                        {coupon.type === 'PERCENTAGE' && coupon.maxDiscount ? (
                          <p>Max discount: {formatMoney(coupon.maxDiscount)}</p>
                        ) : null}
                        {coupon.validFrom ? <p>Valid from: {formatDate(coupon.validFrom)}</p> : null}
                        <p>Valid until: {formatDate(coupon.validUntil)}</p>
                        <p>
                          Used: {coupon.usedCount}
                          {coupon.usageLimit ? ` of ${coupon.usageLimit}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        disabled={togglingCouponId !== null}
                        onClick={() => void handleToggleCoupon(coupon)}
                        className="text-xs font-bold text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {togglingCouponId === coupon.id
                          ? 'Updating…'
                          : coupon.isActive
                            ? 'Disable Code'
                            : 'Enable Code'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Order Detail Modal (read-only) */}
      <Modal
        isOpen={detailOrderId !== null}
        onClose={closeOrderDetail}
        title={`Order ${detailOrder?.orderNumber ?? ''}`}
        maxWidth="2xl"
      >
        {detailLoading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
            Loading order…
          </div>
        ) : detailError ? (
          <div className="p-10 flex flex-col items-center gap-3 text-center">
            <p className="text-xs font-bold text-red-600">{detailError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (detailOrderId) void openOrderDetail(detailOrderId);
              }}
            >
              Retry
            </Button>
          </div>
        ) : detailOrder ? (
          <div className="p-6 space-y-5 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-mono font-bold text-sm text-slate-900">
                {detailOrder.orderNumber}
              </span>
              <div className="flex gap-2">
                <Badge
                  variant={detailOrder.status === 'DELIVERED' ? 'success' : 'primary'}
                  size="sm"
                >
                  {detailOrder.status}
                </Badge>
                <Badge
                  variant={
                    detailOrder.paymentStatus === 'PAID'
                      ? 'success'
                      : detailOrder.paymentStatus === 'FAILED'
                        ? 'danger'
                        : 'warning'
                  }
                  size="sm"
                >
                  {detailOrder.paymentStatus}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <p>
                Account: <span className="font-mono">{detailOrder.userId}</span>
              </p>
              <p>Payment method: {detailOrder.paymentMethod}</p>
              <p>Placed: {formatDate(detailOrder.createdAt)}</p>
              <p>Updated: {formatDate(detailOrder.updatedAt)}</p>
            </div>

            {detailOrder.couponRedemption && (
              <div className="rounded-xl bg-slate-50 p-3 text-slate-600">
                Coupon redeemed:{' '}
                <span className="font-mono font-bold">{detailOrder.couponRedemption.code}</span> ·
                Discount {formatMoney(detailOrder.couponRedemption.discount)} ·{' '}
                {formatDate(detailOrder.couponRedemption.redeemedAt)}
              </div>
            )}

            <div>
              <h4 className="font-bold text-slate-900 mb-2">Items</h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">Unit price</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Subtotal</th>
                      <th className="p-3">Vendor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {detailOrder.items.map((item, index) => (
                      <tr key={`${item.productId}-${item.variantId ?? index}`}>
                        <td className="p-3 font-semibold text-slate-900">{item.title}</td>
                        <td className="p-3">{formatMoney(item.unitPrice)}</td>
                        <td className="p-3">{item.quantity}</td>
                        <td className="p-3 font-bold">{formatMoney(item.subtotal)}</td>
                        <td className="p-3 font-mono text-slate-500">{item.vendorId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-2">Totals</h4>
              <div className="space-y-1 text-slate-600">
                <p>Subtotal: {formatMoney(detailOrder.subtotal)}</p>
                <p>Shipping: {formatMoney(detailOrder.shippingCost)}</p>
                <p>Tax: {formatMoney(detailOrder.tax)}</p>
                <p className="font-bold text-slate-900 text-sm">
                  Total: {formatMoney(detailOrder.total)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-2">Shipping address</h4>
              <div className="text-slate-600 space-y-0.5">
                <p>{detailOrder.shippingAddress.fullName}</p>
                <p>{detailOrder.shippingAddress.phone}</p>
                <p>
                  {detailOrder.shippingAddress.street1}
                  {detailOrder.shippingAddress.street2
                    ? `, ${detailOrder.shippingAddress.street2}`
                    : ''}
                </p>
                <p>
                  {detailOrder.shippingAddress.city}, {detailOrder.shippingAddress.state}{' '}
                  {detailOrder.shippingAddress.postalCode}
                </p>
                <p>{detailOrder.shippingAddress.country}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Read-only view. Payment and fulfillment transitions are not part of the current API
              contract.
            </p>
          </div>
        ) : null}
      </Modal>

      {/* Create Coupon Modal */}
      <Modal
        isOpen={isCouponModalOpen}
        onClose={resetCouponModal}
        title="Create Promotional Coupon"
        maxWidth="md"
      >
        <form onSubmit={handleCreateCoupon} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-900 mb-1">Coupon Code *</label>
            <input
              required
              type="text"
              placeholder="e.g. SUMMER20"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-mono uppercase font-bold"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              3-40 characters; letters, digits, hyphens, and underscores. Codes cannot be changed
              later.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Type *</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as AdminCouponType)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white"
              >
                {COUPON_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            {newType !== 'FREE_SHIPPING' && (
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  {newType === 'PERCENTAGE' ? 'Discount (%) *' : 'Discount ($) *'}
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-bold"
                />
              </div>
            )}
            {newType === 'PERCENTAGE' && (
              <div>
                <label className="block font-bold text-slate-900 mb-1">Max Discount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newMaxDiscount}
                  onChange={(e) => setNewMaxDiscount(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Min Spend ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newMinSpend}
                onChange={(e) => setNewMinSpend(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Usage Limit</label>
              <input
                type="number"
                min="1"
                step="1"
                value={newUsageLimit}
                onChange={(e) => setNewUsageLimit(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Leave empty for unlimited redemptions.
              </p>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Description</label>
            <input
              type="text"
              maxLength={200}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Valid From</label>
              <input
                type="datetime-local"
                value={newValidFrom}
                onChange={(e) => setNewValidFrom(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Valid Until *</label>
              <input
                required
                type="datetime-local"
                value={newValidUntil}
                onChange={(e) => setNewValidUntil(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Must be in the future; the server rejects expired dates.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetCouponModal}
              disabled={creatingCoupon}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={creatingCoupon}>
              Create Coupon
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
