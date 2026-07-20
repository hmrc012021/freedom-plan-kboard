import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PitcherPhoto } from '@/components/ui/PitcherPhoto';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { useSimulateStore } from '@/store/useSimulateStore';
import { useLookupsStore } from '@/store/useLookupsStore';
import { useEasternSlate } from '@/lib/useEasternSlate';
import { defaultEasternDate, fmt, roundedCount, signed, deltaClass, parseUtcTimestamp } from '@/lib/format';
import { teamLabel } from '@/lib/kboardData';
import { usePredictabilityEnrichedRows } from '@/lib/usePredictability';
import { usePostMortemEnrichedRows } from '@/lib/usePostMortem';
import type { EnrichedSlateRow } from '@/types/slate';

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

  const sorted = [...enrichedRows].sort((a, b) => {
    const ta = parseUtcTimestamp(a.game_datetime_utc)?.getTime() ?? Infinity;
    const tb = parseUtcTimestamp(b.game_datetime_utc)?.getTime() ?? Infinity;
    if (ta !== tb) return ta - tb;
    return (a.home_away === 'away' ? 0 : 1) - (b.home_away === 'away' ? 0 : 1);
  });

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
      {loadedDate !== null && status === 'ready' && sorted.length === 0 && (
        <div className="py-10 text-center text-sm text-text-muted">
          No starters found for this Eastern-date slate — no probable snapshot was captured and no games are Final for it.
        </div>
      )}
      {loadedDate !== null && status === 'ready' && sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map((r) => (
            <PostMortemRow key={r.pitcher_id} row={r} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function PostMortemRow({ row }: { row: EnrichedSlateRow }) {
  const teamsById = useLookupsStore((s) => s.lookups!.teamsById);
  const team = teamsById.get(row.team_id);
  const isFinal = row.source === 'actual_starter' && row.actual_k !== null;
  const kDiff = isFinal && row.projected_strikeouts !== null ? row.actual_k! - row.projected_strikeouts : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-bg-elevated px-4 py-3.5 shadow-md shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
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
            <span className="inline-block rounded-full bg-bg-elevated-2 px-2 py-0.5 font-display text-[10px] uppercase tracking-wide text-text">
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
