import { useEffect, useMemo, useState } from 'react';

// MLB's own public headshot CDN, keyed by the same player_id already
// stored in mlb.players (that's where the data was ingested from).
// q_auto:best,f_auto lets Cloudinary pick the smallest well-optimized
// format/quality per browser instead of always shipping a fixed q_100 file.
// Falls back to the pitcher's initials (more informative than a generic
// icon) if a specific photo 404s, so a missing/rookie headshot never
// breaks the layout.
const SIZE_CLASSES = {
  sm: 'h-9 w-9 text-[11px]',
  md: 'h-14 w-14 text-sm',
  lg: 'h-20 w-20 text-lg',
};

function initialsFor(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function PitcherPhoto({
  playerId,
  name,
  size = 'md',
}: {
  playerId: number | null | undefined;
  name?: string | null;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const dims = SIZE_CLASSES[size];
  const initials = useMemo(() => initialsFor(name), [name]);

  // Explicit reset on ID change rather than relying solely on callers
  // remembering a React `key` -- cheap insurance against a stale "failed"
  // flag surviving an ID swap if a component instance is ever reused.
  useEffect(() => {
    setImgFailed(false);
  }, [playerId]);

  if (playerId && !imgFailed) {
    return (
      <img
        src={`https://img.mlbstatic.com/mlb-photos/image/upload/w_180,q_auto:best,f_auto/v1/people/${playerId}/headshot/67/current`}
        alt={name || 'Pitcher headshot'}
        loading="lazy"
        decoding="async"
        className={`shrink-0 rounded-full border-2 border-line bg-bg-elevated-2 object-cover ${dims}`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border-2 border-line bg-bg-elevated-2 font-display font-bold text-text-muted ${dims}`}
    >
      {initials}
    </div>
  );
}
