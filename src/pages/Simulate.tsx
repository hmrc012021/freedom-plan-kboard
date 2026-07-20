import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { groupRowsByGame } from '@/components/matchup/GameCard';
import { MatchupBoard } from '@/components/matchup/MatchupBoard';
import { useEasternSlate } from '@/lib/useEasternSlate';
import { defaultEasternDate } from '@/lib/format';
import { usePredictabilityEnrichedRows } from '@/lib/usePredictability';
import { usePostMortemEnrichedRows } from '@/lib/usePostMortem';
import { useSimulateStore } from '@/store/useSimulateStore';

export default function Simulate() {
  const [inputDate, setInputDate] = useState(defaultEasternDate());
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const { status, rows, historyBundle, error } = useEasternSlate(loadedDate);
  const setSlate = useSimulateStore((s) => s.setSlate);

  const rowsWithPredictability = usePredictabilityEnrichedRows(rows, historyBundle);
  const enrichedRows = usePostMortemEnrichedRows(rowsWithPredictability, status);

  useEffect(() => {
    if (loadedDate && status === 'ready') setSlate(loadedDate, enrichedRows, historyBundle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedDate, status, historyBundle]);

  const games = groupRowsByGame(enrichedRows);

  return (
    <AppShell title="Simulation / Post-Mortem">
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
        result yet, it falls back to the latest captured probable starters.
      </p>

      {loadedDate === null && <div className="py-10 text-center text-sm text-text-muted">Pick a date and hit Load Slate.</div>}
      {loadedDate !== null && status === 'loading' && <div className="py-10 text-center text-sm text-text-muted">Loading ET slate…</div>}
      {loadedDate !== null && status === 'error' && (
        <div className="py-10 text-center text-sm text-text-muted">Couldn't load slate: {error}</div>
      )}
      {loadedDate !== null && status === 'ready' && games.length === 0 && (
        <div className="py-10 text-center text-sm text-text-muted">
          No starters found for this Eastern-date slate — no probable snapshot was captured and no games are Final for it.
        </div>
      )}
      {loadedDate !== null && status === 'ready' && games.length > 0 && <MatchupBoard games={games} />}
    </AppShell>
  );
}
