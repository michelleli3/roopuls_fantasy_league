import { useState } from 'react';
import { usePlayers } from '../../../hooks/usePlayers';
import { useEpisodeResults } from '../../../hooks/useContestants';
import { useSeasonPicks, useEpisodePicks } from '../../../hooks/usePicks';
import { calculatePlayerTotal } from '../../../utils/scoring';
import SeasonPickPanel from './SeasonPickPanel';
import EpisodePickPanel from './EpisodePickPanel';
import type { FantasyPlayer } from '../../../types';

export default function PlayerManager() {
  const { data: players = [], isLoading } = usePlayers();
  const { data: results = [] } = useEpisodeResults();
  const { data: seasonPicks = [] } = useSeasonPicks();
  const { data: episodePicks = [] } = useEpisodePicks();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedPlayer = players.find(p => p.id === selectedId);

  const ranked = [...players]
    .map(p => ({
      ...p,
      total: calculatePlayerTotal(
        p.id,
        seasonPicks.find(s => s.fantasy_player_id === p.id),
        episodePicks,
        results
      ),
    }))
    .sort((a, b) => b.total - a.total);

  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Player list */}
      <div className="col-span-1 space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Players</h2>
        {ranked.map((p, i) => (
          <PlayerCard
            key={p.id}
            player={p}
            rank={i + 1}
            total={p.total}
            selected={selectedId === p.id}
            onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
          />
        ))}
      </div>

      {/* Detail panel */}
      <div className="col-span-2">
        {selectedPlayer ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">{selectedPlayer.name}</h2>
              <span className="text-2xl font-bold text-purple-600">
                {calculatePlayerTotal(
                  selectedPlayer.id,
                  seasonPicks.find(s => s.fantasy_player_id === selectedPlayer.id),
                  episodePicks,
                  results
                )} pts
              </span>
            </div>

            <SeasonPickPanel
              fantasyPlayerId={selectedPlayer.id}
              seasonPick={seasonPicks.find(s => s.fantasy_player_id === selectedPlayer.id)}
            />

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Episode Picks</p>
              <EpisodePickPanel
                fantasyPlayerId={selectedPlayer.id}
                episodePicks={episodePicks}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-gray-400">
            Select a player to manage their picks
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerCard({ player, rank, total, selected, onClick }: {
  player: FantasyPlayer;
  rank: number;
  total: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
        selected
          ? 'bg-purple-50 border-purple-300'
          : 'bg-white border-gray-200 hover:border-purple-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 w-4">#{rank}</span>
          <span className="text-sm font-medium text-gray-800">{player.name}</span>
        </div>
        <span className={`text-sm font-bold ${total > 0 ? 'text-purple-600' : total < 0 ? 'text-red-500' : 'text-gray-400'}`}>
          {total > 0 ? '+' : ''}{total}
        </span>
      </div>
    </button>
  );
}
