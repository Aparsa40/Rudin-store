import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { authService } from '../../services/auth/authService';
import { AUTH_PORTALS, type AuthPortal } from '../../config/authPortals';
import type { User } from '../../types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginFormProps {
  portal: AuthPortal;
  submitLabel: string;
  onSuccess: (session: { user: User; accessToken: string }) => void;
}

/**
 * Shared credential form for every role-specific login portal.
 * It submits only to the backend endpoint that belongs to its portal and keeps
 * validation, loading and error states keyboard- and screen-reader-accessible.
 */
export const LoginForm: React.FC<LoginFormProps> = ({ portal, submitLabel, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fieldId = AUTH_PORTALS[portal].id;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setBusy(true);
    try {
      const session = await authService.loginToPortal(portal, email.trim(), password);
      onSuccess(session);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Unable to sign in. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={`${fieldId}-email`} className="block text-xs font-bold text-slate-900 mb-1">
          Email Address
        </label>
        <input
          id={`${fieldId}-email`}
          type="email"
          required
          autoFocus
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(error)}
          className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={`${fieldId}-password`} className="block text-xs font-bold text-slate-900">
            Password
          </label>
          <Link
            to="/reset-password"
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id={`${fieldId}-password`}
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
            className="w-full px-3.5 py-2.5 pr-11 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-pressed={showPassword}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 rounded-r-xl"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs font-semibold text-red-600">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full font-bold h-11"
        isLoading={busy}
        disabled={busy}
      >
        {submitLabel}
      </Button>
    </form>
  );
};
