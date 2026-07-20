import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { MatchupBoard } from '@/components/matchup/MatchupBoard';
import { groupRowsByGame } from '@/components/matchup/GameCard';
import { useSimulateStore } from '@/store/useSimulateStore';
import { useEasternSlate } from '@/lib/useEasternSlate';
import { usePredictabilityEnrichedRows } from '@/lib/usePredictability';
import { usePostMortemEnrichedRows } from '@/lib/usePostMortem';
import { fmt, signed, defaultEasternDate } from '@/lib/format';

// Same game-grouped matchup view as Today's Board / Simulation (MatchupBoard),
// fed by the same shared enrichment hooks -- so a pitcher's confidence score
// is computed identically no matter which page you're looking at it from.
export default function Predictability() {
  const storeDate = useSimulateStore((s) => s.date);
  const setSlate = useSimulateStore((s) => s.setSlate);

  const [inputDate, setInputDate] = useState(storeDate ?? defaultEasternDate());
  const [loadedDate, setLoadedDate] = useState<string | null>(storeDate ?? defaultEasternDate());
  const { status, rows, historyBundle, error } = useEasternSlate(loadedDate);

  const rowsWithPredictability = usePredictabilityEnrichedRows(rows, historyBundle);
  const enrichedRows = usePostMortemEnrichedRows(rowsWithPredictability, status);

  useEffect(() => {
    if (loadedDate && status === 'ready') setSlate(loadedDate, enrichedRows, historyBundle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedDate, status, historyBundle]);

  const games = groupRowsByGame(enrichedRows);

  const dateControl = (
    <div className="mb-4 flex flex-wrap items-center gap-3.5">
      <label className="text-xs uppercase tracking-wide text-text-muted" htmlFor="predict-date">
        Date
      </label>
      <input
        id="predict-date"
        type="date"
        value={inputDate}
        onChange={(e) => setInputDate(e.target.value)}
        className="rounded border border-line bg-bg-elevated px-2.5 py-1.5 font-mono-num text-[13px] text-text"
      />
      <button
        onClick={() => setLoadedDate(inputDate)}
        className="rounded border border-line bg-bg-elevated-2 px-3.5 py-1.5 font-display text-xs uppercase tracking-wide text-text hover:border-k"
      >
        Load
      </button>
    </div>
  );

  if (status === 'loading' || status === 'idle') {
    return (
      <AppShell title="Confidence">
        {dateControl}
        <div className="py-10 text-center text-sm text-text-muted">Calculating model quality and pitcher volatility…</div>
      </AppShell>
    );
  }

  if (status === 'error') {
    return (
      <AppShell title="Confidence">
        {dateControl}
        <div className="py-10 text-center text-sm text-text-muted">Couldn't load predictability: {error}</div>
      </AppShell>
    );
  }

  if (!historyBundle) {
    return (
      <AppShell title="Confidence">
        {dateControl}
        <div className="py-10 text-center text-sm text-text-muted">No scored model history available for this date.</div>
      </AppShell>
    );
  }

  const model = historyBundle.metrics;
  const uniquePitchers = new Set(rows.map((r) => r.pitcher_id)).size;

  return (
    <AppShell title="Confidence">
      {dateControl}

      <div className="mb-4 rounded-md border border-line bg-bg-elevated-2 px-4 py-3 text-[12.5px] leading-relaxed text-text-muted">
        This screen separates two different questions: how accurate the model is overall, and how much a
        particular pitcher's actual results still swing after the model has accounted for opponent and workload.
        Positive bias means the pitcher has struck out more batters than projected; negative bias means the model
        has generally projected him too high.
      </div>

      <div className="mb-5 flex flex-wrap gap-3.5">
        <SummaryCard label="Slate Pitchers" value={String(uniquePitchers)} />
        <SummaryCard label="Model Starts Scored" value={String(model.starts)} />
        <SummaryCard label="Model Avg Miss" value={`${fmt(model.mae, 2)} K`} />
        <SummaryCard label="Model Bias" value={`${signed(model.bias, 2)} K`} />
        <SummaryCard label="Normal Model Volatility" value={`${fmt(model.volatility, 2)} K`} />
      </div>

      {games.length === 0 ? (
        <div className="py-10 text-center text-sm text-text-muted">No pitchers found on this slate.</div>
      ) : (
        <MatchupBoard games={games} />
      )}

      <div className="mt-5 text-[11.5px] leading-relaxed text-text-muted">
        Predictability uses stored pre-game projections only—never a projection recomputed after the result.
        Pitcher volatility is the standard deviation of actual-minus-projected residuals, with small samples
        partially shrunk toward the overall model volatility. Fewer than five scored starts remains insufficient
        for a firm label.
      </div>
    </AppShell>
  );
}
