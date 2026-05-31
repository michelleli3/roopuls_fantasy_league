import { useState } from 'react';
import { G, ACCENT, SEQUIN, PLACE_STYLE } from './tokens';
import type { EpisodeResult } from '../../types';

// ── GlamHead ──────────────────────────────────────────────────────────────────
export function GlamHead({ size = 96, ring = G.gold, name = '', glow = false, dim = false, avatarUrl = null, mono = 'QUEEN' }: {
  size?: number; ring?: string; name?: string; glow?: boolean; dim?: boolean;
  avatarUrl?: string | null; mono?: string;
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
            {mono && <div style={{ fontFamily: 'ui-monospace, monospace', color: G.muted, fontSize: Math.max(7, size * 0.075), letterSpacing: '.12em', marginTop: size * 0.06 }}>{mono}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Momentum ──────────────────────────────────────────────────────────────────
export function Momentum({ n, big = false }: { n: number; big?: boolean }) {
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

// ── PlacePill ─────────────────────────────────────────────────────────────────
export function PlacePill({ place, small = false }: { place: EpisodeResult['placement'] | null; small?: boolean }) {
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

// ── ScorePill ─────────────────────────────────────────────────────────────────
export function ScorePill({ pts }: { pts: number }) {
  const color = pts > 0 ? G.good : pts < 0 ? G.bad : G.muted;
  const bg    = pts > 0 ? 'rgba(91,227,155,.12)' : pts < 0 ? 'rgba(255,93,115,.12)' : 'rgba(169,143,196,.12)';
  return (
    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 11, color, background: bg, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {pts > 0 ? '+' : ''}{pts}
    </span>
  );
}

// ── GlamInput ─────────────────────────────────────────────────────────────────
export function GlamInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focus, setFocus] = useState(false);
  const { style, onFocus, onBlur, ...rest } = props;
  return (
    <input
      {...rest}
      onFocus={e => { setFocus(true); onFocus?.(e); }}
      onBlur={e => { setFocus(false); onBlur?.(e); }}
      style={{
        width: '100%', boxSizing: 'border-box', fontFamily: 'Outfit, sans-serif', fontSize: 14,
        color: G.cream, background: 'rgba(0,0,0,.25)', borderRadius: 12,
        border: `1px solid ${focus ? G.gold : G.line}`, padding: '12px 14px', outline: 'none',
        transition: 'border-color .18s', ...style,
      } as React.CSSProperties}
    />
  );
}

// ── GlamButton ────────────────────────────────────────────────────────────────
export function GlamButton({ children, style, disabled, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        all: 'unset' as const, boxSizing: 'border-box', textAlign: 'center',
        cursor: disabled ? 'default' : 'pointer',
        width: '100%', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 14, letterSpacing: '.02em',
        color: '#2a0e1c', background: ACCENT.foil, padding: '13px 16px', borderRadius: 12, whiteSpace: 'nowrap',
        opacity: disabled ? .5 : 1, boxShadow: `0 14px 30px -14px ${ACCENT.key}aa`, ...style,
      } as React.CSSProperties}
    >
      {children}
    </button>
  );
}

// ── Card / CardHead ───────────────────────────────────────────────────────────
export function Card({ children, danger, accentBorder, style }: {
  children: React.ReactNode; danger?: boolean; accentBorder?: string; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      background: G.ink2, borderRadius: 20,
      border: `1px solid ${danger ? 'rgba(255,93,115,.45)' : (accentBorder ?? G.line)}`,
      boxShadow: '0 24px 50px -34px rgba(0,0,0,.7)', overflow: 'hidden', ...style,
    }}>{children}</div>
  );
}

export function CardHead({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px 0' }}>
      <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '.16em', fontSize: 12, color: G.muted, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{children}</span>
      {right}
    </div>
  );
}
