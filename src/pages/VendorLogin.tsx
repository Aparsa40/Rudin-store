import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { LoginForm } from '../components/auth/LoginForm';
import { AUTH_PORTALS } from '../config/authPortals';
import type { User } from '../types';

/**
 * Vendor login portal (/vendor/login).
 * Submits only to POST /api/auth/vendor/login. The backend accepts approved
 * vendor accounts only; approved vendors are routed to /seller/dashboard.
 */
export const VendorLogin: React.FC = () => {
  const { login, user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'VENDOR') {
      navigate(AUTH_PORTALS.vendor.homeRoute, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSuccess = (session: { user: User; accessToken: string }) => {
    login(session.user, session.accessToken);
    addToast('Welcome back to your vendor workspace.', 'success');
    navigate(AUTH_PORTALS.vendor.homeRoute);
  };

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center max-w-lg">
      <div className="w-full bg-white p-8 sm:p-10 rounded-3xl border border-amber-200 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-amber-500 text-white flex items-center justify-center rounded-2xl mx-auto shadow-md" aria-hidden="true">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Vendor Sign-In</h1>
          <p className="text-xs text-slate-500">
            Vendor access requires an approved vendor account. If your application is
            still under review, you cannot sign in here yet.
          </p>
        </div>

        <LoginForm portal="vendor" submitLabel="Sign In to Vendor Dashboard" onSuccess={handleSuccess} />

        <div className="space-y-2 text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <p>
            Want to sell on Rudin Store?{' '}
            <Link to="/seller/join" className="font-bold text-slate-900 hover:underline">
              Apply to become a vendor
            </Link>
          </p>
          <p className="text-[11px] text-slate-400">
            Application status: our team reviews every application. Once approved, sign
            in here to open your seller dashboard.
          </p>
          <p>
            Shopping instead?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:underline">
              Customer sign-in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
