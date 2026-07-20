import { useMemo } from 'react';
import { predictabilityForPitcher } from './predictability';
import type { ScoredHistoryBundle } from './kboardData';
import type { EnrichedSlateRow } from '@/types/slate';

// Shared by Today's Board, Simulation, and Predictability so all three
// compute _predictability identically -- confidence must mean the same
// thing everywhere it appears, or the numbers can't be trusted.
//
// Deliberately re-filters historyBundle.rows here rather than reusing
// row._pitcherHistory: that field is pre-sliced to the last 5 starts for
// the "Pitcher Last Five" table, but predictabilityForPitcher wants up to
// PITCHER_RATING_STARTS (10). Feeding it the pre-sliced 5 silently caps the
// sample size and produces a different (wrong) score than computing from
// the full history -- which is exactly the inconsistency that surfaced
// between Today's Board and the Predictability page.
export function usePredictabilityEnrichedRows(
  rows: EnrichedSlateRow[],
  historyBundle: ScoredHistoryBundle | null
): EnrichedSlateRow[] {
  return useMemo(() => {
    if (!historyBundle) return rows;
    return rows.map((r) => {
      const fullHistory = historyBundle.rows.filter((h) => Number(h.pitcher_id) === Number(r.pitcher_id));
      return {
        ...r,
        _predictability: predictabilityForPitcher(fullHistory, historyBundle.metrics),
      };
    });
  }, [rows, historyBundle]);
}
