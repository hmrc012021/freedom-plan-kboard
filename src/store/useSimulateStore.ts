import { create } from 'zustand';
import type { ScoredHistoryBundle } from '@/lib/kboardData';
import type { EnrichedSlateRow } from '@/types/slate';

// Shared cache of the last-loaded slate date, written by both Simulate and
// Predictability (each fetches independently) so revisiting either tab with
// the same date doesn't require a full reload.
interface SimulateStore {
  date: string | null;
  rows: EnrichedSlateRow[];
  historyBundle: ScoredHistoryBundle | null;
  setSlate: (date: string, rows: EnrichedSlateRow[], historyBundle: ScoredHistoryBundle | null) => void;
}

export const useSimulateStore = create<SimulateStore>()((set) => ({
  date: null,
  rows: [],
  historyBundle: null,
  setSlate: (date, rows, historyBundle) => set({ date, rows, historyBundle }),
}));
