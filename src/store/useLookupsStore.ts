import { create } from 'zustand';
import { loadLookups, type Lookups } from '@/lib/kboardData';

interface LookupsStore {
  lookups: Lookups | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  load: () => Promise<void>;
}

export const useLookupsStore = create<LookupsStore>()((set, get) => ({
  lookups: null,
  status: 'idle',
  error: null,
  load: async () => {
    if (get().status === 'loading' || get().status === 'ready') return;
    set({ status: 'loading', error: null });
    try {
      const lookups = await loadLookups();
      set({ lookups, status: 'ready' });
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : 'Failed to load lookups' });
    }
  },
}));
