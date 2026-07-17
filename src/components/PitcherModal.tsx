import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useLookupsStore } from '@/store/useLookupsStore';
import { teamLabel } from '@/lib/kboardData';

interface StartRow {
  date: string;
  k: number;
  bf: number;
  opener: boolean;
  opponent: string;
}

export function PitcherModal({ pitcherId, onClose }: { pitcherId: number; onClose: () => void }) {
  const lookups = useLookupsStore((s) => s.lookups)!;
  const player = lookups.playersById.get(pitcherId);
  const [starts, setStarts] = useState<StartRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [line, setLine] = useState(5);

  useEffect(() => {
    let cancelled = false;
    setStarts(null);
    setError(null);

    async function load() {
      const { data, error } = await supabase
        .from('pitcher_outings')
        .select('game_pk,strikeouts,batters_faced,is_opener,opponent_team_id,games(game_date)')
        .eq('pitcher_id', pitcherId)
        .eq('is_starter', true)
        .order('game_date', { ascending: false, referencedTable: 'games' })
        .limit(10);
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      const rows = (data ?? [])
        .map((g): StartRow => {
          const games = g.games as unknown as { game_date: string } | { game_date: string }[] | null;
          const gameDate = Array.isArray(games) ? games[0]?.game_date : games?.game_date;
          return {
            date: gameDate || '—',
            k: g.strikeouts ?? 0,
            bf: g.batters_faced ?? 0,
            opener: Boolean(g.is_opener),
            opponent: teamLabel(lookups.teamsById, g.opponent_team_id),
          };
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      setStarts(rows);
      if (rows.length) setLine(Math.round((Math.max(...rows.map((s) => s.k), 10) / 2) * 2) / 2);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pitcherId, lookups]);

  const maxK = starts ? Math.max(...starts.map((s) => s.k), 10) : 10;
  const overCount = starts ? starts.filter((s) => s.k > line).length : 0;
  const underCount = starts ? starts.length - overCount : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6 pt-16"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-lg border border-line bg-bg-elevated p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="font-display text-xl font-semibold text-text">{player?.full_name || `Pitcher #${pitcherId}`}</div>
            <div className="text-[12.5px] text-text-muted">{player?.throws ? `Throws ${player.throws}` : ''}</div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && <div className="py-8 text-center text-sm text-text-muted">Couldn't load starts: {error}</div>}
        {!error && !starts && <div className="py-8 text-center text-sm text-text-muted">Loading last starts…</div>}
        {!error && starts && starts.length === 0 && (
          <div className="py-8 text-center text-sm text-text-muted">No start history on record for this pitcher.</div>
        )}

        {!error && starts && starts.length > 0 && (
          <>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-text-muted">
                  <th className="py-2 pr-2 font-medium">Date</th>
                  <th className="py-2 pr-2 font-medium">Opp</th>
                  <th className="py-2 pr-2 text-right font-medium">BF</th>
                  <th className="py-2 text-right font-medium">K</th>
                </tr>
              </thead>
              <tbody>
                {starts.map((s, i) => (
                  <tr key={i} className="border-b border-line/60 font-mono-num last:border-0">
                    <td className="py-2 pr-2">
                      {s.date}
                      {s.opener && (
                        <span className="ml-1.5 rounded bg-k/20 px-1.5 py-0.5 font-sans text-[10px] uppercase text-k">opener</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 font-sans">{s.opponent}</td>
                    <td className="py-2 pr-2 text-right">{s.bf}</td>
                    <td className="py-2 text-right">{s.k}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 rounded-md border border-line bg-bg-elevated-2 p-4">
              <div className="mb-2.5 font-display text-xs font-semibold uppercase tracking-wide text-text-muted">
                What-if: strikeout line
              </div>
              <div className="flex items-center gap-3.5">
                <input
                  type="range"
                  min={0.5}
                  max={maxK + 1.5}
                  step={0.5}
                  value={line}
                  onChange={(e) => setLine(Number(e.target.value))}
                  className="flex-1 accent-k"
                />
                <div className="min-w-[64px] text-right font-mono-num text-lg font-bold text-text">{line.toFixed(1)}</div>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-text-muted">Over {line.toFixed(1)}</div>
                  <div className="font-mono-num text-xl font-bold text-hit">
                    {overCount}/{starts.length} ({Math.round((overCount / starts.length) * 100)}%)
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-text-muted">Under {line.toFixed(1)}</div>
                  <div className="font-mono-num text-xl font-bold text-k">
                    {underCount}/{starts.length} ({Math.round((underCount / starts.length) * 100)}%)
                  </div>
                </div>
              </div>
              <div className="mt-3.5 text-[11.5px] leading-relaxed text-text-muted">
                Hit rate is calculated against this pitcher's last {starts.length} starts on record — not a probability guarantee.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
