import { useState } from 'react';
import { useContestants, useEpisodeResults } from '../../../hooks/useContestants';
import { useAddEpisodePick, useRemoveEpisodePick } from '../../../hooks/usePicks';
import type { EpisodePick } from '../../../types';
import { MAX_WINNER_PICKS, MAX_LOSER_PICKS } from '../../../utils/scoring';

interface Props {
  fantasyPlayerId: string;
  episodePicks: EpisodePick[];
}

export default function EpisodePickPanel({ fantasyPlayerId, episodePicks }: Props) {
  const { data: contestants = [] } = useContestants();
  const { data: results = [] } = useEpisodeResults();
  const addPick = useAddEpisodePick();
  const removePick = useRemoveEpisodePick();

  const maxEpisode = results.reduce((m, r) => Math.max(m, r.episode_number), 1);
  const [episode, setEpisode] = useState(1);

  const playerPicksThisEpisode = episodePicks.filter(
    p => p.fantasy_player_id === fantasyPlayerId && p.episode_number === episode
  );
  const winnerPicks = playerPicksThisEpisode.filter(p => p.pick_type === 'winner');
  const loserPicks  = playerPicksThisEpisode.filter(p => p.pick_type === 'loser');

  async function toggle(contestantId: string, type: 'winner' | 'loser') {
    const existing = playerPicksThisEpisode.find(
      p => p.contestant_id === contestantId && p.pick_type === type
    );
    if (existing) {
      await removePick.mutateAsync(existing.id);
      return;
    }

    const sameType = type === 'winner' ? winnerPicks : loserPicks;
    const maxAllowed = type === 'winner' ? MAX_WINNER_PICKS : MAX_LOSER_PICKS;
    if (sameType.length >= maxAllowed) return;

    await addPick.mutateAsync({
      fantasy_player_id: fantasyPlayerId,
      contestant_id: contestantId,
      episode_number: episode,
      pick_type: type,
    });
  }

  const contestantName = (id: string) => contestants.find(c => c.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      {/* Episode selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Episode</span>
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: maxEpisode }, (_, i) => i + 1).map(ep => (
            <button
              key={ep}
              onClick={() => setEpisode(ep)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                episode === ep
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
              }`}
            >
              {ep}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Winner picks */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Winners ({winnerPicks.length}/{MAX_WINNER_PICKS})
          </p>
          <div className="border rounded-lg overflow-hidden">
            {contestants.map(c => {
              const picked = winnerPicks.some(p => p.contestant_id === c.id);
              const otherType = loserPicks.some(p => p.contestant_id === c.id);
              const full = !picked && winnerPicks.length >= MAX_WINNER_PICKS;
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 text-sm cursor-pointer transition-colors
                    ${picked ? 'bg-purple-50' : 'bg-white'}
                    ${otherType || full ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={picked}
                    disabled={otherType || full}
                    onChange={() => toggle(c.id, 'winner')}
                    className="accent-purple-600"
                  />
                  <span className={c.active ? '' : 'text-gray-400'}>{c.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Loser picks */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Losers ({loserPicks.length}/{MAX_LOSER_PICKS})
          </p>
          <div className="border rounded-lg overflow-hidden">
            {contestants.map(c => {
              const picked = loserPicks.some(p => p.contestant_id === c.id);
              const otherType = winnerPicks.some(p => p.contestant_id === c.id);
              const full = !picked && loserPicks.length >= MAX_LOSER_PICKS;
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 text-sm cursor-pointer transition-colors
                    ${picked ? 'bg-red-50' : 'bg-white'}
                    ${otherType || full ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={picked}
                    disabled={otherType || full}
                    onChange={() => toggle(c.id, 'loser')}
                    className="accent-red-500"
                  />
                  <span className={c.active ? '' : 'text-gray-400'}>{c.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary row */}
      {playerPicksThisEpisode.length > 0 && (
        <div className="text-xs text-gray-500 flex flex-wrap gap-2">
          {winnerPicks.map(p => (
            <span key={p.id} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              ↑ {contestantName(p.contestant_id)}
            </span>
          ))}
          {loserPicks.map(p => (
            <span key={p.id} className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              ↓ {contestantName(p.contestant_id)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
