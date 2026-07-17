import { useState } from 'react';
import { formatGameTime, parseUtcTimestamp } from '@/lib/format';
import { teamLabel } from '@/lib/kboardData';
import { useLookupsStore } from '@/store/useLookupsStore';
import { StarterRow, type EnrichedSlateRow } from './StarterRow';
import { PitcherModal } from '@/components/PitcherModal';

export function MatchupSlate({ rows, emptyMessage }: { rows: EnrichedSlateRow[]; emptyMessage: string }) {
  const teamsById = useLookupsStore((s) => s.lookups!.teamsById);
  const [openPitcherId, setOpenPitcherId] = useState<number | null>(null);

  if (rows.length === 0) {
    return <div className="py-10 text-center text-sm text-text-muted">{emptyMessage}</div>;
  }

  const byGame = new Map<number, EnrichedSlateRow[]>();
  for (const r of rows) {
    const list = byGame.get(r.game_pk) ?? [];
    list.push(r);
    byGame.set(r.game_pk, list);
  }

  const games = [...byGame.entries()].sort(([, a], [, b]) => {
    const ta = parseUtcTimestamp(a[0]?.game_datetime_utc)?.getTime() ?? Infinity;
    const tb = parseUtcTimestamp(b[0]?.game_datetime_utc)?.getTime() ?? Infinity;
    return ta - tb;
  });

  return (
    <div>
      {games.map(([gamePk, starters]) => {
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
          <div key={gamePk} className="mb-4 overflow-hidden rounded-md border border-line bg-bg-elevated">
            <div className="flex items-baseline justify-between border-b border-line bg-bg-elevated-2 px-4 py-2.5">
              <span className="font-display text-sm font-medium uppercase tracking-wide text-text">{matchupLabel}</span>
              <span className="font-mono-num text-xs text-text-muted">{formatGameTime(sorted[0]?.game_datetime_utc)}</span>
            </div>
            {sorted.map((r) => (
              <StarterRow key={r.pitcher_id} r={r} onOpenPitcher={setOpenPitcherId} />
            ))}
          </div>
        );
      })}

      {openPitcherId !== null && <PitcherModal pitcherId={openPitcherId} onClose={() => setOpenPitcherId(null)} />}
    </div>
  );
}
