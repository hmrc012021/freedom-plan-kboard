import { useEffect, useState } from 'react';

// Real MLB primary colors -- used for the fallback badge (and as instant
// paint before the logo image loads), without depending on licensing an
// external image source ourselves.
const TEAM_COLORS: Record<string, string> = {
  ATL: '#CE1141', ARI: '#A71930', BAL: '#DF4601', BOS: '#BD3039', CHC: '#0E3386',
  CWS: '#27251F', CIN: '#C6011F', CLE: '#00385D', COL: '#33006F', DET: '#0C2340',
  HOU: '#EB6E1F', KC: '#004687', LAA: '#BA0021', LAD: '#005A9C', MIA: '#00A3E0',
  MIL: '#12284B', MIN: '#002B5C', NYM: '#002D72', NYY: '#0C2340', OAK: '#003831',
  PHI: '#E81828', PIT: '#FDB827', SD: '#2F241D', SEA: '#0C2C56', SF: '#FD5A1E',
  STL: '#C41E3A', TB: '#092C5C', TEX: '#003278', TOR: '#134A8E', WSH: '#AB0003',
};

// Deterministic fallback for any abbreviation not in the map above, so a
// missing/unexpected value never renders as a blank badge.
function fallbackColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 38%)`;
}

const SIZE_CLASSES = {
  sm: 'h-6 w-6 text-[9px]',
  md: 'h-8 w-8 text-[10.5px]',
  lg: 'h-10 w-10 text-xs',
};

// Real team crest, sourced from MLB's own public team-logo CDN (mlbstatic.com
// -- the same domain MLB.com itself serves crests from, keyed by the same
// team_id already stored in mlb.teams since that's where K-Board's data was
// ingested from). Falls back to a colored initials badge if the image 404s
// or the ID doesn't resolve, so a bad/missing logo never breaks the layout.
export function TeamBadge({
  abbreviation,
  teamId,
  size = 'md',
}: {
  abbreviation: string | null | undefined;
  teamId?: number | null;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const label = (abbreviation || '?').slice(0, 3).toUpperCase();
  const color = (abbreviation && TEAM_COLORS[abbreviation.toUpperCase()]) || fallbackColor(label);
  const dims = SIZE_CLASSES[size];

  // Explicit reset on ID change rather than relying solely on callers
  // remembering a React `key` -- cheap insurance against a stale "failed"
  // flag surviving an ID swap if a component instance is ever reused.
  useEffect(() => {
    setImgFailed(false);
  }, [teamId]);

  if (teamId && !imgFailed) {
    return (
      <img
        src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
        alt={label}
        title={label}
        loading="lazy"
        decoding="async"
        className={`shrink-0 rounded-full bg-white p-1 shadow-sm ${dims}`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-bold uppercase tracking-tight text-white shadow-sm ${dims}`}
      style={{ background: color }}
    >
      {label}
    </span>
  );
}
