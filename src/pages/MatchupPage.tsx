import { useParams, Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { MatchupDetail } from '@/components/matchup/MatchupDetail';
import { useSimulateStore } from '@/store/useSimulateStore';
import { useEasternSlate } from '@/lib/useEasternSlate';
import { defaultEasternDate } from '@/lib/format';
import type { EnrichedSlateRow } from '@/types/slate';

// Route-based wrapper around MatchupDetail -- used on mobile (tap-through
// from a GameCard) and for direct/refreshed links. Desktop's master-detail
// layout on Today's Board / Simulation renders MatchupDetail inline instead,
// without a route change.
export default function MatchupPage() {
  const { gamePk } = useParams<{ gamePk: string }>();
  const gamePkNum = Number(gamePk);

  const storeRows = useSimulateStore((s) => s.rows);
  const storeHasGame = storeRows.some((r) => r.game_pk === gamePkNum);

  // Direct/refreshed navigation with nothing cached in the shared store yet
  // -- fall back to today's ET slate rather than dead-ending, same
  // self-sufficiency approach used for Predictability earlier.
  const fallback = useEasternSlate(storeHasGame ? null : defaultEasternDate());
  const rows: EnrichedSlateRow[] = storeHasGame ? storeRows : fallback.rows;
  const loading = !storeHasGame && fallback.status === 'loading';

  const starters = rows.filter((r) => r.game_pk === gamePkNum);

  if (loading) {
    return (
      <AppShell title="Matchup">
        <div className="py-10 text-center text-sm text-text-muted">Loading matchup…</div>
      </AppShell>
    );
  }

  if (starters.length === 0) {
    return (
      <AppShell title="Matchup">
        <div className="py-10 text-center text-sm text-text-muted">
          Couldn't find this game in the currently loaded slate.
          <div className="mt-3">
            <Link to="/" className="text-k hover:underline">
              ← Back to Today's Board
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Matchup">
      <Link to="/" className="mb-4 inline-block text-[12.5px] text-text-muted hover:text-text">
        ← Back
      </Link>
      <MatchupDetail starters={starters} />
    </AppShell>
  );
}
