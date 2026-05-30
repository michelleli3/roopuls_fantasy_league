import { useState } from 'react';
import { usePlayers, useAddPlayer, useUpdatePlayer } from '../../../hooks/usePlayers';
import { useEpisodeResults } from '../../../hooks/useContestants';
import { useSeasonPicks, useEpisodePicks } from '../../../hooks/usePicks';
import { calculatePlayerTotal } from '../../../utils/scoring';
import SeasonPickPanel from './SeasonPickPanel';
import EpisodePickPanel from './EpisodePickPanel';
import type { FantasyPlayer, SeasonPick, EpisodePick, EpisodeResult } from '../../../types';

export default function PlayerManager() {
  const { data: players = [], isLoading } = usePlayers();
  const { data: results = [] } = useEpisodeResults();
  const { data: seasonPicks = [] } = useSeasonPicks();
  const { data: episodePicks = [] } = useEpisodePicks();
  const addPlayer = useAddPlayer();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

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

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    await addPlayer.mutateAsync({ name: newName.trim(), email: newEmail.trim().toLowerCase() });
    setNewName('');
    setNewEmail('');
  }

  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Player list + add form */}
      <div className="col-span-1 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Players</h2>

        <form onSubmit={handleAddPlayer} className="bg-white border rounded-xl p-3 space-y-2">
          <input
            type="text"
            placeholder="Name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="email"
            placeholder="Email (for sign-up access)"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={addPlayer.isPending}
            className="w-full bg-purple-600 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {addPlayer.isPending ? 'Adding…' : '+ Add Player'}
          </button>
        </form>

        <div className="space-y-2">
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
      </div>

      {/* Detail panel */}
      <div className="col-span-2">
        {selectedPlayer ? (
          <PlayerDetail
            player={selectedPlayer}
            seasonPick={seasonPicks.find(s => s.fantasy_player_id === selectedPlayer.id)}
            episodePicks={episodePicks as EpisodePick[]}
            results={results as EpisodeResult[]}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-gray-400">
            Select a player to manage their picks
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerDetail({ player, seasonPick, episodePicks, results }: {
  player: FantasyPlayer;
  seasonPick: SeasonPick | undefined;
  episodePicks: EpisodePick[];
  results: EpisodeResult[];
}) {
  const updatePlayer = useUpdatePlayer();
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(player.email ?? '');

  async function saveEmail() {
    await updatePlayer.mutateAsync({ id: player.id, updates: { email: emailDraft.trim().toLowerCase() || null } });
    setEditingEmail(false);
  }

  const total = calculatePlayerTotal(player.id, seasonPick, episodePicks, results);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{player.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            {editingEmail ? (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={emailDraft}
                  onChange={e => setEmailDraft(e.target.value)}
                  className="border rounded-lg px-2 py-1 text-xs w-52"
                  autoFocus
                />
                <button onClick={saveEmail} className="text-xs text-purple-600 hover:underline">Save</button>
                <button onClick={() => { setEditingEmail(false); setEmailDraft(player.email ?? ''); }} className="text-xs text-gray-400 hover:underline">Cancel</button>
              </div>
            ) : (
              <>
                <span className="text-xs text-gray-400">{player.email ?? 'No email set'}</span>
                <button onClick={() => setEditingEmail(true)} className="text-xs text-gray-300 hover:text-purple-500">edit</button>
              </>
            )}
            {player.user_id && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Signed up</span>
            )}
          </div>
        </div>
        <span className="text-2xl font-bold text-purple-600">{total} pts</span>
      </div>

      <SeasonPickPanel
        fantasyPlayerId={player.id}
        seasonPick={seasonPick}
      />

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Episode Picks</p>
        <EpisodePickPanel
          fantasyPlayerId={player.id}
          episodePicks={episodePicks}
        />
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
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-bold text-gray-400 w-4 shrink-0">#{rank}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{player.name}</p>
            {player.email && (
              <p className="text-xs text-gray-400 truncate">{player.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {player.user_id && (
            <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">✓</span>
          )}
          <span className={`text-sm font-bold ${total > 0 ? 'text-purple-600' : total < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {total > 0 ? '+' : ''}{total}
          </span>
        </div>
      </div>
    </button>
  );
}
