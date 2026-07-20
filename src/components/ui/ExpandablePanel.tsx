import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// Generic, controlled accordion section. "Single section open at a time"
// is a property of how a group of these are used together, not of this
// component -- the parent owns which key is open and passes isOpen/onToggle
// accordingly. Reused for both pitcher-level expand/collapse in MatchupPage
// and the per-pitcher detail sections (Raw Estimator, Last Five, etc.).
export function ExpandablePanel({
  title,
  summary,
  isOpen,
  onToggle,
  children,
}: {
  title: ReactNode;
  summary?: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-line first:border-t-0">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-bg-elevated-2"
      >
        <span className="font-display text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</span>
        <span className="flex items-center gap-2.5">
          {!isOpen && summary}
          <ChevronDown size={15} className={`shrink-0 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {isOpen && <div className="px-3.5 pb-4">{children}</div>}
    </div>
  );
}
