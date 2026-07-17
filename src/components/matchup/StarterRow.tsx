import { KTally } from '@/components/ui/KTally';
import { fmt, roundedCount, signed, deltaClass } from '@/lib/format';
import { teamLabel } from '@/lib/kboardData';
import { useLookupsStore } from '@/store/useLookupsStore';
import type { SlateRow } from '@/types/database.types';
import type { ScoredHistoryRow } from '@/lib/predictability';

export type EnrichedSlateRow = SlateRow & {
  _pitcherHistory?: ScoredHistoryRow[];
  _opponentHistory?: ScoredHistoryRow[];
};

function HistoryItem({ item, contextText }: { item: ScoredHistoryRow; contextText: string }) {
  const title = `Projected ${fmt(item.projected_strikeouts, 1)} K; actual ${item.actual_k} K, ${item.actual_bf} BF; delta ${signed(item.residual, 1)}`;
  return (
    <span title={title} className="whitespace-nowrap">
      {item.actual_k}K/{item.actual_bf}BF{' '}
      <span
        className={
          deltaClass(item.residual) === 'positive' ? 'text-hit' : deltaClass(item.residual) === 'negative' ? 'text-k' : 'text-text-muted'
        }
      >
        ({signed(item.residual, 1)})
      </span>{' '}
      {contextText}
    </span>
  );
}

export function StarterRow({ r, onOpenPitcher }: { r: EnrichedSlateRow; onOpenPitcher: (pitcherId: number) => void }) {
  const teamsById = useLookupsStore((s) => s.lookups!.teamsById);

  const pitcherHistory = r._pitcherHistory ?? [];
  const opponentHistory = r._opponentHistory ?? [];

  return (
    <div
      className="grid cursor-pointer grid-cols-[56px_1fr_auto] items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 hover:bg-bg-elevated-2"
      onDoubleClick={() => onOpenPitcher(r.pitcher_id)}
    >
      <div
        className={`rounded px-1.5 py-0.5 text-center font-mono-num text-[10px] font-bold tracking-wide ${
          r.home_away === 'home' ? 'bg-bg-elevated-2 text-hit' : 'bg-bg-elevated-2 text-text-muted'
        }`}
      >
        {r.home_away === 'home' ? 'HOME' : r.home_away === 'away' ? 'AWAY' : '—'}
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="text-sm font-semibold text-text">
          {r.pitcher_name || '—'}
          {r.pitcher_throws && (
            <span className="ml-1.5 rounded bg-bg-elevated-2 px-1 py-0.5 font-mono-num text-[10px] text-text-muted">
              {r.pitcher_throws}HP
            </span>
          )}
          {r.is_opener_flag && (
            <span className="ml-1.5 rounded bg-k/15 px-1.5 py-0.5 font-mono-num text-[10px] text-k">opener</span>
          )}
        </div>
        <div className="text-[13px] text-text-muted">
          {teamLabel(teamsById, r.team_id)}{' '}
          <span
            className={`rounded px-1.5 py-0.5 font-mono-num text-[10px] uppercase ${
              r.source === 'actual_starter' ? 'bg-hit/15 text-hit' : 'bg-amber/15 text-amber'
            }`}
          >
            {r.source === 'actual_starter' ? 'final' : 'probable'}
          </span>{' '}
          · Sampled {r.starts_sampled ?? '—'} · K/9BF {fmt(r.last5_k_per_9bf, 2)} · Avg BF {r.avg_batters_faced ?? '—'}
        </div>
        <div className="text-[13px] leading-relaxed text-text-muted">
          {pitcherHistory.length > 0 ? (
            <>
              Last 5 starts — actual K (Δ vs projection):{' '}
              {pitcherHistory.map((item, i) => (
                <span key={i}>
                  {i > 0 && ' · '}
                  <HistoryItem item={item} contextText={`vs ${teamLabel(teamsById, item.opponent_team_id)}`} />
                </span>
              ))}
            </>
          ) : (
            'Last 5 starts — actual K (delta vs pre-game projection): —'
          )}
        </div>
        <div className="text-[13px] leading-relaxed text-text-muted">
          {opponentHistory.length > 0 ? (
            <>
              {teamLabel(teamsById, r.opponent_team_id)} vs SP, last 5 — actual K (Δ vs projection):{' '}
              {opponentHistory.map((item, i) => (
                <span key={i}>
                  {i > 0 && ' · '}
                  <HistoryItem item={item} contextText={`(${item.pitcher_name})`} />
                </span>
              ))}
            </>
          ) : (
            `${teamLabel(teamsById, r.opponent_team_id)} vs SP, last 5 — actual K (delta vs projection): —`
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 text-right">
        <div className="flex justify-end gap-3.5">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wide text-text-muted">Proj K</span>
            <span className="font-mono-num text-[15px] font-bold text-text">
              <KTally value={r.projected_strikeouts} />
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wide text-text-muted">Actual K</span>
            <span className="font-mono-num text-[15px] font-bold text-text">{r.actual_k ?? '—'}</span>
          </div>
        </div>
        <div className="flex justify-end gap-3.5">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wide text-text-muted">Proj BF</span>
            <span className="font-mono-num text-[15px] font-bold text-text">{roundedCount(r.projected_batters_faced)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wide text-text-muted">Actual BF</span>
            <span className="font-mono-num text-[15px] font-bold text-text">{r.actual_batters_faced ?? '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
