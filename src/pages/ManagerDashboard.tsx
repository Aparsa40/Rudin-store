import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Crown, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react';
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

type AdminPreset = 'vendor-support' | 'catalog-curator' | 'none';

/**
 * Server-side permission presets. These mirror the presets resolved by the
 * backend; the client sends the preset key and the backend decides the
 * effective permission list, so permissions can never be invented here.
 */
const ADMIN_PRESETS: Record<Exclude<AdminPreset, 'none'>, AdminPermission[]> = {
  'vendor-support': ['vendors:review'],
  'catalog-curator': ['vendors:review', 'products:manage'],
};

const PRESET_LABELS: Record<AdminPreset, string> = {
  'vendor-support': 'Vendor support (vendors:review)',
  'catalog-curator': 'Catalog curator (vendors:review, products:manage)',
  none: 'No permissions',
};

const presetsFromSelection = (preset: AdminPreset): string[] =>
  preset === 'none' ? [] : [preset];


const selectionFromPermissions = (permissions: AdminPermission[] | undefined): AdminPreset => {
  if (!permissions) return 'none';
  if (permissions.includes('products:manage')) return 'catalog-curator';
  if (permissions.includes('vendors:review')) return 'vendor-support';
  return 'none';
};

/**
 * Manager Console (/manager). The MANAGER role is the primary platform owner:
 * it appoints administrator accounts, exclusively controls their granular
 * permissions, and reviews vendor applications. Every action calls the real
 * backend API; this page contains no mock data.
 */
