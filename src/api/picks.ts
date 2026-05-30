import { supabase } from '../lib/supabase';
import type { SeasonPick, EpisodePick } from '../types';

export async function getSeasonPicks(): Promise<SeasonPick[]> {
  const { data, error } = await supabase.from('season_picks').select('*');
  if (error) throw error;
  return data;
}

export async function upsertSeasonPick(
  fantasy_player_id: string,
  contestant_id: string,
  repick_count: number
): Promise<SeasonPick> {
  const { data, error } = await supabase
    .from('season_picks')
    .upsert({ fantasy_player_id, contestant_id, repick_count }, { onConflict: 'fantasy_player_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getEpisodePicks(): Promise<EpisodePick[]> {
  const { data, error } = await supabase.from('episode_picks').select('*');
  if (error) throw error;
  return data;
}

export async function addEpisodePick(
  pick: Omit<EpisodePick, 'id'>
): Promise<EpisodePick> {
  const { data, error } = await supabase
    .from('episode_picks')
    .insert(pick)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeEpisodePick(id: string): Promise<void> {
  const { error } = await supabase.from('episode_picks').delete().eq('id', id);
  if (error) throw error;
}
