import { Link } from 'react-router-dom';
import { formatGameTime, parseUtcTimestamp } from '@/lib/format';
import { teamLabel } from '@/lib/kboardData';
import { useLookupsStore } from '@/store/useLookupsStore';
import { PitcherSummaryCard } from './PitcherSummaryCard';
import { TeamBadge } from '@/components/ui/TeamBadge';
import type { EnrichedSlateRow } from '@/types/slate';

// One card per game -- the primary object on Today's Board and Simulation,
// per the game-centric (not pitcher-centric) product direction. Stacks the
// two starters vertically always; on wider screens they sit side by side.
export function GameCard({ gamePk, starters }: { gamePk: number; starters: EnrichedSlateRow[] }) {
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
    <Link
      to={`/matchup/${gamePk}`}
      className="mb-4 block overflow-hidden rounded-lg border border-line bg-bg-elevated shadow-md shadow-black/20 transition-all hover:-translate-y-0.5 hover:border-k hover:shadow-lg hover:shadow-black/30"
    >
      <div className="flex items-center justify-between border-b border-line bg-bg-elevated-2 px-4 py-3">
        <div className="flex items-center gap-2">
          {away && <TeamBadge abbreviation={teamsById.get(away.team_id)?.abbreviation} teamId={away.team_id} size="sm" />}
          <span className="font-display text-sm font-semibold uppercase tracking-wide text-text">{matchupLabel}</span>
          {home && <TeamBadge abbreviation={teamsById.get(home.team_id)?.abbreviation} teamId={home.team_id} size="sm" />}
        </div>
        <span className="font-mono-num text-xs text-text-muted">{formatGameTime(sorted[0]?.game_datetime_utc)}</span>
      </div>

      <div className="divide-y divide-line sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {sorted.map((r) => (
          <PitcherSummaryCard key={r.pitcher_id} row={r} />
        ))}
      </div>

      <div className="border-t border-line bg-bg-elevated-2/50 px-4 py-2.5 text-center font-display text-[11px] font-semibold uppercase tracking-wide text-k">
        Open Matchup →
      </div>
    </Link>
  );
}

// Groups a flat row list into per-game buckets, ordered by first pitch time.
// Extracted from the old MatchupSlate so Today's Board, Simulation, and the
// matchup page itself can all group the same way.
export function groupRowsByGame(rows: EnrichedSlateRow[]): [number, EnrichedSlateRow[]][] {
  const byGame = new Map<number, EnrichedSlateRow[]>();
  for (const r of rows) {
    const list = byGame.get(r.game_pk) ?? [];
    list.push(r);
    byGame.set(r.game_pk, list);
  }
  return [...byGame.entries()].sort(([, a], [, b]) => {
    const ta = parseUtcTimestamp(a[0]?.game_datetime_utc)?.getTime() ?? Infinity;
    const tb = parseUtcTimestamp(b[0]?.game_datetime_utc)?.getTime() ?? Infinity;
    return ta - tb;
  });
}
