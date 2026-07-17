import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useLookupsStore } from '@/store/useLookupsStore';
import Login from '@/pages/Login';
import Today from '@/pages/Today';
import Roster from '@/pages/Roster';
import Simulate from '@/pages/Simulate';
import Predictability from '@/pages/Predictability';

type AccessState = 'checking' | 'authorized' | 'unauthorized' | 'error';

export default function App() {
  const lookupsStatus = useLookupsStore((s) => s.status);
  const lookupsError = useLookupsStore((s) => s.error);
  const loadLookups = useLookupsStore((s) => s.load);

  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [access, setAccess] = useState<AccessState>('checking');
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setAccess('checking');
      return;
    }
    let cancelled = false;
    setAccess('checking');
    supabase
      .from('kboard_access')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setAccessError(error.message);
          setAccess('error');
          return;
        }
        setAccess(data ? 'authorized' : 'unauthorized');
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (access === 'authorized') void loadLookups();
  }, [access, loadLookups]);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-muted">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-k border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (access === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-muted">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-k border-t-transparent" />
      </div>
    );
  }

  if (access === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-6">
        <div className="max-w-md rounded-lg border border-line bg-bg-elevated p-6 text-center">
          <p className="mb-2 font-display font-semibold text-k">Couldn't check access</p>
          <p className="text-sm text-text-muted">{accessError}</p>
        </div>
      </div>
    );
  }

  if (access === 'unauthorized') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-6">
        <div className="max-w-md rounded-lg border border-line bg-bg-elevated p-6 text-center">
          <p className="mb-2 font-display font-semibold text-k">No access yet</p>
          <p className="text-sm text-text-muted">
            You're signed in as {session.user.email}, but this account hasn't been granted access to K-Board.
            Ask the owner to add you.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 rounded-md border border-line px-3 py-1.5 text-sm text-text-muted hover:border-k hover:text-text"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (lookupsStatus === 'idle' || lookupsStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-muted">
        <div className="text-center">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-k border-t-transparent" />
          <p className="text-sm">Loading teams and players…</p>
        </div>
      </div>
    );
  }

  if (lookupsStatus === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-6">
        <div className="max-w-md rounded-lg border border-line bg-bg-elevated p-6 text-center">
          <p className="mb-2 font-display font-semibold text-k">Couldn't load K-Board</p>
          <p className="text-sm text-text-muted">{lookupsError}</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/roster" element={<Roster />} />
        <Route path="/simulate" element={<Simulate />} />
        <Route path="/predictability" element={<Predictability />} />
      </Routes>
    </HashRouter>
  );
}
