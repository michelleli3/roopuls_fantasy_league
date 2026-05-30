import { useState } from 'react';
import { usePlayers } from '../../hooks/usePlayers';
import { useContestants, useEpisodeResults } from '../../hooks/useContestants';
import { useSeasonPicks, useEpisodePicks } from '../../hooks/usePicks';
import {
  calculatePlayerTotal,
  scoreSeasonPick,
  WINNER_PICK_POINTS,
  LOSER_PICK_POINTS,
} from '../../utils/scoring';
import type { EpisodePick, EpisodeResult } from '../../types';

const PLACEMENT_STYLES: Record<EpisodeResult['placement'], string> = {
  WINNER: 'bg-yellow-100 text-yellow-800',
  WIN:    'bg-purple-100 text-purple-800',
  HIGH:   'bg-blue-100 text-blue-800',
  SAFE:   'bg-gray-100 text-gray-500',
  LOW:    'bg-orange-100 text-orange-700',
  BTM2:   'bg-red-100 text-red-700',
  ELIM:   'bg-red-200 text-red-900',
};

const RANK_STYLES = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

export default function PlayerView() {
  const { data: players = [], isLoading } = usePlayers();
  const { data: contestants = [] } = useContestants();
  const { data: results = [] } = useEpisodeResults();
  const { data: seasonPicks = [] } = useSeasonPicks();
  const { data: episodePicks = [] } = useEpisodePicks();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const contestantName = (id: string) => contestants.find(c => c.id === id)?.name ?? '—';

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

  const episodes = [...new Set(results.map(r => r.episode_number))].sort((a, b) => a - b);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading standings…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-5 text-center">
        <h1 className="text-2xl font-bold text-purple-700">Drag Race Fantasy League</h1>
        <p className="text-sm text-gray-400 mt-1">Season 18 Standings</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-3">
        {ranked.map((player, i) => {
          const seasonPick = seasonPicks.find(s => s.fantasy_player_id === player.id);
          const playerEpPicks = episodePicks.filter(p => p.fantasy_player_id === player.id);
          const isExpanded = expandedId === player.id;

          return (
            <div key={player.id} className="bg-white rounded-2xl border overflow-hidden">
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : player.id)}
                className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                <span className={`text-lg font-black w-8 ${RANK_STYLES[i] ?? 'text-gray-300'}`}>
                  #{i + 1}
                </span>
                <span className="flex-1 font-semibold text-gray-800">{player.name}</span>
                {seasonPick && (
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {contestantName(seasonPick.contestant_id)}
                  </span>
                )}
                <span className={`text-xl font-black tabular-nums ${
                  player.total > 0 ? 'text-purple-600' : player.total < 0 ? 'text-red-500' : 'text-gray-300'
                }`}>
                  {player.total > 0 ? '+' : ''}{player.total}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded breakdown */}
              {isExpanded && (
                <div className="border-t px-5 py-4 space-y-5 bg-gray-50">

                  {/* Season pick */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Season Pick</p>
                    {seasonPick ? (
                      <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border text-sm">
                        <div>
                          <span className="font-medium text-gray-800">{contestantName(seasonPick.contestant_id)}</span>
                          {seasonPick.repick_count > 0 && (
                            <span className="ml-2 text-xs text-red-400">
                              {seasonPick.repick_count} re-pick{seasonPick.repick_count > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <ScorePill pts={scoreSeasonPick(seasonPick, results)} />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No season pick set.</p>
                    )}
                  </div>

                  {/* Episode picks */}
                  {episodes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Episode Picks</p>
                      <div className="space-y-2">
                        {episodes.map(ep => {
                          const epPicks = playerEpPicks.filter(p => p.episode_number === ep);
                          if (epPicks.length === 0) return null;

                          const winners = epPicks.filter(p => p.pick_type === 'winner');
                          const losers  = epPicks.filter(p => p.pick_type === 'loser');

                          const epPoints = epPicks.reduce((sum, pick) => {
                            const result = results.find(
                              r => r.contestant_id === pick.contestant_id && r.episode_number === ep
                            );
                            if (!result) return sum;
                            return sum + (pick.pick_type === 'winner'
                              ? WINNER_PICK_POINTS[result.placement]
                              : LOSER_PICK_POINTS[result.placement]);
                          }, 0);

                          return (
                            <div key={ep} className="bg-white rounded-xl border px-4 py-3 text-sm">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-600">Episode {ep}</span>
                                <ScorePill pts={epPoints} />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <PickGroup label="Winners" picks={winners} results={results} episode={ep} contestantName={contestantName} type="winner" />
                                <PickGroup label="Losers"  picks={losers}  results={results} episode={ep} contestantName={contestantName} type="loser" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {ranked.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">No players yet.</p>
        )}
      </main>
    </div>
  );
}

function ScorePill({ pts }: { pts: number }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
      pts > 0 ? 'bg-purple-100 text-purple-700' :
      pts < 0 ? 'bg-red-100 text-red-600' :
      'bg-gray-100 text-gray-400'
    }`}>
      {pts > 0 ? '+' : ''}{pts} pts
    </span>
  );
}

function PickGroup({ label, picks, results, episode, contestantName, type }: {
  label: string;
  picks: EpisodePick[];
  results: EpisodeResult[];
  episode: number;
  contestantName: (id: string) => string;
  type: 'winner' | 'loser';
}) {
  if (picks.length === 0) return <div />;

  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="space-y-1">
        {picks.map(pick => {
          const result = results.find(
            r => r.contestant_id === pick.contestant_id && r.episode_number === episode
          );
          const pts = result
            ? (type === 'winner' ? WINNER_PICK_POINTS[result.placement] : LOSER_PICK_POINTS[result.placement])
            : null;

          return (
            <div key={pick.id} className="flex items-center justify-between gap-2">
              <span className="text-gray-700 truncate">{contestantName(pick.contestant_id)}</span>
              <div className="flex items-center gap-1 shrink-0">
                {result && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${PLACEMENT_STYLES[result.placement]}`}>
                    {result.placement}
                  </span>
                )}
                {pts !== null && <ScorePill pts={pts} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
