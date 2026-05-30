export interface Contestant {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface EpisodeResult {
  id: string;
  contestant_id: string;
  episode_number: number;
  placement: 'WIN' | 'HIGH' | 'SAFE' | 'LOW' | 'BTM2' | 'ELIM' | 'WINNER';
  lip_synced: boolean;
  challenge_win: boolean;
}

export interface FantasyPlayer {
  id: string;
  name: string;
  created_at: string;
}

export interface FantasyTeam {
  id: string;
  fantasy_player_id: string;
  contestant_id: string;
}
