import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePlayers } from '../../hooks/usePlayers';
import { useEpisodes } from '../../hooks/useEpisodes';
import { useContestants, useEpisodeResults } from '../../hooks/useContestants';
import { useSeasonPicks, useEpisodePicks } from '../../hooks/usePicks';
import {
  calculatePlayerTotal,
  scoreSeasonPick,
  scoreOneEpisode,
  WINNER_PICK_POINTS,
  LOSER_PICK_POINTS,
} from '../../utils/scoring';
import type { EpisodeResult, EpisodePick, Contestant } from '../../types';

// ── Tokens ────────────────────────────────────────────────────────────────────
const G = {
  ink: '#160a1e', ink2: '#221031', ink3: '#2c1640',
  line: 'rgba(255,210,63,0.16)',
  pink: '#ff2d92', pinkSoft: '#ff7ab8',
  gold: '#ffd23f', goldDeep: '#e8a93c',
  purple: '#9b5de5', cream: '#f6ecff', muted: '#a98fc4',
  good: '#5be39b', bad: '#ff5d73',
};

const ACCENT = {
  key: '#ffd23f',
  foil: 'linear-gradient(135deg,#fff3c4,#ffd23f 40%,#e8a93c 62%,#fff3c4)',
};

const SEQUIN = 'radial-gradient(circle at 30% 30%, rgba(255,45,146,.5), transparent 60%), radial-gradient(circle at 70% 65%, rgba(155,93,229,.5), transparent 60%)';

const PLACE_STYLE: Record<EpisodeResult['placement'], { bg: string; fg: string }> = {
  WINNER: { bg: 'rgba(255,210,63,.18)',  fg: '#ffd23f' },
  WIN:    { bg: 'rgba(255,45,146,.18)',  fg: '#ff7ab8' },
  HIGH:   { bg: 'rgba(155,93,229,.22)',  fg: '#c4a0ff' },
  SAFE:   { bg: 'rgba(169,143,196,.16)', fg: '#a98fc4' },
  LOW:    { bg: 'rgba(232,169,60,.16)',  fg: '#e8a93c' },
  BTM2:   { bg: 'rgba(255,93,115,.16)',  fg: '#ff8a98' },
  ELIM:   { bg: 'rgba(255,93,115,.26)',  fg: '#ff5d73' },
};

const METAL: Record<1 | 2 | 3, string> = { 1: ACCENT.key, 2: '#d9d9e3', 3: '#cd9b6a' };
const PEDESTAL_H: Record<1 | 2 | 3, number> = { 1: 215, 2: 166, 3: 140 };
const HEAD_SIZE_DESKTOP: Record<1 | 2 | 3, number> = { 1: 124, 2: 88, 3: 76 };
const HEAD_SIZE_NARROW: Record<1 | 2 | 3, number> = { 1: 96, 2: 72, 3: 64 };

// ── Types ─────────────────────────────────────────────────────────────────────
interface PlayerRow {
  id: string;
  name: string;
  rank: number;
  total: number;
  week: number;
  delta: number;
  streak: number;
  queen: string;
  queenAlive: boolean;
  queenPlace: EpisodeResult['placement'] | null;
  repicks: number;
  seasonPts: number;
  avatarUrl: string | null;
}

interface PickResult {
  name: string;
  place: EpisodeResult['placement'] | null;
  pts: number;
}

interface EpBreakdown {
  ep: number;
  pts: number;
  winners: PickResult[];
  losers: PickResult[];
}

