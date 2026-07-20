// Numeric confidence, 0-100, with the ring border colored by band (red for
// low/volatile through green for high/reliable) so the number has an
// immediate visual read, not just digits. Gray + em dash when there isn't
// enough scored history to trust a score at all.
const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-[11px] border-2',
  md: 'h-11 w-11 text-[13px] border-[3px]',
  lg: 'h-16 w-16 text-lg border-4',
};

const BAND_COLORS = [
  { min: 0, max: 19, color: '#4B5563' },
  { min: 20, max: 29, color: '#6F334A' },
  { min: 30, max: 39, color: '#A4475D' },
  { min: 40, max: 49, color: '#D26468' },
  { min: 50, max: 59, color: '#D59B45' },
  { min: 60, max: 69, color: '#9DA653' },
  { min: 70, max: 79, color: '#45A5A5' },
  { min: 80, max: 89, color: '#5FA777' },
  { min: 90, max: 100, color: '#82D3A1' },
] as const;
const NO_DATA_COLOR = '#566068';

const TIER_LABELS: Record<'high' | 'medium' | 'low' | 'unknown', string> = {
  high: 'Reliable',
  medium: 'Mixed',
  low: 'Volatile',
  unknown: 'Unproven',
};

function bandColor(score: number | null): string {
  if (score === null || !Number.isFinite(score)) return NO_DATA_COLOR;
  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  return (BAND_COLORS.find((b) => bounded >= b.min && bounded <= b.max) ?? BAND_COLORS[0]).color;
}

export function ConfidenceBadge({
  score,
  tier,
  size = 'md',
  innerClassName = 'bg-bg-elevated',
}: {
  score: number | null;
  tier?: 'high' | 'medium' | 'low' | 'unknown';
  size?: keyof typeof SIZE_CLASSES;
  innerClassName?: string;
}) {
  const clamped = score === null || !Number.isFinite(score) ? null : Math.max(0, Math.min(100, Math.round(score)));
  const color = bandColor(clamped);
  const tierLabel = tier ? TIER_LABELS[tier] : null;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex shrink-0 items-center justify-center rounded-full font-mono-num font-bold text-text ${SIZE_CLASSES[size]} ${innerClassName}`}
        style={{ borderColor: color, boxShadow: `0 0 0 1px ${color}33 inset` }}
        title={clamped === null ? 'Confidence unavailable' : tierLabel ? `Confidence ${clamped}/100 — ${tierLabel}` : `Confidence ${clamped}/100`}
      >
        {clamped === null ? '—' : clamped}
      </div>
      {tierLabel && <span className="text-[8.5px] font-medium uppercase tracking-wide text-text-muted">{tierLabel}</span>}
    </div>
  );
}
