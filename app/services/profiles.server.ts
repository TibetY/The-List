import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '~/types/restaurant';
import { rowToProfile, type ProfileRow } from './listMap';

/** Fetch a single profile by user id. */
export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToProfile(data as ProfileRow) : null;
}
