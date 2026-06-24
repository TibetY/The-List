import type { SupabaseClient } from '@supabase/supabase-js';
import type { Restaurant } from '~/types/restaurant';
import { rowToRestaurant, type RestaurantRow } from './restaurantMap';

/**
 * Load the signed-in user's restaurants. Row-level security restricts the
 * result to rows owned by the authenticated user, so no explicit user filter
 * is required.
 */
export async function getRestaurants(
  supabase: SupabaseClient
): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as RestaurantRow[]).map(rowToRestaurant);
}
