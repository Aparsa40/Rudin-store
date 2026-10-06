import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Button } from '../components/ui/Button';
import { Role } from '../types';

export const Register: React.FC = () => {
  const { register, isLoading, setLoading } = useAuthStore();
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

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email || !formData.password) {
      addToast('Please complete all required fields', 'error');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
      });
      setLoading(false);
      addToast('Welcome to Rudin Store! Your account is created.', 'success');

      if (formData.role === 'VENDOR') {
        navigate('/seller/dashboard');
      } else {
        navigate('/account');
      }
    }, 400);
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
              placeholder="Create a strong password"
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
