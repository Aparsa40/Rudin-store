import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  ClipboardList,
  Crown,
  MailPlus,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';

import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
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

const PRESET_LABELS: Record<AdminPreset, string> = {
  'vendor-support': 'Vendor support',
  'catalog-curator': 'Catalog curator',
  operations: 'Operations (coupons + orders)',
  none: 'No permissions',
  custom: 'Custom permissions (preserve)',
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

const INVITATION_STATUS_LABELS: Record<AdminInvitationStatus, string> = {
  INVITED: 'Invitation sent',
  EMAIL_VERIFIED: 'Email verified',
  PENDING_APPROVAL: 'Awaiting Manager approval',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  DISABLED: 'Disabled',
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

const getErrorMessage = (payload: ApiErrorPayload, fallback: string): string =>
  payload.error?.message || payload.message || fallback;

const inputClassName =
  'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl ' +
  'focus:outline-none focus:ring-2 focus:ring-slate-900';

export const ManagerDashboard: React.FC = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { addToast } = useUIStore();

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

  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      if (!accessToken) {
        throw new Error('Your session has expired. Please sign in again.');
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
            `Request failed with status ${response.status}.`,
          ),
        );
      }

      return payload as T;
    },
    [accessToken, apiBaseUrl],
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
        error instanceof Error ? error.message : 'Unable to load vendor applications.',
        'error',
      );
    } finally {
      setApplicationsLoading(false);
    }
  }, [accessToken, addToast, filter, request]);

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
      addToast(error instanceof Error ? error.message : 'Unable to load administrators.', 'error');
    } finally {
      setAdminsLoading(false);
    }
  }, [accessToken, addToast, request]);

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
        error instanceof Error ? error.message : 'Unable to load administrator invitations.',
        'error',
      );
    } finally {
      setInvitationsLoading(false);
    }
  }, [accessToken, addToast, request]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  const refreshAll = () => {
    void loadApplications();
    void loadAdmins();
    void loadInvitations();
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
        `${payload.application?.storeName || 'Store'} application ${decision.toLowerCase()}.`,
        'success',
      );
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Unable to review vendor application.',
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

      addToast(`Invitation sent to ${payload.invitation?.email || inviteEmail.trim()}.`, 'success');

      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      setInvitePreset('vendor-support');

      await loadInvitations();
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Unable to send administrator invitation.',
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

      addToast(`Administrator permissions updated to "${PRESET_LABELS[preset]}".`, 'success');

      await loadAdmins();
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Unable to update administrator permissions.',
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

      addToast(`Administrator ${status === 'ACTIVE' ? 'enabled' : 'disabled'}.`, 'success');

      await Promise.all([loadAdmins(), loadInvitations()]);
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Unable to change administrator status.',
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
          ? `Administrator invitation for ${invitation.email} approved.`
          : `Administrator invitation for ${invitation.email} rejected.`,
        'success',
      );

      await Promise.all([loadInvitations(), loadAdmins()]);
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : `Unable to ${decision} invitation.`,
        'error',
      );
    } finally {
      setInvitationActionId(null);
    }
  };

  const refreshLoading = applicationsLoading || adminsLoading || invitationsLoading;

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
              Manager Console
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Manage administrator invitations, approve new administrators, control permissions, and
              review vendor applications.
            </p>
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
            {refreshLoading ? 'Refreshing…' : 'Refresh all'}
          </Button>
        </header>

        {/* Administrator invitations */}
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <MailPlus className="h-5 w-5 text-purple-600" aria-hidden="true" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Invite an administrator
              </h2>
            </div>

            <p className="text-xs text-slate-500">
              The invitee verifies their email and chooses their own password.
            </p>
          </div>

          <form
            onSubmit={(event) => void sendInvitation(event)}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">Email address</span>
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
              <span className="text-xs font-semibold text-slate-600">First name</span>
              <input
                type="text"
                autoComplete="given-name"
                required
                maxLength={80}
                value={inviteFirstName}
                onChange={(event) => setInviteFirstName(event.target.value)}
                placeholder="First name"
                className={inputClassName}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">Last name</span>
              <input
                type="text"
                autoComplete="family-name"
                maxLength={80}
                value={inviteLastName}
                onChange={(event) => setInviteLastName(event.target.value)}
                placeholder="Last name (optional)"
                className={inputClassName}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">Permission preset</span>
              <select
                value={invitePreset}
                onChange={(event) => setInvitePreset(event.target.value as AdminPreset)}
                className={`${inputClassName} bg-white`}
              >
                {(Object.keys(PRESET_LABELS) as AdminPreset[]).filter((preset) => preset !== 'custom').map((preset) => (
                  <option key={preset} value={preset}>
                    {PRESET_LABELS[preset]}
                  </option>
                ))}
              </select>
            </label>

            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" size="sm" isLoading={sendingInvitation} className="gap-2">
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                {sendingInvitation ? 'Sending invitation…' : 'Send invitation'}
              </Button>
            </div>
          </form>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
            Sending an invitation does not create an active administrator. The invitee must complete
            the invitation process, and the Manager must approve the request before the account
            becomes active.
          </div>
        </section>

        {/* Invitation status and approval */}
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-slate-500" aria-hidden="true" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Administrator invitations
              </h2>
            </div>

            {pendingApprovalCount > 0 && (
              <Badge variant="warning" size="sm">
                {pendingApprovalCount} awaiting approval
              </Badge>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-760px text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4">Invitee</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Permissions</th>
                  <th className="p-4">Created</th>
                  <th className="p-4 text-right">Decision</th>
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
                          {INVITATION_STATUS_LABELS[invitation.status] || invitation.status}
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
                          : 'None'}
                      </td>

                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {formatDate(invitation.createdAt)}
                      </td>

                      <td className="p-4 text-right">
                        {canReview ? (
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              disabled={Boolean(invitationActionId)}
                              onClick={() => void reviewInvitation(invitation, 'approve')}
                              className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              {isReviewing ? 'Processing…' : 'Approve'}
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(invitationActionId)}
                              onClick={() => void reviewInvitation(invitation, 'reject')}
                              className="inline-flex items-center gap-1 font-bold text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">No action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {invitations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      {invitationsLoading
                        ? 'Loading invitations…'
                        : 'No administrator invitations found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-500">
            An invitation can be approved only after the invitee completes the email verification
            and password setup steps.
          </div>
        </section>

        {/* Active and disabled administrators */}
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-500" aria-hidden="true" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Administrator accounts
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-700px text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4">Administrator</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Permissions</th>
                  <th className="p-4 text-right">Actions</th>
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
                          aria-label={`Permissions for ${admin.email}`}
                          value={preset}
                          onChange={(event) =>
                            setPresetDrafts((current) => ({
                              ...current,
                              [admin.id]: event.target.value as AdminPreset,
                            }))
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                        >
                          {(Object.keys(PRESET_LABELS) as AdminPreset[]).map((option) => (
                            <option key={option} value={option}>
                              {PRESET_LABELS[option]}
                            </option>
                          ))}
                        </select>

                        <p className="mt-1 max-w-xs break-words text-[10px] text-slate-400">
                          Effective:{' '}
                          {admin.permissions?.length ? admin.permissions.join(', ') : 'none'}
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
                            {isSaving ? 'Saving…' : 'Apply'}
                          </button>

                          {admin.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              disabled={Boolean(savingAdminId)}
                              onClick={() => void setAdminStatus(admin.id, 'DISABLED')}
                              className="font-bold text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Disable
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={Boolean(savingAdminId)}
                              onClick={() => void setAdminStatus(admin.id, 'ACTIVE')}
                              className="font-bold text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Enable
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
                      {adminsLoading
                        ? 'Loading administrators…'
                        : 'No administrator accounts found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Vendor applications */}
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Vendor application review
            </h2>

            <span className="text-xs text-slate-500">
              Review and decide on vendor applications.
            </span>
          </div>

          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Filter vendor applications"
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
                  ? 'Pending review'
                  : status === 'APPROVED'
                    ? 'Approved'
                    : 'Rejected'}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-700px text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4">Store</th>
                  <th className="p-4">Applicant</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Status</th>
                  {filter === 'PENDING' && <th className="p-4 text-right">Decision</th>}
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
                        {application.storeDescription || 'No description supplied.'}
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
                              {isReviewing ? 'Processing…' : 'Approve'}
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(reviewingApplicationId)}
                              onClick={() => void reviewApplication(application.id, 'REJECTED')}
                              className="font-bold text-red-600 hover:underline disabled:opacity-50"
                            >
                              Reject
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
                        ? 'Loading vendor applications…'
                        : `No ${filter.toLowerCase()} vendor applications.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="flex items-start gap-2 text-[11px] leading-5 text-slate-400">
          <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p>
            Manager-only operations are authorized by the backend. The interface does not grant
            privileges by itself; invitation verification, approval, permission changes, and account
            status transitions must be validated by the API.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ManagerDashboard;
