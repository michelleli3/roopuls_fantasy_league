import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { getPlayerByEmail } from '../../api/players';
import { usePlayerByUserId, useUploadPlayerAvatar } from '../../hooks/usePlayers';
import { useContestants, useEpisodeResults } from '../../hooks/useContestants';
import {
  useSeasonPicks,
  useEpisodePicks,
  useUpsertSeasonPick,
  useAddEpisodePick,
  useRemoveEpisodePick,
} from '../../hooks/usePicks';
import {
  MAX_WINNER_PICKS,
  MAX_LOSER_PICKS,
  REPICK_PENALTY,
  WINNER_PICK_POINTS,
  LOSER_PICK_POINTS,
} from '../../utils/scoring';
import type { Contestant, EpisodePick, EpisodeResult, SeasonPick } from '../../types';

const PLACEMENT_STYLES: Record<EpisodeResult['placement'], string> = {
  WINNER: 'bg-yellow-100 text-yellow-800',
  WIN:    'bg-purple-100 text-purple-800',
  HIGH:   'bg-blue-100 text-blue-800',
  SAFE:   'bg-gray-100 text-gray-500',
  LOW:    'bg-orange-100 text-orange-700',
  BTM2:   'bg-red-100 text-red-700',
  ELIM:   'bg-red-200 text-red-900',
};

export default function PicksView() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!session) return <PlayerLoginPage />;

  return <PicksContent userId={session.user.id} />;
}

