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

export async function getPlayerByEmail(email: string): Promise<FantasyPlayer | null> {
  const { data, error } = await supabase
    .from('fantasy_players')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addPlayer(name: string, email: string): Promise<FantasyPlayer> {
  const { data, error } = await supabase
    .from('fantasy_players')
    .insert({ name, email })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlayer(
  id: string,
  updates: Partial<Pick<FantasyPlayer, 'name' | 'email' | 'avatar_url'>>
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

export async function getPlayerByUserId(userId: string): Promise<FantasyPlayer | null> {
  const { data, error } = await supabase
    .from('fantasy_players')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function uploadPlayerAvatar(playerId: string, file: File): Promise<string> {
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(playerId, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(playerId);
  // Cache-bust so browsers pick up the new image immediately
  const url = `${publicUrl}?t=${Date.now()}`;
  await updatePlayer(playerId, { avatar_url: url });
  return url;
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
