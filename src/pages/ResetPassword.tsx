import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useUIStore } from '../store/uiStore';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const initialEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const { addToast } = useUIStore();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/${token ? 'confirm' : 'request'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(token ? { email: email.trim(), token, password } : { email: email.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || 'Password reset could not be completed.');
      const successMessage = token ? 'Password updated. You can now sign in with your new password.' : payload.message;
      setMessage(successMessage);
      addToast(successMessage, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset could not be completed.';
      setMessage(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-lg">
      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{token ? 'Choose a new password' : 'Reset your password'}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {token ? 'Choose a strong password with at least 12 characters.' : 'We will email a single-use link that expires in 30 minutes.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Email address</label>
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:border-slate-500" />
          </div>
          {token && (
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">New password</label>
              <input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:border-slate-500" />
            </div>
          )}
          <Button type="submit" block disabled={busy}>{busy ? 'Please wait…' : token ? 'Update password' : 'Send reset link'}</Button>
        </form>
        {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
        <p className="text-sm text-slate-500"><Link to="/login" className="font-semibold text-slate-900 hover:underline">Back to sign in</Link></p>
      </div>
    </div>
  );
};
