import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PitcherPhoto } from '@/components/ui/PitcherPhoto';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { useSimulateStore } from '@/store/useSimulateStore';
import { useLookupsStore } from '@/store/useLookupsStore';
import { useEasternSlate } from '@/lib/useEasternSlate';
import { defaultEasternDate, fmt, roundedCount, signed, deltaClass, formatGameTime } from '@/lib/format';
import { teamLabel } from '@/lib/kboardData';
import { usePredictabilityEnrichedRows } from '@/lib/usePredictability';
import { usePostMortemEnrichedRows } from '@/lib/usePostMortem';
import { groupRowsByGame } from '@/components/matchup/GameCard';
import type { EnrichedSlateRow } from '@/types/slate';
import type { OutingReason } from '@/lib/postMortem';

const REASON_BADGE_CLASSES: Record<OutingReason, string> = {
  'Exceeded projection': 'bg-hit/15 text-hit',
  'As projected': 'bg-bg-elevated-2 text-text-muted',
  'Short outing': 'bg-amber/15 text-amber',
  'Pitch count limitation': 'bg-amber/15 text-amber',
  'Command issues': 'bg-amber/15 text-amber',
  'Low strikeout rate': 'bg-amber/15 text-amber',
  'Got hit hard': 'bg-danger/15 text-danger',
  Injury: 'bg-danger/15 text-danger',
  Unknown: 'bg-bg-elevated-2 text-text-muted',
};

