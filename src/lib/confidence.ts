// Dedicated confidence-scoring service. Isolated from predictability.ts on
// purpose: predictability.ts owns the underlying statistics (bias, volatility,
// shrinkage), this file owns turning those numbers into a single 0-100 score
// for display. Keeping the two separate means the scoring formula below can
// evolve (weighting, new inputs) without touching the prediction math.
//
// V1 inputs, mapped from the existing PredictabilityResult:
//   - prediction error history / recent consistency -> adjustedVolatility (ratio to model baseline)
//   - sample size                                    -> n
// Not yet incorporated (would need new per-start data not currently fetched
// client-side -- innings pitched per start, K-rate variance independent of
// the volatility-of-residuals already captured above):
//   - innings stability
//   - strikeout-rate stability as a distinct signal from residual volatility
// Revisit when/if that data is plumbed through; the shape of this function
// (take a PredictabilityResult-like input, return 0-100) shouldn't need to
// change to add them.

import { PITCHER_RATING_STARTS, type PredictabilityResult } from './predictability';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// How sharply confidence falls off as volatility ratio rises above the
// "as volatile as the model's normal error" (ratio = 1.0) baseline.
const VOLATILITY_SLOPE = 60;

export function computeConfidenceScore(result: Pick<PredictabilityResult, 'ratio' | 'n'>): number {
  const volatilityScore = clamp(100 - (result.ratio - 0.5) * VOLATILITY_SLOPE, 0, 100);

  // Trust the volatility-derived score more as sample size grows; with too
  // few scored starts, pull toward a neutral midpoint instead of presenting
  // a possibly-noisy estimate as if it were solid.
  const sampleWeight = clamp(result.n / PITCHER_RATING_STARTS, 0, 1);
  const blended = volatilityScore * sampleWeight + 50 * (1 - sampleWeight);

  return Math.round(clamp(blended, 0, 100));
}
