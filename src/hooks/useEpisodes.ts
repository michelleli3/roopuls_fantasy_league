import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEpisodes, upsertEpisodeName } from '../api/episodes';

export function useEpisodes() {
  return useQuery({ queryKey: ['episodes'], queryFn: getEpisodes });
}

export function useUpsertEpisodeName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ episode_number, name }: { episode_number: number; name: string }) =>
      upsertEpisodeName(episode_number, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['episodes'] }),
  });
}
