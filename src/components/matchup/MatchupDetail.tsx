import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ExpandablePanel } from '@/components/ui/ExpandablePanel';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { PitcherPhoto } from '@/components/ui/PitcherPhoto';
import { PitcherModal } from '@/components/PitcherModal';
import { useLookupsStore } from '@/store/useLookupsStore';
import { fmt, roundedCount, signed, deltaClass, formatGameTime } from '@/lib/format';
import { teamLabel, type TeamRow } from '@/lib/kboardData';
import { computeConfidenceScore } from '@/lib/confidence';
import type { EnrichedSlateRow } from '@/types/slate';
import type { ScoredHistoryRow } from '@/lib/predictability';

type SectionKey = 'estimator' | 'pitcherLast5' | 'opponentLast5' | 'confidence' | 'simHistory';

// The "both pitchers, one expanded at a time" matchup view. Used both as the
// route-based /matchup/:gamePk page (mobile, direct links) and inline as the
// detail pane of the desktop master-detail layout on Today's Board /
// Simulation -- same component either way, just given different `starters`.
export function MatchupDetail({ starters }: { starters: EnrichedSlateRow[] }) {
  const teamsById = useLookupsStore((s) => s.lookups!.teamsById);
  const [expandedPitcherId, setExpandedPitcherId] = useState<number | null>(null);

  const sorted = [...starters].sort((a, b) => {
    const order: Record<string, number> = { away: 0, home: 1 };
    return (order[a.home_away ?? ''] ?? 2) - (order[b.home_away ?? ''] ?? 2);
  });
  const away = sorted.find((s) => s.home_away === 'away');
  const home = sorted.find((s) => s.home_away === 'home');
  const matchupLabel =
    away && home
      ? `${teamLabel(teamsById, away.team_id)} @ ${teamLabel(teamsById, home.team_id)}`
      : sorted.map((s) => teamLabel(teamsById, s.team_id)).join(' vs ');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-text">{matchupLabel}</span>
        <span className="font-mono-num text-xs text-text-muted">{formatGameTime(sorted[0]?.game_datetime_utc)}</span>
      </div>

      <div className="space-y-3.5 sm:grid sm:grid-cols-2 sm:items-start sm:gap-3.5 sm:space-y-0">
        {sorted.map((r) => (
          <PitcherDetail
            key={r.pitcher_id}
            row={r}
            isExpanded={expandedPitcherId === r.pitcher_id}
            onToggleExpand={() => setExpandedPitcherId(expandedPitcherId === r.pitcher_id ? null : r.pitcher_id)}
          />
        ))}
      </div>
    </div>
  );
}

