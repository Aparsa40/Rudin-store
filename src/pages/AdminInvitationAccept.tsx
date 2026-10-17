import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export const AdminInvitationAccept: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [verified, setVerified] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);

  const verifyEmail = async () => {
    setBusy(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin-invitations/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'The invitation could not be verified.');
      }

      setEmail(payload.email || '');
      setFirstName(payload.firstName || '');
      setVerified(true);
      setMessage('Email verified. Review and accept the invitation below.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Email verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const acceptInvitation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin-invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, accepted }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'The invitation could not be accepted.');
      }

      setFinished(true);
      setPassword('');
      setMessage(
        payload.message || 'Invitation accepted. Your account is awaiting final Manager approval.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Invitation acceptance failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto max-w-lg px-4 py-16">
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Rudin Store administrator invitation
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Verify the email address, explicitly accept the invitation, and choose your own
            password. Administrator access remains unavailable until the Manager gives final
            approval.
          </p>
        </div>

        {!token && (
          <p role="alert" className="text-sm text-red-600">
            The invitation token is missing. Please open the invitation link from your email.
          </p>
        )}

        {!verified && (
          <Button
            type="button"
            className="w-full"
            disabled={!token || busy}
            onClick={() => void verifyEmail()}
          >
            {busy ? 'Please wait…' : 'Verify email address'}
          </Button>
        )}

        {verified && !finished && (
          <form onSubmit={(event) => void acceptInvitation(event)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-800">Invitee</label>
              <p className="text-sm text-slate-700">
                {firstName} · {email}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-800">
                Choose your password
              </label>
              <input
                required
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none focus:border-slate-500"
                placeholder="At least 12 characters"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                required
                className="mt-1"
              />
              <span>
                I accept this administrator invitation and understand that access is subject to
                final Manager approval.
              </span>
            </label>

            <Button type="submit" className="w-full" disabled={busy || !accepted}>
              {busy ? 'Please wait…' : 'Accept invitation'}
            </Button>
          </form>
        )}

        {message && (
          <p role="status" className="text-sm text-slate-600">
            {message}
          </p>
        )}

        {finished && (
          <Link
            to="/admin/login"
            className="inline-block text-sm font-semibold text-slate-900 hover:underline"
          >
            Go to administrator sign-in
          </Link>
        )}

        <p className="text-xs text-slate-400">
          If you did not expect this invitation, you can close this page without accepting it.
        </p>
      </div>
    </div>
  );
};
