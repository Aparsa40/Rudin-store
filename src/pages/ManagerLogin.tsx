import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { LoginForm } from '../components/auth/LoginForm';
import { AUTH_PORTALS } from '../config/authPortals';
import type { User } from '../types';

/**
 * Manager login portal (/manager/login).
 * Submits only to POST /api/auth/manager/login. Manager accounts are assigned
 * by platform administrators; the role grants vendor application review only.
 */
export const ManagerLogin: React.FC = () => {
  const { login, user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'MANAGER') {
      navigate(AUTH_PORTALS.manager.homeRoute, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSuccess = (session: { user: User; accessToken: string }) => {
    login(session.user, session.accessToken);
    addToast('Manager session started.', 'success');
    navigate(AUTH_PORTALS.manager.homeRoute);
  };

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center max-w-lg">
      <div className="w-full bg-white p-8 sm:p-10 rounded-3xl border border-teal-200 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-teal-600 text-white flex items-center justify-center rounded-2xl mx-auto shadow-md" aria-hidden="true">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manager Sign-In</h1>
          <p className="text-xs text-slate-500">
            Managers review vendor applications only. Account, catalog, order and
            payment administration remain with platform administrators. Manager
            accounts are assigned by an administrator and cannot be registered.
          </p>
        </div>

        <LoginForm portal="manager" submitLabel="Sign In to Manager Workspace" onSuccess={handleSuccess} />

        <div className="space-y-2 text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <p>
            Need help with your manager account? Please contact your platform administrator.
          </p>
          <p className="text-[11px] text-slate-400">
            <Link to="/login" className="text-slate-500 hover:text-slate-900 hover:underline">Customer sign-in</Link>
            {' · '}
            <Link to="/vendor/login" className="text-slate-500 hover:text-slate-900 hover:underline">Vendor sign-in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