export const ManagerDashboard: React.FC = () => {
  // Vendor application review state
  const [filter, setFilter] = useState<ApplicationFilter>('PENDING');
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(false);

  // Administrator governance state
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [appointEmail, setAppointEmail] = useState('');
  const [appointPassword, setAppointPassword] = useState('');
  const [appointFirstName, setAppointFirstName] = useState('');
  const [appointPreset, setAppointPreset] = useState<AdminPreset>('vendor-support');
  const [appointing, setAppointing] = useState(false);
  const [presetDrafts, setPresetDrafts] = useState<Record<string, AdminPreset>>({});

  const accessToken = useAuthStore((state) => state.accessToken);
  const { addToast } = useUIStore();
  const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

  const loadApplications = useCallback(async () => {
    if (!accessToken) {
      setApplications([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/vendors/applications?status=${filter}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || 'Unable to load vendor applications.');
      setApplications(payload.applications as VendorApplication[]);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to load vendor applications.', 'error');
    } finally {
      setLoading(false);
    }
  }, [accessToken, addToast, apiBaseUrl, filter]);

  const loadAdmins = useCallback(async () => {
    if (!accessToken) {
      setAdmins([]);
      return;
    }
    setAdminsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/admins`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || 'Unable to load administrators.');
      setAdmins(payload.admins as AdminAccount[]);
      setPresetDrafts((current) => {
        const next: Record<string, AdminPreset> = { ...current };
        for (const admin of payload.admins as AdminAccount[]) {
          next[admin.id] = selectionFromPermissions(admin.permissions);
        }
        return next;
      });
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to load administrators.', 'error');
    } finally {
      setAdminsLoading(false);
    }
  }, [accessToken, addToast, apiBaseUrl]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  const reviewApplication = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/vendors/applications/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ decision }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || 'Vendor application could not be reviewed.');
      setApplications((current) => current.filter((application) => application.id !== id));
      addToast(`${payload.application.storeName || 'Store'} application ${decision.toLowerCase()}.`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to review vendor application.', 'error');
    }
  };

  const appointAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    setAppointing(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          email: appointEmail,
          password: appointPassword,
          firstName: appointFirstName,
          permission: { presets: presetsFromSelection(appointPreset) },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || 'Administrator could not be appointed.');
      addToast(`Administrator ${payload.admin.email} appointed with the "${appointPreset}" preset.`, 'success');
      setAppointEmail('');
      setAppointPassword('');
      setAppointFirstName('');
      setAppointPreset('vendor-support');
      await loadAdmins();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to appoint administrator.', 'error');
    } finally {
      setAppointing(false);
    }
  };

  const applyPreset = async (id: string) => {
    if (!accessToken) return;
    const preset = presetDrafts[id] ?? 'none';
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/admins/${encodeURIComponent(id)}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ presets: presetsFromSelection(preset) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || 'Permissions could not be updated.');
      addToast(`Permissions updated to the "${preset}" preset.`, 'success');
      await loadAdmins();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to update permissions.', 'error');
    }
  };

  const setAdminStatus = async (id: string, status: 'ACTIVE' | 'DISABLED') => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/admins/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || 'Administrator status could not be changed.');
      addToast(`Administrator ${status === 'ACTIVE' ? 'enabled' : 'disabled'}.`, 'success');
      await loadAdmins();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to change administrator status.', 'error');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Crown className="w-6 h-6 text-purple-600" aria-hidden="true" />
              Manager Console
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Primary platform owner workspace: appoint administrators, exclusively control their
              permissions, and review vendor applications. All actions are enforced by the backend.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void loadApplications();
              void loadAdmins();
            }}
            className="gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            {loading || adminsLoading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>

        {/* Administrator governance — MANAGER-exclusive capability */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-400" aria-hidden="true" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Administrators
            </h2>
          </div>

          <form onSubmit={(event) => void appointAdmin(event)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="email"
              required
              value={appointEmail}
              onChange={(event) => setAppointEmail(event.target.value)}
              placeholder="Email"
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <input
              type="text"
              required
              value={appointFirstName}
              onChange={(event) => setAppointFirstName(event.target.value)}
              placeholder="First name"
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <input
              type="password"
              required
              minLength={12}
              value={appointPassword}
              onChange={(event) => setAppointPassword(event.target.value)}
              placeholder="Temporary password (min. 12 characters)"
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <select
              value={appointPreset}
              onChange={(event) => setAppointPreset(event.target.value as AdminPreset)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {(Object.keys(PRESET_LABELS) as AdminPreset[]).map((preset) => (
                <option key={preset} value={preset}>
                  {PRESET_LABELS[preset]}
                </option>
              ))}
            </select>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" size="sm" isLoading={appointing} className="gap-2">
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                Appoint administrator
              </Button>
            </div>
          </form>

          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">Administrator</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Permissions</th>
                  <th className="p-4 text-right">Governance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{admin.firstName} {admin.lastName}</div>
                      <div className="text-[11px] text-slate-500">{admin.email}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant={admin.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                        {admin.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <select
                        value={presetDrafts[admin.id] ?? selectionFromPermissions(admin.permissions)}
                        onChange={(event) =>
                          setPresetDrafts((current) => ({
                            ...current,
                            [admin.id]: event.target.value as AdminPreset,
                          }))
                        }
                        className="px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        {(Object.keys(PRESET_LABELS) as AdminPreset[]).map((preset) => (
                          <option key={preset} value={preset}>
                            {PRESET_LABELS[preset]}
                          </option>
                        ))}
                      </select>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Effective: {admin.permissions.length > 0 ? admin.permissions.join(', ') : 'none'}
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void applyPreset(admin.id)}
                        className="font-bold text-[11px] text-slate-700 hover:underline"
                      >
                        Apply
                      </button>
                      {admin.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={() => void setAdminStatus(admin.id, 'DISABLED')}
                          className="font-bold text-[11px] text-red-600 hover:underline"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void setAdminStatus(admin.id, 'ACTIVE')}
                          className="font-bold text-[11px] text-emerald-600 hover:underline"
                        >
                          Enable
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      {adminsLoading
                        ? 'Loading administrators…'
                        : 'No administrator accounts appointed yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Vendor application review */}
        <section className="space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Vendor Application Review
          </h2>

          <div className="flex gap-2" role="tablist" aria-label="Filter applications by status">
            {(['PENDING', 'APPROVED', 'REJECTED'] as ApplicationFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={filter === status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  filter === status
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                }`}
              >
                {status === 'PENDING' ? 'Pending review' : status === 'APPROVED' ? 'Approved' : 'Rejected'}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">Store</th>
                  <th className="p-4">Applicant</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Status</th>
                  {filter === 'PENDING' && <th className="p-4 text-right">Decision</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {applications.map((application) => (
                  <tr key={application.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{application.storeName}</td>
                    <td className="p-4">
                      <div className="font-semibold">{application.firstName} {application.lastName}</div>
                      <div className="text-[11px] text-slate-500">{application.email}</div>
                    </td>
                    <td className="p-4 max-w-sm">{application.storeDescription || 'No description supplied.'}</td>
                    <td className="p-4">
                      <Badge
                        variant={application.status === 'APPROVED' ? 'success' : application.status === 'REJECTED' ? 'danger' : 'warning'}
                        size="sm"
                      >
                        {application.status}
                      </Badge>
                    </td>
                    {filter === 'PENDING' && (
                      <td className="p-4 text-right space-x-3">
                        <button
                          onClick={() => void reviewApplication(application.id, 'APPROVED')}
                          className="font-bold text-xs text-emerald-600 hover:underline"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => void reviewApplication(application.id, 'REJECTED')}
                          className="font-bold text-xs text-red-600 hover:underline"
                        >
                          Reject
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr>
                    <td colSpan={filter === 'PENDING' ? 5 : 4} className="p-8 text-center text-slate-400">
                      {loading ? 'Loading vendor applications…' : `No ${filter.toLowerCase()} vendor applications.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
          The manager owns platform governance: only this console appoints administrators and changes
          their permissions. All actions are recorded against your account.
        </p>
      </div>
    </div>
  );
};
