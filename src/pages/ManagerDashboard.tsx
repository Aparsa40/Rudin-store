import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Crown,
  MailPlus,
  Package,
  RefreshCw,
  ScrollText,
  Search,
  Send,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import {
  managerAuditLogsApi,
  managerCustomersApi,
  managerInvitationsApi,
  managerMetricsApi,
  managerProductsApi,
} from '../services/admin/managerApi';
import type {
  ManagerAuditLog,
  ManagerCustomer,
  ManagerCustomerStatus,
  ManagerMetrics,
  ManagerPagination,
  ManagerProductStatus,
  ManagerProductSummary,
} from '../services/admin/managerApi';
import { translate, useLanguageStore } from '../i18n';
import type { TranslateFn } from '../i18n';
import type { AdminPermission } from '../types';

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

type ApplicationFilter = 'PENDING' | 'APPROVED' | 'REJECTED';

type AdminAccount = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  status: 'ACTIVE' | 'DISABLED';
  permissions: AdminPermission[];
};

type AdminInvitationStatus =
  'INVITED' | 'EMAIL_VERIFIED' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'DISABLED';

type AdminInvitation = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  permissions: AdminPermission[];
  status: AdminInvitationStatus;
  createdAt: string;
  verifiedAt?: string;
  acceptedAt?: string;
  reviewedAt?: string;
  rejectedReason?: string;
};

type AdminPreset = 'vendor-support' | 'catalog-curator' | 'operations' | 'none' | 'custom';

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
  message?: string;
};

const presetsFromSelection = (preset: AdminPreset): string[] =>
  preset === 'none' || preset === 'custom' ? [] : [preset];

const selectionFromPermissions = (permissions: AdminPermission[] | undefined): AdminPreset => {
  const normalized = [...new Set(permissions ?? [])].sort().join(',');

  if (!normalized) return 'none';
  if (normalized === 'vendors:review') return 'vendor-support';
  if (normalized === 'products:manage,vendors:review') return 'catalog-curator';
  if (normalized === 'coupons:manage,orders:manage') return 'operations';

  // Preserve unfamiliar/custom permission sets until the manager explicitly
  // chooses a supported preset; never silently turn them into no permissions.
  return 'custom';
};

const INVITATION_STATUS_STYLES: Record<
  AdminInvitationStatus,
  'success' | 'danger' | 'warning' | 'secondary'
> = {
  INVITED: 'warning',
  EMAIL_VERIFIED: 'warning',
  PENDING_APPROVAL: 'warning',
  ACTIVE: 'success',
  REJECTED: 'danger',
  DISABLED: 'danger',
};

const formatDate = (value?: string): string => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

const getErrorMessage = (payload: ApiErrorPayload, fallback: string): string =>
  payload.error?.message || payload.message || fallback;

const inputClassName =
  'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl ' +
  'focus:outline-none focus:ring-2 focus:ring-slate-900';

