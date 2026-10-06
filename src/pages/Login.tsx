import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';

export const Login: React.FC = () => {
  const { login, isLoading, setLoading } = useAuthStore();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock login delay
    setTimeout(() => {
      login({
        id: 'u1',
        email,
        firstName: 'John',
        lastName: 'Doe',
        role: 'CUSTOMER',
        createdAt: new Date().toISOString()
      });
      setLoading(false);
      navigate('/account');
    }, 1000);
  };

  return (
    <div className="container mx-auto px-4 py-20 flex justify-center">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-xl font-bold text-2xl mx-auto mb-4">
            R
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-slate-500 mt-2">Log in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" 
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <a href="#" className="text-xs font-medium text-blue-600 hover:underline">Forgot password?</a>
            </div>
            <input 
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" 
            />
          </div>
          
          <div className="pt-2">
            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Log In
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Don't have an account? <Link to="/register" className="font-medium text-slate-900 hover:underline">Sign up</Link>
        </div>
      </div>
    </div>
  );
};
