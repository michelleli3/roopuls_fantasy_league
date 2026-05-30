import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getContestants,
  addContestant,
  updateContestant,
  getEpisodeResults,
  addEpisodeResult,
  updateEpisodeResult,
  deleteEpisodeResult,
} from '../api/contestants';
import type { EpisodeResult } from '../types';

export function useContestants() {
  return useQuery({ queryKey: ['contestants'], queryFn: getContestants });
}

export function useEpisodeResults() {
  return useQuery({ queryKey: ['episode_results'], queryFn: getEpisodeResults });
}

export function useAddContestant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => addContestant(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contestants'] }),
  });
}

export function useUpdateContestant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateContestant>[1] }) =>
      updateContestant(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contestants'] }),
  });
}

export function useAddEpisodeResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (result: Omit<EpisodeResult, 'id'>) => addEpisodeResult(result),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['episode_results'] }),
  });
}

export function useUpdateEpisodeResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateEpisodeResult>[1] }) =>
      updateEpisodeResult(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['episode_results'] }),
  });
}

export function useDeleteEpisodeResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEpisodeResult(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['episode_results'] }),
  });
}
