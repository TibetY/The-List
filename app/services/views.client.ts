import type { ListView } from '~/types/restaurant';
import { getSupabaseBrowserClient } from '~/supabase.client';

interface ViewRow {
  id: string;
  list_id: string;
  name: string;
  params: string | null;
}

/** Save the current filter view under a name for the given list. */
export async function createListView(
  listId: string,
  userId: string,
  name: string,
  params: string
): Promise<ListView> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('list_views')
    .insert({ list_id: listId, user_id: userId, name, params })
    .select('id, list_id, name, params')
    .single();
  if (error) throw error;
  const row = data as ViewRow;
  return { id: row.id, listId: row.list_id, name: row.name, params: row.params ?? '' };
}

/** Rename a saved view. */
export async function renameListView(id: string, name: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from('list_views').update({ name }).eq('id', id);
  if (error) throw error;
}

/** Delete a saved view. */
export async function deleteListView(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from('list_views').delete().eq('id', id);
  if (error) throw error;
}
