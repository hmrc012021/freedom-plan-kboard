import { fmt, formatGameTime } from '@/lib/format';
import { teamLabel } from '@/lib/kboardData';
import { useLookupsStore } from '@/store/useLookupsStore';
import { PitcherPhoto } from '@/components/ui/PitcherPhoto';
import { cn } from '@/lib/utils';
import type { EnrichedSlateRow } from '@/types/slate';

// Compact row for the desktop master-detail matchup list -- deliberately
// smaller/denser than GameCard (which is the full mobile tap-through card),
// since this sits in a persistent side column next to the detail pane.
export function MatchupListRow({
  starters,
  isSelected,
  onSelect,
}: {
  starters: EnrichedSlateRow[];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const teamsById = useLookupsStore((s) => s.lookups!.teamsById);

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
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
        isSelected ? 'border-k bg-bg-elevated-2' : 'border-line bg-bg-elevated hover:bg-bg-elevated-2/60'
      )}
    >
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-display font-semibold uppercase tracking-wide text-text">{matchupLabel}</span>
        <span className="font-mono-num text-text-muted">{formatGameTime(sorted[0]?.game_datetime_utc)}</span>
      </div>
      <div className="flex items-center gap-2">
        {sorted.map((r) => (
          <div key={r.pitcher_id} className="flex min-w-0 flex-1 items-center gap-1.5">
            <PitcherPhoto playerId={r.pitcher_id} name={r.pitcher_name} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-[11.5px] font-medium text-text">{r.pitcher_name || '—'}</div>
              <div className="font-mono-num text-[10.5px] text-text-muted">{fmt(r.projected_strikeouts, 1)} K</div>
            </div>
          </div>
        ))}
      </div>
    </button>
  );
}
