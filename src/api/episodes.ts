import { supabase } from '../lib/supabase';
import type { Episode } from '../types';

export async function getEpisodes(): Promise<Episode[]> {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .order('episode_number');
  if (error) throw error;
  return data;
}

export async function upsertEpisodeName(episode_number: number, name: string): Promise<Episode> {
  const { data, error } = await supabase
    .from('episodes')
    .upsert({ episode_number, name }, { onConflict: 'episode_number' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
