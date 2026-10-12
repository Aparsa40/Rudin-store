import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

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

/**
 * Manager workspace (/manager).
 * Managers hold the least-privilege MANAGER role: their only capability is
 * reviewing vendor applications. Every action calls the real backend API;
 * this page contains no mock data.
 */
export const ManagerDashboard: React.FC = () => {
  const [filter, setFilter] = useState<ApplicationFilter>('PENDING');
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

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

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 p-6 sm:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Vendor Application Review</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manager workspace. Managers may only review vendor applications; account,
              catalog, order and payment administration remain with platform administrators.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadApplications()} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>

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

        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
          Manager permissions are limited to vendor application review. All actions are recorded against your account.
        </p>
      </div>
    </div>
  );
};
