import type { Profile } from '~/types/restaurant';
import { getSupabaseBrowserClient } from '~/supabase.client';
import { rowToProfile, type ProfileRow } from './listMap';

const AVATAR_BUCKET = 'avatars';

/** Update the current user's display name and/or avatar URL. */
export async function updateProfile(
  userId: string,
  patch: { displayName?: string; avatarUrl?: string }
): Promise<Profile> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('profiles')
    .update({
      display_name: patch.displayName ?? null,
      ...(patch.avatarUrl !== undefined ? { avatar_url: patch.avatarUrl } : {}),
    })
    .eq('id', userId)
    .select('id, display_name, avatar_url')
    .single();

  if (error) throw error;
  return rowToProfile(data as ProfileRow);
}

/** Upload an avatar image to the per-user folder and return its public URL. */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
