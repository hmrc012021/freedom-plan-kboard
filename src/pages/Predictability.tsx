import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { PitcherPhoto } from '@/components/ui/PitcherPhoto';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { useSimulateStore } from '@/store/useSimulateStore';
import { useLookupsStore } from '@/store/useLookupsStore';
import { useEasternSlate } from '@/lib/useEasternSlate';
import { usePredictabilityEnrichedRows } from '@/lib/usePredictability';
import { fmt, signed, deltaClass, defaultEasternDate } from '@/lib/format';
import { teamLabel } from '@/lib/kboardData';
import { computeConfidenceScore } from '@/lib/confidence';
import type { ScoredHistoryRow } from '@/lib/predictability';

// Deliberately NOT the game-grouped MatchupBoard used by Today's Board --
// this page answers "which pitchers can I generally trust" (a ranked model-
// quality view), not "what's tonight's slate." Same underlying confidence
// computation (usePredictabilityEnrichedRows) as every other page, so a
// pitcher's score here always matches what's shown elsewhere -- just sorted
// by volatility instead of grouped by game.
export default function Predictability() {
  const storeDate = useSimulateStore((s) => s.date);
  const setSlate = useSimulateStore((s) => s.setSlate);
  const teamsById = useLookupsStore((s) => s.lookups!.teamsById);
  const playersById = useLookupsStore((s) => s.lookups!.playersById);

  const [inputDate, setInputDate] = useState(storeDate ?? defaultEasternDate());
  const [loadedDate, setLoadedDate] = useState<string | null>(storeDate ?? defaultEasternDate());
  const { status, rows, historyBundle, error } = useEasternSlate(loadedDate);

  const enrichedRows = usePredictabilityEnrichedRows(rows, historyBundle);

  useEffect(() => {
    if (loadedDate && status === 'ready') setSlate(loadedDate, enrichedRows, historyBundle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedDate, status, historyBundle]);

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
  const uniquePitchers = new Map<number, (typeof enrichedRows)[number]>();
  for (const row of enrichedRows) {
    if (!uniquePitchers.has(row.pitcher_id)) uniquePitchers.set(row.pitcher_id, row);
  }

  const pitcherRows = [...uniquePitchers.values()]
    .filter((row) => row._predictability)
    .sort((a, b) => {
      const sa = a._predictability!;
      const sb = b._predictability!;
      if (sa.n < 5 && sb.n >= 5) return 1;
      if (sb.n < 5 && sa.n >= 5) return -1;
      return sb.adjustedVolatility - sa.adjustedVolatility;
    });

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
        <SummaryCard label="Slate Pitchers" value={String(uniquePitchers.size)} />
        <SummaryCard label="Model Starts Scored" value={String(model.starts)} />
        <SummaryCard label="Model Avg Miss" value={`${fmt(model.mae, 2)} K`} />
        <SummaryCard label="Model Bias" value={`${signed(model.bias, 2)} K`} />
        <SummaryCard label="Normal Model Volatility" value={`${fmt(model.volatility, 2)} K`} />
      </div>

      {pitcherRows.length === 0 ? (
        <div className="py-10 text-center text-sm text-text-muted">No pitchers found on this slate.</div>
      ) : (
        <div className="space-y-2.5">
          {pitcherRows.map((row) => {
            const stats = row._predictability!;
            const team = teamsById.get(row.team_id);
            return (
              <details key={row.pitcher_id} className="overflow-hidden rounded-md border border-line bg-bg-elevated shadow-md shadow-black/20">
                <summary className="grid cursor-pointer grid-cols-2 items-center gap-3 px-3.5 py-3 hover:bg-bg-elevated-2 sm:grid-cols-[minmax(210px,1.5fr)_88px_72px_82px_82px_92px_minmax(170px,1fr)]">
                  <div className="col-span-2 flex items-center gap-3 font-semibold text-text sm:col-span-1">
                    <div className="relative shrink-0">
                      <PitcherPhoto playerId={row.pitcher_id} name={row.pitcher_name} size="sm" />
                      <div className="absolute -bottom-1 -right-1">
                        <TeamBadge abbreviation={team?.abbreviation} teamId={row.team_id} size="sm" />
                      </div>
                    </div>
                    <ConfidenceBadge score={computeConfidenceScore(stats)} tier={stats.badge} size="sm" />
                    <span className="truncate">{row.pitcher_name || playersById.get(row.pitcher_id)?.full_name || `#${row.pitcher_id}`}</span>
                  </div>
                  <div className="text-right font-mono-num text-[12.5px]">
                    <span className="mb-0.5 block font-sans text-[9px] uppercase tracking-wide text-text-muted">Today's proj</span>
                    {fmt(row.projected_strikeouts, 1)}
                  </div>
                  <div className="text-right font-mono-num text-[12.5px]">
                    <span className="mb-0.5 block font-sans text-[9px] uppercase tracking-wide text-text-muted">Starts</span>
                    {stats.n}
                  </div>
                  <div className="text-right font-mono-num text-[12.5px]">
                    <span className="mb-0.5 block font-sans text-[9px] uppercase tracking-wide text-text-muted">Avg miss</span>
                    {stats.n ? fmt(stats.mae, 1) : '—'}
                  </div>
                  <div className="text-right font-mono-num text-[12.5px]">
                    <span className="mb-0.5 block font-sans text-[9px] uppercase tracking-wide text-text-muted">Bias</span>
                    {stats.n ? signed(stats.calibratedBias, 1) : '—'}
                  </div>
                  <div className="text-right font-mono-num text-[12.5px]">
                    <span className="mb-0.5 block font-sans text-[9px] uppercase tracking-wide text-text-muted">Volatility</span>
                    {stats.n ? fmt(stats.adjustedVolatility, 1) : '—'}
                  </div>
                  <div className="col-span-2 text-[12px] text-text-muted sm:col-span-1">{stats.cause}</div>
                </summary>
                <div className="border-t border-line p-3.5">
                  <div className="mb-2.5 text-[12px] text-text-muted">
                    The model's normal residual volatility is {fmt(model.volatility, 2)} K. This pitcher's adjusted
                    residual volatility is {fmt(stats.adjustedVolatility, 2)} K. Bias is actual minus projected.
                  </div>
                  {stats.recent.length === 0 ? (
                    <div className="py-4 text-center text-sm text-text-muted">No scored pre-game projections for this pitcher.</div>
                  ) : (
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-line text-[11px] uppercase tracking-wide text-text-muted">
                          <th className="py-2 pr-2 font-medium">Date</th>
                          <th className="py-2 pr-2 font-medium">Opp</th>
                          <th className="py-2 pr-2 text-right font-medium">Projected</th>
                          <th className="py-2 pr-2 text-right font-medium">Actual</th>
                          <th className="py-2 text-right font-medium">Actual − Proj</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recent.map((r: ScoredHistoryRow, i) => (
                          <tr key={i} className="border-b border-line/60 font-mono-num last:border-0">
                            <td className="py-2 pr-2">{r.projection_date}</td>
                            <td className="py-2 pr-2 font-sans">{teamLabel(teamsById, r.opponent_team_id)}</td>
                            <td className="py-2 pr-2 text-right">{fmt(r.projected_strikeouts, 1)}</td>
                            <td className="py-2 pr-2 text-right">{r.actual_k}</td>
                            <td className="py-2 text-right">
                              <span
                                className={
                                  deltaClass(r.residual) === 'positive'
                                    ? 'text-hit'
                                    : deltaClass(r.residual) === 'negative'
                                      ? 'text-danger'
                                      : 'text-text-muted'
                                }
                              >
                                {signed(r.residual, 1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </details>
            );
          })}
        </div>
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
