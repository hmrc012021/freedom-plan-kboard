import { useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ACCENT_PRESETS, applyAccent, getStoredAccentId } from '@/lib/accentPreference';
import { supabase } from '@/lib/supabaseClient';

interface ProbablesRefreshRun {
  gamesSeen: number;
  snapshotsWritten: number;
}

export default function Settings() {
  const [accentId, setAccentId] = useState(getStoredAccentId());
  const [refreshState, setRefreshState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  function handleAccentPick(id: string) {
    applyAccent(id);
    setAccentId(id);
  }

  // Probables are otherwise only refreshed by cron (9:10am and 6pm ET) -- MLB
  // frequently confirms starters for later games in between, so this lets
  // anyone pull whatever's been announced since the last run instead of
  // waiting on the clock.
  async function handleRefreshProbables() {
    setRefreshState('running');
    setRefreshMessage(null);
    const { data, error } = await supabase.functions.invoke<{ results?: ProbablesRefreshRun[] }>('mlb-refresh-probables', {
      body: {},
    });
    if (error) {
      setRefreshState('error');
      setRefreshMessage(error.message);
      return;
    }
    const run = data?.results?.[0];
    setRefreshState('done');
    setRefreshMessage(
      run
        ? `Checked ${run.gamesSeen} games, found ${run.snapshotsWritten} new probable${run.snapshotsWritten === 1 ? '' : 's'}.`
        : 'Refresh completed.'
    );
  }

  return (
    <AppShell title="Settings">
      <div className="max-w-md rounded-md border border-line bg-bg-elevated p-4">
        <h2 className="mb-1 font-display text-sm font-semibold text-text">Appearance</h2>
        <p className="mb-3.5 text-[12.5px] text-text-muted">
          Accent color is personal to this device — it's saved in your browser only, not shared with
          anyone else who has access to K-Board.
        </p>
        <div className="flex flex-wrap gap-3">
          {ACCENT_PRESETS.map((preset) => (
            <button key={preset.id} onClick={() => handleAccentPick(preset.id)} title={preset.label} className="flex flex-col items-center gap-1.5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-bg-elevated transition-all"
                style={{
                  background: preset.swatch,
                  ['--tw-ring-color' as string]: accentId === preset.id ? preset.swatch : 'transparent',
                }}
              >
                {accentId === preset.id && <Check size={15} className="text-bg drop-shadow" />}
              </span>
              <span className="text-[10.5px] text-text-muted">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 max-w-md rounded-md border border-line bg-bg-elevated p-4">
        <h2 className="mb-1 font-display text-sm font-semibold text-text">Probable Pitchers</h2>
        <p className="mb-3.5 text-[12.5px] text-text-muted">
          Probables refresh automatically at 9:10am and 6pm ET. MLB often confirms starters for
          later games in between — run this to pull whatever's been announced since the last
          refresh instead of waiting.
        </p>
        <button
          onClick={handleRefreshProbables}
          disabled={refreshState === 'running'}
          className="flex items-center gap-2 rounded border border-line bg-bg-elevated-2 px-3.5 py-1.5 font-display text-xs uppercase tracking-wide text-text hover:border-k disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshState === 'running' ? 'animate-spin' : ''} />
          {refreshState === 'running' ? 'Refreshing…' : 'Refresh Probable Pitchers'}
        </button>
        {refreshMessage && (
          <p className={`mt-2.5 text-[12px] ${refreshState === 'error' ? 'text-danger' : 'text-text-muted'}`}>{refreshMessage}</p>
        )}
      </div>
    </AppShell>
  );
}
