import { useEffect, useMemo, useState } from 'react';
import { fetchOutingDetails, type OutingDetail } from './kboardData';
import { deriveOutingNotes, classifyOutingReason } from './postMortem';
import type { EnrichedSlateRow } from '@/types/slate';

// Shared by Today's Board and Simulation. Post-mortem needs a couple of
// fields (earned runs, walks, home runs, pitches) the slate RPC doesn't
// return -- fetched directly, only for games that actually finished
// (source === 'actual_starter'; probables have nothing to explain yet).
export function usePostMortemEnrichedRows(
  rows: EnrichedSlateRow[],
  status: 'idle' | 'loading' | 'ready' | 'error'
): EnrichedSlateRow[] {
  const [detailMap, setDetailMap] = useState<Map<string, OutingDetail>>(new Map());

  useEffect(() => {
    if (status !== 'ready') return;
    const finalGamePks = [...new Set(rows.filter((r) => r.source === 'actual_starter').map((r) => r.game_pk))];
    if (finalGamePks.length === 0) {
      setDetailMap(new Map());
      return;
    }
    let cancelled = false;
    fetchOutingDetails(finalGamePks).then((map) => {
      if (!cancelled) setDetailMap(map);
    });
    return () => {
      cancelled = true;
    };
  }, [status, rows]);

  return useMemo(
    () =>
      rows.map((r) => {
        const detail = detailMap.get(`${r.game_pk}:${r.pitcher_id}`);
        if (!detail) return r;
        return {
          ...r,
          _postMortemNotes: deriveOutingNotes({
            actual_batters_faced: r.actual_batters_faced,
            avg_batters_faced: r.avg_batters_faced,
            earned_runs: detail.earned_runs,
            walks: detail.walks,
            home_runs: detail.home_runs,
          }),
          _postMortemReason: classifyOutingReason({
            actual_batters_faced: r.actual_batters_faced,
            avg_batters_faced: r.avg_batters_faced,
            projected_strikeouts: r.projected_strikeouts,
            actual_k: r.actual_k,
            outs_recorded: detail.outs_recorded,
            pitches: detail.pitches,
          }),
        };
      }),
    [rows, detailMap]
  );
}
