// Ported as-is from k-board-v21.html's client-side predictability engine.
// Business logic is intentionally unchanged -- only the language is (JS -> TS).

export const HISTORY_LOOKBACK_DAYS = 90;
export const PITCHER_RATING_STARTS = 10;
export const SHRINKAGE_STARTS = 5;

export interface ScoredHistoryRow {
  game_pk: number;
  pitcher_id: number;
  projection_date: string;
  team_id: number | null;
  opponent_team_id: number | null;
  projected_strikeouts: number;
  pitcher_name: string;
  actual_k: number;
  actual_bf: number | null;
  residual: number;
}

export interface ModelMetrics {
  starts: number;
  mae: number;
  bias: number;
  volatility: number;
  within1: number;
  within2: number;
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function sampleStd(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, value) => sum + Math.pow(value - m, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function computeModelMetrics(rows: ScoredHistoryRow[]): ModelMetrics {
  const residuals = rows.map((r) => r.residual);
  return {
    starts: rows.length,
    mae: rows.length ? mean(residuals.map(Math.abs)) : 0,
    bias: rows.length ? mean(residuals) : 0,
    volatility: rows.length > 1 ? sampleStd(residuals) : 0,
    within1: rows.length ? rows.filter((r) => Math.abs(r.residual) <= 1).length / rows.length : 0,
    within2: rows.length ? rows.filter((r) => Math.abs(r.residual) <= 2).length / rows.length : 0,
  };
}

export function recentHistoryForPitcher(historyRows: ScoredHistoryRow[], pitcherId: number, limit = 5): ScoredHistoryRow[] {
  return historyRows
    .filter((r) => Number(r.pitcher_id) === Number(pitcherId))
    .sort((a, b) => b.projection_date.localeCompare(a.projection_date))
    .slice(0, limit)
    .reverse();
}

export function recentHistoryForBattingTeam(historyRows: ScoredHistoryRow[], teamId: number | null, limit = 5): ScoredHistoryRow[] {
  return historyRows
    .filter((r) => Number(r.opponent_team_id) === Number(teamId))
    .sort((a, b) => b.projection_date.localeCompare(a.projection_date))
    .slice(0, limit)
    .reverse();
}

export interface PredictabilityResult {
  recent: ScoredHistoryRow[];
  n: number;
  rawBias: number;
  calibratedBias: number;
  mae: number;
  rawVolatility: number;
  adjustedVolatility: number;
  ratio: number;
  label: string;
  badge: 'high' | 'medium' | 'low' | 'unknown';
  cause: string;
}

export function predictabilityForPitcher(historyRows: ScoredHistoryRow[], globalMetrics: ModelMetrics): PredictabilityResult {
  const recent = [...historyRows]
    .sort((a, b) => b.projection_date.localeCompare(a.projection_date))
    .slice(0, PITCHER_RATING_STARTS);
  const n = recent.length;
  const residuals = recent.map((r) => r.residual);
  const rawBias = n ? mean(residuals) : 0;
  const mae = n ? mean(residuals.map(Math.abs)) : 0;
  const rawVolatility = n > 1 ? sampleStd(residuals) : globalMetrics.volatility;
  const globalVariance = Math.pow(globalMetrics.volatility || 1.5, 2);
  const pitcherVariance = Math.pow(rawVolatility || globalMetrics.volatility || 1.5, 2);
  const adjustedVariance =
    n > 1
      ? ((n - 1) * pitcherVariance + SHRINKAGE_STARTS * globalVariance) / (n - 1 + SHRINKAGE_STARTS)
      : globalVariance;
  const adjustedVolatility = Math.sqrt(adjustedVariance);
  const specificBias = rawBias - globalMetrics.bias;
  const shrunkSpecificBias = specificBias * (n / (n + SHRINKAGE_STARTS));
  const calibratedBias = globalMetrics.bias + shrunkSpecificBias;
  const baselineVol = globalMetrics.volatility || 1.5;
  const ratio = adjustedVolatility / baselineVol;

  let label = 'Insufficient history';
  let badge: PredictabilityResult['badge'] = 'unknown';
  if (n >= 5) {
    if (ratio <= 0.78) { label = 'Very predictable'; badge = 'high'; }
    else if (ratio <= 1.0) { label = 'Predictable'; badge = 'high'; }
    else if (ratio <= 1.25) { label = 'Mixed'; badge = 'medium'; }
    else if (ratio <= 1.6) { label = 'Erratic'; badge = 'low'; }
    else { label = 'Very erratic'; badge = 'low'; }
    if (n < 10) label += ' · provisional';
  }

  const calibrationIssue = n >= 5 && Math.abs(shrunkSpecificBias) >= 0.75;
  const volatilityIssue = n >= 5 && ratio > 1.25;
  let cause = 'Not enough scored starts to separate pitcher behavior from normal model error.';
  if (n >= 5) {
    if (calibrationIssue && volatilityIssue) {
      cause = 'Both: the model is persistently miscalibrated for him and his residuals are unusually volatile.';
    } else if (calibrationIssue) {
      cause =
        shrunkSpecificBias > 0
          ? 'Model calibration: he has consistently delivered more Ks than projected.'
          : 'Model calibration: he has consistently delivered fewer Ks than projected.';
    } else if (volatilityIssue) {
      cause = "Pitcher volatility: misses swing more widely than the model's normal error.";
    } else {
      cause = 'Mostly normal model uncertainty; no strong pitcher-specific problem detected.';
    }
  }

  return { recent, n, rawBias, calibratedBias, mae, rawVolatility, adjustedVolatility, ratio, label, badge, cause };
}
