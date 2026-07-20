import { fmt } from '@/lib/format';
import { teamLabel } from '@/lib/kboardData';
import { useLookupsStore } from '@/store/useLookupsStore';
import { computeConfidenceScore } from '@/lib/confidence';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { PitcherPhoto } from '@/components/ui/PitcherPhoto';
import type { EnrichedSlateRow } from '@/types/slate';

// The collapsed, decision-at-a-glance view of one starter: name, prediction,
// confidence. Nothing else -- everything past this is a tap away.
export function PitcherSummaryCard({ row, className = '' }: { row: EnrichedSlateRow; className?: string }) {
  const teamsById = useLookupsStore((s) => s.lookups!.teamsById);
  const confidence = row._predictability ? computeConfidenceScore(row._predictability) : null;
  const team = teamsById.get(row.team_id);

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3.5 ${className}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative shrink-0">
          <PitcherPhoto playerId={row.pitcher_id} name={row.pitcher_name} size="md" />
          <div className="absolute -bottom-1 -right-1">
            <TeamBadge abbreviation={team?.abbreviation} teamId={row.team_id} size="sm" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text">{row.pitcher_name || '—'}</div>
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
        <ConfidenceBadge score={confidence} tier={row._predictability?.badge} size="sm" />
      </div>
    </div>
  );
}
