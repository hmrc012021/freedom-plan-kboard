import { fmt } from '@/lib/format';

// Nods to the physical "K" placards scoreboard operators hang for every
// punchout, rather than a plain number. Rounded to a whole count for the
// visual marks while retaining the model's exact one-decimal projection
// beside them -- actual outcomes are whole numbers; projections are expected
// values and shouldn't be rounded away.
export function KTally({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-text-muted">—</span>;
  const exact = Number(value);
  const wholeMarks = Math.max(0, Math.floor(exact));
  const capped = Math.min(wholeMarks, 8);

  return (
    <span className="inline-flex items-center gap-px align-middle">
      {Array.from({ length: capped }).map((_, i) => (
        <span key={i} className="font-mono-num text-xs font-bold leading-none text-k">K</span>
      ))}
      {wholeMarks > 8 && <span className="font-mono-num text-xs font-bold leading-none text-text-muted">+</span>}
      <span className="ml-1.5 font-bold">{fmt(exact, 1)}</span>
    </span>
  );
}
