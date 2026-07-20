import { useEffect, useState } from 'react';
import { fetchSlateRowsForEasternDate, loadScoredHistory, enrichSlateRowsWithHistory } from '@/lib/kboardData';
import { useLookupsStore } from '@/store/useLookupsStore';
import type { ScoredHistoryBundle } from '@/lib/kboardData';
import type { EnrichedSlateRow } from '@/types/slate';

interface SlateState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  rows: EnrichedSlateRow[];
  historyBundle: ScoredHistoryBundle | null;
  error: string | null;
}

export function useEasternSlate(dateStr: string | null) {
  const playersById = useLookupsStore((s) => s.lookups!.playersById);
  const [state, setState] = useState<SlateState>({ status: 'idle', rows: [], historyBundle: null, error: null });

  useEffect(() => {
    if (!dateStr) return;
    let cancelled = false;
    setState({ status: 'loading', rows: [], historyBundle: null, error: null });

    async function load() {
      try {
        const rawRows = await fetchSlateRowsForEasternDate(dateStr!);
        let historyBundle: ScoredHistoryBundle | null = null;
        let rows: EnrichedSlateRow[] = rawRows;
        try {
          historyBundle = await loadScoredHistory(dateStr!, playersById);
          rows = enrichSlateRowsWithHistory(rawRows, historyBundle);
        } catch {
          // Current slate remains usable even if historical comparison data is unavailable.
        }
        if (!cancelled) setState({ status: 'ready', rows, historyBundle, error: null });
      } catch (err) {
        if (!cancelled) {
          setState({ status: 'error', rows: [], historyBundle: null, error: err instanceof Error ? err.message : 'Failed to load slate' });
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [dateStr, playersById]);

  return state;
}
