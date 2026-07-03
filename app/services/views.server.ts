import type { SupabaseClient } from '@supabase/supabase-js';
import type { ListView } from '~/types/restaurant';

interface ViewRow {
  id: string;
  list_id: string;
  name: string;
  params: string | null;
}

/**
 * The current user's saved views for a list (RLS scopes to their own rows).
 * Never throws: saved views are a non-critical add-on, so if the `list_views`
 * table hasn't been created yet (the schema.sql migration hasn't been re-run) or
 * the query fails for any reason, we return an empty list rather than break the
 * whole dashboard load. The feature simply stays hidden until the table exists.
 */
export async function getListViews(
  supabase: SupabaseClient,
  listId: string,
  userId: string
): Promise<ListView[]> {
  try {
    const { data, error } = await supabase
      .from('list_views')
      .select('id, list_id, name, params')
      .eq('list_id', listId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('getListViews: skipping saved views —', error.message);
      return [];
    }
    return (data as ViewRow[] | null ?? []).map((r) => ({
      id: r.id,
      listId: r.list_id,
      name: r.name,
      params: r.params ?? '',
    }));
  } catch (error) {
    console.warn('getListViews: skipping saved views —', error);
    return [];
  }
}
