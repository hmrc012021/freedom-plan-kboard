import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedUpMessage, setSignedUpMessage] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (mode === 'sign-up') {
      setSignedUpMessage(true);
    }
    // On sign-in, App.tsx's onAuthStateChange listener picks up the new
    // session and re-renders past this screen automatically. Note that
    // signing up alone doesn't grant access -- an owner still has to add
    // the new account to mlb.kboard_access before any data will load.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm">
        <div className="mb-1 flex items-center gap-2 font-display text-2xl font-bold text-text">
          <span className="rounded bg-k px-2 py-0.5 text-bg">K</span>Board
        </div>
        <p className="mt-1 text-sm text-text-muted">
          {mode === 'sign-in' ? 'Sign in to continue' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-text-muted">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-line bg-bg-elevated px-3 py-2 text-text outline-none focus:ring-2 focus:ring-k"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-text-muted">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-line bg-bg-elevated px-3 py-2 text-text outline-none focus:ring-2 focus:ring-k"
            />
          </label>

          {error && <p className="text-sm text-k">{error}</p>}
          {signedUpMessage && (
            <p className="text-sm text-text-muted">
              Account created. If email confirmation is required, check your inbox, then sign in below.
              An owner still needs to grant you access before any data will load.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-md bg-k px-3 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setSignedUpMessage(false);
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
          }}
          className="mt-4 text-sm text-text-muted underline"
        >
          {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
