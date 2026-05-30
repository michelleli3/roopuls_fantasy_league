import { supabase } from '../lib/supabase';
import type { FantasyPlayer, FantasyTeam } from '../types';

export async function getPlayers(): Promise<FantasyPlayer[]> {
  const { data, error } = await supabase
    .from('fantasy_players')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

export async function addPlayer(name: string): Promise<FantasyPlayer> {
  const { data, error } = await supabase
    .from('fantasy_players')
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlayer(
  id: string,
  updates: Partial<Pick<FantasyPlayer, 'name'>>
): Promise<FantasyPlayer> {
  const { data, error } = await supabase
    .from('fantasy_players')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getFantasyTeams(): Promise<FantasyTeam[]> {
  const { data, error } = await supabase
    .from('fantasy_team')
    .select('*');
  if (error) throw error;
  return data;
}

export async function assignContestant(
  fantasy_player_id: string,
  contestant_id: string
): Promise<FantasyTeam> {
  const { data, error } = await supabase
    .from('fantasy_team')
    .insert({ fantasy_player_id, contestant_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeContestantFromTeam(id: string): Promise<void> {
  const { error } = await supabase
    .from('fantasy_team')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
