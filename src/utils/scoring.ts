import type { EpisodeResult, EpisodePick, SeasonPick } from '../types';

export const WINNER_PICK_POINTS: Record<EpisodeResult['placement'], number> = {
  WINNER: 8,
  WIN:    8,
  HIGH:   4,
  SAFE:   0,
  LOW:   -2,
  BTM2:  -2,
  ELIM:  -4,
};

export const LOSER_PICK_POINTS: Record<EpisodeResult['placement'], number> = {
  ELIM:   8,
  BTM2:   4,
  LOW:    4,
  SAFE:   0,
  HIGH:  -2,
  WIN:   -2,
  WINNER: -4,
};

export const SEASON_WINNER_POINTS   = 30;
export const SEASON_RUNNERUP_POINTS = 15;
export const REPICK_PENALTY         = -5;
export const MAX_WINNER_PICKS       = 3;
export const MAX_LOSER_PICKS        = 3;

function finaleEpisode(results: EpisodeResult[]): number | null {
  const ep = results.find(r => r.placement === 'WINNER')?.episode_number;
  return ep ?? null;
}

export function scoreSeasonPick(
  pick: SeasonPick,
  results: EpisodeResult[]
): number {
  let total = pick.repick_count * REPICK_PENALTY;

  const finale = finaleEpisode(results);
  const contestantResults = results.filter(r => r.contestant_id === pick.contestant_id);

  for (const r of contestantResults) {
    if (r.placement === 'WINNER') {
      total += SEASON_WINNER_POINTS;
    } else if (finale !== null && r.episode_number === finale && r.placement === 'HIGH') {
      // Runner-up: HIGH placement in the finale episode
      total += SEASON_RUNNERUP_POINTS;
    }
  }

  return total;
}

export function scoreEpisodePicks(
  fantasyPlayerId: string,
  episodePicks: EpisodePick[],
  results: EpisodeResult[]
): number {
  const playerPicks = episodePicks.filter(p => p.fantasy_player_id === fantasyPlayerId);
  let total = 0;

  for (const pick of playerPicks) {
    const result = results.find(
      r => r.contestant_id === pick.contestant_id && r.episode_number === pick.episode_number
    );
    if (!result) continue;

    total += pick.pick_type === 'winner'
      ? WINNER_PICK_POINTS[result.placement]
      : LOSER_PICK_POINTS[result.placement];
  }

  return total;
}

export function calculatePlayerTotal(
  fantasyPlayerId: string,
  seasonPick: SeasonPick | undefined,
  episodePicks: EpisodePick[],
  results: EpisodeResult[]
): number {
  const season  = seasonPick ? scoreSeasonPick(seasonPick, results) : 0;
  const episode = scoreEpisodePicks(fantasyPlayerId, episodePicks, results);
  return season + episode;
}
