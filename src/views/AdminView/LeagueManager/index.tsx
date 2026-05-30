import { useState } from 'react';
import ContestantRoster from './ContestantRoster';
import EpisodeLog from './EpisodeLog';

type Tab = 'roster' | 'episodes';

export default function LeagueManager() {
  const [tab, setTab] = useState<Tab>('roster');

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b">
        {(['roster', 'episodes'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'roster' ? 'Contestant Roster' : 'Episode Log'}
          </button>
        ))}
      </div>

      {tab === 'roster' && <ContestantRoster />}
      {tab === 'episodes' && <EpisodeLog />}
    </div>
  );
}