// ── Responsive hook ───────────────────────────────────────────────────────────
function useNarrow() {
  const [narrow, setNarrow] = useState(
    typeof window !== 'undefined' && window.innerWidth < 760
  );
  useEffect(() => {
    const fn = () => setNarrow(window.innerWidth < 760);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return narrow;
}

// ── Primitives ────────────────────────────────────────────────────────────────
function GlamHead({ size = 96, ring = G.gold, name = '', glow = false, dim = false, avatarUrl = null }: {
  size?: number; ring?: string; name?: string; glow?: boolean; dim?: boolean; avatarUrl?: string | null;
}) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('');
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, padding: 3,
      background: `linear-gradient(135deg, ${ring}, ${G.pink})`,
      filter: dim ? 'grayscale(.5)' : 'none',
      boxShadow: glow ? '0 0 0 4px rgba(255,45,146,.12), 0 18px 40px -12px rgba(255,45,146,.55)' : 'none',
    }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
          position: 'relative', display: 'grid', placeItems: 'center',
          background: `repeating-linear-gradient(45deg, ${G.ink2} 0 8px, ${G.ink3} 8px 16px)`,
        }}>
          <div style={{ position: 'absolute', inset: 0, background: SEQUIN, opacity: .5 }} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Bodoni Moda, serif', fontWeight: 700, color: G.cream, fontSize: size * 0.3, lineHeight: 1 }}>{initials}</div>
            <div style={{ fontFamily: 'ui-monospace, monospace', color: G.muted, fontSize: Math.max(7, size * 0.075), letterSpacing: '.12em', marginTop: size * 0.06 }}>QUEEN</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Momentum({ n, big = false }: { n: number; big?: boolean }) {
  const up = n >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: big ? 6 : 4,
      fontFamily: 'Outfit, sans-serif', fontWeight: 800, whiteSpace: 'nowrap',
      fontSize: big ? 22 : 13, lineHeight: 1,
      color: up ? G.good : G.bad,
      background: up ? 'rgba(91,227,155,.12)' : 'rgba(255,93,115,.12)',
      border: `1px solid ${up ? 'rgba(91,227,155,.4)' : 'rgba(255,93,115,.4)'}`,
      padding: big ? '7px 12px' : '3px 8px', borderRadius: 999,
    }}>
      <span style={{ fontSize: big ? 16 : 11 }}>{up ? '▲' : '▼'}</span>
      {up ? '+' : ''}{n}
      <span style={{ opacity: .6, fontWeight: 600, fontSize: big ? 12 : 10 }}>pts</span>
    </span>
  );
}

function PlacePill({ place, small = false }: { place: EpisodeResult['placement'] | null; small?: boolean }) {
  if (!place) return null;
  const s = PLACE_STYLE[place];
  return (
    <span style={{
      fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '.08em',
      fontSize: small ? 10 : 11, color: s.fg, background: s.bg,
      padding: small ? '2px 7px' : '3px 9px', borderRadius: 999, whiteSpace: 'nowrap',
    }}>{place}</span>
  );
}

function ScorePill({ pts }: { pts: number }) {
  const color = pts > 0 ? G.good : pts < 0 ? G.bad : G.muted;
  const bg    = pts > 0 ? 'rgba(91,227,155,.12)' : pts < 0 ? 'rgba(255,93,115,.12)' : 'rgba(169,143,196,.12)';
  return (
    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 11, color, background: bg, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {pts > 0 ? '+' : ''}{pts}
    </span>
  );
}

function MoveArrow({ delta }: { delta: number }) {
  if (!delta) return <span style={{ width: 14, color: G.muted, fontSize: 11, textAlign: 'center', flexShrink: 0 }}>—</span>;
  const up = delta > 0;
  return (
    <span style={{ width: 14, textAlign: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0, color: up ? G.good : G.bad, fontFamily: 'Outfit' }}>
      {up ? '▲' : '▼'}{Math.abs(delta)}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '.22em', fontSize: 11, color: G.muted, textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  );
}

