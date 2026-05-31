import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { getPlayerByEmail } from '../../api/players';
import { usePlayerByUserId, useUploadPlayerAvatar } from '../../hooks/usePlayers';
import { useEpisodes } from '../../hooks/useEpisodes';
import { useContestants, useEpisodeResults } from '../../hooks/useContestants';
import { useSeasonPicks, useEpisodePicks, useUpsertSeasonPick, useAddEpisodePick, useRemoveEpisodePick } from '../../hooks/usePicks';
import { MAX_WINNER_PICKS, MAX_LOSER_PICKS, REPICK_PENALTY, WINNER_PICK_POINTS, LOSER_PICK_POINTS } from '../../utils/scoring';
import { G, ACCENT } from '../_glam/tokens';
import { GlamHead, PlacePill, ScorePill, GlamInput, GlamButton, Card, CardHead } from '../_glam/primitives';
import type { Contestant, EpisodePick, EpisodeResult, SeasonPick, FantasyPlayer } from '../../types';

function useNarrow() {
  const [narrow, setNarrow] = useState(
    typeof window !== 'undefined' && window.innerWidth < 680
  );
  useEffect(() => {
    const fn = () => setNarrow(window.innerWidth < 680);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return narrow;
}

// ── Auth gate ─────────────────────────────────────────────────────────────────
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: G.ink, color: G.muted, fontFamily: 'Outfit, sans-serif', fontSize: 14 }}>
        Loading…
      </div>
    );
  }
  if (!session) return <PlayerLoginPage />;
  return <PicksContent userId={session.user.id} />;
}

// ── Login page ────────────────────────────────────────────────────────────────
function PlayerLoginPage() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      background: G.ink,
      backgroundImage: `radial-gradient(90% 60% at 50% -5%, ${G.purple}33, transparent 65%), radial-gradient(70% 50% at 50% 110%, ${G.pink}22, transparent 60%)`,
      fontFamily: 'Outfit, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 380, background: G.ink2, borderRadius: 24, overflow: 'hidden', border: `1px solid ${G.line}`, boxShadow: '0 40px 90px -40px rgba(0,0,0,.8)' }}>
        {/* Card header */}
        <div style={{ textAlign: 'center', padding: '34px 28px 18px', background: `radial-gradient(120% 90% at 50% -20%, ${ACCENT.key}22, transparent 60%)` }}>
          <div style={{ fontSize: 30, marginBottom: 6, filter: `drop-shadow(0 4px 10px ${ACCENT.key}88)` }}>♛</div>
          <h1 style={{ margin: 0, fontFamily: 'Bodoni Moda, serif', fontWeight: 700, fontSize: 30, lineHeight: 1, color: G.cream }}>
            Drag Race{' '}
            <span style={{ background: ACCENT.foil, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Fantasy</span>
          </h1>
          <div style={{ fontFamily: 'Pinyon Script, cursive', fontSize: 26, color: G.pinkSoft, lineHeight: 1.1, marginTop: 2 }}>start your engines</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', margin: '0 28px', borderBottom: `1px solid ${G.line}` }}>
          {(['signin', 'signup'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              all: 'unset' as const, cursor: 'pointer', flex: 1, textAlign: 'center', padding: '12px 0',
              fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 13,
              color: tab === t ? G.cream : G.muted,
              borderBottom: `2px solid ${tab === t ? ACCENT.key : 'transparent'}`,
              marginBottom: -1, transition: 'color .18s',
            }}>{t === 'signin' ? 'Sign in' : 'Create account'}</button>
          ))}
        </div>

        {/* Forms */}
        <div style={{ padding: '24px 28px 30px' }}>
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <GlamInput type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <GlamInput type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
      {error && <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: G.bad, margin: 0 }}>{error}</p>}
      <GlamButton type="submit" disabled={loading} style={{ marginTop: 4 }}>
        {loading ? 'One moment…' : 'Sashay in →'}
      </GlamButton>
      <p style={{ textAlign: 'center', fontFamily: 'Outfit, sans-serif', fontSize: 11.5, color: G.muted, margin: 0 }}>
        Only cast members can enter the werk room.
      </p>
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
    setError(''); setInfo('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const player = await getPlayerByEmail(email.trim().toLowerCase());
      if (!player) { setError("Your email isn't on the league roster. Ask the admin to add you."); return; }
      if (player.user_id) { setError('Account already exists for this email. Sign in instead.'); return; }
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) { setError(signUpError.message); return; }
      if (!data.session) { setInfo('Check your email to confirm your account, then sign in.'); onSuccess(); }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <GlamInput type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <GlamInput type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
      <GlamInput type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
      {error && <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: G.bad, margin: 0 }}>{error}</p>}
      {info  && <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: G.good, margin: 0 }}>{info}</p>}
      <GlamButton type="submit" disabled={loading} style={{ marginTop: 4 }}>
        {loading ? 'One moment…' : 'Join the cast →'}
      </GlamButton>
      <p style={{ textAlign: 'center', fontFamily: 'Outfit, sans-serif', fontSize: 11.5, color: G.muted, margin: 0 }}>
        Your email must be on the league roster.
      </p>
    </form>
  );
}

