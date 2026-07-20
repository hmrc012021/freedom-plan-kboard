import type { SlateRow } from './database.types';
import type { ScoredHistoryRow, PredictabilityResult } from '@/lib/predictability';
import type { OutingReason } from '@/lib/postMortem';

export type EnrichedSlateRow = SlateRow & {
  _pitcherHistory?: ScoredHistoryRow[];
  _opponentHistory?: ScoredHistoryRow[];
  _predictability?: PredictabilityResult;
  _postMortemNotes?: string[];
  _postMortemReason?: OutingReason;
};
