import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Badge } from '../components/ui/Badge';
import { User, Store, ShieldAlert } from 'lucide-react';
import { Role, type User as UserType } from '../types';
import { LoginForm } from '../components/auth/LoginForm';

/**
 * Customer login portal (/login).
 * Submits only to POST /api/auth/customer/login. On success the customer is
 * routed to their account or back to their preserved destination.
 */
export const Login: React.FC = () => {
  const { login, loginAsDemo } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  const returnPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const handleSuccess = (session: { user: UserType; accessToken: string }) => {
    login(session.user, session.accessToken);
    addToast('Signed in successfully!', 'success');
    navigate(returnPath && returnPath !== '/login' ? returnPath : '/account');
  };

  const handleDemoLogin = (role: Role) => {
    loginAsDemo(role);
    addToast(`Demo ${role.toLowerCase()} session enabled for local evaluation only.`, 'info');
    if (role === 'VENDOR') navigate('/seller/dashboard');
    else if (role === 'ADMIN') navigate('/admin');
    else navigate('/account');
  };

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center max-w-lg">
      <div className="w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-2xl font-black text-2xl mx-auto shadow-md" aria-hidden="true">
            R
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Sign in to your customer account
          </h1>
          <p className="text-xs text-slate-500">
            Access your orders, saved artisan items, and store preferences
          </p>
        </div>

        {import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true' && (
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
            <span>Fast 1-Click Demo Logins:</span>
            <Badge variant="purple" size="sm">
              Evaluation Mode
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('CUSTOMER')}
              className="p-2 bg-white border border-slate-200 hover:border-slate-900 rounded-xl text-xs font-semibold text-slate-800 transition-colors flex flex-col items-center gap-1 shadow-xs"
            >
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Customer</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('VENDOR')}
              className="p-2 bg-white border border-slate-200 hover:border-slate-900 rounded-xl text-xs font-semibold text-slate-800 transition-colors flex flex-col items-center gap-1 shadow-xs"
            >
              <Store className="w-3.5 h-3.5 text-amber-600" />
              <span>Seller</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('ADMIN')}
              className="p-2 bg-white border border-slate-200 hover:border-slate-900 rounded-xl text-xs font-semibold text-slate-800 transition-colors flex flex-col items-center gap-1 shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        )}

        <LoginForm portal="customer" submitLabel="Sign In with Email" onSuccess={handleSuccess} />

        <div className="space-y-2 text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <p>
            New to Rudin Store?{' '}
            <Link to="/register" className="font-bold text-slate-900 hover:underline">
              Create an Account
            </Link>
          </p>
          <p>
            Want to sell with us?{' '}
            <Link to="/seller/join" className="font-semibold text-blue-600 hover:underline">
              Apply to become a vendor
            </Link>
          </p>
        </div>

        <div className="text-center text-[11px] text-slate-400 space-y-1">
          <p className="font-bold text-slate-500">Looking for a different portal?</p>
          <p>
            <Link to="/vendor/login" className="text-slate-600 hover:text-slate-900 hover:underline">Vendor sign-in</Link>
            {' · '}
            <Link to="/admin/login" className="text-slate-600 hover:text-slate-900 hover:underline">Administrator sign-in</Link>
            {' · '}
            <Link to="/manager/login" className="text-slate-600 hover:text-slate-900 hover:underline">Manager sign-in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
