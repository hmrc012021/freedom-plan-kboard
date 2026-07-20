import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { groupRowsByGame } from '@/components/matchup/GameCard';
import { MatchupBoard } from '@/components/matchup/MatchupBoard';
import { useEasternSlate } from '@/lib/useEasternSlate';
import { defaultEasternDate, fmt } from '@/lib/format';
import { usePredictabilityEnrichedRows } from '@/lib/usePredictability';
import { usePostMortemEnrichedRows } from '@/lib/usePostMortem';
import { useSimulateStore } from '@/store/useSimulateStore';

export default function Today() {
  const easternToday = defaultEasternDate();
  const { status, rows, historyBundle, error } = useEasternSlate(easternToday);
  const setSlate = useSimulateStore((s) => s.setSlate);

  const rowsWithPredictability = usePredictabilityEnrichedRows(rows, historyBundle);
  const enrichedRows = usePostMortemEnrichedRows(rowsWithPredictability, status);

  // Shared with Simulation and MatchupPage so opening a game from Today's
  // Board doesn't require a re-fetch.
  useEffect(() => {
    if (status === 'ready') setSlate(easternToday, enrichedRows, historyBundle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, easternToday, historyBundle]);

  const games = groupRowsByGame(enrichedRows);
  const startersProjected = rows.filter((r) => r.projected_strikeouts !== null).length;

  return (
    <AppShell title="Today / Matchups">
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Date" value={`${easternToday} ET`} />
        <SummaryCard label="Games Today" value={status === 'ready' ? String(games.length) : '–'} />
        <SummaryCard label="Starters Projected" value={status === 'ready' ? String(startersProjected) : '–'} />
        <SummaryCard
          label="Model MAE"
          value={historyBundle?.metrics.starts ? fmt(historyBundle.metrics.mae, 2) : '–'}
          tone="k"
        />
      </div>

      {status === 'loading' && <div className="py-10 text-center text-sm text-text-muted">Loading today's board…</div>}
      {status === 'error' && <div className="py-10 text-center text-sm text-text-muted">Couldn't load slate: {error}</div>}
      {status === 'ready' && games.length === 0 && (
        <div className="py-10 text-center text-sm text-text-muted">
          No starters found for this Eastern-date slate — no probable snapshot was captured and no games are Final for it.
        </div>
      )}
      {status === 'ready' && games.length > 0 && <MatchupBoard games={games} />}
    </AppShell>
  );
}
