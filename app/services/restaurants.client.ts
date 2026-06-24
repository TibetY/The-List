import type { Restaurant } from '~/types/restaurant';
import { getSupabaseBrowserClient } from '~/supabase.client';
import {
  restaurantToRow,
  rowToRestaurant,
  type RestaurantRow,
} from './restaurantMap';

/** Create a restaurant owned by `userId`. Returns the saved record. */
export async function createRestaurant(
  data: Partial<Restaurant>,
  userId: string
): Promise<Restaurant> {
  const supabase = getSupabaseBrowserClient();
  const { data: row, error } = await supabase
    .from('restaurants')
    .insert(restaurantToRow(data, userId))
    .select()
    .single();

  if (error) throw error;
  return rowToRestaurant(row as RestaurantRow);
}

/** Update an existing restaurant. Returns the saved record. */
export async function updateRestaurant(
  id: string,
  data: Partial<Restaurant>,
  userId: string
): Promise<Restaurant> {
  const supabase = getSupabaseBrowserClient();
  const { user_id, ...payload } = restaurantToRow(data, userId);
  void user_id; // user_id is immutable on update; RLS already scopes the row
  const { data: row, error } = await supabase
    .from('restaurants')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToRestaurant(row as RestaurantRow);
}

/** Delete a restaurant by id. */
export async function deleteRestaurant(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from('restaurants').delete().eq('id', id);
  if (error) throw error;
}
