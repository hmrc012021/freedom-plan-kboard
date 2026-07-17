import { create } from 'zustand';
import type { ScoredHistoryBundle } from '@/lib/kboardData';
import type { EnrichedSlateRow } from '@/components/matchup/StarterRow';

// Predictability is slate-linked: it evaluates whichever date was last loaded
// on the Simulate / Day Slate tab, matching the original app's shared globals.
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
