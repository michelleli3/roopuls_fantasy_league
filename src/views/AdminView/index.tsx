import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import LeagueManager from './LeagueManager';
import PlayerManager from './PlayerManager';

type Tab = 'league' | 'players';

export default function AdminView() {
  const [tab, setTab] = useState<Tab>('league');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-purple-700">Drag Race Fantasy</h1>
          <nav className="flex gap-1">
            {(['league', 'players'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'league' ? 'League Manager' : 'Player Manager'}
              </button>
            ))}
          </nav>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {tab === 'league' && <LeagueManager />}
        {tab === 'players' && <PlayerManager />}
      </main>
    </div>
  );
}