// ── Breakdown panel ───────────────────────────────────────────────────────────
function BreakdownPanel({ player, narrow, episodePicks, results, contestants, episodeNames }: {
  player: PlayerRow;
  narrow: boolean;
  episodePicks: EpisodePick[];
  results: EpisodeResult[];
  contestants: Contestant[];
  episodeNames: Record<number, string>;
}) {
  const doneEpisodes = new Set(results.map(r => r.episode_number));
  const myPicks = episodePicks.filter(p => p.fantasy_player_id === player.id);
  const eps = [...new Set(myPicks.map(p => p.episode_number))]
    .filter(ep => doneEpisodes.has(ep))
    .sort((a, b) => b - a);

  const breakdowns: EpBreakdown[] = eps.map(ep => {
    const epPicks = myPicks.filter(p => p.episode_number === ep);
    const mkResults = (type: 'winner' | 'loser'): PickResult[] =>
      epPicks.filter(p => p.pick_type === type).map(p => {
        const c = contestants.find(c => c.id === p.contestant_id);
        const result = results.find(r => r.contestant_id === p.contestant_id && r.episode_number === ep);
        const pts = result
          ? (type === 'winner' ? WINNER_PICK_POINTS[result.placement] : LOSER_PICK_POINTS[result.placement])
          : 0;
        return { name: c?.name ?? '—', place: result?.placement ?? null, pts };
      });
    const winners = mkResults('winner');
    const losers  = mkResults('loser');
    return { ep, pts: [...winners, ...losers].reduce((s, p) => s + p.pts, 0), winners, losers };
  }).filter(ep => ep.winners.length > 0 || ep.losers.length > 0);

  return (
    <div style={{ background: 'rgba(0,0,0,.22)', borderTop: `1px solid ${G.line}`, padding: narrow ? '16px 16px 20px' : '20px 26px 26px' }}>
      {/* Season queen */}
      <SectionLabel>Season Queen</SectionLabel>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        background: G.ink2, border: `1px solid ${G.line}`, borderRadius: 14,
        padding: '12px 16px', marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <GlamHead size={40} ring={G.purple} name={player.queen} dim={!player.queenAlive} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'Bodoni Moda, serif', fontWeight: 700, color: G.cream, fontSize: 16 }}>{player.queen}</div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: G.muted }}>
              {player.queenAlive ? 'still in the running' : 'eliminated'}
              {player.repicks > 0 && (
                <span style={{ color: G.bad }}> · {player.repicks} re-{player.repicks > 1 ? 'snatches' : 'snatch'}</span>
              )}
            </div>
          </div>
        </div>
        <ScorePill pts={player.seasonPts} />
      </div>

      {/* Episode picks */}
      <SectionLabel>Episode Picks</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {breakdowns.length === 0 && (
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: G.muted, fontStyle: 'italic' }}>
            No tea, no shade — no picks yet.
          </div>
        )}
        {breakdowns.map(ep => (
          <div key={ep.ep} style={{ background: G.ink2, border: `1px solid ${G.line}`, borderRadius: 14, padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                <span style={{ fontFamily: 'Bodoni Moda, serif', fontWeight: 700, color: G.cream, fontSize: 15, flexShrink: 0 }}>Ep {ep.ep}</span>
                {episodeNames[ep.ep] && (
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: G.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{episodeNames[ep.ep]}</span>
                )}
              </div>
              <ScorePill pts={ep.pts} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: narrow ? 10 : 18 }}>
              <PickCol label="Picked to slay" picks={ep.winners} />
              <PickCol label="Picked to flop" picks={ep.losers} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PickCol({ label, picks }: { label: string; picks: PickResult[] }) {
  return (
    <div style={{ opacity: picks.length === 0 ? .5 : 1 }}>
      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: G.pinkSoft, marginBottom: 6 }}>{label}</div>
      {picks.length === 0 ? (
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: G.muted, fontStyle: 'italic' }}>—</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {picks.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: G.cream, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <PlacePill place={p.place} small />
                <ScorePill pts={p.pts} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Podium ────────────────────────────────────────────────────────────────────
function Podium({ rows, narrow, expandedId, onToggle, episodePicks, results, contestants, episodeNames }: {
  rows: PlayerRow[];
  narrow: boolean;
  expandedId: string | null;
  onToggle: (id: string) => void;
  episodePicks: EpisodePick[];
  results: EpisodeResult[];
  contestants: Contestant[];
  episodeNames: Record<number, string>;
}) {
  const top3 = rows.slice(0, 3) as [PlayerRow, PlayerRow?, PlayerRow?];
  const order = narrow
    ? top3.filter(Boolean) as PlayerRow[]
    : ([top3[1], top3[0], top3[2]].filter(Boolean) as PlayerRow[]);

  const expandedTop = !narrow ? top3.find(p => p && p.id === expandedId) : undefined;

  return (
    <>
      <div style={{
        display: 'flex', justifyContent: 'center',
        alignItems: narrow ? 'stretch' : 'flex-end',
        flexDirection: narrow ? 'column' : 'row',
        gap: narrow ? 12 : 22,
        padding: narrow ? '4px 16px 22px' : '16px 26px 36px',
      }}>
        {order.map(p => {
          const rank = p.rank as 1 | 2 | 3;
          const isKing = rank === 1;
          const open = expandedId === p.id;
          const metal = METAL[rank];
          const headSize = narrow ? HEAD_SIZE_NARROW[rank] : HEAD_SIZE_DESKTOP[rank];

          return (
            <button key={p.id} onClick={() => onToggle(p.id)} style={{
              all: 'unset' as const, cursor: 'pointer',
              display: 'flex', flexDirection: narrow ? 'row' : 'column',
              alignItems: 'center', gap: narrow ? 14 : 0,
              width: narrow ? '100%' : 260,
              background: narrow ? (open ? G.ink2 : 'transparent') : 'transparent',
              borderRadius: 16,
              border: narrow ? `1px solid ${open ? G.line : 'transparent'}` : 'none',
              padding: narrow ? '10px 12px' : '0',
            }}>
              {!narrow && isKing && (
                <div style={{ fontSize: 34, marginBottom: 2, filter: `drop-shadow(0 4px 10px ${ACCENT.key}99)` }}>♛</div>
              )}
              <div style={{ position: 'relative' }}>
                {narrow && isKing && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 24, zIndex: 2 }}>♛</div>
                )}
                <GlamHead size={headSize} ring={metal} name={p.name} glow={isKing} dim={!p.queenAlive} avatarUrl={p.avatarUrl} />
              </div>
              <div style={{ textAlign: narrow ? 'left' : 'center', flex: narrow ? '1' : 'none', minWidth: 0 }}>
                <div style={{ fontFamily: 'Bodoni Moda, serif', fontWeight: 700, color: G.cream, fontSize: narrow ? 20 : 22, marginTop: narrow ? 0 : 12 }}>{p.name}</div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: G.muted, marginTop: 1, whiteSpace: 'nowrap' }}>picked {p.queen}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: narrow ? 'flex-start' : 'center', alignItems: 'center' }}>
                  <Momentum n={p.week} />
                  {narrow && <span style={{ fontFamily: 'Bodoni Moda, serif', fontWeight: 700, color: ACCENT.key, fontSize: 22 }}>{p.total}</span>}
                </div>
              </div>
              {!narrow && (
                <div style={{
                  width: '100%', height: PEDESTAL_H[rank], marginTop: 14,
                  borderRadius: '10px 10px 0 0',
                  background: `linear-gradient(180deg, ${G.ink2}, ${G.ink})`,
                  border: `1px solid ${G.line}`, borderBottom: 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0 12px',
                  boxShadow: isKing ? `0 -10px 50px -20px ${ACCENT.key}99` : 'none',
                  outline: open ? `1px solid ${ACCENT.key}` : 'none',
                }}>
                  <div style={{
                    fontFamily: 'Bodoni Moda, serif', fontWeight: 700,
                    fontSize: isKing ? 54 : 40,
                    background: isKing ? ACCENT.foil : 'none',
                    WebkitBackgroundClip: isKing ? 'text' : 'initial',
                    backgroundClip: isKing ? 'text' : 'initial',
                    color: isKing ? 'transparent' : metal,
                  }}>{p.rank}</div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, color: G.cream, fontSize: isKing ? 28 : 24, whiteSpace: 'nowrap' }}>
                    {p.total}<span style={{ fontSize: 12, color: G.muted, fontWeight: 600 }}> pts</span>
                  </div>
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                    <PlacePill place={p.queenPlace} small />
                    <span style={{ fontFamily: 'Outfit', fontSize: 10, color: G.muted, letterSpacing: '.03em', whiteSpace: 'nowrap' }}>
                      {open ? 'shut the library' : 'read her receipts'}{' '}
                      <span style={{ display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}>▾</span>
                    </span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop expanded top-3 panel */}
      {!narrow && expandedTop && (
        <div style={{ margin: '0 26px 30px', borderRadius: 18, overflow: 'hidden', border: `1px solid ${ACCENT.key}66`, background: G.ink2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', borderBottom: `1px solid ${G.line}` }}>
            <span style={{ fontFamily: 'Bodoni Moda, serif', fontWeight: 700, fontSize: 22, color: ACCENT.key }}>#{expandedTop.rank}</span>
            <span style={{ fontFamily: 'Bodoni Moda, serif', fontWeight: 700, fontSize: 20, color: G.cream, flex: 1 }}>{expandedTop.name}</span>
            <button onClick={() => onToggle(expandedTop.id)} style={{ all: 'unset' as const, cursor: 'pointer', fontFamily: 'Outfit', fontSize: 12, color: G.muted }}>
              shut the library ✕
            </button>
          </div>
          <BreakdownPanel player={expandedTop} narrow={false} episodePicks={episodePicks} results={results} contestants={contestants} episodeNames={episodeNames} />
        </div>
      )}
    </>
  );
}

// ── Rank row ──────────────────────────────────────────────────────────────────
function RankRow({ p, narrow, open, onToggle, episodePicks, results, contestants, episodeNames }: {
  p: PlayerRow; narrow: boolean; open: boolean; onToggle: (id: string) => void;
  episodePicks: EpisodePick[]; results: EpisodeResult[]; contestants: Contestant[];
  episodeNames: Record<number, string>;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      border: `1px solid ${open ? ACCENT.key + '66' : G.line}`,
      background: p.queenAlive ? G.ink2 : 'rgba(34,16,49,.55)',
      opacity: p.queenAlive ? 1 : .9,
      transition: 'border-color .2s',
    }}>
      <button
        onClick={() => onToggle(p.id)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          all: 'unset' as const, cursor: 'pointer', width: '100%', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', gap: narrow ? 12 : 16,
          padding: narrow ? '12px 14px' : '14px 22px',
          background: hover ? 'rgba(255,255,255,.03)' : 'transparent',
        }}
      >
        <div style={{ fontFamily: 'Bodoni Moda, serif', fontWeight: 700, fontSize: narrow ? 22 : 28, color: G.muted, width: narrow ? 26 : 38, textAlign: 'center', flexShrink: 0 }}>{p.rank}</div>
        <MoveArrow delta={p.delta} />
        <GlamHead size={narrow ? 46 : 54} ring={G.purple} name={p.name} dim={!p.queenAlive} avatarUrl={p.avatarUrl} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, color: G.cream, fontSize: narrow ? 16 : 19 }}>{p.name}</span>
            {!p.queenAlive && (
              <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 10, letterSpacing: '.1em', color: G.bad, background: 'rgba(255,93,115,.12)', padding: '2px 7px', borderRadius: 999 }}>
                SASHAYED
              </span>
            )}
            {p.streak >= 2 && <span style={{ fontSize: 12 }}>🔥{p.streak}</span>}
          </div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: narrow ? 11 : 12.5, color: G.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.queen} · {p.queenAlive ? 'still in' : 'her queen sashayed'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: narrow ? 8 : 14, flexShrink: 0 }}>
          {!narrow && <PlacePill place={p.queenPlace} />}
          <Momentum n={p.week} />
          <div style={{ fontFamily: 'Bodoni Moda, serif', fontWeight: 700, color: ACCENT.key, fontSize: narrow ? 22 : 28, width: narrow ? 42 : 56, textAlign: 'right' }}>{p.total}</div>
          <span style={{ color: G.muted, fontSize: 14, display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}>▾</span>
        </div>
      </button>
      {open && <BreakdownPanel player={p} narrow={narrow} episodePicks={episodePicks} results={results} contestants={contestants} episodeNames={episodeNames} />}
    </div>
  );
}

