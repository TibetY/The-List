import type { Restaurant, RestaurantStatus } from '~/types/restaurant';
import { getSupabaseBrowserClient } from '~/supabase.client';
import {
  restaurantToRow,
  rowToRestaurant,
  type RestaurantRow,
} from './restaurantMap';

/** Create a restaurant in `listId`, added by `userId`. Returns the saved record. */
export async function createRestaurant(
  data: Partial<Restaurant>,
  listId: string,
  userId: string
): Promise<Restaurant> {
  const supabase = getSupabaseBrowserClient();
  const { data: row, error } = await supabase
    .from('restaurants')
    .insert(restaurantToRow(data, listId, userId))
    .select()
    .single();

  if (error) throw error;
  return rowToRestaurant(row as RestaurantRow);
}

/** Update an existing restaurant. Returns the saved record. */
export async function updateRestaurant(
  id: string,
  data: Partial<Restaurant>,
  listId: string,
  userId: string
): Promise<Restaurant> {
  const supabase = getSupabaseBrowserClient();
  // list_id / added_by are immutable on update; RLS already scopes the row.
  const { list_id, added_by, ...payload } = restaurantToRow(data, listId, userId);
  void list_id;
  void added_by;
  const { data: row, error } = await supabase
    .from('restaurants')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToRestaurant(row as RestaurantRow);
}

/** Quick status toggle (been / want) without opening the full editor. */
export async function setRestaurantStatus(
  id: string,
  status: RestaurantStatus
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from('restaurants')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

/** Quick favourite toggle without opening the full editor. */
export async function setRestaurantFavorite(
  id: string,
  favorite: boolean
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from('restaurants')
    .update({ favorite })
    .eq('id', id);
  if (error) throw error;
}

/** Quick visit-count update (e.g. +1) without opening the full editor. */
export async function setRestaurantVisitCount(
  id: string,
  visitCount: number
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from('restaurants')
    .update({ visit_count: Math.max(0, Math.round(visitCount)) })
    .eq('id', id);
  if (error) throw error;
}

/** Delete a restaurant by id. */
export async function deleteRestaurant(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from('restaurants').delete().eq('id', id);
  if (error) throw error;
}
