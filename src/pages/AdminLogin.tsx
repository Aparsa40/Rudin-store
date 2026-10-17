import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { LoginForm } from '../components/auth/LoginForm';
import { AUTH_PORTALS } from '../config/authPortals';
import type { User } from '../types';

/**
 * Administrator login portal (/admin/login).
 * Submits only to POST /api/auth/admin/login. Administrator accounts are
 * provisioned internally and cannot be created from public pages.
 */
export const AdminLogin: React.FC = () => {
  const { login, user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      navigate(AUTH_PORTALS.admin.homeRoute, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSuccess = (session: { user: User; accessToken: string }) => {
    login(session.user, session.accessToken);
    addToast('Administrator session started.', 'success');
    navigate(AUTH_PORTALS.admin.homeRoute);
  };

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center max-w-lg">
      <div className="w-full rounded-3xl bg-slate-950 p-2 shadow-lg">
        <div className="bg-white p-8 sm:p-10 rounded-[1.25rem] space-y-6">
          <div className="text-center space-y-2">
            <div
              className="w-12 h-12 bg-blue-600 text-white flex items-center justify-center rounded-2xl mx-auto shadow-md"
              aria-hidden="true"
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Administrator Access
            </h1>
            <p className="text-xs text-slate-500">
              This portal is reserved for platform administrators. Administrator accounts are
              provisioned internally and cannot be created from public pages.
            </p>
          </div>

          <LoginForm
            portal="admin"
            submitLabel="Sign In to Admin Console"
            onSuccess={handleSuccess}
          />

          <div className="space-y-2 text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            <p>
              Not an administrator?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:underline">
                Return to the store
              </Link>
            </p>
            <p className="text-[11px] text-slate-400">
              <Link
                to="/vendor/login"
                className="text-slate-500 hover:text-slate-900 hover:underline"
              >
                Vendor sign-in
              </Link>
              {' · '}
              <Link
                to="/manager/login"
                className="text-slate-500 hover:text-slate-900 hover:underline"
              >
                Manager sign-in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
