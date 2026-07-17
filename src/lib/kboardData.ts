import { supabase } from '@/lib/supabaseClient';
import { shiftDateString } from '@/lib/format';
import { computeModelMetrics, type ScoredHistoryRow, type ModelMetrics } from '@/lib/predictability';
import type { SlateRow } from '@/types/database.types';

// PostgREST (and by extension supabase-js) caps any single request at a
// server-configured row limit -- page through with .range() until a page
// comes back short, same fix as the original app's pgAll() helper.
// The caller builds its own literal `.from('table').select(...)` query per
// page (so TS resolves the correct per-table overload) instead of this
// helper trying to accept an arbitrary table name generically.
async function selectAll<T>(makeQuery: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>, pageSize = 500): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await makeQuery(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    all.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

export interface TeamRow { team_id: number; name: string | null; abbreviation: string | null }
export interface PlayerRow { player_id: number; full_name: string | null; throws: string | null }
export interface Last5Row {
  pitcher_id: number;
  starts_sampled: number;
  batters_faced_sum: number;
  k_per_9bf: number | null;
  k_per_9: number | null;
}

export interface Lookups {
  teamsById: Map<number, TeamRow>;
  playersById: Map<number, PlayerRow>;
  last5ById: Map<number, Last5Row>;
}

export async function loadLookups(): Promise<Lookups> {
  const [teams, players, last5] = await Promise.all([
    selectAll<TeamRow>((from, to) => supabase.from('teams').select('team_id,name,abbreviation').range(from, to)),
    selectAll<PlayerRow>((from, to) => supabase.from('players').select('player_id,full_name,throws').range(from, to)),
    selectAll<Last5Row>((from, to) => supabase.from('pitcher_last_5_starts').select('*').range(from, to)),
  ]);
  return {
    teamsById: new Map(teams.map((t) => [t.team_id, t])),
    playersById: new Map(players.map((p) => [p.player_id, p])),
    last5ById: new Map(last5.map((r) => [r.pitcher_id, r])),
  };
}

export function teamLabel(teamsById: Map<number, TeamRow>, teamId: number | null | undefined): string {
  if (teamId === null || teamId === undefined) return '—';
  const t = teamsById.get(teamId);
  if (!t) return '—';
  return t.abbreviation || t.name || '—';
}

export function avgBfDisplay(last5ById: Map<number, Last5Row>, pitcherId: number): string {
  const l5 = last5ById.get(pitcherId);
  if (!l5 || !l5.starts_sampled || l5.batters_faced_sum === undefined) return '—';
  return (l5.batters_faced_sum / l5.starts_sampled).toFixed(1);
}

// Fetch rows in ID chunks, chunked to stay well under PostgREST's
// URL-length-driven practical limit on `in.(...)` filters. As with
// selectAll, the caller supplies a literal `.from('table').in(...)` query
// per chunk so TS resolves the correct per-table overload.
async function selectByInChunks<T, V extends number | string>(
  values: V[],
  makeQuery: (chunk: V[]) => PromiseLike<{ data: unknown; error: unknown }>,
  chunkSize = 120
): Promise<T[]> {
  const unique = [...new Set(values.filter((v) => v !== null && v !== undefined))];
  if (unique.length === 0) return [];
  const rows: T[] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data, error } = await makeQuery(chunk);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
  }
  return rows;
}

export interface ScoredHistoryBundle {
  startDate: string;
  beforeDate: string;
  rows: ScoredHistoryRow[];
  metrics: ModelMetrics;
}

const scoredHistoryCache = new Map<string, Promise<ScoredHistoryBundle>>();

interface ProjectionRow {
  game_pk: number;
  pitcher_id: number;
  projection_date: string;
  team_id: number | null;
  opponent_team_id: number | null;
  projected_strikeouts: number | null;
}

interface ActualRow {
  game_pk: number;
  pitcher_id: number;
  strikeouts: number | null;
  batters_faced: number | null;
  is_starter: boolean | null;
  is_opener: boolean | null;
  opponent_team_id: number | null;
}

export async function loadScoredHistory(beforeDate: string, playersById: Map<number, PlayerRow>): Promise<ScoredHistoryBundle> {
  const cached = scoredHistoryCache.get(beforeDate);
  if (cached) return cached;

  const promise = (async () => {
    const startDate = shiftDateString(beforeDate, -90);
    const projections = await selectAll<ProjectionRow>((from, to) =>
      supabase
        .from('daily_pitcher_projections')
        .select('game_pk,pitcher_id,projection_date,team_id,opponent_team_id,projected_strikeouts')
        .gte('projection_date', startDate)
        .lt('projection_date', beforeDate)
        .order('projection_date', { ascending: true })
        .range(from, to)
    );
    const gamePks = [...new Set(projections.map((p) => p.game_pk))];
    const actuals = await selectByInChunks<ActualRow, number>(gamePks, (chunk) =>
      supabase
        .from('pitcher_outings')
        .select('game_pk,pitcher_id,strikeouts,batters_faced,is_starter,is_opener,opponent_team_id')
        .in('game_pk', chunk)
    );
    const actualMap = new Map(actuals.map((a) => [`${a.game_pk}:${a.pitcher_id}`, a]));
    const rows: ScoredHistoryRow[] = projections
      .map((p): ScoredHistoryRow | null => {
        const actual = actualMap.get(`${p.game_pk}:${p.pitcher_id}`);
        if (!actual || actual.strikeouts === null || p.projected_strikeouts === null) return null;
        if (actual.is_starter === false || actual.is_opener === true) return null;
        const player = playersById.get(p.pitcher_id);
        return {
          ...p,
          projected_strikeouts: p.projected_strikeouts,
          pitcher_name: player?.full_name || `#${p.pitcher_id}`,
          actual_k: Number(actual.strikeouts),
          actual_bf: actual.batters_faced,
          residual: Number(actual.strikeouts) - Number(p.projected_strikeouts),
        };
      })
      .filter((r): r is ScoredHistoryRow => r !== null)
      .sort((a, b) => a.projection_date.localeCompare(b.projection_date));
    return { startDate, beforeDate, rows, metrics: computeModelMetrics(rows) };
  })();

  scoredHistoryCache.set(beforeDate, promise);
  try {
    return await promise;
  } catch (error) {
    scoredHistoryCache.delete(beforeDate);
    throw error;
  }
}

export function enrichSlateRowsWithHistory<T extends { pitcher_id: number; opponent_team_id: number | null }>(
  rows: T[],
  historyBundle: ScoredHistoryBundle
) {
  return rows.map((r) => ({
    ...r,
    _pitcherHistory: historyBundle.rows
      .filter((h) => Number(h.pitcher_id) === Number(r.pitcher_id))
      .sort((a, b) => b.projection_date.localeCompare(a.projection_date))
      .slice(0, 5)
      .reverse(),
    _opponentHistory: historyBundle.rows
      .filter((h) => Number(h.opponent_team_id) === Number(r.opponent_team_id))
      .sort((a, b) => b.projection_date.localeCompare(a.projection_date))
      .slice(0, 5)
      .reverse(),
  }));
}

export async function fetchSlateRowsForEasternDate(dateStr: string): Promise<SlateRow[]> {
  const { data, error } = await supabase.rpc('simulate_slate_for_et_date', { p_date: dateStr });
  if (error) throw error;
  return Array.isArray(data) ? (data as unknown as SlateRow[]) : [];
}
