import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserPreset {
  id: string;
  user_id: string | null;
  name: string;
  template: string;
  color: string;
  particle_count: number;
  particle_size: number;
  rainbow_mode: boolean;
  is_public: boolean;
  likes_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export async function savePreset(preset: Omit<UserPreset, 'id' | 'likes_count' | 'views_count' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('user_presets')
    .insert([preset])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPublicPresets(limit: number = 20, sortBy: 'created_at' | 'likes_count' = 'created_at') {
  const { data, error } = await supabase
    .from('user_presets')
    .select('*')
    .eq('is_public', true)
    .order(sortBy, { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getUserPresets(userId: string) {
  const { data, error } = await supabase
    .from('user_presets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function likePreset(presetId: string, userId: string) {
  const { data: existingLike } = await supabase
    .from('preset_likes')
    .select('id')
    .eq('preset_id', presetId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingLike) {
    const { error: deleteError } = await supabase
      .from('preset_likes')
      .delete()
      .eq('preset_id', presetId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    const { error: updateError } = await supabase.rpc('decrement_likes', { preset_id: presetId });
    if (updateError) throw updateError;

    return false;
  } else {
    const { error: insertError } = await supabase
      .from('preset_likes')
      .insert([{ preset_id: presetId, user_id: userId }]);

    if (insertError) throw insertError;

    const { error: updateError } = await supabase.rpc('increment_likes', { preset_id: presetId });
    if (updateError) throw updateError;

    return true;
  }
}

export async function incrementViews(presetId: string) {
  const { error } = await supabase.rpc('increment_views', { preset_id: presetId });
  if (error) throw error;
}
