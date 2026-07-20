// Post-mortem notes explain *why* an actual outing diverged from projection,
// not just by how much (Predictability already covers the numeric residual).
// Thresholds below are heuristic, not derived from the model -- tune freely.

const SHORT_OUTING_BF_RATIO = 0.65; // actual BF below this fraction of the pitcher's own average
const HIGH_EARNED_RUNS = 4;
const HIGH_WALKS = 4; // control issues -- roughly double a typical starter's walk total

export interface OutingForPostMortem {
  actual_batters_faced: number | null;
  avg_batters_faced: number | null;
  earned_runs: number | null;
  walks: number | null;
  home_runs: number | null;
}

export function deriveOutingNotes(row: OutingForPostMortem): string[] {
  const notes: string[] = [];
  const { actual_batters_faced: bf, avg_batters_faced: avgBf, earned_runs: er, walks: bb, home_runs: hr } = row;

  if (bf !== null && avgBf !== null && avgBf > 0 && bf < avgBf * SHORT_OUTING_BF_RATIO) {
    notes.push(`Short outing — only faced ${bf} batters (usually ${Math.round(avgBf)}).`);
  }

  if (er !== null && er >= HIGH_EARNED_RUNS) {
    notes.push(`Allowed ${er} earned runs.`);
  }

  if (hr !== null && hr >= 1) {
    notes.push(hr === 1 ? 'Allowed a home run.' : `Allowed ${hr} home runs.`);
  }

  if (bb !== null && bb >= HIGH_WALKS) {
    notes.push(`Walked ${bb} batters — control issues.`);
  }

  return notes;
}

// A single categorical reason per outing, for Simulation History's Reason
// column. Distinct from deriveOutingNotes above (which can surface several
// free-text details at once) -- this always resolves to exactly one label.
// 'Injury' is a real category with no automatic detection yet (no injury
// signal exists in the current schema) -- kept in the type so it can be
// wired up later (manual tagging, an external feed) without a shape change.
export type OutingReason = 'Short outing' | 'Low strikeout rate' | 'Pitch count limitation' | 'Injury' | 'Unknown';

const HIGH_PITCHES_PER_OUT = 5.2; // a full, unlabored start runs roughly 3.8-4.2 pitches/out
const LOW_K_GAP = 2.5; // projected minus actual K, for a normal-length outing that just didn't miss bats

export interface OutingForReason {
  actual_batters_faced: number | null;
  avg_batters_faced: number | null;
  projected_strikeouts: number | null;
  actual_k: number | null;
  outs_recorded: number | null;
  pitches: number | null;
}

export function classifyOutingReason(row: OutingForReason): OutingReason {
  const {
    actual_batters_faced: bf,
    avg_batters_faced: avgBf,
    projected_strikeouts: proj,
    actual_k: k,
    outs_recorded: outs,
    pitches,
  } = row;

  const isShort = bf !== null && avgBf !== null && avgBf > 0 && bf < avgBf * SHORT_OUTING_BF_RATIO;

  if (isShort && outs !== null && outs > 0 && pitches !== null) {
    const pitchesPerOut = pitches / outs;
    if (pitchesPerOut >= HIGH_PITCHES_PER_OUT) return 'Pitch count limitation';
  }

  if (isShort) return 'Short outing';

  if (proj !== null && k !== null && proj - k >= LOW_K_GAP) return 'Low strikeout rate';

  return 'Unknown';
}
