import type { SupabaseClient } from '@supabase/supabase-js';
import type { Restaurant } from '~/types/restaurant';
import { rowToRestaurant, type RestaurantRow } from './restaurantMap';

/**
 * Load restaurants for a specific list. Row-level security additionally
 * restricts results to lists the authenticated user is a member of.
 */
export async function getRestaurants(
  supabase: SupabaseClient,
  listId: string
): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('list_id', listId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as RestaurantRow[]).map(rowToRestaurant);
}
