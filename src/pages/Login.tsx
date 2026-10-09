import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ShieldCheck, User, Store, ShieldAlert, ArrowRight } from 'lucide-react';
import { Role } from '../types';
import { authService } from '../services/auth/authService';

export const Login: React.FC = () => {
  const { login, loginAsDemo, isLoading, setLoading } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const session = await authService.login(email.trim(), password);
      login(session.user, session.accessToken);
      addToast('Signed in successfully!', 'success');
      if (session.user.role === 'ADMIN') navigate('/admin');
      else if (session.user.role === 'VENDOR') navigate('/seller/dashboard');
      else navigate('/account');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to sign in. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
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
          <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-2xl font-black text-2xl mx-auto shadow-md">
            R
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Sign in to Rudin Store
          </h1>
          <p className="text-xs text-slate-500">
            Access your orders, saved artisan items, and stores
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

        {/* Standard Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="alex.morgan@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-900">Password</label>
              <Link to="/reset-password" className="text-xs text-blue-600 hover:underline font-semibold">
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500"
            />
          </div>

          <Button type="submit" size="lg" className="w-full font-bold h-11" isLoading={isLoading}>
            Sign In with Email
          </Button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          New to Rudin Store?{' '}
          <Link to="/register" className="font-bold text-slate-900 hover:underline">
            Create an Account
          </Link>
        </div>
      </div>

    </div>
  );
};
