import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MatchupSlate } from '@/components/matchup/MatchupSlate';
import { useEasternSlate } from '@/lib/useEasternSlate';
import { defaultEasternDate } from '@/lib/format';
import { useSimulateStore } from '@/store/useSimulateStore';

export default function Simulate() {
  const [inputDate, setInputDate] = useState(defaultEasternDate());
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const { status, rows, historyBundle, error } = useEasternSlate(loadedDate);
  const setSlate = useSimulateStore((s) => s.setSlate);

  useEffect(() => {
    if (loadedDate && status === 'ready') setSlate(loadedDate, rows, historyBundle);
  }, [loadedDate, status, rows, historyBundle, setSlate]);

  return (
    <AppShell title="Simulate / Day Slate">
      <div className="mb-4 flex flex-wrap items-center gap-3.5">
        <label className="text-xs uppercase tracking-wide text-text-muted" htmlFor="sim-date">
          Date
        </label>
        <input
          id="sim-date"
          type="date"
          value={inputDate}
          onChange={(e) => setInputDate(e.target.value)}
          className="rounded border border-line bg-bg-elevated px-2.5 py-1.5 font-mono-num text-[13px] text-text"
        />
        <button
          onClick={() => setLoadedDate(inputDate)}
          className="rounded border border-line bg-bg-elevated-2 px-3.5 py-1.5 font-display text-xs uppercase tracking-wide text-text hover:border-k"
        >
          Load Slate
        </button>
      </div>

      <p className="mb-4 text-[12.5px] text-text-muted">
        For dates with completed games, this shows the real starter of record with a projection computed using{' '}
        <em>only history from before that date</em> — a genuine no-lookahead simulation. For dates without a final
        result yet, it falls back to the latest captured probable starters. Double-click any pitcher for their start
        history.
      </p>

      {loadedDate === null && <div className="py-10 text-center text-sm text-text-muted">Pick a date and hit Load Slate.</div>}
      {loadedDate !== null && status === 'loading' && <div className="py-10 text-center text-sm text-text-muted">Loading ET slate…</div>}
      {loadedDate !== null && status === 'error' && (
        <div className="py-10 text-center text-sm text-text-muted">Couldn't load slate: {error}</div>
      )}
      {loadedDate !== null && status === 'ready' && (
        <MatchupSlate
          rows={rows}
          emptyMessage="No starters found for this Eastern-date slate — no probable snapshot was captured and no games are Final for it."
        />
      )}
    </AppShell>
  );
}