export const ManagerDashboard: React.FC = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { addToast } = useUIStore();

  // Localization. `useTranslation()` recreates its `t` function on every
  // render, which would invalidate the data-loading `useCallback`
  // dependencies below and retrigger their effects on each render. A
  // translation callback bound to the active language primitive stays stable
  // across renders and changes identity exactly once per language switch, so
  // the loaders rerun only when the language actually changes.
  const language = useLanguageStore((state) => state.language);
  const t = useCallback<TranslateFn>(
    (key, params) => translate(language, key, params),
    [language],
  );

  const presetLabels: Record<AdminPreset, string> = {
    'vendor-support': t('manager.presetVendorSupport'),
    'catalog-curator': t('manager.presetCatalogCurator'),
    operations: t('manager.presetOperations'),
    none: t('manager.presetNone'),
    custom: t('manager.presetCustom'),
  };

  const invitationStatusLabels: Record<AdminInvitationStatus, string> = {
    INVITED: t('manager.statusInvited'),
    EMAIL_VERIFIED: t('manager.statusEmailVerified'),
    PENDING_APPROVAL: t('manager.statusPendingApproval'),
    ACTIVE: t('manager.statusActive'),
    REJECTED: t('manager.statusRejected'),
    DISABLED: t('manager.statusDisabled'),
  };

  const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

  // Vendor applications
  const [filter, setFilter] = useState<ApplicationFilter>('PENDING');
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [reviewingApplicationId, setReviewingApplicationId] = useState<string | null>(null);

  // Active and disabled administrator accounts
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [presetDrafts, setPresetDrafts] = useState<Record<string, AdminPreset>>({});
  const [savingAdminId, setSavingAdminId] = useState<string | null>(null);

  // New administrator invitation
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [invitePreset, setInvitePreset] = useState<AdminPreset>('vendor-support');
  const [sendingInvitation, setSendingInvitation] = useState(false);

  // Invitation lifecycle
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationActionId, setInvitationActionId] = useState<string | null>(null);

  // Platform overview metrics (MANAGER-only, server computed)
  const [metrics, setMetrics] = useState<ManagerMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Customer directory
  const [customers, setCustomers] = useState<ManagerCustomer[]>([]);
  const [customersPagination, setCustomersPagination] = useState<ManagerPagination | null>(null);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearchDraft, setCustomerSearchDraft] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<ManagerCustomerStatus | 'ALL'>(
    'ALL',
  );
  const [customerPage, setCustomerPage] = useState(1);
  const [savingCustomerId, setSavingCustomerId] = useState<string | null>(null);

  // Product oversight (read-only)
  const [products, setProducts] = useState<ManagerProductSummary[]>([]);
  const [productsPagination, setProductsPagination] = useState<ManagerPagination | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearchDraft, setProductSearchDraft] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState<ManagerProductStatus | 'ALL'>(
    'ALL',
  );
  const [productPage, setProductPage] = useState(1);

  // Audit history
  const [auditLogs, setAuditLogs] = useState<ManagerAuditLog[]>([]);
  const [auditLogsPagination, setAuditLogsPagination] = useState<ManagerPagination | null>(null);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditActionDraft, setAuditActionDraft] = useState('');
  const [auditAction, setAuditAction] = useState('');
  const [auditPage, setAuditPage] = useState(1);

  // Invitation resend
  const [resendingInvitationId, setResendingInvitationId] = useState<string | null>(null);

  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      if (!accessToken) {
        throw new Error(t('manager.sessionExpired'));
      }

      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${accessToken}`);

      if (init.body !== undefined && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(`${apiBaseUrl}${path}`, {
        ...init,
        headers,
      });

      const payload = (await response.json().catch(() => ({}))) as
        (T & ApiErrorPayload) | ApiErrorPayload;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            payload as ApiErrorPayload,
            t('manager.requestFailed', { status: response.status }),
          ),
        );
      }

      return payload as T;
    },
    [accessToken, apiBaseUrl, t],
  );

  const loadApplications = useCallback(async () => {
    if (!accessToken) {
      setApplications([]);
      return;
    }

    setApplicationsLoading(true);

    try {
      const query = new URLSearchParams({ status: filter });
      const payload = await request<{
        applications: VendorApplication[];
      }>(`/api/admin/vendors/applications?${query.toString()}`);

      setApplications(Array.isArray(payload.applications) ? payload.applications : []);
    } catch (error) {
      addToast(
        error instanceof Error
          ? error.message
          : t('manager.toastLoadApplicationsFailed'),
        'error',
      );
    } finally {
      setApplicationsLoading(false);
    }
  }, [accessToken, addToast, filter, request, t]);

  const loadAdmins = useCallback(async () => {
    if (!accessToken) {
      setAdmins([]);
      return;
    }

    setAdminsLoading(true);

    try {
      const payload = await request<{ admins: AdminAccount[] }>('/api/admin/admins');

      const nextAdmins = Array.isArray(payload.admins) ? payload.admins : [];

      setAdmins(nextAdmins);

      setPresetDrafts((current) => {
        const next = { ...current };

        for (const admin of nextAdmins) {
          next[admin.id] = selectionFromPermissions(admin.permissions);
        }

        return next;
      });
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : t('manager.toastLoadAdminsFailed'),
        'error',
      );
    } finally {
      setAdminsLoading(false);
    }
  }, [accessToken, addToast, request, t]);

  const loadInvitations = useCallback(async () => {
    if (!accessToken) {
      setInvitations([]);
      return;
    }

    setInvitationsLoading(true);

    try {
      const payload = await request<{ invitations: AdminInvitation[] }>('/api/admin/invitations');

      setInvitations(Array.isArray(payload.invitations) ? payload.invitations : []);
    } catch (error) {
      addToast(
        error instanceof Error
          ? error.message
          : t('manager.toastLoadInvitationsFailed'),
        'error',
      );
    } finally {
      setInvitationsLoading(false);
    }
  }, [accessToken, addToast, request, t]);

  const loadMetrics = useCallback(async () => {
    if (!accessToken) {
      setMetrics(null);
      return;
    }

    setMetricsLoading(true);

    try {
      setMetrics(await managerMetricsApi.get(request));
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : t('manager.toastLoadMetricsFailed'),
        'error',
      );
    } finally {
      setMetricsLoading(false);
    }
  }, [accessToken, addToast, request, t]);

  const loadCustomers = useCallback(async () => {
    if (!accessToken) {
      setCustomers([]);
      setCustomersPagination(null);
      return;
    }

    setCustomersLoading(true);

    try {
      const payload = await managerCustomersApi.list(request, {
        page: customerPage,
        limit: 10,
        search: customerSearch || undefined,
        status: customerStatusFilter === 'ALL' ? undefined : customerStatusFilter,
      });

      setCustomers(payload.customers);
      setCustomersPagination(payload.pagination);
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : t('manager.toastLoadCustomersFailed'),
        'error',
      );
    } finally {
      setCustomersLoading(false);
    }
  }, [accessToken, addToast, customerPage, customerSearch, customerStatusFilter, request, t]);

  const loadProducts = useCallback(async () => {
    if (!accessToken) {
      setProducts([]);
      setProductsPagination(null);
      return;
    }

    setProductsLoading(true);

    try {
      const payload = await managerProductsApi.list(request, {
        page: productPage,
        limit: 10,
        search: productSearch || undefined,
        status: productStatusFilter === 'ALL' ? undefined : productStatusFilter,
      });

      setProducts(payload.products);
      setProductsPagination(payload.pagination);
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : t('manager.toastLoadProductsFailed'),
        'error',
      );
    } finally {
      setProductsLoading(false);
    }
  }, [accessToken, addToast, productPage, productSearch, productStatusFilter, request, t]);

  const loadAuditLogs = useCallback(async () => {
    if (!accessToken) {
      setAuditLogs([]);
      setAuditLogsPagination(null);
      return;
    }

    setAuditLogsLoading(true);

    try {
      const payload = await managerAuditLogsApi.list(request, {
        page: auditPage,
        limit: 10,
        action: auditAction || undefined,
      });

      setAuditLogs(payload.logs);
      setAuditLogsPagination(payload.pagination);
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : t('manager.toastLoadAuditFailed'),
        'error',
      );
    } finally {
      setAuditLogsLoading(false);
    }
  }, [accessToken, addToast, auditAction, auditPage, request, t]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  const refreshAll = () => {
    void loadApplications();
    void loadAdmins();
    void loadInvitations();
    void loadMetrics();
    void loadCustomers();
    void loadProducts();
    void loadAuditLogs();
  };

  const reviewApplication = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setReviewingApplicationId(id);

    try {
      const payload = await request<{
        application?: VendorApplication;
      }>(`/api/admin/vendors/applications/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ decision }),
      });

      setApplications((current) => current.filter((application) => application.id !== id));

      addToast(
        decision === 'APPROVED'
          ? t('manager.toastApplicationApproved', {
              store: payload.application?.storeName || 'Store',
            })
          : t('manager.toastApplicationRejected', {
              store: payload.application?.storeName || 'Store',
            }),
        'success',
      );
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : t('manager.toastReviewApplicationFailed'),
        'error',
      );
    } finally {
      setReviewingApplicationId(null);
    }
  };

  const sendInvitation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || sendingInvitation) return;

    setSendingInvitation(true);

    try {
      const payload = await request<{
        invitation?: AdminInvitation;
      }>('/api/admin/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          firstName: inviteFirstName.trim(),
          lastName: inviteLastName.trim(),
          permission: {
            presets: presetsFromSelection(invitePreset),
          },
        }),
      });

      addToast(
        t('manager.toastInvitationSent', {
          email: payload.invitation?.email || inviteEmail.trim(),
        }),
        'success',
      );

      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      setInvitePreset('vendor-support');

      await loadInvitations();
    } catch (error) {
      addToast(
        error instanceof Error
          ? error.message
          : t('manager.toastSendInvitationFailed'),
        'error',
      );
    } finally {
      setSendingInvitation(false);
    }
  };

  const applyPreset = async (id: string) => {
    if (!accessToken || savingAdminId) return;

    const preset = presetDrafts[id] ?? 'none';
    if (preset === 'custom') return;

    setSavingAdminId(id);

    try {
      await request(`/api/admin/admins/${encodeURIComponent(id)}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({
          presets: presetsFromSelection(preset),
        }),
      });

      addToast(
        t('manager.toastPermissionsUpdated', { preset: presetLabels[preset] }),
        'success',
      );

      await loadAdmins();
    } catch (error) {
      addToast(
        error instanceof Error
          ? error.message
          : t('manager.toastUpdatePermissionsFailed'),
        'error',
      );
    } finally {
      setSavingAdminId(null);
    }
  };

  const setAdminStatus = async (id: string, status: 'ACTIVE' | 'DISABLED') => {
    if (!accessToken || savingAdminId) return;

    setSavingAdminId(id);

    try {
      await request(`/api/admin/admins/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      addToast(
        status === 'ACTIVE'
          ? t('manager.toastAdminEnabled')
          : t('manager.toastAdminDisabled'),
        'success',
      );

      await Promise.all([loadAdmins(), loadInvitations()]);
    } catch (error) {
      addToast(
        error instanceof Error
          ? error.message
          : t('manager.toastChangeAdminStatusFailed'),
        'error',
      );
    } finally {
      setSavingAdminId(null);
    }
  };

  const reviewInvitation = async (invitation: AdminInvitation, decision: 'approve' | 'reject') => {
    if (!accessToken || invitationActionId) return;

    setInvitationActionId(invitation.id);

    try {
      await request(`/api/admin/invitations/${encodeURIComponent(invitation.id)}/${decision}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      addToast(
        decision === 'approve'
          ? t('manager.toastInvitationApproved', { email: invitation.email })
          : t('manager.toastInvitationRejected', { email: invitation.email }),
        'success',
      );

      await Promise.all([loadInvitations(), loadAdmins()]);
    } catch (error) {
      addToast(
        error instanceof Error
          ? error.message
          : decision === 'approve'
            ? t('manager.toastApproveInvitationFailed')
            : t('manager.toastRejectInvitationFailed'),
        'error',
      );
    } finally {
      setInvitationActionId(null);
    }
  };

  const resendInvitation = async (invitation: AdminInvitation) => {
    if (!accessToken || resendingInvitationId) return;

    setResendingInvitationId(invitation.id);

    try {
      await managerInvitationsApi.resend(request, invitation.id);

      addToast(
        t('manager.toastInvitationResent', { email: invitation.email }),
        'success',
      );

      await loadInvitations();
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : t('manager.toastResendInvitationFailed'),
        'error',
      );
    } finally {
      setResendingInvitationId(null);
    }
  };

  const setCustomerStatus = async (customer: ManagerCustomer, status: ManagerCustomerStatus) => {
    if (!accessToken || savingCustomerId) return;

    setSavingCustomerId(customer.id);

    try {
      const updated = await managerCustomersApi.setStatus(request, customer.id, status);

      setCustomers((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );

      addToast(
        status === 'ACTIVE'
          ? t('manager.toastCustomerEnabled', { email: updated.email })
          : t('manager.toastCustomerDisabled', { email: updated.email }),
        'success',
      );
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : t('manager.toastChangeCustomerStatusFailed'),
        'error',
      );
    } finally {
      setSavingCustomerId(null);
    }
  };

  const refreshLoading =
    applicationsLoading ||
    adminsLoading ||
    invitationsLoading ||
    metricsLoading ||
    customersLoading ||
    productsLoading ||
    auditLogsLoading;

  const pendingApprovalCount = invitations.filter(
    (invitation) => invitation.status === 'PENDING_APPROVAL',
  ).length;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 p-4 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Page heading */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
              <Crown className="h-6 w-6 text-purple-600" aria-hidden="true" />
              {t('manager.title')}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">{t('manager.subtitle')}</p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refreshAll}
            className="gap-2 self-start"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {refreshLoading ? t('manager.refreshing') : t('manager.refreshAll')}
          </Button>
        </header>

        {/* Platform overview metrics */}
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" aria-hidden="true" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                {t('manager.overviewTitle')}
              </h2>
            </div>

            {metrics && (
              <span className="text-xs text-slate-500">
                {t('manager.updatedAt', { at: formatDate(metrics.generatedAt) })}
              </span>
            )}
          </div>

          {metricsLoading && !metrics ? (
            <p className="text-xs text-slate-500">{t('manager.metricsLoading')}</p>
          ) : metrics ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  {t('manager.metricCustomers')}
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {metrics.customers.active.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t('manager.customersDisabled', {
                    count: metrics.customers.disabled.toLocaleString(),
                  })}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  {t('manager.metricVendors')}
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {metrics.vendors.total.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t('manager.applicationsPending', {
                    count: metrics.vendors.applicationsPending.toLocaleString(),
                  })}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <Package className="h-4 w-4" aria-hidden="true" />
                  {t('manager.metricProducts')}
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {metrics.products.published.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t('manager.productsDraftArchived', {
                    draft: metrics.products.draft.toLocaleString(),
                    archived: metrics.products.archived.toLocaleString(),
                  })}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  {t('manager.metricOrders')}
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {metrics.orders.nonCancelled.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t('manager.ordersRevenue', {
                    amount: formatCurrency(metrics.orders.revenue),
                  })}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {t('manager.metricCoupons')}
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {metrics.coupons.active.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t('manager.couponsActiveCount')}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">{t('manager.metricsUnavailable')}</p>
          )}
        </section>

        {/* Administrator invitations */}
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <MailPlus className="h-5 w-5 text-purple-600" aria-hidden="true" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                {t('manager.inviteTitle')}
              </h2>
            </div>

            <p className="text-xs text-slate-500">{t('manager.inviteHint')}</p>
          </div>

          <form
            onSubmit={(event) => void sendInvitation(event)}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                {t('manager.fieldEmail')}
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="admin@example.com"
                className={inputClassName}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                {t('manager.fieldFirstName')}
              </span>
              <input
                type="text"
                autoComplete="given-name"
                required
                maxLength={80}
                value={inviteFirstName}
                onChange={(event) => setInviteFirstName(event.target.value)}
                placeholder={t('manager.placeholderFirstName')}
                className={inputClassName}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                {t('manager.fieldLastName')}
              </span>
              <input
                type="text"
                autoComplete="family-name"
                maxLength={80}
                value={inviteLastName}
                onChange={(event) => setInviteLastName(event.target.value)}
                placeholder={t('manager.placeholderLastName')}
                className={inputClassName}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                {t('manager.fieldPreset')}
              </span>
              <select
                value={invitePreset}
                onChange={(event) => setInvitePreset(event.target.value as AdminPreset)}
                className={`${inputClassName} bg-white`}
              >
                {(Object.keys(presetLabels) as AdminPreset[])
                  .filter((preset) => preset !== 'custom')
                  .map((preset) => (
                    <option key={preset} value={preset}>
                      {presetLabels[preset]}
                    </option>
                  ))}
              </select>
            </label>

            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" size="sm" isLoading={sendingInvitation} className="gap-2">
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                {sendingInvitation
                  ? t('manager.sendingInvitation')
                  : t('manager.sendInvitation')}
              </Button>
            </div>
          </form>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
            {t('manager.inviteInfo')}
          </div>
        </section>

        {/* Invitation status and approval */}
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-slate-500" aria-hidden="true" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                {t('manager.invitationsTitle')}
              </h2>
            </div>

            {pendingApprovalCount > 0 && (
              <Badge variant="warning" size="sm">
                {t('manager.awaitingApproval', { count: pendingApprovalCount })}
              </Badge>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4">{t('manager.thInvitee')}</th>
                  <th className="p-4">{t('manager.thStatus')}</th>
                  <th className="p-4">{t('manager.thPermissions')}</th>
                  <th className="p-4">{t('manager.thCreated')}</th>
                  <th className="p-4 text-right">{t('manager.thDecision')}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {invitations.map((invitation) => {
                  const canReview = invitation.status === 'PENDING_APPROVAL';
                  const isReviewing = invitationActionId === invitation.id;

                  return (
                    <tr key={invitation.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">
                          {invitation.firstName} {invitation.lastName || ''}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">{invitation.email}</div>
                      </td>

                      <td className="p-4">
                        <Badge
                          variant={INVITATION_STATUS_STYLES[invitation.status] || 'secondary'}
                          size="sm"
                        >
                          {invitationStatusLabels[invitation.status] || invitation.status}
                        </Badge>

                        {invitation.status === 'REJECTED' && invitation.rejectedReason && (
                          <p className="mt-1 max-w-48 text-[11px] text-red-600">
                            {invitation.rejectedReason}
                          </p>
                        )}
                      </td>

                      <td className="p-4">
                        {invitation.permissions?.length
                          ? invitation.permissions.join(', ')
                          : t('manager.permissionsNone')}
                      </td>

                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {formatDate(invitation.createdAt)}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          {canReview && (
                            <>
                              <button
                                type="button"
                                disabled={Boolean(invitationActionId)}
                                onClick={() => void reviewInvitation(invitation, 'approve')}
                                className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                {isReviewing ? t('manager.processing') : t('manager.approve')}
                              </button>

                              <button
                                type="button"
                                disabled={Boolean(invitationActionId)}
                                onClick={() => void reviewInvitation(invitation, 'reject')}
                                className="inline-flex items-center gap-1 font-bold text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('manager.reject')}
                              </button>
                            </>
                          )}

                          {invitation.status === 'INVITED' && (
                            <button
                              type="button"
                              disabled={Boolean(invitationActionId) || Boolean(resendingInvitationId)}
                              onClick={() => void resendInvitation(invitation)}
                              className="inline-flex items-center gap-1 font-bold text-slate-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Send className="h-3.5 w-3.5" aria-hidden="true" />
                              {resendingInvitationId === invitation.id
                                ? t('manager.sending')
                                : t('manager.resend')}
                            </button>
                          )}

                          {!canReview && invitation.status !== 'INVITED' && (
                            <span className="text-slate-400">{t('manager.noAction')}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {invitations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      {invitationsLoading
                        ? t('manager.loadingInvitations')
                        : t('manager.invitationsEmpty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-500">{t('manager.invitationsFooter')}</div>
        </section>

        {/* Active and disabled administrators */}
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-500" aria-hidden="true" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              {t('manager.adminsTitle')}
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4">{t('manager.thAdministrator')}</th>
                  <th className="p-4">{t('manager.thStatus')}</th>
                  <th className="p-4">{t('manager.thPermissions')}</th>
                  <th className="p-4 text-right">{t('manager.thActions')}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {admins.map((admin) => {
                  const preset =
                    presetDrafts[admin.id] ?? selectionFromPermissions(admin.permissions);
                  const isSaving = savingAdminId === admin.id;

                  return (
                    <tr key={admin.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">
                          {admin.firstName} {admin.lastName || ''}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">{admin.email}</div>
                      </td>

                      <td className="p-4">
                        <Badge variant={admin.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                          {admin.status}
                        </Badge>
                      </td>

                      <td className="p-4">
                        <select
                          aria-label={t('manager.ariaPermissionsFor', { email: admin.email })}
                          value={preset}
                          onChange={(event) =>
                            setPresetDrafts((current) => ({
                              ...current,
                              [admin.id]: event.target.value as AdminPreset,
                            }))
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                        >
                          {(Object.keys(presetLabels) as AdminPreset[]).map((option) => (
                            <option key={option} value={option}>
                              {presetLabels[option]}
                            </option>
                          ))}
                        </select>

                        <p className="mt-1 max-w-xs break-words text-[10px] text-slate-400">
                          {t('manager.effective', {
                            permissions: admin.permissions?.length
                              ? admin.permissions.join(', ')
                              : t('manager.effectiveNone'),
                          })}
                        </p>
                      </td>

                      <td className="p-4">
                        <div className="flex justify-end gap-3 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={Boolean(savingAdminId) || preset === 'custom'}
                            onClick={() => void applyPreset(admin.id)}
                            className="font-bold text-slate-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSaving ? t('manager.saving') : t('manager.apply')}
                          </button>

                          {admin.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              disabled={Boolean(savingAdminId)}
                              onClick={() => void setAdminStatus(admin.id, 'DISABLED')}
                              className="font-bold text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t('manager.disable')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={Boolean(savingAdminId)}
                              onClick={() => void setAdminStatus(admin.id, 'ACTIVE')}
                              className="font-bold text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t('manager.enable')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {admins.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      {adminsLoading ? t('manager.loadingAdmins') : t('manager.adminsEmpty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Customer directory */}
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-500" aria-hidden="true" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                {t('manager.customersTitle')}
              </h2>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                setCustomerPage(1);
                setCustomerSearch(customerSearchDraft.trim());
              }}
              className="flex w-full max-w-sm items-center gap-2"
            >
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={customerSearchDraft}
                  onChange={(event) => setCustomerSearchDraft(event.target.value)}
                  placeholder={t('manager.searchCustomersPlaceholder')}
                  aria-label={t('manager.ariaSearchCustomers')}
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-400"
              >
                {t('manager.search')}
              </button>
            </form>
          </div>

          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label={t('manager.ariaFilterCustomers')}
          >
            {(['ALL', 'ACTIVE', 'DISABLED'] as (ManagerCustomerStatus | 'ALL')[]).map((status) => (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={customerStatusFilter === status}
                onClick={() => {
                  setCustomerPage(1);
                  setCustomerStatusFilter(status);
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                  customerStatusFilter === status
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                {status === 'ALL'
                  ? t('manager.filterAll')
                  : status === 'ACTIVE'
                    ? t('manager.filterActive')
                    : t('manager.filterDisabled')}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4">{t('manager.thCustomer')}</th>
                  <th className="p-4">{t('manager.thStatus')}</th>
                  <th className="p-4">{t('manager.thVendorApplication')}</th>
                  <th className="p-4">{t('manager.thLastLogin')}</th>
                  <th className="p-4">{t('manager.thJoined')}</th>
                  <th className="p-4 text-right">{t('manager.thActions')}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customers.map((customer) => {
                  const isSaving = savingCustomerId === customer.id;

                  return (
                    <tr key={customer.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">
                          {customer.firstName} {customer.lastName || ''}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">{customer.email}</div>
                      </td>

                      <td className="p-4">
                        <Badge
                          variant={customer.status === 'ACTIVE' ? 'success' : 'danger'}
                          size="sm"
                        >
                          {customer.status}
                        </Badge>
                      </td>

                      <td className="p-4">{customer.vendorApplicationStatus}</td>

                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {formatDate(customer.lastLoginAt ?? undefined)}
                      </td>

                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {formatDate(customer.createdAt)}
                      </td>

                      <td className="p-4 text-right">
                        <button
                          type="button"
                          disabled={Boolean(savingCustomerId)}
                          onClick={() =>
                            void setCustomerStatus(
                              customer,
                              customer.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                            )
                          }
                          className={
                            customer.status === 'ACTIVE'
                              ? 'font-bold text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50'
                              : 'font-bold text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50'
                          }
                        >
                          {isSaving
                            ? t('manager.saving')
                            : customer.status === 'ACTIVE'
                              ? t('manager.disable')
                              : t('manager.enable')}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {customers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      {customersLoading
                        ? t('manager.loadingCustomers')
                        : t('manager.customersEmpty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {customersPagination && customersPagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-500">
                {t('manager.pageSummary', {
                  page: customersPagination.page,
                  totalPages: customersPagination.totalPages,
                  total: customersPagination.total,
                })}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={customerPage <= 1 || customersLoading}
                  onClick={() => setCustomerPage((page) => Math.max(1, page - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('manager.previous')}
                </button>

                <button
                  type="button"
                  disabled={customerPage >= customersPagination.totalPages || customersLoading}
                  onClick={() => setCustomerPage((page) => page + 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('manager.next')}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Product oversight (read-only) */}
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-slate-500" aria-hidden="true" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                {t('manager.productsTitle')}
              </h2>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                setProductPage(1);
                setProductSearch(productSearchDraft.trim());
              }}
              className="flex w-full max-w-sm items-center gap-2"
            >
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={productSearchDraft}
                  onChange={(event) => setProductSearchDraft(event.target.value)}
                  placeholder={t('manager.searchProductsPlaceholder')}
                  aria-label={t('manager.ariaSearchProducts')}
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-400"
              >
                {t('manager.search')}
              </button>
            </form>
          </div>

          <div className="text-xs text-slate-500">{t('manager.productsNote')}</div>

          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label={t('manager.ariaFilterProducts')}
          >
            {(['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as (ManagerProductStatus | 'ALL')[]).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={productStatusFilter === status}
                  onClick={() => {
                    setProductPage(1);
                    setProductStatusFilter(status);
                  }}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                    productStatusFilter === status
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {status === 'ALL'
                    ? t('manager.filterAll')
                    : status === 'DRAFT'
                      ? t('manager.filterDraft')
                      : status === 'PUBLISHED'
                        ? t('manager.filterPublished')
                        : t('manager.filterArchived')}
                </button>
              ),
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4">{t('manager.thProduct')}</th>
                  <th className="p-4">{t('manager.thVendorId')}</th>
                  <th className="p-4">{t('manager.thPrice')}</th>
                  <th className="p-4">{t('manager.thStock')}</th>
                  <th className="p-4">{t('manager.thStatus')}</th>
                  <th className="p-4">{t('manager.thUpdated')}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{product.title}</div>
                      <div className="mt-1 text-[11px] text-slate-500">{product.slug}</div>
                    </td>

                    <td className="p-4 font-mono text-[11px] text-slate-500">
                      {product.vendorId}
                    </td>

                    <td className="p-4 whitespace-nowrap font-semibold">
                      {formatCurrency(product.price)}
                    </td>

                    <td className="p-4">{product.stock}</td>

                    <td className="p-4">
                      <Badge
                        variant={
                          product.status === 'PUBLISHED'
                            ? 'success'
                            : product.status === 'DRAFT'
                              ? 'warning'
                              : 'secondary'
                        }
                        size="sm"
                      >
                        {product.status}
                      </Badge>
                    </td>

                    <td className="p-4 whitespace-nowrap text-slate-500">
                      {formatDate(product.updatedAt)}
                    </td>
                  </tr>
                ))}

                {products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      {productsLoading ? t('manager.loadingProducts') : t('manager.productsEmpty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {productsPagination && productsPagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-500">
                {t('manager.pageSummary', {
                  page: productsPagination.page,
                  totalPages: productsPagination.totalPages,
                  total: productsPagination.total,
                })}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={productPage <= 1 || productsLoading}
                  onClick={() => setProductPage((page) => Math.max(1, page - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('manager.previous')}
                </button>

                <button
                  type="button"
                  disabled={productPage >= productsPagination.totalPages || productsLoading}
                  onClick={() => setProductPage((page) => page + 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('manager.next')}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Vendor applications */}
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              {t('manager.applicationsTitle')}
            </h2>

            <span className="text-xs text-slate-500">{t('manager.applicationsNote')}</span>
          </div>

          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label={t('manager.ariaFilterApplications')}
          >
            {(['PENDING', 'APPROVED', 'REJECTED'] as ApplicationFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={filter === status}
                onClick={() => setFilter(status)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                  filter === status
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                {status === 'PENDING'
                  ? t('manager.filterPendingReview')
                  : status === 'APPROVED'
                    ? t('manager.filterApproved')
                    : t('manager.filterRejected')}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4">{t('manager.thStore')}</th>
                  <th className="p-4">{t('manager.thApplicant')}</th>
                  <th className="p-4">{t('manager.thDescription')}</th>
                  <th className="p-4">{t('manager.thStatus')}</th>
                  {filter === 'PENDING' && (
                    <th className="p-4 text-right">{t('manager.thDecision')}</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {applications.map((application) => {
                  const isReviewing = reviewingApplicationId === application.id;

                  return (
                    <tr key={application.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-900">{application.storeName}</td>

                      <td className="p-4">
                        <div className="font-semibold">
                          {application.firstName} {application.lastName}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">{application.email}</div>
                      </td>

                      <td className="max-w-sm p-4">
                        {application.storeDescription || t('manager.noDescription')}
                      </td>

                      <td className="p-4">
                        <Badge
                          variant={
                            application.status === 'APPROVED'
                              ? 'success'
                              : application.status === 'REJECTED'
                                ? 'danger'
                                : 'warning'
                          }
                          size="sm"
                        >
                          {application.status}
                        </Badge>
                      </td>

                      {filter === 'PENDING' && (
                        <td className="p-4">
                          <div className="flex justify-end gap-3 whitespace-nowrap">
                            <button
                              type="button"
                              disabled={Boolean(reviewingApplicationId)}
                              onClick={() => void reviewApplication(application.id, 'APPROVED')}
                              className="font-bold text-emerald-700 hover:underline disabled:opacity-50"
                            >
                              {isReviewing ? t('manager.processing') : t('manager.approve')}
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(reviewingApplicationId)}
                              onClick={() => void reviewApplication(application.id, 'REJECTED')}
                              className="font-bold text-red-600 hover:underline disabled:opacity-50"
                            >
                              {t('manager.reject')}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {applications.length === 0 && (
                  <tr>
                    <td
                      colSpan={filter === 'PENDING' ? 5 : 4}
                      className="p-8 text-center text-slate-500"
                    >
                      {applicationsLoading
                        ? t('manager.loadingApplications')
                        : filter === 'PENDING'
                          ? t('manager.applicationsEmptyPending')
                          : filter === 'APPROVED'
                            ? t('manager.applicationsEmptyApproved')
                            : t('manager.applicationsEmptyRejected')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Audit history */}
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-slate-500" aria-hidden="true" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                {t('manager.auditTitle')}
              </h2>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                setAuditPage(1);
                setAuditAction(auditActionDraft.trim());
              }}
              className="flex w-full max-w-md items-center gap-2"
            >
              <input
                type="text"
                value={auditActionDraft}
                onChange={(event) => setAuditActionDraft(event.target.value)}
                placeholder={t('manager.auditFilterPlaceholder')}
                aria-label={t('manager.ariaAuditFilter')}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
              />

              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-400"
              >
                {t('manager.filter')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuditActionDraft('');
                  setAuditPage(1);
                  setAuditAction('');
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-400"
              >
                {t('manager.clear')}
              </button>
            </form>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4">{t('manager.thWhen')}</th>
                  <th className="p-4">{t('manager.thActor')}</th>
                  <th className="p-4">{t('manager.thRole')}</th>
                  <th className="p-4">{t('manager.thAction')}</th>
                  <th className="p-4">{t('manager.thTarget')}</th>
                  <th className="p-4">{t('manager.thDetails')}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-4 whitespace-nowrap text-slate-500">
                      {formatDate(log.createdAt)}
                    </td>

                    <td className="p-4 font-mono text-[11px] text-slate-500">{log.actorId}</td>

                    <td className="p-4">{log.actorRole}</td>

                    <td className="p-4 font-semibold">{log.action}</td>

                    <td className="p-4">
                      <div>{log.targetType}</div>
                      {log.targetId && (
                        <div className="mt-1 font-mono text-[11px] text-slate-500">
                          {log.targetId}
                        </div>
                      )}
                    </td>

                    <td className="max-w-xs p-4">
                      <code className="break-words text-[11px] text-slate-500">
                        {JSON.stringify(log.metadata)}
                      </code>
                    </td>
                  </tr>
                ))}

                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      {auditLogsLoading ? t('manager.loadingAudit') : t('manager.auditEmpty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {auditLogsPagination && auditLogsPagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-500">
                {t('manager.pageSummary', {
                  page: auditLogsPagination.page,
                  totalPages: auditLogsPagination.totalPages,
                  total: auditLogsPagination.total,
                })}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={auditPage <= 1 || auditLogsLoading}
                  onClick={() => setAuditPage((page) => Math.max(1, page - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('manager.previous')}
                </button>

                <button
                  type="button"
                  disabled={auditPage >= auditLogsPagination.totalPages || auditLogsLoading}
                  onClick={() => setAuditPage((page) => page + 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('manager.next')}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </section>

        <footer className="flex items-start gap-2 text-[11px] leading-5 text-slate-400">
          <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p>{t('manager.footerNote')}</p>
        </footer>
      </div>
    </div>
  );
};

export default ManagerDashboard;
