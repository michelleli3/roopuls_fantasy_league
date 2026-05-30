import { useState } from 'react';
import { useContestants, useEpisodeResults, useAddEpisodeResult, useDeleteEpisodeResult } from '../../../hooks/useContestants';
import type { EpisodeResult } from '../../../types';

const PLACEMENTS: EpisodeResult['placement'][] = ['WIN', 'HIGH', 'SAFE', 'LOW', 'BTM2', 'ELIM', 'WINNER'];

const PLACEMENT_STYLES: Record<EpisodeResult['placement'], string> = {
  WINNER: 'bg-yellow-100 text-yellow-800',
  WIN:    'bg-purple-100 text-purple-800',
  HIGH:   'bg-blue-100 text-blue-800',
  SAFE:   'bg-gray-100 text-gray-600',
  LOW:    'bg-orange-100 text-orange-700',
  BTM2:   'bg-red-100 text-red-700',
  ELIM:   'bg-red-200 text-red-900',
};

const BLANK_FORM = {
  contestant_id: '',
  placement: 'SAFE' as EpisodeResult['placement'],
  lip_synced: false,
  challenge_win: false,
};

export default function EpisodeLog() {
  const { data: contestants = [] } = useContestants();
  const { data: results = [], isLoading } = useEpisodeResults();
  const addResult = useAddEpisodeResult();
  const deleteResult = useDeleteEpisodeResult();

  const [episode, setEpisode] = useState(1);
  const [form, setForm] = useState(BLANK_FORM);

  const maxEpisode = results.reduce((m, r) => Math.max(m, r.episode_number), 0);
  const episodes = Array.from({ length: Math.max(maxEpisode, episode) }, (_, i) => i + 1);

  const contestantName = (id: string) =>
    contestants.find(c => c.id === id)?.name ?? id;

  const episodeResults = results
    .filter(r => r.episode_number === episode)
    .sort((a, b) => PLACEMENTS.indexOf(a.placement) - PLACEMENTS.indexOf(b.placement));

  const alreadyLogged = new Set(episodeResults.map(r => r.contestant_id));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.contestant_id) return;
    await addResult.mutateAsync({ ...form, episode_number: episode });
    setForm(BLANK_FORM);
  }

  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6">
      {/* Episode selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Episode</label>
        <div className="flex gap-1 flex-wrap">
          {episodes.map(ep => (
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
          <button
            onClick={() => setEpisode(maxEpisode + 1)}
            className="px-3 py-1 rounded-full text-sm font-medium border border-dashed border-gray-300 text-gray-400 hover:border-purple-400 hover:text-purple-500"
          >
            + New
          </button>
        </div>
      </div>

      {/* Add result form */}
      <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Add result — Episode {episode}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Contestant</label>
            <select
              value={form.contestant_id}
              onChange={e => setForm(f => ({ ...f, contestant_id: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full bg-white"
              required
            >
              <option value="">Select…</option>
              {contestants
                .filter(c => !alreadyLogged.has(c.id))
                .map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Placement</label>
            <select
              value={form.placement}
              onChange={e => setForm(f => ({ ...f, placement: e.target.value as EpisodeResult['placement'] }))}
              className="border rounded-lg px-3 py-2 text-sm w-full bg-white"
            >
              {PLACEMENTS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.challenge_win}
                onChange={e => setForm(f => ({ ...f, challenge_win: e.target.checked }))}
                className="accent-purple-600"
              />
              Challenge win
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.lip_synced}
                onChange={e => setForm(f => ({ ...f, lip_synced: e.target.checked }))}
                className="accent-purple-600"
              />
              Lip synced
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={addResult.isPending}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          {addResult.isPending ? 'Saving…' : 'Add result'}
        </button>
      </form>

      {/* Results table */}
      {episodeResults.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Contestant</th>
                <th className="text-left px-4 py-2 font-medium">Placement</th>
                <th className="px-4 py-2 font-medium text-center">Chall. Win</th>
                <th className="px-4 py-2 font-medium text-center">Lip Sync</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {episodeResults.map(r => (
                <tr key={r.id} className="bg-white">
                  <td className="px-4 py-2">{contestantName(r.contestant_id)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PLACEMENT_STYLES[r.placement]}`}>
                      {r.placement}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">{r.challenge_win ? '✓' : '—'}</td>
                  <td className="px-4 py-2 text-center">{r.lip_synced ? '✓' : '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => deleteResult.mutate(r.id)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">No results logged for episode {episode} yet.</p>
      )}
    </div>
  );
}
