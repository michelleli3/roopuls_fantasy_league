import type { EpisodeResult } from '../types';

// Scoring rules TBD — point values will be updated once confirmed
export const POINT_VALUES: Record<EpisodeResult['placement'], number> = {
  WINNER: 0,
  WIN: 0,
  HIGH: 0,
  SAFE: 0,
  LOW: 0,
  BTM2: 0,
  ELIM: 0,
};

export const LIP_SYNC_BONUS = 0;
export const CHALLENGE_WIN_BONUS = 0;

export function scoreContestant(results: EpisodeResult[]): number {
  return results.reduce((total, result) => {
    let points = POINT_VALUES[result.placement];
    if (result.lip_synced) points += LIP_SYNC_BONUS;
    if (result.challenge_win) points += CHALLENGE_WIN_BONUS;
    return total + points;
  }, 0);
}
