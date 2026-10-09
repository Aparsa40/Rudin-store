import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Button } from '../components/ui/Button';
import { Role } from '../types';
import { authService } from '../services/auth/authService';

export const Register: React.FC = () => {
  const { login, isLoading, setLoading } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'CUSTOMER' as Role,
    termsAccepted: true,
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.email.trim() || formData.password.length < 12) {
      addToast('Enter your name and email, and use a password of at least 12 characters.', 'error');
      return;
    }

    setLoading(true);
    try {
      const session = await authService.register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password
      });
      login(session.user, session.accessToken);
      if (formData.role === 'VENDOR') {
        addToast('Your customer account is ready. Seller onboarding and approval are not available yet.', 'info');
      } else {
        addToast('Welcome to Rudin Store! Your account is created.', 'success');
      }
      navigate('/account');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to create your account. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center max-w-lg">
      <div className="w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-2xl font-black text-2xl mx-auto shadow-md">
            R
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create your Account</h1>
          <p className="text-xs text-slate-500">
            Join a global community of independent patrons & makers
          </p>
        </div>

        {/* Account Type Selector (Customer vs Seller) */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, role: 'CUSTOMER' })}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              formData.role === 'CUSTOMER'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Buyer Account
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, role: 'VENDOR' })}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              formData.role === 'VENDOR'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Seller / Artisan Store
          </button>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">First Name *</label>
              <input
                required
                type="text"
                placeholder="Elena"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Last Name</label>
              <input
                type="text"
                placeholder="Rostova"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Email Address *</label>
            <input
              required
              type="email"
              placeholder="elena@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Phone Number</label>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Password *</label>
            <input
              required
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              placeholder="At least 12 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:border-slate-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-600">
            <input
              type="checkbox"
              required
              checked={formData.termsAccepted}
              onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <span>I agree to the Rudin Marketplace Terms & Privacy Guarantee</span>
          </label>

          <Button type="submit" size="lg" className="w-full font-bold h-11" isLoading={isLoading}>
            {formData.role === 'VENDOR'
              ? 'Create Artisan Storefront'
              : 'Create Free Customer Account'}
          </Button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-slate-900 hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
};
