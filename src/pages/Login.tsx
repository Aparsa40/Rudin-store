import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ShieldCheck, User, Store, ShieldAlert, ArrowRight } from 'lucide-react';
import { Role } from '../types';

export const Login: React.FC = () => {
  const { login, updateUserRole, isLoading, setLoading } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      login({
        id: 'u1',
        email: email || 'alex.morgan@example.com',
        firstName: email ? email.split('@')[0] : 'Alex',
        lastName: 'Morgan',
        role: 'CUSTOMER',
        phone: '+1 (555) 234-5678',
        createdAt: new Date().toISOString(),
      });
      setLoading(false);
      addToast('Signed in successfully!', 'success');
      navigate('/account');
    }, 400);
  };

  const handleDemoLogin = (role: Role) => {
    setLoading(true);
    setTimeout(() => {
      login({
        id: role === 'VENDOR' ? 'u_v1' : role === 'ADMIN' ? 'u_admin' : 'u1',
        email:
          role === 'VENDOR'
            ? 'aether@rudinstore.com'
            : role === 'ADMIN'
              ? 'admin@rudinstore.com'
              : 'alex.morgan@example.com',
        firstName: role === 'VENDOR' ? 'Aether' : role === 'ADMIN' ? 'Admin' : 'Alex',
        lastName: role === 'VENDOR' ? 'Acoustics' : role === 'ADMIN' ? 'Ops' : 'Morgan',
        role,
        createdAt: new Date().toISOString(),
      });
      setLoading(false);
      addToast(`Logged in with demo ${role.toLowerCase()} privileges!`, 'success');
      if (role === 'VENDOR') navigate('/seller/dashboard');
      else if (role === 'ADMIN') navigate('/admin');
      else navigate('/account');
    }, 200);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setOtpSent(true);
    addToast('One-Time Passcode (OTP) sent to your inbox: 8492', 'info');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotModalOpen(false);
    addToast('Password successfully reset! You can now log in.', 'success');
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

        {/* 1-Click Demo Profiles (For Instant Evaluation & Testing) */}
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
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Forgot?
              </button>
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

      {/* Forgot Password / OTP Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-150 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 shadow-xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900">Reset Account Password</h3>

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
                <p className="text-slate-500">
                  Enter your registered account email to receive a 4-digit verification code.
                </p>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsForgotModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Send Code
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
                <p className="text-slate-500">
                  Enter the 4-digit code sent to <strong>{forgotEmail}</strong> (Demo code: 8492).
                </p>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Passcode</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="8492"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none text-center font-mono font-bold text-base tracking-widest"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOtpSent(false)}
                  >
                    Back
                  </Button>
                  <Button type="submit" size="sm">
                    Verify & Reset
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
