import { useEffect, useState } from 'react';
import { GameCard } from './GameCard';
import { MatchupListRow } from './MatchupListRow';
import { MatchupDetail } from './MatchupDetail';
import type { EnrichedSlateRow } from '@/types/slate';

// Mobile: full-width tap-through GameCards (unchanged "decision mode").
// Desktop: persistent master-detail split -- matchup list stays visible,
// clicking a row updates the detail pane in place instead of navigating
// away, matching the reference design's "Analysis Mode".
export function MatchupBoard({ games }: { games: [number, EnrichedSlateRow[]][] }) {
  const [selectedGamePk, setSelectedGamePk] = useState<number | null>(null);

  useEffect(() => {
    if (games.length > 0 && !games.some(([pk]) => pk === selectedGamePk)) {
      setSelectedGamePk(games[0][0]);
    }
  }, [games, selectedGamePk]);

  const selectedGame = games.find(([pk]) => pk === selectedGamePk);

  return (
    <>
      <div className="lg:hidden">
        {games.map(([gamePk, starters]) => (
          <GameCard key={gamePk} gamePk={gamePk} starters={starters} />
        ))}
      </div>

      <div className="hidden lg:grid lg:grid-cols-[340px_1fr] lg:items-start lg:gap-5">
        <div className="space-y-2">
          {games.map(([gamePk, starters]) => (
            <MatchupListRow
              key={gamePk}
              starters={starters}
              isSelected={gamePk === selectedGamePk}
              onSelect={() => setSelectedGamePk(gamePk)}
            />
          ))}
        </div>
        <div className="sticky top-20 rounded-lg border border-line bg-bg-elevated p-4 shadow-md shadow-black/20">
          {selectedGame ? (
            <MatchupDetail starters={selectedGame[1]} />
          ) : (
            <div className="py-10 text-center text-sm text-text-muted">Select a matchup.</div>
          )}
        </div>
      </div>
    </>
  );
}
