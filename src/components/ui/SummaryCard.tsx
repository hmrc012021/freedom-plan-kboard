export function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: 'k' | 'hit' }) {
  return (
    <div className="min-w-[130px] flex-1 rounded-md border border-line bg-bg-elevated px-4 py-3.5">
      <div className="text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`mt-1 font-mono-num text-2xl font-bold ${tone === 'k' ? 'text-k' : tone === 'hit' ? 'text-hit' : 'text-text'}`}>
        {value}
      </div>
    </div>
  );
}
