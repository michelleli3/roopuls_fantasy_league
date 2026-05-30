import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSeasonPicks, upsertSeasonPick, getEpisodePicks, addEpisodePick, removeEpisodePick } from '../api/picks';
import type { EpisodePick } from '../types';

export function useSeasonPicks() {
  return useQuery({ queryKey: ['season_picks'], queryFn: getSeasonPicks });
}

export function useEpisodePicks() {
  return useQuery({ queryKey: ['episode_picks'], queryFn: getEpisodePicks });
}

export function useUpsertSeasonPick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fantasy_player_id, contestant_id, repick_count }: {
      fantasy_player_id: string;
      contestant_id: string;
      repick_count: number;
    }) => upsertSeasonPick(fantasy_player_id, contestant_id, repick_count),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['season_picks'] }),
  });
}

export function useAddEpisodePick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pick: Omit<EpisodePick, 'id'>) => addEpisodePick(pick),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['episode_picks'] }),
  });
}

export function useRemoveEpisodePick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeEpisodePick(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['episode_picks'] }),
  });
}
