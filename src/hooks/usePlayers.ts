import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPlayers,
  getPlayerByUserId,
  getPlayerByEmail,
  addPlayer,
  updatePlayer,
  uploadPlayerAvatar,
  getFantasyTeams,
  assignContestant,
  removeContestantFromTeam,
} from '../api/players';

export function usePlayers() {
  return useQuery({ queryKey: ['fantasy_players'], queryFn: getPlayers });
}

export function usePlayerByUserId(userId: string | null) {
  return useQuery({
    queryKey: ['player_by_user_id', userId],
    queryFn: () => getPlayerByUserId(userId!),
    enabled: !!userId,
  });
}

export function useFantasyTeams() {
  return useQuery({ queryKey: ['fantasy_team'], queryFn: getFantasyTeams });
}

export function usePlayerByEmail(email: string | null) {
  return useQuery({
    queryKey: ['player_by_email', email],
    queryFn: () => getPlayerByEmail(email!),
    enabled: !!email,
  });
}

export function useAddPlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, email }: { name: string; email: string }) => addPlayer(name, email),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fantasy_players'] }),
  });
}

export function useUpdatePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updatePlayer>[1] }) =>
      updatePlayer(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fantasy_players'] }),
  });
}

export function useUploadPlayerAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ playerId, file }: { playerId: string; file: File }) =>
      uploadPlayerAvatar(playerId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fantasy_players'] });
      qc.invalidateQueries({ queryKey: ['player_by_user_id'] });
    },
  });
}

export function useAssignContestant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fantasy_player_id, contestant_id }: { fantasy_player_id: string; contestant_id: string }) =>
      assignContestant(fantasy_player_id, contestant_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fantasy_team'] }),
  });
}

export function useRemoveContestantFromTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeContestantFromTeam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fantasy_team'] }),
  });
}