// ── Picks content ─────────────────────────────────────────────────────────────
function PicksContent({ userId }: { userId: string }) {
  const narrow = useNarrow();
  const { data: player, isLoading: playerLoading } = usePlayerByUserId(userId);
  const { data: contestants = [] } = useContestants();
  const { data: results = [] } = useEpisodeResults();
  const { data: seasonPicks = [] } = useSeasonPicks();
  const { data: episodesList = [] } = useEpisodes();
  const episodeNames = Object.fromEntries(episodesList.map(e => [e.episode_number, e.name]));
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

  if (playerLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: G.ink, color: G.muted, fontFamily: 'Outfit, sans-serif', fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: G.ink, color: G.cream, fontFamily: 'Outfit, sans-serif', backgroundImage: `radial-gradient(80% 50% at 50% 0%, ${G.purple}22, transparent 70%)` }}>
      {/* Header */}
      <div style={{ position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${G.line}`, background: `radial-gradient(110% 100% at 50% -30%, ${ACCENT.key}1f, transparent 60%)` }}>
        <div style={{ maxWidth: 620, margin: '0 auto', padding: narrow ? '20px 18px' : '24px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            {player && <GlamAvatarUpload player={player} narrow={narrow} />}
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontFamily: 'Bodoni Moda, serif', fontWeight: 700, fontSize: narrow ? 26 : 32, lineHeight: 1, color: G.cream }}>
                Make Your{' '}
                <span style={{ background: ACCENT.foil, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Picks</span>
              </h1>
              {player && (
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: G.muted, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  serving as <span style={{ color: G.pinkSoft, fontWeight: 700 }}>{player.name}</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Link to="/" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '.03em', color: G.cream, background: `${ACCENT.key}22`, border: `1px solid ${ACCENT.key}44`, padding: '8px 14px', borderRadius: 999, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              ← Standings
            </Link>
            {!narrow && (
              <button onClick={() => supabase.auth.signOut()} style={{ all: 'unset' as const, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: 600, color: G.muted, border: `1px solid ${G.line}`, padding: '8px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth: 620, margin: '0 auto', padding: narrow ? '18px 16px 40px' : '24px 26px 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!player ? (
          <Card>
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Bodoni Moda, serif', fontWeight: 700, fontSize: 20, color: G.cream, marginBottom: 8 }}>Account not linked</div>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: G.muted, margin: '0 0 20px' }}>
                Your login isn't linked to a player yet. Ask the league admin to link your account.
              </p>
              <button onClick={() => supabase.auth.signOut()} style={{ all: 'unset' as const, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 12, color: G.pinkSoft, borderBottom: `1px solid ${G.pinkSoft}44` }}>
                Sign out
              </button>
            </div>
          </Card>
        ) : (
          <>
            <SeasonPickCard
              playerId={player.id}
              seasonPick={seasonPick}
              pickedContestant={pickedContestant}
              eliminated={seasonPickEliminated}
              contestants={contestants}
            />

            <Card>
              <CardHead right={
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: isLocked ? G.muted : G.good }}>
                  {isLocked ? 'locked' : '● open'}
                </span>
              }>Episode Picks</CardHead>
              <div style={{ padding: '14px 20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <EpisodeTabs
                  allEpisodes={allEpisodes}
                  episodesWithResults={episodesWithResults}
                  nextEpisode={nextEpisode}
                  selected={selectedEpisode}
                  onSelect={setSelectedEpisode}
                />
                {episodeNames[selectedEpisode] && (
                  <div style={{ fontFamily: 'Bodoni Moda, serif', fontWeight: 700, fontSize: 15, color: G.cream }}>
                    Ep {selectedEpisode}
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400, fontSize: 13, color: G.muted, marginLeft: 8 }}>{episodeNames[selectedEpisode]}</span>
                  </div>
                )}
                {isLocked ? (
                  <LockedEpisodeSummary
                    playerId={player.id}
                    episode={selectedEpisode}
                    episodePicks={episodePicks}
                    results={results}
                    contestants={contestants}
                    narrow={narrow}
                  />
                ) : (
                  <EpisodePicksEditor
                    playerId={player.id}
                    episode={selectedEpisode}
                    episodePicks={episodePicks}
                    contestants={contestants}
                    narrow={narrow}
                  />
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ── Avatar upload ─────────────────────────────────────────────────────────────
function GlamAvatarUpload({ player, narrow }: { player: FantasyPlayer; narrow: boolean }) {
  const upload = useUploadPlayerAvatar();
  const [uploading, setUploading] = useState(false);
  const [hover, setHover] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await upload.mutateAsync({ playerId: player.id, file }); }
    finally { setUploading(false); e.target.value = ''; }
  }

  return (
    <label style={{ position: 'relative', cursor: 'pointer', display: 'block', flexShrink: 0 }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <GlamHead size={narrow ? 52 : 60} ring={ACCENT.key} name={player.name} avatarUrl={player.avatar_url ?? null} mono="YOU" />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%', display: 'grid', placeItems: 'center',
        background: 'rgba(0,0,0,.45)', opacity: hover || uploading ? 1 : 0, transition: 'opacity .2s',
        fontFamily: 'Outfit, sans-serif', fontSize: 10, fontWeight: 700, color: '#fff',
        pointerEvents: 'none',
      }}>{uploading ? '…' : 'EDIT'}</div>
      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
    </label>
  );
}

// ── Season pick card ──────────────────────────────────────────────────────────
function SeasonPickCard({ playerId, seasonPick, pickedContestant, eliminated, contestants }: {
  playerId: string; seasonPick: SeasonPick | undefined;
  pickedContestant: Contestant | null; eliminated: boolean; contestants: Contestant[];
}) {
  const upsert = useUpsertSeasonPick();
  const [isEditing, setIsEditing] = useState(false);
  const [selected, setSelected] = useState('');

  const needsPick = !seasonPick || eliminated;
  const showPicker = needsPick || isEditing;
  const activeContestants = contestants.filter(c => c.active);

  async function handleSave() {
    if (!selected) return;
    const isRepick = !!seasonPick && selected !== seasonPick.contestant_id;
    await upsert.mutateAsync({
      fantasy_player_id: playerId,
      contestant_id: selected,
      repick_count: isRepick ? seasonPick!.repick_count + 1 : (seasonPick?.repick_count ?? 0),
    });
    setIsEditing(false);
    setSelected('');
  }

  return (
    <Card danger={eliminated}>
      <CardHead right={seasonPick && seasonPick.repick_count > 0 ? (
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 11, color: G.bad }}>
          {seasonPick.repick_count} re-{seasonPick.repick_count > 1 ? 'snatches' : 'snatch'} · {seasonPick.repick_count * Math.abs(REPICK_PENALTY)} pts
        </span>
      ) : undefined}>Season Queen</CardHead>

      <div style={{ padding: '14px 20px 20px' }}>
        {eliminated && pickedContestant ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,93,115,.10)', border: '1px solid rgba(255,93,115,.3)', borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
            <GlamHead size={44} ring={G.bad} name={pickedContestant.name} dim mono="OUT" />
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#ffd0d6' }}>
              <strong style={{ color: G.cream }}>{pickedContestant.name}</strong> got the chop — crown a new winner.
              <span style={{ display: 'block', fontSize: 11, color: G.bad, marginTop: 2 }}>each re-snatch costs {Math.abs(REPICK_PENALTY)} pts.</span>
            </div>
          </div>
        ) : seasonPick && pickedContestant ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'rgba(0,0,0,.2)', border: `1px solid ${G.line}`, borderRadius: 14, padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <GlamHead size={48} ring={G.purple} name={pickedContestant.name} mono="QUEEN" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'Bodoni Moda, serif', fontWeight: 700, color: G.cream, fontSize: 17 }}>{pickedContestant.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: G.good, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: G.good, fontWeight: 700 }}>still in the running</span>
                </div>
              </div>
            </div>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} style={{ all: 'unset' as const, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 11.5, color: G.muted, whiteSpace: 'nowrap' }}>
                change (−{Math.abs(REPICK_PENALTY)} pts)
              </button>
            )}
          </div>
        ) : (
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: G.muted, marginBottom: 12 }}>
            You haven't crowned your queen yet. Pick who you think will win it all!
          </div>
        )}

        {showPicker && (
          <div style={{ marginTop: 14 }}>
            {isEditing && selected && (
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11.5, color: G.gold, background: 'rgba(255,210,63,.1)', border: '1px solid rgba(255,210,63,.3)', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
                Switching adds a {Math.abs(REPICK_PENALTY)}-point penalty.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {activeContestants.map(c => {
                const on = selected === c.id;
                return (
                  <button key={c.id} onClick={() => setSelected(c.id)} style={{
                    all: 'unset' as const, cursor: 'pointer', boxSizing: 'border-box',
                    display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 12,
                    background: on ? `${ACCENT.key}1f` : 'rgba(0,0,0,.2)',
                    border: `1px solid ${on ? ACCENT.key : G.line}`, transition: 'border-color .15s, background .15s',
                  }}>
                    <GlamHead size={32} ring={on ? ACCENT.key : G.purple} name={c.name} mono="" />
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? G.cream : G.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
              <GlamButton disabled={!selected || upsert.isPending} onClick={handleSave} style={{ width: 'auto', padding: '10px 24px' }}>
                {upsert.isPending ? 'Saving…' : needsPick ? 'Crown her' : 'Confirm switch'}
              </GlamButton>
              {isEditing && (
                <button onClick={() => { setIsEditing(false); setSelected(''); }} style={{ all: 'unset' as const, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 12, color: G.muted }}>
                  cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Episode tabs ──────────────────────────────────────────────────────────────
function EpisodeTabs({ allEpisodes, episodesWithResults, nextEpisode, selected, onSelect }: {
  allEpisodes: number[]; episodesWithResults: Set<number>;
  nextEpisode: number; selected: number; onSelect: (ep: number) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {allEpisodes.map(ep => {
        const locked = episodesWithResults.has(ep);
        const isUpcoming = ep === nextEpisode;
        const on = selected === ep;
        return (
          <button key={ep} onClick={() => onSelect(ep)} style={{
            all: 'unset' as const, cursor: 'pointer', position: 'relative', boxSizing: 'border-box',
            fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 12.5, padding: '7px 14px',
            borderRadius: 999, whiteSpace: 'nowrap',
            color: on ? '#2a0e1c' : locked ? G.muted : G.cream,
            background: on ? ACCENT.foil : 'rgba(0,0,0,.2)',
            border: `1px solid ${on ? 'transparent' : locked ? G.line : ACCENT.key + '55'}`,
            opacity: locked && !on ? .7 : 1,
          }}>
            {isUpcoming && (
              <span style={{ position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: '50%', background: G.good, boxShadow: `0 0 8px ${G.good}`, border: `2px solid ${G.ink2}` }} />
            )}
            Ep {ep}
          </button>
        );
      })}
    </div>
  );
}

// ── Episode picks editor ──────────────────────────────────────────────────────
function EpisodePicksEditor({ playerId, episode, episodePicks, contestants, narrow }: {
  playerId: string; episode: number; episodePicks: EpisodePick[];
  contestants: Contestant[]; narrow: boolean;
}) {
  const addPick = useAddEpisodePick();
  const removePick = useRemoveEpisodePick();
  const myPicks = episodePicks.filter(p => p.fantasy_player_id === playerId && p.episode_number === episode);
  const winnerIds = myPicks.filter(p => p.pick_type === 'winner').map(p => p.contestant_id);
  const loserIds  = myPicks.filter(p => p.pick_type === 'loser').map(p => p.contestant_id);

  async function toggle(contestantId: string, type: 'winner' | 'loser') {
    const existing = myPicks.find(p => p.contestant_id === contestantId && p.pick_type === type);
    if (existing) { await removePick.mutateAsync(existing.id); return; }
    const sameType = type === 'winner' ? winnerIds : loserIds;
    if (sameType.length >= (type === 'winner' ? MAX_WINNER_PICKS : MAX_LOSER_PICKS)) return;
    await addPick.mutateAsync({ fantasy_player_id: playerId, contestant_id: contestantId, episode_number: episode, pick_type: type });
  }

  const active = contestants.filter(c => c.active);
  if (active.length === 0) return <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: G.muted, fontStyle: 'italic' }}>No active contestants to pick from.</p>;

  return (
    <div>
      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: G.muted, marginBottom: 12 }}>
        Tap up to <strong style={{ color: G.gold }}>{MAX_WINNER_PICKS}</strong> to slay and <strong style={{ color: G.pinkSoft }}>{MAX_LOSER_PICKS}</strong> to flop for Episode {episode}. Picks lock when results drop.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: narrow ? 18 : 20 }}>
        <PickColumnEditor kind="winner" label="Picked to slay" pickedIds={winnerIds} otherIds={loserIds} cap={MAX_WINNER_PICKS} contestants={active} onToggle={id => toggle(id, 'winner')} />
        <PickColumnEditor kind="loser"  label="Picked to flop" pickedIds={loserIds}  otherIds={winnerIds} cap={MAX_LOSER_PICKS}  contestants={active} onToggle={id => toggle(id, 'loser')} />
      </div>
    </div>
  );
}

function PickColumnEditor({ kind, label, pickedIds, otherIds, cap, contestants, onToggle }: {
  kind: 'winner' | 'loser'; label: string; pickedIds: string[]; otherIds: string[];
  cap: number; contestants: Contestant[]; onToggle: (id: string) => void;
}) {
  const tint  = kind === 'winner' ? ACCENT.key : G.bad;
  const tintBg = kind === 'winner' ? `${ACCENT.key}1c` : 'rgba(255,93,115,.12)';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 12, color: kind === 'winner' ? G.gold : G.pinkSoft }}>{label}</span>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: G.muted }}>{pickedIds.length}/{cap}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {contestants.map(c => {
          const on = pickedIds.includes(c.id);
          const conflict = otherIds.includes(c.id);
          const full = !on && pickedIds.length >= cap;
          const disabled = conflict || full;
          return (
            <button key={c.id} disabled={disabled} onClick={() => onToggle(c.id)} style={{
              all: 'unset' as const, cursor: disabled ? 'not-allowed' : 'pointer', boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 12,
              background: on ? tintBg : 'rgba(0,0,0,.2)',
              border: `1px solid ${on ? tint : G.line}`,
              opacity: disabled ? .38 : 1, transition: 'border-color .15s, background .15s',
            }}>
              <GlamHead size={30} ring={on ? tint : G.purple} name={c.name} mono="" />
              <span style={{ flex: 1, fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: on ? 700 : 500, color: on ? G.cream : G.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              <span style={{ width: 18, height: 18, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', border: `1.5px solid ${on ? tint : G.line}`, background: on ? tint : 'transparent', color: '#2a0e1c', fontSize: 11, fontWeight: 900 }}>
                {on ? (kind === 'winner' ? '♛' : '▾') : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Locked episode summary ────────────────────────────────────────────────────
function LockedEpisodeSummary({ playerId, episode, episodePicks, results, contestants, narrow }: {
  playerId: string; episode: number; episodePicks: EpisodePick[];
  results: EpisodeResult[]; contestants: Contestant[]; narrow: boolean;
}) {
  const myPicks = episodePicks.filter(p => p.fantasy_player_id === playerId && p.episode_number === episode);
  const winnerPicks = myPicks.filter(p => p.pick_type === 'winner');
  const loserPicks  = myPicks.filter(p => p.pick_type === 'loser');
  const contestantName = (id: string) => contestants.find(c => c.id === id)?.name ?? '—';

  if (myPicks.length === 0) {
    return <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: G.muted, fontStyle: 'italic', padding: '4px 0' }}>No picks were submitted for this episode.</p>;
  }

  return (
    <div>
      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11.5, color: G.muted, background: 'rgba(0,0,0,.2)', border: `1px solid ${G.line}`, borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
        The results are in — picks are locked for Episode {episode}.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: narrow ? 16 : 20 }}>
        <LockedPickGroup label="Picked to slay" picks={winnerPicks} results={results} episode={episode} contestantName={contestantName} type="winner" />
        <LockedPickGroup label="Picked to flop" picks={loserPicks}  results={results} episode={episode} contestantName={contestantName} type="loser" />
      </div>
    </div>
  );
}

function LockedPickGroup({ label, picks, results, episode, contestantName, type }: {
  label: string; picks: EpisodePick[]; results: EpisodeResult[];
  episode: number; contestantName: (id: string) => string; type: 'winner' | 'loser';
}) {
  return (
    <div>
      <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 12, color: type === 'winner' ? G.gold : G.pinkSoft, marginBottom: 8 }}>{label}</div>
      {picks.length === 0 ? (
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: G.muted, fontStyle: 'italic' }}>—</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {picks.map(pick => {
            const result = results.find(r => r.contestant_id === pick.contestant_id && r.episode_number === episode);
            const pts = result ? (type === 'winner' ? WINNER_PICK_POINTS[result.placement] : LOSER_PICK_POINTS[result.placement]) : 0;
            return (
              <div key={pick.id} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(0,0,0,.2)', border: `1px solid ${G.line}`, borderRadius: 12, padding: '8px 11px' }}>
                <GlamHead size={28} ring={G.purple} name={contestantName(pick.contestant_id)} mono="" />
                <span style={{ flex: 1, fontFamily: 'Outfit, sans-serif', fontSize: 13, color: G.cream, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contestantName(pick.contestant_id)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <PlacePill place={result?.placement ?? null} small />
                  <ScorePill pts={pts} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
