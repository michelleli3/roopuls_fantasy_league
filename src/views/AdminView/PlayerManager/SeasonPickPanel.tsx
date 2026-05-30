import { useState } from 'react';
import { useContestants } from '../../../hooks/useContestants';
import { useUpsertSeasonPick } from '../../../hooks/usePicks';
import type { SeasonPick } from '../../../types';
import { REPICK_PENALTY } from '../../../utils/scoring';

interface Props {
  fantasyPlayerId: string;
  seasonPick: SeasonPick | undefined;
}

export default function SeasonPickPanel({ fantasyPlayerId, seasonPick }: Props) {
  const { data: contestants = [] } = useContestants();
  const upsert = useUpsertSeasonPick();
  const [selected, setSelected] = useState(seasonPick?.contestant_id ?? '');

  const pickedContestant = contestants.find(c => c.id === seasonPick?.contestant_id);
  const isEliminated = pickedContestant && !pickedContestant.active;

  async function handleSave() {
    if (!selected) return;
    const isRepick = !!seasonPick && selected !== seasonPick.contestant_id;
    await upsert.mutateAsync({
      fantasy_player_id: fantasyPlayerId,
      contestant_id: selected,
      repick_count: isRepick ? (seasonPick?.repick_count ?? 0) + 1 : (seasonPick?.repick_count ?? 0),
    });
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Season Pick</p>
        {seasonPick && seasonPick.repick_count > 0 && (
          <span className="text-xs text-red-500 font-medium">
            {seasonPick.repick_count} re-pick{seasonPick.repick_count > 1 ? 's' : ''} ({seasonPick.repick_count * Math.abs(REPICK_PENALTY)} pts penalty)
          </span>
        )}
      </div>

      {isEliminated && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {pickedContestant.name} has been eliminated — select a new pick before next episode ({REPICK_PENALTY} pts).
        </p>
      )}

      <div className="flex gap-2">
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm flex-1 bg-white"
        >
          <option value="">Select contestant…</option>
          {contestants.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}{!c.active ? ' (eliminated)' : ''}
            </option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={!selected || upsert.isPending || selected === seasonPick?.contestant_id}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          {seasonPick ? 'Update' : 'Set Pick'}
        </button>
      </div>

      {seasonPick && selected !== seasonPick.contestant_id && selected && (
        <p className="text-xs text-amber-600">
          Changing pick will add a {Math.abs(REPICK_PENALTY)}-point penalty.
        </p>
      )}
    </div>
  );
}