function PitcherDetail({
  row,
  isExpanded,
  onToggleExpand,
}: {
  row: EnrichedSlateRow;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const teamsById = useLookupsStore((s) => s.lookups!.teamsById);
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const confidence = row._predictability ? computeConfidenceScore(row._predictability) : null;

  function toggleSection(key: SectionKey) {
    setOpenSection(openSection === key ? null : key);
  }

  const team = teamsById.get(row.team_id);

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-bg-elevated shadow-md shadow-black/20">
      <button
        onClick={onToggleExpand}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-bg-elevated-2"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <PitcherPhoto playerId={row.pitcher_id} name={row.pitcher_name} size="lg" />
            <div className="absolute -bottom-1 -right-1">
              <TeamBadge abbreviation={team?.abbreviation} teamId={row.team_id} size="sm" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-text">{row.pitcher_name || '—'}</div>
            <div className="mt-0.5 truncate text-[12px] text-text-muted">
              {teamLabel(teamsById, row.team_id)}
              {row.pitcher_throws && <span className="ml-1.5 font-mono-num">{row.pitcher_throws}HP</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wide text-text-muted">Prediction</div>
            <div className="font-mono-num text-xl font-bold text-text">{fmt(row.projected_strikeouts, 1)}</div>
          </div>
          <ConfidenceBadge score={confidence} tier={row._predictability?.badge} size="md" />
          <ChevronRight size={16} className={`shrink-0 text-text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-line">
          <ExpandablePanel
            title="Raw Estimator"
            summary={<span className="font-mono-num text-[13px] text-text">{fmt(row.projected_strikeouts, 1)}</span>}
            isOpen={openSection === 'estimator'}
            onToggle={() => toggleSection('estimator')}
          >
            <RawEstimator row={row} />
          </ExpandablePanel>
          <ExpandablePanel title="Pitcher Last Five" isOpen={openSection === 'pitcherLast5'} onToggle={() => toggleSection('pitcherLast5')}>
            <LastFiveTable rows={row._pitcherHistory ?? []} nameColumn="opponent" teamsById={teamsById} />
          </ExpandablePanel>
          <ExpandablePanel title="Opponent Last Five" isOpen={openSection === 'opponentLast5'} onToggle={() => toggleSection('opponentLast5')}>
            <LastFiveTable rows={row._opponentHistory ?? []} nameColumn="pitcher" teamsById={teamsById} />
          </ExpandablePanel>
          <ExpandablePanel title="Confidence Details" isOpen={openSection === 'confidence'} onToggle={() => toggleSection('confidence')}>
            <ConfidenceDetails row={row} score={confidence} />
          </ExpandablePanel>
          <ExpandablePanel title="Simulation History" isOpen={openSection === 'simHistory'} onToggle={() => toggleSection('simHistory')}>
            <SimulationHistory row={row} />
          </ExpandablePanel>
          <button
            onClick={() => setShowWhatIf(true)}
            className="w-full border-t border-line px-3.5 py-3 text-center font-display text-[11px] font-semibold uppercase tracking-wide text-k hover:bg-bg-elevated-2"
          >
            What-if: Strikeout Line
          </button>
        </div>
      )}

      {showWhatIf && <PitcherModal pitcherId={row.pitcher_id} onClose={() => setShowWhatIf(false)} />}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-text-muted">
      <span>{label}</span>
      <span className="font-mono-num text-text">{value}</span>
    </div>
  );
}

function RawEstimator({ row }: { row: EnrichedSlateRow }) {
  return (
    <div className="space-y-2 text-[13px]">
      <DetailRow label="Expected Batters Faced" value={roundedCount(row.projected_batters_faced)} />
      <DetailRow label="K per 9BF (last 5)" value={fmt(row.last5_k_per_9bf, 2)} />
      <DetailRow label="Opponent Adjustment" value={row.adjustment !== null ? `×${fmt(row.adjustment, 2)}` : '—'} />
      <div className="mt-2 flex items-center justify-between border-t border-line pt-2 font-semibold text-text">
        <span>Final Estimate</span>
        <span className="font-mono-num">{fmt(row.projected_strikeouts, 1)}</span>
      </div>
    </div>
  );
}

// Quick visual read of the last five outings before the detail table below
// it -- bar height is actual K, color signals whether that start beat, met,
// or missed its own projection.
function KTrendBars({ rows }: { rows: ScoredHistoryRow[] }) {
  if (rows.length === 0) return null;
  const chronological = [...rows].sort((a, b) => a.projection_date.localeCompare(b.projection_date));
  const maxK = Math.max(...chronological.map((r) => r.actual_k), 1);

  return (
    <div className="mb-3 flex items-end gap-2 border-b border-line pb-3">
      {chronological.map((r, i) => {
        const heightPct = Math.max(10, (r.actual_k / maxK) * 100);
        const tone = deltaClass(r.residual);
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-14 w-full items-end">
              <div
                className={`w-full rounded-t ${tone === 'positive' ? 'bg-hit' : tone === 'negative' ? 'bg-danger' : 'bg-text-muted'}`}
                style={{ height: `${heightPct}%` }}
                title={`${r.projection_date}: ${r.actual_k} K (projected ${fmt(r.projected_strikeouts, 1)})`}
              />
            </div>
            <span className="font-mono-num text-[10px] text-text-muted">{r.actual_k}</span>
          </div>
        );
      })}
    </div>
  );
}

function LastFiveTable({
  rows,
  nameColumn,
  teamsById,
}: {
  rows: ScoredHistoryRow[];
  nameColumn: 'opponent' | 'pitcher';
  teamsById: Map<number, TeamRow>;
}) {
  if (rows.length === 0) {
    return <div className="py-3 text-center text-[13px] text-text-muted">No scored starts on record.</div>;
  }
  const sorted = [...rows].sort((a, b) => b.projection_date.localeCompare(a.projection_date));
  return (
    <>
      <KTrendBars rows={sorted} />
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-text-muted">
            <th className="py-1.5 pr-2 font-medium">Date</th>
            <th className="py-1.5 pr-2 font-medium">{nameColumn === 'opponent' ? 'Opp' : 'Pitcher'}</th>
            <th className="py-1.5 pr-2 text-right font-medium">BF</th>
            <th className="py-1.5 pr-2 text-right font-medium">K</th>
            <th className="py-1.5 pr-2 text-right font-medium">Proj</th>
            <th className="py-1.5 text-right font-medium">Diff</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, i) => (
            <tr key={i} className="border-b border-line/60 font-mono-num last:border-0">
              <td className="py-1.5 pr-2 font-sans">{item.projection_date}</td>
              <td className="py-1.5 pr-2 font-sans">
                {nameColumn === 'opponent' ? teamLabel(teamsById, item.opponent_team_id) : item.pitcher_name}
              </td>
              <td className="py-1.5 pr-2 text-right">{item.actual_bf ?? '—'}</td>
              <td className="py-1.5 pr-2 text-right">{item.actual_k}</td>
              <td className="py-1.5 pr-2 text-right">{fmt(item.projected_strikeouts, 1)}</td>
              <td className="py-1.5 text-right">
                <span
                  className={
                    deltaClass(item.residual) === 'positive'
                      ? 'text-hit'
                      : deltaClass(item.residual) === 'negative'
                        ? 'text-danger'
                        : 'text-text-muted'
                  }
                >
                  {signed(item.residual, 1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ConfidenceDetails({ row, score }: { row: EnrichedSlateRow; score: number | null }) {
  const p = row._predictability;
  if (!p || score === null) {
    return <div className="py-3 text-center text-[13px] text-text-muted">Not enough scored history yet to assess confidence.</div>;
  }
  return (
    <div className="space-y-2 text-[13px]">
      <DetailRow label="Confidence Score" value={`${score} / 100`} />
      <DetailRow label="Scored Starts Used" value={String(p.n)} />
      <DetailRow label="Volatility vs Model Baseline" value={`×${fmt(p.ratio, 2)}`} />
      <DetailRow label="Calibrated Bias" value={`${signed(p.calibratedBias, 2)} K`} />
      <div className="mt-2 border-t border-line pt-2 leading-relaxed text-text-muted">{p.cause}</div>
    </div>
  );
}

function SimulationHistory({ row }: { row: EnrichedSlateRow }) {
  if (row.source !== 'actual_starter' || row.actual_k === null) {
    return (
      <div className="py-3 text-center text-[13px] text-text-muted">
        This game hasn't finished yet — check back after the final out to see how the prediction held up.
      </div>
    );
  }
  const diff = row.projected_strikeouts !== null ? row.actual_k - row.projected_strikeouts : null;
  return (
    <div className="space-y-2 text-[13px]">
      <DetailRow label="Prediction" value={fmt(row.projected_strikeouts, 1)} />
      <DetailRow label="Actual" value={String(row.actual_k)} />
      <DetailRow label="Difference" value={diff !== null ? signed(diff, 1) : '—'} />
      <div className="flex items-center justify-between text-text-muted">
        <span>Reason</span>
        <span className="rounded-full bg-bg-elevated-2 px-2 py-0.5 font-display text-[10px] uppercase tracking-wide text-text">
          {row._postMortemReason ?? 'Unknown'}
        </span>
      </div>
      {row._postMortemNotes && row._postMortemNotes.length > 0 && (
        <div className="mt-2 border-t border-line pt-2 leading-relaxed text-text-muted">{row._postMortemNotes.join(' · ')}</div>
      )}
    </div>
  );
}
