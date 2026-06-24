import { getSupabaseBrowserClient } from '~/supabase.client';
import { RESTAURANT_IMAGE_BUCKET } from '~/supabaseConfig';

/**
 * Upload an image to Supabase Storage and return its public URL.
 * Files are stored under `{userId}/...` so the storage RLS policies (which key
 * off the first path segment) allow each user to manage only their own images.
 */
export async function uploadRestaurantImage(
  file: File,
  userId: string
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(RESTAURANT_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage
    .from(RESTAURANT_IMAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Delete a previously uploaded image given its public URL. Best-effort:
 * failures are logged but not thrown.
 */
export async function deleteRestaurantImage(imageUrl: string): Promise<void> {
  try {
    const supabase = getSupabaseBrowserClient();
    const marker = `/${RESTAURANT_IMAGE_BUCKET}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) return;
    const path = imageUrl.slice(idx + marker.length);
    await supabase.storage.from(RESTAURANT_IMAGE_BUCKET).remove([path]);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
}
