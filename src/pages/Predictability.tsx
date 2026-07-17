import { AppShell } from '@/components/layout/AppShell';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { useSimulateStore } from '@/store/useSimulateStore';
import { useLookupsStore } from '@/store/useLookupsStore';
import { predictabilityForPitcher, type ScoredHistoryRow } from '@/lib/predictability';
import { fmt, signed, deltaClass } from '@/lib/format';
import { teamLabel } from '@/lib/kboardData';

const BADGE_CLASSES: Record<string, string> = {
  high: 'bg-hit/15 text-hit',
  medium: 'bg-amber/15 text-amber',
  low: 'bg-k/15 text-k',
  unknown: 'bg-bg-elevated-2 text-text-muted',
};

export default function Predictability() {
  const { date, rows, historyBundle } = useSimulateStore();
  const teamsById = useLookupsStore((s) => s.lookups!.teamsById);
  const playersById = useLookupsStore((s) => s.lookups!.playersById);

  if (!date || !historyBundle) {
    return (
      <AppShell title="Predictability">
        <p className="mb-4 text-[12.5px] text-text-muted">
          Generated from the currently loaded Simulate / Day Slate date.
        </p>
        <div className="py-10 text-center text-sm text-text-muted">Load a date in Simulate / Day Slate first.</div>
      </AppShell>
    );
  }

  const model = historyBundle.metrics;
  const uniquePitchers = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    if (!uniquePitchers.has(row.pitcher_id)) uniquePitchers.set(row.pitcher_id, row);
  }

  const pitcherRows = [...uniquePitchers.values()]
    .map((slate) => {
      const history = historyBundle.rows.filter((r) => Number(r.pitcher_id) === Number(slate.pitcher_id));
      return { slate, stats: predictabilityForPitcher(history, model) };
    })
    .sort((a, b) => {
      if (a.stats.n < 5 && b.stats.n >= 5) return 1;
      if (b.stats.n < 5 && a.stats.n >= 5) return -1;
      return b.stats.adjustedVolatility - a.stats.adjustedVolatility;
    });

  return (
    <AppShell title="Predictability">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[12.5px] text-text-muted">
        <span>Generated from the currently loaded Simulate / Day Slate date:</span>
        <strong className="font-mono-num text-text">{date} ET</strong>
      </div>

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
          {pitcherRows.map(({ slate, stats }) => (
            <details key={slate.pitcher_id} className="overflow-hidden rounded-md border border-line bg-bg-elevated">
              <summary className="grid cursor-pointer grid-cols-2 items-center gap-3 px-3.5 py-3 hover:bg-bg-elevated-2 sm:grid-cols-[minmax(190px,1.5fr)_88px_72px_82px_82px_92px_minmax(170px,1fr)]">
                <div className="col-span-2 flex items-center gap-2 font-semibold text-text sm:col-span-1">
                  {slate.pitcher_name || playersById.get(slate.pitcher_id)?.full_name || `#${slate.pitcher_id}`}
                  <span className={`rounded-full px-2 py-0.5 font-display text-[10px] uppercase tracking-wide ${BADGE_CLASSES[stats.badge]}`}>
                    {stats.label}
                  </span>
                </div>
                <div className="text-right font-mono-num text-[12.5px]">
                  <span className="mb-0.5 block font-sans text-[9px] uppercase tracking-wide text-text-muted">Today's proj</span>
                  {fmt(slate.projected_strikeouts, 1)}
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
                                    ? 'text-k'
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
          ))}
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
