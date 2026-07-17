import { AppShell } from '@/components/layout/AppShell';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { MatchupSlate } from '@/components/matchup/MatchupSlate';
import { useEasternSlate } from '@/lib/useEasternSlate';
import { defaultEasternDate, fmt } from '@/lib/format';

export default function Today() {
  const easternToday = defaultEasternDate();
  const { status, rows, historyBundle, error } = useEasternSlate(easternToday);

  const gamesToday = new Set(rows.map((r) => r.game_pk)).size;
  const startersProjected = rows.filter((r) => r.projected_strikeouts !== null).length;

  return (
    <AppShell title="Today's Board">
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Date" value={`${easternToday} ET`} />
        <SummaryCard label="Games Today" value={status === 'ready' ? String(gamesToday) : '–'} />
        <SummaryCard label="Starters Projected" value={status === 'ready' ? String(startersProjected) : '–'} />
        <SummaryCard
          label="Model MAE"
          value={historyBundle?.metrics.starts ? fmt(historyBundle.metrics.mae, 2) : '–'}
          tone="k"
        />
      </div>

      <p className="mb-4 text-[12.5px] text-text-muted">
        Today's MLB slate by US Eastern date, grouped chronologically by matchup. Pitchers flagged as recent
        openers are intentionally excluded.
      </p>

      {status === 'loading' && <div className="py-10 text-center text-sm text-text-muted">Loading today's board…</div>}
      {status === 'error' && <div className="py-10 text-center text-sm text-text-muted">Couldn't load slate: {error}</div>}
      {status === 'ready' && (
        <MatchupSlate
          rows={rows}
          emptyMessage="No starters found for this Eastern-date slate — no probable snapshot was captured and no games are Final for it."
        />
      )}
    </AppShell>
  );
}
