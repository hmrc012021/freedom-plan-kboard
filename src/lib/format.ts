// MLB day/time convention: every calendar day and first-pitch time is
// resolved in US Eastern, regardless of the viewer's browser timezone.
export const MLB_TIME_ZONE = 'America/New_York';

export function fmt(n: number | null | undefined, d = 1): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toFixed(d);
}

export function signed(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const zeroed = Math.abs(n) < 0.05 ? 0 : n;
  return `${zeroed > 0 ? '+' : ''}${zeroed.toFixed(digits)}`;
}

export function deltaClass(value: number | null | undefined): 'positive' | 'negative' | 'neutral' {
  const n = Number(value);
  if (n > 0.05) return 'positive';
  if (n < -0.05) return 'negative';
  return 'neutral';
}

// Same rounding logic for whole-count projections (e.g. batters faced) that
// shouldn't display with a decimal.
export function roundedCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return String(Math.round(value));
}

export function dateStringInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function shiftDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12));
  return shifted.toISOString().slice(0, 10);
}

export function parseUtcTimestamp(utcString: string | null | undefined): Date | null {
  if (!utcString) return null;
  let text = String(utcString).trim();
  // The field is explicitly UTC. Some Postgres/RPC serializations omit the
  // trailing zone; append Z so a European browser cannot reinterpret it as local time.
  text = text.replace(' ', 'T');
  if (!/[zZ]$|[+-]\d{2}(?::?\d{2})?$/.test(text)) text += 'Z';
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatGameTime(utcString: string | null | undefined): string {
  const d = parseUtcTimestamp(utcString);
  if (!d) return 'Time TBD';
  return (
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: MLB_TIME_ZONE,
    }).format(d) + ' ET'
  );
}

export function defaultEasternDate(): string {
  return dateStringInTimeZone(new Date(), MLB_TIME_ZONE);
}