function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(data.session?.user.app_metadata.is_admin === true);
    });
  }, []);
  return isAdmin;
}

// ── Header ────────────────────────────────────────────────────────────────────
function ScoreboardHeader({ currentEpisode, currentEpisodeName, narrow }: {
  currentEpisode: number; currentEpisodeName: string; narrow: boolean;
}) {
  const isAdmin = useIsAdmin();
  const nextEpisode = currentEpisode + 1;
  const epLabel = currentEpisodeName
    ? `Ep ${currentEpisode}: ${currentEpisodeName}`
    : `Episode ${currentEpisode}`;
  const eyebrow = currentEpisode > 0
    ? `Season 18 · ${epLabel} complete · Episode ${nextEpisode} up next`
    : `Season 18 · Episode ${nextEpisode} coming up`;
  return (
    <div style={{
      textAlign: 'center', padding: narrow ? '26px 18px 18px' : '36px 28px 26px',
      position: 'relative', overflow: 'hidden',
      background: `radial-gradient(120% 90% at 50% -10%, ${ACCENT.key}22, transparent 60%)`,
    }}>
      <div style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '.4em', fontSize: 11, fontWeight: 700, color: G.muted, textTransform: 'uppercase' }}>
        {eyebrow}
      </div>
      <h1 style={{ margin: '10px 0 6px', fontFamily: 'Bodoni Moda, serif', fontWeight: 700, lineHeight: .95, fontSize: narrow ? 34 : 46, color: G.cream }}>
        Category Is:{' '}
        <span style={{ background: ACCENT.foil, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
          Leaderboard Realness
        </span>
      </h1>
      <div style={{ fontFamily: 'Pinyon Script, cursive', fontSize: narrow ? 26 : 30, color: G.pinkSoft, lineHeight: 1 }}>
        Roopul's Fantasy League
      </div>
      <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
        {isAdmin && (
          <Link to="/admin" style={{
            fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: 700,
            color: G.muted, background: 'rgba(169,143,196,.12)',
            border: '1px solid rgba(169,143,196,.3)',
            padding: '6px 14px', borderRadius: 999,
            textDecoration: 'none', whiteSpace: 'nowrap', letterSpacing: '.03em',
          }}>
            Admin
          </Link>
        )}
        <Link to="/picks" style={{
          fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: 700,
          color: G.cream, background: `${ACCENT.key}22`,
          border: `1px solid ${ACCENT.key}44`,
          padding: '6px 14px', borderRadius: 999,
          textDecoration: 'none', whiteSpace: 'nowrap', letterSpacing: '.03em',
        }}>
          Make Picks →
        </Link>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PlayerView() {
  const { data: players = [], isLoading } = usePlayers();
  const { data: contestants = [] } = useContestants();
  const { data: results = [] } = useEpisodeResults();
  const { data: seasonPicks = [] } = useSeasonPicks();
  const { data: episodePicks = [] } = useEpisodePicks();
  const { data: episodesList = [] } = useEpisodes();

  const episodeNames = Object.fromEntries(episodesList.map(e => [e.episode_number, e.name]));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const narrow = useNarrow();

  const currentEpisode = results.length > 0 ? Math.max(...results.map(r => r.episode_number)) : 0;

  const withTotals = players.map(p => {
    const sp = seasonPicks.find(s => s.fantasy_player_id === p.id);
    const total = calculatePlayerTotal(p.id, sp, episodePicks, results);
    const week = currentEpisode > 0 ? scoreOneEpisode(p.id, currentEpisode, episodePicks, results) : 0;
    const queen = contestants.find(c => c.id === sp?.contestant_id);
    const queenPlace = queen
      ? results.find(r => r.contestant_id === queen.id && r.episode_number === currentEpisode)?.placement ?? null
      : null;
    let streak = 0;
    for (let ep = currentEpisode; ep >= 1; ep--) {
      if (scoreOneEpisode(p.id, ep, episodePicks, results) > 0) streak++;
      else break;
    }
    return {
      id: p.id, name: p.name, total, week, prevTotal: total - week,
      queen: queen?.name ?? '—', queenAlive: queen?.active ?? false,
      queenPlace, repicks: sp?.repick_count ?? 0,
      seasonPts: sp ? scoreSeasonPick(sp, results) : 0, streak,
      avatarUrl: p.avatar_url ?? null,
    };
  });

  const sorted     = [...withTotals].sort((a, b) => b.total - a.total || b.week - a.week);
  const prevSorted = [...withTotals].sort((a, b) => b.prevTotal - a.prevTotal);
  const prevRank   = Object.fromEntries(prevSorted.map((p, i) => [p.id, i + 1]));

  const rows: PlayerRow[] = sorted.map((p, i) => ({
    ...p, rank: i + 1, delta: (prevRank[p.id] ?? i + 1) - (i + 1),
  }));

  const toggle = (id: string) => setExpandedId(cur => cur === id ? null : id);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: G.ink, color: G.muted, fontFamily: 'Outfit, sans-serif', fontSize: 14 }}>
        Loading standings…
      </div>
    );
  }

  return (
    <div style={{
      background: G.ink, color: G.cream, minHeight: '100vh',
      backgroundImage: `radial-gradient(80% 50% at 50% 0%, ${G.purple}28, transparent 70%)`,
      fontFamily: 'Outfit, sans-serif',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <ScoreboardHeader currentEpisode={currentEpisode} currentEpisodeName={episodeNames[currentEpisode] ?? ''} narrow={narrow} />

        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', color: G.muted, padding: '60px 0', fontFamily: 'Outfit' }}>
            No queens have entered the werk room.
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginTop: -6, marginBottom: 2 }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: G.muted, letterSpacing: '.06em' }}>the top three, serving</span>
            </div>

            <Podium
              rows={rows} narrow={narrow} expandedId={expandedId} onToggle={toggle}
              episodePicks={episodePicks} results={results} contestants={contestants}
              episodeNames={episodeNames}
            />

            {/* Divider */}
            <div style={{ padding: narrow ? '0 16px 14px' : '0 26px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ height: 1, flex: 1, background: G.line }} />
              <div style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '.3em', fontSize: 11, fontWeight: 700, color: G.muted, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                The Rest Of The Girls
              </div>
              <div style={{ height: 1, flex: 1, background: G.line }} />
            </div>

            {/* Ranked rows — all players on mobile, #4+ on desktop */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: narrow ? '0 16px 36px' : '0 26px 40px' }}>
              {rows.slice(3).map(p => (
                <RankRow
                  key={p.id} p={p} narrow={narrow} open={expandedId === p.id} onToggle={toggle}
                  episodePicks={episodePicks} results={results} contestants={contestants}
                  episodeNames={episodeNames}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
