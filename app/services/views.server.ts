import type { SupabaseClient } from '@supabase/supabase-js';
import type { ListView } from '~/types/restaurant';

interface ViewRow {
  id: string;
  list_id: string;
  name: string;
  params: string | null;
}

/** The current user's saved views for a list (RLS scopes to their own rows). */
export async function getListViews(
  supabase: SupabaseClient,
  listId: string,
  userId: string
): Promise<ListView[]> {
  const { data, error } = await supabase
    .from('list_views')
    .select('id, list_id, name, params')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as ViewRow[] | null ?? []).map((r) => ({
    id: r.id,
    listId: r.list_id,
    name: r.name,
    params: r.params ?? '',
  }));
}