function PlayerLoginPage() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border w-full max-w-sm overflow-hidden">
        <div className="p-8 pb-4 text-center">
          <h1 className="text-2xl font-bold text-purple-700">Drag Race Fantasy</h1>
          <p className="text-sm text-gray-400 mt-1">Season 18</p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b mx-8">
          {(['signin', 'signup'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <div className="p-8 pt-6">
          {tab === 'signin' ? <SignInForm /> : <SignUpForm onSuccess={() => setTab('signin')} />}
        </div>
      </div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full border rounded-lg px-3 py-2.5 text-sm"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full border rounded-lg px-3 py-2.5 text-sm"
        required
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // Check allowlist before creating the account
      const player = await getPlayerByEmail(email.trim().toLowerCase());
      if (!player) {
        setError('That email isn\'t on the league roster. Ask the admin to add you.');
        return;
      }
      if (player.user_id) {
        setError('An account already exists for this email. Sign in instead.');
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        // Email confirmation required — the Postgres trigger will link on confirm
        setInfo('Check your email to confirm your account, then sign in.');
        onSuccess();
      }
      // If session exists, onAuthStateChange fires and PicksContent renders automatically
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full border rounded-lg px-3 py-2.5 text-sm"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full border rounded-lg px-3 py-2.5 text-sm"
        required
        minLength={6}
      />
      <input
        type="password"
        placeholder="Confirm password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        className="w-full border rounded-lg px-3 py-2.5 text-sm"
        required
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {info && <p className="text-green-600 text-sm">{info}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}

function PicksContent({ userId }: { userId: string }) {
  const { data: player, isLoading: playerLoading } = usePlayerByUserId(userId);
  const { data: contestants = [] } = useContestants();
  const { data: results = [] } = useEpisodeResults();
  const { data: seasonPicks = [] } = useSeasonPicks();
  const { data: episodePicks = [] } = useEpisodePicks();

  const episodesWithResults = new Set(results.map(r => r.episode_number));
  const maxResultEpisode = results.reduce((m, r) => Math.max(m, r.episode_number), 0);
  const nextEpisode = maxResultEpisode + 1;
  const allEpisodes = Array.from({ length: nextEpisode }, (_, i) => i + 1);

  const [selectedEpisode, setSelectedEpisode] = useState<number>(nextEpisode);

  useEffect(() => {
    setSelectedEpisode(prev => (prev === maxResultEpisode ? maxResultEpisode + 1 : prev));
  }, [maxResultEpisode]);

  const seasonPick = player ? seasonPicks.find(s => s.fantasy_player_id === player.id) : undefined;
  const pickedContestant = contestants.find(c => c.id === seasonPick?.contestant_id) ?? null;
  const seasonPickEliminated = pickedContestant != null && !pickedContestant.active;

  const isLocked = episodesWithResults.has(selectedEpisode);
  const contestantName = (id: string) => contestants.find(c => c.id === id)?.name ?? '—';

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (playerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {player && <AvatarUpload player={player} />}
            <div>
              <h1 className="text-2xl font-bold text-purple-700">Make Your Picks</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {player ? `Signed in as ${player.name}` : 'Drag Race Fantasy League · Season 18'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm font-medium text-purple-600 hover:underline">
              ← Standings
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-gray-600 border rounded-lg px-3 py-1.5"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-5">
        {!player ? (
          <div className="bg-white rounded-2xl border p-8 text-center space-y-2">
            <p className="font-semibold text-gray-700">Account not linked</p>
            <p className="text-sm text-gray-400">
              Your login isn't linked to a player yet. Ask the league admin to link your account.
            </p>
            <button
              onClick={handleLogout}
              className="mt-4 text-sm text-purple-600 hover:underline"
            >
              Sign out
            </button>
          </div>
        ) : (
          <>
            <SeasonPickCard
              playerId={player.id}
              seasonPick={seasonPick}
              pickedContestant={pickedContestant}
              eliminated={seasonPickEliminated}
              contestants={contestants}
            />

            <div className="bg-white rounded-2xl border p-5 space-y-4">
              <p className="font-semibold text-gray-800">Episode Picks</p>

              <div className="flex gap-1.5 flex-wrap">
                {allEpisodes.map(ep => {
                  const locked = episodesWithResults.has(ep);
                  const isUpcoming = ep === nextEpisode;
                  const isSelected = selectedEpisode === ep;
                  return (
                    <button
                      key={ep}
                      onClick={() => setSelectedEpisode(ep)}
                      className={`relative px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600'
                          : locked
                          ? 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                      }`}
                    >
                      {isUpcoming && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full ring-2 ring-white" />
                      )}
                      Ep {ep}
                    </button>
                  );
                })}
              </div>

              {isLocked ? (
                <LockedEpisodeSummary
                  playerId={player.id}
                  episode={selectedEpisode}
                  episodePicks={episodePicks}
                  results={results}
                  contestantName={contestantName}
                />
              ) : (
                <EpisodePicksEditor
                  playerId={player.id}
                  episode={selectedEpisode}
                  episodePicks={episodePicks}
                  contestants={contestants}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function AvatarUpload({ player }: { player: import('../../types').FantasyPlayer }) {
  const upload = useUploadPlayerAvatar();
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await upload.mutateAsync({ playerId: player.id, file });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <label className="relative cursor-pointer group flex-shrink-0">
      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-purple-200 bg-gray-100 flex items-center justify-center">
        {player.avatar_url ? (
          <img src={player.avatar_url} alt={player.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-xl font-bold font-serif">{player.name[0]}</span>
        )}
      </div>
      {uploading ? (
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs font-semibold">Edit</span>
        </div>
      )}
      <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
    </label>
  );
}

function SeasonPickCard({
  playerId,
  seasonPick,
  pickedContestant,
  eliminated,
  contestants,
}: {
  playerId: string;
  seasonPick: SeasonPick | undefined;
  pickedContestant: Contestant | null;
  eliminated: boolean;
  contestants: Contestant[];
}) {
  const upsert = useUpsertSeasonPick();
  const [isEditing, setIsEditing] = useState(false);
  const [selected, setSelected] = useState('');

  const needsPick = !seasonPick || eliminated;
  const showForm = needsPick || isEditing;
  const activeContestants = contestants.filter(c => c.active);

  async function handleSave() {
    if (!selected) return;
    const isRepick = !!seasonPick && selected !== seasonPick.contestant_id;
    await upsert.mutateAsync({
      fantasy_player_id: playerId,
      contestant_id: selected,
      repick_count: isRepick
        ? seasonPick!.repick_count + 1
        : (seasonPick?.repick_count ?? 0),
    });
    setIsEditing(false);
    setSelected('');
  }

  return (
    <div className={`bg-white rounded-2xl border p-5 space-y-3 ${eliminated ? 'border-red-200' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-800">Season Pick</p>
        {seasonPick && seasonPick.repick_count > 0 && (
          <span className="text-xs text-red-500 font-medium">
            {seasonPick.repick_count} re-pick{seasonPick.repick_count > 1 ? 's' : ''} &middot; {seasonPick.repick_count * Math.abs(REPICK_PENALTY)} pts penalty
          </span>
        )}
      </div>

      {eliminated && pickedContestant && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <strong>{pickedContestant.name}</strong> was eliminated — you must pick a new season winner.
          <span className="block text-xs text-red-400 mt-0.5">Each re-pick costs {Math.abs(REPICK_PENALTY)} pts.</span>
        </div>
      )}

      {!seasonPick && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700">
          You haven't picked a season winner yet. Pick who you think will win it all!
        </div>
      )}

      {seasonPick && !eliminated && pickedContestant && (
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800">{pickedContestant.name}</span>
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Active</span>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-gray-400 hover:text-purple-600 transition-colors"
            >
              Change ({Math.abs(REPICK_PENALTY)} pt penalty)
            </button>
          )}
        </div>
      )}

      {showForm && (
        <>
          {isEditing && selected && selected !== seasonPick?.contestant_id && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Changing your pick will add a {Math.abs(REPICK_PENALTY)}-point penalty.
            </p>
          )}
          <div className="flex gap-2">
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm flex-1 bg-white"
            >
              <option value="">Select season winner…</option>
              {activeContestants.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={!selected || upsert.isPending}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap"
            >
              {upsert.isPending ? 'Saving…' : needsPick ? 'Set Pick' : 'Confirm'}
            </button>
            {isEditing && (
              <button
                onClick={() => { setIsEditing(false); setSelected(''); }}
                className="text-sm text-gray-400 hover:text-gray-600 px-2"
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EpisodePicksEditor({
  playerId,
  episode,
  episodePicks,
  contestants,
}: {
  playerId: string;
  episode: number;
  episodePicks: EpisodePick[];
  contestants: Contestant[];
}) {
  const addPick = useAddEpisodePick();
  const removePick = useRemoveEpisodePick();

  const myPicks = episodePicks.filter(
    p => p.fantasy_player_id === playerId && p.episode_number === episode
  );
  const winnerPicks = myPicks.filter(p => p.pick_type === 'winner');
  const loserPicks  = myPicks.filter(p => p.pick_type === 'loser');
  const activeContestants = contestants.filter(c => c.active);

  async function toggle(contestantId: string, type: 'winner' | 'loser') {
    const existing = myPicks.find(
      p => p.contestant_id === contestantId && p.pick_type === type
    );
    if (existing) {
      await removePick.mutateAsync(existing.id);
      return;
    }
    const sameType = type === 'winner' ? winnerPicks : loserPicks;
    if (sameType.length >= (type === 'winner' ? MAX_WINNER_PICKS : MAX_LOSER_PICKS)) return;
    await addPick.mutateAsync({
      fantasy_player_id: playerId,
      contestant_id: contestantId,
      episode_number: episode,
      pick_type: type,
    });
  }

  if (activeContestants.length === 0) {
    return <p className="text-sm text-gray-400 italic py-2">No active contestants to pick from.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Pick up to {MAX_WINNER_PICKS} winners and {MAX_LOSER_PICKS} losers for Episode {episode}.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Winners ({winnerPicks.length}/{MAX_WINNER_PICKS})
          </p>
          <div className="border rounded-lg overflow-hidden">
            {activeContestants.map(c => {
              const picked = winnerPicks.some(p => p.contestant_id === c.id);
              const conflict = loserPicks.some(p => p.contestant_id === c.id);
              const full = !picked && winnerPicks.length >= MAX_WINNER_PICKS;
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 text-sm transition-colors ${
                    picked ? 'bg-purple-50' : 'bg-white'
                  } ${conflict || full ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={picked}
                    disabled={conflict || full}
                    onChange={() => toggle(c.id, 'winner')}
                    className="accent-purple-600"
                  />
                  {c.name}
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Losers ({loserPicks.length}/{MAX_LOSER_PICKS})
          </p>
          <div className="border rounded-lg overflow-hidden">
            {activeContestants.map(c => {
              const picked = loserPicks.some(p => p.contestant_id === c.id);
              const conflict = winnerPicks.some(p => p.contestant_id === c.id);
              const full = !picked && loserPicks.length >= MAX_LOSER_PICKS;
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 text-sm transition-colors ${
                    picked ? 'bg-red-50' : 'bg-white'
                  } ${conflict || full ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={picked}
                    disabled={conflict || full}
                    onChange={() => toggle(c.id, 'loser')}
                    className="accent-red-500"
                  />
                  {c.name}
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function LockedEpisodeSummary({
  playerId,
  episode,
  episodePicks,
  results,
  contestantName,
}: {
  playerId: string;
  episode: number;
  episodePicks: EpisodePick[];
  results: EpisodeResult[];
  contestantName: (id: string) => string;
}) {
  const myPicks = episodePicks.filter(
    p => p.fantasy_player_id === playerId && p.episode_number === episode
  );
  const winnerPicks = myPicks.filter(p => p.pick_type === 'winner');
  const loserPicks  = myPicks.filter(p => p.pick_type === 'loser');

  if (myPicks.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-2">No picks were submitted for this episode.</p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 border">
        Results are in — picks are locked for Episode {episode}.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <LockedPickGroup label="Winners" picks={winnerPicks} results={results} episode={episode} contestantName={contestantName} type="winner" />
        <LockedPickGroup label="Losers"  picks={loserPicks}  results={results} episode={episode} contestantName={contestantName} type="loser" />
      </div>
    </div>
  );
}

function LockedPickGroup({
  label, picks, results, episode, contestantName, type,
}: {
  label: string;
  picks: EpisodePick[];
  results: EpisodeResult[];
  episode: number;
  contestantName: (id: string) => string;
  type: 'winner' | 'loser';
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {picks.length === 0 ? (
        <p className="text-xs text-gray-300 italic">None</p>
      ) : (
        <div className="space-y-2">
          {picks.map(pick => {
            const result = results.find(
              r => r.contestant_id === pick.contestant_id && r.episode_number === episode
            );
            const pts = result
              ? (type === 'winner' ? WINNER_PICK_POINTS[result.placement] : LOSER_PICK_POINTS[result.placement])
              : null;
            return (
              <div key={pick.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-700 truncate">{contestantName(pick.contestant_id)}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {result && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${PLACEMENT_STYLES[result.placement]}`}>
                      {result.placement}
                    </span>
                  )}
                  {pts !== null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      pts > 0 ? 'bg-purple-100 text-purple-700' :
                      pts < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {pts > 0 ? '+' : ''}{pts}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