// Deliberately NOT the game-grouped MatchupBoard used by Today's Board and
// Predictability -- this page answers a different question ("how did my
// predictions actually hold up, and why") and needs the predicted-vs-actual
// comparison visible for every pitcher at a glance, not behind a tap-to-
// expand. One flat row per pitcher, sorted chronologically by first pitch.
export default function Simulate() {
  const [inputDate, setInputDate] = useState(defaultEasternDate());
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const { status, rows, historyBundle, error } = useEasternSlate(loadedDate);
  const setSlate = useSimulateStore((s) => s.setSlate);

  const rowsWithPredictability = usePredictabilityEnrichedRows(rows, historyBundle);
  const enrichedRows = usePostMortemEnrichedRows(rowsWithPredictability, status);

  useEffect(() => {
    if (loadedDate && status === 'ready') setSlate(loadedDate, enrichedRows, historyBundle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedDate, status, historyBundle]);

  const games = groupRowsByGame(enrichedRows);

  return (
    <AppShell title="Simulation / Post-Mortem">
      <div className="mb-4 flex flex-wrap items-center gap-3.5">
        <label className="text-xs uppercase tracking-wide text-text-muted" htmlFor="sim-date">
          Date
        </label>
        <input
          id="sim-date"
          type="date"
          value={inputDate}
          onChange={(e) => setInputDate(e.target.value)}
          className="rounded border border-line bg-bg-elevated px-2.5 py-1.5 font-mono-num text-[13px] text-text"
        />
        <button
          onClick={() => setLoadedDate(inputDate)}
          className="rounded border border-line bg-bg-elevated-2 px-3.5 py-1.5 font-display text-xs uppercase tracking-wide text-text hover:border-k"
        >
          Load Slate
        </button>
      </div>

      <p className="mb-4 text-[12.5px] text-text-muted">
        Pick a completed date to see, pitcher by pitcher: what was predicted, what actually happened, and why the
        two diverged. For dates without a final result yet, actuals show as pending.
      </p>

      {loadedDate === null && <div className="py-10 text-center text-sm text-text-muted">Pick a date and hit Load Slate.</div>}
      {loadedDate !== null && status === 'loading' && <div className="py-10 text-center text-sm text-text-muted">Loading ET slate…</div>}
      {loadedDate !== null && status === 'error' && (
        <div className="py-10 text-center text-sm text-text-muted">Couldn't load slate: {error}</div>
      )}
      {loadedDate !== null && status === 'ready' && games.length === 0 && (
        <div className="py-10 text-center text-sm text-text-muted">
          No starters found for this Eastern-date slate — no probable snapshot was captured and no games are Final for it.
        </div>
      )}
      {loadedDate !== null && status === 'ready' && games.length > 0 && (
        <div className="space-y-3">
          {games.map(([gamePk, starters]) => (
            <PostMortemGameGroup key={gamePk} starters={starters} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

// One bordered group per game, holding both starters -- the pitchers who
// actually faced off should read as a pair, not as two unrelated rows that
// happen to sit near each other in a flat chronological list.
function PostMortemGameGroup({ starters }: { starters: EnrichedSlateRow[] }) {
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
    <div className="overflow-hidden rounded-lg border border-line bg-bg-elevated shadow-md shadow-black/20">
      <div className="flex items-center justify-between border-b border-line bg-bg-elevated-2 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {away && <TeamBadge abbreviation={teamsById.get(away.team_id)?.abbreviation} teamId={away.team_id} size="sm" />}
          <span className="font-display text-[13px] font-semibold uppercase tracking-wide text-text">{matchupLabel}</span>
          {home && <TeamBadge abbreviation={teamsById.get(home.team_id)?.abbreviation} teamId={home.team_id} size="sm" />}
        </div>
        <span className="font-mono-num text-xs text-text-muted">{formatGameTime(sorted[0]?.game_datetime_utc)}</span>
      </div>
      <div className="divide-y divide-line">
        {sorted.map((r) => (
          <PostMortemRow key={r.pitcher_id} row={r} />
        ))}
      </div>
    </div>
  );
}

function PostMortemRow({ row }: { row: EnrichedSlateRow }) {
  const teamsById = useLookupsStore((s) => s.lookups!.teamsById);
  const team = teamsById.get(row.team_id);
  const isFinal = row.source === 'actual_starter' && row.actual_k !== null;
  const kDiff = isFinal && row.projected_strikeouts !== null ? row.actual_k! - row.projected_strikeouts : null;

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3 sm:w-56 sm:shrink-0">
        <div className="relative shrink-0">
          <PitcherPhoto playerId={row.pitcher_id} name={row.pitcher_name} size="md" />
          <div className="absolute -bottom-1 -right-1">
            <TeamBadge abbreviation={team?.abbreviation} teamId={row.team_id} size="sm" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text">{row.pitcher_name || '—'}</div>
          <div className="mt-0.5 truncate text-[12px] text-text-muted">
            {teamLabel(teamsById, row.team_id)} vs {teamLabel(teamsById, row.opponent_team_id)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:flex-nowrap">
        <StatPair label="Batters Faced" predicted={roundedCount(row.projected_batters_faced)} actual={isFinal ? roundedCount(row.actual_batters_faced) : '—'} />
        <StatPair label="Strikeouts" predicted={fmt(row.projected_strikeouts, 1)} actual={isFinal ? String(row.actual_k) : '—'} />

        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wide text-text-muted">Diff</div>
          <div
            className={`font-mono-num text-sm font-bold ${
              kDiff === null
                ? 'text-text-muted'
                : deltaClass(kDiff) === 'positive'
                  ? 'text-hit'
                  : deltaClass(kDiff) === 'negative'
                    ? 'text-danger'
                    : 'text-text-muted'
            }`}
          >
            {kDiff === null ? '—' : signed(kDiff, 1)}
          </div>
        </div>

        <div className="min-w-[120px] text-right">
          <div className="text-[9px] uppercase tracking-wide text-text-muted">Reason</div>
          {isFinal ? (
            <span
              className={`inline-block rounded-full px-2 py-0.5 font-display text-[10px] uppercase tracking-wide ${REASON_BADGE_CLASSES[row._postMortemReason ?? 'Unknown']}`}
            >
              {row._postMortemReason ?? 'Unknown'}
            </span>
          ) : (
            <span className="font-mono-num text-[12px] text-text-muted">Pending</span>
          )}
        </div>
      </div>

      {isFinal && row._postMortemNotes && row._postMortemNotes.length > 0 && (
        <div className="text-[11.5px] leading-relaxed text-text-muted sm:basis-full">{row._postMortemNotes.join(' · ')}</div>
      )}
    </div>
  );
}

function StatPair({ label, predicted, actual }: { label: string; predicted: string; actual: string }) {
  return (
    <div className="text-right">
      <div className="text-[9px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className="font-mono-num text-sm text-text">
        <span className="text-text-muted">{predicted}</span>
        <span className="mx-1 text-text-muted">→</span>
        <span className="font-bold">{actual}</span>
      </div>
    </div>
  );
}
