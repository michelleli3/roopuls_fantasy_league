import { supabase } from '../lib/supabase';
import type { Contestant, EpisodeResult } from '../types';

export async function getContestants(): Promise<Contestant[]> {
  const { data, error } = await supabase
    .from('contestants')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

export async function addContestant(name: string): Promise<Contestant> {
  const { data, error } = await supabase
    .from('contestants')
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateContestant(
  id: string,
  updates: Partial<Pick<Contestant, 'name' | 'active'>>
): Promise<Contestant> {
  const { data, error } = await supabase
    .from('contestants')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getEpisodeResults(): Promise<EpisodeResult[]> {
  const { data, error } = await supabase
    .from('episode_results')
    .select('*')
    .order('episode_number');
  if (error) throw error;
  return data;
}

export async function addEpisodeResult(
  result: Omit<EpisodeResult, 'id'>
): Promise<EpisodeResult> {
  const { data, error } = await supabase
    .from('episode_results')
    .insert(result)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEpisodeResult(
  id: string,
  updates: Partial<Omit<EpisodeResult, 'id'>>
): Promise<EpisodeResult> {
  const { data, error } = await supabase
    .from('episode_results')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEpisodeResult(id: string): Promise<void> {
  const { error } = await supabase
    .from('episode_results')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
