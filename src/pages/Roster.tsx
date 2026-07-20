import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PitcherModal } from '@/components/PitcherModal';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { supabase } from '@/lib/supabaseClient';
import { avgBfDisplay } from '@/lib/kboardData';
import { useLookupsStore } from '@/store/useLookupsStore';
import { fmt } from '@/lib/format';

interface RosterRow {
  pitcher_id: number;
  name: string;
  throws: string | null;
  starts: number;
  reliefAppearances: number;
  openerStarts: number;
  k9bf: number | null;
  k9: number | null;
}

export default function Roster() {
  const lookups = useLookupsStore((s) => s.lookups)!;
  const teams = [...lookups.teamsById.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const [teamId, setTeamId] = useState('');
  const [rows, setRows] = useState<RosterRow[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [openPitcherId, setOpenPitcherId] = useState<number | null>(null);

  useEffect(() => {
    if (!teamId) {
      setRows(null);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setError(null);

    async function load() {
      const [currentTeamRes, roleSummaryRes] = await Promise.all([
        supabase.from('pitcher_current_team').select('pitcher_id').eq('team_id', Number(teamId)),
        supabase.from('pitcher_role_summary').select('*'),
      ]);
      if (cancelled) return;
      if (currentTeamRes.error || roleSummaryRes.error) {
        setStatus('error');
        setError((currentTeamRes.error ?? roleSummaryRes.error)?.message ?? 'Failed to load roster');
        return;
      }
      const roleById = new Map((roleSummaryRes.data ?? []).map((r) => [r.pitcher_id, r]));
      const pitcherIds = (currentTeamRes.data ?? []).map((c) => c.pitcher_id);

      const result: RosterRow[] = pitcherIds
        .map((pid) => {
          const player = lookups.playersById.get(pid);
          const role = roleById.get(pid) ?? { starts: 0, relief_appearances: 0, opener_starts: 0 };
          const l5 = lookups.last5ById.get(pid);
          return {
            pitcher_id: pid,
            name: player?.full_name || `#${pid}`,
            throws: player?.throws ?? null,
            starts: role.starts,
            reliefAppearances: role.relief_appearances,
            openerStarts: role.opener_starts,
            k9bf: l5?.k_per_9bf ?? null,
            k9: l5?.k_per_9 ?? null,
          };
        })
        .sort((a, b) => b.starts - a.starts || a.name.localeCompare(b.name));

      setRows(result);
      setStatus('ready');
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [teamId, lookups]);

  const selectedTeam = teamId ? lookups.teamsById.get(Number(teamId)) : undefined;

  return (
    <AppShell title="Lineup Lab">
      <div className="mb-4 flex items-center gap-3.5">
        {selectedTeam && <TeamBadge abbreviation={selectedTeam.abbreviation} teamId={selectedTeam.team_id} size="lg" />}
        <label className="text-xs uppercase tracking-wide text-text-muted" htmlFor="team-select">
          Team
        </label>
        <select
          id="team-select"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="rounded border border-line bg-bg-elevated px-2.5 py-1.5 text-[13px] text-text"
        >
          <option value="">Select a team…</option>
          {teams.map((t) => (
            <option key={t.team_id} value={t.team_id}>
              {t.abbreviation ? `${t.name} (${t.abbreviation})` : t.name}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-4 text-[11.5px] text-text-muted">
        Double-click any pitcher to see their last starts and run a what-if strikeout line.
      </p>

      {status === 'idle' && <div className="py-10 text-center text-sm text-text-muted">Pick a team to see its pitchers.</div>}
      {status === 'loading' && <div className="py-10 text-center text-sm text-text-muted">Loading roster…</div>}
      {status === 'error' && <div className="py-10 text-center text-sm text-text-muted">Couldn't load roster: {error}</div>}
      {status === 'ready' && rows && rows.length === 0 && (
        <div className="py-10 text-center text-sm text-text-muted">No pitcher history found for this team yet.</div>
      )}
      {status === 'ready' && rows && rows.length > 0 && (
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-wide text-text-muted">
              <th className="py-2 pr-2 font-medium">Pitcher</th>
              <th className="py-2 pr-2 text-right font-medium">Starts</th>
              <th className="py-2 pr-2 text-right font-medium">Relief App.</th>
              <th className="py-2 pr-2 text-right font-medium">Opener Starts</th>
              <th className="py-2 pr-2 text-right font-medium">K/9BF</th>
              <th className="py-2 pr-2 text-right font-medium">K/9</th>
              <th className="py-2 text-right font-medium">Last 5 Avg BF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.pitcher_id}
                className="cursor-pointer border-b border-line/60 font-mono-num hover:bg-bg-elevated"
                onDoubleClick={() => setOpenPitcherId(r.pitcher_id)}
              >
                <td className="py-2 pr-2 font-sans font-medium text-text">
                  {r.name}
                  {r.throws && (
                    <span className="ml-1.5 rounded bg-bg-elevated-2 px-1 py-0.5 text-[10px] text-text-muted">{r.throws}HP</span>
                  )}
                </td>
                <td className="py-2 pr-2 text-right">{r.starts}</td>
                <td className="py-2 pr-2 text-right">{r.reliefAppearances}</td>
                <td className="py-2 pr-2 text-right">{r.openerStarts}</td>
                <td className="py-2 pr-2 text-right">{fmt(r.k9bf, 2)}</td>
                <td className="py-2 pr-2 text-right">{fmt(r.k9, 2)}</td>
                <td className="py-2 text-right">{avgBfDisplay(lookups.last5ById, r.pitcher_id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {openPitcherId !== null && <PitcherModal pitcherId={openPitcherId} onClose={() => setOpenPitcherId(null)} />}
    </AppShell>
  );
}
