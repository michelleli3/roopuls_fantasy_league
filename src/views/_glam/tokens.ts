import type { EpisodeResult } from '../../types';

export const G = {
  ink:  '#160a1e', ink2: '#221031', ink3: '#2c1640',
  line: 'rgba(255,210,63,0.16)',
  pink: '#ff2d92', pinkSoft: '#ff7ab8',
  gold: '#ffd23f', goldDeep: '#e8a93c',
  purple: '#9b5de5', cream: '#f6ecff', muted: '#a98fc4',
  good: '#5be39b', bad: '#ff5d73',
};

export const ACCENT = {
  key:  '#ffd23f',
  foil: 'linear-gradient(135deg,#fff3c4,#ffd23f 40%,#e8a93c 62%,#fff3c4)',
};

export const SEQUIN = 'radial-gradient(circle at 30% 30%, rgba(255,45,146,.5), transparent 60%), radial-gradient(circle at 70% 65%, rgba(155,93,229,.5), transparent 60%)';

export const PLACE_STYLE: Record<EpisodeResult['placement'], { bg: string; fg: string }> = {
  WINNER: { bg: 'rgba(255,210,63,.18)',  fg: '#ffd23f' },
  WIN:    { bg: 'rgba(255,45,146,.18)',  fg: '#ff7ab8' },
  HIGH:   { bg: 'rgba(155,93,229,.22)',  fg: '#c4a0ff' },
  SAFE:   { bg: 'rgba(169,143,196,.16)', fg: '#a98fc4' },
  LOW:    { bg: 'rgba(232,169,60,.16)',  fg: '#e8a93c' },
  BTM2:   { bg: 'rgba(255,93,115,.16)',  fg: '#ff8a98' },
  ELIM:   { bg: 'rgba(255,93,115,.26)',  fg: '#ff5d73' },
};
